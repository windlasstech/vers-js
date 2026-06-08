---
title: Resource Limits
parent: Architecture Specifications
nav_order: 8
---

# Resource Limits

This specification defines the fixed v0.1.0 resource boundary for public
`vers-js` operations: input length, diagnostic issue count, oversized-input
failure behavior, diagnostic truncation metadata, and the absence of public
resource options.

Primary ADR inputs: ADR-0027, ADR-0028, ADR-0029, ADR-0030, ADR-0043,
ADR-0044, and ADR-0045.

## Resource constants

The v0.1.0 core uses exactly these internal constants:

```ts
const MAX_INPUT_LENGTH = 1024;
const MAX_ISSUES = 16;
```

These constants are implementation resource ceilings. They are not VERS grammar
rules, upstream conformance requirements, package ecosystem support policies, or
public configuration options.

The implementation should centralize these constants so parser, diagnostics,
fixtures, and future options work use the same values and semantics. The constants
may be exported only if a later architecture decision adds a public constants
surface; v0.1.0 public functions do not require callers to import them.

## Public operation coverage

Every public entry point applies the same resource behavior:

```ts
parseVers(input);
validateVers(input);
canonicalizeVers(input);
```

They must not differ in:

- input length limit;
- oversized-input issue code;
- preflight stop behavior;
- diagnostic issue cap;
- truncation metadata behavior;
- absence of resource options.

The operations differ only in successful value projection. Resource failures are
shared validation failures for string input.

Non-string runtime input is not handled by this resource contract. It follows
`public-api.md` and throws `TypeError` before resource-limit validation.

## Input length measurement

`MAX_INPUT_LENGTH` is measured with JavaScript string `.length`, which counts
UTF-16 code units.

This matches the diagnostic span coordinate system:

- zero-based offsets;
- half-open ranges;
- UTF-16 code units;
- source slices via `input.slice(start, end)`.

The input length limit is a whole-input resource gate. It does not count Unicode
code points, grapheme clusters, UTF-8 bytes, percent-decoded bytes, decoded
version strings, canonical output length, or JSON-serialized fixture length.

## Preflight input length gate

Before any normal parser phase runs, every public entry point checks:

```ts
input.length > MAX_INPUT_LENGTH;
```

If this condition is true, parsing stops immediately. The implementation must not
run lexical scanning, structural parsing, constraint splitting, percent-decoding,
duplicate detection, canonical serialization, or success projection for that
input.

No decoded metadata, canonical output, token list, parser phase object, or ordinary
syntax diagnostics should be allocated for oversized input.

Inputs with `input.length === 1024` remain eligible for normal parsing and
validation. They may still fail for lexical, syntax, constraint, decoding,
canonicality, or support-boundary reasons.

## Oversized-input failure result

String input longer than `1024` UTF-16 code units returns the normal Result failure
branch with exactly one ordinary issue:

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

The issue must omit `span`. The condition is a whole-input resource boundary
rather than a localized source-region problem.

The result must not include lexical, syntax, constraint, decoding, canonicality,
or duplicate-version issues for the same oversized input. It must not include
partial parse metadata or canonical output.

Oversized input is a normal validation failure for string input. It must not throw
unless the input is also a non-string runtime value covered by `public-api.md`.

## Diagnostic issue cap

`MAX_ISSUES` is the maximum number of ordinary `VersIssue` objects in one failure
result.

The cap applies to every public operation and to all ordinary issue namespaces:

- `lexical.*`;
- `syntax.*`;
- `constraint.*`;
- `canonical.*`;
- `resource.*`.

The cap is global per operation, not per phase, per issue namespace, or per
constraint segment.

The implementation must check the remaining issue budget before adding each
ordinary issue. It must not generate an unbounded internal issue list and slice it
to `16` afterward.

When the cap is reached, the parser may stop collecting additional ordinary
diagnostics immediately. It does not need to continue scanning solely to discover
issues that cannot be returned.

## Diagnostic truncation metadata

If additional ordinary issues would have been emitted after the `MAX_ISSUES` budget
is exhausted, the failure result includes presence-based diagnostic metadata:

```ts
{
  ok: false,
  issues: [/* exactly 16 ordinary issues */],
  metadata: {
    diagnostics: {
      truncated: true,
      maxIssues: 16
    }
  }
}
```

When diagnostics are not truncated, `metadata.diagnostics` is absent. The core must
not emit `diagnostics: { truncated: false, ... }`.

`maxIssues` reports the effective issue cap applied to the operation. In v0.1.0,
that value is always `16` because no public resource option can change it.

Diagnostic truncation metadata describes result completeness. It is not a
source-level VERS problem and is not counted as an ordinary issue.

## Difference between resource issue and truncation metadata

`resource.input_too_long` and `metadata.diagnostics.truncated` are separate
signals:

| Signal                           | Kind             | Condition                                                                                      | Counts against `MAX_ISSUES` |
| -------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------- | --------------------------- |
| `resource.input_too_long`        | Ordinary issue   | `input.length > 1024` before normal parser phases.                                             | Yes                         |
| `metadata.diagnostics.truncated` | Failure metadata | More than `16` ordinary issues would have been emitted for input at or below the length limit. | No                          |

Diagnostic cap exhaustion must not add a sentinel issue such as
`resource.max_issues_exceeded`. It must not use `resource.input_too_long` or any
other ordinary issue code.

Oversized input returns before normal diagnostic accumulation begins, so an
oversized-input failure does not also include diagnostic truncation metadata.

## Ordering and cap interaction

Issue ordering remains deterministic when the cap is reached.

For input at or below the length limit, ordinary issues are collected under the
ordering rules from `parser-phases.md` and `diagnostics.md`:

1. reliable source position;
2. phase order;
3. diagnostic table order.

The cap limits how many ordered ordinary issues can be returned. It must not make
the returned subset depend on incidental helper-call order, object property order,
`Set` iteration, runtime-specific behavior, or generated-parser diagnostics.

Because the cap is global, earlier phases may consume the issue budget before
later phases run. That is acceptable v0.1.0 behavior when the returned issue order
and truncation metadata follow this specification.

## Public API boundary

The v0.1.0 public functions accept only the input string. They do not expose
resource-limit options:

```ts
parseVers(input: string): VersParseResult;
validateVers(input: string): VersValidationResult;
canonicalizeVers(input: string): VersCanonicalizeResult;
```

The v0.1.0 API must not expose:

- `maxInputLength` options;
- `maxIssues` options;
- parser budget objects;
- global mutable resource configuration;
- strict versus configurable entry-point variants;
- environment-specific timeout, memory, or request-size hooks.

Future configurability is reserved. A later options API may allow callers to tune
resource budgets, but that API must define option validation, defaults, and how
effective limits appear in failure metadata before it becomes public.

## Fixture requirements

Resource fixture coverage is defined by `fixtures.md`; implementation tests must
include at least these cases:

| Case                                | Required behavior                                                                                                                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exactly at input length limit       | An input with `.length === 1024` is not rejected solely for length and proceeds to normal parsing.                                                                                                    |
| Above input length limit            | An input with `.length === 1025` returns only `resource.input_too_long`, normally without `span`, before normal parser phases.                                                                        |
| Below issue cap                     | An invalid input that produces fewer than `16` ordinary issues omits `metadata.diagnostics`.                                                                                                          |
| At issue cap without omitted issues | An invalid input that produces exactly `16` ordinary issues omits `metadata.diagnostics` when no additional issue would have been emitted.                                                            |
| Above issue cap                     | An invalid input at or below `1024` code units that would produce more than `16` ordinary issues returns exactly `16` ordinary issues and `metadata.diagnostics: { truncated: true, maxIssues: 16 }`. |

Fixture generators and fixture assertions must measure input length with
JavaScript string `.length`, not UTF-8 byte length.

## Implementation notes

The preflight input length gate should be the first validation step after the
public function has established that the runtime value is a string.

The issue budget should be enforced by the diagnostic collection path itself. A
small internal helper may make this explicit by returning whether an issue was
added, whether the budget is exhausted, and whether truncation metadata should be
set. That helper must not leak through the public API.

The implementation may stop parser work once it knows the issue budget is
exhausted and at least one additional ordinary issue would have been emitted. It
must still preserve deterministic returned issue ordering for the collected
issues.

## Invariants

Implementation and tests must preserve these invariants:

1. `MAX_INPUT_LENGTH` is `1024` UTF-16 code units.
2. `MAX_ISSUES` is `16` ordinary issues.
3. Both limits are internal constants, not v0.1.0 public options.
4. Public functions check input length before normal parser phases.
5. Inputs with `.length === 1024` are not rejected solely for length.
6. Inputs with `.length > 1024` return `resource.input_too_long` and no normal
   parser-phase diagnostics.
7. Non-string runtime input throws `TypeError` rather than returning a resource
   issue.
8. The issue budget is checked before adding each ordinary issue.
9. Failure results contain at most `16` ordinary issues.
10. Diagnostic truncation uses presence-based metadata with `truncated: true` and
    `maxIssues: 16`.
11. Non-truncated failures omit `metadata.diagnostics`.
12. Diagnostic truncation does not add a sentinel issue and does not use
    `resource.input_too_long`.
13. Failure metadata does not expose parser internals, omitted issue counts,
    scanner state, phase state, or recovery state.
14. Resource behavior is identical for `parseVers()`, `validateVers()`, and
    `canonicalizeVers()`.
