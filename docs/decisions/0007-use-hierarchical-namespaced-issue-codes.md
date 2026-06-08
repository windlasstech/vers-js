---
parent: Decisions
nav_order: 7
status: accepted
date: 12026-06-07
decision-makers: Yunseo Kim
---

# Use Hierarchical Namespaced Issue Codes

## Context and Problem Statement

The first vers-js release will expose Result-centered public functions whose
failure branch contains `issues: VersIssue[]`. ADR-0006 decides how diagnostics
are collected. The package now needs a machine-readable issue code structure for
those diagnostics.

VERS diagnostics need to cover lexical, syntax, constraint, canonicality, and
support-boundary failures. Downstream consumers such as Alexandria, shelf CLI,
publisher UI, and other Agent Volumes tooling need stable codes that can be
mapped into UI copy, manifest issue taxonomies, logs, and Problem Details
payloads. Future semantic layers may add comparison, containment,
simplification, native range translation, or resolver-oriented diagnostics.

Which machine-readable issue code structure should vers-js expose?

## Decision Drivers

- Issue codes should be stable enough for downstream switch/case, documentation,
  and Problem Details URI mapping.
- The code itself should communicate its diagnostic category when read in logs,
  tests, and downstream issue payloads.
- The code structure should leave room for future namespaces without redesigning
  the first syntax-validation catalog.
- TypeScript callers should be able to use full-code unions as well as
  namespace-specific subsets.
- Human-readable messages should help developers, but should not be the stable
  machine contract.

## Considered Options

- Coarse un-namespaced error code enum
- Flat specific string error codes
- Hierarchical namespaced string error codes
- Numeric compiler-style error codes

## Decision Outcome

Chosen option: "Hierarchical namespaced string error codes", because the code
itself identifies the diagnostic category, maps naturally to Problem Details
`type` URIs, and leaves room for future semantic-layer namespaces.

The public diagnostic type will be equivalent to:

```ts
interface VersIssue {
  code: VersIssueCode;
  message: string;
  severity: "error";
  span?: VersSpan;
}

interface VersSpan {
  start: number;
  end: number;
}
```

Issue codes will use hierarchical namespaced string literals. The exact initial
union may be refined during implementation, but it should follow this shape:

```ts
type VersIssueCode =
  | VersLexicalIssueCode
  | VersSyntaxIssueCode
  | VersConstraintIssueCode
  | VersCanonicalIssueCode
  | VersSupportIssueCode;

type VersLexicalIssueCode =
  | "lexical.ascii_whitespace"
  | "lexical.invalid_character";

type VersSyntaxIssueCode =
  | "syntax.missing_scheme_separator"
  | "syntax.invalid_scheme"
  | "syntax.missing_type"
  | "syntax.invalid_type_case"
  | "syntax.missing_constraint_separator";

type VersConstraintIssueCode =
  | "constraint.missing_constraints"
  | "constraint.leading_pipe"
  | "constraint.trailing_pipe"
  | "constraint.consecutive_pipe"
  | "constraint.empty_constraint"
  | "constraint.empty_version"
  | "constraint.invalid_comparator"
  | "constraint.invalid_star_constraint"
  | "constraint.invalid_percent_encoding";

type VersCanonicalIssueCode =
  | "canonical.non_canonical_order"
  | "canonical.duplicate_version"
  | "canonical.invalid_comparator_sequence";

type VersSupportIssueCode =
  | "support.unknown_type"
  | "support.unsupported_semantic";
```

Namespace-specific unions are part of the design. Callers that need category
subsets can use these exported unions directly or derive them with TypeScript
template literal types, for example:

```ts
type ConstraintIssueCode = Extract<VersIssueCode, `constraint.${string}`>;
```

Problem Details `type` URIs can be derived from the same namespace and code, for
example `https://vers.dev/problems/constraint.leading_pipe` or an equivalent
project-owned URI chosen during implementation.

Messages are human-readable convenience text. They may be clarified without
changing the machine contract. Issue codes are the stable machine-readable
contract.

### Consequences

- Good, because namespaced codes are self-describing in logs, tests, and issue
  mappings.
- Good, because hierarchical codes map directly to Problem Details `type` URIs.
- Good, because future semantic diagnostics can add namespaces such as
  `semantic.*` without reshaping existing syntax diagnostics.
- Good, because TypeScript callers can work with full or namespace-specific union
  types.
- Neutral, because code strings are longer than flat codes.
- Bad, because the code catalog is larger and must be documented carefully.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- issue codes are hierarchical namespaced string literals;
- messages are not used as the machine-readable contract;
- namespace-specific code unions are exported or otherwise available to callers;
- Problem Details mappings can be derived from issue codes without parsing human
  messages;
- semantic operations remain absent from the first release except for explicit
  `support.*` diagnostics that mark unsupported behavior.

## Pros and Cons of the Options

### Coarse un-namespaced error code enum

This option exposes broad codes such as `invalid_scheme`, `invalid_constraint`,
or `invalid_range`.

- Good, because the code set is small and easy to maintain.
- Bad, because broad codes force consumers to inspect messages or parameters to
  distinguish important cases.
- Bad, because downstream Problem Details and UI mappings become less precise.

### Flat specific string error codes

This option exposes precise but un-namespaced codes such as `leading_pipe` or
`non_canonical_order`.

- Good, because string literals are concise and ergonomic in TypeScript switch
  statements.
- Good, because codes are precise enough for consumer mappings.
- Bad, because the code alone does not identify its diagnostic category unless the
  caller knows the catalog.
- Bad, because future semantic-layer codes would share the same flat namespace or
  require a later namespace redesign.

### Hierarchical namespaced string error codes

This option exposes precise codes with category prefixes such as
`constraint.leading_pipe` and `canonical.non_canonical_order`.

- Good, because the category is visible from the code itself.
- Good, because code values can be mapped directly into Problem Details `type`
  URIs.
- Good, because future namespaces can be added without disturbing existing codes.
- Good, because TypeScript template literal types can derive namespace-specific
  subsets when needed.
- Bad, because strings are longer than flat codes.
- Bad, because the code catalog is larger and must be documented carefully.

### Numeric compiler-style error codes

This option exposes stable numeric codes similar to compiler diagnostics.

- Good, because numeric codes can remain stable while messages change freely.
- Good, because numeric codes are compact in logs and documentation.
- Bad, because numbers are not self-describing.
- Bad, because a separate catalog is required for even basic readability.
- Bad, because the approach is heavier than needed for the first VERS syntax
  validation release.

## More Information

This decision refines the `VersIssue` shape selected by ADR-0004. Diagnostic
collection behavior is decided separately in ADR-0006.

External references:

- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- VERS canonical parse tests:
  <https://github.com/package-url/vers-spec/blob/main/tests/vers_canonical_parse_test.json>
- `vers-rs` error enum:
  <https://github.com/csaf-rs/vers-rs/blob/main/src/error.rs>
- ESLint `messageId` diagnostics:
  <https://eslint.org/docs/latest/extend/custom-rules#messageids>
- TypeScript template literal types:
  <https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html>

This decision should be revisited if one of the following becomes true:

- VERS defines an official machine-readable error code taxonomy;
- semantic operations such as comparison, containment, simplification, native
  range translation, or resolver behavior become part of vers-js;
- consumers need warnings or informational diagnostics in addition to errors;
- source spans need to include line/column or source-file metadata beyond string
  offsets.
