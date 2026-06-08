# Documentation

<div align="center">

English | [한국어](README.ko.md)

</div>

This directory contains the design documentation and architecture specifications for `vers-js`.

## Structure

```
docs/
├── architecture/    # Implementation specifications
├── decisions/       # Architectural Decision Records (ADRs)
└── README.md        # This file
```

## Architecture Specifications

The [`architecture/`](architecture/) directory contains concrete implementation contracts that translate accepted ADRs into observable behavior specifications.

Key specifications:

- **[Scope and Invariants](architecture/scope-and-invariants.md)**: The v0.1.0 implementation boundary
- **[Public API](architecture/public-api.md)**: Exact function signatures and Result shapes
- **[Build and Test](architecture/build-and-test.md)**: Package scaffolding and verification architecture
- **[Data Model and Canonical Output](architecture/data-model-and-canonical-output.md)**: Parsed syntax metadata
- **[Character Encoding](architecture/character-encoding.md)**: Percent-decoding and UTF-8 handling
- **[Parser Phases](architecture/parser-phases.md)**: Scanner/parser execution contract
- **[Diagnostics](architecture/diagnostics.md)**: Issue codes, spans, and metadata
- **[Fixtures](architecture/fixtures.md)**: Conformance fixture handling
- **[Resource Limits](architecture/resource-limits.md)**: Input length and diagnostic caps

## Architectural Decision Records

The [`decisions/`](decisions/) directory contains ADRs in [MADR 4.0.0](https://adr.github.io/madr/) format. Each record documents a significant architectural decision, its context, considered alternatives, and consequences.

Notable decisions:

- **ADR-0001**: Use TypeScript for the VERS library
- **ADR-0004**: Result-centered functional public API
- **ADR-0011**: Publish ESM-only package
- **ADR-0035**: Handwritten scanner/parser for v1

## Workflow

This project follows **SDD (Spec-Driven Development)** methodology.

The intended documentation workflow is:

1. **Decisions first**: Use ADRs to understand _why_ architecture was chosen
2. **Specs second**: Use architecture specifications to define _exact observable behavior_
3. **Implementation third**: Build library and tests against the specifications
