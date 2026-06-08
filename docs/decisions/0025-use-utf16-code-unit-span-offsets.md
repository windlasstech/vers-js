---
parent: Decisions
nav_order: 25
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use UTF-16 Code Unit Span Offsets

## Context and Problem Statement

ADR-0023 decides that `VersSpan` indexes the original input string. ADR-0024
decides that spans use zero-based half-open offsets. The package still needs to
define what those numeric offsets count. JavaScript strings are indexed by UTF-16
code units, while Unicode code points, grapheme clusters, and UTF-8 bytes can have
different lengths for the same displayed text.

Which character unit should `VersSpan` offsets count?

## Decision Drivers

- The public API accepts JavaScript strings, not byte arrays.
- Callers should be able to use spans directly with built-in string operations.
- Span behavior should remain identical across Node.js, Deno, Bun, and browsers.
- Version text may contain percent-encoded non-ASCII UTF-8 bytes that decode to
  JavaScript strings.
- The span contract should avoid runtime-specific byte containers or Unicode
  segmentation APIs.

## Considered Options

- UTF-16 code unit offsets
- Unicode code point offsets
- UTF-8 byte offsets
- Grapheme cluster offsets

## Decision Outcome

Chosen option: "UTF-16 code unit offsets", because JavaScript string indexing,
`String.prototype.length`, and `String.prototype.slice()` are UTF-16 code-unit
based, and vers-js exposes a string-first TypeScript API.

`VersSpan.start` and `VersSpan.end` count UTF-16 code units in the original input
string. If a character is represented by a surrogate pair, it occupies two span
offset units. This matches the indexing used by JavaScript string methods and the
default position encoding required by the Language Server Protocol.

Spans do not count UTF-8 bytes from the percent-encoded representation, decoded
UTF-8 bytes, Unicode code points, or user-perceived grapheme clusters.

### Consequences

- Good, because `input.slice(span.start, span.end)` works without conversion.
- Good, because implementation can track offsets with ordinary JavaScript string
  indices.
- Good, because the contract is portable across JavaScript runtimes.
- Good, because it aligns with the LSP default UTF-16 position encoding when
  downstream tools adapt spans to editor ranges.
- Bad, because displayed characters outside the Basic Multilingual Plane occupy
  two span units rather than one.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- span documentation says offsets are UTF-16 code units;
- tests include at least one non-ASCII or surrogate-pair case when relevant to
  span behavior;
- implementation does not convert public spans to UTF-8 byte, Unicode code point,
  or grapheme-cluster offsets;
- examples that extract spanned input use JavaScript string slicing.

## Pros and Cons of the Options

### UTF-16 code unit offsets

This option uses the same units as JavaScript string indexing.

- Good, because it matches the package's TypeScript/JavaScript public API.
- Good, because it is efficient and requires no additional segmentation logic.
- Good, because all supported JavaScript runtimes expose the same string indexing
  model.
- Bad, because user-perceived characters and span units can differ for surrogate
  pairs and composed grapheme clusters.

### Unicode code point offsets

This option counts Unicode scalar positions rather than UTF-16 code units.

- Good, because it is closer to a Unicode character model than UTF-16 indexing.
- Good, because code point counts are independent of surrogate-pair internals.
- Bad, because JavaScript strings are not indexed by code point.
- Bad, because extracting a span requires conversion from code point offsets to
  UTF-16 indices.
- Bad, because code points still do not match user-perceived grapheme clusters.

### UTF-8 byte offsets

This option counts bytes in a UTF-8 representation of the input.

- Good, because VERS percent-encoding is byte-oriented after UTF-8 encoding.
- Good, because byte offsets can be convenient for file or network protocols.
- Bad, because vers-js v1 accepts strings, not byte buffers.
- Bad, because byte offsets cannot be used directly with JavaScript string
  methods.
- Bad, because it would complicate runtime-agnostic code and public fixtures.

### Grapheme cluster offsets

This option counts user-perceived characters.

- Good, because it can align better with visual cursor movement in UI text.
- Bad, because grapheme segmentation is locale- and Unicode-version-sensitive.
- Bad, because it requires heavier processing than the parser needs.
- Bad, because it does not align with JavaScript string indexing or common parser
  range APIs.

## More Information

This decision refines the character unit for `VersSpan` offsets. ADR-0023 decides
the coordinate space, and ADR-0024 decides the zero-based half-open range shape.
The omission policy for unreliable locations is decided separately.

External references:

- MDN `String.length`:
  <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/length>
- MDN `String.prototype.codePointAt()`:
  <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt>
- Language Server Protocol position encodings:
  <https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#position>

This decision should be revisited if one of the following becomes true:

- vers-js adds a byte-oriented input API;
- public spans need to target non-JavaScript runtimes without UTF-16 string
  indexing;
- downstream UI integrations require first-party grapheme-cluster display spans.
