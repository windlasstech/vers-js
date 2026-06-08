---
parent: Decisions
nav_order: 23
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use Original Input for Diagnostic Spans

## Context and Problem Statement

The first vers-js release will expose Result-centered parse, validate, and
canonicalize functions. ADR-0007 defines public issues with an optional
`span?: VersSpan`, and ADR-0006 says issues should be ordered by input position
when a source span is available. ADR-0010 requires strict canonicalization without
auto-repair, while ADR-0018 and ADR-0020 allow successful input spelling to differ
from canonical output after percent-escape normalization and single-pass decoding.

The package now needs to define which text a public diagnostic span indexes: the
original authored input, decoded syntax metadata, or canonical output.

Which string should `VersSpan` coordinates refer to?

## Decision Drivers

- Diagnostic spans should point to the text the caller supplied to vers-js.
- Failure results may not have decoded metadata or canonical output available.
- Strict parsing must not imply repaired or normalized source coordinates.
- Percent-decoding and canonical reserialization can change string length and
  spelling.
- Downstream tools need stable spans for UI highlighting, fixture assertions, and
  issue mapping.

## Considered Options

- Original input string spans
- Decoded metadata string spans
- Canonical output string spans

## Decision Outcome

Chosen option: "Original input string spans", because diagnostics are about the
caller-provided text and many failures occur before decoded metadata or canonical
output exists.

`VersSpan` coordinates will refer only to the original `input` string passed to
`parseVers()`, `validateVers()`, or `canonicalizeVers()`. A span identifies a
region of authored VERS input, not a region of decoded version metadata and not a
region of the canonical VERS string.

For successful input whose percent-escape spelling differs from canonical output,
such as lowercase percent hex accepted by ADR-0018, any diagnostic span still uses
the original input coordinate space. For invalid input that cannot produce a
canonical string, spans remain meaningful because they point into the original
input.

### Consequences

- Good, because downstream UIs can highlight the exact authored input that caused
  an issue.
- Good, because malformed input can still receive spans even when decoded metadata
  or canonical output is unavailable.
- Good, because the span contract remains independent of canonicalization and
  percent-decoding transformations.
- Good, because issue ordering by input position from ADR-0006 has a concrete
  source coordinate space.
- Bad, because callers that want to relate issues to decoded metadata or canonical
  output must perform their own mapping when such a mapping is meaningful.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- `VersSpan` documentation says spans index the original input string;
- spans are produced from authored-input offsets before decoded or canonical text
  is used as a coordinate basis;
- tests assert spans against the original input text;
- no issue span is documented as indexing decoded metadata or canonical output.

## Pros and Cons of the Options

### Original input string spans

This option makes spans point into the exact string supplied by the caller.

- Good, because diagnostics naturally refer to user-authored input.
- Good, because all parse attempts have an original input string, including
  malformed and non-canonical inputs.
- Good, because JavaScript callers can use the span against the same value they
  passed to the API.
- Bad, because transformed outputs may not share the same coordinates.

### Decoded metadata string spans

This option makes spans point into decoded values such as decoded constraint
version strings.

- Good, because some version-content diagnostics could align with the successful
  parse metadata model from ADR-0005.
- Bad, because many failures occur before decoded metadata can be trusted.
- Bad, because percent-encoded input and decoded output can have different lengths
  and spellings.
- Bad, because callers cannot directly highlight the original input without an
  additional reverse mapping.

### Canonical output string spans

This option makes spans point into the canonical VERS string represented by the
input.

- Good, because canonical output is the normalized display form for successful
  parses.
- Bad, because invalid input has no successful canonical output.
- Bad, because ADR-0010 rejects auto-repair and does not promise to produce
  canonical strings for failures.
- Bad, because accepted lowercase percent hex can succeed while canonical output
  spelling differs from the authored input.

## More Information

This decision refines the `VersSpan` coordinate space introduced by ADR-0007 and
the input-position ordering rule from ADR-0006. The numeric indexing convention,
character unit, and omission policy are decided separately.

External references:

- ESLint custom rule ranges:
  <https://eslint.org/docs/latest/extend/custom-rules>
- ESTree source locations:
  <https://github.com/estree/estree/blob/master/es5.md#node-objects>
- Babel parser ranges:
  <https://babeljs.io/docs/babel-parser>

This decision should be revisited if one of the following becomes true:

- vers-js adds an API that accepts pre-decoded metadata instead of raw strings;
- vers-js adds a repair API that returns source-to-canonical edit mappings;
- downstream consumers need first-party spans for decoded or canonical output in
  addition to original input spans.
