---
title: Data Model and Canonical Output
parent: Architecture Specifications
nav_order: 3
---

# Data Model and Canonical Output

This specification defines the successful parse metadata returned by `parseVers()`
and the canonical string projection returned by successful `parseVers()` metadata
and `canonicalizeVers()` calls.

Primary ADR inputs: ADR-0005, ADR-0010, ADR-0021, and ADR-0022.

## Public data model

Successful parses expose plain syntax metadata. The model is serializable data,
not a class, parser node tree, or semantic range object.

```ts
export interface VersRange {
  scheme: "vers";
  type: string;
  constraints: VersConstraint[];
  canonical: string;
}

export type VersConstraint =
  | VersStarConstraint
  | VersVersionConstraint;

export interface VersStarConstraint {
  comparator: "*";
  version: null;
}

export interface VersVersionConstraint {
  comparator: "=" | "!=" | "<" | "<=" | ">" | ">=";
  version: string;
}
```

The public data model must not expose parser internals, mutable methods,
type-specific parsed version objects, comparison results, containment checks,
native range translations, resolver data, vulnerability interpretation, or VEX
semantics.

## `VersRange` fields

`scheme` records the validated VERS URI scheme. It is always the literal
`"vers"` in successful `vers-js` parse results.

`type` records the validated canonical lowercase VERS type string. It is syntax
metadata only. It does not imply that the type is known to a registry or supported
by a semantic comparator.

`constraints` records parsed constraints in v0.1.0 core order. For v0.1.0, that
means the constraints appear in the same order they appear in the authored input
after structural parsing and decoding. They are not sorted by semantic version
order.

`canonical` records the canonical VERS string represented by this metadata under
the v0.1.0 syntax-only canonicalization rules.

## Constraint variants

`VersStarConstraint` represents the standalone `*` constraint. It is the only
valid public representation for `*`:

```ts
{ comparator: "*", version: null }
```

`VersVersionConstraint` represents every non-star comparator/version constraint.
Its `version` field is the decoded version string after successful single-pass
percent-decoding and UTF-8 validation.

The following states must not be representable in successful parse metadata:

- `{ comparator: "*", version: "1.0.0" }`;
- `{ comparator: ">=", version: null }`;
- `{ comparator: "=", version: undefined }`;
- a version constraint whose version string failed percent decoding or UTF-8
  validation;
- a semantic version object in place of a string.

## Bare versions and equality constraints

Bare version syntax is parsed as an equality constraint. For example,
`vers:npm/1.0.0` and `vers:npm/=1.0.0` both map to metadata equivalent to:

```ts
{
  comparator: "=",
  version: "1.0.0"
}
```

Successful metadata does not preserve whether equality was explicit or implicit
in the authored input. `VersVersionConstraint` uses `comparator: "="` for both.

For v0.1.0 canonical output, equality constraints serialize as bare versions
without the explicit `=` comparator. Therefore `vers:npm/1.0.0` is the canonical
spelling for that metadata.

This rule gives `canonicalizeVers()` and `VersRange.canonical` one deterministic
string projection for equality constraints. It follows the upstream VERS examples
that use a single bare version for equality and matches ADR-0005's decision not
to expose explicit-vs-implicit equality as public metadata.

## Constraint order

v0.1.0 core metadata preserves authored constraint order. It does not sort by
version, simplify, merge, or otherwise make the range containment-ready.

For example:

```ts
parseVers("vers:npm/<2.0.0|>=1.0.0")
```

If accepted by v0.1.0 syntax validation, this input preserves the constraint
order `<2.0.0` then `>=1.0.0` in both `constraints` and `canonical` output. The
core parser must not reorder it to `>=1.0.0|<2.0.0`.

`canonical.non_canonical_order` and `canonical.invalid_comparator_sequence` are
reserved for future semantic or advisory layers. They are not emitted by the
v0.1.0 core default path for type-specific ordering or simplification failures.

## Duplicate detection

v0.1.0 core duplicate detection uses exact decoded string equality for non-star
constraints.

Two non-star constraints are duplicates when their decoded `version` strings are
exactly equal after successful percent-decoding and UTF-8 validation. Comparator
differences do not make the version non-duplicate:

```text
vers:npm/=1.0.0|!=1.0.0
```

This input contains duplicate decoded version string `1.0.0` and must fail with
`canonical.duplicate_version`.

Duplicate detection is not based on raw input substrings. Different percent
escape spellings that decode to the same version string are duplicates if they
otherwise pass syntax and canonical percent-encoding validation.

Standalone `*` is not compared through a decoded version string.

