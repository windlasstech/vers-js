---
parent: Decisions
nav_order: 52
status: accepted
date: 12026-06-16
decision-makers: Yunseo Kim
---

# Use fast-check for Property-Based Testing

## Context and Problem Statement

ADR-0037 selects Vitest as the v1 test runner, and ADR-0040 fixes Node.js 22 LTS as the
development baseline. ADR-0011 and ADR-0012 require the published package to remain
ESM-only and root-only. The public API is fixed at three functions that accept a single
string (`ADR-0031`, `ADR-0032`, `ADR-0050`).

`vers-js` has structural invariants that are covered by hand-written examples and
fixtures, but that also benefit from defense-in-depth checks across a broader
generated input space: canonicalization idempotence, parse/validate consistency,
input-length and diagnostic-count bounds, percent-encoding behavior, and constraint
order preservation. Property-based testing adds a complementary way to exercise these
invariants and generate counterexamples automatically.

Which fuzzer or property-based testing tool should the project use for defense-in-depth
invariant checks alongside the existing example- and fixture-based test suite?

## Decision Drivers

- The chosen tool must not compromise the runtime-agnostic design of the published
  library.
- It must integrate naturally with the existing Vitest and TypeScript/ESM development
  workflow.
- It must support deterministic failure reproduction and input shrinking so that
  counterexamples are actionable.
- It should avoid native Node.js addons that would make Deno/Bun development or CI
  portability harder.
- It should be actively maintained and licensed compatibly with the Apache-2.0 project.
- It should complement, not replace, hand-written examples, conformance fixtures, and
  diagnostic fixtures.
- Coverage-guided fuzzing is desirable as a separate capability, but it is secondary
  to in-process property-based testing that runs in the normal unit-test suite.

## Considered Options

- fast-check (with optional @fast-check/vitest adapter)
- Jazzer.js
- jsverify
- testcheck-js
- jsfuzz
- Fuzzilli

## Decision Outcome

Chosen option: "fast-check (with optional @fast-check/vitest adapter)", because it is a
pure JavaScript/TypeScript property-based testing library that can add
defense-in-depth invariant checks to the existing Vitest suite, supports shrinking and
seed-based replay, and does not introduce runtime-specific or native dependencies into
the library's test surface.

Jazzer.js is the strongest coverage-guided alternative, but it is Node-only and
libFuzzer-based. It may be introduced later as a separate Node-only fuzz job; it must
not become part of the runtime-agnostic unit-test suite.

jsverify, testcheck-js, and jsfuzz are rejected because they are stale, archived, or
CJS-oriented. Fuzzilli is rejected because it targets JavaScript engines rather than
library APIs.

### Consequences

- Good, because `fast-check` complements example- and fixture-based coverage with
  executable public API invariant checks.
- Good, because generated counterexamples are shrunk to a minimal failing input and can
  be replayed from a recorded seed and path.
- Good, because the tool is pure JS/TS and introduces no native addon or runtime
  coupling.
- Good, because `@fast-check/vitest` lets properties use native Vitest `test.prop` and
  `it.prop` styles when the project's Node baseline supports the adapter version.
- Neutral, because coverage-guided fuzzing is not provided by `fast-check`; projects
  that need coverage feedback must add a separate tool such as Jazzer.js.
- Neutral, because Deno and Bun are not explicitly documented as supported by
  `fast-check`, but the dependency is dev-only and the library remains runtime-agnostic.
- Bad, because property-based tests can be non-deterministic and may increase CI
  execution time unless run counts and seeds are managed.
- Bad, because poorly written generators can produce mostly invalid inputs, wasting
  test cycles.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- property-based tests live under `tests/` and use only the public API from
  `"@windlass/vers-js"`;
- tests do not assert exact human-readable diagnostic `message` strings;
- failure reproduction uses a committed or logged seed and path;
- generators are grammar-aware enough to produce a useful ratio of valid VERS inputs;
- any coverage-guided fuzzer is isolated in a separate directory and CI job, not mixed
  into the Vitest suite;
- the published package still has no runtime dependency and no runtime-specific source
  coupling.

## Pros and Cons of the Options

### fast-check

A widely used JavaScript/TypeScript property-based testing framework.

- Good, because it is pure JS/TS with no native dependencies.
- Good, because it supports combinators for strings, arrays, and custom objects.
- Good, because it provides built-in shrinking and seed/path replay.
- Good, because it can be called directly inside Vitest `it()` blocks.
- Neutral, because Deno/Bun compatibility is not explicitly documented, but the
  dependency is dev-only.
- Bad, because it is not a coverage-guided fuzzer.

### @fast-check/vitest

The official fast-check adapter for Vitest.

- Good, because it exposes `test.prop` and `it.prop` that feel native to Vitest.
- Good, because it supports one-time random mode for exploratory runs.
- Neutral, because the latest adapter version may require a Node version equal to or
  newer than the project baseline; the adapter version must be checked before addition.
- Bad, because one-time random mode does not shrink.

### Jazzer.js

A coverage-guided in-process fuzzer built on libFuzzer.

- Good, because it can discover crashes outside the examples and properties covered by
  the normal Vitest suite.
- Good, because it supports TypeScript and ESM fuzz targets on recent Node.js.
- Bad, because it is Node-only and uses native libFuzzer bindings.
- Bad, because it does not integrate with Vitest.
- Bad, because it cannot run under Deno or Bun and therefore must be isolated from the
  runtime-agnostic test suite.

### jsverify

A legacy property-based testing library for JavaScript.

- Good, because it was historically influential and supports shrinking.
- Bad, because it is CJS-oriented and largely unmaintained.
- Bad, because its TypeScript integration and modern toolchain fit are inferior to
  fast-check.

### testcheck-js

A generative testing library derived from Clojure's test.check.

- Good, because it introduced many JavaScript developers to generative testing.
- Bad, because it is mostly inactive and has weaker documentation than fast-check.
- Bad, because it is not designed for modern ESM/Vitest projects.

### jsfuzz

A coverage-guided JavaScript fuzzer that uses Istanbul instrumentation.

- Good, because it is a lightweight coverage-guided option.
- Bad, because its repository is archived.
- Bad, because Jazzer.js provides stronger coverage-guided fuzzing with active
  maintenance.

### Fuzzilli

A JavaScript engine fuzzer from Google Project Zero.

- Good, because it is a powerful engine fuzzer with active maintenance.
- Bad, because it targets JavaScript engines, not library APIs.
- Bad, because it cannot be used to test `parseVers`/`validateVers`/`canonicalizeVers`
  directly.

## More Information

Related architecture specification: `docs/architecture/property-based-testing.md`.

Tool references:

- fast-check: <https://github.com/dubzzz/fast-check/tree/main/packages/fast-check>
- @fast-check/vitest: <https://github.com/dubzzz/fast-check/tree/main/packages/vitest>
- Jazzer.js: <https://github.com/CodeIntelligenceTesting/jazzer.js>
