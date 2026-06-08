---
title: Character Encoding
parent: Architecture Specifications
nav_order: 4
---

# Character Encoding

This specification defines the character, percent-escape, UTF-8 decoding, and
canonical percent-serialization contract for `vers-js` v0.1.0.

Primary ADR inputs: ADR-0015, ADR-0017, ADR-0018, ADR-0019, ADR-0020,
ADR-0023, ADR-0024, ADR-0025, ADR-0026, and ADR-0042.

## Input string model

Public entry points accept one JavaScript string. They do not accept byte arrays,
runtime-specific buffers, or decoded metadata objects.

The input string is scanned as UTF-16 code units for source positions. Diagnostic
spans, when present, point into the original input string using zero-based,
half-open UTF-16 code-unit offsets. They do not index decoded version strings,
decoded UTF-8 bytes, or canonical output.

The VERS declaration itself is an ASCII-oriented URI-like string. Non-ASCII
version text is represented in the input through percent-encoded UTF-8 bytes, then
exposed in successful metadata as decoded JavaScript string text.

## Type character policy

The VERS `type` component is validated as syntax-only metadata. It is not decoded
and must not contain percent escapes.

The type must satisfy all of these rules:

1. The first character is an ASCII lowercase letter: `a` through `z`.
2. Every later character is one of:
   - ASCII lowercase letter `a` through `z`;
   - ASCII digit `0` through `9`;
   - period `.`;
   - dash `-`.
3. Uppercase ASCII letters are invalid in canonical input.
4. Percent signs are invalid in the type component, even when followed by valid
   hex digits.
5. Non-ASCII characters are invalid in the type component.

The successful `VersRange.type` value is the input type text after validation. The
parser does not lowercase, percent-decode, repair, or registry-check the type.

Examples:

```text
vers:npm/1.0.0          valid type: npm
vers:generic-type/1     valid type: generic-type
vers:foo.bar/1          valid type: foo.bar
vers:NPM/1.0.0          invalid uppercase type
vers:n%70m/1.0.0        invalid percent-encoded type text
vers:1npm/1.0.0         invalid type start
```

## Version raw character policy

Version components use a stricter canonical raw-character policy than the type.
Only RFC 3986 unreserved characters may appear raw in a canonical version
component:

```text
A-Z a-z 0-9 - . _ ~
```

All other version text must be represented by percent-encoded UTF-8 bytes in the
input and in canonical output.

Raw non-unreserved version characters are non-canonical v0.1.0 input and must
fail. The parser must not accept them and then repair them into percent-encoded
canonical output.

This rejection includes:

- ASCII whitespace;
- `%` when it is not the start of a valid percent escape;
- URI reserved characters such as `/`, `?`, `#`, `[`, `]`, and `@`;
- sub-delimiters such as `!`, `$`, `&`, `'`, `(`, `)`, `*`, `+`, `,`, `;`, and
  `=`;
- VERS separators and comparators such as `|`, `<`, `>`, `=`, `!`, and `*` when
  they occur as version text rather than recognized syntax;
- non-ASCII characters written raw in the JavaScript input string.

The one exception is VERS syntax itself. Comparators and separators are parsed
before version character validation. For example, the leading `>=` in
`vers:npm/>=1.0.0` is comparator syntax, not version text. A literal `>` inside a
version string must be percent-encoded as `%3E`.

## Percent escape syntax

A percent escape in version text has exactly this shape:

```text
%HH
```

Each `H` is one ASCII hexadecimal digit: `0` through `9`, `A` through `F`, or `a`
through `f`.

The parser accepts uppercase, lowercase, and mixed-case percent hex in input.
Malformed percent escape syntax fails with `constraint.invalid_percent_encoding`.

Malformed forms include:

```text
%
%0
%G0
%0G
%zz
```

