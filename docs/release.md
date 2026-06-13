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
   Publishing and create the GitHub Release.

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

For v0.1.0 only:

1. complete the release PR and local release preparation steps below;
2. publish from a maintainer-controlled local environment with npm account 2FA;
3. configure npm Trusted Publishing for `publish.yml` after the package exists;
4. push the signed tag so GitHub Actions can create the GitHub Release;
5. use Trusted Publishing for subsequent npm releases.

The local first-publish command is:

```bash
npm publish --access public
```

If a token-based CI bootstrap is explicitly chosen instead, use a temporary
granular npm token, publish with provenance, and revoke the token immediately:

```bash
npm publish --provenance --access public
```

Do not keep token-based publishing as the normal release path after Trusted
Publishing is configured.

Release workflows must follow Windlass supply-chain requirements:

- run on GitHub-hosted runners when npm provenance or release attestations are
  claimed;
- use explicit minimal permissions, with `id-token: write` only on the npm
  publish job;
- use SHA-pinned third-party actions, except where Windlass policy documents a
  specific exception;
- start jobs with `step-security/harden-runner` in audit mode;
- avoid dependency caching in release builds.

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

The local preparation script performs these checks, runs the repository
verification sequence, reviews package contents with `npm pack --json --dry-run`,
and extracts the matching changelog section to `.release/release-notes-vX.Y.Z.md`:

```bash
pnpm run release:prepare
```

Review the package contents before tagging:

```bash
npm pack --dry-run
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
6. publish to npm using Trusted Publishing when the package exists and the tag
   version is not already published;
7. create the GitHub Release after npm publish succeeds, after a first-publish
   bootstrap skip, or after detecting that the tag version was already published
   manually.

The GitHub Release job extracts the matching `CHANGELOG.md` version section into
`release-notes.md` and passes that file to `gh release create --verify-tag`.

Use `npm publish --access public` in the Trusted Publishing job. npm
automatically generates provenance for public packages published from public
GitHub repositories through Trusted Publishing, so a separate `--provenance` flag
is not required for the trusted path.

If the package does not yet exist on npm, the workflow prints first-publish
bootstrap instructions, skips npm publish, and still creates the GitHub Release.
If the exact tag version is already published on npm, the workflow also skips npm
publish and continues to GitHub Release creation. These skips exist so the v0.1.0
local first-publish bootstrap can still produce the signed-tag GitHub Release.

If a token-based emergency fallback is ever used, publish with provenance
explicitly:

```bash
npm publish --provenance --access public
```

Token-based fallback should remain exceptional because it requires long-lived
credential handling and manual rotation.

## GitHub Release creation

Create the GitHub Release after the publish workflow completes successfully. For
normal releases this means npm publish succeeded; for the v0.1.0 bootstrap this
may mean the workflow intentionally skipped npm publish because the package is
not registered yet or the tag version was already published manually.

The release body should come from the matching `CHANGELOG.md` version section.
Do not use generated commit logs as the release notes.

The release creation step should use the already pushed signed tag:

```bash
gh release create "v${VERSION}" \
  --verify-tag \
  --title "v${VERSION}" \
  --notes-file release-notes.md
```

Using `--verify-tag` prevents GitHub CLI from creating an unsigned tag as a side
effect of release creation.

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
- Keep a Changelog:
  <https://keepachangelog.com/en/1.1.0/>
- Windlass security policy:
  <https://github.com/windlasstech/.github/blob/main/SECURITY.md>
- Windlass workflow hardening guide:
  <https://github.com/windlasstech/.github/blob/main/docs/security/workflow-hardening.md>
