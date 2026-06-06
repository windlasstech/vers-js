---
parent: Decisions
nav_order: 2
status: accepted
date: 12026-06-07
decision-makers: Yunseo Kim
---

# Use Node.js LTS as the Development Runtime

## Context and Problem Statement

This project implements a reusable TypeScript VERS library. The published
library must remain portable across major JavaScript runtimes, including
Node.js, Deno, and Bun, and must not be strongly coupled to one runtime's
private APIs, globals, module-resolution behavior, or package manager.

This decision is only about the runtime used for project development tasks such
as installing dependencies, running scripts, building package artifacts, testing,
and release automation. It does not define the only runtime that may consume the
published library.

Which runtime should this project use as its primary development baseline while
preserving runtime-agnostic published artifacts?

## Decision Drivers

- The first release is a TypeScript library that needs stable package metadata,
  declaration files, and package boundary validation.
- Development tooling should not encourage Node.js, Deno, or Bun-specific APIs
  to leak into the runtime-neutral library core.
- The package should be straightforward for ordinary JavaScript and TypeScript
  contributors to install, test, and publish.
- npm package semantics, `package.json`, and `exports` remain the most common
  compatibility boundary for JavaScript library consumers and tooling.
- Deno and Bun support are important compatibility targets, but their presence
  should be verified by tests rather than assumed from the development runtime.
- The chosen baseline should work well in local development and CI without
  premature custom adapters, generated wrappers, or runtime-specific publishing
  workflows.
- The decision should remain reversible if Deno, Bun, JSR, or another toolchain
  becomes a better low-risk primary development baseline later.

## Considered Options

- Node.js LTS as the primary development runtime, with Deno and Bun compatibility
  checks
- Deno as the primary development runtime
- Bun as the primary development runtime
- No primary runtime; fully runtime-neutral scripts only

## Decision Outcome

Chosen option: "Node.js LTS as the primary development runtime, with Deno and Bun
compatibility checks", because it gives the project the lowest-friction path to
ordinary npm-compatible package development while keeping Deno and Bun support as
explicit compatibility requirements instead of implicit assumptions.

The project will use a supported Node.js LTS release as the default runtime for
local development, package scripts, build tooling, primary tests, and release
automation. Development dependencies and scripts should be runnable from the
Node.js LTS baseline without relying on Deno or Bun-specific behavior.

The published library must still be designed and tested as runtime-agnostic
TypeScript/JavaScript. Core library code should avoid runtime-specific globals
and APIs such as `process`, `Buffer`, `Deno`, or `Bun` unless a future decision
adds a clearly isolated adapter or compatibility layer.

Deno and Bun should be used as compatibility verification targets. CI should add
smoke tests or fixture tests that import and exercise the published package shape
under Deno and Bun before releases claim compatibility with those runtimes.

This decision does not require a specific package manager. npm is the default
available baseline with Node.js, while pnpm or another npm-compatible package
manager may be chosen separately if the project wants stricter installs, faster
dependency management, or workspace features.

### Consequences

- Good, because Node.js LTS aligns with the broadest existing JavaScript package
  publishing and contributor workflow.
- Good, because npm-compatible `package.json`, `exports`, package scripts, and
  release tooling can be treated as the primary package boundary.
- Good, because Deno and Bun compatibility becomes an explicit verification
  concern instead of a property assumed from local development success.
- Good, because keeping Deno and Bun in CI helps catch runtime-specific API leaks,
  module-resolution differences, and package metadata mistakes.
- Neutral, because the project may still use Deno or Bun locally for exploratory
  checks, as long as Node.js LTS remains the documented baseline.
- Neutral, because a package-manager decision remains separate from the runtime
  baseline decision.
- Bad, because Node.js does not provide as integrated a TypeScript-first developer
  experience as Deno or Bun without additional tools.
- Bad, because cross-runtime compatibility checks add CI maintenance overhead.
- Bad, because contributors must avoid accidentally treating Node.js development
  success as proof that the published library is portable.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- local development instructions name a supported Node.js LTS release as the
  primary runtime baseline;
- package scripts, build tooling, primary tests, and release automation run under
  the Node.js LTS baseline;
- core library code avoids unisolated Node.js, Deno, and Bun-specific globals and
  APIs;
- package metadata exposes a stable, runtime-agnostic public API surface;
- CI or pre-release checks import and exercise the package under Node.js, Deno,
  and Bun before compatibility is claimed;
- package boundary checks catch invalid `exports`, declaration, and packaging
  metadata before release.

## Pros and Cons of the Options

