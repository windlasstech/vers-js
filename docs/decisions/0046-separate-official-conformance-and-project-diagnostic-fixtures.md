---
parent: Decisions
nav_order: 46
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Separate Official Conformance Fixtures and Project Diagnostic Fixtures

## Context and Problem Statement

ADR-0008 decides that v1 conformance uses official VERS parse/canonical fixtures,
starting with `vers_canonical_parse_test.json`, supplemented by project-owned
negative fixtures where the official suite does not cover errors that vers-js must
report through its public issue model.

The project now needs to make that boundary explicit. The official VERS fixture
schema models failures with `expected_failure: true` and a human-readable
`expected_failure_reason`; it does not define vers-js issue codes, spans,
diagnostic fatality, truncation metadata, or public result-shape assertions. The
current official parse fixture also includes a non-canonical ordering failure, but
ADR-0021 and ADR-0042 reserve `canonical.non_canonical_order` for future semantic
or advisory layers rather than v0.1.0 core results.

The SDD needs an invalid-input mapping table for the public diagnostic contract:
invalid input, expected issue code, optional span, and fatality or phase-boundary
behavior. That table cannot be derived safely from upstream reason strings alone.

How should vers-js divide responsibilities between official VERS fixtures and
project-owned negative diagnostic fixtures?

## Decision Drivers

- Official fixtures should remain the provenance-preserving conformance baseline
  for upstream VERS behavior that is in v0.1.0 scope.
- Project-owned fixtures should pin the vers-js public diagnostic contract without
  modifying upstream fixture files or treating upstream reason text as a stable
  machine contract.
- Issue codes are the stable machine-readable failure contract; messages are not.
- Diagnostic spans must follow the original-input, zero-based, half-open, UTF-16
  code-unit rules from ADR-0023 through ADR-0025, and spans must be omitted when
  unreliable under ADR-0026.
- Fatality expectations should verify ADR-0006 and ADR-0016 phase-boundary behavior
  without becoming part of the public `VersIssue` shape.
- Reserved codes from ADR-0042 must not accidentally become v0.1.0 core-emitted
  diagnostics through fixture mapping.
- Diagnostic-cap metadata from ADR-0044 and resource limits from ADR-0045 need
  project-owned fixture coverage because official VERS fixtures do not model
  vers-js resource boundaries.

## Considered Options

- Official fixtures only
- Map official failure reasons directly to vers-js issue codes
- Separate official conformance fixtures and project diagnostic fixtures
- Full golden diagnostic snapshots for every invalid input

## Decision Outcome

Chosen option: "Separate official conformance fixtures and project diagnostic
fixtures", because official fixtures should define upstream conformance while
project-owned fixtures define the vers-js public diagnostic contract.

vers-js will use two fixture layers:

1. **Official conformance fixtures**: upstream VERS fixtures copied or loaded from
   the pinned snapshot selected by ADR-0041. These fixtures verify in-scope
   upstream behavior such as parse success, parse failure, decoded components, and
   canonical outputs when those expectations do not require excluded semantic
   behavior.
2. **Project diagnostic fixtures**: project-owned negative fixtures that assert
   vers-js-specific failure result behavior, including issue codes, optional spans,
   fatality or phase-boundary expectations, issue ordering where public behavior
   requires it, resource-limit failures, and diagnostic truncation metadata.

Official fixture files must remain semantically distinct from project diagnostic
fixtures. Upstream `expected_failure_reason` strings may be recorded as context or
displayed in test reports, but they must not be parsed as the public issue-code
contract and must not be the only source for diagnostic expectations.

Official fixture cases that do not match the v0.1.0 core scope must receive an
explicit local disposition rather than silently passing or failing. The disposition
vocabulary is:

```text
blocking-core
known-divergence
future-semantic
```

- `blocking-core` means the official case is in v0.1.0 core scope and should block
  the release when it fails.
- `known-divergence` means the official case is intentionally not enforced because
  a vers-js ADR chooses different v0.1.0 core behavior.
- `future-semantic` means the official case depends on comparison, containment,
  ordering, simplification, support-policy, native range translation, or other
  behavior outside v0.1.0 core.

The official `vers_canonical_parse_test.json` non-canonical-order failure is
classified as `future-semantic` or `known-divergence` for v0.1.0 core because
ADR-0021 defers semantic ordering and ADR-0042 keeps
`canonical.non_canonical_order` reserved. It must not be mapped to a core
`VersIssueCode` unless a future ADR promotes that code into the core result
contract.

Project diagnostic fixtures should cover every active v0.1.0 core issue-code
family selected by ADR-0042 and ADR-0043:

- lexical diagnostics;
- syntax diagnostics;
- constraint diagnostics, including malformed percent encoding and invalid UTF-8
  as distinct cases;
- the active decoded-string duplicate version canonical diagnostic;
- oversized input through `resource.input_too_long`;
- diagnostic cap truncation metadata from ADR-0044 and ADR-0045.

Project diagnostic fixtures must not assert exact human-readable `message` text.
They may assert message presence when useful, but issue `code`, `severity`, span,
fatality, and metadata are the stable fixture contract.

### Project Diagnostic Fixture Shape

