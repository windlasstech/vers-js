# Release Process

This document is the canonical maintainer runbook for releasing `@windlass/vers-js` to npm and
GitHub. It implements
[ADR-0051](decisions/0051-use-signed-tags-and-npm-trusted-publishing-for-releases.md), which
documents the trust boundary for release publication.

> [!NOTE]  
> The pipeline described here uses the Windlass slsa-builder reusable workflow as the provenance
> producer. That changes the provenance-generation mechanism assumed when
> [ADR-0051](decisions/0051-use-signed-tags-and-npm-trusted-publishing-for-releases.md) was written.
> Accepted ADR bodies are immutable, so ADR-0051 stays as written; the slsa-builder adoption is
> recorded separately in
> [ADR-0054](decisions/0054-use-slsa-builder-as-release-provenance-producer.md), and the
> manual-retry separation of the dispatch ref from the build source ref is recorded in
> [ADR-0055](decisions/0055-separate-dispatch-ref-from-build-source-ref-for-release-retries.md).

The release model is:

1. prepare a release PR with the version and changelog updates;
2. merge the release PR into `main` after all required checks pass;
3. create and push a signed annotated Git tag from the updated `main` commit;
4. let the tag-triggered GitHub Actions workflow verify the tagged commit, publish to npm through
   the Windlass slsa-builder reusable workflow with npm Trusted Publishing, and create the GitHub
   Release. If the tag workflow needs to be rerun manually before npm publication succeeds, dispatch
   it from any ref (for example `main`, to pick up pipeline fixes) with the `release_tag` input
   naming the existing signed tag; the reusable workflow still builds the tag's content.

This keeps the changelog human-curated, the source revision signed, and the npm publication
tokenless and provenance-backed.

## Release authority and prerequisites

Only a maintainer with repository release permissions and npm package publishing authority may
perform a release.

npm Trusted Publishing for the `@windlass/vers-js` package is configured on npmjs.com with:

- publisher: GitHub Actions;
- organization or user: `windlasstech`;
- repository: `vers-js`;
- workflow filename: `publish.yml`;
- allowed action: `npm publish`.

npm package settings require two-factor authentication and disallow traditional publish tokens.
Trusted Publishing uses short-lived OIDC credentials and does not require an `NPM_TOKEN` secret.

### Trusted Publisher environment model

The release pipeline declares no GitHub environment anywhere:

- Reusable-workflow caller jobs cannot declare `environment`; this is a GitHub platform restriction.
- The OIDC token is minted inside slsa-builder's internal publish job, which declares no
  environment, so the token carries no environment claim.
- For `workflow_call` publishes, npm validates the calling workflow's repository and workflow
  filename claims. The Trusted Publisher settings above therefore stay valid without an environment
  name.

> [!WARNING]  
> The npmjs.com Trusted Publisher environment field for `@windlass/vers-js` must be left blank. If
> an environment name is still set, for example `npm` from the pre-slsa-builder configuration,
> publish authentication fails. Clearing the field is a maintainer action item before the first
> slsa-builder-backed release.

### First-publish bootstrap (historical)

> [!NOTE]  
> This section is historical. The 0.1.x first-publish bootstrap was completed with v0.1.1
> (12026-06-16), and npm Trusted Publishing is now configured. The record stays for archaeology; it
> is not the current release path.

npm Trusted Publishing can only be configured for a package that already exists on the npm registry.
The first `@windlass/vers-js` release therefore used a one-time maintainer-controlled local publish
before Trusted Publishing was configured:

1. complete the release PR and local release preparation steps below;
2. publish from a maintainer-controlled local environment with npm account 2FA;
3. configure npm Trusted Publishing for `publish.yml` after the package exists;
4. push the signed tag so GitHub Actions can create the GitHub Release, and skip npm publication
   because the version is already published;
5. use Trusted Publishing for subsequent npm releases.

The local first-publish command was:

```bash
pnpm publish --access public --no-git-checks
```

Token-based publishing is retired as a release path. Do not reintroduce publish tokens without an
explicit maintainer decision and a new ADR.

Release workflows must follow Windlass supply-chain requirements:

- run on GitHub-hosted runners when npm provenance or release attestations are claimed;
- use explicit minimal permissions, with `id-token: write` only where OIDC credentials are minted;
- use SHA-pinned third-party actions, except where Windlass policy documents a specific exception;
- start jobs with `step-security/harden-runner` in audit mode;
- avoid dependency caching in release builds;
- generate SLSA Build L3 provenance for the release npm tarball with the Windlass slsa-builder
  reusable workflow: a Go-native signer, a Windlass SLSA v1 predicate, and the npm registry
  attestation as the canonical distribution.

