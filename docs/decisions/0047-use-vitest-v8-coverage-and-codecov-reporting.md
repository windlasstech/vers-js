---
parent: Decisions
nav_order: 47
status: accepted
date: 12026-06-11
decision-makers: Yunseo Kim
---

# Use Vitest V8 Coverage and Codecov Reporting

## Context and Problem Statement

ADR-0037 selects Vitest as the v1 primary test runner for unit, fixture, parser,
diagnostic, resource, and package-boundary tests under the Node.js development
baseline. ADR-0037 leaves coverage thresholds, reporters, and file layout as
implementation details, but the project now needs a concrete coverage collection
and reporting policy before test and CI scaffolding are completed.

The coverage solution must fit the TypeScript, ESM-only, `tsc`-first package
shape from ADR-0001, ADR-0011 through ADR-0014, and ADR-0036. It must also
preserve the Windlass dependency and CI security requirements recorded in
ADR-0003 and the build-and-test architecture specification.

Which coverage collection provider and open-source coverage reporting service
should vers-js use for v1 development and CI?

## Decision Drivers

- Coverage collection should integrate with the selected Vitest test runner
  rather than introducing a parallel test workflow.
- The default local and CI coverage path should work naturally with TypeScript
  and ESM tests.
- Coverage tooling should not change the runtime-agnostic package boundary,
  emitted package artifacts, or `tsc`-first build decision.
- CI should produce a standard machine-readable report that can be consumed by
  hosted reporting tools.
- Public pull requests should receive coverage feedback without adding paid
  infrastructure for the open-source repository.
- Third-party CI integrations must preserve Windlass workflow hardening,
  dependency-review, OSV, and Scorecard requirements.
- Cross-runtime compatibility for Node.js, Deno, and Bun must remain a separate
  built-package smoke-test responsibility rather than being inferred from Node.js
  coverage.

## Considered Options

- Vitest V8 coverage with Codecov reporting
- Vitest V8 coverage only
- Vitest Istanbul coverage with Codecov reporting
- c8 or nyc coverage outside Vitest
- GitHub Actions summaries only
- SonarCloud coverage and quality reporting
- Coveralls reporting

## Decision Outcome

Chosen option: "Vitest V8 coverage with Codecov reporting", because it keeps
coverage collection inside the selected Vitest workflow while using a free
open-source reporting service for pull-request feedback, history, and coverage
status checks.

The v1 test toolchain will use Vitest's `v8` coverage provider for primary
coverage collection. The coverage configuration should emit human-readable local
reports and an LCOV report suitable for hosted reporting services. Equivalent
reporters should include:

```text
text
html
lcov
```

The package scripts should include a coverage command equivalent to:

```text
test:coverage: vitest run --coverage
```

Codecov will be the primary hosted coverage reporting service for the public
open-source repository. CI should upload the generated LCOV report to Codecov for
pull-request and branch coverage reporting. Codecov upload failures must be
configured so they do not hide failing tests, type errors, package build failures,
or required Windlass security checks.

Codecov integration must follow repository and organization CI security rules:

- use minimal GitHub Actions permissions;
- pin third-party actions according to Windlass workflow hardening guidance;
- keep `step-security/harden-runner` coverage-job behavior aligned with existing
  CI policy;
- avoid adding secrets when tokenless public-repository upload is sufficient;
- preserve pnpm frozen-lockfile installation and dependency cooldown policy;
- keep Scorecard, OSV Scanner, and Dependency Review workflows independent and
  required where applicable.

Coverage thresholds are not fixed by this ADR. Initial thresholds may be added
when the implementation and fixture suite exist, but threshold values should be
set by implementation experience rather than guessed before source and tests are
available.

### Consequences

- Good, because coverage collection remains part of the Vitest workflow selected
  by ADR-0037.
- Good, because V8 coverage avoids adding a separate instrumentation runner for
  normal TypeScript and ESM tests.
- Good, because LCOV output keeps the project compatible with Codecov and other
  reporting services if the reporting choice is revisited later.
- Good, because Codecov provides open-source pull-request feedback, trend history,
  and coverage status without paid infrastructure for a public repository.
- Neutral, because the coverage provider and Codecov uploader add development and
  CI dependency surface that must pass normal dependency-security controls.
- Neutral, because coverage is a quality signal and does not replace parser
  fixture coverage, package-boundary tests, type-checking, linting, or
  cross-runtime smoke tests.
- Bad, because Codecov introduces an external SaaS dependency and CI integration
  that must be monitored for availability and supply-chain risk.
- Bad, because V8 coverage reflects the Node.js/V8 test execution path and does
  not prove Deno or Bun runtime compatibility.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- Vitest remains the primary test runner for unit, parser, fixture, diagnostic,
  resource, and package-boundary tests;
