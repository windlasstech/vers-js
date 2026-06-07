---
parent: Decisions
nav_order: 9
status: accepted
date: 12026-06-07
decision-makers: Yunseo Kim
---

# Use Snapshot-Pinned VERS Spec and Tests

## Context and Problem Statement

ADR-0008 defines which official VERS fixture family applies to vers-js v1
conformance. The package also needs a policy for which upstream VERS spec and
test version that conformance claim targets.

The upstream `package-url/vers-spec` repository is still evolving. At the time
of this decision, the repository exposes docs and JSON fixtures on `main`, but
does not publish GitHub releases or tags that can serve as stable conformance
anchors. VERS is also expected to be submitted to Ecma after further
standardization work.

Should vers-js continuously track upstream `main`, pin a source snapshot, or
wait for release-tagged VERS artifacts before claiming conformance?

## Decision Drivers

- Release conformance should be reproducible for consumers, CI, and future
  maintainers.
- Upstream VERS changes should be detected without making unrelated vers-js
  changes fail unpredictably.
- The policy should work before upstream VERS publishes stable tags or releases.
- The policy should transition cleanly to release-based pinning once upstream
  VERS stabilizes through Ecma submission and tagged releases.
- Conformance source changes should be reviewed deliberately, not absorbed
  silently from `main`.

## Considered Options

- Track upstream `main` for blocking conformance
- Pin an upstream source snapshot
- Vendor fixture copies without recording upstream identity
- Wait for upstream release tags before implementing conformance tests

## Decision Outcome

Chosen option: "Pin an upstream source snapshot", because it gives vers-js a
reproducible conformance baseline before upstream VERS publishes stable releases
while still allowing deliberate upgrades when the upstream spec and tests change.

vers-js v1 conformance will target a specific `package-url/vers-spec` snapshot.
The implementation should record enough upstream identity to reproduce the
selected spec and fixtures, such as:

- upstream repository URL;
- commit SHA;
- selected fixture file paths;
- fixture blob SHA or checksum where practical;
- date the snapshot was adopted;
- local notes about any project-owned supplemental fixtures.

Blocking conformance tests must use the pinned snapshot, not whatever is current
on upstream `main` at test time. Upstream `main` may be checked by a manual,
scheduled, or advisory drift workflow, but drift checks should not redefine the
release conformance baseline automatically.

After upstream VERS completes Ecma submission and publishes stable tags or
releases, future vers-js releases should prefer pinning to an upstream release
or tag instead of an arbitrary commit snapshot. Moving from commit snapshot
pinning to release pinning does not require changing the fixture-family decision
from ADR-0008, but the specific baseline update should still be reviewed in a
normal change or ADR if it changes supported behavior.

### Consequences

- Good, because each vers-js release can state and reproduce the exact VERS spec
  and test baseline it targets.
- Good, because upstream changes are reviewed intentionally instead of entering
  blocking tests unexpectedly.
- Good, because the policy works before upstream VERS has tags or releases.
- Good, because it leaves a clear migration path to release/tag pinning after
  upstream stabilization.
- Neutral, because maintainers need a small update process to advance the pinned
  snapshot.
- Bad, because pinned snapshots can lag behind upstream unless drift is checked
  and reviewed regularly.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- conformance test setup records the selected upstream `vers-spec` snapshot;
- blocking conformance tests run against the recorded snapshot rather than live
  upstream `main`;
- fixture updates are reviewed as explicit changes;
- latest-upstream drift checks, if present, are advisory unless a maintainer
  intentionally updates the pinned baseline;
- once upstream VERS publishes stable releases or tags after Ecma stabilization,
  future baseline updates prefer those release identifiers.

## Pros and Cons of the Options

### Track upstream `main` for blocking conformance

This option runs blocking conformance checks against the latest upstream VERS
docs and tests every time tests run.

- Good, because vers-js detects upstream spec and fixture changes immediately.
- Good, because maintainers do not need a manual snapshot update process.
- Bad, because unrelated vers-js changes can fail when upstream changes.
- Bad, because release conformance is not reproducible unless every test run also
  records the exact upstream commit used.
- Bad, because it is risky while upstream VERS has no stable release tags.

### Pin an upstream source snapshot

This option records a specific upstream commit or equivalent immutable source
snapshot and runs blocking conformance checks against that baseline.

- Good, because it makes release conformance reproducible.
- Good, because it separates upstream drift detection from blocking release
  validation.
- Good, because it can later transition to release/tag pinning without changing
  the v1 conformance family.
- Bad, because maintainers must deliberately update the pinned baseline.

### Vendor fixture copies without recording upstream identity

This option copies fixtures into the repository and treats those copies as the
baseline without recording upstream commit or checksum metadata.

- Good, because local test execution is simple and does not require network
  access.
- Bad, because future maintainers cannot easily audit which upstream spec/test
  version the copies came from.
- Bad, because silent local edits could blur the boundary between official and
  project-owned fixtures.

### Wait for upstream release tags before implementing conformance tests

This option delays official fixture-based conformance until upstream VERS
publishes stable tags or releases.

- Good, because release identifiers are better conformance anchors than arbitrary
  commit snapshots.
- Good, because it avoids pinning to a moving pre-standardization source.
- Bad, because vers-js v1 would lack official fixture-based parser conformance
  despite official parse fixtures already existing.
- Bad, because consumers would receive weaker evidence for parser correctness in
  the first release.

## More Information

This decision defines how upstream spec and test sources are pinned. The set of
official fixture families adopted for v1 conformance is decided separately in
ADR-0008.

External references:

- VERS specification repository:
  <https://github.com/package-url/vers-spec>
- VERS test overview:
  <https://github.com/package-url/vers-spec/blob/main/docs/tests.md>
- VERS test fixtures:
  <https://github.com/package-url/vers-spec/tree/main/tests>
- VERS canonical parse tests:
  <https://github.com/package-url/vers-spec/blob/main/tests/vers_canonical_parse_test.json>

This decision should be revisited if one of the following becomes true:

- upstream VERS publishes stable release tags or release artifacts;
- Ecma standardization creates a normative VERS version identifier;
- conformance fixtures are distributed separately from the `vers-spec`
  repository;
- consumers require live tracking of upstream VERS changes instead of
  reproducible release baselines.
