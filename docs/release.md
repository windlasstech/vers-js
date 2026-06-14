# Release Process

This document is the canonical maintainer runbook for releasing `vers-js` to
npm and GitHub. It implements
[ADR-0051](decisions/0051-use-signed-tags-and-npm-trusted-publishing-for-releases.md),
which records the release publication trust-boundary decision.

The release model is:

1. prepare a release PR with the version and changelog updates;
2. merge the release PR into `main` after all required checks pass;
3. create and push a signed annotated Git tag from the updated `main` commit;
4. let the tag-triggered GitHub Actions workflow publish to npm with Trusted
   Publishing when eligible and create the GitHub Release.

This keeps the changelog human-curated, the source revision signed, and the npm
publication tokenless and provenance-backed.

## Release authority and prerequisites

Only a maintainer with repository release permissions and npm package publishing
authority may perform a release.

Before the first automated npm release, configure npm Trusted Publishing for the
`vers-js` package on npmjs.com:

- publisher: GitHub Actions;
- organization or user: `windlasstech`;
- repository: `vers-js`;
- workflow filename: `publish.yml`;
- environment name: the GitHub environment used by the publish job, for example
  `npm`;
- allowed action: `npm publish`.

After Trusted Publishing is verified, prefer npm package settings that require
two-factor authentication and disallow traditional publish tokens. Trusted
Publishing uses short-lived OIDC credentials and does not require an `NPM_TOKEN`
secret.

### First-publish bootstrap exception

npm Trusted Publishing can only be configured for a package that already exists
on the npm registry. The `vers-js` v0.1.0 first release therefore uses a
one-time maintainer-controlled local publish before Trusted Publishing is
configured.

For v0.1.0 only, before this SLSA-targeted release workflow became the normal
path:

1. complete the release PR and local release preparation steps below;
2. publish from a maintainer-controlled local environment with npm account 2FA;
3. configure npm Trusted Publishing for `publish.yml` after the package exists;
4. push the signed tag so GitHub Actions can create the GitHub Release while
   skipping npm publication for the already-published version;
5. use Trusted Publishing for subsequent npm releases.

The local first-publish command is:

```bash
pnpm publish --access public --no-git-checks
```

Do not keep token-based publishing as the normal release path after Trusted
Publishing is configured. The current release workflow skips only the npm Trusted
Publishing job when the package cannot be published by automation; the SLSA
provenance and GitHub Release jobs still run for the signed tag.

Release workflows must follow Windlass supply-chain requirements:

- run on GitHub-hosted runners when npm provenance or release attestations are
  claimed;
- use explicit minimal permissions, with `id-token: write` only on the npm
  publish job and SLSA provenance job;
- use SHA-pinned third-party actions, except where Windlass policy documents a
  specific exception;
- start jobs with `step-security/harden-runner` in audit mode;
- avoid dependency caching in release builds;
- generate SLSA Build L3 provenance for the release npm tarball with the SLSA
  GitHub Generator generic workflow;
- stage GitHub Release assets in a draft release before publishing the release,
  so immutable releases contain the npm tarball, checksum, and provenance assets
  at publication time.

## Release PR checklist

Create a release PR from `main` and include only release-preparation changes.

The release PR must:

- update `package.json` to the release version;
- promote `CHANGELOG.md` entries from `[Unreleased]` into the new version
  section;
- use the Human Era release date format in the changelog heading, for example
  `## [0.1.0] - 12026-06-13`;
- recreate an empty `[Unreleased]` section at the top of `CHANGELOG.md`;
- update changelog comparison links;
- update release-relevant documentation if the release changes public behavior,
  supported runtimes, package metadata, or security posture;
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

Do not create the release tag from the release PR branch. Tag only the final
merged `main` commit.

## Local signed tag creation

After the release PR is merged, update the local checkout and verify that the
working tree is clean:

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

The local preparation script performs these checks, runs the Node.js-based
repository verification commands, reviews package contents with
`pnpm pack --json --dry-run`, and extracts the matching changelog section to
`.release/release-notes-vX.Y.Z.md`. Deno and Bun runtime smoke checks remain
required in CI and the release PR checklist, but are not required by local tag
preparation:

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

To let the preparation script create and verify the tag after all checks pass,
run:

```bash
pnpm run release:prepare -- --tag
```

Push the signed tag to start the release workflow:

```bash
git push origin "v${VERSION}"
```

To create, verify, and push the signed tag in one validated release-preparation
run, use the explicit push option:

```bash
pnpm run release:prepare -- --tag --push
```

## Tag-triggered npm publish workflow

The publish workflow lives at `.github/workflows/publish.yml` and runs only for
release tags matching `v*`.

The workflow must verify the release before publishing:

1. check out the tagged commit;
2. install with the committed pnpm lockfile;
3. run formatting, linting, type-checking, tests, coverage, package checks, and
   runtime smoke checks;
4. verify that the tag version matches `package.json`;
5. verify that the matching changelog section exists;
6. pack the npm release tarball once with `pnpm pack --json`;
7. generate SLSA Build L3 provenance for the tarball digest and upload it to a
   draft GitHub Release;
8. verify the downloaded tarball checksum before npm publication;
9. download the SLSA provenance from the draft GitHub Release;
10. publish that exact tarball to npm from outside the repository with
    `npm publish --provenance-file`, when the package exists;
