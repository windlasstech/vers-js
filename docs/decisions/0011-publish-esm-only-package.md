---
parent: Decisions
nav_order: 11
status: accepted
date: 12026-06-07
decision-makers: Yunseo Kim
---

# Publish an ESM-Only Package

## Context and Problem Statement

vers-js is a new TypeScript package with no existing CommonJS consumer base.
ADR-0001 selects TypeScript for the reusable VERS library. ADR-0002 selects
Node.js LTS as the development runtime while requiring the published library to
remain portable across Node.js, Deno, and Bun. ADR-0003 keeps npm-compatible
`package.json`, `exports`, package scripts, and npm registry publishing as the
package boundary. ADR-0004 defines a small Result-centered functional API.

The package now needs a distribution module format. The main choice is whether
to publish only ECMAScript Modules, or to publish both ESM and CommonJS entry
points through conditional exports.

Should vers-js v1 publish as ESM-only or as a dual ESM/CommonJS package?

## Decision Drivers

- The package is greenfield and does not need to preserve historical CommonJS
  `require()` compatibility.
- The published package should align with modern TypeScript, Node.js, Deno, Bun,
  and bundler expectations.
- Package metadata should stay simple enough for the first release to validate
  thoroughly.
- The distribution format should support a small functional API without
  introducing avoidable build or declaration complexity.
- Runtime-agnostic compatibility should be verified through imports in supported
  runtimes rather than by publishing multiple runtime-specific implementations.
- A future dual package should remain possible if concrete consumer requirements
  justify it.

## Considered Options

- ESM-only package
- Dual ESM/CommonJS package
- CommonJS-only package

## Decision Outcome

Chosen option: "ESM-only package", because vers-js is a new package with no
legacy CommonJS support obligation, and ESM-only publishing gives the first
release the simplest modern package shape while preserving Node.js, Deno, Bun,
and bundler compatibility targets.

The v1 package will publish JavaScript as ESM. `package.json` will explicitly set
`"type": "module"` and define the public entry point with `"exports"`. The
package will publish TypeScript declaration files for the ESM entry point.

A representative package shape is:

```json
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "sideEffects": false
}
```

The exact output directory, build tool, minimum Node.js engine, and declaration
layout may be refined during implementation, but the first release should not
publish a separate CommonJS artifact, `.cjs` entry point, or `"require"`
conditional export.

CommonJS `require("vers-js")` is not a v1 compatibility target. CommonJS
consumers can use dynamic `import()` where their runtime supports it. A future
ADR may add a dual package if a concrete first-party or consumer integration
cannot reasonably consume ESM.

### Consequences

- Good, because the package starts with the modern module format used by current
  TypeScript, Deno, Bun, and bundler workflows.
- Good, because the build and package metadata stay smaller than a dual
  ESM/CommonJS release.
- Good, because the package avoids dual package hazards and duplicate ESM/CJS
  declaration maintenance.
- Good, because explicit `"exports"` defines the public package boundary for the
  small functional API.
- Neutral, because CommonJS consumers can still use dynamic `import()` in
  supported runtimes.
- Bad, because synchronous `require("vers-js")` will not work for CommonJS-only
  consumers in v1.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- `package.json` declares `"type": "module"`;
- public package entry points are defined through `"exports"`;
- the published JavaScript entry point is ESM;
- TypeScript declaration files are published for the public ESM entry point;
- no `"require"` conditional export, `.cjs` runtime artifact, or CommonJS-only
  entry point is part of v1;
- smoke tests import the published package shape from Node.js, Deno, and Bun
  before release compatibility is claimed;
- package boundary checks validate `exports` and declaration metadata before
  release.

## Pros and Cons of the Options

### ESM-only package

This option publishes only ESM JavaScript and TypeScript declarations for the ESM
entry point.

- Good, because it matches modern JavaScript package direction for new packages.
- Good, because Deno and Bun can consume npm packages with ESM entry points.
- Good, because it avoids creating and testing two runtime artifacts for one
  small API surface.
- Good, because it keeps declaration output simpler than paired `.d.mts` and
  `.d.cts` files.
- Bad, because CommonJS-only users cannot load the package with synchronous
  `require()`.

### Dual ESM/CommonJS package

This option publishes separate ESM and CommonJS entry points through conditional
exports.

- Good, because both `import` and `require()` consumers can use the package.
- Good, because it can reduce adoption friction for legacy Node.js applications.
- Bad, because it requires separate build outputs, conditional exports, and more
  declaration metadata.
- Bad, because dual packages can create confusing behavior when import and
  require paths resolve to different module instances or slightly different
  artifacts.
- Bad, because vers-js has no existing CommonJS consumers that justify this
  complexity for v1.

### CommonJS-only package

This option publishes only CommonJS JavaScript.

- Good, because legacy Node.js applications can use synchronous `require()`.
- Bad, because it is misaligned with modern TypeScript, Deno, Bun, and bundler
  expectations for a new package.
- Bad, because it weakens the runtime-agnostic package goal.
- Bad, because it would make a later ESM migration a breaking package-format
  change.

## More Information

This decision defines the package module format only. ADR-0001 defines the
implementation language. ADR-0002 defines the development runtime and
cross-runtime compatibility requirement. ADR-0003 defines the development package
manager. ADR-0004 defines the public API shape.

External references:

- Node.js packages and `exports`:
  <https://nodejs.org/api/packages.html>
- TypeScript Node module modes:
  <https://www.typescriptlang.org/docs/handbook/modules/reference.html#node16-node18-node20-nodenext>
- Deno npm package guidance:
  <https://deno.com/blog/not-using-npm-specifiers-doing-it-wrong>
- Chalk ESM-only package precedent:
  <https://github.com/chalk/chalk/blob/main/package.json>
- nanoid ESM-only package precedent:
  <https://github.com/ai/nanoid/blob/main/package.json>
- Zod dual package precedent:
  <https://github.com/colinhacks/zod/blob/main/packages/zod/package.json>
- Valibot dual package precedent:
  <https://github.com/fabian-hiller/valibot/blob/main/library/package.json>

This decision should be revisited if one of the following becomes true:

- a first-party vers-js consumer cannot reasonably use ESM or dynamic `import()`;
- concrete downstream adoption is blocked by the absence of synchronous
  `require()` support;
- Node.js, Deno, Bun, or TypeScript package-resolution behavior changes in a way
  that makes ESM-only publishing unreliable;
- a future registry or package target requires a different distribution format.
