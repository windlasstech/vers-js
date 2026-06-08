---
parent: Decisions
nav_order: 36
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use TypeScript Compiler First Build Without Bundling for V1

## Context and Problem Statement

ADR-0001 selects TypeScript for the reusable VERS library. ADR-0002 selects
Node.js LTS for development while requiring the published library to remain
portable across Node.js, Deno, and Bun. ADR-0003 selects pnpm for dependency
installation and supply-chain policy. ADR-0011 selects ESM-only package
distribution. ADR-0012 limits the v1 export surface to the package root.
ADR-0013 requires root declaration metadata through both the root `types` field
and the root export's `types` condition. ADR-0014 selects one universal runtime
entry point instead of runtime-specific package branches.

The package now needs a concrete build verification toolchain. The build must
emit JavaScript and declarations that match the selected ESM-only package shape,
support package-boundary checks, and avoid adding unnecessary build artifacts or
dependency surface before the v1 parser needs them.

Should v1 build package artifacts with the TypeScript compiler directly, use a
library bundler, or adopt a higher-level package build system?

## Decision Drivers

- The v1 package publishes one root ESM runtime entry and one root declaration
  entry.
- The core library should remain runtime-agnostic and should not rely on bundler
  rewrites to hide portability issues.
- TypeScript declaration output is part of the public package contract.
- Build dependencies should remain small and compatible with pnpm frozen installs
  and dependency cooldown policy.
- Package verification should exercise the built package shape through imports in
  Node.js, Deno, and Bun rather than relying on bundler success as compatibility
  evidence.
- Future bundling should remain possible if the package gains multiple entry
  points, browser-specific artifacts, or a concrete size/performance requirement.

## Considered Options

- TypeScript compiler first build without bundling
- tsup library bundler
- Rollup library bundler
- unbuild package build system
- esbuild plus TypeScript declaration emit
- Vite library mode

## Decision Outcome

Chosen option: "TypeScript compiler first build without bundling", because v1
publishes a single runtime-agnostic ESM entry with TypeScript declarations and
does not need bundle rewriting, dependency inlining, multi-format output, or
browser-specific packaging.

The v1 build will use `tsc` as the authoritative compiler for package JavaScript
and declaration output. The build may use separate TypeScript configurations for
development type-checking and package emission, but emitted package artifacts
must remain plain ESM JavaScript plus `.d.ts` declarations under the selected
package metadata shape.

The build toolchain should support package scripts equivalent to:

```text
typecheck: tsc --noEmit
build:     tsc -p tsconfig.build.json
```

Exact script names, output directory, compiler target, and Node.js engine floor
remain implementation details, but v1 will not introduce a bundler as the normal
package build path.

### Consequences

- Good, because TypeScript remains the source of truth for emitted declarations.
- Good, because the runtime artifact stays close to source code and exposes
  portability issues instead of hiding them behind bundler transforms.
- Good, because v1 avoids bundler dependencies and generated bundle artifacts.
- Good, because the selected ESM-only, root-only, universal-export package shape
  does not need multiple output formats.
- Neutral, because package-size optimization is deferred until there is measured
  need.
- Bad, because `tsc` does not bundle, minify, or rewrite package imports.
- Bad, because package-boundary checks and cross-runtime smoke tests must be
  explicit verification steps rather than implicit bundler outcomes.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- the build uses `tsc` to emit the v1 package JavaScript and declarations;
- the emitted runtime entry is ESM and matches `package.json` root export
  metadata;
- root `types` metadata and the root export's `types` condition point at the
  emitted declaration file;
- no bundled, minified, CommonJS, browser-specific, Deno-specific, Bun-specific,
  or Node-specific runtime artifact is part of v1 package output;
- package-boundary checks validate `exports`, `types`, and published-file metadata;
- smoke tests import the built package root in Node.js, Deno, and Bun before
  compatibility is claimed.

## Pros and Cons of the Options

### TypeScript compiler first build without bundling

This option uses `tsc` for JavaScript and declaration emission and relies on
explicit package checks for package-boundary validation.

