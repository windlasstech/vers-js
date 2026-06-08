---
title: Parser Phases
parent: Architecture Specifications
nav_order: 5
---

# Parser Phases

This specification defines the logical scanner/parser phases, fatal boundaries,
diagnostic accumulation rules, issue ordering, and diagnostic cap handling for
`vers-js` v0.1.0.

Primary ADR inputs: ADR-0006, ADR-0016, ADR-0027, ADR-0028, ADR-0029,
ADR-0035, ADR-0043, ADR-0044, and ADR-0045.

## Implementation model

The implementation must use a compact handwritten scanner/parser over the original
input string. It may organize code as one function or several internal helpers,
but public behavior must be equivalent to the logical phase sequence in this
document.

The parser must not expose scanner cursors, tokens, parse nodes, phase result
objects, recovery state, or generated-parser artifacts through public exports,
subpaths, result values, diagnostics, or metadata.

All three public entry points share the same parser pipeline:

```ts
parseVers(input);
validateVers(input);
canonicalizeVers(input);
```

They differ only in successful value projection. They must not differ in accepted
input, rejected input, issue collection, fatal boundaries, issue cap behavior, or
failure metadata.

## Preflight resource gate

Before normal parser phases run, every public entry point checks the input length.

`MAX_INPUT_LENGTH` is `1024` UTF-16 code units. If `input.length > 1024`, parsing
stops immediately and returns a failure containing one ordinary issue:

```ts
{
  code: "resource.input_too_long",
  message: string,
  severity: "error"
}
```

The oversized-input issue may omit `span` because the condition is a whole-input
resource boundary rather than a localized syntax problem.

No lexical, syntax, constraint, decoding, or canonicality diagnostics are emitted
for oversized input. No decoded metadata or canonical output is allocated.

Inputs with length exactly `1024` remain eligible for normal parsing.

## Normal phase sequence

After the preflight resource gate, the parser proceeds through these ordered
logical phases:

1. Lexical pre-scan.
2. Structural scheme and type parsing.
3. Constraint-list splitting.
4. Per-constraint syntax validation.
5. Percent-decoding and decoded metadata construction.
6. Canonicality validation and canonical string projection.

The implementation may combine adjacent work internally, but observable behavior
must preserve this order. A later phase must not run when an earlier fatal boundary
makes that later phase's input unreliable.

## Phase contract table

| Phase | Input | Output on success | Safe accumulation | Fatal boundary |
| --- | --- | --- | --- | --- |
| Preflight resource gate | Original input string | Eligibility for normal parsing | None; this is a single gate | Input above `MAX_INPUT_LENGTH` stops all normal phases. |
| Lexical pre-scan | Original input string at or below length limit | Lexically eligible original input | Independent lexical locations, such as ASCII whitespace or impossible raw characters, may be reported together when positions are reliable. | A lexical issue that makes the whole declaration uninterpretable stops structural parsing. |
| Structural scheme and type parsing | Lexically eligible original input | Scheme, type region, and constraint-list region | Scheme/type issues may accumulate only when the parser can still locate their source regions reliably. | If the parser cannot reliably split `scheme`, `type`, and constraint-list regions, all constraint, decoding, and canonicality phases stop. |
| Constraint-list splitting | Reliable constraint-list region | Ordered raw constraint segments with original-input spans | Leading pipe, trailing pipe, consecutive pipe, and empty segment issues may accumulate when the list boundary remains reliable. | If separators cannot be segmented reliably, per-constraint syntax validation stops. |
| Per-constraint syntax validation | Ordered raw constraint segments | Comparator, star, and raw version regions for each valid segment | Independent segment issues may accumulate across reliably split segments. | A fatal issue in one segment stops percent-decoding and metadata construction for that segment only; other independent segments may continue. |
| Percent-decoding and decoded metadata construction | Syntactically valid non-star version regions and star segments | Decoded `VersConstraint` metadata candidates | Independent percent syntax and UTF-8 failures may accumulate when segment boundaries are reliable. | Any segment without trustworthy decoded metadata prevents full successful metadata and stops canonicality validation for the full range. |
| Canonicality validation and canonical string projection | Complete decoded metadata candidate list | `VersRange.canonical` and operation-specific success value | Canonicality checks may accumulate only over complete trustworthy decoded metadata. | Canonicality failure stops success projection; no repair or partial canonical output is returned. |

## Issue accumulation rules

The parser uses bounded accumulated diagnostics. It reports every issue it can
identify without speculative recovery, up to `MAX_ISSUES`.

`MAX_ISSUES` is `16`. The implementation must check the remaining issue budget
before adding each ordinary issue. It must not build an unbounded internal issue
array and slice it afterward.

