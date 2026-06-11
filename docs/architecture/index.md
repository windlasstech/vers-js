---
title: Architecture Specifications
nav_order: 2
has_children: true
---

# Architecture Specifications

This directory contains the implementation specifications for `vers-js` v0.1.0.
These documents translate the accepted ADRs in `docs/decisions/` into concrete
contracts that an implementation and fixture suite can follow.

The intended development flow is:

1. use ADRs to understand why the architecture was chosen;
2. use these architecture specifications to define exact observable behavior;
3. implement the library and tests against the architecture specifications.

This index is also a handoff document. If work continues in a new session, start
here before drafting or editing the individual specification documents.

## Scope for v0.1.0

The v0.1.0 implementation scope is a runtime-agnostic TypeScript library for
canonical VERS syntax validation, canonicalization, and parsed declaration
metadata.

In scope:

- a small public API: `parseVers()`, `validateVers()`, and `canonicalizeVers()`;
- structured success/failure Result values with machine-readable diagnostics;
- a syntax metadata data model for successful parses;
- strict canonical parsing without repair or warning modes;
- syntax-only type validation with no built-in known-type registry;
- single-pass percent-decoding and deterministic canonical reserialization;
- bounded diagnostics, original-input spans, and fixed v0.1.0 resource limits;
- official parse/canonical conformance fixtures plus project diagnostic fixtures.

Out of scope for v0.1.0:

- version comparison;
- range containment;
- native range translation;
- semantic ordering or simplification;
- vulnerability interpretation or VEX semantics;
- built-in known-type registry enforcement;
- advisory, warning, tolerant repair, or suggestion APIs;
- semantic official fixture families except where a specific fixture is explicitly
  classified as syntax-only and in scope.

## Specification writing order

Write the architecture specifications in this order:

1. `scope-and-invariants.md`
2. `public-api.md`
3. `data-model-and-canonical-output.md`
4. `character-encoding.md`
5. `parser-phases.md`
6. `diagnostics.md`
7. `fixtures.md`
8. `resource-limits.md`
9. `build-and-test.md`

After those are drafted, add top-level docs navigation such as `docs/index.md` if
the repository needs a docs hub.

## Planned specification documents

### `scope-and-invariants.md`

Defines the common v0.1.0 implementation boundary that every other architecture
specification must preserve.

Include:

- v0.1.0 goals and non-goals;
- runtime-agnostic core constraints;
- relationship between ADRs and architecture specs;
- canonical syntax validation plus parsed metadata as the only core behavior;
- explicit exclusion of comparison, containment, native translation, registries,
  repair, warnings, and vulnerability semantics;
- upstream VERS baseline and known v0.1.0 divergence points;
- invariants that implementation, tests, and docs must not violate.

Primary ADR inputs: ADR-0001, ADR-0002, ADR-0004, ADR-0008, ADR-0010,
ADR-0015, ADR-0021, ADR-0033, ADR-0034, ADR-0041, ADR-0046.

### `public-api.md`

Defines the public TypeScript package surface and exact Result shapes.

Include:

- exact signatures for `parseVers(input: string)`, `validateVers(input: string)`,
  and `canonicalizeVers(input: string)`;
- `VersParseResult`, `VersValidationResult`, and `VersCanonicalizeResult`;
- the successful value for `validateVers()`;
- the successful value for `canonicalizeVers()`;
- failure result shape and presence-based metadata;
- non-string runtime input behavior with `TypeError`;
- exported public types and reserved/non-exported internals;
- named export, no-default-export, root-only export, and ESM-only expectations.

Primary ADR inputs: ADR-0004, ADR-0005, ADR-0011, ADR-0012, ADR-0013,
ADR-0014, ADR-0031, ADR-0032, ADR-0044, ADR-0050.

### `data-model-and-canonical-output.md`

Defines successful parse metadata and canonical string projection.

Include:

- `VersRange` fields and meanings;
- `VersConstraint` variants;
- how bare versions map to equality constraints;
- canonical spelling for implicit equality versus explicit `=`;
- input-order preservation for constraints;
- decoded-string duplicate detection;
- canonical output construction from decoded metadata;
- rules for not preserving raw input spelling;
- examples of valid metadata and canonical output.

Primary ADR inputs: ADR-0005, ADR-0010, ADR-0021, ADR-0022.

### `character-encoding.md`

Defines type characters, version characters, percent escapes, UTF-8 decoding, and
canonical percent serialization.

Include:

