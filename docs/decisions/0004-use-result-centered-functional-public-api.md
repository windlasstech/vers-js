---
parent: Decisions
nav_order: 4
status: accepted
date: 12026-06-07
decision-makers: Yunseo Kim
---

# Use a Result-Centered Functional Public API

## Context and Problem Statement

The first vers-js release will implement canonical VERS syntax validation and
parsed declaration metadata in TypeScript. ADR-0001 established that the package
API should be stable, data-oriented, and based on explicit success/failure
results with machine-readable error codes rather than parser internals or
stringly thrown errors.

VERS parsing and validation are expected to report structured errors for
non-canonical or malformed input such as ASCII whitespace, invalid casing,
missing constraints, malformed pipe separators, empty versions, invalid `*`
usage, invalid percent-encoding, and unsupported forms. First-release consumers
such as Alexandria, shelf CLI, publisher UI, bibliothecas, and Agent Volumes
tooling need predictable data they can adapt into their own diagnostics and
Problem Details payloads.

Which public API shape should vers-js expose for the first reusable VERS parser
and validation package?

## Decision Drivers

- The public API should be stable enough for downstream adapters to depend on
  while leaving the parser implementation replaceable.
- Consumers should be able to handle validation failures without relying on
  exceptions as the primary control flow.
- Machine-readable error codes should be part of the public contract so
  downstream tools can map errors into their own issue taxonomies.
- The first release should expose syntax validation and parsed metadata only,
  without comparison, containment, native range translation, resolver behavior,
  vulnerability interpretation, or VEX semantics.
- The API should feel natural in TypeScript and JavaScript, including simple type
  narrowing for success and failure cases.
- The published library must remain runtime-agnostic across Node.js, Deno, and
  Bun.

## Considered Options

- Result-centered functional API
- Zod-style dual API with throwing and non-throwing variants
- Minimal boolean/null utility API
- Object-oriented range API

## Decision Outcome

Chosen option: "Result-centered functional API", because it gives consumers a
stable, data-oriented, non-throwing primary contract with typed success/failure
results and machine-readable issues while keeping parser internals hidden and
future semantic behavior out of the first public surface.

The public API will expose functional entry points equivalent to:

```ts
parseVers(input: string): VersParseResult;
validateVers(input: string): VersValidationResult;
canonicalizeVers(input: string): VersCanonicalizeResult;
```

The exact exported type names may be refined during implementation, but the
primary result contract must be a discriminated union equivalent to:

```ts
type VersResult<T> = { ok: true; value: T } | { ok: false; issues: VersIssue[] };
```

`parseVers()` returns parsed VERS syntax metadata when the input is valid and
canonical. `validateVers()` returns structured validation success or failure.
`canonicalizeVers()` returns the canonical VERS string when the input is valid
and canonical. None of these functions should expose internal parser nodes,
lexer tokens, generated-parser artifacts, or runtime-specific objects.

Throwing convenience wrappers may be considered later, but they must not become
the primary API contract for the first release. Boolean-only helpers may also be
added later if they wrap the structured result API without replacing it.

### Consequences

- Good, because downstream tools can branch on `ok` and receive typed result data
  without exception handling.
- Good, because machine-readable issues can be mapped into consumer-specific
  diagnostics, manifest issue codes, and Problem Details payloads.
- Good, because a small functional surface keeps the parser core replaceable
  behind the package boundary.
- Good, because the API matches TypeScript discriminated-union conventions used
  by non-throwing parser and validator APIs.
- Good, because comparison, containment, and resolver-like behavior remain absent
  from the first public API.
- Neutral, because callers that prefer throwing parsers need to add a small local
  wrapper until or unless vers-js exposes one.
- Bad, because separate parse, validate, and canonicalize result types introduce
  more public type surface than a minimal boolean or nullable parser API.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- the package exports public functions equivalent to `parseVers()`,
  `validateVers()`, and `canonicalizeVers()`;
- the primary public contract returns discriminated success/failure result
  objects rather than throwing as normal validation control flow;
- failure results include machine-readable issue codes;
- public result values expose stable data, not parser internals;
- unsupported semantic operations such as comparison, containment, native range
  translation, resolver behavior, vulnerability interpretation, and VEX semantics
  are absent from the first public API or explicitly marked unsupported.

## Pros and Cons of the Options

### Result-centered functional API

This option exposes pure functions whose primary contract is a discriminated
success/failure result.

- Good, because it satisfies the ADR-0001 requirement for explicit results and
  machine-readable errors.
- Good, because TypeScript callers can narrow on `ok` and receive precise value
  or issue types.
- Good, because it avoids exception-driven validation flow in downstream tools.
- Good, because it keeps the package runtime-agnostic and data-oriented.
- Bad, because it is slightly more verbose for simple one-off validation checks.

### Zod-style dual API with throwing and non-throwing variants

This option exposes a throwing parser such as `parseVers()` and a non-throwing
variant such as `safeParseVers()`.

- Good, because many TypeScript developers recognize this convention.
- Good, because it provides a concise API for callers that want exceptions.
- Bad, because making the throwing path prominent would encourage consumers to
  depend on exception behavior instead of structured issue results.
- Bad, because it weakens the distinction between human-readable error messages
  and machine-readable error codes.

### Minimal boolean/null utility API

This option exposes helpers such as `isValidVers()` and `parseVers()` returning a
nullable parsed value.

- Good, because the API is very small and easy to call.
- Bad, because callers lose structured diagnostics and machine-readable issue
  codes.
- Bad, because downstream adapters cannot reliably map failures into their own
  issue taxonomies.
- Bad, because `null` or `false` is not enough to debug VERS conformance failures.

### Object-oriented range API

This option exposes a class or object model such as `VersRange.parse(input)` with
methods on the returned range object.

- Good, because it can be convenient if future semantic operations such as
  containment are added.
- Good, because it resembles some existing version-range library designs.
- Bad, because it invites scope creep toward comparison, containment, and
  resolver-like behavior in the first release.
- Bad, because it is less data-oriented than a plain result/value API and can make
  parser-core replacement harder to preserve.

## More Information

This decision refines the public API consequence of ADR-0001.

External references:

- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- VERS tests overview:
  <https://github.com/package-url/vers-spec/blob/main/docs/tests.md>
- Zod safe parsing convention: <https://zod.dev/basics>
- Valibot `safeParse()` convention: <https://valibot.dev/api/safeParse/>
- io-ts `Either`-returning decode convention: <https://gcanti.github.io/io-ts/>

This decision should be revisited if one of the following becomes true:

- consumers consistently need throwing convenience APIs and can use them without
  weakening the structured result contract;
- future VERS semantic operations require a separate higher-level API surface;
- the public result shape blocks compatibility with a future Rust, WebAssembly,
  native, or third-party parser core.
