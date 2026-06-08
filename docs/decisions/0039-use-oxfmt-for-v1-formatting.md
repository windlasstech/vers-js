---
parent: Decisions
nav_order: 39
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use Oxfmt for V1 Formatting

## Context and Problem Statement

ADR-0001 selects TypeScript for the reusable VERS library. ADR-0002 selects
Node.js LTS as the primary development runtime while keeping the published
library portable across Node.js, Deno, and Bun. ADR-0003 selects pnpm for
dependency installation and supply-chain policy. ADR-0036 selects a `tsc`-first
build, ADR-0037 selects Vitest for the primary test suite, and ADR-0038 selects
Oxlint with type-aware linting as the JavaScript and TypeScript linter.

ADR-0038 intentionally keeps formatter selection separate from linting. The
package now needs a concrete formatter for JavaScript and TypeScript source,
tests, configuration, and package metadata. The formatter should keep formatting
deterministic, fast, and low-friction without changing the runtime-agnostic
package boundary or reintroducing a competing lint stack.

Should v1 use Oxfmt, Prettier, Biome Formatter, dprint, Deno fmt, or another
tool for JavaScript and TypeScript formatting?

## Decision Drivers

- Formatting should be deterministic and suitable for both local development and
  CI checks.
- The formatter should work with TypeScript, ESM, Vitest tests, and package
  metadata under the Node.js and pnpm development baseline.
- The formatter should align well with the Oxlint decision without implicitly
  replacing or weakening lint behavior.
- The dependency surface should remain acceptable under pnpm frozen installs and
  dependency cooldown policy.
- The formatter should avoid Deno-first, Bun-first, CommonJS, bundler-specific, or
  framework-specific workflow assumptions.
- The project should be able to revisit formatter choice if Oxfmt compatibility or
  contributor ergonomics prove worse than a more established formatter.

## Considered Options

- Oxfmt
- Prettier
- Biome Formatter
- dprint
- Deno fmt
- ESLint Stylistic
- standard or ts-standard autofix

## Decision Outcome

Chosen option: "Oxfmt", because it provides a fast JavaScript and TypeScript
formatter from the same Oxc toolchain as Oxlint while preserving the separation
between formatting, linting, type-checking, and package building.

The v1 formatting toolchain will use Oxfmt for source and project-file
formatting. Oxfmt is responsible only for formatting; Oxlint remains the linter
from ADR-0038, `tsc` remains the type-checking and package-emission authority
from ADR-0036, and Vitest remains the primary test runner from ADR-0037.

The formatting toolchain should support package scripts equivalent to:

```text
format:       oxfmt
format:check: oxfmt --check
```

Exact script names, target paths, configuration file format, and editor
integration details remain implementation details.

### Consequences

- Good, because Oxfmt aligns the formatter with the same Oxc toolchain family as
  Oxlint.
- Good, because formatting remains a dedicated concern and does not reintroduce an
  ESLint-based style stack.
- Good, because a fast formatter supports frequent local use and CI checks.
- Good, because the formatter remains a development tool and does not change the
  runtime package boundary.
- Neutral, because choosing Oxfmt favors Oxc toolchain consistency over the larger
  Prettier ecosystem.
- Bad, because Oxfmt is newer than Prettier and may have less third-party
  ecosystem support.
- Bad, because Prettier plugins and exact Prettier output compatibility are not
  assumed by this decision.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- `package.json` includes scripts that format and check formatting with Oxfmt;
- formatter configuration, if any, is committed and scoped to formatting only;
- Oxlint remains responsible for linting and type-aware lint rules;
- `tsc --noEmit` and the `tsc` package build remain separate from formatting;
- formatting checks run under the Node.js and pnpm development baseline;
- formatter configuration does not require Deno-first, Bun-first, CommonJS,
  bundler-specific, framework-specific, or runtime-specific package conventions;
- generated package artifacts are not treated as formatter source inputs unless a
  future implementation decision explicitly includes them.

## Pros and Cons of the Options

### Oxfmt

This option uses Oxfmt as the primary formatter for JavaScript, TypeScript, and
supported project files.

- Good, because it aligns naturally with the Oxlint decision from ADR-0038.
- Good, because it keeps formatting fast and separate from linting and
  type-checking.
- Good, because it avoids adding Prettier plus separate compatibility rules when
  the project already selected an Oxc linter.
- Good, because it can format the package's TypeScript and ESM source without
  changing runtime package behavior.
- Bad, because it is newer than Prettier and has a smaller formatter ecosystem.
- Bad, because Prettier plugins cannot be assumed to work with Oxfmt.
- Bad, because contributors may be more familiar with Prettier defaults and editor
  behavior.

### Prettier

This option uses Prettier as the primary formatter.

- Good, because Prettier is the most established formatter in the JavaScript and
  TypeScript ecosystem.
- Good, because editor support, contributor familiarity, and plugin availability
  are broad.
