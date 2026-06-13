---
parent: Decisions
nav_order: 51
status: accepted
date: 12026-06-13
decision-makers: Yunseo Kim
---

# Use Signed Tags and npm Trusted Publishing for Releases

## Context and Problem Statement

ADR-0002 selects Node.js LTS as the development and release automation baseline.
ADR-0003 selects pnpm for development workflows while preserving npm-compatible
publication. ADR-0036 through ADR-0040 define the package build, lint, format,
and test toolchain. ADR-0049 updates pnpm pinning to `devEngines.packageManager`.

The project now needs a concrete release publication trust boundary. Release
automation must publish the runtime-agnostic npm package, preserve a signed source
revision, create GitHub Releases from the curated changelog, and align with
Windlass supply-chain requirements.

Should releases be published manually from a maintainer workstation, fully
automated from CI with stored credentials, or triggered by signed Git tags and
published from hosted CI with npm Trusted Publishing?

## Decision Drivers

- npm publication should avoid long-lived publish tokens when a supported
  short-lived credential path exists.
- Released npm packages should include provenance whenever npm and GitHub support
  it for the package and repository type.
- GitHub release tags should be signed annotated tags created by an authorized
  maintainer.
- GitHub Releases should use curated `CHANGELOG.md` entries, not generated commit
  logs.
- Release builds that claim provenance must run on hosted CI, not a developer
  workstation.
- Release workflows must follow Windlass workflow hardening requirements,
  including minimal permissions, hardened runners, and SHA-pinned third-party
  actions.
- The operational release checklist should remain easy to update without editing
  an accepted ADR body.

## Considered Options

- Signed local tags trigger hosted CI npm Trusted Publishing
- Fully manual local npm publishing
- CI creates tags and publishes with stored npm tokens
- CI creates tags and publishes with npm Trusted Publishing

## Decision Outcome

Chosen option: "Signed local tags trigger hosted CI npm Trusted Publishing",
because it separates maintainer source-signing authority from tokenless package
publication while preserving npm provenance and GitHub release automation.

The release workflow is:

1. prepare and merge a release PR with `package.json`, `CHANGELOG.md`, and
   release-relevant documentation updates;
2. create a signed annotated tag from the final merged `main` commit;
3. push the signed tag to GitHub;
4. let a tag-triggered GitHub Actions workflow verify, build, and publish the npm
   package with npm Trusted Publishing;
5. create the GitHub Release only after npm publish succeeds, using the matching
   `CHANGELOG.md` version section as the release body.

The operational runbook lives in `docs/release.md`. This ADR records the release
architecture decision; the runbook records exact commands, checklist details, and
failure recovery steps.

### Consequences

- Good, because npm publishing uses OIDC-based Trusted Publishing instead of a
  long-lived `NPM_TOKEN` secret.
- Good, because npm provenance is automatically generated for public packages
  published from public GitHub repositories through Trusted Publishing.
- Good, because signed annotated Git tags provide a maintainer-authenticated
  source revision for releases.
- Good, because GitHub Release creation can be gated on successful npm publish.
- Good, because release notes stay aligned with the human-curated changelog.
- Neutral, because maintainers still perform the explicit tag-signing step
  locally.
- Bad, because first-time npm Trusted Publisher setup and GitHub environment
  protection add release infrastructure work.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- the release runbook documents signed annotated tag creation and verification;
- the npm publish workflow is triggered by release tags rather than arbitrary
  branch pushes;
- npm publication uses Trusted Publishing and requires `id-token: write` only in
  the publish job;
- release jobs run on GitHub-hosted runners when provenance is claimed;
- release workflows avoid long-lived npm publish tokens in the normal path;
- GitHub Release creation uses an existing tag and does not create an unsigned tag
  as a side effect;
- GitHub Release notes come from the matching `CHANGELOG.md` version section;
- new release workflows follow Windlass workflow hardening guidance.

## Pros and Cons of the Options

### Signed local tags trigger hosted CI npm Trusted Publishing

This option uses a maintainer-created signed annotated tag as the release trigger.
Hosted CI then verifies, builds, publishes to npm through Trusted Publishing, and
creates the GitHub Release.

- Good, because the signing key stays with the maintainer and is not stored in CI.
- Good, because npm publish credentials are short-lived OIDC credentials.
- Good, because provenance is tied to a hosted CI build rather than a local
  workstation build.
- Good, because tag protection and GitHub environment protection can enforce
  release controls.
- Bad, because the release is not fully push-button automated from a release PR.

### Fully manual local npm publishing

This option has a maintainer build locally, publish to npm locally, and create the
GitHub Release manually.

- Good, because it is simple to understand and requires little CI setup.
- Bad, because npm provenance for the release build is unavailable or weaker.
- Bad, because it requires local npm credentials and interactive release state.
- Bad, because local environments are harder to make reproducible and auditable.

### CI creates tags and publishes with stored npm tokens

This option lets CI create the release tag and publish with an npm access token
stored as a repository or environment secret.

- Good, because it can automate most release steps from a merged release PR.
- Bad, because CI needs authority to create release tags.
- Bad, because it depends on a long-lived npm publish token that must be rotated
  and protected.
- Bad, because a compromised workflow or secret can publish until the token is
  revoked.

### CI creates tags and publishes with npm Trusted Publishing

This option lets CI create the release tag and then publish through npm Trusted
Publishing.

- Good, because npm publication remains tokenless and provenance-backed.
- Bad, because CI still needs tag creation authority.
- Bad, because creating signed tags in CI requires storing signing material or
  adopting a separate keyless signing mechanism for Git tags.
- Bad, because it couples release decision authority and package publication more
  tightly than this project currently needs.

## More Information

The maintainer runbook is `docs/release.md`.

Related references:

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
- Windlass workflow hardening guide:
  <https://github.com/windlasstech/.github/blob/main/docs/security/workflow-hardening.md>
