---
parent: Decisions
nav_order: 1
status: accepted
date: 12026-06-07
decision-makers: Yunseo Kim
---

# Use TypeScript for the VERS Library

## Context and Problem Statement

During Alexandria development, Windlass identified the need for a reusable
Node-consumable VERS library for Agent Volumes external dependency declaration
validation. The implementation language was intentionally left open so Windlass
could choose based on maintainability, conformance, packaging, and runtime
tradeoffs.

This project now needs a concrete implementation-language baseline for the first
VERS library release. The library must expose a stable package API consumable
from Node.js Agent Volumes tooling while remaining reusable by Alexandria, shelf
CLI, publisher UI, other bibliothecas, and broader Agent Volumes tooling.

The initial supported scope is canonical VERS syntax validation and parsed
declaration metadata. It does not include full cross-ecosystem dependency
resolution, containment, native range translation, vulnerability interpretation,
or resolver behavior.

Which language should Windlass use for the first implementation of the reusable
VERS parser and validation library?

## Decision Drivers

- Expected first-release consumers include TypeScript and Node.js Agent Volumes
  tooling, so the VERS package should have low-friction Node consumption,
  TypeScript types, and straightforward adapter integration.
- The library should preserve a reusable package boundary rather than becoming
  manifest validation code for a single application. The language choice must
  support package versioning, stable public API design, and external reuse.
- The initial parser scope is small enough to implement directly: `vers:`
  scheme, lowercase version scheme/type, slash-separated constraints, pipe-list
  rules, comparator syntax, implicit equality, standalone `*`, required
  percent-decoding, and canonical rejection behavior.
- Official VERS tests are language-neutral and include parse, comparison,
  containment, native range translation, and other future-oriented families.
  The first implementation should use the parse/canonical fixture family without
  accidentally committing to unsupported semantic behavior.
- Version comparison and containment are scheme-specific. A language choice must
  not encourage pretending that generic syntax parsing is resolver-grade
  semantics across npm, PyPI, Debian, RPM, Maven, and other ecosystems.
- Windlass should minimize release, debugging, installation, and CI complexity
  until the VERS implementation has proven it needs native or WebAssembly
  machinery.
- A future Rust, WebAssembly, native, or third-party implementation should be
  able to replace the parser core without changing package consumers or manifest
  validation adapters.

## Considered Options

- TypeScript implementation for the first release
- JavaScript implementation for the first release
- Rust implementation distributed through WebAssembly
- Rust implementation distributed through a native Node addon
- Go implementation distributed through WebAssembly
- Python implementation behind a Node bridge
- Generated grammar with a TypeScript or native runtime

## Decision Outcome

Chosen option: "TypeScript implementation for the first release", because it
provides the lowest-friction path to a stable Node-consumable package API, typed
parser results, structured diagnostics, fixture-based conformance tests, and
Agent Volumes consumer adapter integration while avoiding premature WebAssembly
or native distribution complexity.

Windlass will implement the first reusable VERS library in TypeScript. The
package should expose stable, data-oriented public functions such as
`parseVers()`, `validateVers()`, and `canonicalizeVers()` or equivalent names.
The exact API shape remains an implementation detail, but the public boundary
should return explicit success/failure results, parsed canonical data, and
machine-readable error codes rather than leaking parser internals or relying on
stringly thrown errors as the primary contract.

The TypeScript implementation should remain replaceable. The package may define
an internal parser-engine boundary, but consumers must depend only on the public
package API. Consuming applications can wrap the package with their own manifest
validation adapters. For example, Alexandria can consume the package through an
adapter that owns Agent Volumes declaration-only semantics and maps package
errors into stable manifest issue codes and Problem Details payloads.

Rust and WebAssembly remain valid future candidates. They should be revisited
when VERS semantics, performance pressure, or ecosystem maturity justify the
additional packaging, loading, debugging, and release-management complexity.

### Consequences

- Good, because the first package release aligns with TypeScript and Node.js Agent
  Volumes tooling.
