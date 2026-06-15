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

The project uses `fast-check` as the property-based testing library and
`@fast-check/vitest` as the Vitest adapter. Properties are written with
`test.prop` from `@fast-check/vitest` and standard `expect` from `vitest`.

All PBT dependencies are devDependencies. They must not appear in the published
package's runtime dependencies.

## Configuration and modes

Global fast-check configuration lives in `tests/setup/fast-check.ts` and is
registered as a Vitest `setupFiles` entry. The setup supports three modes:

| Mode   | Trigger                                         | Behavior                                                                                                        |
| ------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Normal | default `pnpm run test` and `pnpm run test:pbt` | Bounded run (`numRuns: 100`) reproducible on failure via reported seed/path.                                    |
| CI     | `CI=true`                                       | Bounded run with an interrupt time limit that fails if reached, reproducible on failure via reported seed/path. |
| Fuzz   | `VERS_PBT_MODE=fuzz`                            | Per-property exploratory run until `interruptAfterTimeLimit` is reached.                                        |

Fuzz-mode interruption is a successful stop condition after at least one
generated case has passed. It must still fail on real property failures and report
the seed, path, and counterexample.

The fuzz budget is applied per property, not to the whole Vitest process. With the
current 10-second `interruptAfterTimeLimit`, a complete `test:fuzz` run is expected
to take roughly `property count × 10 seconds`, plus Vitest startup and import
overhead. Vitest's `--testTimeout=30000` is the timeout for each individual property
test case; it is not a suite-level timeout.

Reproducibility is controlled with `VERS_PBT_SEED=<integer seed>`. Invalid seed
values must fail during test setup instead of silently producing an unreplayable
run. When a property fails, fast-check reports the seed, path, and counterexample;
the minimized input should be added to the project diagnostic fixtures or a
regression test.

## Scripts

The following package scripts are provided:

| Script      | Command                                                                          | Purpose                                                |
| ----------- | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `test:pbt`  | `vitest run tests/property-based.test.ts`                                        | Run bounded property-based tests.                      |
| `test:fuzz` | `VERS_PBT_MODE=fuzz vitest run tests/property-based.test.ts --testTimeout=30000` | Run per-property, time-budgeted fuzz-style properties. |

Property-based tests also run as part of the normal `pnpm run test` suite.

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

Generated inputs exactly 1024 UTF-16 code units long remain inside the accepted
resource boundary and must proceed to ordinary syntax/canonical validation.

### Diagnostic cap

For every generated string input, a failed parse returns at most 16 issues. When the
issue cap is exceeded, `metadata.diagnostics` is present and contains exactly
`{ truncated: true, maxIssues: 16 }`.

### Constraint order preservation

For every generated valid constraint list joined by `|`, the parsed `constraints`
array preserves the original order. The canonical output must not reorder, sort, or
deduplicate constraints.

### Character encoding edges

Property-based tests include focused generators for percent-encoding edges:

- lowercase percent hex is accepted and reserialized as uppercase hex;
- invalid percent escapes fail with `constraint.invalid_percent_encoding`;
- invalid UTF-8 byte sequences fail with `constraint.invalid_utf8`;
- successful percent-encoded inputs remain stable after canonicalization.

## Generators

Generators may be composed from fast-check primitives. The suite uses both broad
Unicode string generators for public API robustness and grammar-aware generators that
produce a higher ratio of valid VERS declarations.

A grammar-aware generator for VERS declarations produces values matching:

```text
vers:<type>/<constraint>(|<constraint>)*
```

where:

- `<type>` is a valid VERS type token;
- each `<constraint>` is `*`, a bare version, or a comparator followed by a version;
- versions consist of allowed raw version characters defined by `character-encoding.md`;
- percent escapes are valid `%XX` sequences.

Generators used for successful-parse properties must avoid decoded duplicate versions,
because duplicate detection is part of canonical validation and correctly turns those
inputs into failures.

Generators must remain dev-only test code. They must not be exported from the package
root or shipped as runtime code.

## Determinism and reproducibility

Properties must be reproducible on failure. Each failing property run must report the
seed and shrinking path so that CI failures can be replayed locally. Maintainers may
also set `VERS_PBT_SEED=<seed>` to force a specific replay.

When a property fails:

1. The test output must report the seed, path, and counterexample.
2. The minimal counterexample should be added to the project diagnostic fixtures or to
   a regression test file.
3. The underlying bug must be fixed before the counterexample is accepted as a fixture.

## CI behavior

Property-based tests run as part of the normal Vitest suite via `pnpm run test`. The
default run count keeps CI execution time reasonable. Larger exploratory runs are
exposed through the dedicated `pnpm run test:pbt` and `pnpm run test:fuzz` scripts.

`test:fuzz` is not required in PR gates. It is intended for manual or scheduled
exploration with a strict per-property time budget, so total runtime scales with the
number of properties in `tests/property-based.test.ts`. If a longer campaign is
needed, properties should be split across separate processes so that one infinite
fuzz loop does not starve the rest of the suite.

If a property-based test becomes flaky because of a non-deterministic generator or an
unfixed seed, the test must be fixed rather than disabled or deleted.

## Invariants

1. PBT dependencies are devDependencies only.
2. PBT tests use only the public API from `"vers-js"`.
3. PBT tests do not assert exact diagnostic `message` strings.
4. PBT tests preserve runtime-agnostic source boundaries.
5. Coverage-guided fuzzers, if added later, are isolated from the Vitest suite.
6. Failed property runs produce a reproducible seed/path and a regression fixture.
