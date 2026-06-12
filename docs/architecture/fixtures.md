---
title: Fixtures
parent: Architecture Specifications
nav_order: 7
---

# Fixtures

This specification defines the fixture contract for `vers-js` v0.1.0: pinned
official conformance sources, official fixture disposition, project diagnostic
fixture shape, assertion rules, and required coverage before implementation can
begin.

Primary ADR inputs: ADR-0008, ADR-0009, ADR-0021, ADR-0037, ADR-0041,
ADR-0042, ADR-0044, ADR-0045, and ADR-0046.

## Fixture layers

`vers-js` v0.1.0 uses two fixture layers with separate responsibilities:

1. **Official conformance fixtures** preserve upstream VERS provenance and verify
   in-scope parser conformance against the pinned upstream snapshot.
2. **Project diagnostic fixtures** define the `vers-js` public failure contract:
   issue codes, severity, optional spans, test-only fatality or phase-boundary
   expectations, issue ordering, resource failures, and diagnostic truncation
   metadata.

The two layers must remain semantically distinct. Official upstream files must not
be edited to add `vers-js` issue codes or spans. Project diagnostic fixtures may
reuse an official input string, but the project fixture owns the local diagnostic
expectations for that input.

## Pinned upstream source

The v0.1.0 official baseline is the snapshot selected by ADR-0041:

| Field                   | Value                                                |
| ----------------------- | ---------------------------------------------------- |
| Upstream repository     | `https://github.com/package-url/vers-spec`           |
| Upstream commit         | `cd8a9c98ec1a50918b4d0e1cb4f4a3b3743bf17f`           |
| Upstream commit date    | `12026-05-19`                                        |
| Upstream commit subject | `fix: typo in npm_range_containment_test.json (#70)` |
| Adopted for             | `vers-js` v0.1.0                                     |
| Adopted on              | `12026-06-08`                                        |

Any copied, generated, or cached official fixture artifact must record enough
metadata to trace back to this snapshot.

## Selected upstream files

The selected upstream source set and checksums are:

| Upstream path                          | SHA-256                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| `docs/standard/specification.md`       | `b31ebb053395f610aefcb5291d5f6f21bd2c4569598b88e7abd683b3e02f0a4c` |
| `docs/how-to-parse.md`                 | `dbe40d2d70a4f36754599f2324dcc24e8403893f0fe0b2788e9bf00d880b3396` |
| `docs/tests.md`                        | `7d676b76b028187b36b33fa41b52bc5d43b9fbc25b16660828c664b3eed03a0b` |
| `schemas/vers-test.schema-0.1.json`    | `d6073515f47eb0b8a3dcf248e76a0b8938f4475a3b1b04e8caafe7e4c750ca30` |
| `schemas/vers-test.schema-0.2.json`    | `09300a2031d37314a6fbdde95be50492f058802ba810f907b17db2dcb4c3ac8f` |
| `tests/vers_canonical_parse_test.json` | `ab22ccf0518f08e34bfe17dd141fadb8a166ab0c0b7e399e54462ffc3ac6d83b` |

Blocking v0.1.0 official conformance is limited to
`tests/vers_canonical_parse_test.json`. The other selected files are provenance,
schema, and specification context for auditability and future fixture work.

Tests must use the pinned snapshot or local artifacts generated from it. They must
not fetch upstream `main` during blocking local or CI validation.

## Fixture file layout

The v0.1.0 implementation stores upstream conformance inputs, local disposition
metadata, and the Vitest runner under the test tree:

```text
tests/
├── fixtures/
│   ├── upstream/
│   │   ├── provenance.json
│   │   └── vers_canonical_parse_test.json
│   └── vers-canonical-disposition.json
└── official-fixtures.test.ts
```

`tests/fixtures/upstream/vers_canonical_parse_test.json` is the local copy of the
pinned upstream fixture selected by ADR-0041. It must remain semantically
equivalent to the upstream artifact and must not be edited to add `vers-js` issue
codes, spans, fatality expectations, or local assertion metadata.

`tests/fixtures/upstream/provenance.json` records the source repository, upstream
commit, upstream path, checksum, and adoption metadata for the copied upstream
fixture. It is the implementation-local trace back to the selected upstream
snapshot.

`tests/fixtures/vers-canonical-disposition.json` is the local disposition table
for the pinned upstream parse fixture. Each record is keyed by the upstream
`input` string and assigns one disposition from the vocabulary in this document:
`blocking-core`, `known-divergence`, or `future-semantic`. The disposition table
is project-owned metadata and may cite local architecture decisions that explain
why an upstream case does or does not block v0.1.0.

