---
parent: Decisions
nav_order: 14
status: accepted
date: 12026-06-07
decision-makers: Yunseo Kim
---

# Use a Universal Default Export for Runtime Imports

## Context and Problem Statement

ADR-0002 requires the published vers-js library to remain runtime-agnostic across
Node.js, Deno, and Bun. Repository guidance also requires the core library to
avoid runtime-specific globals such as `process`, `Buffer`, `Deno`, and `Bun`.
ADR-0011 chooses ESM-only package distribution. ADR-0012 chooses root-only
package exports.

The package now needs an import compatibility target for browser, Deno, Bun, and
Node.js consumers. The main choice is whether to publish one universal ESM entry
or define runtime-specific export conditions such as `"browser"`, `"deno"`,
`"bun"`, or `"node"`.

How should vers-js express browser, Deno, and Bun import compatibility in v1?

## Decision Drivers

- The core package should be runtime-agnostic rather than runtime-branched.
- The package should avoid separate builds unless behavior actually differs by
  runtime.
- Compatibility claims should be proven by smoke tests in target environments.
- Package metadata should remain simple and predictable for a small library.
- Browser compatibility should mean that the same pure ESM entry is safe to load
  through browser-oriented tooling, not that there is a separate browser build.

## Considered Options

- Universal default export
- Browser-specific export condition
- Runtime-specific Deno, Bun, and Node.js export conditions

## Decision Outcome

Chosen option: "Universal default export", because vers-js should publish one
runtime-agnostic ESM entry and verify that same entry through Node.js, Deno, Bun,
and browser-oriented import smoke tests instead of creating runtime-specific
package branches.

The v1 package will use the root export's `"default"` condition for the runtime
entry point:

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

The v1 package will not define `"browser"`, `"deno"`, `"bun"`, or `"node"`
runtime conditions. Browser, Deno, and Bun compatibility will be release goals
verified by smoke tests importing the same package entry point.

### Consequences

- Good, because all supported runtimes exercise the same published artifact.
- Good, because package metadata stays simple and aligned with root-only exports.
- Good, because runtime-specific behavior cannot drift between package branches.
- Good, because compatibility failures are exposed as code portability issues
  rather than hidden behind alternate builds.
- Neutral, because runtime-specific conditions can still be added later if a real
  runtime-specific implementation becomes necessary.
- Bad, because package metadata does not advertise separate browser, Deno, Bun,
  or Node.js builds.

### Confirmation

Compliance with this decision is confirmed when package metadata and compatibility
checks show that:

- `package.json` uses `"exports"["."].default` as the runtime entry point;
- no `"browser"`, `"deno"`, `"bun"`, or `"node"` condition is present in v1;
- no runtime-specific build artifact is published in v1;
- source and built files avoid runtime-specific globals in the core library;
- Node.js can import the package root through ESM;
- Deno can import the package root through npm package resolution;
- Bun can import the package root through npm package resolution;
- a browser-oriented smoke test verifies that the same public ESM entry can be
  loaded through the supported browser delivery path before browser compatibility
  is claimed.

## Pros and Cons of the Options

### Universal default export

This option publishes one ESM runtime file through the root export's `"default"`
condition and expects all target runtimes to import that file.

- Good, because it matches the runtime-agnostic core requirement.
- Good, because it avoids runtime-specific artifacts and condition-order edge
  cases.
- Good, because it keeps Deno and Bun support tied to actual import smoke tests.
- Good, because it is appropriate for a pure parser and validator library.
- Bad, because it cannot provide runtime-specific optimizations or replacements.

### Browser-specific export condition

This option adds a `"browser"` condition with a browser-specific runtime entry.

- Good, because it can support browser-only replacements when a package depends
  on Node.js APIs.
- Good, because it can make browser-specific intent explicit to bundlers that
  honor the condition.
- Bad, because vers-js should not depend on Node.js APIs in the core package.
- Bad, because it creates another artifact and compatibility path to test.
- Bad, because browser compatibility for vers-js should come from portable code,
  not a separate build.

### Runtime-specific Deno, Bun, and Node.js export conditions

This option adds conditions such as `"deno"`, `"bun"`, and `"node"` to route
runtime imports explicitly.

- Good, because it can support runtime-specific implementations if future code
  genuinely needs them.
- Good, because it can make runtime support intent visible in package metadata.
- Bad, because it adds complexity without a runtime-specific implementation need.
- Bad, because separate branches can drift and require additional release checks.
- Bad, because it weakens the goal that one runtime-agnostic artifact should work
  everywhere.

## More Information

This decision refines the cross-runtime compatibility requirement from ADR-0002
and the ESM-only package shape from ADR-0011. ADR-0012 keeps the export surface
root-only, and ADR-0013 defines the declaration metadata for that root export.

External references:

- Node.js conditional exports:
  <https://nodejs.org/api/packages.html#conditional-exports>
- Deno npm package support:
  <https://docs.deno.com/runtime/fundamentals/node/>
- Bun module resolution:
  <https://bun.com/docs/runtime/module-resolution>

This decision should be revisited if vers-js needs a real runtime-specific
implementation or if a supported runtime cannot reliably import the universal ESM
entry point.
