---
parent: Decisions
nav_order: 21
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Preserve Input Order and Defer Semantic Ordering Checks

## Context and Problem Statement

The first vers-js release will expose canonical VERS syntax validation and parsed
declaration metadata. ADR-0004 excludes comparison, containment, native range
translation, resolver behavior, and other semantic operations from the first
public API. ADR-0005 selects a syntax metadata model and says `constraints`
record canonical ordered constraints. ADR-0007 reserves canonical issue codes for
non-canonical ordering, duplicate versions, and invalid comparator sequences.
ADR-0010 requires strict canonicalization without auto-repair. ADR-0015 keeps
known-type and support-registry checks outside the v1 core parser.

The VERS parse guide separates basic parsing from optional constraint validation
and simplification. After parsing, tools should optionally validate and simplify
constraints; if they perform that canonicality validation, they should report
errors for non-canonical ordering, duplicate versions, and invalid comparator
sequences. The containment procedure starts from a parsed specifier whose
constraints are sorted by version and unique by version, then selects the version
equality and comparison procedures suitable for the VERS type. The guide also
states that sorting or ordering version constraints means sorting by version, and
sorting by version implies using the VERS type-specified version comparison and
ordering.

Should vers-js v1 core parse and validation enforce constraint ordering,
duplicate-version, and comparator-sequence checks, or should it preserve parsed
constraint input order and defer those semantic checks until type-specific
comparison, containment, or native range translation support exists?

## Decision Drivers

- The first release should preserve the syntax-only boundary selected in ADR-0004
  and ADR-0005.
- Constraint ordering in the VERS guide depends on type-specific version
  comparison, which is outside v1 scope.
- The v1 core parser should remain forward-compatible with unknown, future,
  generic, and project-specific VERS types as selected in ADR-0015.
- Successful parse metadata should remain plain decoded syntax data and should not
  imply semantic range simplification.
- The parser should not auto-sort, deduplicate, simplify, or repair user-authored
  constraints during parsing.
- Future comparison, containment, native range translation, or advisory validation
  surfaces should still be able to enforce type-specific canonical ordering.

## Considered Options

- Preserve input order and defer semantic ordering checks
- Use decoded lexical ordering in v1 core
- Implement type-specific semantic ordering in v1 core
- Auto-sort and simplify constraints during parsing

## Decision Outcome

Chosen option: "Preserve input order and defer semantic ordering checks", because
VERS constraint ordering depends on type-specific version comparison, while v1
vers-js deliberately exposes syntax validation and parsed metadata without
comparison, containment, native range translation, or support-registry semantics.

The v1 core parser will preserve constraint order as authored in the input after
structural parsing, percent-decoding, and canonical percent-encoding validation.
Successful `VersRange` metadata will expose constraints in input order rather than
sorted version order. The `canonical` string returned by `parseVers()` metadata or
`canonicalizeVers()` will preserve that constraint order and will only apply v1
syntax canonicalization rules such as scheme/type casing, comparator parsing,
percent-decoding validity, and canonical percent-encoding.

The v1 core default path will not reject a VERS declaration solely because its
constraints are not sorted by version. It will also not perform semantic
duplicate-version checks or semantic comparator-sequence validation when those
checks depend on type-specific version equality, ordering, simplification, or
containment behavior.

The `canonical.non_canonical_order`, `canonical.duplicate_version`, and
`canonical.invalid_comparator_sequence` issue codes reserved in ADR-0007 are not
emitted by the v1 core parser's default syntax-validation path. They remain
available for future opt-in semantic validation, comparison, containment, native
range translation, or downstream adapters that apply type-specific version
ordering and equality.

This decision refines ADR-0005's statement that `constraints` records canonical
ordered constraints: for the v1 core parser, `constraints` records parsed
constraints in input order. It also refines ADR-0010's statement that
non-canonical ordering, duplicate versions, and invalid comparator sequences must
produce failures: those failures apply to future or opt-in validation surfaces
that perform type-specific canonicality checks, not to the v1 core default syntax
path.

### Consequences

- Good, because v1 core parsing remains syntax-only and does not require
  type-specific version comparison.
- Good, because unknown, future, generic, and project-specific VERS types can be
  parsed without a comparator registry.
- Good, because successful metadata preserves the authored constraint order and
  does not silently sort, deduplicate, simplify, or repair input.
- Good, because future semantic layers can enforce VERS type-specific ordering and
  equality without redefining the v1 core parse result.
- Neutral, because reserved `canonical.*` issue codes remain inactive in the v1
  core default path.