- Good, because typed result and diagnostic shapes can be consumed directly by
  consumer adapters, shelf CLI, publisher UI, and other Node-based tooling.
- Good, because npm package distribution can start without WebAssembly loading,
  native prebuilds, per-platform binaries, or Python runtime assumptions.
- Good, because official VERS parse fixtures and project-owned negative
  fixtures can run in ordinary TypeScript test tooling.
- Good, because the implementation can intentionally reject unsupported semantic
  behavior instead of exposing partial resolver-grade comparison or containment.
- Good, because a stable public API plus consumer adapter boundaries preserve a
  future Rust, WebAssembly, or third-party replacement path.
- Neutral, because TypeScript is not the strongest language for CPU-heavy parser
  workloads or low-level memory guarantees, but the initial parser is not
  expected to be a CPU bottleneck.
- Bad, because Windlass must maintain parser correctness discipline in a
  hand-written TypeScript implementation.
- Bad, because future scheme-specific comparison, containment, simplification,
  or native range translation may outgrow the initial TypeScript parser core.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- the first reusable VERS package implementation is written in TypeScript;
- the package is published or packageable as a Node-consumable module with
  TypeScript declarations;
- the public API exposes stable parsed-data and error-result shapes rather than
  parser internals;
- consumer manifest validation calls a local adapter over the VERS package, not
  package internals;
- the initial supported scope is limited to canonical syntax validation and parsed
  declaration metadata;
- official VERS parse/canonical fixtures and project-owned negative fixtures
  cover whitespace, casing, missing constraints, malformed pipes, comparator
  syntax, invalid `*` usage, percent-decoding, and unsupported forms;
- comparison, containment, simplification, native ecosystem range translation,
  resolver behavior, vulnerability interpretation, and VEX semantics are absent
  or explicitly marked unsupported for the first release.

## Pros and Cons of the Options

### TypeScript implementation for the first release

This option implements the reusable VERS package in TypeScript and publishes it
as a Node-consumable package with TypeScript declarations.

- Good, because it fits the expected first-release TypeScript and Node.js
  consumer baseline.
- Good, because package consumers get first-class TypeScript types for parsed
  models, canonical strings, and structured diagnostics.
- Good, because ordinary npm packaging and TypeScript test tooling are enough for
  the first release.
- Good, because the small initial parser scope does not require native
  performance or cross-language reuse on day one.
- Good, because a data-oriented public API can later wrap a Rust, WebAssembly, or
  third-party parser core without changing package consumers.
- Bad, because hand-written TypeScript parser code needs careful negative tests
  to avoid permissive parsing and accidental semantic commitments.

### JavaScript implementation for the first release

This option implements the reusable VERS package in plain JavaScript and ships
TypeScript declarations separately or through generated types.

- Good, because it keeps Node package distribution simple.
- Good, because it avoids a TypeScript build step in the reusable package.
- Neutral, because the runtime behavior would be similar to TypeScript after
  compilation.
- Bad, because it weakens the authoring-time contract for parsed models and
  structured error shapes.
- Bad, because expected first-release consumers and adjacent tooling are
  TypeScript-oriented, so declaration maintenance would still be required.

### Rust implementation distributed through WebAssembly

This option implements the parser core in Rust and distributes a WebAssembly
package with a JavaScript or TypeScript facade for Node consumption.

- Good, because Rust can provide strong parser correctness, memory safety, and a
  future shared core for multiple runtimes.
- Good, because WebAssembly can eventually support reuse outside Node.js.
- Neutral, because `vers-rs` or another Rust implementation may become useful if
  it matures into a stable reference implementation.
- Bad, because WebAssembly adds packaging, initialization, loading, debugging,
  and CI complexity to the first release path.
- Bad, because Node consumers still need a TypeScript-facing facade and adapter
  error mapping.
- Bad, because Rust/WebAssembly is premature while the first release only needs
  canonical syntax validation rather than heavy comparison or containment.

### Rust implementation distributed through a native Node addon