- Good, because it keeps formatting separate from Oxlint, TypeScript, and Vitest.
- Bad, because it adds a separate toolchain family after the project selected
  Oxlint for linting.
- Bad, because its larger plugin ecosystem is not currently needed by a greenfield
  TypeScript parser package.
- Bad, because choosing Prettier prioritizes ecosystem familiarity over Oxc
  toolchain consistency and performance.

### Biome Formatter

This option uses Biome Formatter for source formatting, potentially without using
Biome's linter.

- Good, because Biome is fast and provides a polished integrated developer
  experience.
- Good, because it can format JavaScript and TypeScript without relying on
  Prettier.
- Neutral, because its integrated linting and assist features are useful but not
  needed after selecting Oxlint.
- Bad, because adopting Biome only for formatting captures less of Biome's main
  value proposition.
- Bad, because enabling broader Biome behavior could overlap with or confuse the
  Oxlint linting decision.
- Bad, because it would introduce a second non-Oxc toolchain for a role Oxfmt can
  fill directly.

### dprint

This option uses dprint and its TypeScript/JavaScript formatting plugin.

- Good, because dprint is fast, plugin-based, and useful for multi-language
  formatting.
- Good, because it can keep formatting independent from linting and type-checking.
- Bad, because its plugin model and configuration surface are more than v1 needs.
- Bad, because vers-js is currently a small TypeScript package, not a multi-language
  monorepo that needs dprint's broader plugin model.

### Deno fmt

This option uses Deno's built-in formatter.

- Good, because Deno fmt is integrated, fast, and useful inside Deno workflows.
- Good, because Deno remains a compatibility target for package smoke tests.
- Bad, because ADR-0002 selects Node.js LTS, not Deno, as the primary development
  runtime.
- Bad, because using Deno fmt as the primary formatter would make ordinary
  development depend on a compatibility target runtime.
- Bad, because formatting success under Deno does not validate the npm package
  shape selected by ADR-0011 through ADR-0014.

### ESLint Stylistic

This option uses ESLint Stylistic rules as the source of formatting-like style
fixes.

- Good, because it can express detailed style rules for projects already using
  ESLint.
- Bad, because ADR-0038 selects Oxlint rather than ESLint as the primary linter.
- Bad, because it would reintroduce an ESLint-based style stack for formatting
  after selecting a dedicated Oxc linter.
- Bad, because formatting should be a formatter responsibility, not a collection
  of lint autofixes.

### standard or ts-standard autofix

This option relies on standard or ts-standard autofix behavior for style and
formatting.

- Good, because it offers a low-configuration style convention.
- Bad, because it is a lint-first convention rather than a dedicated formatter.
- Bad, because it would reintroduce an ESLint-based stack after the Oxlint
  decision.
- Bad, because a fixed opinionated lint preset does not provide a better formatter
  baseline than Oxfmt for this package.

## More Information

This decision defines the primary v1 JavaScript and TypeScript formatter. It does
not change the TypeScript implementation decision from ADR-0001, the Node.js LTS
development baseline from ADR-0002, the pnpm package-manager baseline from
ADR-0003, the ESM-only package shape from ADR-0011, the universal runtime entry
from ADR-0014, the `tsc`-first build decision from ADR-0036, the Vitest test
runner decision from ADR-0037, or the Oxlint linter decision from ADR-0038.

External references:

- Oxfmt overview:
  <https://oxc.rs/docs/guide/usage/formatter.html>
- Oxfmt Prettier migration:
  <https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier.html>
- Oxfmt unsupported features:
  <https://oxc.rs/docs/guide/usage/formatter/unsupported-features.html>
- Prettier options:
  <https://prettier.io/docs/en/options.html>
- Prettier rationale:
  <https://prettier.io/docs/en/why-prettier.html>
- Biome Formatter:
  <https://biomejs.dev/formatter/>
- dprint TypeScript/JavaScript plugin:
  <https://dprint.dev/plugins/typescript/>
- Deno fmt:
  <https://docs.deno.com/runtime/reference/cli/fmt/>
- ESLint Stylistic migration:
  <https://eslint.style/guide/migration>
- standard:
  <https://standardjs.com/>
- ts-standard:
  <https://github.com/standard/ts-standard>

This decision should be revisited if one of the following becomes true:

- Oxfmt cannot format required JavaScript, TypeScript, package metadata, or
  configuration files reliably;
- Oxfmt's output or editor support creates recurring contributor friction;
- Oxfmt's dependency surface conflicts with project dependency-security policy;
- the package needs a Prettier plugin or exact Prettier compatibility that Oxfmt
  cannot provide;
- Biome, Prettier, dprint, or another formatter provides materially better
  correctness, stability, editor support, or CI ergonomics for this package;
- Deno, Bun, or another runtime becomes the primary development runtime through a
  future ADR.
