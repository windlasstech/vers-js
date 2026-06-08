---
parent: Decisions
nav_order: 38
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use Oxlint With Type-Aware Linting for V1

## Context and Problem Statement

ADR-0001 selects TypeScript for the reusable VERS library. ADR-0002 selects
Node.js LTS as the primary development runtime while keeping the published
library portable across Node.js, Deno, and Bun. ADR-0003 selects pnpm for
dependency installation and supply-chain policy. ADR-0011 through ADR-0014
select an ESM-only, root-only, universal package entry. ADR-0035 selects a
handwritten scanner/parser, ADR-0036 selects a `tsc`-first build, and ADR-0037
selects Vitest for the primary test suite.

The package now needs a concrete JavaScript and TypeScript linter. The linter
should catch high-signal correctness issues while the parser evolves, support
TypeScript and ESM source, fit the Node.js and pnpm development baseline, and
avoid changing the runtime-agnostic package boundary. The project also needs a
policy for whether linting should use TypeScript type information.

Should v1 use Oxlint, ESLint with typescript-eslint, Biome, or another linter
for JavaScript and TypeScript source checks?

## Decision Drivers

- Linting should find correctness issues that TypeScript compilation alone does
  not express, including type-aware bug patterns such as floating promises and
  unsafe assignments.
- The primary linter should be fast enough for frequent local use and CI.
- The tool should work with TypeScript, ESM, Vitest tests, and the package's
  `tsc`-first build without introducing bundler or framework conventions.
- The dependency surface should remain acceptable under pnpm frozen installs and
  dependency cooldown policy.
- The linter should not make runtime-specific globals, CommonJS conventions, or
  alternate package branches normal in core source.
- Formatter selection should remain a separate decision unless the linter choice
  requires combining both concerns.

## Considered Options

- Oxlint with type-aware linting
- ESLint with typescript-eslint
- Biome
- Deno lint
- standard or ts-standard
- JSHint or JSLint

## Decision Outcome

Chosen option: "Oxlint with type-aware linting", because it provides a fast,
dedicated JavaScript and TypeScript linter with strong TypeScript-aware rule
coverage while keeping formatting and package build decisions separate.

The v1 lint toolchain will use Oxlint as the primary JavaScript and TypeScript
linter. Type-aware linting will be enabled through Oxlint's type-aware mode and
the supporting `oxlint-tsgolint` package so that rules requiring TypeScript type
information can run as part of normal verification.

The lint toolchain should support package scripts equivalent to:

```text
lint:     oxlint --type-aware
lint:fix: oxlint --type-aware --fix
```

Type-aware linting does not replace the `tsc --noEmit` type-checking step from
ADR-0036 unless a future ADR explicitly changes the type-checking authority.
Oxlint may report TypeScript diagnostics through `--type-check` in local or CI
workflows, but `tsc` remains the authoritative compiler check for v1.

Exact script names, rule severities, ignore patterns, and config file format
remain implementation details. Formatter selection remains a separate decision.

### Consequences

- Good, because Oxlint is optimized for fast JavaScript and TypeScript linting.
- Good, because type-aware linting allows v1 to catch bug classes that require
  TypeScript type information.
- Good, because Oxlint can be adopted as a dedicated linter without combining the
  formatter decision into the same ADR.
- Good, because the selected linter remains a development dependency and does not
  change the runtime package boundary.
- Neutral, because `oxlint-tsgolint` adds a second lint-related development
  package for type-aware rules.
- Neutral, because `tsc --noEmit` remains part of verification even if Oxlint can
  also surface type-checking diagnostics.
- Bad, because Oxlint's JavaScript plugin compatibility is newer than ESLint's
  plugin ecosystem.
- Bad, because type-aware linting depends on the TypeScript compatibility surface
  exposed by `typescript-go` and may require avoiding legacy `tsconfig` options.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- `package.json` includes lint scripts that run Oxlint over source and test
  files;
- Oxlint type-aware linting is enabled in the lint script or root configuration;
- the project includes the development dependencies required for Oxlint and its
  type-aware linting support;
- TypeScript type-checking still runs through `tsc --noEmit` or an explicitly
  equivalent compiler check;
- lint configuration rejects accidental runtime-specific globals in core source;
- lint configuration does not require CommonJS, bundler-specific, framework, or
  runtime-specific package conventions;
- formatter behavior is not implicitly defined by the Oxlint configuration.

## Pros and Cons of the Options

### Oxlint with type-aware linting

This option uses Oxlint as the primary linter and enables its type-aware linting
path for rules that require TypeScript type information.

- Good, because Oxlint is designed as a high-performance JavaScript and
  TypeScript linter.
- Good, because its type-aware linting support is aligned with TypeScript
  semantics through `typescript-go` and covers nearly all typescript-eslint
  type-aware rules.
- Good, because it supports high-signal correctness checks without adopting a
  broad formatter or build-tool platform.
- Good, because it fits the Node.js and pnpm development baseline while keeping
  Deno and Bun as package compatibility targets rather than development toolchain
  owners.
- Good, because formatter selection can be decided independently through a future
  ADR.
