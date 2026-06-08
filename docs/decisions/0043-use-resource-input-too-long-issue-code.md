---
parent: Decisions
nav_order: 43
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use `resource.input_too_long` for Input Length Limit Failures

## Context and Problem Statement

ADR-0027 selects a fixed v1 input length limit. Inputs longer than that limit must
fail before normal parsing and validation phases run, using the normal Result
failure branch and a machine-readable resource-limit issue code. ADR-0007's
initial issue-code catalog does not include a `resource.*` namespace.

The project now needs the exact public issue code for this oversized-input
failure.

Which issue code should v0.1.0 return when the input string is longer than the
fixed internal maximum input length?

## Decision Drivers

- Oversized string input is a normal validation failure for string input, not a
  programmer error.
- The code should clearly describe an input-length resource boundary rather than a
  VERS grammar rule.
- The code should not be confused with diagnostic issue-cap truncation from
  ADR-0028 and ADR-0029.
- The code should fit the hierarchical namespaced issue-code pattern from
  ADR-0007.
- The code should stay stable even if the numeric input-length limit changes in a
  later release.

## Considered Options

- Use `resource.input_too_long`
- Use `resource.max_input_length_exceeded`
- Use `resource.limit_exceeded`
- Reuse an existing lexical or syntax issue code
- Represent oversized input only through failure metadata

## Decision Outcome

Chosen option: "Use `resource.input_too_long`", because it is concise, specific to
the input-length boundary, and distinct from diagnostic truncation metadata.

The v0.1.0 resource issue-code union is:

```ts
export type VersResourceIssueCode = "resource.input_too_long";
```

`resource.input_too_long` is part of the v0.1.0 core-emitted `VersIssueCode` union
selected by ADR-0042. Public functions must return this code when a string input
exceeds the fixed v0.1.0 maximum input length selected under ADR-0027. The check
must run before normal parser phases allocate decoded metadata or ordinary syntax
diagnostics.

The issue should use the normal failure result shape:

```ts
{
  ok: false,
  issues: [
    {
      code: "resource.input_too_long",
      message: string,
      severity: "error"
    }
  ]
}
```

The issue may omit `span` when the condition is best described as a whole-input
resource boundary rather than a localized syntax problem, consistent with ADR-0026.

Diagnostic issue-cap exhaustion must not use `resource.input_too_long` and must
not add a separate `resource.max_issues_exceeded` issue. Issue-cap exhaustion is
reported through result metadata as decided by ADR-0029 and refined separately.

### Consequences

- Good, because ADR-0027's required resource-limit issue code is now concrete.
- Good, because resource-boundary failures are separated from lexical, syntax, and
  constraint grammar failures.
- Good, because the name does not bake the numeric limit into the public code.
- Good, because the code cannot be confused with diagnostic truncation metadata.
- Neutral, because adding a `resource.*` namespace expands the initial catalog from
  ADR-0007.
- Bad, because consumers must handle one issue-code namespace whose cause is a
  library resource limit rather than an upstream VERS syntax rule.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- `VersResourceIssueCode` includes `"resource.input_too_long"`;
- `VersIssueCode` includes `VersResourceIssueCode` for v0.1.0 core results;
- inputs above the fixed maximum length return a Result failure with
  `resource.input_too_long` before ordinary parsing begins;
- non-string runtime input still follows ADR-0032 and throws `TypeError` rather
  than returning `resource.input_too_long`;
- diagnostic issue-cap exhaustion is represented through metadata, not through a
  resource issue code.

## Pros and Cons of the Options

### Use `resource.input_too_long`

This option names the oversized-input failure directly.

- Good, because it is short and self-describing.
- Good, because it identifies the source as the input string rather than a parser
  phase.
- Good, because it remains valid if the numeric maximum changes later.
- Bad, because callers need to read documentation to learn the applied maximum
  input length.

### Use `resource.max_input_length_exceeded`

This option names the configured maximum in the code.

- Good, because it explicitly mentions the maximum input length.
- Bad, because it is longer and less ergonomic in switch statements.
- Bad, because `max_*_exceeded` vocabulary can be confused with diagnostic issue
  cap exhaustion.

### Use `resource.limit_exceeded`

This option uses one broad resource-limit code.

- Good, because it could cover several future resource limits.
- Bad, because callers would need metadata or messages to distinguish input length
  from issue cap, timeout, or future memory budgets.
- Bad, because ADR-0027 asks for the issue code emitted for the input-length
  failure specifically.

### Reuse an existing lexical or syntax issue code

This option treats oversized input as a lexical or syntax failure.

- Good, because it avoids a new namespace.
- Bad, because input length is not an upstream VERS grammar rule.
- Bad, because it hides the resource-boundary cause from callers.

### Represent oversized input only through failure metadata

This option reports input length as result metadata rather than an ordinary issue.

- Good, because resource state is separated from source diagnostics.
- Bad, because ADR-0027 explicitly requires a normal Result failure branch with a
  machine-readable resource-limit issue code.
- Bad, because callers rendering issue lists would have no source-level failure to
  display.

## More Information

This decision fills the issue-code gap between ADR-0007 and ADR-0027. It should be
read with ADR-0028 and ADR-0029, which handle the separate diagnostic issue cap and
its metadata signal, and with ADR-0042, which decides how active and reserved issue
code unions are separated.

This decision should be revisited if VERS defines a normative maximum declaration
length or if a future public options API changes how input length budgets are
selected and reported.
