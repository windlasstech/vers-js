---
parent: Decisions
nav_order: 37
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use Vitest for V1 Tests

## Context and Problem Statement

ADR-0002 selects Node.js LTS as the primary development runtime while keeping
Deno and Bun as compatibility verification targets. ADR-0003 selects pnpm for
development package management. ADR-0008 selects official parse conformance
fixtures for v1, and ADR-0009 requires those fixtures to be pinned to a
reproducible upstream snapshot. ADR-0011 through ADR-0014 select a single
ESM-only, root-only, universal package entry. ADR-0035 selects a handwritten
scanner/parser whose correctness depends on syntax behavior, diagnostics,
resource boundaries, and package-surface verification.

The package now needs a concrete primary test runner. The runner must support
TypeScript authoring, ESM tests, fixture-driven parser tests, fast local
feedback, and explicit package smoke tests. It must not replace the requirement
to run cross-runtime compatibility checks against the built package shape.

Should v1 use Vitest, Node.js `node:test`, Jest, or another test runner for the
primary test suite?

## Decision Drivers

- Tests should be comfortable to write in TypeScript and ESM.
- Parser and diagnostic fixtures should be easy to express with rich matchers and
  focused local test runs.
- Local feedback should be fast while the handwritten parser evolves.
- The dependency surface should remain acceptable under pnpm frozen installs and
  dependency cooldown policy.
- The primary runner should remain a development tool; compatibility with Deno and
  Bun must still be proven by separate smoke tests against built package output.
- The selected runner should avoid unnecessary legacy CommonJS or transform
  complexity for an ESM-only package.

## Considered Options

- Vitest
- Node.js `node:test`
- Jest
- uvu or tape
- Bun test

## Decision Outcome

Chosen option: "Vitest", because it provides the best local development
experience for a TypeScript and ESM parser library while preserving the ability to
run separate built-package smoke tests in Node.js, Deno, and Bun.

The v1 primary test suite will use Vitest for unit, fixture, parser, diagnostic,
and package-boundary tests that run under the Node.js LTS development baseline.
Vitest does not replace TypeScript type-checking; the verification toolchain must
still include a separate `tsc --noEmit` or equivalent type-check command.

Vitest also does not define the package's cross-runtime compatibility claim.
Compatibility with Deno and Bun remains an explicit smoke-test responsibility
against the built package entry selected by ADR-0014.

The test toolchain should support package scripts equivalent to:

```text
typecheck: tsc --noEmit
test:      vitest run
test:watch: vitest
```

Exact script names, coverage thresholds, reporters, and file layout remain
implementation details.

### Consequences

- Good, because tests can be authored naturally in TypeScript and ESM.
- Good, because Vitest provides watch mode, filtering, line-targeted runs,
  Jest-compatible assertions, mocks, snapshots, coverage, and IDE integrations.
- Good, because parser and diagnostic tests can use rich `expect` matchers without
  adopting Jest's ESM and TypeScript transform complexity.
- Good, because Vitest remains a development dependency and does not change the
  runtime package boundary.
- Neutral, because type-checking remains a separate TypeScript compiler step.
- Bad, because Vitest adds a development dependency chain where `node:test` would
  add none.
- Bad, because Vitest's Node-based runner cannot itself prove Deno or Bun package
  compatibility.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- primary unit and fixture tests run through Vitest under Node.js LTS;
- TypeScript type-checking is still run separately from Vitest;
- official pinned parse fixtures and project-owned negative fixtures are covered
  by Vitest tests;
- package-boundary tests validate root exports and declaration metadata;
- separate smoke tests import the built package root under Node.js, Deno, and Bun;
- Vitest configuration does not require runtime-specific globals in the core
  library.

## Pros and Cons of the Options

### Vitest

This option uses Vitest as the primary test runner for v1 development and CI.

- Good, because it has out-of-the-box TypeScript, ESM, JSX, and top-level await
  support for tests.
- Good, because its default watch-mode experience and module-graph-aware reruns
  improve local parser development feedback.
- Good, because file, test-name, line-number, tag, and project filtering make it
  easy to focus on one parser or diagnostic case.
