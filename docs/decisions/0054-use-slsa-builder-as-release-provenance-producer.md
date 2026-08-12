---
parent: Decisions
nav_order: 54
status: accepted
date: 12026-08-12
decision-makers: Yunseo Kim
---

# Use slsa-builder as the Release Provenance Producer

## Context and Problem Statement

ADR-0051 establishes the release trust boundary: maintainer-signed annotated tags trigger hosted CI
publication through npm Trusted Publishing, with GitHub Release notes curated from the changelog.
That ADR deliberately leaves the provenance-production mechanism to the operational runbook
(`docs/release.md`).

The original runbook design targeted the SLSA GitHub Generator generic workflow for SLSA Build L3
provenance, but that integration was never implemented. The v0.1.1 first publish used a one-time
token-based bootstrap without SLSA provenance, and the token path has since been removed.

Windlass has since implemented `slsa-builder`: a trusted Go core (canonical JSON per RFC 8785,
digest-verified handoffs, a closed diagnostic registry, identity binding, SLSA v1 provenance models,
and offline-capable Sigstore bundle verification), an npm publish profile with a four-state publish
convergence machine, and a Go-native sigstore-go DSSE signer that signs the exact preassembled
Statement bytes. `slsa-builder` exposes a public reusable workflow,
`.github/workflows/js-ts-npm-package-slsa3.yml`, with `build`, `provenance-sign`, and `publish`
jobs. Its M1 implementation is complete but it has not cut a release yet, so it needs a real public
caller repository with an established npm package to dogfood the reusable workflow end to end before
its first release.

Which provenance producer should the vers-js release pipeline adopt?

## Decision Drivers

- The publish path must remain tokenless end to end, using OIDC credentials only, with no long-lived
  secrets anywhere in the release flow.
- Release provenance should carry a Windlass-controlled SLSA v1 predicate from an org-controlled
  builder identity rather than an externally operated one.
- The npm registry attestation created by `npm publish --provenance-file` is the canonical
  distribution; GitHub Attestations API storage is disabled on this path.
- npm validates externally supplied provenance against the package identity, so the statement must
  use one npm package PURL subject carrying both sha512 and sha256 digests.
- Publish behavior must fail closed: version absent publishes once; a same-run retry succeeds
  idempotently without a second publish; a new run for an already-published version fails with
  `foreign-conflict`; an indeterminate registry read-back fails closed with zero mutations.
- The caller workflow must stay thin and comply with Windlass workflow hardening: SHA-pinned
  references, `step-security/harden-runner`, top-level deny-all permissions, and minimal job-level
  elevation.
- ADR-0051's trust boundary stays unchanged; this decision only selects the provenance producer
  within it.
- Dogfooding slsa-builder from a real public package provides M1 validation evidence before
  slsa-builder cuts its own first release.

## Considered Options

- Windlass slsa-builder reusable workflow
- SLSA GitHub Generator generic SLSA3 workflow
- npm native provenance only
- Direct `actions/attest` from the caller workflow

## Decision Outcome

Chosen option: "Windlass slsa-builder reusable workflow", because it satisfies the tokenless,
org-controlled, fail-closed provenance requirements within the ADR-0051 trust boundary while keeping
the caller workflow thin, and because vers-js dogfooding supplies the M1 validation evidence for
slsa-builder itself.

The release pipeline becomes:

1. a `verify` job runs the full repository verification sequence on the tagged commit and checks
   tag, package version, and changelog agreement;
2. a `publish` job calls `windlasstech/slsa-builder/.github/workflows/js-ts-npm-package-slsa3.yml`
   as a reusable workflow with `package-directory: "."`, `access: public`, and `dist-tag: latest`;
3. a `release` job creates the GitHub Release with the tarball, SHA-256 and SHA-512 sidecars, and
   the signed provenance bundle for offline verification.

Supporting rules:

- The reusable workflow reference is pinned to a full commit SHA of slsa-builder `main` with a
  `# main, pre-release` comment until slsa-builder publishes releases; re-pin to a released revision
  afterwards.
- The reserved inputs (`release-asset-mode`, `release-tag`, `provenance-sidecar`,
  `linked-artifact-metadata`) stay unset; the reusable workflow fails closed if they are set. The
  caller-side upload of the provenance bundle as a release asset is an interim measure until
  slsa-builder provides first-class release-asset distribution.
- The pipeline declares no GitHub environment anywhere. Reusable-workflow caller jobs cannot declare
  `environment`, and the OIDC token is minted inside slsa-builder's internal publish job, which
  declares no environment, so the token carries no environment claim. The npm Trusted Publisher
  environment field for `@windlass/vers-js` must therefore be blank.
- Manual reruns must dispatch the workflow from the release tag ref itself; the `verify` job fails
  closed when the `release_tag` input does not match the selected tag ref, so provenance identity
  always binds to the signed tag.

