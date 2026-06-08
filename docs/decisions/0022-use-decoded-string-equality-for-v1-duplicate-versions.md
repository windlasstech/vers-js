---
parent: Decisions
nav_order: 22
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use Decoded String Equality for V1 Duplicate Versions

## Context and Problem Statement

The first vers-js release will expose canonical VERS syntax validation and parsed
declaration metadata. ADR-0005 models successful constraint versions as decoded
strings. ADR-0019 rejects invalid UTF-8 during percent-decoding. ADR-0020 defines
single-pass percent-decoding and treats decoded percent-looking text as literal
version text. ADR-0021 preserves input order and defers semantic ordering,
semantic duplicate-version checks, and comparator-sequence validation when those
checks depend on type-specific version equality or comparison.

The VERS specification treats duplicate versions as non-canonical, but full
version equality can be type-specific. For example, a future semantic layer may
consider two strings equal according to Maven, NuGet, SemVer, Debian, or another
versioning scheme even when their decoded strings differ. At the same time, v1
already has trustworthy decoded version strings after structural parsing,
single-pass percent-decoding, and UTF-8 validation.

Should vers-js v1 report duplicate versions when decoded version strings are
exactly equal, defer all duplicate detection until type-specific semantic equality
exists, or use raw input text for duplicate detection?

## Decision Drivers

- V1 duplicate detection should not require type-specific version comparison,
  containment, normalization, or a known-type registry.
- Percent-encoding spelling differences should not let the same decoded version
  appear more than once.
- Successful parse metadata exposes decoded `version` strings, so duplicate checks
  should align with the public syntax metadata.
- The rule should preserve ADR-0021's deferral of semantic duplicate detection.
- The implementation should remain deterministic across Node.js, Deno, and Bun.
- Future semantic/advisory layers should still be able to detect additional
  type-specific duplicates.

## Considered Options

- Decoded string equality duplicate detection
- Defer all duplicate detection to semantic validation
- Raw input substring equality duplicate detection
- Canonical serialized version string equality duplicate detection
- Type-specific semantic equality in v1 core

## Decision Outcome

Chosen option: "Decoded string equality duplicate detection", because it catches
duplicates that are visible in v1 syntax metadata without requiring type-specific
semantic equality or support-registry behavior.

The v1 core parser will treat two non-star constraints as duplicate versions when
their single-pass decoded `version` strings are exactly equal after successful
percent-decoding and UTF-8 validation. Comparator differences do not make the
version non-duplicate for this check: `=1.0.0` and `!=1.0.0` use the same decoded
version string and therefore duplicate that version.

Duplicate detection is performed on decoded strings, not raw input substrings.
Different percent-encoding spellings that decode to the same string are duplicates
if they otherwise pass v1 syntax and canonical percent-encoding validation. For
example, a literal percent sign represented as `%25` duplicates another constraint
whose decoded version is also `%`; an input such as `%252F` decodes once to the
literal string `%2F` and duplicates another constraint only when that other
constraint's decoded version is also `%2F`.

This decision does not introduce type-specific semantic equality into the v1 core
parser. If a future Maven, NuGet, SemVer, Debian, or other semantic layer treats
two different decoded strings as equal, that additional duplicate detection must
belong to an opt-in semantic, advisory, comparison, containment, or native range
translation surface.

ADR-0021 remains in force for semantic duplicate-version checks. This decision
refines it by defining a narrower v1 syntax-level duplicate check based on decoded
string equality. The `canonical.duplicate_version` issue code reserved in ADR-0007
may be emitted by the v1 core default path for decoded-string duplicates only; it
must not imply type-specific semantic equality.

### Consequences

- Good, because v1 catches exact duplicate decoded versions without semantic
  comparison.
- Good, because percent-encoding spelling variations cannot bypass duplicate
  detection after decoding.
- Good, because duplicate checks align with the public `version: string` metadata
  selected in ADR-0005.
- Good, because future semantic layers can still add type-specific duplicate
  detection for decoded strings that are not exactly equal.