## Release PR checklist

Create a release PR from `main` and include only release-preparation changes.

The release PR must:

- update `package.json` to the release version;
- promote `CHANGELOG.md` entries from `[Unreleased]` into the new version section;
- use the Human Era release date format in the changelog heading, for example
  `## [0.1.0] - 12026-06-13`;
- recreate an empty `[Unreleased]` section at the top of `CHANGELOG.md`;
- update changelog comparison links;
- update release-relevant documentation if the release changes public behavior, supported runtimes,
  package metadata, or security posture;
- pass the repository verification sequence.

Run the project scripts rather than bare tool commands:

```bash
pnpm run fmt:check
pnpm run lint:ts
pnpm run lint:md
pnpm run typecheck
pnpm run test
pnpm run test:coverage
pnpm run build
pnpm run verify:package
pnpm run verify:runtime
```

Do not create the release tag from the release PR branch. Tag only the final merged `main` commit.

## Local signed tag creation

After the release PR is merged, update the local checkout and verify that the working tree is clean:

```bash
git switch main
git pull --ff-only origin main
git status --short
```

Confirm that the package version, changelog section, and tag name agree:

```bash
node -p 'require("./package.json").version'
git tag --list "v$(node -p 'require("./package.json").version')"
```

The local preparation script performs these checks, runs the Node.js-based repository verification
commands, reviews package contents with `pnpm pack --json --dry-run`, and extracts the matching
changelog section to `.release/release-notes-vX.Y.Z.md`. Deno and Bun runtime smoke checks remain
required in CI and the release PR checklist, but are not required by local tag preparation:

```bash
pnpm run release:prepare
```

Review the package contents before tagging:

```bash
pnpm pack --dry-run
```

Create and verify a signed annotated tag:

```bash
VERSION="$(node -p 'require("./package.json").version')"
git tag -s -a "v${VERSION}" -m "v${VERSION}"
git tag -v "v${VERSION}"
```

To let the preparation script create and verify the tag after all checks pass, run:

```bash
pnpm run release:prepare -- --tag
```

Push the signed tag to start the release workflow:

```bash
git push origin "v${VERSION}"
```

To create, verify, and push the signed tag in one validated release-preparation run, use the
explicit push option:

```bash
pnpm run release:prepare -- --tag --push
```

## Tag-triggered publish workflow

The publish workflow is defined in `.github/workflows/publish.yml` and runs for release tags
matching `v*`. It can also be started manually with the `workflow_dispatch` `release_tag` input.

> [!IMPORTANT]  
> A manual dispatch may run from any ref, but `release_tag` must name the existing signed release
> tag (for example `v0.1.2`). The caller passes `refs/tags/<release_tag>` as the reusable workflow's
> `source-ref` input: slsa-builder resolves and peels the tag in isolation, pins the package
> checkout to the resolved commit, and binds the signed provenance to that built tag identity while
> recording the dispatch ref and revision as signed invocation members. Tag existence and version
> agreement fail closed downstream (caller checkout, slsa-builder's `source-ref-invalid` resolution,
> and the tag/version/changelog agreement check). Dispatching from `main` is the expected rerun path
> when the pipeline itself was fixed after tagging.

The `release` job separates pipeline tooling from release authority with two checkouts. `pipeline/`
uses the default event or dispatch ref, so the caller scripts in `scripts/` come from the same ref
as the executing workflow. `release-source/` checks out the signed release tag and is the authority
for release content, including the `CHANGELOG.md` section used for release notes. Downloaded
artifacts, generated checksum sidecars, and `release-notes.md` are staged in `release-assets/`. This
boundary lets a maintainer dispatch current pipeline tooling from `main` for an old tag, such as the
pending `v0.1.3` retry, while release content and provenance remain bound to the signed tag.

The workflow has three jobs:

1. `verify`: runs the full repository verification sequence on the tagged commit (`fmt:check`,
   `lint:ts:github`, `lint:md`, `typecheck`, `test`, `test:coverage`, `build`, `verify:package`,
   `verify:runtime`) and checks that the tag name, the `package.json` version, and the
   `CHANGELOG.md` Human Era version heading agree.
