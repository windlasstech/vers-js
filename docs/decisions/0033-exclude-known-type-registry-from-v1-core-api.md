---
parent: Decisions
nav_order: 33
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Exclude Known-Type Registry from the V1 Core API

## Context and Problem Statement

ADR-0015 decides that v1 core parsing validates only VERS `type` syntax and
canonical casing. It leaves known-type checks to downstream adapters or future
advisory validation. ADR-0031 now fixes the v1 public parser functions as single
string-argument APIs, which means v1 also needs to explicitly exclude registry
callbacks, registry snapshots, and advisory validation options from those core
functions.

The VERS parsing guide says tools should validate that the type is known, while
the VERS specification allows custom and project-specific types that do not match
existing PURL types. Adding a known-type registry to v1 core parsing would turn
support knowledge into parser policy.

Should v1 core functions accept known-type registry or advisory validation inputs?

## Decision Drivers

- v1 core scope is canonical VERS syntax validation and parsed metadata.
- Syntactically valid custom, project-specific, future, and vulnerability-system
  types should remain parseable.
- Registry freshness and support policy differ by product and deployment context.
- Advisory checks need result semantics that differ from hard syntax failures.
- ADR-0031 keeps v1 public parser functions optionless and string-only.

## Considered Options

- Exclude known-type registry and advisory validation from v1 core
- Add a built-in known-type registry with hard failures
- Add a built-in registry with advisory diagnostics
- Accept a pluggable registry callback in core functions

## Decision Outcome

Chosen option: "Exclude known-type registry and advisory validation from v1 core",
because registry membership is support policy rather than core VERS string syntax.

`parseVers()`, `validateVers()`, and `canonicalizeVers()` will not accept registry
callbacks, registry objects, known-type allowlists, advisory-validation flags, or
support-policy options in v1. They will not reject an otherwise valid canonical
VERS string solely because the type is unknown to a PURL, VERS, package ecosystem,
or product-specific registry.

Known-type checks remain a candidate for a future advisory layer or separate API.
That future API must define its own registry source, freshness model, advisory or
error semantics, issue ordering, and interaction with the Result metadata selected
by ADR-0029.

### Consequences

- Good, because the v1 core parser remains forward-compatible with new and custom
  types.
- Good, because vers-js avoids shipping a stale ecosystem support policy as syntax
  validation.
- Good, because the optionless v1 function shape remains intact.
- Good, because product-specific support decisions stay downstream.
- Neutral, because `support.unknown_type` can remain reserved for future layers or
  downstream adapters.
- Bad, because core parsing will not catch type-name typos that are syntactically
  valid.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- v1 public parser functions accept no registry parameter or callback;
- syntactically valid canonical unknown types pass core parsing;
- default core validation does not emit `support.unknown_type`;
- documentation frames known-type validation as downstream, advisory, or future
  opt-in support policy;
- any future registry validation layer is backed by a separate ADR.

## Pros and Cons of the Options

### Exclude known-type registry and advisory validation from v1 core

This option keeps known-type membership outside the first parser API.

- Good, because it reinforces ADR-0015's syntax-only type validation boundary.
- Good, because it supports VERS types that do not match existing PURL types.
- Good, because it avoids registry maintenance and reproducibility work in v1.
- Bad, because callers that want type support checks need a separate layer.

### Add a built-in known-type registry with hard failures

This option rejects unknown but syntactically valid types.

- Good, because it catches likely ecosystem typos early.
- Bad, because it rejects specification-allowed custom or project-specific types.
- Bad, because parser correctness would depend on registry freshness.
- Bad, because it expands syntax parsing into product support policy.

### Add a built-in registry with advisory diagnostics

This option ships a known-type snapshot and reports unknown membership as an
advisory signal.

- Good, because it can help users detect likely type mistakes without hard failure.
- Bad, because v1 does not define warnings or success-with-advisory results.
- Bad, because the first release would need registry snapshot and update policy.

### Accept a pluggable registry callback in core functions

This option lets callers provide a registry to `parseVers()` or `validateVers()`.

- Good, because different products can enforce different known-type policies.
- Bad, because callback inputs conflict with ADR-0031's single-string function
  contract.
- Bad, because callback timing, determinism, errors, and issue ordering all become
  public behavior.

## More Information

This decision narrows the public API consequences of ADR-0015 and ADR-0031. It
does not remove the possibility of a future advisory support layer.

External references:

- VERS specification:
  <https://github.com/package-url/vers-spec/blob/main/docs/standard/specification.md>
- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- PURL registered type index:
  <https://github.com/package-url/purl-spec/blob/main/purl-types-index.json>

This decision should be revisited if one of the following becomes true:

- VERS changes known-type validation from recommended tooling behavior to a
  mandatory validity rule;
- consumers need first-party advisory validation after the core parser ships;
- vers-js adds a separate registry-backed support API.
