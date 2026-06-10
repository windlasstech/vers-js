---
title: Build and Test
parent: Architecture Specifications
nav_order: 9
---

# Build and Test

This specification defines the v0.1.0 repository scaffolding, package output, and
verification architecture for `vers-js`. It turns the accepted build, test,
linting, formatting, runtime, package-boundary, and supply-chain decisions into an
implementation contract.

Primary ADR inputs: ADR-0001, ADR-0002, ADR-0003, ADR-0011, ADR-0012,
ADR-0013, ADR-0014, ADR-0035, ADR-0036, ADR-0037, ADR-0038, ADR-0039, and
ADR-0040.

## Development baseline

The v0.1.0 development baseline is:

| Concern                     | Contract                                                              |
| --------------------------- | --------------------------------------------------------------------- |
| Implementation language     | TypeScript.                                                           |
| Primary development runtime | Node.js 22 LTS and newer.                                             |
| Package manager             | pnpm, pinned through `devEngines.packageManager` in `package.json`.   |
| Lockfile                    | Commit `pnpm-lock.yaml` once dependencies exist.                      |
| Build authority             | TypeScript compiler (`tsc`).                                          |
| Primary test runner         | Vitest under the Node.js development baseline.                        |
| Linter                      | Oxlint with type-aware linting.                                       |
| Formatter                   | Oxfmt.                                                                |
| Compatibility smoke targets | Node.js 22 LTS or newer, current stable Deno, and current stable Bun. |

The published library must remain runtime-agnostic even though development uses
Node.js and pnpm. Core source must avoid runtime-specific globals and APIs such as
`process`, `Buffer`, `Deno`, and `Bun`.

## Package scaffolding

When implementation begins, the repository should add package scaffolding that
preserves the architecture contracts:

- `package.json` for package metadata, scripts, and the pnpm
  `devEngines.packageManager` pin;
- `pnpm-lock.yaml` once dependencies exist;
- `.npmrc` or `pnpm-workspace.yaml` for dependency cooldown policy;
- TypeScript configuration for development type-checking;
- TypeScript build configuration for package emission;
- Vitest configuration if defaults are insufficient;
- Oxlint configuration with type-aware linting enabled;
- Oxfmt configuration if defaults are insufficient;
- source files under an implementation directory such as `src/`;
- tests and fixtures under an implementation test directory such as `test/`,
  `tests/`, or `fixtures/`.

Exact file names and layout may be refined during implementation, but the public
package output and verification behavior in this document must remain unchanged.

## TypeScript configuration

The TypeScript configuration must support the ESM-only package shape and the Oxc
toolchain decisions.

Package compiler settings should be equivalent to:

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

The implementation should avoid legacy TypeScript options that conflict with
TypeScript 7 compatibility, `typescript-go`, or Oxlint type-aware linting.

`tsc` remains the authoritative tool for type-checking and declaration emission.
Oxlint may surface type-aware diagnostics, but it does not replace the compiler
check.

## Build output

The v0.1.0 build uses `tsc` to emit package JavaScript and declarations. It must
not use a bundler as the normal package build path.

The output must be plain ESM JavaScript plus `.d.ts` declarations. The package
must not emit or publish:

- CommonJS output;
- `.cjs` entry points;
- bundled or minified runtime artifacts;
- browser-specific artifacts;
- Node-specific, Deno-specific, or Bun-specific artifacts;
- generated parser artifacts;
- parser-generator runtime output.

The emitted runtime entry and declaration entry must match `package.json` package
metadata.

## Package metadata

The package is ESM-only, root-only, and uses one universal runtime entry.

The representative package boundary is:

```json
{
  "type": "module",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "sideEffects": false
}
```

Implementation may choose a different output directory only if all package
metadata and checks are updated consistently.

The root `"types"` field and `"exports"["."].types` condition must point to the
same declaration file. The `"types"` condition must appear before runtime
conditions in the root export object.

The v0.1.0 package must not include:

