---
parent: Decisions
nav_order: 45
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use 1024 Input Length and 16 Diagnostic Issues for V0.1.0 Resource Limits

## Context and Problem Statement

ADR-0027 selects a fixed v1 input length limit but defers the exact numeric
value. ADR-0028 selects a fixed v1 diagnostic issue cap but also defers the
exact numeric value. ADR-0030 keeps both values as internal constants for the
first release rather than public options. ADR-0043 and ADR-0044 then define how
callers observe the two resource boundaries: oversized input returns
`resource.input_too_long`, while diagnostic-cap exhaustion is exposed through
presence-based metadata.

The project now needs concrete v0.1.0 values for these two internal constants.
The values must be large enough for realistic VERS declarations, small enough to
bound hostile inputs and diagnostic allocation, and stable enough to document and
test before the first release.

What fixed input length and diagnostic issue cap should vers-js use for v0.1.0?

## Decision Drivers

- Normal VERS declarations are expected to be compact package-version range
  declarations.
- The upstream VERS fixture corpus is currently small: the longest observed
  `vers:` declaration in the pinned v0.1.0 snapshot is below 100 characters.
- Untrusted string input should have a deterministic resource envelope before
  normal parser phases allocate diagnostics or decoded metadata.
- The diagnostic cap should preserve useful multi-issue feedback from ADR-0006
  without allowing unbounded `issues` arrays.
- The first release has no public resource options, so the defaults should be
  conservative but not brittle.
- The values should be easy to document, test at boundaries, and report through
  the result shapes selected by ADR-0043 and ADR-0044.

## Considered Options

- Strict resource posture: `MAX_INPUT_LENGTH = 512`, `MAX_ISSUES = 10`
- Selected conservative compact-domain posture: `MAX_INPUT_LENGTH = 1024`,
  `MAX_ISSUES = 16`
- More diagnostic feedback posture: `MAX_INPUT_LENGTH = 1024`,
  `MAX_ISSUES = 32`
- More permissive compatibility posture: `MAX_INPUT_LENGTH = 2048`,
  `MAX_ISSUES = 32`
- Generous compatibility posture: `MAX_INPUT_LENGTH = 4096`,
  `MAX_ISSUES = 64`

## Decision Outcome

Chosen option: "Selected conservative compact-domain posture", because `1024`
characters is enough for expected normal VERS declarations while still making the
resource boundary meaningful, and `16` issues is enough for practical diagnostics
while keeping the default conservative before future configurability exists.

The v0.1.0 resource constants are:

```ts
const MAX_INPUT_LENGTH = 1024;
const MAX_ISSUES = 16;
```

`MAX_INPUT_LENGTH` is measured using JavaScript string length, matching the
UTF-16 code unit offset model selected by ADR-0025. Public entry points must
reject string inputs whose `.length` is greater than `1024` before normal parser
phases run. Inputs at exactly `1024` code units remain eligible for normal
parsing and validation.

`MAX_ISSUES` is the maximum number of ordinary `VersIssue` objects returned by a
single `parseVers()`, `validateVers()`, or `canonicalizeVers()` operation. The
implementation must check the remaining issue budget before adding another
ordinary issue. When additional ordinary issues would have been emitted after the
budget is exhausted, the result must include the diagnostic truncation metadata
selected by ADR-0044 with `maxIssues: 16`.

These constants are resource ceilings, not VERS grammar rules. An input shorter
than or equal to `1024` code units may still be invalid for lexical, syntax,
constraint, decoding, canonicality, or support-boundary reasons. An invalid input
that returns fewer than `16` issues may still be complete when no further safe
diagnostics exist under ADR-0006 and ADR-0016.

### Ecosystem Context

The selected values reflect the local VERS domain rather than copying a generic
parser limit.

- `npm/node-semver` uses a `256` character maximum for individual SemVer version
  strings, which supports the idea that version-oriented parsers can reasonably
  impose compact fixed input limits.
- The SemVer specification itself does not define a normative size limit, which
  supports keeping this value as a vers-js resource boundary rather than a VERS
  syntax rule.
- Python's `json` documentation warns that malicious JSON can consume considerable
  CPU and memory and recommends limiting the size of untrusted data before
  parsing.
- General-purpose parsers and validators vary widely: some fail fast by default,
  some collect all errors, and some expose optional recovery or warning thresholds.
  That makes a project-specific diagnostic cap appropriate for vers-js because
  ADR-0006 already selected bounded accumulated diagnostics.