This option implements the parser core in Rust and exposes it through Node-API or
another native addon bridge.

- Good, because it can provide native performance and strong low-level
  correctness for a future heavy parser or comparison engine.
- Good, because Node-API can reduce Node-version churn compared with older native
  addon patterns.
- Bad, because native addons require per-platform build or prebuild release
  machinery.
- Bad, because installation failures, local toolchain mismatches, and binary
  distribution complexity are not justified for the initial parser scope.
- Bad, because the runtime still needs a TypeScript facade and consumer adapter
  mapping.

### Go implementation distributed through WebAssembly

This option implements the parser core in Go and distributes it through
WebAssembly with JavaScript glue for Node consumption.

- Good, because Go can be operationally simple for standalone tools and future
  service-side components.
- Good, because a Go implementation could be reused by non-Node tooling if a Go
  ecosystem need becomes important.
- Bad, because Go WebAssembly introduces runtime glue and packaging overhead for
  a Node-first package.
- Bad, because it aligns less naturally with TypeScript-oriented Agent Volumes
  tooling and package consumers than a TypeScript implementation.

### Python implementation behind a Node bridge

This option implements the parser in Python and exposes it to Node through a
bridge, child process, or foreign-function integration.

- Good, because Python can be productive for text parsing and could reuse Python
  packaging ecosystem code if a mature VERS implementation appears there.
- Bad, because a Node-consumable package would depend on a Python runtime or
  bridge behavior outside the normal Node package contract.
- Bad, because subprocess or bridge integration complicates deployment,
  debugging, performance, and error mapping.
- Bad, because it is a poor fit for the initial TypeScript and Node.js consumer
  baseline.

### Generated grammar with a TypeScript or native runtime

This option defines a grammar and generates parser code for TypeScript,
JavaScript, Rust, or another runtime.

- Good, because a grammar can make syntax rules explicit and reduce ad hoc parser
  drift once the syntax is stable.
- Good, because generated parsers can be useful if VERS syntax grows more complex
  than a small hand-written parser.
- Neutral, because generated TypeScript could still fit the chosen first-release
  language.
- Bad, because grammar tooling adds complexity before the initial parser scope
  has proven it needs generation.
- Bad, because VERS semantics still require explicit validation logic beyond
  grammar acceptance.

## More Information

This decision is informed by the Alexandria implementation context, where the
need for a reusable Node-consumable VERS library was identified.

External references:

- VERS specification:
  <https://packageurl.org/docs/vers/specification>
- VERS parse and validation guide:
  <https://packageurl.org/docs/vers/how-to-parse>
- VERS tests:
  <https://packageurl.org/docs/vers/tests>
- VERS specification repository:
  <https://github.com/package-url/vers-spec>
- `vers-rs`: <https://github.com/csaf-rs/vers-rs>
- Agent Volumes manifest reference:
  <https://docs.agentvolumes.org/spec/0.1.0-rc.1/volumes/manifest>
- Agent Volumes conformance fixtures:
  <https://docs.agentvolumes.org/spec/0.1.0-rc.1/conformance/fixtures>

This decision should be revisited if one of the following becomes true:

- Agent Volumes consumers need full VERS containment, simplification, merge, invert,
  comparison, native ecosystem range translation, or resolver behavior.
- VERS parsing or validation becomes a measured CPU, latency, or memory
  bottleneck in publish finalize, shelf CLI, publisher UI, or other Agent Volumes
  tooling.
- `vers-rs` or another implementation becomes a stable reference implementation
  with Node-friendly distribution, strong conformance coverage, and low
  integration risk.
- A mature first-party or package-url-maintained TypeScript or JavaScript VERS
  library becomes available and passes the relevant VERS and Agent Volumes
  fixture families.
- Agent Volumes changes external dependency declarations from declaration-only
  metadata into resolver inputs, vulnerability status, VEX status, scanner
  findings, or other security assertions.
- Maintaining the TypeScript parser becomes more expensive than replacing the
  parser core behind the stable package API.