- Neutral, because `canonical.duplicate_version` becomes active in v1 for a narrow
  syntax-level duplicate case while ordering and comparator-sequence issue codes
  remain deferred by ADR-0021.
- Bad, because v1 will not detect semantic duplicates where different decoded
  strings compare equal under a type-specific version scheme.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- non-star constraints with identical decoded `version` strings fail with
  `canonical.duplicate_version`;
- raw percent-encoding spelling is not used as the duplicate key;
- comparator differences do not prevent duplicate-version detection;
- standalone `*` remains a distinct constraint form and is not compared through a
  decoded version string;
- v1 duplicate detection does not require a type-specific comparator, known-type
  registry, semantic normalization, or containment behavior;
- documentation distinguishes v1 decoded-string duplicates from future
  type-specific semantic duplicates.

## Pros and Cons of the Options

### Decoded string equality duplicate detection

This option treats decoded version strings as the v1 duplicate key.

- Good, because it uses data already produced by the v1 parser.
- Good, because it is deterministic and runtime-agnostic.
- Good, because it catches duplicates despite equivalent percent-encoding
  spellings.
- Bad, because it does not catch semantic equality between different strings.

### Defer all duplicate detection to semantic validation

This option emits no duplicate-version issue in the v1 core parser.

- Good, because it keeps all duplicate semantics with future type-specific
  validation.
- Good, because it avoids any ambiguity about whether duplicates are syntax-level
  or semantic-level.
- Bad, because exact duplicate decoded strings are visible in v1 metadata and can
  be detected without semantic comparison.
- Bad, because the reserved `canonical.duplicate_version` issue code would remain
  inactive even for straightforward duplicate syntax metadata.

### Raw input substring equality duplicate detection

This option treats two versions as duplicates only when the authored raw version
substrings are identical.

- Good, because it is simple before decoding.
- Bad, because percent-encoding variants of the same decoded version would bypass
  duplicate detection.
- Bad, because ADR-0005 and ADR-0010 commit successful metadata to decoded version
  strings and canonical output, not raw input preservation.

### Canonical serialized version string equality duplicate detection

This option reserializes decoded versions using canonical percent-encoding rules
and compares the resulting version component strings.

- Good, because it aligns duplicate detection with canonical output spelling.
- Good, because it removes raw percent-encoding variation.
- Neutral, because it is usually equivalent to decoded string equality under the
  v1 percent-encoding decisions.
- Bad, because it is less direct than comparing the decoded `version` strings that
  the public metadata exposes.

### Type-specific semantic equality in v1 core

This option detects duplicates according to the version equality rules of each
VERS type.

- Good, because it most closely follows semantic equality for supported types.
- Good, because it can catch duplicates that decoded string equality misses.
- Bad, because it requires type-specific comparison or normalization outside v1
  scope.
- Bad, because unknown and project-specific types would need support fallback,
  rejection, or advisory diagnostics.
- Bad, because it conflicts with ADR-0004, ADR-0005, and ADR-0015's v1 scope
  boundaries.

## More Information

This decision refines ADR-0021 by separating v1 decoded-string duplicate
detection from future semantic duplicate detection. It also refines ADR-0007 by
activating `canonical.duplicate_version` for decoded-string duplicates in the v1
core default path while leaving `canonical.non_canonical_order` and
`canonical.invalid_comparator_sequence` deferred as described in ADR-0021.

External references:

- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- VERS specification:
  <https://github.com/package-url/vers-spec/blob/main/docs/standard/specification.md>
- VERS version schemes:
  <https://github.com/package-url/vers-spec/blob/main/docs/version-schemes.md>

This decision should be revisited if one of the following becomes true:

- VERS makes duplicate-version checks mandatory only through type-specific
  semantic equality;
- official parse fixtures require accepting repeated exact decoded version
  strings in the core parse path;
- vers-js changes successful version metadata from decoded strings to typed or
  byte-preserving version values;
- vers-js adds a semantic/advisory layer that needs a separate issue namespace for
  type-specific duplicates.
