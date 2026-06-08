---
parent: Decisions
nav_order: 16
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use Logical Parser Phases with Explicit Fatal Boundaries

## Context and Problem Statement

The first vers-js release will expose Result-centered functions for canonical
VERS syntax validation, canonicalization, and parsed declaration metadata.
ADR-0004 keeps parser internals outside the public API. ADR-0005 defines
successful parse results as plain syntax metadata. ADR-0006 selects bounded
accumulated diagnostics, where the parser accumulates issues while the remaining
input can still be interpreted reliably and stops later validation after fatal
structural failures. ADR-0010 requires strict canonicalization without
auto-repair.

Bounded accumulated diagnostics require a concrete implementation boundary:
which checks happen before parsing, which checks depend on a trustworthy parsed
structure, and which failures are fatal enough to stop later phases. Without an
explicit phase policy, issue ordering and accumulated diagnostics could drift
with parser implementation details.

Should vers-js separate lexer, parser, validator, and canonicality phases, use a
single-pass parser, or define another boundary for diagnostics and fatal
structural failures?

## Decision Drivers

- Bounded accumulated diagnostics from ADR-0006 need explicit fatal boundaries
  that can be reviewed and tested.
- Public APIs should continue to expose stable Result data rather than parser
  internals or phase-specific implementation artifacts.
- Diagnostic ordering should be deterministic and aligned with the issue-code
  namespaces selected in ADR-0007.
- Later checks should not produce speculative or cascading diagnostics after the
  input structure is no longer reliable.
- The first release should keep implementation complexity proportional to the VERS
  syntax scope.
- Strict canonicalization should run only after parsed and decoded constraint
  metadata is trustworthy.
- The parser architecture should leave room for future advisory validation or
  semantic layers without expanding the v1 public surface.

## Considered Options

- Logical parser phases with explicit fatal boundaries
- Single-pass parser with inline bounded accumulation
- Fully separated lexer, parser, validator, and canonicalizer pipeline
- Validator-first regular-expression or schema checks

## Decision Outcome

Chosen option: "Logical parser phases with explicit fatal boundaries", because it
gives ADR-0006 concrete phase and fatal-boundary semantics while allowing the
actual implementation to remain compact and hidden behind the public Result API.

vers-js will define ordered logical phases for core v1 parsing and validation:

1. lexical pre-scan;
2. structural scheme and type parsing;
3. constraint-list splitting;
4. per-constraint syntax validation;
5. percent-decoding and decoded metadata construction;
6. canonicality validation and canonical string projection.

The following phase and fatal-boundary table is an initial design guide, not a
complete parser specification. The exact checks, issue names, and fatality rules
may be refined by a later detailed parser specification, fixture design, or
implementation review, as long as the implementation preserves the decision's
core contract: ordered logical phases, safe accumulation within a phase, and no
speculative later-phase diagnostics after unreliable structure.

| Phase | Responsibilities | Safe accumulation | Fatal boundary |
| --- | --- | --- | --- |
| Lexical pre-scan | Detect ASCII whitespace and characters that cannot appear in a VERS string. | Multiple independent character locations may be reported. | Characters that make the whole input unreliable may stop structural parsing. |
| Structural scheme and type parsing | Split the declaration into scheme, type, and constraint-list regions; validate scheme and type shape. | Limited to checks that do not depend on a valid constraint region. | If the scheme/specifier or type/constraint boundary cannot be split reliably, later constraint, decoding, and canonicality phases stop. |
| Constraint-list splitting | Split constraints on pipe separators and detect leading, trailing, consecutive, or empty segments when the list boundary is known. | Separator and empty-segment issues may be reported together when splitting remains reliable. | If the list cannot be segmented reliably, per-constraint parsing stops. |
| Per-constraint syntax validation | Validate each segment's comparator, standalone `*`, version presence, and percent-escape shape. | Independent segment issues may be reported across the reliably split list. | A fatal issue in one segment stops deeper checks for that segment but need not stop independent segments. |
| Percent-decoding and metadata construction | Decode version components once and construct trustworthy parsed syntax metadata. | Independent decoding failures may be reported when segment metadata remains isolated. | Failed or incomplete decoded metadata stops canonicality checks that depend on the full parsed list. |
| Canonicality validation and projection | Check duplicate versions, ordering, comparator sequence, and deterministic canonical serialization. | Multiple canonicality issues may be reported when parsed and decoded metadata is trustworthy. | Canonical projection is unavailable when canonicality fails; no repair is attempted. |

The implementation may use a compact scanner or a single internal function, but
diagnostic behavior must be equivalent to passing through those ordered logical
phases. Internal tokens, partial parse nodes, or phase result objects are not part
of the public API.

Issues are accumulated within a phase when doing so does not require speculative
recovery. Later phases are skipped after a fatal structural failure makes their
inputs unreliable. A failure can be fatal for the whole parse or only for one
constraint segment. For example, an unparseable scheme/type boundary stops
constraint and canonicality checks, while an invalid comparator in one reliably
split constraint can stop deeper checks for that constraint without preventing
checks on other independent constraint segments.

Canonicality checks run only after the constraint list has been parsed and
decoded into trustworthy metadata. They must not reorder, deduplicate, repair, or
otherwise normalize invalid input. `canonicalizeVers()` uses the same phase
boundaries as `parseVers()` and `validateVers()`; on success it projects the
canonical string, and on failure it returns the same kind of bounded diagnostics
rather than a repaired value.

### Consequences

- Good, because fatal boundaries required by ADR-0006 become explicit and
  testable.
