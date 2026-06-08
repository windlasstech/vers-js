---
parent: Decisions
nav_order: 41
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Pin v0.1.0 VERS Spec Snapshot

## Context and Problem Statement

ADR-0008 selects the official VERS parse/canonical fixture family for first
release conformance. ADR-0009 selects snapshot-pinned upstream VERS spec and
test sources instead of live tracking upstream `main`.

The first vers-js release now needs the concrete upstream `package-url/vers-spec`
snapshot that defines the v0.1.0 conformance baseline. The upstream repository
does not publish release tags or GitHub releases at the time of this decision.

Which upstream VERS spec snapshot should vers-js v0.1.0 pin?

## Decision Drivers

- v0.1.0 conformance should be reproducible from an immutable upstream commit.
- The selected snapshot should include the current normalized/canonical VERS
  direction and official parse fixture family.
- The selected snapshot should avoid depending on future upstream `main` changes.
- The selected snapshot should be easy for maintainers and consumers to audit.
- The first release should preserve the v1 scope from ADR-0008 and avoid adopting
  semantic fixture families outside parser conformance.

## Considered Options

- Pin v0.1.0 to upstream commit `cd8a9c98ec1a50918b4d0e1cb4f4a3b3743bf17f`
- Pin v0.1.0 to upstream commit `5be60c006e05ed2bfbbe8e733ce5e9fa75185e64`
- Pin v0.1.0 to upstream commit `328ef6c1ce137027a65446cef5eb9ac751276495`
- Wait for an upstream release tag

## Decision Outcome

Chosen option: "Pin v0.1.0 to upstream commit
`cd8a9c98ec1a50918b4d0e1cb4f4a3b3743bf17f`", because it records the latest
reviewed upstream `main` snapshot for the first release while preserving the
snapshot-pinning policy from ADR-0009.

The v0.1.0 upstream VERS baseline is:

- upstream repository: <https://github.com/package-url/vers-spec>
- upstream commit: `cd8a9c98ec1a50918b4d0e1cb4f4a3b3743bf17f`
- upstream commit date: 12026-05-19
- upstream commit subject: `fix: typo in npm_range_containment_test.json (#70)`
- adopted for vers-js release: v0.1.0
- adopted on: 12026-06-08

The v0.1.0 blocking official fixture baseline is limited by ADR-0008 to parse
conformance. The selected upstream file set for the v0.1.0 snapshot is:

- `docs/standard/specification.md`
- `docs/how-to-parse.md`
- `docs/tests.md`
- `schemas/vers-test.schema-0.1.json`
- `schemas/vers-test.schema-0.2.json`
- `tests/vers_canonical_parse_test.json`

The selected upstream file checksums at commit
`cd8a9c98ec1a50918b4d0e1cb4f4a3b3743bf17f` are:

| Upstream path | SHA-256 |
| --- | --- |
| `docs/standard/specification.md` | `b31ebb053395f610aefcb5291d5f6f21bd2c4569598b88e7abd683b3e02f0a4c` |
| `docs/how-to-parse.md` | `dbe40d2d70a4f36754599f2324dcc24e8403893f0fe0b2788e9bf00d880b3396` |
| `docs/tests.md` | `7d676b76b028187b36b33fa41b52bc5d43b9fbc25b16660828c664b3eed03a0b` |
| `schemas/vers-test.schema-0.1.json` | `d6073515f47eb0b8a3dcf248e76a0b8938f4475a3b1b04e8caafe7e4c750ca30` |
| `schemas/vers-test.schema-0.2.json` | `09300a2031d37314a6fbdde95be50492f058802ba810f907b17db2dcb4c3ac8f` |
| `tests/vers_canonical_parse_test.json` | `ab22ccf0518f08e34bfe17dd141fadb8a166ab0c0b7e399e54462ffc3ac6d83b` |

The v0.1.0 implementation may copy or generate local fixture files from this
snapshot, but any such local files must retain enough metadata to trace them back
to the upstream repository, commit, path, and checksum recorded in this ADR.

### Consequences

