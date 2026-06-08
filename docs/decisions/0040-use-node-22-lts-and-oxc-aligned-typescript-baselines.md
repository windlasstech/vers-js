---
parent: Decisions
nav_order: 40
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use Node 22 LTS and Oxc-Aligned TypeScript Baselines

## Context and Problem Statement

ADR-0001 selects TypeScript for the reusable VERS library. ADR-0002 selects
Node.js LTS as the primary development runtime while keeping Deno and Bun as
compatibility targets. ADR-0003 selects pnpm for dependency installation and
supply-chain policy. ADR-0011 through ADR-0014 select an ESM-only, root-only,
universal package entry. ADR-0036 selects a `tsc`-first build, ADR-0037 selects
Vitest, ADR-0038 selects Oxlint with type-aware linting, and ADR-0039 selects
Oxfmt.

The project now needs concrete TypeScript and runtime compatibility baselines.
The baseline should keep the package modern and runtime-agnostic, support the
Oxc-based lint and format decisions, and avoid confusing development tooling
requirements with the published library's runtime compatibility promise.

Which TypeScript and runtime compatibility baselines should v1 target?

## Decision Drivers

- The published package should support Node.js, Deno, and Bun through one
  runtime-agnostic ESM entry.
- Node.js should remain the primary development runtime, but Deno and Bun should
  remain compatibility targets rather than development toolchains.
- The package should avoid CommonJS support, runtime-specific package branches,
  and runtime-specific globals in core source.
- TypeScript configuration should align with the Oxc toolchain and avoid legacy
  options that conflict with Oxlint type-aware linting.
- `tsc` should remain the authoritative type-checking and package-emission tool.
- Patch-level Node.js requirements for development tools should be handled as
  implementation and package-manager details unless the published library itself
  needs those patch-level features.

## Considered Options

- Node.js 22 LTS compatibility with Oxc-aligned TypeScript configuration
- Node.js 22.12 or newer as a hard package baseline
- Node.js 24 LTS or newer as the package baseline
- Current Node.js only
- Legacy Node.js 20 support

## Decision Outcome

Chosen option: "Node.js 22 LTS compatibility with Oxc-aligned TypeScript
configuration", because it provides a modern LTS compatibility floor while
keeping the published library independent of patch-level development-tooling
requirements.

The v1 package will use Node.js 22 LTS and newer as the Node.js compatibility
baseline. The project will not treat Node.js 22.12 as a package-level runtime
requirement. If Oxlint, Oxfmt, Vitest, pnpm, or another development tool requires
a specific patched Node.js 22 release such as 22.12 or later, that patch floor may
be pinned in tooling, CI, package-manager, or contributor setup configuration.
That tooling pin does not change the published library's Node.js compatibility
baseline unless a future ADR explicitly says so.

The TypeScript configuration will be Oxc-aligned and TypeScript 7-compatible. It
should avoid deprecated or legacy `tsconfig` options that are incompatible with
`typescript-go` or Oxlint type-aware linting. `tsc` remains the authoritative
compiler for type-checking and package emission.