### Node.js LTS as the primary development runtime, with Deno and Bun compatibility checks

This option uses Node.js LTS for ordinary development and release work, while
using Deno and Bun as compatibility targets in CI or pre-release checks.

- Good, because Node.js LTS is the most conservative baseline for npm-compatible
  package development.
- Good, because it keeps contributor setup familiar and avoids requiring Deno or
  Bun for the default workflow.
- Good, because npm package metadata and release tooling can be validated in the
  environment where they are most mature.
- Good, because Deno and Bun support is verified through actual compatibility
  checks rather than inferred from implementation intent.
- Neutral, because local contributors may still use Deno or Bun for secondary
  checks if they do not change the committed baseline.
- Bad, because extra tooling is needed for the TypeScript development experience.
- Bad, because runtime portability must be enforced by review and tests rather
  than by the development runtime alone.

### Deno as the primary development runtime

This option uses Deno as the default runtime for development, testing, formatting,
linting, and package workflow.

- Good, because Deno has first-class TypeScript support, built-in checking,
  formatting, linting, testing, and documentation tooling.
- Good, because Deno and JSR encourage portable ESM and TypeScript source
  publishing patterns.
- Good, because Deno's permissions and stricter defaults can expose accidental
  runtime assumptions.
- Bad, because Deno-first imports, configuration, permissions, and JSR-oriented
  workflow can become project conventions that ordinary npm consumers do not
  share.
- Bad, because npm-oriented package validation and release automation may require
  more translation or duplicate checks.
- Bad, because using Deno successfully does not prove that the npm package shape
  works correctly in Node.js or Bun.

### Bun as the primary development runtime

This option uses Bun as the default runtime, package manager, test runner, and
script runner.

- Good, because Bun offers a fast, integrated development loop for TypeScript,
  package installation, scripts, and tests.
- Good, because Bun is highly compatible with npm package workflows and can run
  many Node-oriented tools.
- Good, because fast local feedback can improve parser fixture iteration.
- Bad, because Bun-specific globals, APIs, test behavior, and TypeScript settings
  can leak into the library core.
- Bad, because Bun compatibility with Node.js is broad but not identical, so Bun
  success is not enough to prove Node.js or Deno compatibility.
- Bad, because requiring Bun as the default contributor runtime may be less
  familiar than requiring Node.js LTS.

### No primary runtime; fully runtime-neutral scripts only

This option avoids naming a primary runtime and requires all project automation to
be runnable in multiple runtimes from the start.

- Good, because it best expresses the goal of runtime-neutral published
  artifacts.
- Good, because it reduces the chance that one runtime's APIs become invisible
  assumptions.
- Neutral, because this can work for a very small library with minimal scripts.
- Bad, because development still needs a practical runtime for dependency
  installation, build tooling, testing, and release automation.
- Bad, because every script and tool decision would need multi-runtime support
  before the first release, adding process overhead before the package API is
  stable.
- Bad, because lack of a primary baseline can make contributor setup and CI
  failures harder to diagnose.

## More Information

This decision refines the development-environment consequence of using
TypeScript for the first VERS library release.

External references:

- Node.js releases and LTS policy:
  <https://nodejs.org/en/about/previous-releases>
- Node.js packages and `exports`:
  <https://nodejs.org/api/packages.html>
- npm `package.json` reference:
  <https://docs.npmjs.com/cli/v10/configuring-npm/package-json>
- Deno TypeScript support:
  <https://docs.deno.com/runtime/fundamentals/typescript/>
- Deno Node and npm compatibility:
  <https://docs.deno.com/runtime/fundamentals/node/>
- JSR package publishing:
  <https://jsr.io/docs/publishing-packages>
- Bun TypeScript support:
  <https://bun.sh/docs/runtime/typescript>
- Bun Node.js compatibility:
  <https://bun.sh/docs/runtime/nodejs-compat>
- `publint` package compatibility checks:
  <https://publint.dev/>
- Are The Types Wrong? package type checks:
  <https://arethetypeswrong.github.io/>

This decision should be revisited if one of the following becomes true:

- the project adopts a package format or registry workflow where Node.js LTS is
  no longer the lowest-risk development baseline;
- Deno, Bun, or JSR becomes the dominant source of package consumers or release
  tooling for this library;
- Node.js LTS tooling blocks runtime-neutral package output or creates recurring
  compatibility failures in Deno or Bun;
- cross-runtime CI becomes too expensive relative to the compatibility guarantees
  it provides;
- the library adds runtime-specific adapters that require their own development
  runtime decisions.
