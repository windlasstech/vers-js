---
parent: Decisions
nav_order: 24
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use Zero-Based Half-Open Span Offsets

## Context and Problem Statement

ADR-0007 defines `VersSpan` with `start` and `end` numeric fields, and ADR-0023
decides that those fields index the original input string. The remaining public
contract must define whether offsets are zero-based or one-based and whether
`end` is inclusive or exclusive.

Which numeric indexing convention should `VersSpan` use?

## Decision Drivers

- The span shape should be natural for TypeScript and JavaScript callers.
- Callers should be able to extract the spanned input text without off-by-one
  conversion.
- Empty or insertion-point spans should remain representable if future diagnostics
  need them.
- Fixture expectations should be simple and deterministic.
- The convention should align with common parser, linting, editor, and compiler
  range conventions where practical.

## Considered Options

- Zero-based half-open offsets
- Zero-based inclusive offsets
- One-based inclusive offsets
- Start plus length

## Decision Outcome

Chosen option: "Zero-based half-open offsets", because it aligns with JavaScript
string APIs, ESTree/Babel/ESLint range conventions, and editor-style exclusive-end
ranges while preserving the existing `{ start, end }` span shape from ADR-0007.

`VersSpan` will use zero-based offsets with an exclusive end boundary:

```ts
interface VersSpan {
  start: number;
  end: number;
}
```

For a span `s`, `input.slice(s.start, s.end)` returns the authored input region
identified by the issue. `start` is the offset of the first included code unit,
and `end` is the offset immediately after the last included code unit. A zero-width
span may be represented as `{ start: n, end: n }` when an issue is best described
as a point between two input code units.

### Consequences

- Good, because callers can pass span fields directly to `String.prototype.slice()`.
- Good, because adjacent spans compose naturally: one span can end where the next
  begins.
- Good, because the convention matches ESLint fixer ranges and LSP-style exclusive
  end positions.
- Good, because zero-width point diagnostics can be represented without special
  sentinel values.
- Bad, because users reading raw JSON diagnostics need to know that `end` is
  exclusive rather than inclusive.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- `VersSpan` documentation defines `start` and `end` as zero-based offsets;
- `end` is documented as exclusive;
- tests assert spanned text with `input.slice(span.start, span.end)`;
- fixtures do not use one-based or inclusive-end span expectations.

## Pros and Cons of the Options

### Zero-based half-open offsets

This option uses `[start, end)` offsets into the original input string.

- Good, because it matches JavaScript slicing and many parser/linter range APIs.
- Good, because empty ranges are representable.
- Good, because range length is `end - start`.
- Bad, because exclusive end must be documented for humans reading diagnostics.

### Zero-based inclusive offsets

This option uses zero-based offsets where both `start` and `end` are included in
the range.

- Good, because it keeps zero-based starts while making `end` look like the last
  visible character position.
- Bad, because callers need `input.slice(start, end + 1)`.
- Bad, because empty ranges need a sentinel or convention.
- Bad, because range length is less direct and off-by-one errors are more likely.

### One-based inclusive offsets

This option uses the convention common in human-facing line/column displays.

- Good, because non-programmer users may find one-based positions familiar.
- Bad, because JavaScript strings, parser offsets, and fixture code are zero-based.
- Bad, because every extraction or comparison requires conversion.
- Bad, because it does not fit the low-level public `{ start, end }` offset shape.

### Start plus length

This option represents spans as `{ start, length }`, similar to TypeScript's
compiler `TextSpan` shape.

- Good, because the size of the spanned region is explicit.
- Good, because it avoids inclusive/exclusive end confusion.
- Bad, because ADR-0007 already introduced a `{ start, end }` shape.
- Bad, because many downstream APIs expect start/end ranges.

## More Information

This decision refines the numeric span convention for the `VersSpan` shape
introduced by ADR-0007. ADR-0023 decides the coordinate space. The character unit
and unreliable-location omission policy are decided separately.

External references:

- ESLint custom rule ranges:
  <https://eslint.org/docs/latest/extend/custom-rules>
- ESTree source locations:
  <https://github.com/estree/estree/blob/master/es5.md#node-objects>
- Babel parser ranges:
  <https://babeljs.io/docs/babel-parser>
- Language Server Protocol ranges:
  <https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#range>

This decision should be revisited if one of the following becomes true:

- vers-js replaces offset spans with line/column locations;
- a future public API requires TypeScript-style `{ start, length }` spans;
- downstream integrations consistently require one-based display positions as the
  primary public contract.
