---
parent: Decisions
nav_order: 50
status: accepted
date: 12026-06-12
decision-makers: Yunseo Kim
---

# Use Named Exports Only

## Context and Problem Statement

ADR-0011 chooses an ESM-only package. ADR-0012 chooses a root-only package export
surface. ADR-0013 publishes root declarations through both the root `types` field
and the package export map. ADR-0014 chooses one universal runtime entry through
the package export map's `"default"` condition instead of runtime-specific
conditions such as `"browser"`, `"deno"`, `"bun"`, or `"node"`.

That package metadata decision does not determine whether the ESM entry file
itself should provide a JavaScript `export default` binding. The package still
needs a separate decision for the JavaScript module export surface that users
import from the root entry.

Should the package root continue to expose both named exports and a default
namespace-like object, or should it expose named exports only?

## Decision Drivers

- The public API should remain small, explicit, and function-oriented.
- TypeScript and editor tooling should be able to discover, auto-import, and
  rename public symbols consistently.
- The package should avoid duplicate public API shapes for the same functions
  unless the duplicate shape provides a clear compatibility benefit.
- The package should stay aligned with the Oxlint import rule set chosen for the
  repository.
- The package must remain ESM-only, root-only, runtime-agnostic, and compatible
  with Node.js, Deno, and Bun through one universal runtime entry file.

## Considered Options

- Named exports only
- Named exports plus a default export object
- Named exports plus a named `vers` object

## Decision Outcome

Chosen option: "Named exports only", because it gives users the clearest
TypeScript and ESM API while reducing duplicated package surface and preserving
the ESM-only, root-only package boundary.

The package root will export runtime functions only as named exports:

```ts
export { canonicalizeVers, parseVers, validateVers };
```

Users that want a namespace-style object can use the standard ESM namespace
import form:

```ts
import * as vers from "@windlass/vers-js";
```

The package export map may still use the `"default"` condition to route runtime
resolution to the universal ESM entry file:

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

That package metadata condition does not imply a JavaScript default export.
ADR-0014 remains the package export-map decision; this ADR governs the JavaScript
module exports provided by the runtime entry file.

### Consequences

- Good, because public imports use stable exported names such as `parseVers`.
- Good, because editor auto-import, completion, search, and rename workflows can
  operate on named public symbols directly.
- Good, because bundlers and static analysis tools can reason about individual
  function exports without a namespace-like runtime object.
- Good, because package-boundary tests no longer need to verify a duplicated
  default object shape.
- Good, because the source can satisfy `import/no-default-export` without a
  project-specific exception for the package root.
- Neutral, because namespace-style access remains possible through
  `import * as vers from "@windlass/vers-js"`.
- Bad, because consumers cannot write `import vers from "@windlass/vers-js"`.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- the package root exports `parseVers`, `validateVers`, and `canonicalizeVers` as
  named runtime exports;
- the package root does not export a JavaScript default binding;
- public examples use named imports, or namespace imports when demonstrating a
  grouped runtime value;
- package-boundary tests verify named root exports and no longer require a
  default export object;
- `package.json` remains ESM-only, root-only, and may continue to use the
  `"exports"["."].default` condition for universal runtime entry resolution;
- Node.js, Deno, and Bun smoke tests import the same root ESM entry through named
  exports.

## Pros and Cons of the Options

### Named exports only

This option exposes each public runtime function as a named ESM export and does
not expose a JavaScript default export.

- Good, because it matches the small functional API from ADR-0004.
- Good, because users import exactly the functions they call.
- Good, because exported names are consistent across user code, documentation,
  editor auto-imports, and refactors.
- Good, because it avoids maintaining two public access paths for the same
  functions.
- Good, because namespace-style usage is still available through standard ESM
  namespace imports.
- Bad, because default-import ergonomics are unavailable.

### Named exports plus a default export object

This option keeps named functions and also exports a default object containing
those functions.

- Good, because users can write `import vers from "@windlass/vers-js"`.
- Good, because the default object gives one explicit runtime value to pass
  around.
- Bad, because the default object duplicates the named export surface.
- Bad, because default imports can be locally renamed to unrelated names, making
  code search and refactors less consistent.
- Bad, because a namespace-like object can make static analysis and tree-shaking
  more conservative than direct named imports.
- Bad, because it conflicts with the repository's `import/no-default-export`
  linting policy.

### Named exports plus a named `vers` object

This option exports the three functions as named exports and also exports a named
object such as `vers`.

- Good, because users can write `import { vers } from "@windlass/vers-js"` for grouped
  access without a JavaScript default export.
- Good, because the API avoids default import name ambiguity.
- Bad, because it still duplicates the function export surface.
- Bad, because `import * as vers from "@windlass/vers-js"` already provides a standard ESM
  namespace form without adding another public object.
- Bad, because the extra object would need its own package-boundary tests and
  documentation.

## More Information

This decision complements ADR-0014 by separating the JavaScript module export
surface from the package export-map `"default"` condition. It does not change
ADR-0011's ESM-only package format, ADR-0012's root-only package export boundary,
ADR-0013's root declaration metadata policy, or ADR-0014's universal runtime
entry policy.

Related references:

- Oxc `import/no-default-export` rule:
  <https://oxc.rs/docs/guide/usage/linter/rules/import/no-default-export.html>
- MDN JavaScript `export` reference:
  <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export>
- MDN JavaScript `import` reference:
  <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import>
