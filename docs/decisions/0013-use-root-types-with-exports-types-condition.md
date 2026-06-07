---
parent: Decisions
nav_order: 13
status: accepted
date: 12026-06-07
decision-makers: Yunseo Kim
---

# Use Root Types with an Exports Types Condition

## Context and Problem Statement

ADR-0001 chooses TypeScript for the vers-js implementation and requires public
declarations for consumers. ADR-0011 chooses ESM-only package distribution and
requires TypeScript declarations for the ESM entry point. ADR-0012 limits the v1
package export surface to the package root.

The package now needs a declaration metadata policy. Modern TypeScript can read a
`"types"` condition inside `"exports"`, while many npm and editor tools still
expect a root `"types"` field.

How should vers-js v1 publish and advertise TypeScript declarations?

## Decision Drivers

- TypeScript consumers should get declarations through the modern package export
  map.
- npm, editors, and other tooling should also find the package's root
  declarations through the conventional root `"types"` field.
- Declaration metadata should match the root-only package export surface.
- The v1 package should avoid legacy or speculative type-resolution mechanisms.
- The declaration policy should be easy to validate in package boundary tests.

## Considered Options

- Root types field plus exports types condition
- Exports types condition only
- Root types field only
- `"typesVersions"` fallback

## Decision Outcome

Chosen option: "Root types field plus exports types condition", because it
supports modern TypeScript export-map resolution while preserving the
conventional root declaration pointer expected by npm, editors, and other
tooling.

The v1 package will publish root declaration metadata in both places:

```json
{
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

The `"types"` condition must appear before runtime conditions in the root export
object so TypeScript and tooling can resolve declarations before selecting the
runtime file. `"typesVersions"` will not be used in v1 unless a future ADR sets a
specific legacy TypeScript compatibility target.

### Consequences

- Good, because modern TypeScript consumers resolve declarations through the
  export map.
- Good, because root `"types"` remains visible to npm, editors, and package
  metadata tooling.
- Good, because the declaration metadata mirrors the single root export from
  ADR-0012.
- Good, because the package avoids legacy fallback configuration in v1.
- Neutral, because the same declaration path appears in two package fields.
- Bad, because package metadata has a small amount of intentional duplication.

### Confirmation

Compliance with this decision is confirmed when package metadata and type checks
show that:

- `package.json` has root `"types": "./dist/index.d.ts"`;
- `package.json` has `"exports"["."].types` pointing to the same declaration
  entry point;
- the `"types"` condition appears before runtime conditions for the root export;
- no `"typesVersions"` field is present in v1;
- TypeScript import smoke tests can import public API from `"vers-js"` and see
  exported result, metadata, and issue-code types.

## Pros and Cons of the Options

### Root types field plus exports types condition

This option advertises the same root declaration file both through the
conventional root `"types"` field and through the root export's `"types"`
condition.

- Good, because it supports modern export-map-aware TypeScript resolution.
- Good, because it preserves broad tooling discoverability through root
  `"types"`.
- Good, because it fits root-only package exports.
- Neutral, because it duplicates one path in package metadata.
- Bad, because duplicated metadata must be kept in sync.

### Exports types condition only

This option publishes declaration metadata only inside the `"exports"` map.

- Good, because all public package-boundary metadata lives in `"exports"`.
- Good, because it avoids duplicating the declaration path.
- Bad, because npm, editors, or metadata tools that look for root `"types"` may
  provide a worse experience.
- Bad, because it gives little practical benefit for a single-entry package.

### Root types field only

This option publishes declaration metadata only through the root `"types"` field.

- Good, because it is a long-standing TypeScript package convention.
- Good, because it is simple for packages without export maps.
- Bad, because vers-js already uses `"exports"` as the public package boundary.
- Bad, because declaration metadata would not be colocated with the exported
  runtime entry point.

### `"typesVersions"` fallback

This option adds `"typesVersions"` to redirect declaration paths for TypeScript
versions or path patterns.

- Good, because it can support specific legacy TypeScript resolution scenarios.
- Bad, because it is unnecessary for the current v1 compatibility target.
- Bad, because TypeScript does not use it as the primary path when resolving
  through package `"exports"`.
- Bad, because it increases package metadata complexity without a current user
  requirement.

## More Information

This decision refines the declaration publishing requirement from ADR-0011 and
the root-only export surface from ADR-0012.

External references:

- TypeScript package `exports` resolution:
  <https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-exports>
- TypeScript declaration publishing:
  <https://www.typescriptlang.org/docs/handbook/declaration-files/publishing>
- Node.js conditional exports:
  <https://nodejs.org/api/packages.html#conditional-exports>

This decision should be revisited if vers-js adopts additional public subpath
exports or sets an explicit legacy TypeScript compatibility target.