This duplicate rule does not introduce type-specific semantic equality. If a
future semantic layer considers two different decoded strings equivalent for
Maven, NuGet, SemVer, Debian, or another versioning scheme, that additional
duplicate detection belongs outside the v0.1.0 core parser.

## Decoded version strings

Successful `VersVersionConstraint.version` values are decoded strings. They are
not raw authored substrings and not canonical percent-serialized substrings.

The parser performs single-pass percent-decoding for version components that
contain percent-encoded octets. Decoded percent-looking text remains literal
version text; it is not decoded again.

For example, `%252F` decodes once to the literal version string `%2F`. It does
not become `/` in metadata.

The detailed character, percent-encoding, and UTF-8 rules are defined by
`character-encoding.md`.

## Canonical output contract

Canonical output is constructed from decoded metadata, not by preserving or
patching the raw input string.

The canonical output algorithm is:

1. Start with the literal scheme prefix `vers:`.
2. Append the canonical lowercase `type`.
3. Append `/`.
4. Serialize each constraint in metadata order.
5. Join serialized constraints with `|`.

A `VersStarConstraint` serializes as `*`.

A `VersVersionConstraint` serializes as:

```text
<comparator><canonical-version>
```

where `<comparator>` is one of `!=`, `<`, `<=`, `>`, or `>=`, and
`<canonical-version>` is the canonical percent serialization of the decoded
`version` string. Equality constraints omit the comparator and serialize as only
`<canonical-version>`.

The canonical output must not preserve raw input spelling when raw spelling
differs from the metadata projection. It must not preserve:

- explicit equality spelling;
- percent-escape hex casing;
- percent-encoding forms that decode to the same public version string;
- any input spelling that would require repair or double decoding.

## `canonicalizeVers()` equivalence

For every accepted input string, these two successful values must be equal:

```ts
parseVers(input).value.canonical;
canonicalizeVers(input).value;
```

`canonicalizeVers()` must not canonicalize invalid input by repairing it. If
`parseVers(input)` fails, `canonicalizeVers(input)` fails for the same input.

The issue list may be produced by the shared parser pipeline. The public behavior
must preserve the same success boundary, the same canonical string projection,
and the same failure Result shape.

## Examples

### Comparator range

Input:

```text
vers:npm/>=1.0.0|<2.0.0
```

Successful metadata:

```ts
{
  scheme: "vers",
  type: "npm",
  constraints: [
    { comparator: ">=", version: "1.0.0" },
    { comparator: "<", version: "2.0.0" }
  ],
  canonical: "vers:npm/>=1.0.0|<2.0.0"
}
```

### Explicit equality

Input:

```text
vers:npm/=1.0.0
```

Successful metadata:

```ts
{
  scheme: "vers",
  type: "npm",
  constraints: [
    { comparator: "=", version: "1.0.0" }
  ],
  canonical: "vers:npm/1.0.0"
}
```

### Implicit equality

Input:

```text
vers:npm/1.0.0
```

Successful metadata uses the same equality constraint as explicit `=` input:

```ts
{
  scheme: "vers",
  type: "npm",
  constraints: [
    { comparator: "=", version: "1.0.0" }
  ],
  canonical: "vers:npm/1.0.0"
}
```

### Standalone star

Input:

```text
vers:generic/*
```

Successful metadata:

```ts
{
  scheme: "vers",
  type: "generic",
  constraints: [
    { comparator: "*", version: null }
  ],
  canonical: "vers:generic/*"
}
```

### Single-pass decoded version

Input:

```text
vers:generic/=%252F
```

Successful metadata:

```ts
{
  scheme: "vers",
  type: "generic",
  constraints: [
    { comparator: "=", version: "%2F" }
  ],
  canonical: "vers:generic/=%252F"
}
```

The decoded version string is `%2F`, not `/`.

## Invariants

Implementation and tests must preserve these invariants:

1. Successful parse metadata is plain syntax data.
2. `scheme` is always `"vers"`.
3. `type` is the canonical lowercase type string and does not imply registry
   membership.
4. `constraints` preserves v0.1.0 core input order.
5. `*` is represented only as `{ comparator: "*", version: null }`.
6. Non-star constraints always contain a decoded `version: string`.
7. Bare versions and explicit `=` both map to `comparator: "="`.
8. Equality constraints serialize as bare versions in canonical output.
9. `canonical` is derived from decoded metadata, not raw input preservation.
10. Exact decoded-string duplicate versions fail with
    `canonical.duplicate_version`.
11. Type-specific comparison, containment, semantic ordering, semantic equality,
    native range translation, resolver behavior, vulnerability interpretation,
    and VEX semantics remain absent from this model.
