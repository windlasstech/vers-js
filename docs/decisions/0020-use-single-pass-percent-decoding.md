---
parent: Decisions
nav_order: 20
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use Single-Pass Percent-Decoding

## Context and Problem Statement

The first vers-js release will expose strict canonical VERS parsing and
canonicalization. ADR-0010 requires percent-decoding and reserialization without
auto-repair. ADR-0016 defines a percent-decoding and metadata construction phase.
ADR-0017 requires raw percent signs in canonical version output to be represented
as `%25`. ADR-0018 accepts lowercase and uppercase percent hex on input while
emitting uppercase output. ADR-0019 rejects invalid UTF-8 after percent-decoding.

Percent-decoding can become ambiguous when decoded text itself contains a percent
sign or a percent-looking sequence such as `%2F`. A parser could decode exactly
once and treat the result as literal version text, recursively decode until no
escapes remain, reject all decoded percent-looking text, or reject all literal
percent signs.

Should vers-js allow literal percent signs represented by `%25`, and should it
ever perform or require a second percent-decoding pass?

## Decision Drivers

- Percent-decoding should be deterministic and not depend on recursive or
  context-sensitive interpretation.
- Literal percent signs should remain representable in version text.
- The parser should avoid double-decoding vulnerabilities and downstream
  confusion caused by interpreting the same bytes more than once.
- Canonical output should be generated from decoded metadata using the raw
  character policy from ADR-0017.
- The decision should align with RFC 3986's guidance not to percent-encode or
  percent-decode the same string more than once.
- The policy should preserve ADR-0010's no-repair posture while avoiding false
  rejection of ordinary literal `%` data.

## Considered Options

- Decode exactly once and treat decoded percent text as literal
- Reject decoded percent-looking sequences
- Reject all literal percent signs
- Recursively decode until no escapes remain
- Preserve both raw and decoded version text

## Decision Outcome

Chosen option: "Decode exactly once and treat decoded percent text as literal",
because it follows URI single-pass decoding practice, keeps literal percent signs
representable, and prevents recursive decoding from changing version meaning.

vers-js will perform at most one percent-decoding pass for each version component.
After that pass, the decoded value is ordinary version text. If the decoded value
contains `%`, `%2F`, `%3C`, or any other percent-looking substring, vers-js does
not decode it again, does not treat it as VERS syntax, and does not reject it
solely because it could be interpreted by a second decoding pass.

Literal percent signs are valid version text when represented by percent-encoding
in the raw VERS string. For example, an input version component containing `%25`
decodes to the literal string `%`, and canonical output serializes that literal
percent sign as `%25`. An input containing `%252F` decodes once to the literal
string `%2F`; canonical output serializes that value as `%252F`, not as `/` and
not as `%2F`.

Inputs whose intended interpretation depends on a second decoding pass are
invalid usage from vers-js's perspective, but vers-js does not try to infer user
intent. The core parser's contract is single-pass decoding and canonical
reserialization of the resulting literal version text. Downstream systems must
not apply an additional percent-decoding pass to vers-js decoded metadata or
canonical output.

### Consequences

- Good, because literal `%` remains representable as `%25`.
- Good, because recursive decoding cannot turn literal decoded text into VERS
  delimiters, comparators, or other syntax.
- Good, because canonical output is deterministic: decoded text is reserialized
  once using ADR-0017's raw-character allowlist and ADR-0018's uppercase hex.
- Good, because the parser does not need speculative intent detection for
  double-encoded-looking strings.
- Neutral, because `%252F` is accepted as a literal `%2F` version value even
  though some callers may have intended `/`.
- Bad, because downstream systems that incorrectly decode again can still
  reinterpret a literal value; vers-js can only document that this is outside its
  contract.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- each version component is percent-decoded no more than once;
- decoded percent signs and percent-looking substrings are treated as literal
  version text;
- canonical output re-encodes literal `%` as `%25`;
- inputs such as `%25` and `%252F` can succeed when all other syntax,
  canonicality, and UTF-8 requirements are satisfied;
