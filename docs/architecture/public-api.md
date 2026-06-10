---
title: Public API
parent: Architecture Specifications
nav_order: 2
---

# Public API

This specification defines the public TypeScript package surface for `vers-js`
v0.1.0. It fixes the callable functions, Result shapes, exported public types,
runtime input behavior, and package import boundary that implementation and tests
must preserve.

Primary ADR inputs: ADR-0004, ADR-0005, ADR-0011, ADR-0012, ADR-0013,
ADR-0014, ADR-0031, ADR-0032, and ADR-0044.

## Public entry points

The package root must export exactly these core functions:

```ts
export function parseVers(input: string): VersParseResult;
export function validateVers(input: string): VersValidationResult;
export function canonicalizeVers(input: string): VersCanonicalizeResult;
```

Each function accepts one required public argument: the VERS declaration string.
The v0.1.0 public functions must not expose overloads or options for:

- resource-budget overrides;
- warning, advisory, loose, repair, recovery, or coercion modes;
- known-type registries, allowlists, callbacks, or support-policy inputs;
- byte input such as `Uint8Array`, `ArrayBuffer`, or Node.js `Buffer`;
- object input shapes or parser adapter hooks.

Callers that receive bytes must decode those bytes to a JavaScript string before
calling `vers-js`. Callers that need registry checks, advisory behavior, repair
suggestions, or configurable budgets must layer that behavior outside the v0.1.0
core API.

## Result types

All normal VERS validation outcomes use discriminated Result values:

```ts
export type VersResult<T> = VersSuccess<T> | VersFailure;

export interface VersSuccess<T> {
  ok: true;
  value: T;
}

export interface VersFailure {
  ok: false;
  issues: VersIssue[];
  metadata?: VersFailureMetadata;
}
```

`ok` is the only discriminator. Public callers must be able to narrow on
`result.ok` and receive the matching `value` or `issues` shape.

Failure results must describe malformed, non-canonical, oversized, or otherwise
invalid VERS strings. They must not expose parser internals such as tokens,
scanner state, generated parser nodes, mutable parser state, recovery state, or
runtime-specific objects.

## Operation-specific result aliases

The three public functions use operation-specific aliases:

```ts
export type VersParseResult = VersResult<VersRange>;
export type VersValidationResult = VersResult<true>;
export type VersCanonicalizeResult = VersResult<string>;
```

The aliases are part of the public type surface. They keep call-site intent clear
while preserving one shared Result contract.

## `parseVers()` behavior

`parseVers(input)` parses a valid canonical VERS declaration and returns syntax
metadata:

```ts
const result = parseVers("vers:npm/>=1.0.0|<2.0.0");

if (result.ok) {
  result.value.scheme; // "vers"
  result.value.type; // "npm"
  result.value.constraints; // parsed constraints in v0.1.0 core order
  result.value.canonical; // canonical VERS string
}
```

On success, `value` is a `VersRange`. On failure, `issues` contains public
diagnostics and `metadata` is present only when result metadata is needed.

`parseVers()` must not expose raw scanner tokens, parser nodes, decoded byte
buffers, or type-specific version objects.

## `validateVers()` behavior

`validateVers(input)` validates the same canonical VERS contract as `parseVers()`
without returning parsed syntax metadata.

On success, it returns:

```ts
{ ok: true, value: true }
```

The success value is the literal `true`. This keeps the Result shape uniform while
making the operation's payload intentionally minimal. It does not return the
input string, parsed metadata, canonical output, an empty object, or `undefined`.

On failure, `validateVers()` returns the same failure shape as the other public
functions.

## `canonicalizeVers()` behavior

`canonicalizeVers(input)` validates the same canonical VERS contract as
`parseVers()` and returns the canonical VERS string represented by the parsed
syntax metadata.

On success, it returns:

```ts
{ ok: true, value: "vers:npm/>=1.0.0|<2.0.0" }
```

The successful `value` must be equivalent to `parseVers(input).value.canonical`
for the same accepted input.

`canonicalizeVers()` is not a repair, cleanup, or coercion API. Malformed or
non-canonical strings fail with structured diagnostics rather than repaired
output.

## Successful parse data model

`VersRange` and `VersConstraint` are public plain-data types:

```ts
export interface VersRange {
  scheme: "vers";
  type: string;
  constraints: VersConstraint[];
  canonical: string;
}

export type VersConstraint = VersStarConstraint | VersVersionConstraint;

export interface VersStarConstraint {
  comparator: "*";
  version: null;
}

export interface VersVersionConstraint {
  comparator: "=" | "!=" | "<" | "<=" | ">" | ">=";
  version: string;
}
```

`scheme` is always `"vers"`. `type` is the validated lowercase VERS type string.
`constraints` contains the parsed constraints according to the v0.1.0 core order
rules. `canonical` is the canonical VERS string represented by the parsed value.

The model must not expose type-specific parsed version objects, comparison
results, containment checks, native range translations, resolver data,
vulnerability interpretation, or VEX semantics.

The detailed metadata and canonical-output contract is defined by
`data-model-and-canonical-output.md`.

## Diagnostic types

The public failure branch uses public issue and metadata types:

```ts
export interface VersIssue {
  code: VersIssueCode;
  message: string;
  severity: "error";
  span?: VersSpan;
}

export interface VersSpan {
  start: number;
  end: number;
}

export interface VersFailureMetadata {
  diagnostics?: VersDiagnosticsMetadata;
}

export interface VersDiagnosticsMetadata {
  truncated: true;
  maxIssues: number;
}
```