`tests/official-fixtures.test.ts` is the Vitest adapter for official conformance
fixtures. It reads the upstream fixture and local disposition table, then calls
only the public API functions. For `blocking-core` failures, it asserts the public
success/failure boundary rather than translating upstream `expected_failure_reason`
text into `vers-js` issue codes. For upstream success records, it maps upstream
`expected_output.scheme` to the local `VersRange.type` field and keeps local
`VersRange.scheme` fixed to `"vers"`.

## Official fixture disposition vocabulary

Every selected official fixture case must have one local disposition:

| Disposition        | Meaning                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `blocking-core`    | The official case is in v0.1.0 core scope. It blocks release when the matching public operation fails the expected success or failure boundary.                    |
| `known-divergence` | The official case is intentionally not enforced because a `vers-js` ADR chooses different v0.1.0 core behavior.                                                    |
| `future-semantic`  | The official case depends on comparison, containment, ordering, simplification, support policy, native range translation, or another behavior outside v0.1.0 core. |

`known-divergence` and `future-semantic` cases must cite the ADR or architecture
specification section that explains why they do not block v0.1.0.

## Official parse fixture disposition table

The pinned `vers_canonical_parse_test.json` file contains these cases:

| Case                         | Input                        | Upstream expectation                                 | v0.1.0 disposition | Local assertion                                                                                                                                                                                                         |
| ---------------------------- | ---------------------------- | ---------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical normalized range   | `vers:npm/>=1.0.0\|<2.0.0`   | Parse success with decoded constraints.              | `blocking-core`    | `parseVers()` succeeds with `scheme: "vers"`, `type: "npm"`, constraints `>= 1.0.0` then `< 2.0.0`, and canonical output equal to the input. `validateVers()` and `canonicalizeVers()` share the same success boundary. |
| ASCII whitespace             | `vers:npm/>=1.0.0 \| <2.0.0` | Parse failure.                                       | `blocking-core`    | Public functions fail. The official reason string is context only; project diagnostic fixtures own exact `lexical.ascii_whitespace` expectations.                                                                       |
| Leading pipe                 | `vers:npm/\|>=1.0.0\|<2.0.0` | Parse failure.                                       | `blocking-core`    | Public functions fail. Project diagnostic fixtures own exact `constraint.leading_pipe` expectations.                                                                                                                    |
| Trailing pipe                | `vers:npm/>=1.0.0\|<2.0.0\|` | Parse failure.                                       | `blocking-core`    | Public functions fail. Project diagnostic fixtures own exact `constraint.trailing_pipe` expectations.                                                                                                                   |
| Consecutive pipes            | `vers:npm/>=1.0.0\|\|<2.0.0` | Parse failure.                                       | `blocking-core`    | Public functions fail. Project diagnostic fixtures own exact `constraint.consecutive_pipe` and any related empty-segment expectations.                                                                                  |
| Non-canonical semantic order | `vers:npm/>=2.0.0\|<1.0.0`   | Parse failure for constraints not sorted by version. | `known-divergence` | Public functions may succeed under v0.1.0 syntax-only scope, preserving input order. The core must not emit `canonical.non_canonical_order` because ADR-0021 defers semantic ordering and ADR-0042 reserves that code.  |

The upstream success fixture names the expected output field `scheme: "npm"` for
the package ecosystem component. `vers-js` public metadata uses `scheme: "vers"`
and `type: "npm"` as defined by `public-api.md` and
`data-model-and-canonical-output.md`; official fixture adapters must map that
upstream field to local `type`, not to local `scheme`.

## Upstream failure reason boundary

Official `expected_failure_reason` values are human-readable upstream context.
They must not be parsed, matched, translated, or snapshotted as the `vers-js`
machine diagnostic contract.

For official negative cases, the blocking conformance assertion is only that the
corresponding public operation fails when the case is `blocking-core`. Exact local
issue codes, spans, fatality, ordering, and metadata must be asserted through
project diagnostic fixtures.

## Deferred official fixture families

The v0.1.0 conformance claim excludes official fixture families that require
semantic behavior outside the parser surface, including:

- comparison;
- equality;
- containment;
- from-native conversion;
- merge;
- invert;
- semantic simplification;
- resolver behavior;
- vulnerability interpretation;
- VEX semantics.

`roundtrip` and `build` fixtures may be considered only after implementation
review proves a selected case is purely syntactic. Passing such a case does not
expand the v0.1.0 conformance claim beyond canonical syntax validation,
canonicalization, and parsed metadata.

## Project diagnostic fixture file shape