- type syntax and lowercase canonical form;
- version raw character policy;
- RFC 3986 unreserved raw allowlist for canonical output;
- exact behavior for raw non-unreserved version characters in input;
- percent escape syntax validation;
- lowercase and uppercase percent hex acceptance;
- uppercase hex canonical output;
- UTF-8 byte decoding and invalid UTF-8 rejection;
- span policy for invalid percent syntax and invalid UTF-8;
- single-pass percent-decoding and literal `%` behavior;
- examples such as `%25`, `%252F`, lowercase percent hex, and invalid UTF-8.

Primary ADR inputs: ADR-0015, ADR-0017, ADR-0018, ADR-0019, ADR-0020,
ADR-0023, ADR-0024, ADR-0025, ADR-0026, ADR-0042.

### `parser-phases.md`

Defines the handwritten scanner/parser execution contract.

Include:

- ordered phase sequence;
- phase inputs and outputs;
- whole-input fatal boundaries;
- per-constraint fatal boundaries;
- when later phases must stop;
- safe diagnostic accumulation rules;
- issue ordering rules;
- behavior when `MAX_ISSUES` is reached;
- parser state that may exist internally but must not leak through the public API;
- representative multi-issue and fatal-boundary examples.

Primary ADR inputs: ADR-0006, ADR-0016, ADR-0028, ADR-0035, ADR-0045.

### `diagnostics.md`

Defines the complete public diagnostic contract.

Include:

- `VersIssue`, `VersSpan`, and failure metadata shapes;
- active v0.1.0 core issue-code unions;
- reserved issue-code unions;
- issue-code table with code, phase, condition, span policy, fatality, and
  example input;
- distinction between source diagnostics and result metadata;
- message stability rules: issue messages are human-readable convenience text, not
  the machine contract;
- diagnostic truncation behavior and metadata;
- handling of issues without spans.

Primary ADR inputs: ADR-0006, ADR-0007, ADR-0023, ADR-0024, ADR-0025,
ADR-0026, ADR-0027, ADR-0028, ADR-0029, ADR-0042, ADR-0043, ADR-0044,
ADR-0045.

### `fixtures.md`

Defines official conformance fixture handling and project diagnostic fixture
contracts.

Include:

- pinned upstream VERS snapshot identity;
- official fixture source files and checksum expectations;
- official fixture disposition vocabulary: `blocking-core`, `known-divergence`,
  and `future-semantic`;
- disposition table for `vers_canonical_parse_test.json` cases;
- rule that upstream `expected_failure_reason` strings are not issue-code
  contracts;
- project diagnostic fixture JSON shape;
- issue, span, fatality, and metadata assertion rules;
- no exact assertion of human-readable messages;
- resource limit and diagnostic truncation fixture coverage;
- which semantic fixture families are deferred.

Primary ADR inputs: ADR-0008, ADR-0009, ADR-0037, ADR-0041, ADR-0044,
ADR-0045, ADR-0046.

### `resource-limits.md`

Defines the fixed resource boundary for v0.1.0 public operations.

Include:

- `MAX_INPUT_LENGTH = 1024` measured in UTF-16 code units;
- `MAX_ISSUES = 16` ordinary diagnostics;
- when oversized input is checked;
- `resource.input_too_long` behavior;
- difference between non-string input and oversized string input;
- diagnostic cap exhaustion behavior;
- presence-based truncation metadata;
- no public resource options in v0.1.0;
- boundary examples at 1024, 1025, 16 issues, and truncated diagnostics.

Primary ADR inputs: ADR-0027, ADR-0028, ADR-0029, ADR-0030, ADR-0032,
ADR-0043, ADR-0044, ADR-0045.

### `build-and-test.md`

Defines repository scaffolding, package output, and verification architecture.

Include:

- pnpm package manager expectations;
- Node 22 LTS development baseline;
- TypeScript compiler-first build without bundling;
- ESM-only package output;
- root-only package exports and root type declarations;
- named-export-only behavior;
- Vitest test layers: unit, parser, official fixture, project diagnostic fixture,
  resource boundary, and package boundary tests;
- oxlint and oxfmt roles;
- Node, Deno, and Bun compatibility checks;
- runtime-agnostic implementation constraints.

Primary ADR inputs: ADR-0002, ADR-0003, ADR-0011, ADR-0012, ADR-0013,
ADR-0014, ADR-0036, ADR-0037, ADR-0038, ADR-0039, ADR-0040, ADR-0050.

## Optional top-level docs

### `docs/index.md`

Use this as a top-level documentation landing page if the repository needs a docs
hub before source implementation exists.

Include:

- link to `docs/decisions/`;
- link to `docs/architecture/`;
- short explanation of the SDD workflow: ADRs first, architecture specs second,
  implementation third.