`VersIssue.message` is human-readable convenience text. It is not the stable
machine contract. Callers must use `code`, `severity`, `span`, and documented
metadata for machine behavior.

`VersSpan` offsets point into the original input string. The detailed coordinate
system and omission rules are defined by `diagnostics.md`.

## Issue-code exports

`VersIssue.code` uses only core-emitted v0.1.0 issue codes:

```ts
export type VersIssueCode = VersCoreIssueCode;

export type VersCoreIssueCode =
  | VersLexicalIssueCode
  | VersSyntaxIssueCode
  | VersConstraintIssueCode
  | VersCanonicalIssueCode
  | VersResourceIssueCode;

export type VersReservedIssueCode = VersReservedCanonicalIssueCode | VersSupportIssueCode;
```

`VersReservedIssueCode` is exported as reserved vocabulary but is not part of the
v0.1.0 `VersIssueCode` union. The core public functions must not return reserved
codes such as `support.unknown_type`, `support.unsupported_semantic`,
`canonical.non_canonical_order`, or `canonical.invalid_comparator_sequence`.

The complete active and reserved issue-code unions are defined by
`diagnostics.md`.

## Failure metadata

Failure metadata is presence-based. `metadata.diagnostics` is present only when
diagnostic issue-cap truncation occurs:

```ts
{
  ok: false,
  issues: [/* up to the applied issue cap */],
  metadata: {
    diagnostics: {
      truncated: true,
      maxIssues: 16
    }
  }
}
```

When diagnostics are not truncated, `metadata.diagnostics` is absent. The v0.1.0
core must not emit `diagnostics: { truncated: false }`.

Failure metadata must not expose scanner state, parser phases, token positions,
omitted issue counts, or recovery internals.

## Runtime input behavior

Public functions must check the runtime type of `input` before input length
limits, parsing, validation, canonicalization, or diagnostic collection.

If `input` is not a string, the function throws `TypeError`:

```ts
parseVers(null); // throws TypeError
validateVers(undefined); // throws TypeError
canonicalizeVers(new Uint8Array()); // throws TypeError
```

This exception path is limited to JavaScript API misuse. Malformed,
non-canonical, oversized, or otherwise invalid strings remain normal Result
failures:

```ts
parseVers("not-a-vers"); // { ok: false, issues: [...] }
```

The implementation must not coerce non-string values with `String(input)` before
parsing.

## Package import boundary

`vers-js` v0.1.0 is ESM-only and root-only.

Public examples must import from the package root:

```ts
import vers, { canonicalizeVers, parseVers, validateVers } from "vers-js";
```

The package must not support public subpath imports such as:

```ts
import { parseVers } from "vers-js/parser";
import type { VersIssue } from "vers-js/errors";
```

The package must not publish a CommonJS runtime artifact, `.cjs` entry point,
`"require"` conditional export, wildcard export, or runtime-specific export
condition for `"browser"`, `"deno"`, `"bun"`, or `"node"` in v0.1.0.

## Package metadata contract

The representative package boundary is:

```json
{
  "type": "module",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "sideEffects": false
}
```

The root `"types"` field and `"exports"["."].types` condition must point to the
same declaration entry point. The `"types"` condition must appear before runtime
conditions in the root export object.

The exact output directory may be refined in `build-and-test.md`, but the v0.1.0
package must preserve the ESM-only, root-only, universal default export shape.

## Default export

The package root must also provide a default export for runtime import
compatibility. The default export is an object containing the three public core
functions:

```ts
declare const vers: {
  parseVers: typeof parseVers;
  validateVers: typeof validateVers;
  canonicalizeVers: typeof canonicalizeVers;
};

export default vers;
```

The default export must not include parser internals, issue-code registries,
fixture helpers, package metadata, or runtime-specific adapters.

Named exports remain the preferred API for tree-shakable TypeScript use. The
default export exists so runtime imports in Node.js, Deno, Bun, browser-oriented
tooling, and dynamic import contexts can access one universal package value.

## Exported public types

The package root should export the types needed to consume public Result values:

- `VersResult`;
- `VersSuccess`;
- `VersFailure`;
- `VersFailureMetadata`;
- `VersDiagnosticsMetadata`;
- `VersParseResult`;
- `VersValidationResult`;
- `VersCanonicalizeResult`;
- `VersRange`;
- `VersConstraint`;
- `VersStarConstraint`;
- `VersVersionConstraint`;
- `VersIssue`;
- `VersSpan`;
- `VersIssueCode`;
- `VersCoreIssueCode`;
- issue-code namespace unions defined by `diagnostics.md`;
- `VersReservedIssueCode` and its reserved namespace unions.

The package root must not export implementation-only parser state, scanner token
types, mutable builders, fixture runner internals, or runtime-specific adapter
types.

## Public API invariants

Implementation, tests, and examples must preserve these invariants:

1. The only v0.1.0 parser functions are `parseVers()`, `validateVers()`, and
   `canonicalizeVers()`.
2. Each parser function accepts exactly one public `string` argument.
3. Non-string runtime input throws `TypeError` before parsing or diagnostic
   collection.
4. Malformed or non-canonical string input returns a Result failure rather than
   throwing.
5. `validateVers()` success is `{ ok: true, value: true }`.
6. `canonicalizeVers()` success returns the same canonical string exposed by a
   successful parse of the same input.
7. Failure metadata uses presence-based diagnostic truncation; non-truncated
   failures omit `metadata.diagnostics`.
8. Public results expose stable data only, never parser internals or
   runtime-specific objects.
9. Package consumers import runtime values and public types from `"vers-js"`
   only.
10. The package remains ESM-only, root-only, and runtime-agnostic in v0.1.0.
