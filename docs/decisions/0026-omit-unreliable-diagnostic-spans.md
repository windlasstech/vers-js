---
parent: Decisions
nav_order: 26
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Omit Unreliable Diagnostic Spans

## Context and Problem Statement

ADR-0006 selects bounded accumulated diagnostics and says issue ordering should use
input position when a source span is available. ADR-0007 makes `span` optional on
`VersIssue`. ADR-0016 defines logical parser phases with explicit fatal
boundaries and requires later phases to stop when earlier structure is unreliable.

Some validation failures have a trustworthy location, such as ASCII whitespace,
an invalid comparator, or a malformed percent escape. Other failures may describe
missing structure, whole-input invalidity, or a condition discovered only after
bounded recovery stops. The package must decide whether to always emit spans,
guess spans when uncertain, use whole-input spans, or omit unreliable locations.

How should vers-js handle diagnostic spans when the precise location is not
trustworthy?

## Decision Drivers

- Public spans should be accurate enough for UI highlighting and fixture
  assertions.
- The parser should not invent speculative source locations after fatal
  structural failures.
- `span` is already optional in ADR-0007, so absence can represent unknown or
  unreliable location.
- Whole-input highlights should not be used as a misleading fallback for localized
  errors.
- Diagnostic ordering must remain deterministic even when some issues lack spans.

## Considered Options

- Omit unreliable spans
- Use whole-input spans for uncertain diagnostics
- Use best-effort guessed spans
- Require spans for every issue

## Decision Outcome

Chosen option: "Omit unreliable spans", because optional spans let vers-js expose
precise locations when known without pretending that every diagnostic can be
localized safely.

vers-js will include `span` only when the implementation can identify a reliable
region or point in the original input string. When a diagnostic cannot be localized
without speculative recovery, or when the issue describes a whole-input condition
that has no precise source region, the issue will omit `span`.

Issues without spans remain valid public diagnostics. Their ordering follows the
phase and check-order fallback selected by ADR-0006 after issues with reliable
input positions have been ordered as required by the diagnostic collection policy.

### Consequences

- Good, because span-bearing diagnostics remain trustworthy.
- Good, because the decision aligns with ADR-0016's non-speculative fatal-boundary
  policy.
- Good, because consumers can distinguish localized issues from non-localized
  issues by the presence of `span`.
- Neutral, because some diagnostics may be less visually helpful in UI surfaces.
- Bad, because callers that require every issue to have a location must provide
  their own fallback display policy.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- `span` remains optional on `VersIssue`;
- implementation emits spans only for reliable source locations;
- tests include at least one issue with a span and at least one valid issue
  without a span when such diagnostics exist;
- diagnostics after fatal structural boundaries do not invent spans from
  unreliable structure;
- documentation tells consumers to handle issues without spans.

## Pros and Cons of the Options

### Omit unreliable spans

This option includes `span` only when the location is trustworthy.

- Good, because it preserves the integrity of public diagnostic locations.
- Good, because it uses the optional field shape already selected in ADR-0007.
- Good, because it avoids misleading UI highlights.
- Bad, because some issues cannot be highlighted directly.

### Use whole-input spans for uncertain diagnostics

This option uses `{ start: 0, end: input.length }` whenever a more specific span is
not available.

- Good, because every diagnostic can be displayed with some highlight.
- Good, because it avoids optional-span branching in consumers that expect ranges.
- Bad, because whole-input highlights can imply the entire declaration is the
  localized cause even when only the structure is uncertain.
- Bad, because it weakens the meaning of a span as a precise source location.

### Use best-effort guessed spans

This option estimates a likely source location even when the parser cannot prove
the location is reliable.

- Good, because guessed locations may be more helpful than no location in some UI
  flows.
- Bad, because guesses can be wrong and hard to test deterministically.
- Bad, because it conflicts with bounded diagnostics and explicit fatal boundaries.
- Bad, because consumers may treat guessed spans as authoritative.

### Require spans for every issue

This option makes `span` mandatory for all diagnostics.

- Good, because the public issue shape becomes simpler for consumers that always
  highlight source text.
- Bad, because ADR-0007 already models `span` as optional.
- Bad, because whole-input or guessed spans would be required for issues that do
  not have trustworthy locations.
- Bad, because it encourages speculative recovery after fatal structural failures.

## More Information

This decision refines the optional `span` field from ADR-0007, the bounded
diagnostic ordering policy from ADR-0006, and the fatal-boundary parser policy from
ADR-0016. ADR-0023, ADR-0024, and ADR-0025 define the coordinate space and numeric
unit for spans when they are present.

External references:

- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- Language Server Protocol diagnostics and ranges:
  <https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnostic>

This decision should be revisited if one of the following becomes true:

- VERS defines normative diagnostic location behavior;
- downstream consumers require every public issue to carry a range;
- vers-js adds a tolerant repair or recovery API whose purpose includes
  best-effort location suggestions.