2. `publish`: calls the slsa-builder reusable workflow
   `windlasstech/slsa-builder/.github/workflows/js-ts-npm-package-slsa3.yml`, pinned by full commit
   SHA with a `# main, pre-release` comment until slsa-builder cuts releases. Inputs are
   `package-directory: "."`, `access: public`, `dist-tag: latest`, and `source-ref`: tag pushes pass
   the exact empty string (preserving the default byte-compatible behavior), while manual dispatches
   pass `refs/tags/<release_tag>` so the build resolves and checks out the signed tag commit
   regardless of the dispatch ref. The reserved inputs `release-asset-mode`, `release-tag`,
   `provenance-sidecar`, and `linked-artifact-metadata` are intentionally unset; the reusable
   workflow fails closed if they are set.
3. `release`: verifies the downloaded tarball against both expected digests, strictly validates the
   complete serialized Sigstore bundle and its release subject, extracts release notes only from
   `release-source/`, and converges the GitHub Release non-destructively. Convergence creates a
   draft first, adds only missing assets to a compatible draft, succeeds without mutations for a
   complete matching published release, and fails closed on conflicts or unreadable state.

### Provenance model

Provenance is generated and signed by slsa-builder's Go-native sigstore-go DSSE signer using the
Windlass SLSA v1 predicate. The statement covers the exact packed tarball as one PURL subject
carrying both sha512 and sha256 digests. The predicate's source identity is the built tag commit; on
manual dispatch retries it additionally records the dispatch ref and revision as signed invocation
members.

The producer-to-caller handoff file is the exact serialized Sigstore bundle. The caller release job
strict-parses the complete bundle and the in-toto Statement decoded from `dsseEnvelope.payload`,
rejecting duplicate JSON members at every nesting level in both documents. It also rejects a legacy
top-level `payload` member.

The caller requires bundle media type `application/vnd.dev.sigstore.bundle.v0.3+json`, DSSE payload
type `application/vnd.in-toto+json`, exactly one signature, a canonical base64 payload, and fatal
UTF-8 decoding of the payload bytes. The decoded Statement must have `_type`
`https://in-toto.io/Statement/v1`, predicate type `https://slsa.dev/provenance/v1`, and exactly one
subject. That subject's name must equal the expected `pkg:npm` PURL, and its sha256 and sha512
digests must exactly match the published tarball digests.

These caller checks are structural and release-consistency validation, not cryptographic
verification. Cryptographic signature and signer-identity verification remain the responsibilities
of the slsa-builder producer and the npm registry.

The bundle is attached to the npm registry attestation with `npm publish --provenance-file` inside
the reusable workflow. Publication uses npm rather than pnpm because pnpm does not support the
`--provenance-file` option. GitHub Attestations API storage is disabled on this path; the npm
registry attestation is the canonical distribution.

### GitHub Release assets

Expected public release assets are:

- `windlass-vers-js-X.Y.Z.tgz`: the exact npm tarball published by the workflow;
- `windlass-vers-js-X.Y.Z.tgz.sha256`: SHA-256 checksum for the tarball;
- `windlass-vers-js-X.Y.Z.tgz.sha512`: SHA-512 checksum for the tarball;
- `windlass-vers-js-X.Y.Z.tgz.intoto.jsonl`: the signed SLSA provenance bundle.

The release job downloads the run-scoped provenance-bundle artifact
(`js-ts-npm-provenance-bundle-<run_id>-<run_attempt>`) into `release-assets/`. The
`Verify provenance bundle subject` step runs
`node ../pipeline/scripts/verify-release-provenance.mjs` from that directory with `TARBALL_NAME`,
`PACKAGE_NAME`, `PACKAGE_VERSION`, `EXPECTED_SHA256`, and `EXPECTED_SHA512` from the publish job's
outputs. Any structural, subject, or digest mismatch fails closed. The `.intoto.jsonl` release asset
contains the exact signer-emitted bundle bytes, published without reserialization for offline
verification and archival. This caller-side asset upload is an interim measure until slsa-builder
provides first-class release-asset distribution through the reserved `release-asset-mode` and
`provenance-sidecar` inputs.

The release body comes only from the matching `release-source/CHANGELOG.md` version section. Do not
use generated commit logs as the release notes.

### GitHub Release convergence

The `Publish GitHub Release with assets` step runs
`node ../pipeline/scripts/converge-github-release.mjs` from `release-assets/`, using the `GH_TOKEN`,
`GH_REPO`, `RELEASE_TAG`, and `TARBALL_NAME` environment inputs. `GH_REPO` is required because
`release-assets/` is not a git checkout: without it, `gh` cannot resolve the target repository. Its
non-destructive state machine handles remote state as follows:

- If the release is confirmed absent, create a draft with `gh release create <tag>`, using
  `--draft`, `--verify-tag`, `--title <tag>`, and `--notes-file release-notes.md`. The create call
  attaches no assets. Upload the four expected assets individually, never with `--clobber`. Read
  back after mutations, download each remote asset to a fresh temporary directory, and compare its
  SHA-256 digest with the local bytes. Publish the complete verified draft with
  `gh release edit <tag> --draft=false --verify-tag`.
- If a published release has the expected tag, title, and body, is neither draft nor prerelease, has
  exactly the four expected assets, and all remote asset bytes match, return read-only success with
  zero mutations.
- If a matching draft already has some assets, verify all existing remote bytes, upload only missing
  assets, and publish after the complete draft passes read-back verification.
- If a published release is incomplete, any metadata or asset bytes differ, unexpected or duplicate
  assets exist, or remote state is unreadable, fail closed before making any mutation.

After an ambiguous mutation failure, convergence performs exactly one read-back. It continues only
from a proven-compatible observed state and never retries a mutation whose effect is uncertain.

Regression coverage lives in `tests/release-provenance.test.mjs` (89 tests) and
`tests/github-release-convergence.test.mjs` (37 tests), with fixtures in `tests/fixtures/release/`.
Both test files run in the normal Vitest suite.

## Failure recovery

The slsa-builder publish job converges to one of four states:

1. version absent from the registry: publish once;
2. same-run retry after a failed publish step: idempotent success without a second publish;
3. a new run for an already-published version: fail closed with `foreign-conflict`, and the GitHub
   Release job is skipped because it needs the publish job;
4. indeterminate registry read-back: fail closed with zero mutations.

Before npm publish succeeds, fix the failed release workflow and rerun it against the same signed
tag when possible. Do not move or recreate the signed release tag.

If the failure was in the release pipeline itself, for example a builder defect fixed after the tag
was pushed, fix the pipeline on `main` and rerun with `workflow_dispatch` using `release_tag`. The
`source-ref` input keeps the build and the signed provenance bound to the signed tag commit, while
the release job's `pipeline/` and `release-source/` checkouts apply current caller tooling to the
same signed release content. The tag does not need to be recreated.

After npm publish succeeds, the npm version is immutable for normal release purposes. The npm
publish result and the caller GitHub Release result are independent: a caller release failure does
not invalidate a successful npm publish.

If GitHub Release convergence fails after npm publish, keep the npm package version as published and
rerun the workflow against the same signed tag. Do not delete or recreate the GitHub Release, move
or recreate the signed tag, or use `--clobber` to replace assets. On rerun, the convergence step:

1. accepts a complete matching published release read-only, with zero mutations;
2. verifies a compatible draft's existing assets, uploads only missing assets, and publishes it;
3. fails closed with zero mutations on any conflicting or unreadable state.

A conflict includes an incomplete published release, metadata or asset-byte mismatches, and
unexpected or duplicate assets. In that case, a maintainer inspects the conflicting release
manually. The workflow does not overwrite, delete, or otherwise repair conflicting remote state.

If npm publish succeeds with a serious release-blocking defect, follow npm and Windlass security
policies for deprecation, advisory publication, or a follow-up patch release. Do not assume the
published version can be reused.

## Post-release verification

After release publication, verify the npm registry attestation and package signatures.

Inspect the registry attestation for the published version:

```bash
npm view "@windlass/vers-js@${VERSION}" dist attestations --json
```

> [!WARNING]  
> Run this npm command outside the repository checkout. The repository's `devEngines.packageManager`
> guard allows pnpm only, so the npm CLI fails inside the project.

Verify package signatures with pnpm:

```bash
pnpm audit signatures
```

Consumers can fetch and verify the registry attestation for the exact tarball digest with pacote or
`npm audit signatures`. The `.intoto.jsonl` release asset enables equivalent offline verification
against the same bundle bytes.

## References

- npm unscoped public package publishing:
  <https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages>
- npm Trusted Publishing: <https://docs.npmjs.com/trusted-publishers>
- npm provenance statements: <https://docs.npmjs.com/generating-provenance-statements>
- GitHub signed tags:
  <https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-tags>
- GitHub Releases:
  <https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository>
- Windlass slsa-builder: <https://github.com/windlasstech/slsa-builder>
- Windlass artifact attestations guide:
  <https://github.com/windlasstech/.github/blob/main/docs/security/artifact-attestations.md>
- Keep a Changelog: <https://keepachangelog.com/en/2.0.0/>
- Windlass security policy: <https://github.com/windlasstech/.github/blob/main/SECURITY.md>
- Windlass workflow hardening guide:
  <https://github.com/windlasstech/.github/blob/main/docs/security/workflow-hardening.md>