When an additional ordinary issue would have been added after the budget is
exhausted, the returned failure must include diagnostic truncation metadata:

```ts
{
  diagnostics: {
    truncated: true,
    maxIssues: 16
  }
}
```

Diagnostic truncation metadata is result-completeness state. It must not appear as
an ordinary issue and must not expose omitted issue counts, parser cursors, phase
state, token state, or recovery internals.

If the issue cap is reached, the parser may stop collecting additional ordinary
diagnostics immediately. It does not need to keep scanning solely to discover more
issues that cannot be returned.

## Issue ordering rules

Failure results return an ordered `issues` array.

Ordering rules are:

1. Issues with reliable spans are ordered by `span.start` ascending.
2. If two issues have the same `span.start`, they are ordered by normal phase
   order.
3. If two issues have the same span start and phase, they are ordered by the
   check order documented in `diagnostics.md`.
4. Issues without spans are ordered after span-bearing issues from the same phase
   whose positions are known to precede them.
5. When relative source position is unavailable, issues without spans use phase
   order, then check order.

The implementation must not let incidental helper-call order, object property
iteration, set iteration, or runtime-specific behavior determine public issue
ordering.

`diagnostics.md` owns the final per-code ordering table. This document fixes the
phase and source-position principles that the diagnostic table must follow.

## Fatality model

Fatality is an internal parser-control concept. It is not exposed as a public
field on `VersIssue` in v0.1.0.

There are two fatality scopes:

- whole-input fatality;
- per-constraint fatality.

Whole-input fatality means the parser cannot reliably identify later structural
regions. It stops all later phases.

Per-constraint fatality means one reliably split constraint segment cannot proceed
to deeper validation. It stops deeper phases for that segment, but it does not
invalidate other independently split segments.

Fatality is about parser trust, not severity. Every public v0.1.0 issue has
`severity: "error"`, whether the parser can continue collecting other safe issues
or not.

## Whole-input fatal boundaries

The parser must stop all later normal phases after any issue that prevents reliable
identification of the major VERS regions.

Whole-input fatal boundaries include:

- missing or unparseable scheme separator, where the parser cannot reliably split
  the scheme from the specifier;
- invalid scheme text that prevents recognizing the declaration as a VERS
  declaration;
- missing type region;
- missing type/constraint separator `/`;
- structure that leaves no reliable constraint-list region;
- any earlier lexical condition that makes the declaration uninterpretable as a
  VERS string.

After a whole-input fatal boundary, the parser must not invent type, constraint,
percent-decoding, duplicate-version, or canonical-output diagnostics from guessed
regions.

Example:

```text
vers-npm/1.0.0
```

If this cannot be split into a reliable `vers:` scheme and specifier boundary, the
result should report the scheme/separator problem and stop. It must not also report
constraint-list, comparator, UTF-8, duplicate-version, or canonicality diagnostics
derived from speculative recovery.

## Constraint-list fatal boundaries

Once a reliable constraint-list region exists, the parser may split the list on
raw pipe separators.

Leading, trailing, consecutive, and empty constraint segments may be accumulated
together when the parser can reliably locate each separator or empty segment.

Constraint-list fatality stops per-constraint parsing only when the list cannot be
segmented reliably. Ordinary separator problems in a known list do not require
guessing; they can be reported as constraint-list diagnostics and prevent success.

Examples:

```text
vers:npm/|1.0.0||
```

When the constraint list starts after the known `/`, the parser may safely report a
leading pipe, consecutive pipe, and trailing pipe up to `MAX_ISSUES`. The result is
still a failure, and later decoded metadata or canonical output is unavailable.

## Per-constraint fatal boundaries

After the list is split, each segment is validated independently.

Per-constraint fatal boundaries include:

- empty segment;
- missing version after a comparator;
- invalid comparator prefix;
- invalid `*` usage, such as `*1.0.0` or `>=*`;
- malformed percent escape syntax in that segment;
- raw non-unreserved version character in that segment;
- syntactically valid percent escapes that fail UTF-8 decoding in that segment.

When one segment hits a per-constraint fatal boundary, the parser must not produce
deeper diagnostics for that segment. For example, if a segment has malformed
percent escape syntax, the parser must not also attempt UTF-8 decoding or decoded
duplicate checks for that segment.

The parser may still validate other segments whose boundaries are reliable.

Example:

```text
vers:npm/>=%G0|<=2.0.0
```

The malformed percent escape in the first segment stops decoding for that segment.
The second segment may still be syntactically validated because the pipe-separated
segment boundary is reliable. Canonicality validation for the full range does not
run because the full decoded metadata candidate list is incomplete.

## Percent-decoding boundary

Percent-decoding runs only for segments that pass per-constraint syntax validation.

