---
parent: Decisions
nav_order: 17
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use RFC 3986 Unreserved Raw Version Characters

## Context and Problem Statement

The first vers-js release will expose strict canonical VERS parsing and
canonicalization. ADR-0010 requires deterministic percent-decoding and
reserialization without auto-repair. ADR-0016 places percent-decoding and
canonicality validation after trustworthy constraint parsing. The VERS
specification says version text containing separator or comparator characters such
as `>`, `<`, `=`, `!`, `*`, and `|` must use URL quoting rules, but it does not
define a complete canonical raw-character allowlist for version components.

RFC 8820 updates RFC 3986 by clarifying URI substructure ownership rather than by
changing RFC 3986 percent-encoding mechanics. Therefore, vers-js needs an
explicit VERS version-component canonicalization policy rather than treating RFC
3986 as an automatic mandate for all VERS internals.

Which characters should vers-js allow to appear raw in canonical VERS version
components, and which should be percent-encoded?

## Decision Drivers

- Canonical VERS strings should have one deterministic representation for version
  text.
- Version component encoding should avoid ambiguity with VERS separators,
  comparators, wildcard syntax, and percent escapes.
- The policy should align with URL quoting conventions without depending on form
  encoding or JavaScript-specific quirks.
- Successful parse metadata should expose decoded version strings while canonical
  output remains reproducible.
- The rule should be simple enough to fixture and implement across Node.js, Deno,
  and Bun.
- The decision should not resolve double-decoding policy, which remains a separate
  deferred question.

## Considered Options

- RFC 3986 unreserved raw characters only
- JavaScript `encodeURIComponent()` raw character set
- VERS delimiter and comparator characters only
- PURL-style component-specific allowlist

## Decision Outcome

Chosen option: "RFC 3986 unreserved raw characters only", because it gives
version components a conservative, deterministic, and URI-aligned canonical form
while avoiding ambiguity with VERS syntax characters.

Canonical VERS version serialization will leave only RFC 3986 unreserved
characters raw:

```text
A-Z a-z 0-9 - . _ ~
```

All other version text is serialized as UTF-8 bytes and percent-encoded. This
includes ASCII whitespace, `%`, VERS separators and comparators, `!`, `*`, `|`,
`<`, `>`, `=`, `/`, non-ASCII characters, and all other characters outside the
unreserved set.

This is a vers-js/VERS version-component canonicalization policy. RFC 3986
provides the unreserved baseline, and RFC 8820 reinforces that component-specific
substructure belongs in the owning syntax specification; RFC 8820 does not change
the percent-encoding rules themselves.

This decision does not decide whether a decoded version string that still
contains percent-looking text such as `%2F` is valid. Double-decoding and
second-pass interpretation remain deferred to a later decision.

### Consequences

- Good, because each decoded version string has a deterministic canonical percent
  encoding.
- Good, because VERS delimiters, comparators, wildcard syntax, whitespace, and raw
  percent signs cannot be confused with structural syntax in canonical output.
- Good, because the policy is independent of JavaScript `encodeURIComponent()`'s
  less strict raw-character set.
- Good, because the implementation can use a small explicit allowlist rather than
  a broad regular-expression exception list.
- Neutral, because this uses RFC 3986 as a chosen VERS component policy rather
  than as a direct RFC 8820 mandate.
- Bad, because canonical output may percent-encode characters that humans could
  otherwise read safely in some contexts.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- canonical version serialization leaves only `A-Z`, `a-z`, `0-9`, `-`, `.`, `_`,
  and `~` raw;
- raw VERS structural characters inside version text are rejected as
  non-canonical unless represented through percent-encoding;
- successful parse metadata exposes decoded version strings while `canonical`
  uses the selected raw-character allowlist;
- no HTML form encoding rules such as `+` for space are used;
- tests cover raw unreserved characters, encoded separators and comparators,
  encoded whitespace, encoded `%`, and non-ASCII UTF-8 percent-encoding.

## Pros and Cons of the Options

### RFC 3986 unreserved raw characters only

This option leaves only `ALPHA`, `DIGIT`, `-`, `.`, `_`, and `~` raw in canonical
version components.

- Good, because it follows the most conservative generic URI safe-character
  baseline.
- Good, because it avoids ambiguity with VERS-specific separators and
  comparators.
- Good, because it produces stable canonical strings across runtimes.
- Bad, because it percent-encodes more characters than many JavaScript developers
  expect from `encodeURIComponent()`.

### JavaScript `encodeURIComponent()` raw character set

This option uses `encodeURIComponent()` as the canonical serializer baseline.

- Good, because it is easy to implement in JavaScript.
- Good, because it is familiar to web developers.
- Bad, because `encodeURIComponent()` leaves characters such as `!`, `'`, `(`,
  `)`, and `*` raw.
- Bad, because raw `*` is especially confusing in VERS, where `*` is also a
  standalone wildcard constraint.

### VERS delimiter and comparator characters only

This option percent-encodes only characters that VERS explicitly uses as syntax,
such as `>`, `<`, `=`, `!`, `*`, and `|`, plus a small set of obviously unsafe
characters.

- Good, because canonical strings remain more human-readable.
- Good, because it closely follows the VERS specification's explicit examples.
- Bad, because the remaining raw-character set is under-specified and likely to
  grow by exception.
- Bad, because `%`, whitespace, non-ASCII text, and URI reserved characters still
  require separate policy decisions.

### PURL-style component-specific allowlist

This option defines a VERS version allowlist modeled on package-url component
encoding rules.

- Good, because VERS lives in the package-url ecosystem.
- Good, because downstream PURL tooling may already understand a similar quoting
  model.
- Bad, because VERS version components are not PURL components and have their own
  separators and comparators.
- Bad, because it still requires a project-owned allowlist and would be harder to
  explain than the RFC 3986 unreserved baseline.

## More Information

This decision refines the percent-encoding rules left open by ADR-0010 and the
percent-decoding phase described in ADR-0016. It does not decide percent-escape
hex case, invalid UTF-8 behavior, or double-decoding policy.

External references:

- VERS specification:
  <https://github.com/package-url/vers-spec/blob/main/docs/standard/specification.md>
- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- RFC 3986 URI percent-encoding:
  <https://www.rfc-editor.org/rfc/rfc3986#section-2.1>
- RFC 8820 URI design and ownership guidance:
  <https://www.rfc-editor.org/rfc/rfc8820>
- MDN `encodeURIComponent()`:
  <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent>

This decision should be revisited if one of the following becomes true:

- VERS defines a normative complete raw-character allowlist for version
  components;
- VERS fixtures require a less restrictive canonical encoding set;
- vers-js adds a tolerant repair or display-oriented serialization API;
- downstream consumers require byte-preserving rather than string-preserving
  version metadata.