Project diagnostic fixtures are versioned JSON records. The implementation may
store them in one JSON file or multiple JSON files, but every record must be
equivalent to this shape:

```json
{
  "schemaVersion": 1,
  "id": "constraint-leading-pipe",
  "origin": "project",
  "description": "Leading pipe is rejected before per-constraint parsing.",
  "input": "vers:npm/|>=1.0.0",
  "operation": "all",
  "tags": ["constraint", "fatal-boundary"],
  "expected": {
    "ok": false,
    "issues": [
      {
        "code": "constraint.leading_pipe",
        "severity": "error",
        "span": { "start": 9, "end": 10 },
        "fatality": "constraint-list"
      }
    ]
  }
}
```

`operation` is one of:

- `parseVers`;
- `validateVers`;
- `canonicalizeVers`;
- `all`.

Use `all` when a fixture asserts the shared failure behavior that must be the same
for every public function. Use an operation-specific value only when the success
payload differs or a package-boundary smoke test requires one operation.

## Project diagnostic assertion schema

Each expected issue assertion has this shape:

```ts
interface ProjectExpectedIssue {
  code: VersIssueCode;
  severity: "error";
  span?: { start: number; end: number };
  fatality?: "whole-input" | "constraint-list" | "per-constraint" | "canonical" | "resource";
}
```

`fatality` is test-only parser-control metadata. It must never appear on public
`VersIssue` values returned by `parseVers()`, `validateVers()`, or
`canonicalizeVers()`.

Expected failure metadata uses the public failure metadata shape:

```json
{
  "expected": {
    "ok": false,
    "issues": [],
    "metadata": {
      "diagnostics": {
        "truncated": true,
        "maxIssues": 16
      }
    }
  }
}
```

When diagnostics are not truncated, the fixture must omit
`expected.metadata.diagnostics`. It must not assert
`{ "truncated": false }`.

## Assertion rules

Project diagnostic fixtures must assert:

- `ok: false` for invalid inputs;
- each expected issue `code` from the active v0.1.0 `VersIssueCode` union;
- `severity: "error"` for every ordinary issue;
- `span` only when the source region is reliable under `diagnostics.md`;
- omitted `span` when the source location is unreliable;
- issue order when more than one issue is expected;
- test-only `fatality` or equivalent phase-boundary behavior;
- `metadata.diagnostics` only for diagnostic cap truncation;
- absence of diagnostic truncation metadata for complete failures.

Project diagnostic fixtures must not assert exact `message` strings. They may
assert that a returned `message` is a non-empty string.

Project diagnostic fixtures must not expect reserved issue codes from the v0.1.0
core, including `canonical.non_canonical_order`,
`canonical.invalid_comparator_sequence`, `support.unknown_type`, or
`support.unsupported_semantic`.

## Required project diagnostic coverage

Project diagnostic fixtures must cover every active issue code from
`diagnostics.md` before implementation is considered ready:

| Code                                  | Required representative input                   | Required assertion focus                                                    |
| ------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `resource.input_too_long`             | A `vers:` string with `1025` UTF-16 code units. | One ordinary resource issue, omitted `span`, no normal parser-phase issues. |
| `lexical.ascii_whitespace`            | `vers:npm/>=1.0.0 \| <2.0.0`                    | Whitespace span, whole-input fatality.                                      |
| `lexical.invalid_character`           | `vers:generic/1/2`                              | Raw non-unreserved version character span, per-constraint fatality.         |
| `syntax.missing_scheme_separator`     | `vers-npm/1.0.0`                                | Missing separator failure without guessed constraint diagnostics.           |
| `syntax.invalid_scheme`               | `VERS:npm/1.0.0`                                | Scheme span, whole-input fatality.                                          |
| `syntax.missing_type`                 | `vers:/1.0.0`                                   | Missing type point span when reliable.                                      |
| `syntax.invalid_type_case`            | `vers:NPM/1.0.0`                                | Uppercase type span.                                                        |
| `syntax.missing_constraint_separator` | `vers:npm`                                      | Missing `/` separator and no guessed constraints.                           |
| `constraint.missing_constraints`      | `vers:npm/`                                     | Empty constraint-list point span when reliable.                             |
| `constraint.leading_pipe`             | `vers:npm/\|1.0.0`                              | Leading pipe span, constraint-list fatality.                                |
| `constraint.trailing_pipe`            | `vers:npm/1.0.0\|`                              | Trailing pipe span, constraint-list fatality.                               |
| `constraint.consecutive_pipe`         | `vers:npm/1.0.0\|\|2.0.0`                       | Pipe-run or second-pipe span, constraint-list fatality.                     |
| `constraint.empty_constraint`         | `vers:npm/1.0.0\|\|2.0.0`                       | Empty segment expectation when emitted by the chosen splitter behavior.     |
| `constraint.empty_version`            | `vers:npm/>=`                                   | Point span after comparator when reliable.                                  |
| `constraint.invalid_comparator`       | `vers:npm/=>1.0.0`                              | Invalid comparator prefix span.                                             |
| `constraint.invalid_star_constraint`  | `vers:npm/>=*`                                  | Smallest reliable offending `*` or segment span.                            |
| `constraint.invalid_percent_encoding` | `vers:generic/%G0`                              | Malformed escape span and no UTF-8 diagnostic for that segment.             |
| `constraint.invalid_utf8`             | `vers:generic/%C3%28`                           | Invalid UTF-8 byte-sequence span when reliable.                             |
| `canonical.duplicate_version`         | `vers:npm/1.0.0\|=1.0.0`                        | Later duplicate version span and canonical fatality.                        |

