---
parent: Decisions
nav_order: 34
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Exclude Repair and Warning Modes from the V1 API

## Context and Problem Statement

ADR-0010 selects strict canonicalization without auto-repair. ADR-0007 defines
public issues with `severity: "error"`. ADR-0031 keeps the v1 public functions as
single-string, optionless entry points. The first release still needs to explicitly
exclude tolerant repair modes and warning/advisory modes from the v1 API.

The VERS parse and validation guide says tools should report errors for
non-canonical input and should not auto-correct non-canonical input during parsing.
Warning and repair modes can be useful in CLIs or editors, but they require result
states that differ from the strict core parser.

Should v1 expose repair mode or warning mode?

## Decision Drivers

- The v1 core API should accept only canonical valid input as success.
- Non-canonical input should not be silently rewritten by core parsing.
- The public issue model currently has errors only, not warnings or informational
  diagnostics.
- Warning and repair behavior require additional ordering, cap, metadata, and
  result-shape decisions.
- Future tooling can add repair suggestions or warnings as a separate layer after
  strict parsing is stable.

## Considered Options

- Exclude repair and warning modes from v1
- Add warning mode to validation results
- Add repair mode to `canonicalizeVers()`
- Add separate tolerant repair and advisory APIs in v1

## Decision Outcome

Chosen option: "Exclude repair and warning modes from v1", because the first
release should provide a strict canonical VERS parser before adding tolerant or
advisory behavior.

`parseVers()`, `validateVers()`, and `canonicalizeVers()` will not accept warning,
advisory, loose, repair, recovery, or coercion flags in v1. They will fail on
malformed or non-canonical strings with structured error diagnostics. They will not
return success-with-warnings, repaired output for invalid input, or best-effort
suggestions as part of the core result.

Future repair or warning features remain possible, but they must be added through a
separate ADR and a distinct public contract that preserves the strict core parser's
meaning.

### Consequences

- Good, because all v1 public functions share one success boundary: valid and
  canonical VERS input.
- Good, because `canonicalizeVers()` remains a canonical-output projection rather
  than a cleanup function.
- Good, because the issue model can remain error-only in v1.
- Good, because the optionless public function shape remains intact.
- Neutral, because downstream applications can still implement local UI repair
  hints from diagnostics.
- Bad, because v1 does not directly support editor-style warnings or suggested
  fixes.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- no v1 public function accepts repair, loose, recovery, advisory, or warning
  options;
- non-canonical input fails rather than being repaired;
- successful results do not carry warnings;
- all public issue severities remain `"error"` in v1;
- documentation directs repair suggestions and advisory warnings to downstream or
  future APIs.

## Pros and Cons of the Options

### Exclude repair and warning modes from v1

This option keeps v1 strict and error-only.

- Good, because it follows the VERS guidance not to auto-correct during parsing.
- Good, because it reinforces ADR-0010's strict canonicalization boundary.
- Good, because it avoids premature result-shape and severity design.
- Bad, because user-facing tools must build their own suggestions if needed.

### Add warning mode to validation results

This option lets valid or near-valid input return warnings.

- Good, because it can support editor and migration workflows.
- Bad, because ADR-0007 currently defines only error severity.
- Bad, because success-with-warning semantics and warning caps are not defined.

### Add repair mode to `canonicalizeVers()`

This option lets `canonicalizeVers()` return canonical output for some invalid or
non-canonical inputs.

- Good, because it is convenient for cleanup workflows.
- Bad, because it blurs the meaning of canonicalization as a strict projection.
- Bad, because repairing ordering, duplicate versions, or comparator sequences may
  require semantic comparison outside v1 scope.
- Bad, because it conflicts with the VERS parsing guide's no-auto-correction rule.

### Add separate tolerant repair and advisory APIs in v1

This option keeps strict functions but adds dedicated functions for warnings or
repair suggestions.

- Good, because tolerant behavior would be clearly separated by name.
- Bad, because it expands the first-release API and fixture surface.
- Bad, because repair and warning policy can be designed better after strict core
  behavior is implemented and used.

## More Information

This decision refines ADR-0010, ADR-0007, and ADR-0031. It does not prevent future
tooling-oriented APIs from offering warnings, suggestions, or repairs outside the
strict v1 core contract.

External references:

- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- Babel parser `errorRecovery` option:
  <https://babeljs.io/docs/babel-parser#errorrecovery>
- npm node-semver README, including explicit `loose` and coercion-style helpers:
  <https://github.com/npm/node-semver#readme>

This decision should be revisited if one of the following becomes true:

- downstream tools need first-party repair suggestions after v1 core parsing ships;
- vers-js introduces warning or informational issue severities;
- VERS adds normative repair or warning behavior.