- neither `parseVers()`, `validateVers()`, nor `canonicalizeVers()` performs
  recursive percent-decoding;
- documentation warns downstream consumers not to percent-decode successful
  metadata or canonical output again.

## Pros and Cons of the Options

### Decode exactly once and treat decoded percent text as literal

This option performs one percent-decoding pass and treats the decoded string as
the final version text.

- Good, because it matches RFC 3986's guidance to avoid decoding the same string
  more than once.
- Good, because literal percent signs and percent-looking version strings remain
  representable.
- Good, because it avoids recursive decoding attacks inside the core parser.
- Good, because it preserves a simple decoded-string metadata model.
- Bad, because it may accept double-encoded-looking input as literal data when the
  user intended a second decode.

### Reject decoded percent-looking sequences

This option decodes once, then rejects decoded strings containing substrings that
look like percent escapes, such as `%2F`.

- Good, because it prevents successful metadata from containing text that another
  system might decode differently.
- Good, because it strongly discourages double-encoded input.
- Bad, because it rejects valid literal version text such as `%2F`.
- Bad, because it requires deciding which percent-looking strings are dangerous.
- Bad, because it treats user intent as knowable from the decoded text shape.

### Reject all literal percent signs

This option rejects any decoded version string containing `%`.

- Good, because it eliminates percent-related second-pass ambiguity.
- Good, because it is easy to implement and explain.
- Bad, because it makes literal `%` impossible to represent in version text.
- Bad, because it conflicts with the URI convention that `%25` represents a
  literal percent sign.
- Bad, because it is stricter than the VERS specification currently requires.

### Recursively decode until no escapes remain

This option keeps decoding percent-looking substrings until the string no longer
changes or an error occurs.

- Good, because it may recover user input that was accidentally encoded multiple
  times.
- Bad, because it violates the single-pass decoding guidance in RFC 3986.
- Bad, because it can turn literal data into VERS structural characters after the
  parser has already established boundaries.
- Bad, because it conflicts with ADR-0010's no-repair posture.
- Bad, because repeated decoding can create security-sensitive interpretation
  differences between vers-js and downstream systems.

### Preserve both raw and decoded version text

This option exposes raw version substrings alongside decoded metadata so callers
can make their own double-decoding decisions.

- Good, because downstream tools can inspect the exact authored percent escapes.
- Good, because it can support advanced audit or debugging use cases.
- Bad, because ADR-0005 selected decoded syntax metadata rather than raw parser
  internals.
- Bad, because it expands the v1 public data model.
- Bad, because it shifts a core canonicalization boundary onto consumers.

## More Information

This decision completes the percent-encoding policy sequence started by ADR-0017,
ADR-0018, and ADR-0019. It refines ADR-0010's statement that inputs requiring
double-decoding are validation failures: vers-js never performs recursive
decoding, and inputs whose intended interpretation depends on a second decode are
outside the core parser contract, while literal percent signs remain valid when
encoded as `%25`.

External references:

- RFC 3986 percent-encoding and decoding:
  <https://www.rfc-editor.org/rfc/rfc3986#section-2.4>
- RFC 3986 percent-encoding triplets:
  <https://www.rfc-editor.org/rfc/rfc3986#section-2.1>
- RFC 8820 URI design and ownership guidance:
  <https://www.rfc-editor.org/rfc/rfc8820>
- VERS specification:
  <https://github.com/package-url/vers-spec/blob/main/docs/standard/specification.md>
- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>

This decision should be revisited if one of the following becomes true:

- VERS defines normative double-decoding or literal-percent behavior;
- official VERS fixtures require rejecting `%25`, `%252F`, or decoded
  percent-looking version text;
- vers-js adds a tolerant repair API that intentionally attempts recursive
  decoding;
- downstream consumers need a separate audit API that exposes raw authored version
  substrings without changing the core decoded metadata model.