- Bad, because v1 core validation will not catch unsorted ranges, duplicate
  versions, or invalid comparator sequences that require type-specific semantic
  checks.
- Bad, because callers that need containment-ready constraints must use a future
  semantic/advisory layer or implement their own type-specific validation.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- successful parse metadata preserves parsed constraint input order;
- `canonicalizeVers()` does not reorder, deduplicate, simplify, or otherwise
  repair constraints;
- the v1 core default path does not require a type-specific version comparator or
  known-type registry to parse otherwise valid syntax;
- the v1 core default path does not emit `canonical.non_canonical_order`,
  `canonical.duplicate_version`, or `canonical.invalid_comparator_sequence` for
  type-specific semantic ordering, equality, or simplification failures;
- future semantic, advisory, comparison, containment, or native range translation
  APIs can consume the syntax metadata and apply type-specific ordering without
  changing the v1 parse result shape;
- documentation states that parsed constraints are not guaranteed to be sorted or
  containment-ready in v1 core results.

## Pros and Cons of the Options

### Preserve input order and defer semantic ordering checks

This option treats constraint order as parsed syntax metadata in v1 and leaves
type-specific ordering, duplicate-version, and comparator-sequence checks to
future semantic or advisory surfaces.

- Good, because it aligns with the v1 scope boundary of syntax validation and
  parsed metadata.
- Good, because it follows the VERS parse guide's separation between parsing and
  optional validate/simplify behavior.
- Good, because it avoids inventing a lexical order that could conflict with
  VERS type-specific semantic ordering.
- Good, because it avoids making core parser behavior depend on comparator support
  for known types.
- Bad, because v1 core cannot fully validate containment-ready canonical ranges.

### Use decoded lexical ordering in v1 core

This option sorts or validates constraints using locale-independent lexical order
over decoded version strings.

- Good, because it gives deterministic ordering without type-specific comparison.
- Good, because it can activate `canonical.non_canonical_order` in v1.
- Bad, because VERS sorting by version implies type-specific comparison, not
  generic lexical string order.
- Bad, because lexical order can conflict with semantic order for common version
  schemes.
- Bad, because changing from lexical order to semantic order later would change
  accepted input, `canonical` output, or `constraints` ordering.

### Implement type-specific semantic ordering in v1 core

This option adds version comparators for supported VERS types and enforces
semantic sorting, duplicate detection, and comparator sequence validity in the v1
core parser.

- Good, because it most closely follows VERS semantic ordering requirements for
  supported types.
- Good, because it can make parsed constraints containment-ready for supported
  ecosystems.
- Bad, because it conflicts with ADR-0004's exclusion of comparison and
  containment from the first public API.
- Bad, because it conflicts with ADR-0005's syntax metadata model and avoidance of
  type-specific comparison semantics.
- Bad, because it conflicts with ADR-0015's decision to keep known-type and
  support-registry checks outside the v1 core parser.
- Bad, because unknown and project-specific types would need fallback, rejection,
  or support diagnostics.

### Auto-sort and simplify constraints during parsing

This option accepts non-canonical ordering, then sorts, deduplicates, simplifies,
or otherwise repairs the parsed constraint list before returning a result.

- Good, because callers receive normalized output from more inputs.
- Good, because it can be convenient for user-facing tools.
- Bad, because it conflicts with ADR-0010's strict no-repair posture.
- Bad, because the VERS parse guide says tools should not auto-correct
  non-canonical input during parsing.
- Bad, because simplification requires type-specific comparison and containment
  reasoning outside v1 scope.

## More Information

This decision refines ADR-0005, ADR-0007, ADR-0010, and ADR-0016 for the v1 core
default parser path. It does not remove the reserved canonical issue codes, and it
does not prevent future semantic validation from enforcing VERS type-specific
ordering, duplicate-version, or comparator-sequence rules.

External references:

- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- VERS specification:
  <https://github.com/package-url/vers-spec/blob/main/docs/standard/specification.md>
- VERS version schemes:
  <https://github.com/package-url/vers-spec/blob/main/docs/version-schemes.md>
- VERS test overview:
  <https://github.com/package-url/vers-spec/blob/main/docs/tests.md>

This decision should be revisited if one of the following becomes true:

- VERS makes constraint ordering, duplicate-version checks, or comparator-sequence
  validation mandatory for syntax-only parsing;
- official parse fixtures require rejecting unsorted constraints in the core parse
  path;
- vers-js adds comparison, containment, native range translation, semantic
  simplification, or type-specific semantic canonicalization;
- vers-js adds an advisory or warning result model that can report semantic
  ordering issues without changing core syntax validity.