The decoder constructs decoded version strings exactly once. Decoded percent signs
and percent-looking substrings are literal version text. Invalid UTF-8 prevents a
decoded version string from being constructed for that segment.

If any required decoded metadata is missing, the parser must return failure and
skip canonicality validation for the full range. It must not run duplicate-version
checks, canonical serialization, or success projection over partial decoded
metadata.

## Canonicality boundary

Canonicality validation runs only when the parser has a complete trustworthy list
of decoded constraints.

For v0.1.0 core, the active canonicality check is exact decoded-string duplicate
version detection. It may emit `canonical.duplicate_version` for duplicate decoded
non-star version strings.

The v0.1.0 core must not emit reserved semantic canonical diagnostics for
type-specific ordering or comparator-sequence policy:

- `canonical.non_canonical_order`;
- `canonical.invalid_comparator_sequence`.

Canonical output is projected only after canonicality validation succeeds. A
canonicality failure returns a failure result, not a repaired or partial canonical
string.

Example:

```text
vers:npm/1.0.0|=1.0.0
```

After both segments decode to version string `1.0.0`, the parser fails with
`canonical.duplicate_version`. It must not deduplicate, reorder, or return
`vers:npm/1.0.0` as a success.

## Internal parser state

The parser may use internal state such as:

- current UTF-16 code-unit index;
- issue budget counter;
- phase identifier;
- raw region start and end offsets;
- temporary constraint segment records;
- decoded metadata candidates;
- canonical serialization buffers.

All such state is private. Public results must expose only the data shapes defined
by `public-api.md`, `data-model-and-canonical-output.md`, and `diagnostics.md`.

Internal state must also remain runtime-agnostic. Core parsing must not depend on
Node.js `Buffer`, filesystem APIs, process globals, host timers, or generated
parser runtimes.

## Public operation projections

All public entry points use the same parser result internally.

On success:

- `parseVers()` returns `VersRange` metadata;
- `validateVers()` returns `true`;
- `canonicalizeVers()` returns the same canonical string as
  `parseVers(input).value.canonical`.

On failure, all three operations return the same public failure shape for the same
input. They may share implementation code for issue collection and failure
metadata.

No public entry point may run a looser, stricter, repaired, warning-enabled,
registry-aware, or type-semantic variant of these phases in v0.1.0.

## Representative scenarios

### Whole-input fatal boundary

Input:

```text
npm/1.0.0
```

Expected behavior:

- report the missing or invalid VERS scheme condition;
- stop before type, constraint, decoding, and canonicality phases;
- return no parsed metadata or canonical output.

### Per-constraint fatal boundary with independent segment checking

Input:

```text
vers:npm/>=%G0|<2.0.0
```

Expected behavior:

- report malformed percent escape syntax for `%G0`;
- skip decoding and deeper checks for the first segment;
- permit safe syntax validation of the second segment;
- skip full-range canonicality validation because decoded metadata is incomplete.

### Multi-issue accumulated constraint-list diagnostics

Input:

```text
vers:npm/|1.0.0||
```

Expected behavior:

- report all safely discoverable pipe/empty-constraint issues up to `MAX_ISSUES`;
- preserve deterministic issue ordering;
- return failure without decoded metadata or canonical output.

### Diagnostic cap truncation

Input:

```text
vers:npm/|||||||||||||||||
```

Expected behavior:

- return at most `16` ordinary issues;
- include `metadata.diagnostics` with `truncated: true` and `maxIssues: 16` if
  additional ordinary issues would have been emitted;
- not append a sentinel truncation issue.

## Invariants

Implementation and tests must preserve these invariants:

1. Input length is checked before normal parser phases.
2. Oversized input returns `resource.input_too_long` and no normal parser-phase
   diagnostics.
3. Normal parsing follows the logical phase sequence defined here.
4. Later phases do not run after earlier fatal boundaries make their inputs
   unreliable.
5. Whole-input fatality stops all later phases.
6. Per-constraint fatality stops deeper checks for one segment while allowing safe
   checks on other reliably split segments.
7. Canonicality validation runs only over complete trustworthy decoded metadata.
8. `canonical.duplicate_version` is the only active v0.1.0 core canonicality
   issue.
9. The core parser does not emit reserved semantic or support issue codes.
10. Issues are accumulated only while recovery is non-speculative.
11. `MAX_ISSUES` is enforced before adding ordinary issues.
12. Diagnostic truncation is reported through presence-based metadata, not through
    a sentinel issue.
13. Issue ordering is deterministic and based on source position, phase order, and
    check order.
14. Parser internals remain private and runtime-agnostic.
15. `parseVers()`, `validateVers()`, and `canonicalizeVers()` share the same phase,
    fatal-boundary, and failure-result behavior.
