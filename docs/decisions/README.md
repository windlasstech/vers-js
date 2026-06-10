# Architectural Decision Records

<div align="center">

English | [한국어](README.ko.md)

</div>

This directory contains the Architectural Decision Records (ADRs) for `vers-js`, following the [MADR 4.0.0](https://adr.github.io/madr/) format.

## What is an ADR?

An ADR captures an important architectural decision made along with its context and consequences. It helps future contributors understand _why_ the project is built the way it is, not just _what_ was built.

## Format

Each ADR follows the MADR 4.0.0 template:

- **Context and Problem Statement**: What problem are we solving?
- **Decision Drivers**: What forces influenced the decision?
- **Considered Options**: What alternatives were evaluated?
- **Decision Outcome**: What was chosen and why?
- **Consequences**: What are the trade-offs?
- **Confirmation**: How do we verify compliance?

## Index of Decisions

### Foundation (ADR-0000–0010)

| ADR                                                                           | Title                                                           | Status   |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------- | -------- |
| [0000](0000-use-markdown-architectural-decision-records.md)                   | Use Markdown Architectural Decision Records                     | accepted |
| [0001](0001-use-typescript-for-vers-library.md)                               | Use TypeScript for the VERS library                             | accepted |
| [0002](0002-use-nodejs-lts-for-development-runtime.md)                        | Use Node.js LTS for development runtime                         | accepted |
| [0003](0003-use-pnpm-as-development-package-manager.md)                       | Use pnpm as development package manager                         | accepted |
| [0004](0004-use-result-centered-functional-public-api.md)                     | Use a Result-centered functional public API                     | accepted |
| [0005](0005-use-syntax-metadata-data-model-with-discriminated-constraints.md) | Use a syntax metadata data model with discriminated constraints | accepted |
| [0006](0006-use-bounded-accumulated-diagnostics.md)                           | Use bounded accumulated diagnostics                             | accepted |
| [0007](0007-use-hierarchical-namespaced-issue-codes.md)                       | Use hierarchical namespaced issue codes                         | accepted |
| [0008](0008-use-parse-conformance-fixtures-for-v1.md)                         | Use parse conformance fixtures for v1                           | accepted |
| [0009](0009-use-snapshot-pinned-vers-spec-and-tests.md)                       | Use snapshot-pinned VERS spec and tests                         | accepted |
| [0010](0010-use-strict-canonicalization-without-auto-repair.md)               | Use strict canonicalization without auto-repair                 | accepted |

### Package and API (ADR-0011–0020)

| ADR                                                                      | Title                                                    | Status   |
| ------------------------------------------------------------------------ | -------------------------------------------------------- | -------- |
| [0011](0011-publish-esm-only-package.md)                                 | Publish an ESM-only package                              | accepted |
| [0012](0012-use-root-only-package-exports.md)                            | Use root-only package exports                            | accepted |
| [0013](0013-use-root-types-with-exports-types-condition.md)              | Use root types with exports types condition              | accepted |
| [0014](0014-use-universal-default-export-for-runtime-imports.md)         | Use universal default export for runtime imports         | accepted |
| [0015](0015-use-syntax-only-type-validation-with-advisory-registries.md) | Use syntax-only type validation with advisory registries | accepted |
| [0016](0016-use-logical-parser-phases-with-explicit-fatal-boundaries.md) | Use logical parser phases with explicit fatal boundaries | accepted |
| [0017](0017-use-rfc3986-unreserved-raw-version-characters.md)            | Use RFC 3986 unreserved raw version characters           | accepted |
| [0018](0018-accept-lowercase-percent-hex-and-emit-uppercase.md)          | Accept lowercase percent hex and emit uppercase          | accepted |
| [0019](0019-reject-invalid-utf8-percent-decoded-versions.md)             | Reject invalid UTF-8 percent-decoded versions            | accepted |
| [0020](0020-use-single-pass-percent-decoding.md)                         | Use single-pass percent-decoding                         | accepted |

### Parsing and Diagnostics (ADR-0021–0030)

| ADR                                                                     | Title                                                   | Status   |
| ----------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| [0021](0021-preserve-input-order-and-defer-semantic-ordering-checks.md) | Preserve input order and defer semantic ordering checks | accepted |
| [0022](0022-use-decoded-string-equality-for-v1-duplicate-versions.md)   | Use decoded-string equality for v1 duplicate versions   | accepted |
| [0023](0023-use-original-input-for-diagnostic-spans.md)                 | Use original input for diagnostic spans                 | accepted |
| [0024](0024-use-zero-based-half-open-span-offsets.md)                   | Use zero-based half-open span offsets                   | accepted |
| [0025](0025-use-utf16-code-unit-span-offsets.md)                        | Use UTF-16 code-unit span offsets                       | accepted |
| [0026](0026-omit-unreliable-diagnostic-spans.md)                        | Omit unreliable diagnostic spans                        | accepted |
| [0027](0027-use-fixed-v1-input-length-limit.md)                         | Use fixed v1 input length limit                         | accepted |
| [0028](0028-use-fixed-v1-diagnostic-issue-cap.md)                       | Use fixed v1 diagnostic issue cap                       | accepted |
| [0029](0029-expose-diagnostic-cap-metadata.md)                          | Expose diagnostic cap metadata                          | accepted |
| [0030](0030-reserve-resource-options-and-use-internal-v1-constants.md)  | Reserve resource options and use internal v1 constants  | accepted |

### API Refinement (ADR-0031–0040)

| ADR                                                                         | Title                                                       | Status   |
| --------------------------------------------------------------------------- | ----------------------------------------------------------- | -------- |
| [0031](0031-accept-only-single-string-input-in-v1-api.md)                   | Accept only single string input in v1 API                   | accepted |
| [0032](0032-treat-non-string-runtime-input-as-programmer-error.md)          | Treat non-string runtime input as programmer error          | accepted |
| [0033](0033-exclude-known-type-registry-from-v1-core-api.md)                | Exclude known-type registry from v1 core API                | accepted |
| [0034](0034-exclude-repair-and-warning-modes-from-v1-api.md)                | Exclude repair and warning modes from v1 API                | accepted |
| [0035](0035-use-handwritten-scanner-parser-for-v1.md)                       | Use handwritten scanner/parser for v1                       | accepted |
| [0036](0036-use-typescript-compiler-first-build-without-bundling-for-v1.md) | Use TypeScript compiler-first build without bundling for v1 | accepted |
| [0037](0037-use-vitest-for-v1-tests.md)                                     | Use Vitest for v1 tests                                     | accepted |
| [0038](0038-use-oxlint-with-type-aware-linting-for-v1.md)                   | Use Oxlint with type-aware linting for v1                   | accepted |
| [0039](0039-use-oxfmt-for-v1-formatting.md)                                 | Use Oxfmt for v1 formatting                                 | accepted |
| [0040](0040-use-node-22-lts-and-oxc-aligned-typescript-baselines.md)        | Use Node 22 LTS and Oxc-aligned TypeScript baselines        | accepted |

### Finalization (ADR-0041–0049)

| ADR                                                                           | Title                                                         | Status   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------- | -------- |
| [0041](0041-pin-v0-1-0-vers-spec-snapshot.md)                                 | Pin v0.1.0 VERS spec snapshot                                 | accepted |
| [0042](0042-separate-core-and-reserved-issue-codes.md)                        | Separate core and reserved issue codes                        | accepted |
| [0043](0043-use-resource-input-too-long-issue-code.md)                        | Use resource.input_too_long issue code                        | accepted |
| [0044](0044-use-presence-based-diagnostic-truncation-metadata.md)             | Use presence-based diagnostic truncation metadata             | accepted |
| [0045](0045-use-v0-1-0-resource-limit-values.md)                              | Use v0.1.0 resource limit values                              | accepted |
| [0046](0046-separate-official-conformance-and-project-diagnostic-fixtures.md) | Separate official conformance and project diagnostic fixtures | accepted |
| [0047](0047-use-vitest-v8-coverage-and-codecov-reporting.md)                  | Use Vitest V8 coverage and Codecov reporting                  | accepted |
| [0048](0048-use-separated-vitest-test-files.md)                               | Use separated Vitest test files                               | accepted |
| [0049](0049-use-devengines-package-manager-for-pnpm-pinning.md)               | Use devEngines.packageManager for pnpm pinning                | accepted |

## Adding a New ADR

When adding a new decision record:

1. Use the next sequential number
2. Follow the MADR 4.0.0 template from [ADR-0000](0000-use-markdown-architectural-decision-records.md)
3. Set `status: proposed` initially
4. Update the status to `accepted` or `rejected` after review
5. Add the ADR to the index table above
6. If a new ADR supersedes or updates a decision from a previous ADR, update the status of the affected prior ADR to `superseded by ADR-NNNN` (or `deprecated`, `updated` as appropriate) and add a backward link in its front matter.

> [!WARNING]
> Existing ADRs are immutable. Except for trivial typo corrections or formatting, **never edit the body of an accepted ADR after the fact**. The only permitted post-acceptance content change is updating the `status` field (e.g., to `superseded`, `deprecated`). If a decision changes, write a new ADR rather than rewriting history.
