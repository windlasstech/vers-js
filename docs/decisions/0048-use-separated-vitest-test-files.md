---
parent: Decisions
nav_order: 48
status: accepted
date: 12026-06-11
decision-makers: Yunseo Kim
---

# Use Separated Vitest Test Files

## Context and Problem Statement

ADR-0037 selects Vitest as the v1 primary test runner for unit, fixture, parser,
diagnostic, resource, and package-boundary tests. Vitest supports both conventional
separated test files and in-source tests guarded by `import.meta.vitest`.

The package build and runtime constraints make test placement an architectural
concern rather than only a style preference. ADR-0036 selects a `tsc`-first build
without bundling, ADR-0011 through ADR-0014 define an ESM-only, root-only, universal
package entry, and the build-and-test architecture requires core source to remain
runtime-agnostic while allowing test files and build scripts to use Node.js APIs
outside the published runtime core.

Should vers-js write Vitest tests in separated test files or embed in-source tests
inside implementation source files?

## Decision Drivers

- Tests should exercise the public package surface by default, especially
  `parseVers()`, `validateVers()`, `canonicalizeVers()`, package-boundary behavior,
  and fixture-driven parser behavior.
- Test-only code should remain clearly outside the published runtime core.
- The source build should remain `tsc`-first and should not rely on bundler
  dead-code elimination to remove test blocks.
- Core source should not need Vitest-specific globals, `import.meta.vitest` guards,
  test-only imports, or test-only type references.
- Fixture, diagnostic, resource-boundary, and package-boundary tests should be easy
  to organize independently from implementation file layout.
- Internal helper tests should remain possible when a helper has a meaningful
  internal contract, but they should not pressure the public package boundary to
  expose parser internals.

## Considered Options

- Separated Vitest test files
- In-source Vitest tests
- Mixed policy with in-source helper tests allowed case-by-case

## Decision Outcome

Chosen option: "Separated Vitest test files", because it keeps test-only code
outside the runtime source files, fits the `tsc`-first no-bundler package build,
and matches the project's public-surface and fixture-oriented test architecture.

The v1 test suite will use separated Vitest test files for parser success tests,
official fixture tests, project diagnostic fixtures, resource-boundary tests,
package-boundary tests, and meaningful internal helper unit tests. Exact directory
names and filename patterns remain implementation details, but test files should be
clearly identifiable as test files, such as files ending in `.test.ts` or
`.spec.ts` under a dedicated test directory or colocated test tree.

In-source Vitest tests using `if (import.meta.vitest)` are not part of the v0.1.0
core source policy. They should not be added to published runtime source files
unless a later ADR revisits this decision and defines build, type-checking, and
publication safeguards for removing or excluding test-only blocks.

### Consequences

- Good, because runtime source files stay focused on package behavior rather than
  test scaffolding.
- Good, because the package does not need bundler `define` configuration or
  dead-code elimination to keep in-source test blocks out of emitted JavaScript.
- Good, because Node.js-only test utilities, fixture loaders, and package-boundary
  checks remain clearly outside the runtime-agnostic core.
- Good, because fixture and diagnostic tests can be organized by behavior, issue
  code, and provenance rather than by implementation file layout.
- Good, because public API tests remain the default and parser internals are less
  likely to leak into the public package surface for test convenience.
- Neutral, because small helper tests may need intentional test-only access through
  file structure or internal test seams rather than direct in-source assertions.
- Bad, because isolated private helper logic can be slightly less convenient to
  test than with in-source tests.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- Vitest tests are authored in separated test files rather than inside published
  runtime source files;
- source files under the runtime implementation do not contain `import.meta.vitest`
  test blocks;
- package scripts run Vitest against the separated test files;
- public API, fixture, diagnostic, resource-boundary, and package-boundary tests
  are organized outside runtime source files;
- any internal helper unit tests are explicitly scoped to helper behavior with a
  meaningful internal contract;
- the package build emits no test-only runtime code and does not rely on bundler
  dead-code elimination to remove test blocks.

## Pros and Cons of the Options

### Separated Vitest test files

This option writes tests in files separate from implementation source files.

- Good, because it is the conventional layout for public API, fixture, diagnostic,
  and package-boundary tests.
- Good, because test files can use Node.js APIs and test-only utilities without
  weakening runtime source constraints.
- Good, because it works naturally with a `tsc`-only package build and does not
  require bundler-specific removal of test code.
- Good, because contributors can discover test behavior through test directories,
  filename patterns, and Vitest filtering.
- Bad, because very small file-local helpers may need refactoring or explicit
  test seams before they can be tested directly.

### In-source Vitest tests

This option embeds tests in implementation source files under
`if (import.meta.vitest)` guards and configures Vitest to include source files as
test inputs.

- Good, because tests can sit next to tiny helpers or prototypes.
- Good, because file-local implementation details can be asserted without exporting
  them only for tests.
- Bad, because implementation source would contain Vitest-specific code and
  test-only type references.
- Bad, because production builds normally need bundler configuration and dead-code
  elimination to remove in-source tests, while vers-js intentionally uses `tsc`
  without bundling for package output.
- Bad, because in-source tests make it easier for Node.js-only test assumptions to
  drift into runtime source files.
- Bad, because fixture, resource-boundary, package-boundary, and cross-runtime
  smoke tests do not fit naturally inside individual implementation files.

### Mixed policy with in-source helper tests allowed case-by-case

This option uses separated tests by default but allows in-source tests for selected
small helpers.

- Good, because it keeps the convenience of in-source assertions for tightly scoped
  helper logic.
- Good, because most public and fixture tests would still remain separated.
- Bad, because the exception would require build and review rules for deciding when
  in-source tests are safe.
- Bad, because a mixed policy can blur the runtime/test boundary and create
  inconsistent contributor expectations before the first release.

## More Information

This decision refines the test file layout details left open by ADR-0037. It
depends on the ESM-only and root-only package shape from ADR-0011 through ADR-0014,
the `tsc`-first no-bundler build decision from ADR-0036, the Vitest test-runner
decision from ADR-0037, and the build-and-test architecture's runtime-agnostic core
checks.

This decision should be revisited if vers-js adopts a bundler for package output,
if Vitest in-source tests gain a `tsc`-only removal strategy that fits the package
build, or if a future implementation shows that separated helper tests create
unacceptable complexity without exposing internals.

External references:

- Vitest writing tests: <https://vitest.dev/guide/#writing-tests>
- Vitest in-source testing: <https://vitest.dev/guide/in-source.html>
