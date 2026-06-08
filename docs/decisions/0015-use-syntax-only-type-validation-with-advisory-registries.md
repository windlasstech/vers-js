---
parent: Decisions
nav_order: 15
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use Syntax-Only Type Validation with Advisory Registries

## Context and Problem Statement

The first vers-js release will expose Result-centered functions for canonical
VERS syntax validation, canonicalization, and parsed declaration metadata.
ADR-0004 keeps comparison, containment, native range translation, resolver
behavior, vulnerability interpretation, and VEX semantics outside the first
public API. ADR-0005 models successful parse results as plain syntax metadata
with a lowercase `type` string rather than type-specific version objects.

The VERS specification requires a `type` component and defines its syntax. The
`type` shall contain ASCII letters and numbers, period `.`, and dash `-`; shall
start with an ASCII letter; shall not be percent-encoded; and has lowercase as
its canonical form. The VERS parsing guide says tools should validate that the
`type` is known, while the specification also allows defining a `type` that does
not match an existing PURL type, such as a scheme that applies to a single
package or project.

Should vers-js treat every syntactically valid canonical lowercase VERS type as
valid in the core parser, or should it maintain a known type registry and reject
unknown types through `support.unknown_type`?

## Decision Drivers

- Core parser behavior should follow the normative VERS syntax requirements
  without turning optional support knowledge into a hard syntax failure.
- The first release should preserve the scope boundary of canonical syntax
  validation and parsed metadata.
- The parser should remain forward-compatible with new VERS types, new PURL
  types, vulnerability-system types, generic types, and project-specific types.
- Downstream tools should still be able to apply stricter support policies when
  their product context needs a known ecosystem allowlist.
- Public issue codes should not imply that the core parser supports semantic
  operations or a live ecosystem registry.
- Any registry baseline should be deliberate and reproducible if it becomes part
  of a future public contract.

## Considered Options

- Syntax-only type validation with advisory registries
- Built-in known type allowlist with hard unknown-type errors
- Built-in known type snapshot with advisory diagnostics
- Pluggable registry validation in the v1 core API

## Decision Outcome

Chosen option: "Syntax-only type validation with advisory registries", because
VERS type registry membership is support knowledge rather than core syntax, and
hard-failing unknown but syntactically valid types would conflict with the v1
syntax-only scope and the VERS specification's allowance for non-PURL and
project-specific types.

The v1 core parser will validate only the VERS `type` syntax and canonical form:

- the type starts with an ASCII letter;
- the type contains only ASCII letters, ASCII numbers, period `.`, and dash `-`;
- the type is not percent-encoded;
- the type is lowercase in canonical input.

`parseVers()`, `validateVers()`, and `canonicalizeVers()` will not reject an
otherwise valid canonical VERS string solely because its `type` is absent from a
known PURL or VERS type list. Unknown-type checks are outside the core v1 parser
contract and may be implemented by downstream adapters or by a future advisory
or pluggable registry layer.

The `support.unknown_type` issue code reserved in ADR-0007 is not emitted by the
v1 core parser's default syntax validation path. It remains available for a
future opt-in registry validation surface or for downstream adapters that map
their own known-type policy into vers-js-compatible issue codes.

### Consequences

- Good, because syntax-valid custom, project-specific, future, and
  vulnerability-system VERS types remain parseable.
- Good, because the core parser stays aligned with the first-release scope of
  canonical syntax validation and parsed metadata.
- Good, because vers-js avoids shipping a stale or incomplete ecosystem allowlist
  as a hard validation boundary.
- Good, because downstream tools can still enforce stricter support policies in
  their own adapters.
- Neutral, because `support.unknown_type` remains reserved but inactive in the
  default v1 core parser.
- Bad, because typos such as a misspelled ecosystem type are not caught by core
  syntax validation alone.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- syntactically valid canonical lowercase types pass core parse, validate, and
  canonicalize entry points even when the type is not in a known registry;
- malformed type syntax still fails with syntax diagnostics, including invalid
  characters, missing type, invalid casing, and percent-encoded type text;
