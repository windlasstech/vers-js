---
title: Scope and Invariants
parent: Architecture Specifications
nav_order: 1
---

# Scope and Invariants

This specification defines the common implementation boundary for `vers-js`
v0.1.0. Every other architecture specification must preserve this boundary unless
a later ADR explicitly changes the v0.1.0 scope.

The ADRs remain the decision records for why this boundary exists. This document
is the implementation contract for what the first release is allowed to expose,
validate, reject, and claim as conformance.

Primary ADR inputs: ADR-0001, ADR-0002, ADR-0004, ADR-0008, ADR-0010,
ADR-0015, ADR-0021, ADR-0033, ADR-0034, ADR-0041, and ADR-0046.

## v0.1.0 goal

`vers-js` v0.1.0 is a runtime-agnostic TypeScript library for canonical VERS
syntax validation, canonicalization, and parsed declaration metadata.

The core library must provide a small data-oriented parser surface that accepts a
single VERS string and returns explicit success or failure results. Successful
results describe syntax metadata and canonical output. Failure results describe
machine-readable syntax, canonicality, diagnostic-cap, or resource-limit errors.

The first release is a conforming parser, not a full VERS semantic engine.

## In scope

The v0.1.0 core includes:

- TypeScript implementation of the reusable parser package;
- runtime-agnostic core library code intended to work from Node.js, Deno, and Bun;
- public functions equivalent to `parseVers()`, `validateVers()`, and
  `canonicalizeVers()`;
- explicit success/failure Result values with machine-readable diagnostics;
- syntax metadata for successful parses;
- strict canonical input validation for all public entry points;
- canonical output projection for already-valid canonical input;
- syntax-only VERS `type` validation;
- single-pass percent-decoding and deterministic canonical reserialization;
- original-input diagnostic spans where spans are reliable;
- bounded diagnostic accumulation and fixed v0.1.0 resource limits;
- official parse/canonical fixture conformance for in-scope upstream cases;
- project-owned diagnostic fixtures for the `vers-js` public failure contract.

## Out of scope

The v0.1.0 core must not implement or expose:

- version comparison;
- range containment;
- equality semantics beyond syntax metadata needed by the parser;
- native ecosystem range translation;
- resolver behavior;
- vulnerability interpretation;
- VEX semantics;
- semantic ordering, simplification, or containment-ready normalization;
- type-specific duplicate-version equality beyond exact decoded-string duplicate
  detection;
- type-specific version comparators;
- built-in known-type registry enforcement;
- registry callbacks, registry objects, known-type allowlists, support-policy
  options, or advisory-validation flags;
- warning, advisory, loose, recovery, repair, coercion, or suggestion modes;
- tolerant canonicalization of malformed or non-canonical input;
- semantic official fixture families as blocking v0.1.0 conformance.

If any future work needs these behaviors, it must start with a new ADR or a
separate release plan that does not redefine the v0.1.0 core contract in place.

## Runtime boundary

Node.js LTS is the development runtime for package scripts, build tooling, tests,
and release automation. That development baseline must not leak into the
published core library.

Core library code must avoid unisolated runtime-specific globals and APIs,
including:

- `process`;
- `Buffer`;
- `Deno`;
- `Bun`;
- Node-only module resolution assumptions;
- runtime-specific filesystem, network, or environment access.

Runtime-specific behavior belongs outside the parser core or behind a future
adapter decision. Compatibility with Node.js, Deno, and Bun must be verified by
package-boundary checks rather than assumed from Node.js development success.

## Public surface boundary

The public API must remain data-oriented and function-based. The core public
entry points are:

- `parseVers(input: string)`;
- `validateVers(input: string)`;
- `canonicalizeVers(input: string)`.

The detailed signatures and Result shapes are defined by `public-api.md`. This
scope specification sets the invariant that normal validation failures are Result
failures, not thrown exceptions, and that public results must not expose parser
internals such as tokens, generated-parser nodes, mutable parser state, or
runtime-specific objects.

The parser implementation may define internal boundaries to keep a future Rust,
WebAssembly, native, or third-party parser replacement possible. Consumers must
depend only on the public package API.

## Strict canonical input boundary

All v0.1.0 public entry points share the same success boundary: the input must be
a valid canonical VERS declaration.

`canonicalizeVers()` is not a repair function. It validates canonical input and
returns the canonical string represented by the parsed syntax metadata. Its
successful result must be equivalent to projecting the canonical string from a
successful `parseVers()` result.

Malformed or non-canonical input must fail with structured diagnostics rather
than repaired output. The parser must not silently:

- trim whitespace;
- change scheme or type casing;
- rewrite separators;
- reorder constraints;
- deduplicate constraints or otherwise repair duplicate input;
- simplify ranges;
- repair malformed percent escapes;
- double-decode version text;
- coerce unsupported input into a best-effort canonical string.

Successful parsing promises decoded syntax metadata and canonical output. It does
not promise to preserve the exact raw input spelling.

## Type validation boundary

The v0.1.0 core validates only VERS `type` syntax and canonical casing.

The parser must validate that the type:

- starts with an ASCII letter;
- contains only ASCII letters, ASCII numbers, period `.`, and dash `-`;
- is not percent-encoded;
- is lowercase in canonical input.

The parser must not reject an otherwise valid canonical VERS string solely
because its type is unknown to a PURL, VERS, package ecosystem, vulnerability
system, or product-specific registry.

Known-type validation is downstream support policy or future advisory behavior.
The v0.1.0 core must not emit `support.unknown_type` from the default syntax
validation path.

## Constraint ordering and semantic validation boundary