### Consequences

- Good, because the release path is tokenless end to end with no long-lived npm credentials.
- Good, because provenance carries a Windlass SLSA v1 predicate from an org-controlled builder,
  signed by slsa-builder's Go-native DSSE signer over the exact packed tarball.
- Good, because the npm registry attestation is the single canonical distribution, while the
  identical bundle bytes ship as a release asset for offline verification and archival.
- Good, because fail-closed publish convergence removes the caller's ad-hoc publication-state
  probing and bootstrap fallback logic.
- Good, because vers-js dogfooding produces concrete M1 evidence for slsa-builder before its first
  release.
- Neutral, because the pre-release pin tracks a moving `main` SHA and must be re-pinned once
  slsa-builder publishes releases.
- Bad, because the npm Trusted Publisher environment field must be blanked, which deviates from the
  ADR-0051-era configuration and requires a maintainer settings change before the first
  slsa-builder-backed release.
- Bad, because the first live run exercises an M1 pipeline; the risk is mitigated by the caller-side
  verification gate and by fail-closed convergence that performs zero mutations on indeterminate
  state.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation reviews show that:

- `.github/workflows/publish.yml` is a thin caller (verify, reusable-workflow publish call, GitHub
  Release) containing no npm tokens or bootstrap fallback, and passes `actionlint`;
- every third-party action reference is pinned to a full commit SHA, with the slsa-builder
  pre-release `main` pin documented by comment;
- `docs/release.md` documents the slsa-builder provenance model, the blank-environment requirement,
  dispatch-from-tag rerun mechanics, and four-state failure recovery;
- the `v0.1.2` dogfood release publishes through npm Trusted Publishing, and its attestation is
  readable with `npm view @windlass/vers-js@0.1.2 dist attestations --json` from outside the
  repository checkout;
- the GitHub Release for `v0.1.2` carries the `.intoto.jsonl` bundle whose single PURL subject and
  sha512/sha256 digests match the published tarball;
- dogfood outcomes are recorded as evidence in the slsa-builder readiness and live-dogfood tracking
  issues.

## Pros and Cons of the Options

### Windlass slsa-builder reusable workflow

This option calls the org-owned reusable workflow that builds, signs, and publishes with the trusted
Go core.

- Good, because the builder identity, predicate, and signing path are controlled by Windlass.
- Good, because the caller stays thin and the publish convergence machine owns registry state
  handling.
- Good, because dogfooding validates slsa-builder M1 with a real package.
- Bad, because slsa-builder has no releases yet, so the reference pins to a `main` commit SHA until
  releases exist.

### SLSA GitHub Generator generic SLSA3 workflow

This option uses `slsa-framework/slsa-github-generator` to generate provenance for the packed
tarball and passes that provenance to `npm publish --provenance-file`.

- Good, because the generator is mature and supported by the `slsa-verifier` ecosystem.
- Bad, because `slsa-verifier` requires the trusted builder identity to be referenced by semantic
  version tag, forcing a documented exception to SHA pinning.
- Bad, because the builder identity and predicate are operated outside Windlass.
- Bad, because the caller must hand-construct the npm PURL subject input and stage draft releases,
  which adds fragile plumbing to the caller workflow.

### npm native provenance only

This option relies on `npm publish --provenance` without an external provenance file.

- Good, because it requires no additional workflow infrastructure.
- Bad, because the statement and signing path are npm-operated and do not carry a Windlass
  predicate.
- Bad, because it does not satisfy the organizational requirement for an org-controlled provenance
  producer.

### Direct `actions/attest` from the caller workflow

This option signs the tarball digest with `actions/attest` directly from the vers-js workflow.

- Good, because it is simple and GitHub-native.
- Bad, because `actions/attest` is retired as the Windlass signing adapter in favor of the trusted
  Go core signer.
- Bad, because it stores attestations in the GitHub Attestations API, which is disabled on this
  path, and splits the canonical distribution away from the npm registry.

## More Information

- ADR-0051 records the release trust boundary this decision operates within:
  [Use Signed Tags and npm Trusted Publishing for Releases](0051-use-signed-tags-and-npm-trusted-publishing-for-releases.md).
- The maintainer runbook is `docs/release.md`.
- slsa-builder repository: <https://github.com/windlasstech/slsa-builder>
- slsa-builder ADR-0064 records the npm PURL subject with sha512 and sha256; slsa-builder ADR-0077
  records the Go-native DSSE signing decision.
- Dogfood tracking:
  [slsa-builder issues `[F00] Dogfood resource readiness` and `[P06] Live M1 dogfood`](https://github.com/windlasstech/slsa-builder/issues/30).
- npm Trusted Publishing: <https://docs.npmjs.com/trusted-publishers>
- npm provenance statements: <https://docs.npmjs.com/generating-provenance-statements>