- no built-in known-type allowlist is required for successful core parsing;
- default core validation does not emit `support.unknown_type`;
- documentation describes known-type validation, if needed, as a downstream,
  advisory, or future opt-in support policy rather than a v1 syntax rule;
- any future registry validation API or bundled registry snapshot is backed by a
  separate ADR before becoming part of the public contract.

## Pros and Cons of the Options

### Syntax-only type validation with advisory registries

This option treats VERS `type` as a syntactic component in the core parser and
leaves known-type membership to downstream or future advisory validation.

- Good, because it follows the VERS syntax requirements while respecting that
  known-type validation is phrased as a tool recommendation rather than a core
  syntax requirement.
- Good, because it supports VERS types that do not match existing PURL types,
  including package- or project-specific types allowed by the specification.
- Good, because it keeps `parseVers()` focused on parsed syntax metadata rather
  than semantic ecosystem support.
- Good, because it avoids registry drift and update pressure in the v1 parser.
- Bad, because callers that want typo detection need an additional support-layer
  check.

### Built-in known type allowlist with hard unknown-type errors

This option ships a known type list and rejects otherwise valid VERS strings when
their type is absent from that list.

- Good, because it can catch misspelled ecosystem names early.
- Good, because it gives downstream tools a simple yes/no known-support boundary.
- Bad, because it rejects specification-allowed custom or project-specific types.
- Bad, because it makes parser correctness depend on the freshness and scope of a
  bundled registry.
- Bad, because it expands the v1 parser from syntax validation into support
  policy enforcement.

### Built-in known type snapshot with advisory diagnostics

This option ships a pinned known type snapshot but reports unknown membership as
advisory information rather than a hard failure.

- Good, because it can help callers detect likely type mistakes without rejecting
  future or custom valid input.
- Good, because a pinned snapshot could follow the reproducible baseline approach
  selected for VERS spec and test fixtures in ADR-0009.
- Bad, because ADR-0007 currently defines issues with `severity: "error"`, not a
  success-with-warning or advisory result model.
- Bad, because it adds registry maintenance and API design work before the core
  parser needs it.

### Pluggable registry validation in the v1 core API

This option adds an option or callback to `parseVers()` or `validateVers()` so
callers can provide their own known-type registry and choose whether unknown
types fail.

- Good, because different products can enforce different known-type policies.
- Good, because private, future, or organization-specific registries can be
  supported without changing the parser package.
- Bad, because it expands the first-release API surface selected in ADR-0004.
- Bad, because it requires defining option behavior, result semantics, and issue
  ordering for support checks before the syntax parser is implemented.
- Bad, because callers may confuse core VERS syntax validity with product support
  validity unless the API is carefully separated.

## More Information

This decision refines the type-validation boundary implied by ADR-0004,
ADR-0005, ADR-0006, ADR-0007, ADR-0008, and ADR-0010. It does not change the
successful parse data model, diagnostic shape, conformance fixture family, or
strict canonicalization behavior.

External references:

- VERS specification:
  <https://github.com/package-url/vers-spec/blob/main/docs/standard/specification.md>
- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- VERS version schemes:
  <https://github.com/package-url/vers-spec/blob/main/docs/version-schemes.md>
- PURL type definitions:
  <https://github.com/package-url/purl-spec/blob/main/docs/types.md>
- PURL type maintenance:
  <https://github.com/package-url/purl-spec/blob/main/docs/maintain-purl-types.md>
- PURL registered type index:
  <https://github.com/package-url/purl-spec/blob/main/purl-types-index.json>

This decision should be revisited if one of the following becomes true:

- the VERS specification changes known-type validation from a recommendation into
  a mandatory syntax or validity requirement;
- vers-js adds an advisory or warning result model;
- consumers need first-party known-type validation as part of the public package
  contract;
- vers-js adds type-specific comparison, containment, native range translation,
  resolver behavior, or other semantic support features;
- upstream VERS or PURL publishes a stable registry artifact that should become a
  reproducible support baseline for vers-js.
