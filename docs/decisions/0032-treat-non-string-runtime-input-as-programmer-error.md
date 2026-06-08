---
parent: Decisions
nav_order: 32
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Treat Non-String Runtime Input as Programmer Error

## Context and Problem Statement

ADR-0031 limits the v1 public parser contract to one string argument. TypeScript
callers get that contract at compile time, but JavaScript callers and unchecked
TypeScript code can still call `parseVers()`, `validateVers()`, or
`canonicalizeVers()` with `null`, `undefined`, numbers, objects, byte arrays, or
other non-string values.

The package must decide whether such runtime misuse is part of VERS validation or
a programmer error outside the normal Result failure branch.

How should v1 public functions handle non-string runtime input?

## Decision Drivers

- `VersIssue` should describe problems in a VERS string, not misuse of the
  JavaScript API.
- Diagnostic spans, input length checks, and canonicalization all assume an input
  string.
- Implicit coercion such as `String(value)` can turn programmer mistakes into
  misleading VERS strings.
- The primary Result contract should still handle malformed or non-canonical string
  input without throwing.
- JavaScript callers should receive a clear failure for violating the API contract.

## Considered Options

- Throw `TypeError` for non-string runtime input
- Return a validation failure issue for non-string input
- Coerce non-string values with `String(input)`
- Accept selected non-string values through adapters

## Decision Outcome

Chosen option: "Throw `TypeError` for non-string runtime input", because a
non-string argument violates the JavaScript API contract rather than the VERS
string syntax.

v1 public functions will check that `input` is a string before applying input
length limits, parsing, validation, canonicalization, or diagnostic collection. If
the value is not a string, the function will throw `TypeError`.

This exception path is limited to programmer errors such as violating the public
function signature. Malformed, non-canonical, oversized, or otherwise invalid VERS
strings remain normal validation failures returned through the Result failure
branch selected by ADR-0004.

The implementation must not coerce non-string values into strings before parsing.

### Consequences

- Good, because API misuse is reported clearly and early.
- Good, because `VersIssue` remains focused on source-level VERS diagnostics.
- Good, because `null`, `undefined`, objects, and byte arrays cannot be silently
  interpreted as surprising strings.
- Good, because normal malformed string input still uses structured Result
  failures.
- Neutral, because JavaScript callers may need `try`/`catch` around untyped values.
- Bad, because not every runtime failure uses the Result shape.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- public functions throw `TypeError` before parsing when `input` is not a string;
- non-string values are never converted with `String(input)` as part of parsing;
- malformed string values return `{ ok: false, issues: [...] }` rather than
  throwing as normal validation control flow;
- tests cover representative non-string calls and malformed string calls;
- documentation distinguishes API misuse from VERS validation failure.

## Pros and Cons of the Options

### Throw `TypeError` for non-string runtime input

This option treats non-string calls as programmer error.

- Good, because it matches the TypeScript signature and JavaScript conventions for
  invalid argument types.
- Good, because it prevents confusing diagnostics for values that were never VERS
  strings.
- Good, because it keeps the validation issue catalog smaller.
- Bad, because callers cannot handle all bad inputs with only `result.ok`.

### Return a validation failure issue for non-string input

This option returns `{ ok: false, issues: [...] }` for non-string values.

- Good, because every bad runtime input follows the Result branch.
- Bad, because the issue would not describe invalid VERS syntax.
- Bad, because span and input-length semantics are undefined for non-string values.
- Bad, because it invites an API-misuse issue namespace into the parser catalog.

### Coerce non-string values with `String(input)`

This option parses the string conversion of every value.

- Good, because it is permissive and resembles some Web platform APIs.
- Bad, because objects become implementation-dependent or unhelpful strings such
  as `[object Object]`.
- Bad, because it hides caller bugs and can produce misleading diagnostics.

### Accept selected non-string values through adapters

This option supports special cases such as `Uint8Array` or objects with explicit
decoder hooks.

- Good, because it can improve ergonomics for some callers.
- Bad, because it conflicts with ADR-0031's single-string v1 input contract.
- Bad, because adapter validation and decode errors need their own public policy.

## More Information

This decision refines ADR-0031's string-only public contract and ADR-0004's
Result-centered validation behavior. It does not change the rule that malformed
VERS strings return structured diagnostics.

External references:

- MDN `TypeError`:
  <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError>
- MDN `URL()` constructor, which throws `TypeError` for invalid URL construction:
  <https://developer.mozilla.org/en-US/docs/Web/API/URL/URL>
- Zod basics, showing a separate throwing parser and non-throwing `safeParse()`:
  <https://zod.dev/basics>

This decision should be revisited if one of the following becomes true:

- vers-js adds a separate JavaScript-friendly coercion or adapter layer;
- downstream callers need an `unknown`-input validator as a distinct API;
- a future public options API introduces explicit input decoding behavior.