The exact JSON schema may be refined during implementation, but project diagnostic
fixtures should be equivalent to:

```json
{
  "schemaVersion": 1,
  "id": "constraint-leading-pipe",
  "origin": "project",
  "input": "vers:npm/|>=1.0.0",
  "tags": ["constraint", "fatal-boundary"],
  "expected": {
    "ok": false,
    "issues": [
      {
        "code": "constraint.leading_pipe",
        "severity": "error",
        "span": { "start": 9, "end": 10 },
        "fatality": "whole"
      }
    ]
  }
}
```

`span` is omitted when ADR-0026 says the location is unreliable. `fatality` is a
test-only field used to verify parser phase behavior. It is not part of public
`VersIssue` values.

### Consequences

- Good, because official fixtures remain a clear upstream conformance baseline.
- Good, because project fixtures can assert precise issue codes, spans, fatality,
  resource-limit behavior, and metadata that upstream fixtures do not define.
- Good, because upstream reason-string wording changes do not become vers-js public
  API changes.
- Good, because reserved semantic and support codes cannot become active merely by
  mapping an upstream negative case into a local diagnostic.
- Good, because the SDD can own a concrete invalid-input mapping table without
  overloading official fixture semantics.
- Neutral, because the test suite will need fixture provenance or origin-aware
  runner behavior.
- Bad, because some upstream negative cases may be duplicated in project fixtures
  to assert vers-js diagnostic details.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- official VERS fixture cases are tracked with explicit local disposition;
- in-scope official parse/canonical cases block v0.1.0 conformance;
- out-of-scope official cases are marked `known-divergence` or `future-semantic`
  with an ADR-based rationale;
- project diagnostic fixtures assert active v0.1.0 core issue codes rather than
  parsing upstream `expected_failure_reason` strings;
- project diagnostic fixtures use original-input UTF-16 half-open spans when spans
  are reliable and omit spans when they are not;
- project diagnostic fixtures include test-only fatality or phase-boundary
  expectations without adding fatality to public `VersIssue` values;
- project diagnostic fixtures cover resource input length and diagnostic truncation
  metadata;
- reserved codes such as `canonical.non_canonical_order`,
  `canonical.invalid_comparator_sequence`, `support.unknown_type`, and
  `support.unsupported_semantic` are not expected from v0.1.0 core public
  functions.

## Pros and Cons of the Options

### Official fixtures only

This option uses upstream fixtures as the only negative and positive fixture
source for v0.1.0.

- Good, because it is the smallest fixture policy and keeps conformance tightly
  tied to upstream files.
- Good, because fixture maintenance is simple while the official suite is small.
- Bad, because upstream fixtures do not define vers-js issue codes, spans,
  fatality, resource metadata, or diagnostic caps.
- Bad, because the current official parse fixture does not cover many active
  v0.1.0 issue codes.

### Map official failure reasons directly to vers-js issue codes

This option derives local diagnostic expectations from upstream
`expected_failure_reason` strings.

- Good, because it reuses upstream negative cases and can reduce duplicated input
  examples.
- Bad, because reason strings are human-readable context, not a stable machine
  contract.
- Bad, because it cannot derive reliable spans or fatality.
- Bad, because it would pressure the project to activate reserved semantic codes
  such as `canonical.non_canonical_order` prematurely.

### Separate official conformance fixtures and project diagnostic fixtures

This option keeps upstream conformance and vers-js diagnostics as separate fixture
layers.

- Good, because each fixture layer has one clear purpose.
- Good, because it preserves upstream provenance while allowing vers-js to define
  its public failure contract precisely.
- Good, because it supports SDD mapping tables without changing official fixture
  semantics.
- Bad, because the test runner and documentation must explain fixture origin and
  disposition.

### Full golden diagnostic snapshots for every invalid input

This option snapshots complete failure results, including exact messages and full
issue arrays, for all invalid inputs.

- Good, because it gives the strongest regression protection for current output.
- Good, because it can catch unintended changes to issue ordering and text.
- Bad, because exact messages are not the machine contract selected by ADR-0007.
- Bad, because full snapshots are brittle while the first parser implementation is
  still being designed.
- Bad, because harmless message improvements or internal ordering refinements can
  create noisy fixture diffs.

## More Information

This decision refines ADR-0008's statement that project-owned negative fixtures
supplement official parse/canonical fixtures. It depends on the upstream snapshot
pin from ADR-0041, the diagnostic collection policy from ADR-0006, the phase and
fatal-boundary model from ADR-0016, the span policies from ADR-0023 through
ADR-0026, the core/reserved issue-code split from ADR-0042, the resource issue code
from ADR-0043, the truncation metadata shape from ADR-0044, and the concrete
resource limits from ADR-0045.

The SDD should contain the detailed invalid-input to issue-code, span, and fatality
mapping table. This ADR records the fixture boundary and ownership policy, not the
complete mapping table itself.

This decision should be revisited if upstream VERS fixtures add structured issue
codes, spans, fatality, or diagnostic metadata; if vers-js promotes currently
reserved semantic/support codes into v0.1.0-style core results in a later release;
or if a future tolerant repair or advisory API needs separate warning/suggestion
fixture layers.
