---
parent: Decisions
nav_order: 31
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Accept Only Single String Input in the V1 API

## Context and Problem Statement

ADR-0004 selects public functions equivalent to `parseVers(input: string)`,
`validateVers(input: string)`, and `canonicalizeVers(input: string)`. ADR-0030
keeps resource options out of the first release and reserves future options for a
later API. The VERS specification describes a VERS as an ASCII URI string.

The first release still needs to make the function arity and input domain explicit.
Without a separate decision, v1 could drift toward accepting option objects,
`Uint8Array`, `ArrayBuffer`, Node.js `Buffer`, parser callbacks, registry objects,
or other convenience input shapes that expand the public API before the core string
parser is implemented.

Should v1 public parser functions accept only a single string argument?

## Decision Drivers

- The first public API should stay small, data-oriented, and stable.
- VERS is specified as a string notation, not a byte-stream or object format.
- Diagnostic spans selected by ADR-0023, ADR-0024, and ADR-0025 are defined over
  the original JavaScript input string.
- Byte inputs would require public decoding rules, invalid-byte behavior, and span
  coordinate mapping.
- Future options should remain possible without committing to option names in v1.

## Considered Options

- Single string argument only
- String plus optional options object
- String or byte-array input
- Polymorphic input adapters in core functions

## Decision Outcome

Chosen option: "Single string argument only", because it matches the VERS string
model, the ADR-0004 function signatures, and the v1 goal of a minimal core parser.

The v1 public contract is:

```ts
parseVers(input: string): VersParseResult;
validateVers(input: string): VersValidationResult;
canonicalizeVers(input: string): VersCanonicalizeResult;
```

These functions accept exactly one public argument: the VERS declaration string.
They do not accept a v1 options object, registry callback, warning-mode flag,
resource-budget override, byte buffer, array buffer, or object input shape.

Callers that receive bytes must decode those bytes to a JavaScript string before
calling vers-js. Callers that need registry checks, advisory behavior, repair
suggestions, or configurable resource budgets must layer that behavior outside the
v1 core API until a later ADR adds a dedicated public surface.

### Consequences

- Good, because v1 call sites and TypeScript declarations are simple.
- Good, because diagnostic coordinates always refer to the original input string.
- Good, because byte decoding and adapter behavior stay outside the runtime-agnostic
  core.
- Good, because future option APIs remain deliberate rather than accidental.
- Neutral, because callers can still build wrapper functions around the core API.
- Bad, because byte-oriented callers must perform a separate decode step.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- v1 public declarations expose one required `string` parameter for each core
  function;
- no overload accepts `Uint8Array`, `ArrayBuffer`, `Buffer`, object input, or an
  options parameter;
- documentation tells callers to decode bytes before calling vers-js;
- tests and examples call public functions with a single string argument;
- future option names are not exposed in v1 public types.

## Pros and Cons of the Options

### Single string argument only

This option keeps every v1 core function as a one-argument string parser.

- Good, because it follows the VERS specification's string notation directly.
- Good, because it preserves the small function surface selected by ADR-0004.
- Good, because it aligns with string-based parser APIs such as `JSON.parse()` and
  Babel parser `parse(code, options)` where the parsed source text itself is a
  string.
- Bad, because input adapters are left to callers or future helper APIs.

### String plus optional options object

This option adds an optional second argument in v1.

- Good, because future features could be added under a familiar options shape.
- Bad, because even an empty options object becomes public API surface.
- Bad, because it conflicts with ADR-0030's decision to reserve resource options
  for a later release.

### String or byte-array input

This option accepts JavaScript strings and byte-oriented inputs such as
`Uint8Array`.

- Good, because callers with encoded data can pass it directly.
- Bad, because vers-js would need to define decoding, malformed-byte diagnostics,
  and byte-to-string span mapping.
- Bad, because Node.js `Buffer` is runtime-specific and conflicts with the
  runtime-agnostic package constraint.

### Polymorphic input adapters in core functions

This option accepts records, objects with `toString()`, URL-like objects, or other
adapter shapes.

- Good, because it can be convenient in JavaScript.
- Bad, because implicit coercion can hide caller bugs and create surprising input
  strings.
- Bad, because it expands parser responsibility beyond validating VERS syntax.

## More Information

This decision refines the public function signatures selected by ADR-0004 and the
future-options reservation selected by ADR-0030. Non-string runtime behavior is
decided separately in ADR-0032.

External references:

- VERS specification:
  <https://github.com/package-url/vers-spec/blob/main/docs/standard/specification.md>
- MDN `JSON.parse()`:
  <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse>
- Babel parser options:
  <https://babeljs.io/docs/babel-parser#options>

This decision should be revisited if one of the following becomes true:

- a future release adds a dedicated options object;
- callers consistently need first-party byte decoding helpers;
- a non-JavaScript core changes the public coordinate model for diagnostics.
