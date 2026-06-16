<div align="center">

# vers-js

[![NPM License](https://img.shields.io/npm/l/%40windlass%2Fvers-js)](LICENSE)
[![SemVer Versioning](https://img.shields.io/badge/version_scheme-SemVer-0097a7)](https://semver.org/)
[![SLSA Build L3](https://img.shields.io/badge/SLSA-Build_L3-97ca00.svg?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0CAMAAAAKE/YAAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAC9FBMVEUAAAD/VQDxMADwMQDwMgDxMQDwMQDwMADwMQDwMQDvMQD/MADtLgDvMgDvMADwMQDwMQDvLwDjOQDxMQDwMQDwMQDwMQDwMQDqKwDvMADxMQDxLwD/MwDwMADwMQDwMQDyMADuMgDwMgDwMQDvMADwNQDvMQD/QADwMgDwMQDvLwDsLwDwMQDvMQD/JADvMADwMADxMgDyNgDwMQDwMQDxMgDwMQDwMQDuMgDwMQDwMgDvMgDwMQDwMQDyMwD/KwDwMQDwMgDwMgDwMQDwMwD/QADwMQDwMADvMADwMQDtNQDwMQDwMgDwMQDwMgDuMwDvMADwLwDxMAD/AADxMQDwMQD/AADwMADwMQDwMgDwMQDvMgDxMQDwMQDwMgDwMQDxMQDwMQD0NQDmMwDwMQDvMgDyLwDwMQDwMQDwMQDwMADwMgDyMwDvMQDxMgDvMQDwMQDwLgDuLgDwMQDxMADwMQDwMADvMgDxMQDvMQD1MwDwMQDxMQDzMgDwMgDxMgDwMQDvMADwMADwMQDxMADwMQDrMQDrJwDxMQDwMADvMgDxMADxMgDtLwDxMQDwMQDxMQDxMQDwMQDoLgDwMgDwMQDwMQDxMwDwMgDwMQDyLgDwMQDxMADwMQDwMQDvMADwMADxMADwMQDvMQDvMQDvMQDvMADwMQDvMgDxMQDwMQDvMQDwMQDxMgDwMgDwMADwMQDvMQDwMQDwMQDxMADwMQDxMQDwMgDvMADwMQDxMQDvMADwMQDvMQDyMgDxKwDvMQDzLgDvMQDwMQDxMQDtNwDwMwDwMQDxMQDvMQDwMgDxMADuMwDvMQDxMgDzMQDwMADxMgDwMgDwMADxMADuMgDwMQDwMgDwMQDwMADvMgDwMADwMQDvMADwMQDwMQDwLQDxMQDvMQDyMQDuMwDuMwDwMQDwMQDxMgDvMQDwMAD0LADwMQDwMQDwMQDwMQDwMQDwMQDxMADvMQDzLwDwMgDyMADxMADwMADvMQDwMQD///+A/jMyAAAA+nRSTlMAAzVjirDS3e75fhAccLPx7zEJXbv98DQMb+U2BXXt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)](https://slsa.dev/spec/v1.2/build-track-basics#build-l3)
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