11. upload the same tarball and its SHA-256 checksum to the draft GitHub Release;
12. publish the GitHub Release after npm publish succeeds or is skipped.

The GitHub Release job extracts the matching `CHANGELOG.md` version section into
`release-notes.md` and passes that file to `gh release edit --verify-tag` when
publishing the draft release created by the SLSA provenance job.

Use `npm publish "./vers-js-X.Y.Z.tgz" --access public --provenance-file
"./vers-js-X.Y.Z.tgz.intoto.jsonl"` from `${{ runner.temp }}` in the Trusted
Publishing job, where the tarball and SLSA provenance are copied outside the
repository before publication.

> [!IMPORTANT]
> This publish step intentionally uses npm rather
> than pnpm because pnpm does not currently support npm's `--provenance-file`
> option. npm Trusted Publishing with OIDC automatically creates npm provenance,
> but that automatic provenance path is not the SLSA Build L3 provenance path for
> this release artifact. The SLSA GitHub Generator provenance must be passed to
> npm during the publish transaction to attach that Build L3 provenance to the npm
> registry artifact. Running npm from outside the repository avoids the development-only
> `devEngines.packageManager` guard while still publishing the exact pnpm-packed
> tarball with the SLSA provenance generated earlier in the workflow.

The SLSA provenance job uses
`slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml`
referenced by a semantic version tag, not a commit SHA. This is the intentional
Windlass exception to SHA pinning because `slsa-verifier` requires the trusted
builder identity to use the SLSA generator tag.

If the package does not yet exist on npm, the workflow skips only the
`publish-npm` job and prints first-publish bootstrap guidance for the maintainer
to review. The GitHub Release still publishes after the build and SLSA provenance
jobs succeed. If the exact tag version is already published on npm, the workflow
fails before provenance or GitHub Release publication.

Token-based fallback should remain exceptional because it requires long-lived
credential handling, manual rotation, and an explicit maintainer procedure outside
the normal pnpm Trusted Publishing path.

## GitHub Release creation

Publish the GitHub Release after the SLSA provenance job succeeds and after the
npm publish job either succeeds or is intentionally skipped because the npm
package does not exist yet. The workflow does not publish a GitHub Release if
npm publish runs and fails, or if the exact version is already published.

The release body should come from the matching `CHANGELOG.md` version section.
Do not use generated commit logs as the release notes.

The final release step should use the already pushed signed tag and publish the
draft release created by the SLSA provenance job:

> [!NOTE]
> The workflow does not call `gh release create` in the GitHub Release job because
> the SLSA provenance job already creates or reuses the draft release when it runs
> with `upload-assets: true`, `draft-release: true`, and `upload-tag-name` set to
> the release tag. The later `gh release upload` step adds the tarball and checksum
> to that existing draft release, and `gh release edit --draft=false` publishes the
> same release.

```bash
gh release edit "v${VERSION}" \
  --verify-tag \
  --title "v${VERSION}" \
  --notes-file release-notes.md \
  --draft=false
```

Using `--verify-tag` prevents GitHub CLI from targeting a tag that does not exist
on the remote.

Expected public release assets are:

- `vers-js-X.Y.Z.tgz` — the exact npm tarball published by CI;
- `vers-js-X.Y.Z.tgz.sha256` — SHA-256 checksum for the tarball;
- `vers-js-X.Y.Z.tgz.intoto.jsonl` — SLSA Build L3 provenance generated by the
  SLSA GitHub Generator generic workflow.

After release publication, verify the npm provenance, GitHub release attestation,
and SLSA provenance:

```bash
pnpm audit signatures
gh release verify "v${VERSION}"
slsa-verifier verify-artifact "vers-js-${VERSION}.tgz" \
  --provenance-path "vers-js-${VERSION}.tgz.intoto.jsonl" \
  --source-uri github.com/windlasstech/vers-js \
  --source-tag "v${VERSION}"
```

## Failure recovery

Before npm publish succeeds, fix the failed release workflow and rerun it against
the same signed tag when possible. Do not move or recreate a published release
tag without an explicit maintainer decision.

After npm publish succeeds, the npm version is immutable for normal release
purposes. If GitHub Release creation fails after npm publish:

1. keep the npm package version as published;
2. rerun only the GitHub Release creation step, or create the release manually
   from the existing signed tag;
3. use the matching `CHANGELOG.md` section as the release body.

If npm publish succeeds with a serious release-blocking defect, follow npm and
Windlass security policies for deprecation, advisory publication, or a follow-up
patch release. Do not assume the published version can be reused.

## References

- npm unscoped public package publishing:
  <https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages>
- npm Trusted Publishing:
  <https://docs.npmjs.com/trusted-publishers>
- npm provenance statements:
  <https://docs.npmjs.com/generating-provenance-statements>
- GitHub signed tags:
  <https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-tags>
- GitHub Releases:
  <https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository>
- SLSA GitHub Generator:
  <https://github.com/slsa-framework/slsa-github-generator>
- Windlass artifact attestations guide:
  <https://github.com/windlasstech/.github/blob/main/docs/security/artifact-attestations.md>
- Keep a Changelog:
  <https://keepachangelog.com/en/1.1.0/>
- Windlass security policy:
  <https://github.com/windlasstech/.github/blob/main/SECURITY.md>
- Windlass workflow hardening guide:
  <https://github.com/windlasstech/.github/blob/main/docs/security/workflow-hardening.md>
