---
parent: Decisions
nav_order: 18
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Accept Lowercase Percent Hex and Emit Uppercase

## Context and Problem Statement

VERS version components may contain percent-encoded octets. ADR-0010 requires
strict canonicalization without auto-repair and deterministic reserialization.
ADR-0017 selects a raw-character allowlist for canonical version output. Percent
escapes still need a hex-case policy for input validation and canonical output.

RFC 3986 treats percent-escape hex digits as case-insensitive and recommends
uppercase hex digits for consistency. WHATWG URL serializers also emit uppercase
hex. However, lowercase percent escapes such as `%2f` and uppercase escapes such
as `%2F` carry the same octet value.

Should vers-js reject lowercase percent-escape hex as non-canonical, accept both
hex cases while emitting uppercase, or preserve the input hex case?

## Decision Drivers

- Percent-escape input should follow the case-insensitive semantics of URI hex
  digits.
- Canonical output should still be deterministic and conventionally uppercase.
- The parser should avoid rejecting harmless ecosystem input when acceptance does
  not create ambiguity or semantic differences.
- The policy should preserve ADR-0010's no-repair contract while recognizing that
  hex-case normalization is an output projection of equivalent octets.
- The policy should be simple for downstream callers to explain.

## Considered Options

- Accept lowercase and uppercase input, emit uppercase output
- Accept uppercase input only
- Accept both input cases and preserve input case in output
- Reject all percent escapes with alphabetic hex digits

## Decision Outcome

Chosen option: "Accept lowercase and uppercase input, emit uppercase output",
because percent-escape hex digits are case-insensitive, lowercase input does not
introduce a practical ambiguity, and uppercase canonical output keeps serialized
VERS strings deterministic.

vers-js will parse percent escapes with either uppercase or lowercase hex digits.
For example, `%2f`, `%2F`, `%c3%a9`, and `%C3%A9` are all syntactically valid
percent-escape forms when their decoded byte sequences are otherwise valid.

Canonical output always emits uppercase hex digits for percent-encoded bytes. The
successful parse value exposes decoded version strings, so input hex case is not
preserved in parsed metadata or canonical output.

Lowercase percent hex is accepted as parse success rather than reported as a
non-canonical failure. This is a narrow exception to treating spelling differences
as canonicality failures: percent hex case represents the same bytes by URI
convention and has no distinct VERS meaning.

### Consequences

- Good, because equivalent URI percent escapes are accepted regardless of hex
  digit case.
- Good, because canonical output remains deterministic and follows uppercase URI
  normalization convention.
- Good, because common lowercase encoder output does not cause otherwise valid
  VERS declarations to fail.
- Neutral, because canonical output may differ from successful lowercase input
  even though parsing succeeds.
- Bad, because not every successful input string is byte-for-byte identical to its
  canonical output.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- percent escapes accept `0-9`, `A-F`, and `a-f` hex digits;
- malformed escapes still fail when either hex digit is missing or not a hex
  digit;
- successful parse metadata does not preserve percent-escape hex case;
- canonical output serializes all percent-encoded bytes with uppercase hex;
- tests cover equivalent lowercase, uppercase, and mixed-case percent escapes.

## Pros and Cons of the Options

### Accept lowercase and uppercase input, emit uppercase output

This option treats hex case as semantically equivalent on input and normalizes to
uppercase only when producing canonical output.

- Good, because it follows URI hex case-insensitivity.
- Good, because it avoids rejecting harmless real-world input.
- Good, because canonical output remains stable.
- Bad, because it permits successful input whose spelling is not identical to the
  canonical output string.

### Accept uppercase input only

This option treats lowercase percent hex as a non-canonical validation failure.

- Good, because every successful input's percent-escape spelling can already match
  canonical output.
- Good, because fixture expectations are strict and simple.
- Bad, because hex case is conventionally insignificant for percent escapes.
- Bad, because it rejects input without preventing a meaningful parser or security
  problem.

### Accept both input cases and preserve input case in output

This option accepts both cases and reserializes using the original escape text.

- Good, because it avoids changing percent-escape spelling for accepted input.
- Bad, because successful parse metadata would need to preserve raw escape text or
  spans.
- Bad, because the same decoded version could have multiple canonical strings.
- Bad, because ADR-0005 promises decoded syntax metadata and canonical output, not
  raw input preservation.

### Reject all percent escapes with alphabetic hex digits

This option allows only numeric percent escapes such as `%20`.

- Good, because it avoids hex-case decisions entirely.
- Bad, because it is incompatible with ordinary percent encoding.
- Bad, because it would make many required encoded bytes impossible to represent.

## More Information

This decision refines the percent-encoding canonicalization contract from
ADR-0010 and the version serialization policy from ADR-0017. It does not decide
which bytes must be percent-encoded, invalid UTF-8 behavior, or double-decoding
policy.

External references:

- RFC 3986 percent-encoding:
  <https://www.rfc-editor.org/rfc/rfc3986#section-2.1>
- WHATWG URL percent-encode algorithm:
  <https://url.spec.whatwg.org/#percent-encode>
- RFC 8820 URI design and ownership guidance:
  <https://www.rfc-editor.org/rfc/rfc8820>

This decision should be revisited if one of the following becomes true:

- VERS defines lowercase percent hex as non-canonical;
- official VERS fixtures require rejecting lowercase percent escapes;
- consumers need an API that reports whether input spelling exactly matched
  canonical output.
