---
parent: Decisions
nav_order: 6
status: accepted
date: 12026-06-07
decision-makers: Yunseo Kim
---

# Use Bounded Accumulated Diagnostics

## Context and Problem Statement

The first vers-js release will parse and validate canonical VERS declarations.
ADR-0004 defines the public API as Result-centered functional entry points whose
failure branch contains `issues: VersIssue[]`. ADR-0005 defines successful parse
results as syntax metadata with discriminated constraints.

The package now needs a public diagnostic collection strategy for failed parse,
validation, and canonicalization results. VERS parsing and validation can
discover lexical, syntax, constraint, canonicality, and support-boundary problems
such as ASCII whitespace, invalid scheme, missing type, malformed pipe
separators, empty versions, invalid `*` usage, invalid percent-encoding,
non-canonical ordering, duplicate versions, invalid comparator sequences, and
unsupported semantic forms.

Should vers-js stop at the first diagnostic, try to report every possible
diagnostic, or accumulate diagnostics only while the remaining input can still be
interpreted reliably?

## Decision Drivers

- Failure results should remain data-oriented, stable, and runtime-agnostic.
- Consumers should be able to present useful diagnostics without repeated
  edit/validate cycles when multiple independent problems are present.
- The parser should not continue into speculative recovery after structural
  failures make later interpretation unreliable.
- Diagnostic ordering should be predictable enough for tests, UI display, and
  downstream adapter mappings.
- The first release should keep implementation complexity bounded while still
  taking advantage of the plural `issues` result shape from ADR-0004.

## Considered Options

- Fail-fast diagnostics with a single issue
- Fully accumulated diagnostics
- Bounded accumulated diagnostics

## Decision Outcome

Chosen option: "Bounded accumulated diagnostics", because it returns every issue
the implementation can detect without speculative recovery while stopping later
validation phases after fatal structural errors make the remaining input
unreliable to interpret.

Failure results will contain an ordered `issues` array. An issue array may contain
one issue when the first problem is fatal, but the public shape remains plural.
Issues should be ordered by input position when a source span is available, and
otherwise by the phase and check order that produced them.

The implementation should accumulate diagnostics within a phase when doing so is
safe. For example, lexical pre-scans may report multiple ASCII whitespace
locations; constraint-list validation may report malformed pipe separators and
empty constraints when the list can still be split reliably; post-parse
canonicality checks may report duplicate versions or non-canonical ordering when
the parsed constraint list is trustworthy.

The implementation should stop later phases after fatal structural failures. For
example, if the input cannot be split into a VERS scheme and specifier, later
type, constraint, and canonicality checks should not invent diagnostics from an
unreliable structure.

### Consequences

- Good, because callers can receive multiple valid diagnostics from one parse or
  validation attempt.
- Good, because the implementation does not need speculative parser recovery once
  structural errors make later phases unreliable.
- Good, because lexical, constraint-list, and post-parse canonical checks can
  report multiple independent issues when safe.
- Good, because the first-release implementation can stay simpler than a fully
  recovering parser.
- Neutral, because some invalid inputs will still produce only one issue when the
  first issue is a fatal structural boundary.
- Bad, because the implementation must define and preserve issue ordering and
  fatal-phase boundaries.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- failure results always expose `issues: VersIssue[]`;
- issue collection accumulates all diagnostics that can be detected without
  speculative recovery;
- later validation phases stop after fatal structural errors that make the
  remaining input unreliable to interpret;
- issue ordering is deterministic;
- tests cover both single fatal issues and multiple safely accumulated issues.

## Pros and Cons of the Options

### Fail-fast diagnostics with a single issue

This option returns only the first detected issue.

- Good, because it is simple to implement and resembles many parser APIs.
- Good, because it avoids secondary or cascading diagnostics after a structural
  failure.
- Bad, because users may need repeated edit/validate cycles to find all problems.
- Bad, because it underuses the `issues: VersIssue[]` shape selected in ADR-0004.

### Fully accumulated diagnostics

This option tries to continue through the entire input and return every possible
issue.

- Good, because it can provide the richest user-facing feedback.
- Good, because it resembles form and schema validators that report all field
  errors at once.
- Bad, because parser recovery can become speculative after malformed structure.
- Bad, because cascading diagnostics can be misleading when later checks depend on
  earlier structure.

### Bounded accumulated diagnostics

This option accumulates issues until a fatal structural boundary makes further
interpretation unreliable.

- Good, because it balances useful multi-issue feedback with parser correctness.
- Good, because it preserves deterministic behavior without requiring a fully
  recovering parser.
- Good, because it matches the Result-centered API while keeping first-release
  scope limited to syntax validation and parsed metadata.
- Bad, because the project must document which failures are fatal boundaries.

## More Information

This decision refines the failure branch selected by ADR-0004. The structure of
machine-readable issue codes is decided separately.

External references:

- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- VERS canonical parse tests:
  <https://github.com/package-url/vers-spec/blob/main/tests/vers_canonical_parse_test.json>
- VERS test overview:
  <https://github.com/package-url/vers-spec/blob/main/docs/tests.md>
- Zod error issues: <https://zod.dev/error-customization>
- Valibot issues: <https://valibot.dev/guides/issues/>
- Ajv validation errors: <https://ajv.js.org/api.html#validation-errors>

This decision should be revisited if one of the following becomes true:

- VERS defines normative diagnostic collection behavior;
- consumers need warnings or informational diagnostics in addition to errors;
- first-release bounded accumulation produces confusing cascading diagnostics in
  practice;
- future parser architecture supports reliable full recovery without speculative
  diagnostics.