The v1 TypeScript output should use modern ESM settings suitable for the package
shape selected by ADR-0011 through ADR-0014. Implementation should prefer package
compiler settings equivalent to:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "Bundler"
  }
}
```

Exact TypeScript version pins, Node.js patch pins, package-manager metadata,
tool-specific config syntax, and CI matrix names remain implementation details as
long as they preserve this compatibility baseline.

### Consequences

- Good, because Node.js 22 LTS is a modern, supported compatibility floor for a
  new ESM-only TypeScript package.
- Good, because Deno and Bun remain explicit smoke-test targets without becoming
  default development runtimes.
- Good, because patch-level Node.js requirements such as 22.12 can be applied to
  tooling without unnecessarily constraining package consumers.
- Good, because the TypeScript configuration stays compatible with the Oxc lint
  and format toolchain selected in ADR-0038 and ADR-0039.
- Neutral, because `tsc` and Oxlint type-aware linting may use related but distinct
  TypeScript implementation surfaces.
- Bad, because Node.js 20 users are not part of the v1 compatibility baseline.
- Bad, because TypeScript 7-compatible configuration may require avoiding legacy
  compiler options that some contributors know from older projects.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- package compatibility documentation names Node.js 22 LTS and newer as the
  Node.js baseline;
- package metadata does not require Node.js 22.12 or another patch release unless
  the published runtime artifact actually depends on that patch-level feature;
- development tooling, package-manager, or CI configuration may pin a newer Node.js
  22 patch release when a selected tool requires it;
- TypeScript configuration avoids legacy options rejected by TypeScript 7,
  `typescript-go`, or Oxlint type-aware linting;
- TypeScript package output remains ESM JavaScript plus `.d.ts` declarations;
- the built package root is smoke-tested under Node.js 22 LTS or newer, current
  stable Deno, and current stable Bun;
- core library source avoids runtime-specific globals such as `process`, `Buffer`,
  `Deno`, and `Bun`.

## Pros and Cons of the Options

### Node.js 22 LTS compatibility with Oxc-aligned TypeScript configuration

This option uses Node.js 22 LTS and newer as the Node.js compatibility baseline,
keeps Deno and Bun as smoke-test targets, and configures TypeScript to stay
compatible with the Oxc toolchain.

- Good, because it uses a supported LTS baseline without forcing a patch-level
  runtime requirement onto package consumers.
- Good, because it aligns with the existing Node.js LTS development-runtime
  decision while keeping Deno and Bun compatibility explicit.
- Good, because it supports the ESM-only package shape and avoids CommonJS
  compatibility commitments.
- Good, because TypeScript 7-compatible configuration reduces future friction with
  Oxlint type-aware linting and `typescript-go`.
- Bad, because it excludes Node.js 20 from the claimed compatibility baseline.
- Bad, because some tool versions may still require a newer Node.js 22 patch in
  local development or CI.

### Node.js 22.12 or newer as a hard package baseline

This option makes Node.js 22.12 the minimum supported Node.js runtime.

- Good, because it can align directly with development tools whose package metadata
  requires Node.js 22.12 or newer.
- Good, because Node.js 22.12 includes ESM/CJS interop improvements such as
  default-enabled `require(esm)` behavior.
- Bad, because v1 is ESM-only and does not require CommonJS `require()` support.
- Bad, because it confuses development-tooling patch requirements with the
  published library's runtime compatibility baseline.
- Bad, because patch-specific runtime floors should be avoided unless the runtime
  artifact actually uses the patch-specific behavior.

### Node.js 24 LTS or newer as the package baseline

This option requires Node.js 24 LTS or newer for v1 compatibility.

- Good, because it gives the project a newer runtime floor and more room for modern
  JavaScript output.
- Good, because it may simplify future tooling requirements as Node.js 24 matures.
- Bad, because it unnecessarily excludes Node.js 22 LTS users for a small
  runtime-agnostic parser package.
- Bad, because the selected package API and implementation do not need Node.js
  24-specific behavior.

### Current Node.js only

This option supports only the current non-LTS Node.js line for v1 development and
compatibility.

- Good, because it maximizes access to the newest runtime features.
- Bad, because it is unstable as a library compatibility promise.
- Bad, because it conflicts with ADR-0002's Node.js LTS development baseline.
- Bad, because it would make package consumers track a moving current release
  instead of a stable LTS floor.

### Legacy Node.js 20 support

This option keeps Node.js 20 in the v1 compatibility baseline.

- Good, because it would include more older Node.js installations.
- Bad, because Node.js 20 is no longer a suitable baseline for a new v1 package in
  this decision cycle.
- Bad, because current tooling decisions increasingly align with Node.js 22 and
  newer.
- Bad, because supporting older Node.js releases increases compatibility burden
  without matching the project's greenfield scope.

## More Information

This decision refines the version details left open by ADR-0002 and ADR-0036. It
does not change the TypeScript implementation decision from ADR-0001, the pnpm
package-manager baseline from ADR-0003, the ESM-only package shape from ADR-0011,
the root-only export surface from ADR-0012, the root declaration metadata policy
from ADR-0013, the universal runtime entry from ADR-0014, the Vitest runner
decision from ADR-0037, the Oxlint linter decision from ADR-0038, or the Oxfmt
formatter decision from ADR-0039.

External references:

- Node.js previous releases:
  <https://nodejs.org/en/about/previous-releases>
- Node.js v22.11.0 release notes:
  <https://nodejs.org/en/blog/release/v22.11.0>
- Node.js v22.12.0 release notes:
  <https://nodejs.org/en/blog/release/v22.12.0>
- Node.js packages documentation:
  <https://nodejs.org/api/packages.html>
- Node.js TypeScript documentation:
  <https://nodejs.org/api/typescript.html>
- TypeScript module reference:
  <https://www.typescriptlang.org/docs/handbook/modules/reference>
- Oxlint type-aware linting:
  <https://oxc.rs/docs/guide/usage/linter/type-aware.html>
- Oxlint configuration:
  <https://oxc.rs/docs/guide/usage/linter/config.html>
- Deno Node and npm compatibility:
  <https://docs.deno.com/runtime/fundamentals/node/>
- Bun module resolution:
  <https://bun.com/docs/runtime/module-resolution>

This decision should be revisited if one of the following becomes true:

- the package needs syntax or runtime behavior unavailable in Node.js 22 LTS;
- Node.js 22 reaches end of life before v1 support policy is updated;
- selected development tools require a patch-level Node.js floor that must become
  part of package metadata rather than tooling metadata;
- TypeScript, `typescript-go`, or Oxlint type-aware linting diverges from the
  selected TypeScript configuration in a way that causes recurring false positives
  or false negatives;
- Deno or Bun compatibility requires a runtime-specific package branch or a
  different JavaScript target;
- a future package registry or consumer ecosystem requires a different TypeScript
  declaration compatibility target.