The span for malformed percent escape syntax should cover the malformed escape
region in the original input when that region is reliable. For example, `%G0`
should be spanned as the three-code-unit sequence `%G0`; a trailing bare `%` may
span the single `%` code unit.

If a malformed escape occurs after a fatal structural boundary where the parser
cannot reliably identify version text, the diagnostic must omit `span` rather than
guess.

## Percent-decoding and UTF-8

After constraint syntax validation identifies a version component, the parser
performs at most one percent-decoding pass for that version component.

The decoding process is:

1. Treat every raw unreserved character as literal text.
2. Convert every `%HH` escape into its byte value.
3. Decode percent-encoded byte runs as UTF-8.
4. Append decoded text to the version string.
5. Treat decoded text as final version text. Do not decode it again.

Syntactically valid percent escapes whose bytes are not valid UTF-8 fail with
`constraint.invalid_utf8`. Invalid byte sequences must not be replaced with
`U+FFFD`, preserved as raw bytes, or otherwise repaired.

The span for invalid UTF-8 should cover the percent-escaped byte sequence that
participates in the invalid UTF-8 sequence when that sequence is reliable in the
original input. If the precise byte sequence is not reliable, the diagnostic must
omit `span`.

Examples:

```text
vers:generic/%C3%A9     valid, decoded version is "é"
vers:generic/%c3%a9     valid, decoded version is "é"
vers:generic/%E2%82%AC  valid, decoded version is "€"
vers:generic/%C3%28     invalid UTF-8
vers:generic/%E2%82     invalid UTF-8
vers:generic/%FF        invalid UTF-8
```

## Single-pass literal percent behavior

Decoded percent signs are literal version text. They are not interpreted as a
second layer of escapes, VERS syntax, comparators, or separators.

Examples:

```text
vers:generic/%25        decoded version is "%"
vers:generic/%252F      decoded version is "%2F"
vers:generic/%253E      decoded version is "%3E"
```

`%252F` decodes once to `%2F`. It does not decode a second time to `/`.
Canonical output for that decoded version is still `%252F` because the literal
percent sign in `%2F` must be encoded as `%25`.

Downstream consumers must not percent-decode successful `version` metadata or
canonical output again. A second decoding pass is outside the `vers-js` core
contract and can change version meaning.

## Canonical percent serialization

Canonical output is built from decoded metadata, not by preserving raw input
spelling.

To serialize a decoded version string into a canonical version component:

1. Iterate over the decoded string as Unicode scalar values.
2. Leave RFC 3986 unreserved ASCII characters raw:
   `A-Z`, `a-z`, `0-9`, `-`, `.`, `_`, and `~`.
3. Encode every other character to UTF-8 bytes.
4. Percent-encode each byte as `%HH` using uppercase hexadecimal digits.

Canonical serialization does not use HTML form encoding. A space serializes as
`%20`, never `+`.

Examples:

```text
Decoded version      Canonical version component
1.0.0                1.0.0
build_meta           build_meta
alpha~1              alpha~1
has space            has%20space
100%                 100%25
1/2                  1%2F2
é                    %C3%A9
```

Percent hex case is not preserved. Inputs such as `%c3%a9`, `%C3%A9`, and
`%c3%A9` all decode to `é` and canonicalize to `%C3%A9`.

## Success and failure boundaries

Successful version metadata exposes decoded strings. It does not expose raw
percent escapes, decoded byte arrays, or a source-to-canonical mapping.

An input succeeds only when all of the following are true:

- the type component satisfies the type character policy;
- each version component contains only raw unreserved characters and valid percent
  escapes;
- every percent-encoded byte sequence decodes as valid UTF-8;
- decoded percent signs and percent-looking substrings are treated as literal
  version text under the single-pass decoding contract;
- the decoded metadata passes later canonicality checks such as exact
  decoded-string duplicate detection.

An input fails when any of the following occur:

- type text contains invalid characters, uppercase letters, percent escapes, or a
  non-letter first character;
