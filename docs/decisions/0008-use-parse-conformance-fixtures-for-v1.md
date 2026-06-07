---
parent: Decisions
nav_order: 8
status: accepted
date: 12026-06-07
decision-makers: Yunseo Kim
---

# Use Parse Conformance Fixtures for v1

## Context and Problem Statement

The first vers-js release will expose Result-centered functions for canonical
VERS syntax validation, canonicalization, and parsed declaration metadata.
ADR-0001, ADR-0004, and ADR-0005 explicitly keep comparison, containment,
native range translation, resolver behavior, vulnerability interpretation, and
VEX semantics outside the first release.

The official VERS test suite is broader than this first-release scope. It
defines fixture families for building, parsing, roundtripping, comparison,
containment, equality, native range conversion, inversion, and merging. Some of
those families require VERS type-specific version comparison or ecosystem-native
range translation.

Which official fixture family should define vers-js v1 conformance?

## Decision Drivers

- v1 conformance should match the public capabilities promised by the first
  release.
- The conformance claim should not accidentally commit vers-js to semantic range
  operations that ADR-0001, ADR-0004, and ADR-0005 exclude.
- Official VERS tests should be used where they match the supported surface.
- Unsupported official fixture families should remain visible as future work,
  not silently ignored as if already implemented.
- Future semantic features should expand conformance deliberately through a new
  decision and release plan.

## Considered Options

- Parse conformance fixtures for v1
- Parse plus selected roundtrip/build fixtures for v1
- All official base conformance fixtures for v1
- Full official VERS fixture suite for v1

## Decision Outcome

Chosen option: "Parse conformance fixtures for v1", because it aligns v1
conformance with canonical syntax validation and parsed metadata while avoiding
semantic fixture families that require type-specific comparison, containment,
native range translation, or resolver behavior.

The v1 conformance suite will use official VERS parse/canonical fixtures that
exercise canonical syntax validation and decoded declaration metadata. The
initial official fixture family is `vers_canonical_parse_test.json`, supplemented
by project-owned negative fixtures where the official suite does not cover
errors vers-js must report through its public issue model.

The v1 conformance claim does not include official fixture families for:

- `comparison`;
- `equality`;
- `containment`;
- `from_native`;
- `merge`;
- `invert`;
- semantic simplification beyond canonical syntax validation;
- resolver behavior, vulnerability interpretation, or VEX semantics.

`roundtrip` and `build` fixtures may be used only when an implementation review
shows the selected fixture does not require unsupported type-specific semantic
behavior. Passing such a fixture does not expand the v1 conformance claim beyond
canonical syntax validation, canonicalization, and parsed metadata.

Semantic fixture families can be adopted only after a future ADR expands the
supported capability family and a follow-up release implements that capability.

### Consequences

- Good, because the conformance label matches the v1 public API and data model.
- Good, because official parse fixtures can validate interoperability without
  scope creep into semantic range operations.
- Good, because future semantic feature work has an explicit decision gate.
- Good, because project-owned negative fixtures can cover diagnostic behavior not
  specified by official tests.
- Neutral, because vers-js v1 will be a conforming parser, not a full VERS
  semantic engine.
- Bad, because consumers needing containment, comparison, native translation, or
  resolver-grade behavior must wait for a later release or use another library.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- v1 test setup identifies the adopted official parse/canonical fixture files;
- project-owned negative fixtures cover unsupported forms and diagnostic edge
  cases relevant to ADR-0006 and ADR-0007;
- v1 documentation avoids claiming full VERS semantic conformance;
- unsupported official fixture families are absent from blocking v1 conformance
  checks or are marked as unsupported/future work;
- any future semantic fixture-family adoption is backed by a separate ADR and
  follow-up release plan.

## Pros and Cons of the Options

### Parse conformance fixtures for v1

This option limits v1 conformance to official parse/canonical fixtures plus
project-owned negative fixtures for the public diagnostic contract.

- Good, because it matches canonical syntax validation and parsed metadata.
- Good, because it preserves the first-release boundary from ADR-0001,
  ADR-0004, and ADR-0005.
- Good, because it avoids depending on type-specific version comparison to make a
  parser conformance claim.
- Bad, because the package cannot claim support for the broader official VERS
  semantic fixture suite.

### Parse plus selected roundtrip/build fixtures for v1

This option adopts parse fixtures and selected build or roundtrip fixtures that
appear compatible with the v1 API.

- Good, because `canonicalizeVers()` can be checked against official expected
  canonical strings where the fixture is purely syntactic.
- Good, because it can provide more coverage for canonical output.
- Bad, because selecting safe fixtures requires careful review and can blur the
  conformance boundary.
- Bad, because some roundtrip/build expectations may depend on type-specific
  ordering or simplification semantics outside v1 scope.

### All official base conformance fixtures for v1

This option treats every official `test_group: "base"` fixture as part of v1
conformance.

- Good, because it follows the upstream base/advanced grouping directly.
- Good, because the phrase "base conformance" is easy to explain.
- Bad, because official base fixtures can include comparison or equality tests
  that require semantic version ordering.
- Bad, because it conflicts with the existing first-release scope discipline.

### Full official VERS fixture suite for v1

This option adopts all official fixture families immediately.

- Good, because it would support the strongest conformance claim.
- Good, because consumers needing semantic VERS operations would receive one
  complete package.
- Bad, because it requires comparison, containment, native range translation,
  merge, invert, and related semantic behavior that v1 explicitly excludes.
- Bad, because implementation complexity would expand beyond the first parser
  release.

## More Information

This decision defines which official fixture family is in scope. The policy for
pinning the upstream spec and test source is decided separately in ADR-0009.

External references:

- VERS test overview:
  <https://github.com/package-url/vers-spec/blob/main/docs/tests.md>
- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- VERS canonical parse tests:
  <https://github.com/package-url/vers-spec/blob/main/tests/vers_canonical_parse_test.json>

This decision should be revisited if one of the following becomes true:

- vers-js adds comparison, equality, containment, native range translation,
  merge, invert, resolver behavior, vulnerability interpretation, or VEX
  semantics;
- official VERS tests split syntax/canonical parser conformance into a more
  precise fixture family;
- consumer requirements demand semantic conformance in the next release.