- Go's parser defaults to reporting a small bounded number of errors unless all
  errors are requested, which supports a fixed diagnostic budget even though the
  exact number differs.

### Consequences

- Good, because `1024` is much larger than the current upstream VERS fixture
  examples while still enforcing a compact declaration expectation.
- Good, because hostile callers cannot force parsing work through arbitrarily long
  strings.
- Good, because `16` issues gives more feedback than fail-fast or very small
  parser caps while keeping failure payloads compact.
- Good, because a conservative default reduces the likelihood of needing a later
  breaking reduction before a future issue-cap option exists.
- Good, because both constants can be tested with exact boundary fixtures.
- Neutral, because unusually long but otherwise valid machine-generated VERS
  declarations must wait for a future options API or a later constant change.
- Neutral, because the diagnostic cap may truncate later-phase diagnostics if
  earlier phases consume the issue budget.
- Bad, because any fixed value selected before broad consumer feedback may need to
  be revisited after real usage.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- the input length constant is `1024` UTF-16 code units;
- inputs with length `1024` are not rejected solely for length;
- inputs with length `1025` return a Result failure with
  `resource.input_too_long` before normal parsing begins;
- the diagnostic issue cap constant is `16`;
- diagnostic collection checks the issue budget before adding ordinary issues;
- truncated failure results include `metadata.diagnostics` with
  `truncated: true` and `maxIssues: 16`;
- non-truncated failure results do not include diagnostic truncation metadata;
- no v0.1.0 public API option exposes either limit.

## Pros and Cons of the Options

### Strict resource posture: `512`, `10`

This option uses the smallest considered input and diagnostic budgets.

- Good, because it gives the strongest resource-exhaustion posture.
- Good, because the diagnostic behavior resembles parsers that report only a small
  number of errors by default.
- Bad, because `512` leaves less room for unusual but legitimate generated VERS
  declarations.
- Bad, because `10` issues weakens the multi-issue feedback selected by ADR-0006.

### Selected conservative compact-domain posture: `1024`, `16`

This option pairs the selected input limit with a conservative diagnostic cap.

- Good, because `1024` is still generous for normal compact VERS declarations.
- Good, because `16` issues is enough for many user-facing correction workflows.
- Good, because a future issue-cap option can let advanced callers request more
  diagnostics without changing the safe default.
- Bad, because complex malformed inputs may truncate diagnostics earlier than
  necessary.

### More diagnostic feedback posture: `1024`, `32`

This option keeps the same compact input ceiling but doubles the diagnostic
budget.

- Good, because `1024` reflects the expectation that normal VERS declarations are
  compact.
- Good, because `32` issues preserves useful accumulated feedback without allowing
  large failure results.
- Bad, because it is less conservative before the future issue-cap option exists.
- Bad, because lowering the default later would be more compatibility-sensitive
  than allowing callers to raise a conservative default later.

### More permissive compatibility posture: `2048`, `32`

This option uses the same diagnostic budget but doubles the input length limit.

- Good, because it further reduces the chance of rejecting unusually long but
  legitimate declarations.
- Good, because it still keeps a clear hard boundary compared with unbounded input.
- Bad, because it is less aligned with the compact-domain expectation for normal
  VERS usage.

### Generous compatibility posture: `4096`, `64`

This option maximizes compatibility cushion among the considered values.

- Good, because it gives broad room for generated declarations and rich diagnostic
  output.
- Bad, because it weakens the practical effect of the fixed resource limits for
  v0.1.0.
- Bad, because `64` issues may add more noise than useful feedback for malformed
  parser input.

## More Information

This decision fills the numeric-value gaps intentionally left by ADR-0027 and
ADR-0028. It should be read with ADR-0030 for the no-options v0.1.0 policy,
ADR-0043 for oversized-input failure behavior, and ADR-0044 for diagnostic
truncation metadata.

This decision should be revisited if real consumers need legitimate declarations
above `1024` code units, if consumers need lower limits for hostile-input safety
profiles, if the diagnostic cap hides the most useful errors in practice, if VERS
defines a normative maximum declaration length, or if a future public options API
changes how effective resource budgets are selected and reported. A future issue
cap option should allow callers to request a higher cap while preserving this
conservative default unless real usage shows the default is too low.