- Good, because Jest-compatible `expect`, snapshots, and `vi` mocking provide rich
  assertions without adopting Jest.
- Good, because coverage through V8 or Istanbul is available when needed.
- Good, because official VS Code and JetBrains integrations improve test
  discovery and debugging.
- Bad, because it adds Vitest and its related development dependency surface.
- Bad, because it is not a cross-runtime compatibility runner for Deno or Bun.

### Node.js `node:test`

This option uses Node.js's built-in test runner as the primary test suite.

- Good, because it has no package dependency and is stable in Node.js.
- Good, because it aligns tightly with the Node.js LTS development runtime.
- Good, because it supports suites, filtering, watch mode, coverage, mocks, and
  snapshots in modern Node.js.
- Bad, because TypeScript execution is either limited to Node.js type stripping or
  requires a separate loader or compile-first workflow.
- Bad, because assertions are lower-level unless additional assertion libraries
  are added.
- Bad, because local DX and IDE support are less polished than Vitest for focused
  TypeScript test authoring.

### Jest

This option uses Jest as the primary test runner.

- Good, because Jest has the largest testing ecosystem and mature support for
  mocks, snapshots, reporters, watch workflows, and multi-project test suites.
- Good, because many JavaScript developers already know Jest APIs.
- Bad, because Jest's ESM support is still documented as experimental.
- Bad, because TypeScript support typically requires Babel, `ts-jest`, or a
  separate `tsc` step.
- Bad, because ESM module mocking differs from CommonJS mocking and may require
  `jest.unstable_mockModule`.
- Bad, because that transform and module-system surface is unnecessary for a
  greenfield ESM-only parser package.

### uvu or tape

This option uses a minimal test runner such as uvu or tape.

- Good, because these tools are small and conceptually simple.
- Good, because they can fit libraries that want a minimal TAP-style test surface.
- Bad, because they provide fewer built-in DX features for filtering, watch mode,
  rich matchers, coverage, and IDE integration.
- Bad, because choosing them would save little over `node:test` while giving up
  Vitest's TypeScript development ergonomics.

### Bun test

This option uses Bun's built-in test runner.

- Good, because Bun test is fast and has strong TypeScript ergonomics in Bun.
- Good, because it can remain useful as a Bun compatibility smoke target.
- Bad, because ADR-0002 selects Node.js LTS, not Bun, as the primary development
  runtime.
- Bad, because making Bun the primary test runner would make ordinary development
  depend on a compatibility target runtime.

## More Information

This decision defines the primary v1 test runner. It does not change the fixture
scope from ADR-0008, the snapshot-pinning policy from ADR-0009, the ESM package
shape from ADR-0011, the universal runtime entry from ADR-0014, or the
compile-first build decision from ADR-0036.

External references:

- Vitest getting started:
  <https://vitest.dev/guide/>
- Vitest features:
  <https://vitest.dev/guide/features>
- Vitest filtering:
  <https://vitest.dev/guide/filtering>
- Vitest coverage:
  <https://vitest.dev/guide/coverage>
- Vitest IDE integrations:
  <https://vitest.dev/guide/ide>
- Node.js test runner:
  <https://nodejs.org/api/test.html>
- Node.js TypeScript support:
  <https://nodejs.org/api/typescript.html>
- Jest getting started:
  <https://jestjs.io/docs/getting-started>
- Jest ECMAScript modules:
  <https://jestjs.io/docs/ecmascript-modules>
- Jest CLI options:
  <https://jestjs.io/docs/cli>
- Bun test runner:
  <https://bun.com/docs/test>

This decision should be revisited if one of the following becomes true:

- Vitest's dependency surface or runtime requirements conflict with project
  dependency-security policy;
- Node.js `node:test` provides equivalent TypeScript authoring, rich assertion,
  watch, filtering, and IDE ergonomics with materially lower maintenance cost;
- the package grows browser-component or browser-mode test needs that require a
  different runner strategy;
- Deno or Bun becomes the primary development runtime through a future ADR;
- Jest's ESM and TypeScript support becomes simpler than Vitest for this package's
  needs;
- CI performance, coverage, or reporter requirements are not met by Vitest.
