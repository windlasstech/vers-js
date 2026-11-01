---
parent: Decisions
nav_order: 56
status: accepted
date: 12026-11-01
decision-makers: Yunseo Kim
---

# Pin Development pnpm to the slsa-builder Support Window

## Context and Problem Statement

ADR-0003 selects pnpm as the development package manager and requires a pinned version for
reproducible contributor and CI workflows; ADR-0049 moves that pin to `devEngines.packageManager`.
Neither ADR constrains which pnpm major line the pin may come from. The current pin, `pnpm@12.10.1`,
was adopted through a routine development-dependency bump without a dedicated decision record.

ADR-0054 adopts Windlass slsa-builder as the release provenance producer. slsa-builder's JS/TS npm
profile currently provisions build-stage pnpm and Yarn through Corepack and enforces a bounded
package-manager version set before install: a consumer manifest must pin pnpm to an exact,
full-three-part SemVer version in the 10.x or 11.x line, declared in the top-level `packageManager`
field or in `devEngines.packageManager`. A manifest pinning pnpm 12 or newer is rejected before
install with `windlass.verify.error.pnpm-version-unsupported`. The bound exists because, under
Corepack, a pnpm 12 consumer's executed native binary arrives through a first-use shim download
outside the builder's distribution capture, so the `package-manager-distribution` provenance record
would not cover the executed bits. slsa-builder's documented roadmap starts pnpm 12 consumer support
with the future release that transitions build-stage pnpm and Yarn provisioning to digest-verified
npm registry tarballs; Corepack remains the production path until then.

Which pnpm major line should this repository pin for development while slsa-builder is the release
provenance producer?

## Decision Drivers

- The release pipeline must pass slsa-builder's consumer manifest gate; a development pin outside
  the supported window would make every release build fail before install.
- Release provenance must cover the package-manager bits actually executed during the build; the pin
  should stay within the set the provenance record can stand behind.
- Development, CI, and release should resolve the same pinned pnpm version so local verification
  matches what the release pipeline executes.
- The pin mechanism from ADR-0049 (`devEngines.packageManager`) stays unchanged; only the version
  line is constrained.
- slsa-builder accepts an optional integrity digest on pnpm descriptors (`+<algorithm>.<hex>`),
  which this repository already declares, so constraining the major line does not weaken the
  existing integrity posture.
- Accepted ADR bodies are immutable; constraining the version line requires a new decision record
  rather than editing ADR-0003 or ADR-0049.

## Considered Options

- Pin pnpm to the 11.x line until slsa-builder supports pnpm 12
- Keep pnpm 12 and wait for slsa-builder pnpm 12 support
- Pin pnpm to the 10.x line
- Switch the development package manager to npm or Yarn

## Decision Outcome

Chosen option: "Pin pnpm to the 11.x line until slsa-builder supports pnpm 12", because it keeps the
development pin inside the slsa-builder consumer support window at the newest supported major,
preserving the ADR-0049 metadata conventions that were written against pnpm v11 and requiring no
changes to the pinning mechanism, lockfile policy, or cooldown settings.

The repository will pin `devEngines.packageManager` to an exact, full-three-part SemVer version in
the pnpm 11.x line, retaining the optional `+sha512.<hex>` integrity digest suffix. Routine patch
and minor bumps within the 11.x line remain ordinary dependency updates and do not require an ADR.
Moving to pnpm 12 or newer requires a new ADR, and should only be considered after a slsa-builder
release that supports pnpm 12 consumers is available and adopted by the release pipeline.

### Consequences

- Good, because the development pin satisfies slsa-builder's consumer gate, so release builds are
  not rejected before install.
- Good, because the executed pnpm distribution stays within the set covered by the
  `package-manager-distribution` provenance record.
- Good, because development, CI, and the release build resolve the same pnpm version.
- Good, because the constraint is recorded explicitly instead of being inferred from a routine
  dependency bump, closing the gap that let pnpm 12 enter without a decision record.
- Neutral, because contributors see no workflow change beyond the pinned version itself.
- Bad, because development cannot adopt pnpm 12 features until slsa-builder ships digest-verified
  tarball provisioning and this decision is revisited.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation reviews show that:

- `package.json` pins `devEngines.packageManager` to an exact pnpm 11.x version with the integrity
  digest suffix retained;
- `pnpm-lock.yaml` remains committed and installs frozen in CI under the pinned pnpm;
- pnpm dependency cooldown settings remain committed in `pnpm-workspace.yaml`;
- the slsa-builder-backed release workflow completes its build stage without a
  `windlass.verify.error.pnpm-version-unsupported` rejection;
- contributor-facing documentation (including `AGENTS.md`) names the pnpm 11.x line rather than
  pnpm 12.

## Pros and Cons of the Options

### Pin pnpm to the 11.x line until slsa-builder supports pnpm 12

This option constrains the development pin to the newest major line inside the slsa-builder consumer
support window.

- Good, because pnpm 11 is the newest line slsa-builder accepts, minimizing feature and
  security-update lag relative to pnpm 10.
- Good, because ADR-0049's metadata conventions were written against pnpm v11, so the pin mechanism
  and documentation examples align without reinterpretation.
- Good, because the optional descriptor integrity digest remains supported by slsa-builder for pnpm
  11.x.
- Bad, because pnpm 12 improvements stay unavailable for development until the builder's support
  window widens.

### Keep pnpm 12 and wait for slsa-builder pnpm 12 support

This option leaves the current `pnpm@12.10.1` pin in place until slsa-builder supports pnpm 12
consumers.

- Good, because development keeps the newest pnpm line.
- Bad, because the manifest fails slsa-builder's pre-install version gate, so no release can be
  produced through the ADR-0054 pipeline while the pin stands.
- Bad, because there is no committed date for the slsa-builder release that transitions provisioning
  to digest-verified tarballs, leaving the release path blocked indefinitely.

### Pin pnpm to the 10.x line

This option constrains the pin to the older supported major line.

- Good, because pnpm 10.x is inside the slsa-builder support window.
- Bad, because it gives up a supported major version of improvements for no additional release-path
  benefit over 11.x.
- Bad, because ADR-0049's conventions reference pnpm v11 metadata behavior, making 10.x a poorer
  documentary fit.

### Switch the development package manager to npm or Yarn

This option replaces pnpm with a package manager whose versions slsa-builder treats differently.

- Good, because npm declarations are non-authoritative under slsa-builder and would not gate the
  release build.
- Bad, because it reopens ADR-0003's settled package-manager selection, including pnpm's stricter
  dependency layout, `minimumReleaseAge` cooldown controls, and committed lockfile workflow.
- Bad, because Yarn is subject to its own slsa-builder version window (Yarn Berry v4 or v5), so the
  switch trades one bound for another while discarding the existing pnpm investment.

## More Information

This decision constrains the version line selected under ADR-0003 and pinned per ADR-0049. It does
not change the choice of pnpm, the `devEngines.packageManager` pinning mechanism, the committed
lockfile policy, frozen CI installs, or dependency cooldown settings.

This decision should be revisited when one of the following becomes true:

- a slsa-builder release supporting pnpm 12 consumers (digest-verified npm registry tarball
  provisioning) is published and the vers-js release pipeline adopts it;
- slsa-builder's consumer support window changes in any other way that affects the acceptable pnpm
  version set;
- pnpm publishes a security fix available only on the 12.x line.

External references:

- slsa-builder README, "Package manager provisioning and support window":
  <https://github.com/windlasstech/slsa-builder/blob/main/README.md#package-manager-provisioning-and-support-window>
- slsa-builder ADR-0016 (Corepack for build-stage pnpm and Yarn), ADR-0088 (digest-verified registry
  tarball provisioning): <https://github.com/windlasstech/slsa-builder/tree/main/docs/decisions>
- Related vers-js decisions: [ADR-0003](0003-use-pnpm-as-development-package-manager.md),
  [ADR-0049](0049-use-devengines-package-manager-for-pnpm-pinning.md),
  [ADR-0054](0054-use-slsa-builder-as-release-provenance-producer.md)
