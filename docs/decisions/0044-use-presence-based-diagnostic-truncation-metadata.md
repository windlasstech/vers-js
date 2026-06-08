---
parent: Decisions
nav_order: 44
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use Presence-Based Diagnostic Truncation Metadata

## Context and Problem Statement

ADR-0028 selects a fixed v1 diagnostic issue cap. ADR-0029 decides that cap
exhaustion should be exposed as result metadata rather than as an ordinary issue,
but its example shape still leaves implementation latitude around whether
diagnostic metadata is always present, whether `truncated: false` is represented,
and how callers should interpret absence.

The public failure metadata shape now needs to be fixed for v0.1.0.

How should vers-js represent that the diagnostic issue cap truncated the returned
`issues` array?

## Decision Drivers

- Callers should be able to detect diagnostic truncation without parsing messages
  or searching for sentinel issue codes.
- Ordinary `issues` should remain source-level diagnostics.
- The metadata shape should be precise, minimal, and easy to narrow in TypeScript.
- Absence of metadata should be enough to represent the common non-truncated case.
- The shape should leave room for future failure metadata without exposing parser
  internals.

## Considered Options

- Presence-based truncation metadata
- Optional metadata with `truncated: boolean`
- Always include diagnostic metadata
- Add a sentinel issue when truncation occurs

## Decision Outcome

Chosen option: "Presence-based truncation metadata", because metadata should only
appear when it carries machine-readable failure-result state, and `truncated: true`
is the only v0.1.0 diagnostic-cap metadata state callers need to observe.

The v0.1.0 failure result shape is:

```ts
export type VersResult<T> = VersSuccess<T> | VersFailure;

export interface VersSuccess<T> {
  ok: true;
  value: T;
}

export interface VersFailure {
  ok: false;
  issues: VersIssue[];
  metadata?: VersFailureMetadata;
}

export interface VersFailureMetadata {
  diagnostics?: VersDiagnosticsMetadata;
}

export interface VersDiagnosticsMetadata {
  truncated: true;
  maxIssues: number;
}
```

`metadata.diagnostics` is present only when the issue cap selected by ADR-0028
prevents additional ordinary issues from being returned. When diagnostics are not
truncated, `metadata.diagnostics` is absent. Implementations should not emit
`diagnostics: { truncated: false, ... }` in v0.1.0.

`maxIssues` reports the issue cap that was applied to the operation. In v0.1.0,
that value is the fixed internal constant selected under ADR-0028 and ADR-0030.
If a future options API allows callers to configure the cap, the value should
report the effective cap used for that call.

Diagnostic truncation metadata is result-completeness state. It must not expose
scanner state, parser phases, token positions, omitted issue counts, or recovery
internals.

### Consequences

- Good, because callers can branch on the presence of
  `metadata?.diagnostics?.truncated` and know it is always `true` when present.
- Good, because the common non-truncated failure result remains small.
- Good, because ordinary issues remain reserved for source-level VERS diagnostics.
- Good, because the shape composes with future metadata categories under
  `VersFailureMetadata`.
- Neutral, because callers infer the non-truncated case from absence rather than a
  literal `false` value.
- Bad, because consumers that prefer fully populated metadata must use optional
  chaining or default values.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- failure results include `metadata.diagnostics` only when the diagnostic issue cap
  truncates ordinary issues;
- `VersDiagnosticsMetadata.truncated` is typed as `true`, not `boolean`;
- non-truncated failure results omit `metadata.diagnostics`;
- diagnostic cap exhaustion does not add a sentinel `VersIssue`;
- `maxIssues` reports the effective cap applied to the operation;
- metadata does not expose parser internals or omitted issue counts.

## Pros and Cons of the Options

### Presence-based truncation metadata

This option includes diagnostic metadata only for truncated failure results.

- Good, because the type directly models the only exceptional diagnostic-cap state.
- Good, because callers do not need to distinguish `false` from absence.
- Good, because result payloads stay compact when diagnostics are complete.
- Bad, because absence-as-false must be documented clearly.

### Optional metadata with `truncated: boolean`

This option preserves ADR-0029's broader example shape with a boolean value.

- Good, because `false` can explicitly state that no truncation occurred.
- Good, because it is familiar to callers who expect boolean flags.
- Bad, because it creates extra representation choices: omitted metadata,
  omitted diagnostics, or `truncated: false`.
- Bad, because callers must handle states that do not carry useful v0.1.0
  information.

### Always include diagnostic metadata

This option includes diagnostic metadata on every failure result.

- Good, because failure result shape is more uniform.
- Good, because callers can read `maxIssues` without checking optional fields.
- Bad, because every failure exposes resource-budget details even when the cap was
  irrelevant.
- Bad, because the common failure payload becomes larger than needed.

### Add a sentinel issue when truncation occurs

This option represents truncation as an ordinary issue code.

- Good, because issue-rendering UIs can display truncation without reading
  metadata.
- Bad, because ADR-0029 decides that cap exhaustion is result state rather than a
  source-level diagnostic.
- Bad, because a sentinel either consumes issue budget or requires a special cap
  exception.

## More Information

This decision fixes the exact v0.1.0 metadata shape for ADR-0029. It depends on the
fixed global issue cap from ADR-0028, the internal constants policy from ADR-0030,
and the active issue-code separation from ADR-0042 and ADR-0043.

This decision should be revisited if future resource budgets require metadata that
cannot fit under `VersFailureMetadata`, if callers need exact omitted issue counts,
or if a future public options API changes how effective issue caps are reported.
