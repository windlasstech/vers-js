<div align="center">

# vers-js

English | [한국어](README.ko.md)

</div>

A runtime-agnostic TypeScript library for parsing and validating [VERS](https://packageurl.org/docs/vers/introduction) (VErsion Range Specifier) declarations.

## Overview

`vers-js` provides a small, data-oriented API for canonical VERS syntax validation and parsed declaration metadata. It validates VERS strings like `vers:npm/>=1.0.0|<2.0.0` and returns structured success/failure results with machine-readable diagnostics.

**Key characteristics:**

- **Runtime-agnostic**: Works in Node.js, Deno, and Bun
- **ESM-only**: Modern ECMAScript Modules, no CommonJS
- **TypeScript-first**: Written in TypeScript with full type declarations
- **Strict canonical validation**: No repair, coercion, or warning modes
- **Machine-readable diagnostics**: Structured error codes for downstream tooling

## Installation

```bash
npm install vers-js
# or
pnpm add vers-js
# or
yarn add vers-js
```

## Quick Start

```typescript
import { parseVers, validateVers, canonicalizeVers } from "vers-js";

// Parse a VERS declaration
const result = parseVers("vers:npm/>=1.0.0|<2.0.0");

if (result.ok) {
  console.log(result.value.type);        // "npm"
  console.log(result.value.constraints); // parsed constraints
  console.log(result.value.canonical);   // canonical VERS string
} else {
  console.log(result.issues); // structured diagnostics
}

// Validate without parsing
const valid = validateVers("vers:npm/>=1.0.0|<2.0.0");
// { ok: true, value: true }

// Get canonical form
const canonical = canonicalizeVers("vers:npm/>=1.0.0|<2.0.0");
// { ok: true, value: "vers:npm/>=1.0.0|<2.0.0" }
```

## API

### `parseVers(input: string): VersParseResult`

Parses a VERS declaration and returns parsed syntax metadata.

**Success:**
```typescript
{
  ok: true,
  value: {
    scheme: "vers",
    type: "npm",
    constraints: [
      { comparator: ">=", version: "1.0.0" },
      { comparator: "<", version: "2.0.0" }
    ],
    canonical: "vers:npm/>=1.0.0|<2.0.0"
  }
}
```

### `validateVers(input: string): VersValidationResult`

Validates a VERS declaration without returning parsed metadata.

**Success:** `{ ok: true, value: true }`

### `canonicalizeVers(input: string): VersCanonicalizeResult`

Validates and returns the canonical VERS string.

**Success:** `{ ok: true, value: "vers:npm/>=1.0.0|<2.0.0" }`

### Error Handling

All three functions return discriminated Result types:

```typescript
type VersResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: VersIssue[]; metadata?: VersFailureMetadata };
```

Non-string inputs throw `TypeError`:

```typescript
parseVers(null);      // throws TypeError
validateVers(123);    // throws TypeError
```

## Scope

**In scope (v0.1.0):**

- Canonical VERS syntax validation
- Parsed declaration metadata (`VersRange`, `VersConstraint`)
- Canonical string projection
- Syntax-only type validation
- Single-pass percent-decoding
- Bounded diagnostics with original-input spans

**Out of scope (v0.1.0):**

- Version comparison or containment
- Native ecosystem range translation
- Semantic ordering or simplification
- Known-type registry enforcement
- Warning, repair, or coercion modes
- Vulnerability interpretation or VEX semantics

## Documentation

- **[Architecture Specifications](docs/architecture/)**: Implementation contracts and technical specifications
- **[Architectural Decision Records](docs/decisions/)**: Design decisions and rationale (MADR format)
- **[AGENTS.md](AGENTS.md)**: Guidelines for AI assistants working in this repository

## Development

**Prerequisites:**

- Node.js 22 LTS or newer
- pnpm (package manager)

**Scripts:**

```bash
# Type checking
pnpm typecheck        # tsc --noEmit

# Building
pnpm build            # tsc -p tsconfig.build.json

# Testing
pnpm test             # vitest run
pnpm test:watch       # vitest

# Linting and formatting
pnpm lint             # oxlint --type-aware
pnpm lint:fix         # oxlint --type-aware --fix
pnpm format           # oxfmt
pnpm format:check     # oxfmt --check
```

## License

Apache 2.0. see [LICENSE](LICENSE).
