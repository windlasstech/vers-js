---
parent: Decisions
nav_order: 28
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use a Fixed V1 Diagnostic Issue Cap

## Context and Problem Statement

ADR-0006 selects bounded accumulated diagnostics: vers-js accumulates diagnostics
only while the remaining input can be interpreted reliably. ADR-0016 refines that
policy with logical parser phases and fatal boundaries. These decisions prevent
speculative cascades, but they do not limit the number of legitimate independent
issues that a hostile input can trigger before a fatal boundary.

For example, a long but structurally splittable declaration could contain many
independent malformed separators, empty constraints, invalid percent escapes, or
other local failures. Returning an unbounded `issues: VersIssue[]` would make the
failure result itself a possible resource-exhaustion vector.

Should vers-js cap the number of diagnostics returned in a failure result?

## Decision Drivers

- Failure results should remain bounded in memory use and serialized size.
- The parser should not create every possible issue and then truncate afterward;
  the cap must prevent unnecessary allocation work.
- The cap should refine, not replace, ADR-0006's bounded accumulation policy.
- Diagnostic ordering must remain deterministic when the cap is reached.
- The first release should avoid phase-specific budgets unless they are necessary.

## Considered Options

- Fixed global issue cap
- No issue cap
- Phase-specific issue caps
- Fail-fast diagnostics with a single issue

## Decision Outcome

Chosen option: "Fixed global issue cap", because it bounds the size of every
failure result while preserving the multi-issue behavior selected by ADR-0006.

vers-js will define an internal maximum number of issues that may be returned from
one parse, validate, or canonicalize operation. Once the issue budget is exhausted,
the implementation will stop adding further ordinary diagnostics and will return a
failure result with diagnostic-cap metadata as decided by ADR-0029.

The exact numeric value is an implementation constant to be selected before the
first release, documented with the implementation, and covered by tests. The cap
applies across all logical parser phases and all public entry points. It is not a
user-configurable v1 API option.

The cap is checked while collecting diagnostics, before allocating and pushing an
additional issue. Implementations must not generate an unbounded issue list and
slice it afterward.

### Consequences

- Good, because every failure result has a bounded `issues` array.
- Good, because hostile inputs cannot force unbounded diagnostic allocation.
- Good, because callers still receive multiple diagnostics up to the cap.
- Good, because one global cap is easier to explain and test than phase-specific
  budgets.
- Neutral, because some lower-priority diagnostics may be omitted once the cap is
  reached.
- Bad, because a single early phase can consume the global budget before later
  phases run.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- every public entry point uses the same issue cap;
- the implementation checks the issue budget before adding diagnostics;
- tests cover a result below the cap, at the cap, and above the cap;
- issue ordering remains deterministic when the cap is reached;
- no v1 public API option allows callers to override the cap.

## Pros and Cons of the Options

### Fixed global issue cap

This option uses one internal maximum issue count for each operation.

- Good, because it creates a simple and testable failure-result size bound.
- Good, because it preserves useful accumulated diagnostics without exposing an
  unbounded array.
- Good, because the cap composes with ADR-0006's fatal-boundary rules.
- Bad, because the budget is shared by all issue categories.

### No issue cap

This option accumulates every safely discoverable issue under ADR-0006.

- Good, because callers get the richest diagnostic set for malformed input.
- Bad, because hostile input can produce very large issue arrays.
- Bad, because memory and serialization costs remain unbounded even if parsing is
  otherwise linear.

### Phase-specific issue caps

This option allocates separate budgets to lexical, structural, constraint,
decoding, and canonicality phases.

- Good, because one noisy phase cannot consume the entire diagnostic budget.
- Good, because UI consumers may see a more balanced sample of issue categories.
- Bad, because it complicates public documentation and fixtures.
- Bad, because phase budgets expose more of the internal parser model selected by
  ADR-0016 than v1 needs.

### Fail-fast diagnostics with a single issue

This option returns only the first diagnostic and therefore has an implicit cap of
one.

- Good, because it minimizes diagnostic allocation.
- Good, because many parsers treat syntax errors as fatal.
- Bad, because ADR-0006 intentionally selected accumulated diagnostics for better
  developer feedback.
- Bad, because it underuses the `issues: VersIssue[]` shape selected by ADR-0004.

## More Information

This decision refines ADR-0006 by adding a resource budget to safe diagnostic
accumulation. ADR-0029 decides how callers learn that the cap was reached.
ADR-0030 reserves future public options for changing the cap.

External references:

- Babel parser `errorRecovery` option:
  <https://babeljs.io/docs/babel-parser#errorrecovery>
- Ajv option guidance for collecting all errors:
  <https://ajv.js.org/options.html#allerrors>
- CWE-400: Uncontrolled Resource Consumption:
  <https://cwe.mitre.org/data/definitions/400.html>

This decision should be revisited if one of the following becomes true:

- user-facing tools need phase-balanced diagnostic samples;
- implementation experience shows the global cap hides the most useful issues;
- vers-js adds a public options API for parser resource budgets.
