---
parent: Decisions
nav_order: 12
status: accepted
date: 12026-06-07
decision-makers: Yunseo Kim
---

# Use Root-Only Package Exports

## Context and Problem Statement

ADR-0011 chooses ESM-only package distribution for vers-js. It also requires the
public package entry point to be defined with `"exports"`. The package still
needs a public export surface: either a single root export, named subpath exports,
or broad wildcard exports.

ADR-0004 defines a small Result-centered functional public API. The repository
guidance requires that parser internals do not leak through the public API.

Which package export surface should vers-js v1 expose?

## Decision Drivers

- The v1 public API should stay small and stable.
- Parser internals, tokenizer internals, and implementation layout should remain
  private.
- Package metadata should be easy to validate before release.
- The export surface should align with ESM-only package distribution.
- Future subpath exports should remain possible if a concrete API boundary
  justifies them.

## Considered Options

- Root-only export
- Named subpath exports
- Wildcard exports

## Decision Outcome

Chosen option: "Root-only export", because it gives vers-js v1 one explicit
public package boundary for the functional API while keeping parser internals and
implementation file layout private.

The v1 package will expose only the package root through `"exports"`:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

The root export is the only supported package import path for v1:

```ts
import { canonicalizeVers, parseVers, validateVers } from "vers-js";
```

Subpath imports such as `vers-js/parser`, `vers-js/errors`, or `vers-js/*` are
not supported in v1. A future ADR may add specific subpath exports when there is
a stable public API boundary that should be imported independently.

### Consequences

- Good, because users get one clear import path.
- Good, because internal parser, model, and diagnostic implementation files can
  change without creating package-level breaking changes.
- Good, because the package boundary aligns with the small functional API from
  ADR-0004.
- Good, because package metadata and release checks stay simple.
- Neutral, because subpath exports can still be added later as additive public
  API.
- Bad, because users cannot import individual modules through package subpaths in
  v1.

### Confirmation

Compliance with this decision is confirmed when package metadata and release
checks show that:

- `package.json` defines an `"exports"` map;
- the only public export key is `"."`;
- no wildcard export such as `"./*"` is present;
- no named subpath export is present in v1;
- package boundary tests reject unsupported subpath imports;
- documented examples import public API from `"vers-js"` only.

## Pros and Cons of the Options

### Root-only export

This option exposes only the package root as the public import path.

- Good, because it matches the small v1 API surface.
- Good, because it avoids coupling consumers to implementation file structure.
- Good, because it supports tree-shaking through named ESM exports from one
  public module.
- Good, because future subpath exports can be added deliberately.
- Bad, because users cannot choose narrower package subpaths.

### Named subpath exports

This option exposes selected paths such as `./errors`, `./types`, or `./parser`
through `"exports"`.

- Good, because it can give users more granular import paths.
- Good, because it can document stable API areas when a package has multiple
  independent public modules.
- Bad, because it expands the v1 public API surface before those boundaries are
  proven.
- Bad, because subpaths can accidentally mirror implementation structure rather
  than stable product concepts.
- Bad, because each subpath requires additional package, declaration, and
  compatibility checks.

### Wildcard exports

This option exposes implementation files through a broad pattern such as
`"./*": "./dist/*.js"`.

- Good, because it requires little package metadata when many files should be
  importable.
- Bad, because it makes implementation layout part of the public package API.
- Bad, because it risks exposing parser internals that ADR-0004 and repository
  guidance keep private.
- Bad, because routine internal refactors can become package-level breaking
  changes.

## More Information

This decision refines the package boundary required by ADR-0011. ADR-0004
defines the functional public API that should be exported from the package root.

External references:

- Node.js packages and `exports`:
  <https://nodejs.org/api/packages.html>
- TypeScript package `exports` resolution:
  <https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-exports>

This decision should be revisited if a future release defines multiple stable
public API areas that are valuable to import independently.