- Good, because it has the smallest build-tool dependency surface.
- Good, because it aligns declaration output with TypeScript's own declaration
  publishing model.
- Good, because it preserves the single universal ESM artifact selected by
  ADR-0014.
- Good, because cross-runtime failures remain visible as code or metadata
  portability problems.
- Bad, because it does not provide bundler conveniences such as import rewriting,
  dependency externalization reports, minification, or multi-format output.

### tsup library bundler

This option uses tsup to bundle TypeScript library entry points and emit bundled
JavaScript plus declarations.

- Good, because setup can be concise for common TypeScript library bundles.
- Good, because it can emit multiple module formats when a package needs them.
- Bad, because v1 does not need bundling or multiple formats.
- Bad, because it adds a bundler dependency and generated bundle behavior to a
  package whose current goal is one transparent ESM artifact.
- Bad, because the upstream tsup repository currently warns that the project is no
  longer actively maintained and points users toward tsdown.

### Rollup library bundler

This option uses Rollup directly to build package JavaScript.

- Good, because Rollup is mature and gives precise control over output formats,
  externals, and tree-shaking.
- Good, because it is a strong future option if the package needs browser bundles
  or multiple entry points.
- Bad, because declarations still need a TypeScript declaration path or plugin.
- Bad, because direct Rollup configuration is unnecessary complexity for one pure
  ESM parser entry.

### unbuild package build system

This option uses unbuild as a package-oriented build wrapper around Rollup and
related tooling.

- Good, because it can infer package build outputs from package metadata and can
  generate both runtime files and declarations.
- Good, because it is useful for packages that need ESM/CommonJS compatibility or
  bundleless package layouts.
- Bad, because v1 intentionally avoids dual ESM/CommonJS output and multiple
  package branches.
- Bad, because it adds abstraction over build output that is not needed for the
  first package shape.

### esbuild plus TypeScript declaration emit

This option uses esbuild for JavaScript output and TypeScript separately for
declaration output.

- Good, because esbuild is very fast.
- Good, because it can be useful if the package later needs a bundled or minified
  artifact.
- Bad, because esbuild does not emit TypeScript declarations, so `tsc` remains
  necessary.
- Bad, because using two emit pipelines for v1 would make JavaScript and
  declaration output easier to drift.

### Vite library mode

This option uses Vite's library build mode.

- Good, because it is excellent for browser-oriented libraries and component
  libraries already using Vite.
- Good, because it provides a strong frontend development ecosystem if browser UI
  artifacts become part of the package family later.
- Bad, because vers-js v1 is a runtime-agnostic parser package, not a browser app
  or component library.
- Bad, because declaration emission still needs a separate TypeScript path or
  plugin.

## More Information

This decision refines the build-tool detail left open by ADR-0011. It does not
change the ESM-only package format from ADR-0011, the root-only export surface
from ADR-0012, the declaration metadata policy from ADR-0013, or the universal
runtime entry policy from ADR-0014.

External references:

- TypeScript declaration publishing:
  <https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html>
- TypeScript `emitDeclarationOnly` option:
  <https://www.typescriptlang.org/tsconfig/emitDeclarationOnly.html>
- Node.js packages and `exports`:
  <https://nodejs.org/api/packages.html>
- Rollup introduction:
  <https://rollupjs.org/introduction/>
- unbuild documentation:
  <https://unjs.io/packages/unbuild/>
- tsup repository:
  <https://github.com/egoist/tsup>
- esbuild TypeScript content type notes:
  <https://esbuild.github.io/content-types/#typescript>
- Vite build options:
  <https://vite.dev/config/build-options>

This decision should be revisited if one of the following becomes true:

- v1 or a later release adds multiple public runtime entry points;
- the package needs a browser-specific, Node-specific, Deno-specific, or
  Bun-specific build artifact;
- a concrete consumer requires CommonJS output and a future ADR reverses the
  ESM-only decision;
- measured package size, tree-shaking, or performance issues require bundling or
  minification;
- TypeScript declaration emit no longer satisfies the package's public type
  contract;
- package-boundary checks become simpler and more reliable through a package build
  system than through direct `tsc` output plus explicit smoke tests.