- version text contains raw non-unreserved characters;
- percent escape syntax is malformed;
- percent-encoded bytes are syntactically valid but invalid UTF-8;
- a raw percent sign is present outside a valid `%HH` escape;
- later canonicality validation rejects the decoded metadata.

## Issue-code boundary

This document defines encoding conditions, not the complete diagnostic table. The
full public issue-code table, fatality policy, ordering policy, and message policy
are defined by `diagnostics.md`.

Encoding-related conditions must map to the active v0.1.0 core issue vocabulary:

- malformed percent escape syntax uses `constraint.invalid_percent_encoding`;
- syntactically valid percent escapes that fail UTF-8 decoding use
  `constraint.invalid_utf8`;
- invalid type characters or casing use the matching syntax issue codes defined
  by `diagnostics.md`;
- raw non-unreserved version characters use the matching lexical or constraint
  issue code defined by `diagnostics.md`.

The parser must not emit reserved support diagnostics for type registry policy and
must not emit reserved semantic canonical diagnostics for type-specific
comparison, ordering, or normalization.

## Examples

### Lowercase percent hex

Input:

```text
vers:generic/%c3%a9
```

Successful metadata:

```ts
{
  scheme: "vers",
  type: "generic",
  constraints: [
    { comparator: "=", version: "é" }
  ],
  canonical: "vers:generic/%C3%A9"
}
```

### Encoded syntax character

Input:

```text
vers:generic/1%2F2
```

Successful metadata:

```ts
{
  scheme: "vers",
  type: "generic",
  constraints: [
    { comparator: "=", version: "1/2" }
  ],
  canonical: "vers:generic/1%2F2"
}
```

### Raw syntax character in version text

Input:

```text
vers:generic/1/2
```

This fails because `/` is not an unreserved raw version character. The parser must
not repair it to `vers:generic/1%2F2`.

### Literal percent sign

Input:

```text
vers:generic/%25
```

Successful metadata:

```ts
{
  scheme: "vers",
  type: "generic",
  constraints: [
    { comparator: "=", version: "%" }
  ],
  canonical: "vers:generic/%25"
}
```

### Double-encoded-looking version

Input:

```text
vers:generic/%252F
```

Successful metadata:

```ts
{
  scheme: "vers",
  type: "generic",
  constraints: [
    { comparator: "=", version: "%2F" }
  ],
  canonical: "vers:generic/%252F"
}
```

The decoded version string is `%2F`, not `/`.

### Invalid UTF-8

Input:

```text
vers:generic/%C3%28
```

This fails with `constraint.invalid_utf8` because `%C3%28` is syntactically valid
percent escaping but does not decode as valid UTF-8 text.

## Invariants

Implementation and tests must preserve these invariants:

1. Public input is a JavaScript string, not bytes.
2. Type text is ASCII syntax only, not percent-decoded metadata.
3. Valid type text starts with lowercase `a` through `z` and then uses only
   lowercase letters, digits, `.`, and `-`.
4. Unknown but syntactically valid lowercase types are accepted by the core parser.
5. Version raw characters are limited to RFC 3986 unreserved characters.
6. Raw non-unreserved version characters fail rather than being repaired.
7. Percent escapes accept uppercase and lowercase hex input.
8. Malformed percent escapes fail with `constraint.invalid_percent_encoding`.
9. Percent-encoded bytes must decode as valid UTF-8 or fail with
   `constraint.invalid_utf8`.
10. Decoding is single-pass; decoded percent-looking text remains literal.
11. Canonical output percent-encodes every non-unreserved decoded character as
    UTF-8 bytes with uppercase hex.
12. Canonical output never uses `+` for space.
13. Successful metadata exposes decoded version strings only, not raw spelling or
    decoded byte arrays.
14. Encoding-related spans, when present, index the original input string with
    zero-based half-open UTF-16 code-unit offsets.
15. Unreliable encoding-related locations omit `span` rather than guessing.