The v0.1.0 core preserves parsed constraint input order. It must not require a
type-specific version comparator to parse otherwise valid syntax.

Successful metadata and canonical output preserve constraint order after
structural parsing, percent-decoding, and canonical percent-encoding validation.
The core parser must not sort, deduplicate, simplify, or otherwise make
constraints containment-ready.

The v0.1.0 core default path must not emit reserved semantic diagnostics for
type-specific ordering, equality, or simplification, including:

- `canonical.non_canonical_order`;
- `canonical.invalid_comparator_sequence`;
- semantic uses of duplicate-version checks that depend on type-specific version
  equality.

The v0.1.0 core may still fail exact decoded-string duplicate versions with
`canonical.duplicate_version`. That diagnostic is a syntax-metadata canonicality
check over decoded version strings, not a type-specific semantic equality check,
and it must not reorder, merge, or repair the duplicate constraints.

Any future semantic, advisory, comparison, containment, or native range
translation layer may consume the syntax metadata and apply type-specific rules
without changing the v0.1.0 parse result shape.

## Repair and warning boundary

The v0.1.0 core is strict and error-only.

Public functions must not accept warning, advisory, loose, repair, recovery, or
coercion options. Successful results must not carry warnings. Failure issues use
the error-oriented diagnostic model defined by `diagnostics.md`.

Downstream applications may build UI suggestions from diagnostics, but those
suggestions are not part of the v0.1.0 core result contract.

## Upstream VERS baseline

The v0.1.0 upstream VERS baseline is pinned to `package-url/vers-spec` commit
`cd8a9c98ec1a50918b4d0e1cb4f4a3b3743bf17f`.

The selected upstream file set is:

- `docs/standard/specification.md`;
- `docs/how-to-parse.md`;
- `docs/tests.md`;
- `schemas/vers-test.schema-0.1.json`;
- `schemas/vers-test.schema-0.2.json`;
- `tests/vers_canonical_parse_test.json`.

The blocking official fixture baseline is limited to in-scope parse/canonical
behavior. Local copies or generated fixture files must retain enough metadata to
trace back to the upstream repository, commit, path, and checksum recorded in
ADR-0041.

## Known v0.1.0 divergence points

Official VERS material is broader than the v0.1.0 core. The architecture specs,
fixtures, and tests must make divergence explicit rather than silently ignoring
or accidentally enforcing out-of-scope behavior.

Known divergence points include:

- semantic fixture families for comparison, equality, containment,
  `from_native`, merge, invert, and native range conversion are not blocking
  v0.1.0 conformance;
- `roundtrip` and `build` fixtures may be used only after review confirms a case
  is syntax-only and does not require unsupported semantic behavior;
- the official `vers_canonical_parse_test.json` non-canonical-order failure must
  be classified as `future-semantic` or `known-divergence` for v0.1.0 core;
- upstream `expected_failure_reason` strings are context, not the `vers-js`
  machine-readable issue-code contract;
- project diagnostic fixtures, not official fixture reason text, define public
  issue-code, span, fatality, resource-limit, and truncation expectations.

The exact fixture disposition vocabulary and case table are defined by
`fixtures.md`.

## Cross-spec invariants

Every architecture specification, implementation file, test, fixture, and public
document for v0.1.0 must preserve these invariants:

1. The core package validates canonical VERS syntax and exposes parsed syntax
   metadata only.
2. The public API is small, functional, data-oriented, and Result-centered.
3. Normal malformed or non-canonical input returns structured failure results;
   it is not repaired or treated as success with warnings.
4. Machine-readable issue codes, stable result shapes, and documented metadata
   are the diagnostic contract; human-readable messages are convenience text.
5. Core library code remains runtime-agnostic and avoids Node.js, Deno, or
   Bun-specific globals and APIs.
6. Successful parse metadata must not imply version comparison, containment,
   support-policy validation, or resolver-grade semantics.
7. Constraint order is preserved in v0.1.0 core output; the parser does not
   perform semantic sorting, simplification, or containment-ready normalization.
8. Exact decoded-string duplicate versions are active core canonicality failures,
   but type-specific semantic duplicate equality remains out of scope.
9. Known-type registry membership is not a core syntax validity rule.
10. Official fixture conformance is pinned, provenance-preserving, and limited to
    in-scope parse/canonical behavior.
11. Project diagnostic fixtures define `vers-js` issue-code, span, fatality, and
    metadata expectations without asserting exact human-readable messages.
12. Reserved semantic or support issue codes must not become active v0.1.0 core
    diagnostics through fixture mapping or convenience behavior.
13. v0.1.0 scope may expand only through a new ADR or later-release decision, not
    through implementation convenience.

## Handoff to later specs

Later architecture specifications own the detailed contracts below:

- `public-api.md`: exact function signatures, success values, failure values,
  non-string input behavior, exports, and package surface.
- `data-model-and-canonical-output.md`: successful parse metadata, constraint
  variants, equality spelling, duplicate detection, and canonical string
  projection.
- `character-encoding.md`: type characters, version characters, percent escapes,
  UTF-8 decoding, and canonical percent serialization.
- `parser-phases.md`: scanner/parser phases, fatal boundaries, issue ordering,
  diagnostic accumulation, and cap handling.
- `diagnostics.md`: issue-code unions, spans, messages, metadata, truncation, and
  complete diagnostic tables.
- `fixtures.md`: upstream fixture provenance, disposition, project diagnostic
  fixture shape, and assertion rules.
- `resource-limits.md`: fixed input length and issue-count limits.
- `build-and-test.md`: package scaffolding, package output, and verification
  architecture.
