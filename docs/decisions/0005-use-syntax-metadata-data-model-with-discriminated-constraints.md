---
parent: Decisions
nav_order: 5
status: accepted
date: 12026-06-07
decision-makers: Yunseo Kim
---

# Use a Syntax Metadata Data Model with Discriminated Constraints

## Context and Problem Statement

The first vers-js release will parse and validate canonical VERS declarations.
ADR-0001 limits the initial supported scope to canonical VERS syntax validation
and parsed declaration metadata. ADR-0004 defines the public API as functional
entry points that return explicit Result objects.

The package now needs a public data model for successful parse results. The VERS
specification describes a `vers:` URI-like declaration containing a lowercase
type and one or more constraints. Constraints may be ordinary comparator/version
pairs, or the standalone `*` constraint. Version comparison and containment are
type-specific and are outside the first release scope.

Which successful parse data model should vers-js expose for canonical VERS
syntax metadata?

## Decision Drivers

- The data model should represent parsed VERS syntax without committing to
  type-specific comparison or containment semantics.
- The model should be stable and serializable as plain data across Node.js, Deno,
  and Bun.
- The model should make invalid states hard to represent, especially the rule
  that `*` is a standalone constraint without a version.
- Consumers should receive enough metadata to preserve, display, and adapt parsed
  VERS declarations.
- The model should include canonical output for roundtrip and conformance checks.
- The model should not expose parser internals, mutable classes, or runtime-bound
  objects.

## Considered Options

- Syntax metadata model with discriminated constraints
- Loose syntax metadata model with optional constraint versions
- Semantic typed range model
- Raw string model

## Decision Outcome

Chosen option: "Syntax metadata model with discriminated constraints", because it
captures the VERS declaration as stable plain syntax metadata while using a
stricter discriminated union for constraints so the standalone `*` constraint is
represented as a distinct valid state.

Successful parse results will expose a range value equivalent to:

```ts
interface VersRange {
  scheme: "vers";
  type: string;
  constraints: VersConstraint[];
  canonical: string;
}

type VersConstraint =
  | { comparator: "*"; version: null }
  | { comparator: "=" | "!=" | "<" | "<=" | ">" | ">="; version: string };
```

This decision intentionally redefines the selected data-model option as the
strict version of the syntax metadata model: the overall parsed declaration is
plain syntax metadata, and individual constraints use a discriminated union
rather than an optional version field.

`scheme` records the validated VERS URI scheme and is always `"vers"` for
successful parse results. `type` records the lowercase VERS type string.
`constraints` records the canonical ordered constraints. `canonical` records the
canonical VERS string represented by the parsed value.

Bare versions are represented as equality constraints with `comparator: "="`.
The `*` constraint is represented only as `{ comparator: "*", version: null }`.
The model does not expose type-specific parsed version objects, comparison
results, containment checks, native range translations, resolver data,
vulnerability interpretation, or VEX semantics.

### Consequences

- Good, because the model matches the first-release scope of syntax validation
  and parsed declaration metadata.
- Good, because plain data is easy to serialize, inspect, test, and adapt in
  downstream tools.
- Good, because `canonical` supports roundtrip checks and consumer display
  without requiring callers to rebuild the string themselves.
- Good, because the discriminated constraint union prevents representing `*` with
  an accidental version string or an ordinary comparator without a version.
- Good, because future semantic layers can wrap this syntax model without changing
  the first public parse result.
- Neutral, because callers that want to know whether equality was explicit or
  implicit do not receive that distinction; canonical syntax treats bare versions
  as equality constraints.
- Bad, because the model does not give callers type-specific version objects or
  semantic range operations.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- successful parse results expose a plain `VersRange`-like syntax metadata value;
- constraints are represented as a discriminated union with a distinct `*` case;
- bare version constraints are represented as equality constraints;
- successful parse results include the canonical VERS string;
- the public data model does not expose parser internals or type-specific version
  comparison objects;
- semantic behavior such as comparison, containment, native range translation,
  resolver behavior, vulnerability interpretation, and VEX semantics remains
  absent from the first parse data model.

## Pros and Cons of the Options

### Syntax metadata model with discriminated constraints

This option exposes the parsed declaration as plain syntax metadata and models
constraints with a discriminated union.

- Good, because it represents exactly what the first release supports.
- Good, because it prevents invalid `*` states at the type level.
- Good, because it keeps the model data-oriented and runtime-agnostic.
- Good, because it leaves room for a future semantic range layer.
- Bad, because it is more verbose than a loose object with optional fields.

### Loose syntax metadata model with optional constraint versions

This option exposes a similar `VersRange` shape but models constraints as a loose
object such as `{ comparator: VersComparator; version?: string }`.

- Good, because it is simple and compact.
- Good, because it still avoids semantic version interpretation.
- Bad, because it can represent invalid states such as `{ comparator: "*",
version: "1.0.0" }` or `{ comparator: ">=", version: undefined }`.
- Bad, because callers need extra checks that TypeScript could otherwise enforce.

### Semantic typed range model

This option exposes type-specific version objects or generic version parameters
for constraints.

- Good, because it aligns with future comparison and containment features.
- Good, because it resembles typed range implementations that know a scheme's
  version ordering rules.
- Bad, because it requires type-specific version semantics that are outside the
  first release scope.
- Bad, because it risks committing the public API to resolver-grade behavior too
  early.

### Raw string model

This option exposes only the original or canonical string after validation.

- Good, because it is the smallest possible data model.
- Bad, because it does not provide parsed declaration metadata.
- Bad, because downstream consumers would need to parse the string again to adapt
  it into their own diagnostics or UI.
- Bad, because it does not satisfy the package goal of providing reusable parsed
  VERS data.

## More Information

This decision refines the parsed-data consequence of ADR-0001 and the success
value returned by ADR-0004.

External references:

- VERS specification:
  <https://github.com/package-url/vers-spec/blob/main/docs/standard/specification.md>
- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- VERS version schemes:
  <https://github.com/package-url/vers-spec/blob/main/docs/version-schemes.md>
- `vers-rs` comparator and constraint model:
  <https://github.com/csaf-rs/vers-rs>

This decision should be revisited if one of the following becomes true:

- vers-js adds type-specific comparison, containment, simplification, or native
  range translation;
- consumers need to distinguish explicit equality from implicit bare-version
  equality;
- a future VERS specification revision changes the core parsed declaration shape;
- a semantic range layer needs a separate public model in addition to the syntax
  metadata model.