- Good, because diagnostic ordering can follow input position first and phase
  order second when spans are unavailable or tied.
- Good, because lexical, structural, constraint, decoding, and canonicality issue
  namespaces map to stable implementation boundaries without exposing internals.
- Good, because the parser can stay compact while still behaving like a phased
  pipeline for diagnostics.
- Good, because canonicality checks are protected from running on unreliable or
  partially decoded structures.
- Neutral, because implementation code may still use one scanner as long as it
  preserves the logical phase contract.
- Bad, because implementers must maintain phase and fatal-boundary discipline even
  when a single-pass implementation would be shorter.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- parser code documents or otherwise preserves the ordered logical phase
  boundary;
- failure results accumulate all safe diagnostics within a phase before stopping
  later phases at fatal structural boundaries;
- fatal whole-input failures such as an unsplittable scheme/specifier boundary do
  not produce invented type, constraint, decoding, or canonicality diagnostics;
- fatal per-constraint failures stop deeper checks for that constraint while still
  allowing independent constraint segments to be checked when the list was split
  reliably;
- canonicality diagnostics are emitted only after parsed and decoded constraint
  metadata is trustworthy;
- `parseVers()`, `validateVers()`, and `canonicalizeVers()` share the same
  validity and fatal-boundary behavior;
- public result values do not expose internal tokens, parser nodes, or phase
  artifacts;
- tests cover at least one whole-input fatal boundary, one per-constraint fatal
  boundary, and one multi-issue accumulated case.

## Pros and Cons of the Options

### Logical parser phases with explicit fatal boundaries

This option defines an ordered diagnostic pipeline while allowing the concrete
implementation to remain compact and internal.

- Good, because it directly implements the bounded accumulation policy selected
  in ADR-0006.
- Good, because it keeps public APIs aligned with ADR-0004 and ADR-0005 by hiding
  parser internals.
- Good, because it provides stable review and fixture language for fatal
  structural boundaries.
- Good, because it avoids speculative recovery while still reporting multiple
  independent issues when safe.
- Good, because future advisory or semantic checks can be added after the core
  syntax phases without changing the default v1 parser boundary.
- Bad, because the implementation must preserve logical phase behavior even when
  the code is written as a compact scanner.

### Single-pass parser with inline bounded accumulation

This option scans and parses once, accumulating diagnostics and stopping when the
current code path decides later interpretation is unsafe.

- Good, because it can be the smallest and fastest implementation for the compact
  VERS grammar.
- Good, because it avoids separate token, phase, or intermediate result types.
- Bad, because fatal boundaries can become implicit control-flow details rather
  than stable policy.
- Bad, because issue ordering may accidentally depend on implementation order.
- Bad, because syntax, constraint, decoding, and canonicality checks can become
  interleaved in ways that are harder to test against ADR-0006.
- Bad, because future advisory validation or repair-adjacent features would have
  fewer clear extension points.

### Fully separated lexer, parser, validator, and canonicalizer pipeline

This option implements a traditional compiler-style pipeline with distinct token
streams, parse trees, validation passes, and canonical projection.

- Good, because every phase boundary is explicit in code.
- Good, because diagnostic namespaces such as `lexical.*`, `syntax.*`,
  `constraint.*`, and `canonical.*` map naturally to implementation modules.
- Good, because richer spans, debug tooling, or future grammar expansion would
  have clear internal structures.
- Bad, because it is heavier than the first-release VERS syntax scope requires.
- Bad, because internal tokens or parse trees could become de facto contracts even
  though ADR-0004 excludes parser internals from the public API.
- Bad, because additional token and tree design increases implementation and test
  surface without improving the v1 public result shape.

### Validator-first regular-expression or schema checks

This option runs mostly independent validation checks over the raw string, then
constructs parsed metadata after those checks pass.

- Good, because simple surface checks such as whitespace, casing, and separator
  patterns can be implemented quickly.
- Good, because independent checks can sometimes report many errors in one pass.
- Bad, because structural dependencies are easy to miss and can cause misleading
  cascading diagnostics.
- Bad, because parsed metadata construction can duplicate validation logic.
- Bad, because percent-decoding, duplicate detection, ordering, and canonical
  serialization depend on trustworthy parsed constraints rather than raw-pattern
  checks alone.
- Bad, because it weakens ADR-0006's requirement to stop once the remaining input
  can no longer be interpreted reliably.

## More Information

This decision refines the diagnostic collection policy selected by ADR-0006 and
the issue-code namespaces selected by ADR-0007. It does not change the public API
shape from ADR-0004, the successful parse data model from ADR-0005, the strict
canonicalization behavior from ADR-0010, or the syntax-only type validation
boundary from ADR-0015.

External references:

- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- VERS specification:
  <https://github.com/package-url/vers-spec/blob/main/docs/standard/specification.md>
- VERS canonical parse tests:
  <https://github.com/package-url/vers-spec/blob/main/tests/vers_canonical_parse_test.json>
- VERS test overview:
  <https://github.com/package-url/vers-spec/blob/main/docs/tests.md>

This decision should be revisited if one of the following becomes true:

- VERS defines normative diagnostic phase or recovery behavior;
- first-release fixtures show that the selected fatal boundaries produce confusing
  or insufficient diagnostics;
- vers-js adds a tolerant repair API that needs a separate recovery pipeline;
- vers-js adds type-specific semantic parsing, comparison, containment,
  simplification, native range translation, or resolver behavior;
- a future parser implementation exposes enough complexity to justify a fully
  separated lexer/parser/validator/canonicalizer pipeline.
