---
parent: Decisions
nav_order: 30
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Reserve Resource Options and Use Internal V1 Constants

## Context and Problem Statement

ADR-0027 selects a fixed v1 input length limit. ADR-0028 selects a fixed v1
diagnostic issue cap. Both decisions intentionally defer user-configurable
overrides even though different host applications may eventually need different
resource budgets.

The first release must now decide whether public functions such as `parseVers()`,
`validateVers()`, and `canonicalizeVers()` should accept options for these budgets,
or whether v1 should keep the API surface limited to the input string and reserve
configurable resource options for a later release.

Should v1 expose user-configurable resource-limit options?

## Decision Drivers

- ADR-0004 keeps the first public API small and data-oriented.
- Resource options become long-lived public contracts once exposed.
- Safe defaults should not require consumers to understand parser resource
  budgets before calling vers-js.
- Future users may need to raise or lower limits for CLIs, servers, browsers, or
  offline batch tools.
- The v1 implementation should gain experience with real inputs before committing
  to option names, ranges, and validation behavior.

## Considered Options

- Internal constants only, future options reserved
- Expose v1 resource options immediately
- Expose separate strict and configurable entry points
- Use global mutable configuration

## Decision Outcome

Chosen option: "Internal constants only, future options reserved", because v1
needs secure fixed defaults more than it needs a broad configuration API.

The first release will use internal constants for input length and diagnostic
issue limits. Public entry points remain equivalent to the ADR-0004 signatures:

```ts
parseVers(input: string): VersParseResult;
validateVers(input: string): VersValidationResult;
canonicalizeVers(input: string): VersCanonicalizeResult;
```

No v1 public option will override the input length limit or the issue cap. The
implementation should name and centralize the internal constants so a future
options API can reuse the same semantics.

This decision explicitly reserves a future options parameter, likely as an
optional second argument, for advanced callers that need to tune resource budgets.
That future API should preserve safe defaults, validate option values, and define
how option-provided limits appear in metadata from ADR-0029. Deferring the options
API is a prioritization choice, not a rejection of configurability.

### Consequences

- Good, because the first release has a minimal and stable public function shape.
- Good, because all callers receive the same safe default resource behavior.
- Good, because implementation and fixture work can focus on parser correctness
  before option validation.
- Good, because future configurability remains an intentional path.
- Neutral, because internal constants still need documentation even though they
  are not options.
- Bad, because advanced callers cannot tune limits in v1.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- v1 public entry points do not accept resource-limit options;
- input length and issue cap values are defined as internal constants;
- documentation states that these limits are fixed in v1;
- tests verify default limit behavior without passing options;
- future option names are not exposed accidentally through public types.

## Pros and Cons of the Options

### Internal constants only, future options reserved

This option keeps v1 public functions option-free while designing the constants so
they can become configurable later.

- Good, because it preserves the small API shape selected by ADR-0004.
- Good, because security defaults cannot be accidentally disabled in v1.
- Good, because option naming and validation can be informed by real consumer
  feedback.
- Bad, because callers with unusual limits have no supported override in v1.

### Expose v1 resource options immediately

This option adds parameters such as `{ maxInputLength, maxIssues }` in the first
release.

- Good, because callers can adapt vers-js to different deployment environments.
- Good, because metadata can report caller-provided budgets from the start.
- Bad, because it expands the first public API and creates compatibility pressure
  around option names, defaults, ranges, and invalid values.
- Bad, because unsafe high limits can undermine the default resource posture.

### Expose separate strict and configurable entry points

This option keeps default functions fixed but adds separate configurable variants.

- Good, because casual callers keep a simple API while advanced callers get
  control.
- Bad, because it multiplies function names and result-type documentation.
- Bad, because it is more API surface than v1 needs.

### Use global mutable configuration

This option lets callers set package-wide resource limits.

- Good, because call sites remain concise after configuration.
- Bad, because global mutable state is hard to reason about in libraries, tests,
  concurrent callers, and mixed dependency graphs.
- Bad, because it weakens runtime-agnostic, data-oriented API expectations.

## More Information

This decision completes the v1 resource-limit set started by ADR-0027, ADR-0028,
and ADR-0029. It refines the public function signatures selected by ADR-0004
without changing their v1 call shape.

External references:

- Babel parser options:
  <https://babeljs.io/docs/babel-parser#options>
- Ajv options:
  <https://ajv.js.org/options.html>
- TypeScript `noErrorTruncation` option:
  <https://www.typescriptlang.org/tsconfig/noErrorTruncation.html>

This decision should be revisited if one of the following becomes true:

- real v1 consumers need legitimate declarations above the fixed input limit;
- consumers need lower limits for browser, server, or CLI safety profiles;
- a future release adds an explicit `ParseOptions` or `VersOptions` public type.
