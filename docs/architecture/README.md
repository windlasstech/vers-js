# Architecture Specifications

<div align="center">

English | [한국어](README.ko.md)

</div>

This directory contains the implementation specifications for `vers-js` v0.1.0. These documents translate the accepted ADRs in `../decisions/` into concrete contracts that implementation and tests must follow.

## Development Flow

This project follows **SDD (Spec-Driven Development)** methodology.

1. **Use ADRs** to understand _why_ the architecture was chosen
2. **Use these specifications** to define _exact observable behavior_
3. **Implement** the library and tests against these specifications

## Specification Documents

### Core Specifications

| Document                                                              | Description                                                 | Primary ADR Inputs                                                                                           |
| --------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [Scope and Invariants](scope-and-invariants.md)                       | Common v0.1.0 implementation boundary                       | ADR-0001, ADR-0002, ADR-0004, ADR-0008, ADR-0010, ADR-0015, ADR-0021, ADR-0033, ADR-0034, ADR-0041, ADR-0046 |
| [Public API](public-api.md)                                           | Public TypeScript package surface and Result shapes         | ADR-0004, ADR-0005, ADR-0011, ADR-0012, ADR-0013, ADR-0014, ADR-0031, ADR-0032, ADR-0044, ADR-0050           |
| [Data Model and Canonical Output](data-model-and-canonical-output.md) | Successful parse metadata and canonical string projection   | ADR-0005, ADR-0010, ADR-0021, ADR-0022                                                                       |
| [Character Encoding](character-encoding.md)                           | Type characters, version characters, percent escapes, UTF-8 | ADR-0015, ADR-0017, ADR-0018, ADR-0019, ADR-0020, ADR-0023, ADR-0024, ADR-0025, ADR-0026, ADR-0042           |

### Parser and Diagnostics

| Document                              | Description                                            | Primary ADR Inputs                                                                                                               |
| ------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| [Parser Phases](parser-phases.md)     | Scanner/parser execution contract and fatal boundaries | ADR-0006, ADR-0016, ADR-0028, ADR-0035, ADR-0045                                                                                 |
| [Diagnostics](diagnostics.md)         | Issue codes, spans, messages, and metadata             | ADR-0006, ADR-0007, ADR-0023, ADR-0024, ADR-0025, ADR-0026, ADR-0027, ADR-0028, ADR-0029, ADR-0042, ADR-0043, ADR-0044, ADR-0045 |
| [Resource Limits](resource-limits.md) | Fixed input length and issue-count limits              | ADR-0027, ADR-0028, ADR-0029, ADR-0030, ADR-0032, ADR-0043, ADR-0044, ADR-0045                                                   |

### Testing and Build

| Document                            | Description                                          | Primary ADR Inputs                                                                                                     |
| ----------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [Fixtures](fixtures.md)             | Official conformance and project diagnostic fixtures | ADR-0008, ADR-0009, ADR-0037, ADR-0041, ADR-0044, ADR-0045, ADR-0046                                                   |
| [Build and Test](build-and-test.md) | Package scaffolding, output, and verification        | ADR-0002, ADR-0003, ADR-0011, ADR-0012, ADR-0013, ADR-0014, ADR-0036, ADR-0037, ADR-0038, ADR-0039, ADR-0040, ADR-0050 |

## Specification Writing Order

When drafting new specifications or reviewing existing ones, follow this order:

1. `scope-and-invariants.md`: Establish the boundary first
2. `public-api.md`: Define the callable surface
3. `data-model-and-canonical-output.md`: Define success values
4. `character-encoding.md`: Define input processing rules
5. `parser-phases.md`: Define execution order
6. `diagnostics.md`: Define failure values
7. `fixtures.md`: Define test expectations
8. `resource-limits.md`: Define resource boundaries
9. `build-and-test.md`: Define scaffolding and verification
10. Add new documents as needed.

## v0.1.0 Scope

**In scope:**

- Canonical VERS syntax validation
- Parsed declaration metadata (`VersRange`, `VersConstraint`)
- Canonical string projection
- Syntax-only type validation
- Single-pass percent-decoding
- Bounded diagnostics with original-input spans
- Official parse/canonical conformance fixtures

**Out of scope:**

- Version comparison or containment
- Native ecosystem range translation
- Semantic ordering or simplification
- Known-type registry enforcement
- Warning, repair, or coercion modes
- Vulnerability interpretation or VEX semantics