- Good, because v0.1.0 conformance has an exact upstream source identity.
- Good, because the first release can use the latest reviewed upstream `main`
  snapshot without live-tracking future upstream changes.
- Good, because selected file checksums make accidental drift or local fixture
  edits easier to audit.
- Neutral, because the selected commit includes a containment fixture typo fix
  outside the v0.1.0 parse conformance scope.
- Bad, because upstream VERS still has no release tag, so the first release is
  pinned to a commit snapshot rather than a formal upstream version.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- v0.1.0 conformance metadata records upstream commit
  `cd8a9c98ec1a50918b4d0e1cb4f4a3b3743bf17f`;
- copied or generated official fixture files are traceable to the upstream paths
  and checksums in this ADR;
- blocking v0.1.0 official conformance tests use
  `tests/vers_canonical_parse_test.json` from this snapshot;
- official semantic fixture families outside ADR-0008 remain excluded from the
  v0.1.0 blocking conformance claim;
- any future upstream baseline change is reviewed as a deliberate decision or
  implementation change instead of silently following upstream `main`.

## Pros and Cons of the Options

### Pin v0.1.0 to upstream commit `cd8a9c98ec1a50918b4d0e1cb4f4a3b3743bf17f`

This option uses the latest reviewed upstream `main` commit known at the time of
the first-release pin decision.

- Good, because it is the current upstream snapshot chosen for v0.1.0.
- Good, because it includes the normalized/canonical direction and official parse
  fixture family needed by ADR-0008.
- Good, because it includes the latest upstream typo fix known at adoption time.
- Neutral, because the latest typo fix affects a containment fixture outside the
  v0.1.0 parser conformance scope.
- Bad, because it is still an arbitrary commit snapshot rather than an upstream
  release tag.

### Pin v0.1.0 to upstream commit `5be60c006e05ed2bfbbe8e733ce5e9fa75185e64`

This option uses the commit that required normalized VERS input before the later
containment fixture typo fix.

- Good, because it captures the normalized/canonical parser direction directly.
- Good, because later upstream changes through `cd8a9c98ec1a50918b4d0e1cb4f4a3b3743bf17f`
  do not appear to change the parse/spec files selected for v0.1.0.
- Bad, because it does not include the later upstream typo fix in
  `npm_range_containment_test.json`.
- Bad, because maintainers would need to explain why the first release skipped a
  later reviewed upstream main commit.

### Pin v0.1.0 to upstream commit `328ef6c1ce137027a65446cef5eb9ac751276495`

This option uses the historical commit that restricted the spec to canonical VERS.

- Good, because it is an important milestone in the upstream canonical parser
  direction.
- Bad, because later upstream commits refined naming, schema, and normalized input
  expectations.
- Bad, because it is a weaker fit for the current v0.1.0 baseline than the chosen
  latest reviewed snapshot.

### Wait for an upstream release tag

This option delays selecting a v0.1.0 upstream baseline until `package-url/vers-spec`
publishes a stable release tag or GitHub release.

- Good, because a formal upstream release would be a better conformance anchor
  than a commit snapshot.
- Bad, because upstream has no release tags or GitHub releases at the time of this
  decision.
- Bad, because waiting would block first-release parser conformance even though
  parse fixtures already exist.

## More Information

This decision concretizes the snapshot policy from ADR-0009 for vers-js v0.1.0.
It does not change the fixture-family scope from ADR-0008.

External references:

- Selected upstream commit:
  <https://github.com/package-url/vers-spec/commit/cd8a9c98ec1a50918b4d0e1cb4f4a3b3743bf17f>
- VERS specification repository:
  <https://github.com/package-url/vers-spec>
- Selected canonical parse fixture at the pinned commit:
  <https://github.com/package-url/vers-spec/blob/cd8a9c98ec1a50918b4d0e1cb4f4a3b3743bf17f/tests/vers_canonical_parse_test.json>

This decision should be revisited for a future release if upstream VERS publishes
stable release tags, publishes separate conformance fixture artifacts, or changes
the parse/canonical fixture format in a way that affects vers-js behavior.
