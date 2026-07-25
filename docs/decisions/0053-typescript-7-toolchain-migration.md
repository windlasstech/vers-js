---
parent: Decisions
nav_order: 53
status: accepted
date: 12026-07-25
decision-makers: Yunseo Kim
---

# TypeScript 7 Toolchain Migration

## Context and Problem Statement

ADR-0040 established an Oxc-aligned TypeScript baseline that is compatible with TypeScript 7.
TypeScript 7.0 reached general availability on 12026-07-08 and is now shipped as the normal
`typescript` npm package with the `tsc` CLI. Its native Go implementation provides an estimated 8 to
12 times full-build speedup.

At this decision date, the latest release is TypeScript 7.0.2, published on 12026-07-08. The
Windlass dependency-security policy is the source of truth for update cooldowns: for NPM/Bun
development dependencies, major version updates carry a 14 to 21 day cooldown guideline. TypeScript
7.0.2 was published 17 days before this decision, which satisfies that policy window. Should the
project now execute the TypeScript 7 migration?

## Decision Drivers

- Preserve `tsc` as the authoritative type-checking and declaration-emission tool selected by
  ADR-0036.
- Adopt the stable TypeScript 7 package and its faster native compiler without changing the
  runtime-agnostic published package.
- Keep the existing TypeScript 7-compatible, Oxc-aligned configuration from ADR-0040.
- Avoid a side-by-side TypeScript 6 installation when the repository has no programmatic compiler
  API consumers.
- Retain the project's caret-based development dependency policy while keeping lockfile resolution
  reproducible and supply-chain policy enforced.

## Considered Options

- Adopt TypeScript 7 with the existing TypeScript 7-compatible configuration
- Remain on TypeScript 6
- Run TypeScript 6 and TypeScript 7 side by side using `@typescript/typescript6`
- Defer until TypeScript 7.1 provides a programmatic compiler API
- Use the legacy `@typescript/native-preview` (`tsgo`) package instead of stable `typescript`

## Decision Outcome

Chosen option: "Adopt TypeScript 7 with the existing TypeScript 7-compatible configuration", because
TypeScript 7 is generally available, the repository's configuration and toolchain are already
compatible, and the audit found no programmatic `typescript` package consumer that requires
TypeScript 6.

The project will change the `typescript` development dependency to `^7.0.0` and resolve TypeScript
7.0.2 in the lockfile. The caret range matches the project's other development dependencies. The
lockfile pins the exact resolution, while `minimumReleaseAgeStrict` and the no-downgrade trust
policy govern later patch updates.

The repository audit found zero uses of the programmatic TypeScript compiler API. All compiler
touchpoints use the `tsc` CLI: `tsc --noEmit`, `tsc -p tsconfig.build.json`,
`tsc -p tests/types/tsconfig.package.json`, and `pnpm exec tsc` in
`tests/runtime-smoke/blocked-subpath-typecheck.mjs`. TypeScript is a development dependency only.

Microsoft recommends keeping TypeScript 6 beside TypeScript 7 only for tools that import the
`typescript` package programmatically. TypeScript 7 ships no stable programmatic compiler API. An
IPC-based API is planned for TypeScript 7.1. Neither condition applies to this repository.

### Consequences

- Good, because `tsc` gains the stable native TypeScript 7 implementation and its estimated 8 to 12
  times full-build speedup.
- Good, because the existing `tsc` scripts, emitted package shape, and runtime-agnostic source
  policy remain unchanged.
- Good, because Oxlint's type-aware mode uses `tsgolint`, which is based on `typescript-go` and does
  not consume the `typescript` package. Oxfmt has no TypeScript dependency, and Vitest has no
  configured type-check mode and transforms through Vite and Oxc.
- Good, because the repository has no `typescript-eslint`, Typedoc, `ts-node`, or `tsup` dependency
  that could require a legacy TypeScript compiler API.
- Neutral, because lockfile regeneration unavoidably re-resolved transitive `picomatch` from 4.0.4
  to 4.0.5, a patch that passed the repository's `minimumReleaseAge` and no-downgrade trust policy.
  The maintainer explicitly accepted this churn on 12026-07-25 as part of the migration.
