---
parent: Decisions
nav_order: 27
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use a Fixed V1 Input Length Limit

## Context and Problem Statement

ADR-0004 selects a Result-centered public API for parsing, validating, and
canonicalizing VERS declarations. ADR-0006 selects bounded accumulated diagnostics,
and ADR-0016 defines logical parser phases with explicit fatal boundaries. Those
decisions bound speculative diagnostic recovery, but they do not bound the amount
of input that the parser must scan before it can return a result.

VERS declarations are expected to be compact package-version range declarations.
Hostile callers can still provide arbitrarily long strings unless vers-js rejects
oversized input before normal parsing. Even a linear scanner consumes CPU in
proportion to input length, and large strings can force downstream diagnostic and
canonicalization code to allocate more memory than intended.

Should vers-js impose an input length limit in the first release?

## Decision Drivers

- The published library must be safe to call with untrusted strings.
- The parser should have a documented worst-case resource envelope for hostile
  input.
- The first release should keep the public API small while still preserving a path
  to future configurability.
- Input length checks should be runtime-agnostic and should not depend on Node.js,
  Deno, Bun, process limits, timers, or host-specific request middleware.
- The limit should be enforced before normal parser phases allocate diagnostics or
  decoded metadata.

## Considered Options

- Fixed hard limit for v1
- No library-level input length limit
- Default limit with v1 user override option
- Host-environment limits only

## Decision Outcome

Chosen option: "Fixed hard limit for v1", because it gives the first release a
clear resource boundary while keeping the public API unchanged.

vers-js will define an internal maximum input length for v1. Inputs longer than
that limit will fail before normal parsing and validation phases run. The failure
will use the normal Result failure branch and a machine-readable resource-limit
issue code.

The exact numeric value is an implementation constant to be selected before the
first release, documented with the implementation, and covered by tests. The
constant is not a user-configurable v1 API option. The value should be large enough
for realistic VERS declarations and small enough to keep worst-case scanning,
allocation, and diagnostic behavior bounded.

Although v1 will not expose an override, this decision intentionally reserves room
for a future options API that lets advanced callers raise or lower the input
length limit. Such an override is deferred because the first release should avoid
expanding the public API before real consumer needs are known.

### Consequences

- Good, because hostile inputs cannot force unbounded parser work through string
  length alone.
- Good, because the limit is simple to implement before any phase-specific logic
  runs.
- Good, because the v1 public function signatures from ADR-0004 stay small.
- Good, because future configurable limits remain possible without weakening the
  default behavior.
- Neutral, because the exact limit is an implementation constant rather than a
  VERS specification rule.
- Bad, because a caller with unusually long but otherwise valid declarations must
  wait for a future override API or fork/wrap the package.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- all public parsing, validation, and canonicalization entry points check input
  length before normal parsing work;
- oversized inputs return a structured failure result rather than throwing as
  normal validation control flow;
- tests cover an input at the limit, an input above the limit, and the issue code
  emitted for the limit failure;
- the maximum input length is defined as an internal constant and documented for
  users;
- no v1 public API option allows callers to override the limit.

## Pros and Cons of the Options

### Fixed hard limit for v1

This option rejects inputs above a fixed internal maximum length.

- Good, because it directly mitigates CWE-400-style uncontrolled resource
  consumption from arbitrarily long strings.
- Good, because it is runtime-agnostic and deterministic.
- Good, because it can be tested without host-specific timeout or memory behavior.
- Bad, because any fixed value can be too low for an unforeseen legitimate use.

### No library-level input length limit

This option accepts any JavaScript string length and relies on linear parser
behavior.

- Good, because vers-js would not impose a package-specific size rule beyond the
  VERS syntax.
- Good, because there is no risk of rejecting an unusually long declaration solely
  because of length.
- Bad, because untrusted callers can force unbounded CPU and memory use up to host
  limits.
- Bad, because diagnostic caps do not prevent the parser from scanning very large
  inputs.

### Default limit with v1 user override option

This option exposes a public option such as `maxInputLength` in the first release.

- Good, because applications can tune the limit for their own threat model.
- Good, because it combines safe defaults with flexibility.
- Bad, because it expands the v1 API surface before the rest of the parser contract
  has implementation experience.
- Bad, because invalid or extreme option values require additional validation and
  public error behavior.

### Host-environment limits only

This option relies on request body limits, process memory, timeouts, or wrapper
code outside vers-js.

- Good, because host applications often already enforce transport-level limits.
- Bad, because vers-js is a runtime-agnostic library and cannot assume a host
  request boundary exists.
- Bad, because direct library calls from CLIs, build tools, tests, and browser
  applications may bypass transport-level protections.

## More Information

This decision adds a resource boundary to the parser phases selected by ADR-0016
and the bounded diagnostic policy selected by ADR-0006. The issue cap is decided
separately in ADR-0028. Public configurability is reserved by ADR-0030.

External references:

- CWE-400: Uncontrolled Resource Consumption:
  <https://cwe.mitre.org/data/definitions/400.html>
- CWE-770: Allocation of Resources Without Limits or Throttling:
  <https://cwe.mitre.org/data/definitions/770.html>
- Python `json` module security considerations:
  <https://docs.python.org/3/library/json.html>

This decision should be revisited if one of the following becomes true:

- real consumers need to parse legitimate declarations above the v1 limit;
- VERS defines a normative maximum declaration length;
- vers-js adds a public options API for parser resource budgets.
