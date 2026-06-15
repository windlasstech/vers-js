---
title: Property-Based Testing
parent: Architecture Specifications
nav_order: 10
---

# Property-Based Testing

This specification defines how property-based testing (PBT) is layered into the
`vers-js` v0.1.0 test architecture as defense-in-depth coverage. It turns ADR-0052
into an implementation contract for tests, generators, and CI behavior.

Primary ADR inputs: ADR-0037, ADR-0040, ADR-0050, ADR-0052.

## Scope

Property-based tests add defense-in-depth checks for structural invariants of the
public API by generating many inputs and asserting that the invariants hold for every
generated case. They complement, and do not replace, hand-written unit tests,
official conformance fixtures, and project diagnostic fixtures.

PBT is part of the normal development test suite. Coverage-guided fuzzing with tools
such as Jazzer.js is out of scope for this specification; if added later, it must live
in a separate Node-only fuzz job and must not be required by the runtime-agnostic test
suite.

## Tooling

The project uses `fast-check` as the property-based testing library. The optional
`@fast-check/vitest` adapter may be used to write properties with native Vitest
`test.prop` and `it.prop` styles, provided the adapter's Node version requirement is
compatible with the development baseline.

All PBT dependencies are devDependencies. They must not appear in the published
package's runtime dependencies.

## Test file layout

Property-based tests are stored alongside other tests:

```text
tests/property-based.test.ts
```

Additional PBT files may be added when the generator surface grows, using the prefix
`property-` or a clear subdirectory such as `tests/property/`.

## Public API surface

Property-based tests must call only the public API exported from `"vers-js"`:

- `parseVers(input)`;
- `validateVers(input)`;
- `canonicalizeVers(input)`.

Tests must not import parser internals, scanner state, issue-code registries, fixture
helpers, or runtime-specific modules.

## Property contract

Each property must:

1. Use a generator that produces a well-defined input domain.
2. Assert only stable machine-readable outcomes: `ok`, `value`, `issues[*].code`,
   `issues.length`, `metadata`, and public data-model fields.
3. Avoid asserting exact human-readable `message` strings.
4. Preserve the Result-shape contract and runtime input behavior from `public-api.md`.

Generators may start with broad string domains and gradually become grammar-aware.
Properties that accept a broad domain should filter or early-return on expected failure
branches rather than silently skip large fractions of generated inputs.

## Core properties

The initial property-based test suite must cover at least the following invariants.
These properties supplement, not replace, example- and fixture-based expectations.

### Parse/validate consistency

For every generated string input, `parseVers(input).ok` equals `validateVers(input).ok`.

### Canonicalization idempotence

For every generated string input where `canonicalizeVers(input)` succeeds, running
`canonicalizeVers` again on the resulting canonical string returns the same canonical
string.

### Canonical projection

For every generated string input where `parseVers(input)` succeeds,
`canonicalizeVers(input)` succeeds and its `value` equals
`parseVers(input).value.canonical`.

### Resource boundary

For every generated string input longer than 1024 UTF-16 code units, parsing fails with
`resource.input_too_long` before ordinary syntax diagnostics are emitted.

### Diagnostic cap

For every generated string input, a failed parse returns at most 16 issues. When the
issue cap is exceeded, `metadata.diagnostics` is present and contains exactly
`{ truncated: true, maxIssues: 16 }`.

### Constraint order preservation

For every generated valid constraint list joined by `|`, the parsed `constraints`
array preserves the original order. The canonical output must not reorder, sort, or
deduplicate constraints.

## Generators

Generators may be composed from fast-check primitives. The initial suite can use broad
string generators; later iterations should add grammar-aware generators that produce a
higher ratio of valid VERS declarations.

A grammar-aware generator for VERS declarations produces values matching:

```text
vers:<type>/<constraint>(|<constraint>)*
```

where:

- `<type>` is a valid VERS type token;
- each `<constraint>` is `*`, a bare version, or a comparator followed by a version;
- versions consist of allowed raw version characters defined by `character-encoding.md`;
- percent escapes are valid `%XX` sequences.

Generators must remain dev-only test code. They must not be exported from the package
root or shipped as runtime code.

## Determinism and reproducibility

Properties must be deterministic by default. Each property run must use a fixed seed
or record the seed and shrinking path so that CI failures can be replayed locally.

When a property fails:

1. The test output must report the seed, path, and counterexample.
2. The minimal counterexample should be added to the project diagnostic fixtures or to
   a regression test file.
3. The underlying bug must be fixed before the counterexample is accepted as a fixture.

## CI behavior

Property-based tests run as part of the normal Vitest suite via `pnpm run test`. The
default run count must keep CI execution time reasonable. Larger exploratory runs may
be exposed through a separate script such as `test:pbt` or run locally.

If a property-based test becomes flaky because of a non-deterministic generator or an
unfixed seed, the test must be fixed rather than disabled or deleted.

## Invariants

1. PBT dependencies are devDependencies only.
2. PBT tests use only the public API from `"vers-js"`.
3. PBT tests do not assert exact diagnostic `message` strings.
4. PBT tests preserve runtime-agnostic source boundaries.
5. Coverage-guided fuzzers, if added later, are isolated from the Vitest suite.
6. Failed property runs produce a reproducible seed/path and a regression fixture.
