---
parent: Decisions
nav_order: 3
status: accepted, updated by ADR-0049
date: 12026-06-07
decision-makers: Yunseo Kim
---

# Use pnpm as the Development Package Manager

## Context and Problem Statement

This project uses Node.js LTS as its primary development runtime, while the
published TypeScript library must remain portable across Node.js, Deno, and Bun.
The runtime decision intentionally left package-manager selection open so that
the project could choose the lowest-risk dependency workflow separately.

The project now needs a concrete package-manager baseline for installing
dependencies, committing a reproducible lockfile, running package scripts, and
supporting dependency-security policy. The package manager should preserve an
npm-compatible package boundary and should not make the published library depend
on package-manager-specific runtime behavior.

Which package manager should this project use for development and CI?

## Decision Drivers

- The project needs a committed lockfile for reproducible builds and dependency
  review.
- The package manager should support install-time dependency cooldowns, because
  organization dependency-security policy recommends delaying new package
  versions to reduce supply-chain risk.
- The development workflow should stay compatible with npm package metadata,
  `package.json`, `exports`, package scripts, and npm registry publishing.
- Dependency installation should expose undeclared or accidental dependency use
  early, before it becomes part of the library or test workflow.
- Contributor setup should remain practical under the Node.js LTS baseline.
- The choice should support future workspace growth without requiring an early
  monorepo redesign.
- Deno and Bun should remain compatibility verification targets, not the default
  dependency-installation baseline.

## Considered Options

- pnpm as the development package manager
- npm as the development package manager
- Yarn Berry as the development package manager
- Bun as the development package manager
- No fixed package manager

## Decision Outcome

Chosen option: "pnpm as the development package manager", because it provides the
best balance of npm-compatible package workflows, stricter dependency access,
fast and reproducible installs, workspace readiness, and package-manager-level
dependency cooldown controls.

The project will use pnpm for local dependency installation, package scripts,
primary development workflows, and CI installs. The selected pnpm version should
be pinned through `packageManager` in `package.json`, with Corepack used where
available to make contributor and CI setup reproducible.

The project will commit `pnpm-lock.yaml` once dependencies are introduced. CI
should install dependencies with a frozen lockfile so lockfile drift fails before
tests, builds, or package checks run.

The project should configure pnpm's `minimumReleaseAge` setting to enforce a
dependency cooldown whenever dependency resolution adds or updates package
versions. The initial default should be at least 1440 minutes, matching a one-day
cooldown suitable for development dependencies. The cooldown may be raised later
if the dependency risk profile or release process requires a longer review
window.

Package-manager policy must not change the public package boundary. The
published package remains an npm-compatible TypeScript/JavaScript package, and
compatibility with Deno and Bun should be verified through explicit checks rather
than by using those runtimes as the primary package manager.

### Consequences

- Good, because pnpm keeps `package.json`, package scripts, npm registry
  publishing, and package boundary checks compatible with ordinary JavaScript
  package workflows.
- Good, because pnpm's dependency layout makes undeclared dependency use easier
  to catch than npm's default hoisted installation model.
- Good, because `pnpm-lock.yaml` and frozen installs provide reproducible local
  and CI dependency resolution.
- Good, because `minimumReleaseAge` gives the project an install-time dependency
  cooldown that complements Dependabot or Renovate cooldowns.
- Good, because `minimumReleaseAgeExclude` allows reviewed exceptions for urgent
  or trusted package updates without disabling the general age gate.
- Good, because pnpm has first-class workspace support if the project later adds
  fixture packages, adapters, or additional packages.
- Neutral, because contributors need Corepack or pnpm available rather than only
  the npm CLI bundled with Node.js.
- Neutral, because npm remains the registry and package metadata compatibility
  boundary even though pnpm is used for development installs.
- Bad, because pnpm's symlinked dependency structure can expose tools that rely
  on accidental hoisting or non-standard dependency resolution.
- Bad, because package-manager-specific settings add repository policy that must
  be documented and maintained.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- `package.json` pins pnpm through the `packageManager` field;
- dependency installation and development scripts are documented as pnpm-based;
- `pnpm-lock.yaml` is committed whenever dependencies exist;
- CI enables Corepack or otherwise installs the pinned pnpm version before
  running package-manager commands;
- CI uses a frozen lockfile install;
- pnpm dependency cooldown settings are committed, used when dependencies are
  added or updated, and aligned with organization dependency-security policy;
- package scripts and published artifacts remain npm-compatible and do not rely
  on pnpm-specific runtime behavior;
- Deno and Bun compatibility checks remain separate from the package-manager
  baseline.

## Pros and Cons of the Options

### pnpm as the development package manager

This option uses pnpm for local installs, package scripts, CI installs, and
dependency policy enforcement.

- Good, because pnpm provides strict dependency access, reducing accidental use
  of transitive dependencies.
- Good, because pnpm uses an efficient content-addressable store and supports
  fast installs without changing the package's npm-compatible public boundary.
- Good, because `pnpm-lock.yaml` is a supported lockfile format under the
  organization dependency-security policy.
- Good, because `minimumReleaseAge` applies an install-time age gate to newly
  published dependency versions during dependency resolution, including
  transitive dependencies.
