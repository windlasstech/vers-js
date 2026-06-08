---
parent: Decisions
nav_order: 42
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Separate Core and Reserved Issue Codes

## Context and Problem Statement

ADR-0004 selects a Result-centered public API whose failure branch contains
`issues: VersIssue[]`. ADR-0007 selects hierarchical namespaced issue codes and
records an initial catalog, but it leaves the exact initial union open for
implementation refinement. Later decisions narrow which diagnostics the v0.1.0
core parser can emit: ADR-0015 and ADR-0033 reserve known-type support checks for
future or downstream layers, ADR-0021 defers type-specific canonical ordering and
comparator-sequence checks, and ADR-0022 activates duplicate-version checks only
for decoded-string duplicates.

The public type surface now needs to distinguish codes that v0.1.0 core functions
can actually return from codes that are useful as reserved future or downstream
vocabulary.

Should `VersIssueCode` include future-reserved issue codes in v0.1.0?

## Decision Drivers

- The `code` field in `VersIssue` should accurately describe what v0.1.0 core
  parse, validate, and canonicalize functions may emit.
- Future semantic, advisory, support-policy, and downstream adapter codes should
  remain name-reserved without forcing v0.1.0 callers to handle inactive cases.
- TypeScript callers should be able to write exhaustive switches over core issue
  codes without receiving false positives from future-only codes.
- The public vocabulary should still leave room to promote reserved codes into a
  future core union or into a separate future result type.
- ADR-0007's namespaced-code structure should be preserved.

## Considered Options

- Separate core-emitted and reserved issue-code unions
- Include reserved issue codes directly in `VersIssueCode`
- Export only core-emitted issue codes and do not reserve future codes
- Use one loose string type for all issue codes

## Decision Outcome

Chosen option: "Separate core-emitted and reserved issue-code unions", because it
keeps v0.1.0 core result typing precise while preserving a documented vocabulary
for future semantic and support layers.

For v0.1.0, `VersIssue.code` will use `VersIssueCode`, and `VersIssueCode` will
represent only codes that the core parser can emit from `parseVers()`,
`validateVers()`, and `canonicalizeVers()`.

The public type direction is:

```ts
export interface VersIssue {
  code: VersIssueCode;
  message: string;
  severity: "error";
  span?: VersSpan;
}

export type VersIssueCode = VersCoreIssueCode;

export type VersCoreIssueCode =
  | VersLexicalIssueCode
  | VersSyntaxIssueCode
  | VersConstraintIssueCode
  | VersCanonicalIssueCode
  | VersResourceIssueCode;

export type VersReservedIssueCode = VersReservedCanonicalIssueCode | VersSupportIssueCode;
```

`VersReservedIssueCode` is exported as name-reserved vocabulary, but it is not part
of the v0.1.0 `VersIssueCode` union. A future ADR may promote a reserved code into
`VersIssueCode`, add a separate result type for an advisory or semantic layer, or
replace the reserved type with a more specific public vocabulary.

The v0.1.0 reserved-code set is:

```ts
export type VersReservedCanonicalIssueCode =
  | "canonical.non_canonical_order"
  | "canonical.invalid_comparator_sequence";

export type VersSupportIssueCode = "support.unknown_type" | "support.unsupported_semantic";
```

The active v0.1.0 canonical issue set contains only the canonical diagnostics that
the core parser can emit without type-specific semantic comparison:

```ts
export type VersCanonicalIssueCode = "canonical.duplicate_version";
```

`canonical.duplicate_version` is active only for decoded-string duplicate versions
as decided by ADR-0022. It must not imply type-specific semantic equality.

The active v0.1.0 constraint issue set keeps malformed percent-escape syntax
separate from syntactically valid percent-encoded bytes that fail UTF-8 decoding,
as required by ADR-0019:

```ts
export type VersConstraintIssueCode =
  | "constraint.missing_constraints"
  | "constraint.leading_pipe"
  | "constraint.trailing_pipe"
  | "constraint.consecutive_pipe"
  | "constraint.empty_constraint"
  | "constraint.empty_version"
  | "constraint.invalid_comparator"
  | "constraint.invalid_star_constraint"
  | "constraint.invalid_percent_encoding"
  | "constraint.invalid_utf8";
```

### Consequences

- Good, because `VersIssueCode` remains an accurate union for v0.1.0 core failure
  results.
- Good, because reserved future codes are documented without becoming false cases
  in exhaustive handling of v0.1.0 core parser results.
- Good, because future semantic, advisory, or support layers have an explicit path
  to promote or reuse reserved vocabulary.
- Good, because the namespaced shape from ADR-0007 remains intact.
- Neutral, because the public type surface gains `VersCoreIssueCode` and
  `VersReservedIssueCode` in addition to `VersIssueCode`.
- Bad, because downstream adapters that want to emit reserved codes cannot type
  those diagnostics as ordinary v0.1.0 `VersIssue` without defining their own
  broader issue type.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- `VersIssue.code` is typed as `VersIssueCode` for v0.1.0 core results;
- `VersIssueCode` includes only issue codes emitted by v0.1.0 core public
  functions;
- reserved future codes are exported separately as `VersReservedIssueCode` or more
  specific reserved-code unions;
- v0.1.0 core validation does not emit `support.unknown_type`,
  `support.unsupported_semantic`, `canonical.non_canonical_order`, or
  `canonical.invalid_comparator_sequence`;
- future promotion of a reserved code into a core, advisory, or semantic result
  contract is reviewed as a deliberate decision.

## Pros and Cons of the Options

### Separate core-emitted and reserved issue-code unions

This option keeps the core result code union exact and exports future vocabulary
separately.

- Good, because TypeScript exhaustiveness over v0.1.0 core results is honest.
- Good, because future names are reserved without pretending they are emitted by
  the first release.
- Good, because support and semantic layers can later choose whether to promote or
  wrap reserved codes.
- Bad, because consumers may need to learn the difference between `VersIssueCode`
  and `VersReservedIssueCode`.

### Include reserved issue codes directly in `VersIssueCode`

This option makes `VersIssueCode` include all current and future-reserved codes.

- Good, because one union covers every known vocabulary item.
- Good, because downstream adapters can reuse `VersIssue` for support-policy
  diagnostics.
- Bad, because v0.1.0 callers must handle issue codes that the core parser does
  not emit.
- Bad, because reserved semantic codes could be mistaken for implemented core
  behavior.

### Export only core-emitted issue codes and do not reserve future codes

This option omits future-only names from the public type surface.

- Good, because the v0.1.0 public surface is smaller.
- Bad, because ADR-0007 intentionally leaves room for future namespaces and
  support-boundary diagnostics.
- Bad, because downstream adapters lose a project-owned vocabulary for common
  support or semantic cases.

### Use one loose string type for all issue codes

This option types issue codes as `string` or a broad template-literal namespace.

- Good, because future additions never require type changes.
- Bad, because downstream callers lose precise exhaustiveness and autocomplete.
- Bad, because it weakens ADR-0004 and ADR-0007's machine-readable issue-code
  contract.

## More Information

This decision refines the initial issue-code catalog from ADR-0007. It depends on
the v0.1.0 core scope from ADR-0004, the syntax metadata boundary from ADR-0005,
the known-type support boundary from ADR-0015 and ADR-0033, and the canonicality
refinements from ADR-0021 and ADR-0022.

This decision does not choose the exact resource-limit code. That value is decided
separately for the input-length failure required by ADR-0027.

This decision should be revisited if v0.1.0 core begins emitting support-policy,
semantic ordering, semantic comparator-sequence, warning, advisory, or repair
diagnostics.