The `constraint.empty_constraint` fixture may share the same input as
`constraint.consecutive_pipe` when the implementation emits both issues under the
deterministic ordering rules. If the implementation chooses only the more specific
separator diagnostic, it must include a separate reliable empty-segment fixture
that exercises `constraint.empty_constraint` without weakening the public issue
table.

## Resource and truncation fixtures

Project fixtures must include exact boundary coverage for resource behavior:

- an input of exactly `1024` UTF-16 code units that is not rejected solely for
  length;
- an input of `1025` UTF-16 code units that returns only
  `resource.input_too_long` from the preflight resource gate;
- an invalid input at or below `1024` UTF-16 code units that would produce more
  than `16` ordinary issues, returning exactly `16` ordinary issues and
  `metadata.diagnostics: { truncated: true, maxIssues: 16 }`;
- a comparable invalid input producing fewer than `16` ordinary issues, with no
  `metadata.diagnostics` field.

Resource fixtures must measure length using JavaScript string `.length`, matching
the UTF-16 code-unit span model.

## Positive project fixture coverage

Project-owned positive fixtures should supplement the single official success case
where local architecture contracts are more precise than upstream output:

- bare equality canonical output: `vers:npm/1.0.0` stays bare in canonical output
  and metadata uses `comparator: "="`;
- explicit equality canonical output: `vers:npm/=1.0.0` canonicalizes to
  `vers:npm/1.0.0`;
- lowercase percent hex acceptance and uppercase canonical emission;
- single-pass decoded percent behavior such as `vers:generic/%252F`;
- UTF-8 decoded version metadata such as `vers:generic/%C3%A9`;
- input-order preservation for syntactically valid constraints.

Positive project fixtures must assert the operation-specific success payloads:
`parseVers()` returns `VersRange`, `validateVers()` returns `true`, and
`canonicalizeVers()` returns the canonical string.

## Fixture runner expectations

The primary implementation test suite uses Vitest under the Node.js LTS
development baseline. Fixture tests must still exercise only the public package
surface. They must not import parser internals, scanner helpers, or fixture-only
debug exports from the library core.

Fixture runners may use adapter code to translate official upstream records into
local assertions. That adapter must be deterministic and must preserve upstream
record identity in test names or failure output.

For official fixtures, failure output should report:

- upstream repository;
- upstream commit;
- upstream path;
- checksum identity;
- case description;
- local disposition.

For project fixtures, failure output should report:

- fixture `id`;
- `input`;
- expected issue codes;
- expected metadata state;
- whether the fixture applies to one operation or all public operations.

## Invariants

Implementation and tests must preserve these invariants:

1. Official fixture files remain provenance-preserving upstream conformance inputs.
2. Project diagnostic fixtures own the `vers-js` diagnostic machine contract.
3. Blocking official conformance uses the pinned upstream snapshot, not live
   upstream `main`.
4. Every official fixture case has an explicit local disposition.
5. Upstream `expected_failure_reason` text is never treated as a local issue-code
   contract.
6. The official non-canonical-order parse failure does not activate
   `canonical.non_canonical_order` in v0.1.0 core.
7. Project diagnostic fixtures cover every active v0.1.0 core issue code.
8. Project diagnostic fixtures cover resource input length and diagnostic
   truncation metadata.
9. Fixtures assert spans in original-input, zero-based, half-open UTF-16 code-unit
   coordinates when spans are reliable.
10. Fixtures omit spans when source locations are unreliable.
11. Fixtures never assert exact human-readable message text.
12. Test-only fatality expectations do not appear in public `VersIssue` values.
13. Reserved semantic and support issue codes are not expected from v0.1.0 core
    public functions.
