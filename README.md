<div align="center">

# vers-js

[![NPM License](https://img.shields.io/npm/l/%40windlass%2Fvers-js)](LICENSE)
[![SemVer Versioning](https://img.shields.io/badge/version_scheme-SemVer-0097a7)](https://semver.org/)
[![SLSA Build L3](./docs/slsa-build-l3-badge.svg)](https://slsa.dev/spec/v1.2/build-track-basics#build-l3)
[![NPM Version](https://img.shields.io/npm/v/@windlass/vers-js)](https://www.npmjs.com/package/@windlass/vers-js)
[![NPM Last Update](https://img.shields.io/npm/last-update/@windlass/vers-js)](https://www.npmjs.com/package/@windlass/vers-js)
[![Node Current](https://img.shields.io/node/v/@windlass/vers-js)](package.json)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/@windlass/vers-js)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-3.0-4baaaa.svg)](https://github.com/windlasstech/.github/blob/main/CODE_OF_CONDUCT.md)
[![GitHub issues](https://img.shields.io/badge/issue_tracking-GitHub-blue.svg)](https://github.com/windlasstech/vers-js/issues)

[![TypeScript dev dependency version](https://img.shields.io/github/package-json/dependency-version/windlasstech/vers-js/dev/typescript)](package.json)
[![Vitest dev dependency version](https://img.shields.io/github/package-json/dependency-version/windlasstech/vers-js/dev/vitest)](package.json)
[![markdownlint-cli2 dev dependency version](https://img.shields.io/github/package-json/dependency-version/windlasstech/vers-js/dev/markdownlint-cli2)](package.json)
[![Oxlint dev dependency version](https://img.shields.io/github/package-json/dependency-version/windlasstech/vers-js/dev/oxlint)](package.json)
[![Oxfmt dev dependency version](https://img.shields.io/github/package-json/dependency-version/windlasstech/vers-js/dev/oxfmt)](package.json)
[![Lefthook dev dependency version](https://img.shields.io/github/package-json/dependency-version/windlasstech/vers-js/dev/lefthook)](package.json)

[![Quality Gates](https://github.com/windlasstech/vers-js/actions/workflows/quality-gates.yml/badge.svg)](https://github.com/windlasstech/vers-js/actions/workflows/quality-gates.yml)
[![CodeQL](https://github.com/windlasstech/vers-js/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/windlasstech/vers-js/actions/workflows/github-code-scanning/codeql)
[![OSV Scanner Full](https://github.com/windlasstech/vers-js/actions/workflows/osv-scanner-full.yml/badge.svg)](https://github.com/windlasstech/vers-js/actions/workflows/osv-scanner-full.yml)
[![Dependency Review](https://github.com/windlasstech/vers-js/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/windlasstech/vers-js/actions/workflows/dependency-review.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/windlasstech/vers-js/badge)](https://scorecard.dev/viewer/?uri=github.com/windlasstech/vers-js)
[![codecov](https://codecov.io/gh/windlasstech/vers-js/graph/badge.svg)](https://codecov.io/gh/windlasstech/vers-js)
[![Tested with fast-check](https://img.shields.io/badge/tested%20with-fast%E2%80%91check%20%F0%9F%90%92-%23282ea9?flat&logoSize=auto&labelColor=%231b1b1d)](https://fast-check.dev/)

English | [한국어](README.ko.md)

</div>

A runtime-agnostic TypeScript library for parsing and validating [VERS](https://packageurl.org/docs/vers/introduction) (VErsion Range Specifier) declarations.

## Overview

`vers-js` provides a small, data-oriented API for canonical VERS syntax validation and parsed declaration metadata. It validates VERS strings like `vers:npm/>=1.0.0|<2.0.0` and returns structured success/failure results with machine-readable diagnostics.

**Key characteristics:**

- **Runtime-agnostic**: Works in Node.js(>=22), Deno, and Bun
- **Zero dependencies**: No runtime dependencies
- **ESM-only**: Modern ECMAScript Modules, no CommonJS
- **Named exports only**: Explicit root exports with no JavaScript default export
- **TypeScript-first**: Written in TypeScript with full type declarations
- **Strict canonical validation**: No repair, coercion, or warning modes
- **Machine-readable diagnostics**: Structured error codes for downstream tooling

## Installation

```bash
npm install @windlass/vers-js
# or
pnpm add @windlass/vers-js
# or
yarn add @windlass/vers-js
```

## Quick Start

```typescript
import { parseVers, validateVers, canonicalizeVers } from "@windlass/vers-js";

// Parse a VERS declaration
const result = parseVers("vers:npm/>=1.0.0|<2.0.0");

if (result.ok) {
  console.log(result.value.type); // "npm"
  console.log(result.value.constraints); // parsed constraints
  console.log(result.value.canonical); // canonical VERS string
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
parseVers(null); // throws TypeError
validateVers(123); // throws TypeError
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

## Documentation and Project Policies

- **[Architecture Specifications](docs/architecture/)**: Implementation contracts and technical specifications
- **[Architectural Decision Records](docs/decisions/)**: Design decisions and rationale (MADR format)
- **[Release Process](docs/release.md)**: Signed tag, npm Trusted Publishing, provenance, and GitHub Release workflow.
- **[Changelog](CHANGELOG.md)**: User-facing release notes maintained according to Keep a Changelog, with Human Era release dates.
- **[Contributing Guide](https://github.com/windlasstech/.github/blob/main/CONTRIBUTING.md)**: Organization-wide contribution process, PR expectations, and changelog workflow.
- **[Security Policy](https://github.com/windlasstech/.github/blob/main/SECURITY.md)**: Windlass organization-wide private vulnerability reporting, coordinated disclosure, and supply-chain integrity requirements.
- **[Code of Conduct](https://github.com/windlasstech/.github/blob/main/CODE_OF_CONDUCT.md)**: Contributor Covenant 3.0 community standards for all project interactions.
- **[AGENTS.md](AGENTS.md)**: Guidelines for AI assistants working in this repository

## Development

**Prerequisites:**

- Node.js 22 LTS or newer
- pnpm (package manager)

**Scripts:**

```bash
# Type checking
pnpm run typecheck    # tsc --noEmit

# Building
pnpm run build        # tsc -p tsconfig.build.json

# Testing
pnpm run test         # vitest run
pnpm run test:pbt     # vitest run tests/property-based.test.ts
pnpm run test:fuzz    # per-property time-budgeted fuzz exploration
pnpm run test:watch   # vitest
pnpm run test:coverage # vitest run --coverage

# test:fuzz applies its 10-second fast-check budget to each property test.
# Expected runtime is roughly: property count × 10 seconds, plus startup overhead.
# Replay a property failure with VERS_PBT_SEED=<seed> and VERS_PBT_PATH=<path>.

# Package verification (uses built artifacts)
pnpm run test:package              # build and verify emitted package artifacts
pnpm run typecheck:package         # build and type-check package consumer declarations
pnpm run typecheck:package:blocked # build and verify blocked subpath imports fail
pnpm run smoke:package             # build and run package-name runtime smoke tests
pnpm run verify:package            # run all package verification checks above

# Runtime smoke testing
pnpm run smoke:runtime # run built-package smoke tests under Node.js, Deno, and Bun
pnpm run verify:runtime # build, then run all runtime smoke tests

# Linting and formatting
pnpm run lint:md      # markdownlint-cli2
pnpm run lint:ts      # oxlint
pnpm run fmt          # oxfmt
pnpm run fmt:check    # oxfmt --check
```

## License

Apache 2.0. see [LICENSE](LICENSE).