- `"require"` conditional exports;
- wildcard exports such as `"./*"`;
- named subpath exports such as `"./parser"` or `"./errors"`;
- runtime-specific conditions such as `"browser"`, `"deno"`, `"bun"`, or
  `"node"`;
- `"typesVersions"` unless a later ADR sets a legacy TypeScript target.

## Public export checks

Package boundary tests must verify the package root exports:

- `parseVers`;
- `validateVers`;
- `canonicalizeVers`;
- the default export object containing exactly those three runtime functions;
- public Result, metadata, data-model, span, and issue-code types through the root
  declaration file.

Package boundary tests must also verify that non-string runtime inputs such as
`null`, `undefined`, arrays, objects, and byte arrays throw `TypeError` before
input length checks or parsing.

The default export must not include parser internals, issue-code registries,
fixture helpers, package metadata, or runtime-specific adapters.

Package boundary tests must reject unsupported subpath imports such as:

```ts
import { parseVers } from "vers-js/parser";
import type { VersIssue } from "vers-js/errors";
```

## Package scripts

The package should support scripts equivalent to:

```text
typecheck:    tsc --noEmit
build:        tsc -p tsconfig.build.json
test:         vitest run
test:watch:   vitest
lint:         oxlint --type-aware
lint:fix:     oxlint --type-aware --fix
format:       oxfmt
format:check: oxfmt --check
```

Exact script names may be refined during implementation, but CI and release
verification must include equivalent checks for type-checking, package build,
tests, linting, formatting, package boundary, and runtime compatibility.

Vitest does not replace `tsc --noEmit`. Oxlint type-aware linting does not replace
`tsc --noEmit`. Oxfmt does not replace linting or type-checking.

## Test architecture

The primary test suite uses Vitest under Node.js. Tests must exercise the public
package surface unless a test is explicitly scoped to internal implementation
helpers.

The test layers are:

| Layer                             | Purpose                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Unit tests                        | Verify small parser helpers when those helpers have meaningful internal contracts.                                  |
| Parser success tests              | Verify successful `parseVers()`, `validateVers()`, and `canonicalizeVers()` behavior.                               |
| Official fixture tests            | Run pinned upstream `vers_canonical_parse_test.json` cases through the local disposition table from `fixtures.md`.  |
| Project diagnostic fixtures       | Assert active issue codes, severity, spans, test-only fatality expectations, ordering, and metadata.                |
| Resource boundary tests           | Cover `1024` and `1025` UTF-16 code-unit input length boundaries, `16` issue cap behavior, and truncation metadata. |
| Package boundary tests            | Validate root export metadata, declaration metadata, default export, named exports, and blocked subpaths.           |
| Runtime compatibility smoke tests | Import and exercise the built package root under Node.js, Deno, and Bun.                                            |

Tests must not assert exact human-readable diagnostic message strings. They may
assert that messages are non-empty strings.

Fixture tests must not parse upstream `expected_failure_reason` values as local
issue-code expectations.

## Official and project fixture tests

Official fixture tests use the pinned upstream snapshot and local disposition
rules from `fixtures.md`. Blocking official cases assert only the success or
failure boundary and local success metadata mapping. Project diagnostic fixtures
own exact diagnostic expectations.

Project diagnostic fixture tests must cover every active v0.1.0 issue code from
`diagnostics.md`, including `resource.input_too_long` and diagnostic truncation
metadata. They must also verify that reserved codes are not emitted by v0.1.0 core
public functions.

Fixture runners may use adapters, but those adapters must be deterministic and
must preserve fixture identity in test output.

## Cross-runtime compatibility checks

Before claiming runtime compatibility, the built package root must be smoke-tested
under:

- Node.js 22 LTS or newer;
- current stable Deno;
- current stable Bun.

Each smoke test must import the same built package root and exercise at least:

1. named runtime exports;
2. the default export object;
3. one successful parse or canonicalization path;
4. one normal failure Result path.

Cross-runtime smoke tests must use built package output, not TypeScript source
files or test-only entry points. They must not rely on runtime-specific package
branches because v0.1.0 publishes one universal `"default"` runtime entry.

