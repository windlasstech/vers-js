---
parent: Decisions
nav_order: 29
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Expose Diagnostic Cap Metadata

## Context and Problem Statement

ADR-0004 selects a failure result containing `issues: VersIssue[]`. ADR-0028
selects a fixed v1 diagnostic issue cap. When that cap is reached, vers-js must
tell callers that the returned issue list is intentionally incomplete.

If cap exhaustion is silent, callers may interpret the returned issue count as the
complete number of problems. If cap exhaustion is represented as an ordinary issue,
resource-budget state becomes mixed with input diagnostics and consumes part of the
same issue budget. Because diagnostic truncation describes the result collection
process rather than a source-level VERS problem, it needs a public representation
that is visible but distinct from ordinary issues.

How should vers-js expose that diagnostic collection stopped because the issue cap
was reached?

## Decision Drivers

- Callers should know when `issues` is a truncated sample rather than a complete
  bounded diagnostic set.
- Resource-budget state should not be confused with a VERS syntax or canonicality
  issue.
- The metadata shape should remain data-oriented and runtime-agnostic.
- The v1 public result shape may expand, but parser internals must remain hidden.
- The design should leave room for future resource metadata such as input-length
  or timeout-related budgets without requiring a second result-shape redesign.

## Considered Options

- Add result metadata for diagnostic truncation
- Add a sentinel issue when the cap is reached
- Silently truncate the issue list
- Throw or return a separate resource-limit error shape

## Decision Outcome

Chosen option: "Add result metadata for diagnostic truncation", because cap
exhaustion describes the completeness of the result, not an additional source
diagnostic.

Failure results may include resource metadata equivalent to:

```ts
type VersResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: VersIssue[]; metadata?: VersFailureMetadata };

interface VersFailureMetadata {
  diagnostics?: {
    truncated: boolean;
    maxIssues: number;
  };
}
```

The exact exported type names may be refined during implementation, but the public
contract must make truncation machine-readable without requiring callers to parse
messages or look for a synthetic issue code. `diagnostics.truncated` is present and
true when the issue cap selected by ADR-0028 prevents additional ordinary issues
from being returned. `maxIssues` reports the cap that was applied.

The metadata is not a parser phase artifact and must not expose internal scanner,
token, or recovery state. It describes only the public result's diagnostic
completeness.

### Consequences

- Good, because callers can distinguish incomplete diagnostic samples from complete
  issue lists.
- Good, because ordinary `issues` remain source-level diagnostics.
- Good, because the issue cap does not need to reserve space for a sentinel issue.
- Good, because future resource metadata can be added under the same public result
  concept if needed.
- Neutral, because failure results gain an optional metadata field beyond the
  minimal ADR-0004 shape.
- Bad, because consumers must handle one more public field if they need complete
  diagnostic accounting.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- cap exhaustion is exposed through machine-readable metadata;
- cap metadata is absent or not marked truncated when the issue cap was not
  reached;
- tests cover both truncated and non-truncated failure results;
- ordinary issue codes are not used as the sole signal for diagnostic truncation;
- metadata does not expose parser internals.

## Pros and Cons of the Options

### Add result metadata for diagnostic truncation

This option adds optional metadata to the failure branch of the public Result.

- Good, because truncation is represented as result state rather than as a fake
  source issue.
- Good, because callers can branch on a stable boolean.
- Good, because the issue budget is reserved for actual diagnostics.
- Bad, because it expands the result type selected by ADR-0004.

### Add a sentinel issue when the cap is reached

This option appends an issue such as `resource.max_issues_exceeded`.

- Good, because it preserves a single `issues` array as the only failure payload.
- Good, because existing issue-rendering UIs can display the truncation signal.
- Bad, because cap state is not a source-level diagnostic.
- Bad, because the sentinel either consumes issue budget or requires a special
  exception to the cap.

### Silently truncate the issue list

This option returns at most the cap and provides no explicit signal.

- Good, because the result shape remains minimal.
- Bad, because callers may believe the returned issue list is complete.
- Bad, because UIs cannot explain why additional diagnostics are missing.

### Throw or return a separate resource-limit error shape

This option treats cap exhaustion as a different failure mode from normal
diagnostic results.

- Good, because resource-limit handling is explicit.
- Bad, because ADR-0004 selected structured non-throwing results for validation
  failures.
- Bad, because callers would need a separate control path even though useful
  diagnostics are still available.

## More Information

This decision refines the failure branch selected by ADR-0004 and the fixed issue
cap selected by ADR-0028. It should be read with ADR-0007, which keeps ordinary
issues focused on machine-readable source diagnostics.

External references:

- Zod error customization and issue arrays:
  <https://zod.dev/error-customization>
- Ajv validation errors:
  <https://ajv.js.org/api.html#validation-errors>
- Problem Details for HTTP APIs:
  <https://www.rfc-editor.org/rfc/rfc9457>

This decision should be revisited if one of the following becomes true:

- public consumers strongly prefer all failure state to be represented as issues;
- future resource budgets require metadata that cannot fit this shape cleanly;
- ADR-0004 is replaced by a materially different public result contract.
