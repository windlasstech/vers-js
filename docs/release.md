# Release Process

This document is the canonical maintainer runbook for releasing `@windlass/vers-js` to npm and
GitHub. It implements
[ADR-0051](decisions/0051-use-signed-tags-and-npm-trusted-publishing-for-releases.md), which
documents the trust boundary for release publication.

> [!NOTE]  
> The pipeline described here uses the Windlass slsa-builder reusable workflow as the provenance
> producer. That changes the provenance-generation mechanism recorded in ADR-0051's implementation
> context. Accepted ADR bodies are immutable, so ADR-0051 stays as written; the maintainer should
> evaluate a short follow-up ADR that records the slsa-builder adoption.

The release model is:

1. prepare a release PR with the version and changelog updates;
2. merge the release PR into `main` after all required checks pass;
3. create and push a signed annotated Git tag from the updated `main` commit;
4. let the tag-triggered GitHub Actions workflow verify the tagged commit, publish to npm through
   the Windlass slsa-builder reusable workflow with npm Trusted Publishing, and create the GitHub
   Release. If the tag workflow needs to be rerun manually before npm publication succeeds, use the
   workflow's `release_tag` input with the existing signed tag name, started from the tag ref.

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
> A manual dispatch must be started from the tag ref itself: select the release tag in the dispatch
> ref picker, then pass the same tag name as `release_tag`. The verify job fails closed unless
> `release_tag` equals the selected tag ref, because the reusable workflow builds the caller's
> `github.ref` and the provenance identity must bind to the signed tag.

The workflow has three jobs:

1. `verify`: runs the full repository verification sequence on the tagged commit (`fmt:check`,
   `lint:ts:github`, `lint:md`, `typecheck`, `test`, `test:coverage`, `build`, `verify:package`,
   `verify:runtime`) and checks that the tag name, the `package.json` version, and the
   `CHANGELOG.md` Human Era version heading agree.
2. `publish`: calls the slsa-builder reusable workflow
   `windlasstech/slsa-builder/.github/workflows/js-ts-npm-package-slsa3.yml`, pinned by full commit
   SHA with a `# main, pre-release` comment until slsa-builder cuts releases. Inputs are
   `package-directory: "."`, `access: public`, and `dist-tag: latest`. The reserved inputs
   `release-asset-mode`, `release-tag`, `provenance-sidecar`, and `linked-artifact-metadata` are
   intentionally unset; the reusable workflow fails closed if they are set.
3. `release`: creates the GitHub Release from the signed tag with the release assets listed below.

### Provenance model

Provenance is generated and signed by slsa-builder's Go-native sigstore-go DSSE signer using the
Windlass SLSA v1 predicate. The statement covers the exact packed tarball as one PURL subject
carrying both sha512 and sha256 digests.

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
(`js-ts-npm-provenance-bundle-<run_id>-<run_attempt>`), verifies that the bundle's single subject is
named with the npm package PURL (for example `pkg:npm/%40windlass/vers-js@X.Y.Z`) and that its
digests match the published tarball digests before attaching it, and fails closed on mismatch. The
`.intoto.jsonl` release asset is the identical bytes, published for offline verification and
archival. This caller-side asset upload is an interim measure until slsa-builder provides
first-class release-asset distribution through the reserved `release-asset-mode` and
`provenance-sidecar` inputs.

The release body comes from the matching `CHANGELOG.md` version section. Do not use generated commit
logs as the release notes.

## Failure recovery

The slsa-builder publish job converges to one of four states:

1. version absent from the registry: publish once;
2. same-run retry after a failed publish step: idempotent success without a second publish;
3. a new run for an already-published version: fail closed with `foreign-conflict`, and the GitHub
   Release job is skipped because it needs the publish job;
4. indeterminate registry read-back: fail closed with zero mutations.

Before npm publish succeeds, fix the failed release workflow and rerun it against the same signed
tag when possible. Do not move or recreate a published release tag without an explicit maintainer
decision.

After npm publish succeeds, the npm version is immutable for normal release purposes. If GitHub
Release creation fails after npm publish:

1. keep the npm package version as published;
2. recreate the release from the existing signed tag;
3. use the matching `CHANGELOG.md` section as the release body.

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
- Keep a Changelog: <https://keepachangelog.com/en/1.1.0/>
- Windlass security policy: <https://github.com/windlasstech/.github/blob/main/SECURITY.md>
- Windlass workflow hardening guide:
  <https://github.com/windlasstech/.github/blob/main/docs/security/workflow-hardening.md>