- Bad, because type-aware linting requires the additional `oxlint-tsgolint`
  package.
- Bad, because custom JavaScript plugin support is less mature than ESLint's
  long-standing plugin ecosystem.
- Bad, because some legacy TypeScript configuration options may not be supported
  by the type-aware path.

### ESLint with typescript-eslint

This option uses ESLint with the typescript-eslint parser, plugin, and typed lint
configuration.

- Good, because ESLint has the largest JavaScript linting ecosystem and the most
  mature custom-rule and plugin surface.
- Good, because typescript-eslint is the established baseline for TypeScript
  typed linting.
- Good, because many editors, contributors, and third-party configs already know
  ESLint conventions.
- Bad, because typed linting through ESLint can be substantially slower than
  Oxlint for frequent local and CI checks.
- Bad, because the configuration and dependency surface is larger for a
  greenfield package that does not need custom plugins yet.
- Bad, because adopting ESLint primarily for ecosystem optionality adds complexity
  before v1 has a demonstrated need for that ecosystem.

### Biome

This option uses Biome as the primary linter, potentially alongside its formatter
and assist capabilities.

- Good, because Biome offers an integrated linting and formatting workflow with a
  small configuration surface.
- Good, because it is fast and can simplify projects that want one tool for
  formatting, linting, import organization, and editor integration.
- Neutral, because its integrated formatter is valuable but belongs to the
  formatter decision rather than the linter-only decision.
- Bad, because the project has not yet decided to combine linting and formatting
  under one toolchain.
- Bad, because Biome's type-aware linting model relies on its project scanner and
  inferred type information rather than directly using TypeScript compiler
  semantics for the same breadth of typed rules.
- Bad, because choosing Biome as the linter would prematurely bias the separate
  formatter decision.

### Deno lint

This option uses Deno's built-in linter for source checks.

- Good, because Deno provides an integrated TypeScript-aware development
  experience with built-in linting and formatting commands.
- Good, because Deno can remain useful as a compatibility smoke-test runtime.
- Bad, because ADR-0002 selects Node.js LTS, not Deno, as the primary development
  runtime.
- Bad, because using Deno lint as the primary linter would couple ordinary
  development to a compatibility target runtime.
- Bad, because success under Deno's toolchain does not prove the npm package shape
  selected by ADR-0011 through ADR-0014.

### standard or ts-standard

This option uses standard or ts-standard as an opinionated linting convention.

- Good, because it offers a low-configuration style and linting baseline.
- Good, because it can suit applications that want a fixed house style with few
  decisions.
- Bad, because vers-js needs correctness-oriented TypeScript linting more than a
  broad opinionated style preset.
- Bad, because the project should choose lint rules intentionally around parser,
  diagnostics, package boundaries, and runtime portability.
- Bad, because adopting a wrapper convention gives less flexibility than using a
  primary linter directly.

### JSHint or JSLint

This option uses a legacy JavaScript linter.

- Good, because these tools are simple and historically well known.
- Bad, because they are not a modern TypeScript and ESM linting baseline.
- Bad, because they do not provide the type-aware TypeScript checks needed by this
  decision.
- Bad, because using them would add a legacy tool without solving the project's
  core linting requirements.

## More Information

This decision defines the primary v1 JavaScript and TypeScript linter. It does
not change the TypeScript implementation decision from ADR-0001, the Node.js LTS
development baseline from ADR-0002, the pnpm package-manager baseline from
ADR-0003, the ESM-only package shape from ADR-0011, the universal runtime entry
from ADR-0014, the `tsc`-first build decision from ADR-0036, or the Vitest test
runner decision from ADR-0037.

External references:

- Oxlint overview:
  <https://oxc.rs/docs/guide/usage/linter.html>
- Oxlint type-aware linting:
  <https://oxc.rs/docs/guide/usage/linter/type-aware.html>
- Oxlint JavaScript plugins:
  <https://oxc.rs/docs/guide/usage/linter/js-plugins.html>
- Oxlint compatibility:
  <https://oxc.rs/compatibility.html>
- ESLint documentation:
  <https://eslint.org/docs/latest/>
- typescript-eslint typed linting:
  <https://typescript-eslint.io/getting-started/typed-linting/>
- Biome linter:
  <https://biomejs.dev/linter/>
- Deno linting and formatting:
  <https://docs.deno.com/runtime/fundamentals/linting_and_formatting/>
- standard:
  <https://standardjs.com/>
- ts-standard:
  <https://github.com/standard/ts-standard>

This decision should be revisited if one of the following becomes true:

- Oxlint type-aware linting fails to support the TypeScript configuration required
  by the package;
- Oxlint's dependency surface conflicts with project dependency-security policy;
- ESLint's plugin ecosystem becomes necessary for project-owned rules or package
  boundary checks that Oxlint cannot express;
- Biome or another tool provides clearly better correctness-oriented type-aware
  linting while also satisfying the project's formatter decision;
- TypeScript compiler changes make `tsc --noEmit` and Oxlint type-aware linting
  diverge in a way that creates recurring false positives or false negatives;
- Deno, Bun, or another runtime becomes the primary development runtime through a
  future ADR.