- Good, because `minimumReleaseAgeExclude` supports explicit reviewed exceptions.
- Good, because pnpm workspaces are mature if the project later grows beyond one
  package.
- Neutral, because Corepack or a pnpm installation is required for contributors
  who only have Node.js and npm installed.
- Bad, because tools that assume npm-style hoisting may need configuration or
  replacement.

### npm as the development package manager

This option uses the npm CLI bundled with Node.js for dependency installation,
scripts, CI, and publishing workflows.

- Good, because npm has the lowest contributor setup cost under Node.js LTS.
- Good, because npm's `package-lock.json` and `npm ci` provide a conventional
  reproducible CI install path.
- Good, because npm supports `min-release-age`, so install-time dependency
  cooldowns are available without adopting an additional package manager.
- Neutral, because npm is the default compatibility baseline for package metadata
  and registry publishing even when another package manager is used.
- Bad, because npm's default hoisted dependency tree can hide undeclared
  dependency usage.
- Bad, because npm's cooldown controls are less expressive than pnpm's package
  age gate and exception settings.
- Bad, because npm is less compelling than pnpm for future workspace performance
  and dependency strictness.

### Yarn Berry as the development package manager

This option uses modern Yarn for dependency installation, scripts, CI, and
dependency policy enforcement.

- Good, because Yarn supports immutable installs, workspaces, and package age
  gates through `npmMinimalAgeGate`.
- Good, because `npmPreapprovedPackages` can exempt reviewed packages from
  package gates.
- Good, because Yarn can use Plug'n'Play to remove `node_modules` and enforce
  strict dependency access.
- Neutral, because Yarn can also use a `node_modules` linker when Plug'n'Play is
  not appropriate.
- Bad, because Plug'n'Play adds compatibility and tooling considerations that are
  not needed for this initial TypeScript library.
- Bad, because using Yarn with a traditional `node_modules` linker weakens the
  reason to choose Yarn over pnpm.
- Bad, because the Yarn policy surface is larger than this project currently
  needs.

### Bun as the development package manager

This option uses Bun's package manager for dependency installation and related
development workflows while Node.js LTS remains the development runtime.

- Good, because Bun provides very fast installs and a committed `bun.lock` file.
- Good, because Bun supports install-time dependency cooldowns through
  `minimumReleaseAge` and `minimumReleaseAgeExcludes`.
- Good, because Bun can publish npm-compatible packages.
- Bad, because using Bun as the package manager makes the default development
  workflow depend on a second runtime/toolchain after selecting Node.js LTS as the
  development runtime.
- Bad, because Bun-specific package-manager behavior could become a project
  convention even though Bun should remain a compatibility target.
- Bad, because Bun install success does not prove Node.js package compatibility,
  so Node-oriented package checks would still be required.

### No fixed package manager

This option allows contributors and CI jobs to use npm, pnpm, Yarn, Bun, or other
npm-compatible package managers interchangeably.

- Good, because it imposes no new package-manager convention before dependencies
  are introduced.
- Neutral, because this can work briefly while the repository has no package
  manifest, dependencies, or package scripts.
- Bad, because it prevents a single committed lockfile from being the dependency
  source of truth.
- Bad, because cooldown, install, and audit behavior would vary by contributor and
  CI job.
- Bad, because package-manager drift would make dependency review and support
  harder once the project adds build and test dependencies.

## More Information

This decision refines the package-manager consequence left open by the Node.js
LTS development runtime decision.

External references:

- pnpm settings, including `minimumReleaseAge`:
  <https://pnpm.io/settings#minimumreleaseage>
- pnpm workspaces:
  <https://pnpm.io/workspaces>
- pnpm install command and frozen lockfile behavior:
  <https://pnpm.io/cli/install>
- npm `min-release-age` configuration:
  <https://docs.npmjs.com/cli/v11/using-npm/config#min-release-age>
- npm `package-lock.json` reference:
  <https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/>
- Yarn `npmMinimalAgeGate` configuration:
  <https://yarnpkg.com/configuration/yarnrc#npmMinimalAgeGate>
- Yarn Plug'n'Play:
  <https://yarnpkg.com/features/pnp>
- Bun minimum release age configuration:
  <https://bun.com/docs/pm/cli/install#minimum-release-age>
- Bun lockfile documentation:
  <https://bun.com/docs/pm/lockfile>
- Node.js Corepack documentation:
  <https://nodejs.org/docs/latest/api/corepack.html>
- Windlass dependency-security policy:
  <https://github.com/windlasstech/.github/blob/main/docs/security/dependency-security.md>

This decision should be revisited if one of the following becomes true:

- pnpm's dependency layout blocks required build, test, or packaging tools in a
  way that cannot be solved without weakening dependency correctness;
- npm, Yarn, Bun, or another package manager provides materially better cooldown,
  lockfile, provenance, or dependency-review support for this project's needs;
- the project adopts a package format or registry workflow where pnpm is no longer
  a low-risk development package manager;
- Deno, Bun, or JSR becomes the dominant development and package-publication
  workflow for this library;
- organization dependency-security policy changes its lockfile or cooldown
  requirements.
