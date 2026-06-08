---
parent: Decisions
nav_order: 19
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Reject Invalid UTF-8 Percent-Decoded Versions

## Context and Problem Statement

ADR-0005 models successful VERS constraints with decoded `version: string`
metadata. ADR-0010 requires malformed percent-encoding and invalid encoded byte
sequences to fail rather than be repaired. ADR-0016 places percent-decoding and
metadata construction before canonicality validation. ADR-0017 serializes version
text by percent-encoding UTF-8 bytes outside the selected raw-character set.

Percent-decoding turns `%HH` triplets into bytes. Those bytes then need a text
decoding policy before vers-js can expose a JavaScript string in successful parse
metadata. Some decoders replace invalid UTF-8 with `U+FFFD`, while strict URI and
parser implementations often reject malformed byte sequences.

Should vers-js reject invalid UTF-8 byte sequences in percent-decoded version
components, replace them with `U+FFFD`, or preserve raw bytes in the public data
model?

## Decision Drivers

- Successful parse metadata should preserve version meaning as a valid string,
  not silently substitute replacement characters.
- The public data model selected in ADR-0005 exposes `version: string`, not raw
  bytes.
- Canonical output should be derived from decoded metadata without data loss.
- Supply-chain identifiers should not accept ambiguous or lossy decoded values.
- The policy should remain runtime-agnostic and implementable without Node-only
  byte types.
- Double-decoding policy remains deferred and should not be decided by this ADR.

## Considered Options

- Reject invalid UTF-8 byte sequences
- Decode invalid UTF-8 with replacement characters
- Preserve raw decoded bytes in successful metadata
- Leave invalid UTF-8 behavior implementation-defined

## Decision Outcome

Chosen option: "Reject invalid UTF-8 byte sequences", because successful parse
metadata is string-based and canonical output must not be derived from lossy or
ambiguous byte replacement.

During percent-decoding, vers-js will interpret encoded bytes in version
components as UTF-8. If a percent-encoded byte sequence is not valid UTF-8, the
parse, validate, and canonicalize entry points fail with a machine-readable
percent-encoding diagnostic rather than producing replacement text.

This rejection applies after percent-escape syntax has been checked. Malformed
escape syntax such as `%`, `%G0`, or `%0` is still a malformed percent-encoding
failure. A syntactically valid escape sequence whose bytes cannot be decoded as
UTF-8 is also a validation failure.

This decision does not define whether decoded text containing a literal percent
sign or percent-looking substring should be rejected, accepted, or treated as a
double-decoding hazard. That remains a separate deferred decision.

### Consequences

- Good, because successful `version` metadata is always valid text.
- Good, because canonical output is never based on `U+FFFD` substitution.
- Good, because invalid byte sequences cannot collapse into the same replacement
  string as other invalid inputs.
- Good, because the policy matches ADR-0010's strict no-repair posture.
- Neutral, because implementations may use different internal UTF-8 decoders as
  long as invalid sequences fail.
- Bad, because byte-oriented ecosystem versions that are not valid UTF-8 cannot be
  represented in v1 successful metadata.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- percent-decoded version bytes are decoded as UTF-8;
- invalid UTF-8 byte sequences fail rather than being replaced with `U+FFFD`;
- successful parse metadata exposes only valid string values;
- canonical output is generated from valid decoded strings and UTF-8
  reserialization;
- tests cover malformed percent escapes separately from syntactically valid but
  invalid UTF-8 byte sequences.

## Pros and Cons of the Options

### Reject invalid UTF-8 byte sequences

This option treats invalid UTF-8 as a validation failure during percent-decoding
and metadata construction.

- Good, because it preserves the integrity of string-based parse metadata.
- Good, because it avoids silent data loss from replacement characters.
- Good, because it keeps canonical output deterministic.
- Bad, because it excludes non-UTF-8 byte-oriented version identifiers from v1.

### Decode invalid UTF-8 with replacement characters

This option uses a forgiving decoder that replaces invalid byte sequences with
`U+FFFD`.

- Good, because more inputs can be displayed or inspected.
- Good, because forgiving decoders are common in UI and browser contexts.
- Bad, because replacement loses original version information.
- Bad, because multiple distinct invalid byte sequences can collapse to the same
  decoded string.
- Bad, because canonical output would serialize repaired text rather than the
  original identifier.

### Preserve raw decoded bytes in successful metadata

This option exposes raw bytes for percent-decoded version components rather than
requiring UTF-8 text.

- Good, because it can represent byte-oriented version schemes.
- Good, because no byte information is lost.
- Bad, because it conflicts with ADR-0005's `version: string` data model.
- Bad, because it introduces runtime and serialization concerns for Node.js,
  Deno, and Bun.
- Bad, because downstream consumers would need to handle both text and byte
  versions.

### Leave invalid UTF-8 behavior implementation-defined

This option does not define whether invalid bytes fail, replace, or preserve.

- Good, because it avoids committing before implementation.
- Bad, because public parser behavior would vary across runtimes or
  implementations.
- Bad, because fixtures could not reliably assert invalid encoded byte behavior.
- Bad, because downstream consumers could not depend on stable canonicalization.

## More Information

This decision refines the percent-decoding contract from ADR-0010 and the decoded
metadata phase from ADR-0016. It depends on the string data model selected by
ADR-0005 and the UTF-8 serialization policy selected by ADR-0017. It does not
decide double-decoding policy.

External references:

- VERS specification:
  <https://github.com/package-url/vers-spec/blob/main/docs/standard/specification.md>
- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- RFC 3986 percent-encoding:
  <https://www.rfc-editor.org/rfc/rfc3986#section-2.1>
- WHATWG Encoding Standard:
  <https://encoding.spec.whatwg.org/>
- MDN `TextDecoder`:
  <https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder>

This decision should be revisited if one of the following becomes true:

- VERS defines raw-byte version components or a non-UTF-8 encoding policy;
- vers-js changes successful metadata from string versions to byte-preserving
  values;
- official fixtures require accepting invalid UTF-8 with replacement behavior;
- downstream consumers need a separate diagnostic or inspection API for invalid
  byte sequences.