Browser compatibility may be checked through browser-oriented tooling when a
release claims browser support, but v0.1.0 must not add a browser-specific export
condition or browser-specific build artifact.

## Runtime-agnostic core checks

Verification must catch accidental runtime coupling in core library source.

Core source must not use unisolated:

- `process`;
- `Buffer`;
- `Deno`;
- `Bun`;
- Node.js built-in modules;
- runtime-specific import conditions;
- filesystem, network, timer, or environment APIs for parsing behavior.

Test files, build scripts, and fixture-generation scripts may use Node.js APIs when
they are clearly outside the published runtime core.

## Linting and formatting roles

Oxlint is the JavaScript and TypeScript linter. Type-aware linting must be enabled
in normal verification. Lint configuration should reject accidental
runtime-specific globals in core source and should not normalize CommonJS,
bundler-specific, framework-specific, or runtime-specific package conventions.

Oxfmt is the formatter. It owns formatting only. Formatter configuration must not
silently redefine linting, type-checking, or build behavior.

Generated package artifacts should not be treated as formatter source inputs unless
a future implementation decision explicitly includes them.

## Dependency and CI security

Dependency installation and CI must preserve Windlass supply-chain requirements:

- use pnpm for dependency installation and scripts;
- pin pnpm through `devEngines.packageManager`;
- commit `pnpm-lock.yaml` once dependencies exist;
- use frozen lockfile installs in CI;
- configure pnpm `minimumReleaseAge` with a default of at least `1440` minutes once
  dependencies exist;
- keep dependency cooldown policy in committed `.npmrc` or `pnpm-workspace.yaml`
  configuration;
- do not add build or test CI that bypasses organization security checks.

Build and test workflows must coexist with Windlass reusable security workflows:

- OpenSSF Scorecard;
- OSV Scanner;
- Dependency Review.

New GitHub Actions workflows must follow Windlass workflow hardening guidance:

- explicit minimal permissions;
- SHA-pinned third-party actions where applicable;
- Windlass-owned reusable workflows may follow the documented internal workflow
  exception;
- `step-security/harden-runner` in audit mode for jobs that run actions;
- release artifact attestations when release artifacts are produced.

Production release builds must run on hosted CI rather than a developer
workstation when release provenance or attestations are claimed.

## Verification sequence

The implementation-ready verification sequence is:

1. Install with pnpm using the committed lockfile.
2. Check formatting with Oxfmt.
3. Lint with Oxlint type-aware mode.
4. Type-check with `tsc --noEmit`.
5. Run Vitest unit, parser, fixture, diagnostic, resource, and package-boundary
   tests.
6. Build with `tsc -p tsconfig.build.json` or equivalent.
7. Validate package metadata points at emitted files.
8. Smoke-test the built package root under Node.js, Deno, and Bun.
9. Run or require Windlass supply-chain checks in CI before merge or release.

Implementation may reorder independent checks for CI speed, but release readiness
requires all equivalent checks to pass.

## Invariants

Implementation, tests, and CI must preserve these invariants:

1. Source is authored in TypeScript.
2. Node.js 22 LTS and newer is the Node.js compatibility baseline.
3. pnpm is the development package manager and `pnpm-lock.yaml` is committed once
   dependencies exist.
4. Package build uses `tsc` without bundling for v0.1.0.
5. Package output is ESM JavaScript plus `.d.ts` declarations.
6. Package metadata is ESM-only, root-only, and uses one universal `"default"`
   runtime entry.
7. Root declaration metadata appears in both root `"types"` and
   `"exports"["."].types`.
8. The default export object contains the three public runtime functions and no
   internals.
9. Vitest is the primary test runner under Node.js.
10. Cross-runtime compatibility is proven by built-package smoke tests in Node.js,
    Deno, and Bun.
11. Oxlint with type-aware linting is the linter; Oxfmt is the formatter.
12. Core source remains runtime-agnostic and avoids unisolated runtime-specific
    globals.
13. Fixture tests preserve official fixture provenance and project diagnostic
    contracts.
14. CI build/test workflows do not bypass Windlass security checks.