- Neutral, because the existing configuration uses `ES2023`, `ESNext`, `Bundler`,
  `isolatedDeclarations`, `rewriteRelativeImportExtensions`, `paths` without `baseUrl`, and
  `types: []`, none of which are removed by TypeScript 7. The project also has no project references
  or incremental builds.
- Bad, because VS Code requires the official TypeScript 7 VS Code extension
  (`TypeScriptTeam.native-preview`) for TypeScript 7 IntelliSense. The workspace `tsc` invoked
  through pnpm scripts remains authoritative, as documented in `AGENTS.md`.
- Bad, because the known optional peer-version mismatch between `oxlint@1.75.0` and
  `oxlint-tsgolint@0.23.0` remains. Neither package constrains `typescript`, current type-aware
  linting passes, and any `oxlint-tsgolint` upgrade needs separate maintainer authorization.

### Confirmation

Acceptance is confirmed by byte-for-byte `.d.ts` parity between TypeScript 6 and TypeScript 7
builds, followed by the repository's full verification sequence:

- `pnpm run fmt:check`
- `pnpm run lint:ts`
- `pnpm run lint:md`
- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run test:coverage`
- `pnpm run build`
- `pnpm run verify:package`
- runtime smoke tests under Node.js, Deno, and Bun when available

## Pros and Cons of the Options

### Adopt TypeScript 7 with the existing TypeScript 7-compatible configuration

This option installs the stable TypeScript 7 package while retaining the existing compiler
configuration and CLI-based workflow.

- Good, because it fulfills the TypeScript 7-compatible baseline established by ADR-0040 now that
  TypeScript 7 is generally available.
- Good, because it uses the supported `typescript` package and `tsc` CLI rather than a preview
  package.
- Good, because the audit found no programmatic compiler API use that requires a concurrent
  TypeScript 6 installation.
- Bad, because contributors who want TypeScript 7 IntelliSense in VS Code need the official
  TypeScript 7 VS Code extension (`TypeScriptTeam.native-preview`).

### Remain on TypeScript 6

This option keeps the current compiler version and defers the native TypeScript 7 compiler.

- Good, because it preserves the current editor experience without an extension.
- Bad, because it delays the approved stable migration and its compiler speed improvement without a
  repository-specific compatibility reason.
- Bad, because it leaves ADR-0040's TypeScript 7-compatible baseline unrealized.

### Run TypeScript 6 and TypeScript 7 side by side using `@typescript/typescript6`

This option installs the official compatibility package so that `tsc6` and the TypeScript 6 compiler
API remain available alongside the TypeScript 7 compiler.

- Good, because it follows Microsoft's recommended pattern for tools that import the `typescript`
  package programmatically, such as typescript-eslint.
- Good, because it would keep a TypeScript 6 fallback available if a latent incompatibility appeared
  after the migration.
- Bad, because the repository audit found zero programmatic compiler API usage, so the compatibility
  package would add a dependency with no consumer.
- Bad, because maintaining two compiler installations increases lockfile surface, update churn, and
  contributor confusion without changing the published package.

### Defer until TypeScript 7.1 provides a programmatic compiler API

This option waits for the planned IPC-based programmatic compiler API.

- Good, because it would help repositories that import the `typescript` package programmatically.
- Bad, because this repository has no programmatic API usage and does not need that compatibility
  surface.
- Bad, because it postpones the stable CLI migration for an irrelevant feature.

### Use the legacy `@typescript/native-preview` (`tsgo`) package instead of stable `typescript`

This option uses the pre-release native compiler package rather than the stable TypeScript package.

- Good, because it was an early route to native compiler performance.
- Bad, because TypeScript 7 now ships through the standard `typescript` package with the `tsc` CLI.
- Bad, because it adds an unnecessary legacy package choice after general availability.

## More Information

This ADR executes the TypeScript 7-compatible baseline from ADR-0040. It does not change the
compiler-first build decision in ADR-0036, the Oxlint decision in ADR-0038, or the Oxfmt decision in
ADR-0039.

External references:

- TypeScript 7.0 announcement:
  <https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/>
- TypeScript Go repository, including its README and CHANGES:
  <https://github.com/microsoft/typescript-go>
- Windlass dependency-security policy (cooldown guidelines as the source of truth for update
  timing): <https://github.com/windlasstech/.github/blob/main/docs/security/dependency-security.md>