- coverage collection uses Vitest's `v8` provider;
- the coverage script runs through `vitest run --coverage` or an equivalent
  Vitest command;
- coverage output includes LCOV for CI upload and at least one local
  human-readable report;
- CI uploads the LCOV report to Codecov for the public repository;
- Codecov integration uses hardened, minimally privileged GitHub Actions
  configuration and does not bypass Windlass security workflows;
- type-checking, linting, package build, package-boundary tests, and Node.js,
  Deno, and Bun smoke tests remain separate release-readiness checks;
- published package artifacts do not include coverage output or coverage-only
  runtime code.

## Pros and Cons of the Options

### Vitest V8 coverage with Codecov reporting

This option uses Vitest's V8 coverage provider for collection and Codecov for
hosted open-source reporting.

- Good, because it is the shortest path from the selected test runner to coverage
  reports and pull-request coverage feedback.
- Good, because V8 coverage fits the Node.js 22 LTS development baseline.
- Good, because Codecov can consume LCOV output while keeping local coverage
  reports available without the hosted service.
- Neutral, because Codecov is a reporting layer rather than the source of test
  truth.
- Bad, because hosted reporting depends on Codecov service availability and
  third-party CI action maintenance.

### Vitest V8 coverage only

This option generates local and CI coverage artifacts through Vitest but does not
upload them to a hosted coverage service.

- Good, because it has the smallest CI integration surface.
- Good, because it avoids external coverage SaaS dependency.
- Bad, because pull requests would not receive persistent hosted coverage history,
  diff coverage, or coverage status checks without additional tooling.

### Vitest Istanbul coverage with Codecov reporting

This option uses Vitest's Istanbul provider and uploads LCOV output to Codecov.

- Good, because Istanbul is a mature coverage ecosystem with broad reporter
  support.
- Good, because instrumented coverage can be useful when V8 coverage is
  insufficient for a future environment.
- Bad, because the Istanbul provider adds pre-instrumentation overhead that is not
  needed for the current Node.js-based Vitest workflow.
- Bad, because it is less minimal than V8 coverage for a greenfield TypeScript and
  ESM parser library.

### c8 or nyc coverage outside Vitest

This option wraps test execution with separate coverage tools such as c8 or nyc.

- Good, because both tools are established and can produce standard coverage
  reports.
- Bad, because they introduce a parallel coverage path even though Vitest already
  provides coverage providers.
- Bad, because a separate wrapper can make local and CI commands less direct than
  `vitest run --coverage`.

### GitHub Actions summaries only

This option generates coverage data in CI and writes summaries or comments through
GitHub Actions without using a hosted coverage service.

- Good, because it keeps coverage visibility inside GitHub and avoids a dedicated
  coverage SaaS account.
- Good, because it can be enough for early local development and lightweight CI
  feedback.
- Bad, because it does not provide Codecov-style hosted history, badges, diff
  coverage, or policy management without additional actions and storage.

### SonarCloud coverage and quality reporting

This option sends coverage reports to SonarCloud and uses its broader quality
analysis platform.

- Good, because SonarCloud can combine coverage with maintainability, duplication,
  security, and quality-gate signals for open-source projects.
- Bad, because it is broader than the current coverage-reporting need and can
  duplicate existing linting, type-checking, and supply-chain security signals.
- Bad, because adopting a full quality platform adds more configuration and policy
  surface than simple coverage reporting.

### Coveralls reporting

This option uploads LCOV coverage reports to Coveralls instead of Codecov.

- Good, because Coveralls is a long-standing open-source coverage reporting
  service with badges and history.
- Good, because it can consume standard coverage reports from Vitest.
- Bad, because Codecov provides the preferred pull-request coverage workflow for
  this project decision.
- Bad, because choosing Coveralls instead of Codecov would not remove the external
  SaaS and third-party CI integration concerns.

## More Information

This decision refines the coverage implementation details left open by ADR-0037.
It depends on the pnpm and dependency-security constraints from ADR-0003, the
ESM-only and root-only package shape from ADR-0011 through ADR-0014, the
`tsc`-first build decision from ADR-0036, the Vitest test-runner decision from
ADR-0037, and the Node.js 22 LTS development baseline from ADR-0040.

This decision should be revisited if Vitest's V8 coverage no longer meets the
project's accuracy or performance needs, if Codecov's open-source terms or
security posture stop fitting the repository, if Windlass standardizes on a
different hosted coverage reporting service, or if cross-runtime coverage becomes
a release requirement rather than a Node.js development quality signal.

External references:

- Vitest coverage: <https://vitest.dev/guide/coverage.html>
- Codecov open source: <https://about.codecov.io/for/open-source/>
- Codecov GitHub Actions integration: <https://docs.codecov.com/docs/github-actions>
- GitHub Actions security hardening: <https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions>
