---
title: Diagnostics
parent: Architecture Specifications
nav_order: 6
---

# Diagnostics

This specification defines the public diagnostic contract for `vers-js` v0.1.0:
issue shapes, active and reserved issue-code unions, span rules, fatality policy,
ordering rules, diagnostic-cap metadata, and the complete active issue-code table.

Primary ADR inputs: ADR-0006, ADR-0007, ADR-0016, ADR-0023, ADR-0024,
ADR-0025, ADR-0026, ADR-0028, ADR-0029, ADR-0042, ADR-0043, ADR-0044, and
ADR-0045.

## Public failure shape

Normal malformed, non-canonical, oversized, or otherwise invalid VERS string input
returns the shared Result failure branch:

```ts
export interface VersFailure {
  ok: false;
  issues: VersIssue[];
  metadata?: VersFailureMetadata;
}

export interface VersIssue {
  code: VersIssueCode;
  message: string;
  severity: "error";
  span?: VersSpan;
}

export interface VersSpan {
  start: number;
  end: number;
}

export interface VersFailureMetadata {
  diagnostics?: VersDiagnosticsMetadata;
}

export interface VersDiagnosticsMetadata {
  truncated: true;
  maxIssues: number;
}
```

The failure shape must not expose scanner cursors, parser phases, token arrays,
parse nodes, raw decoded bytes, recovery state, omitted issue counts, source maps,
or generated-parser artifacts.

Non-string runtime input is not a VERS validation diagnostic. It follows
`public-api.md` and throws `TypeError` before this failure shape is constructed.

## Stable machine contract

The stable machine-readable diagnostic contract is:

- `VersIssue.code`;
- `VersIssue.severity`;
- optional `VersIssue.span`;
- optional `VersFailure.metadata.diagnostics`.

`VersIssue.message` is human-readable convenience text. It should be useful for
logs and developer-facing display, but callers must not parse it or depend on exact
wording. Implementations may clarify messages without changing this architecture
contract when the `code`, `severity`, `span`, and metadata behavior are unchanged.

All v0.1.0 issues have `severity: "error"`. The v0.1.0 core has no warnings,
advice, repair suggestions, informational diagnostics, or success-with-warning
results.

## Active issue-code unions

`VersIssue.code` uses only codes the v0.1.0 core public functions may emit.

```ts
export type VersIssueCode = VersCoreIssueCode;

export type VersCoreIssueCode =
  | VersLexicalIssueCode
  | VersSyntaxIssueCode
  | VersConstraintIssueCode
  | VersCanonicalIssueCode
  | VersResourceIssueCode;

export type VersLexicalIssueCode = "lexical.ascii_whitespace" | "lexical.invalid_character";

export type VersSyntaxIssueCode =
  | "syntax.missing_scheme_separator"
  | "syntax.invalid_scheme"
  | "syntax.missing_type"
  | "syntax.invalid_type_case"
  | "syntax.missing_constraint_separator";

export type VersConstraintIssueCode =
  | "constraint.missing_constraints"
  | "constraint.leading_pipe"
  | "constraint.trailing_pipe"
  | "constraint.consecutive_pipe"
  | "constraint.empty_constraint"
  | "constraint.empty_version"
  | "constraint.invalid_comparator"
  | "constraint.invalid_star_constraint"
  | "constraint.invalid_percent_encoding"
  | "constraint.invalid_utf8";

export type VersCanonicalIssueCode = "canonical.duplicate_version";

export type VersResourceIssueCode = "resource.input_too_long";
```

Namespace-specific unions are public types. Callers may switch on the full union or
on namespace-specific subsets.

## Reserved issue-code unions

Reserved codes are exported as future or downstream vocabulary, but they are not
part of `VersIssueCode` in v0.1.0.

```ts
export type VersReservedIssueCode = VersReservedCanonicalIssueCode | VersSupportIssueCode;

export type VersReservedCanonicalIssueCode =
  | "canonical.non_canonical_order"
  | "canonical.invalid_comparator_sequence";

export type VersSupportIssueCode = "support.unknown_type" | "support.unsupported_semantic";
```

The v0.1.0 core parser must not emit reserved codes from `parseVers()`,
`validateVers()`, or `canonicalizeVers()`.

Reserved codes may be used by future semantic, advisory, support-policy, or
downstream adapter contracts only after those contracts define their own result
surface or a later ADR promotes a code into the core union.

## Span coordinate contract

When present, `VersIssue.span` points into the original input string supplied to
the public function.

Span offsets are:

- zero-based;
- half-open: `[start, end)`;
- measured in UTF-16 code units;
- usable directly with `input.slice(span.start, span.end)`.

Spans do not index decoded version strings, decoded UTF-8 bytes, canonical output,
Unicode code points, grapheme clusters, lines, or columns.

`span` is optional. The implementation must include it only when it can identify a
reliable source region or point in the original input. It must omit `span` rather
than guess after fatal structural boundaries or for whole-input conditions that do
not have a precise localized region.

Zero-width spans are allowed for point diagnostics when a point is the most precise
reliable location. A zero-width span still uses the same `[start, end)` convention,
with `start === end`.

## Fatality contract

Fatality is an internal parser-control concept used by `parser-phases.md`. It is
not a public field on `VersIssue`.

The diagnostic table below classifies each issue by fatality so implementation and
fixtures can verify phase-stop behavior:

- `whole-input`: later parser phases must stop for the whole input;
- `constraint-list`: constraint-list parsing fails, decoded metadata and
  canonicality are unavailable;
- `per-constraint`: deeper checks stop for one constraint segment, but other
  reliably split segments may still be checked;
- `canonical`: parsed and decoded metadata exists, but success projection stops;
- `resource`: preflight resource gate stops all normal parser phases.

Fatality does not change `severity`. Every issue in the table has
`severity: "error"`.

## Issue ordering

Failure results return deterministic `issues` arrays.

Ordering follows `parser-phases.md`:

1. Issues with reliable spans are ordered by `span.start` ascending.
2. Issues with the same `span.start` are ordered by phase order.
3. Issues with the same `span.start` and phase are ordered by the per-code check
   order in the issue table below.
4. Issues without spans are ordered after span-bearing issues from the same phase
   whose positions are known to precede them.
5. When relative source position is unavailable, issues without spans use phase
   order, then table order.

The issue table order is the check-order tie-breaker within each phase. Public
ordering must not depend on incidental helper-call order, object property order,
`Set` iteration, runtime-specific behavior, or generated-parser diagnostics.

## Diagnostic cap metadata

`MAX_ISSUES` is `16`. It is the maximum number of ordinary `VersIssue` objects in a
single failure result.

The implementation checks the issue budget before adding each ordinary issue. It
must not generate an unbounded issue list and slice it afterward.

When additional ordinary issues would have been emitted after the issue budget is
exhausted, the failure result includes:

```ts
{
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

Diagnostic truncation does not add a sentinel issue. It must not use
`resource.input_too_long` or any other ordinary issue code. It must not expose
omitted issue counts or parser internals.

## Active issue-code table

The table below is the complete v0.1.0 core issue table.

| Order | Code                                  | Phase                                                         | Condition                                                                                                                                                                                             | Span policy                                                                                                                                               | Fatality                                                                                 | Example input                          |
| ----- | ------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------- |
| 1     | `resource.input_too_long`             | Preflight resource gate                                       | `input.length > 1024` UTF-16 code units.                                                                                                                                                              | Omit `span`; this is a whole-input resource boundary.                                                                                                     | `resource`                                                                               | A `vers:` string with 1025 code units. |
| 2     | `lexical.ascii_whitespace`            | Lexical pre-scan                                              | ASCII whitespace appears anywhere in the authored input.                                                                                                                                              | Span each whitespace code unit or contiguous whitespace run when reliable.                                                                                | `whole-input` after lexical accumulation                                                 | `vers:npm/1.0.0` followed by spaces.   |
| 3     | `lexical.invalid_character`           | Lexical pre-scan or per-constraint syntax validation          | A character cannot appear raw in the relevant VERS region. This includes raw non-ASCII input, raw non-unreserved version text, or invalid type characters not covered by a more specific syntax code. | Span the offending original-input code unit or reliable contiguous run.                                                                                   | `whole-input` for global lexical failures; `per-constraint` for version-region failures. | `vers:generic/1/2`                     |
| 4     | `syntax.missing_scheme_separator`     | Structural scheme and type parsing                            | The input does not contain a reliable `:` scheme separator.                                                                                                                                           | Prefer a zero-width span at the expected separator point when reliable; otherwise omit `span`.                                                            | `whole-input`                                                                            | `vers-npm/1.0.0`                       |
| 5     | `syntax.invalid_scheme`               | Structural scheme and type parsing                            | A scheme is present but is not exactly canonical lowercase `vers`.                                                                                                                                    | Span the scheme region when reliable.                                                                                                                     | `whole-input`                                                                            | `VERS:npm/1.0.0`                       |
| 6     | `syntax.missing_type`                 | Structural scheme and type parsing                            | The type region after `vers:` is empty or absent.                                                                                                                                                     | Prefer a zero-width span at the expected type start when reliable; otherwise omit `span`.                                                                 | `whole-input`                                                                            | `vers:/1.0.0`                          |
| 7     | `syntax.invalid_type_case`            | Structural scheme and type parsing                            | The type contains uppercase ASCII letters and therefore is not canonical lowercase.                                                                                                                   | Span the uppercase letter or contiguous uppercase run when reliable.                                                                                      | `whole-input`                                                                            | `vers:NPM/1.0.0`                       |
| 8     | `syntax.missing_constraint_separator` | Structural scheme and type parsing                            | The parser cannot find the `/` separator between type and constraint list.                                                                                                                            | Prefer a zero-width span after the type when reliable; otherwise omit `span`.                                                                             | `whole-input`                                                                            | `vers:npm`                             |
| 9     | `constraint.missing_constraints`      | Constraint-list splitting                                     | A reliable constraint-list region exists but contains no constraint text.                                                                                                                             | Prefer a zero-width span at the start of the empty constraint-list region when reliable.                                                                  | `constraint-list`                                                                        | `vers:npm/`                            |
| 10    | `constraint.leading_pipe`             | Constraint-list splitting                                     | The constraint list begins with `\|`.                                                                                                                                                                 | Span the leading `\|`.                                                                                                                                    | `constraint-list`                                                                        | `vers:npm/\|1.0.0`                     |
| 11    | `constraint.trailing_pipe`            | Constraint-list splitting                                     | The constraint list ends with `\|`.                                                                                                                                                                   | Span the trailing `\|`.                                                                                                                                   | `constraint-list`                                                                        | `vers:npm/1.0.0\|`                     |
| 12    | `constraint.consecutive_pipe`         | Constraint-list splitting                                     | Two or more adjacent pipe separators create an empty segment between constraints.                                                                                                                     | Span the second pipe in the first empty boundary, or the reliable contiguous pipe run when a project fixture chooses run highlighting.                    | `constraint-list`                                                                        | `vers:npm/1.0.0\|\|2.0.0`              |
| 13    | `constraint.empty_constraint`         | Constraint-list splitting or per-constraint syntax validation | A reliably split constraint segment is empty.                                                                                                                                                         | Prefer a zero-width span for the empty segment, or the separator boundary that proves it when zero-width is less useful.                                  | `constraint-list`                                                                        | `vers:npm/1.0.0\|\|2.0.0`              |
| 14    | `constraint.empty_version`            | Per-constraint syntax validation                              | A comparator is present but no version follows it, or equality syntax has no version text.                                                                                                            | Prefer a zero-width span after the comparator when reliable.                                                                                              | `per-constraint`                                                                         | `vers:npm/>=`                          |
| 15    | `constraint.invalid_comparator`       | Per-constraint syntax validation                              | A constraint segment starts with comparator-like syntax that is not one of `=`, `!=`, `<`, `<=`, `>`, or `>=`.                                                                                        | Span the invalid comparator-like prefix when reliable.                                                                                                    | `per-constraint`                                                                         | `vers:npm/=>1.0.0`                     |
| 16    | `constraint.invalid_star_constraint`  | Per-constraint syntax validation                              | `*` appears in a segment that is not exactly the standalone star constraint.                                                                                                                          | Span the segment or the offending `*` when reliable; fixtures should prefer the smallest offending region that explains the error.                        | `per-constraint`                                                                         | `vers:npm/>=*`                         |
| 17    | `constraint.invalid_percent_encoding` | Per-constraint syntax validation                              | A version region contains malformed percent escape syntax such as `%`, `%0`, `%G0`, `%0G`, or `%zz`.                                                                                                  | Span the malformed escape region when reliable.                                                                                                           | `per-constraint`                                                                         | `vers:generic/%G0`                     |
| 18    | `constraint.invalid_utf8`             | Percent-decoding and decoded metadata construction            | Percent escapes are syntactically valid but the decoded byte sequence is not valid UTF-8.                                                                                                             | Span the percent-escaped byte sequence participating in the invalid UTF-8 sequence when reliable; otherwise omit `span`.                                  | `per-constraint`                                                                         | `vers:generic/%C3%28`                  |
| 19    | `canonical.duplicate_version`         | Canonicality validation and projection                        | Two or more non-star constraints have exactly equal decoded `version` strings after successful single-pass percent-decoding and UTF-8 validation.                                                     | Span the later duplicate constraint's version region when reliable; additional duplicate occurrences may each produce their own issue until `MAX_ISSUES`. | `canonical`                                                                              | `vers:npm/1.0.0\|=1.0.0`               |

## Span extraction examples

For span-bearing issues, callers can extract the original authored text directly:

```ts
const result = parseVers("vers:generic/%G0");

if (!result.ok) {
  const issue = result.issues[0];

  if (issue.span) {
    const sourceText = "vers:generic/%G0".slice(issue.span.start, issue.span.end);
  }
}
```

For `constraint.invalid_percent_encoding` in this example, `sourceText` should be
`"%G0"` when the malformed escape span is present.

Consumers must handle issues without spans:

```ts
for (const issue of result.issues) {
  if (issue.span) {
    // Highlight input.slice(issue.span.start, issue.span.end).
  } else {
    // Display the issue without a source highlight.
  }
}
```

## Source diagnostics versus result metadata

Ordinary `issues` describe source-level VERS input problems or the preflight input
length resource boundary. They are counted against `MAX_ISSUES`.

`metadata.diagnostics` describes diagnostic collection completeness. It does not
describe another source-level VERS problem and is not counted as an ordinary issue.

`resource.input_too_long` and diagnostic truncation are intentionally separate:

- `resource.input_too_long` is an ordinary issue for input longer than
  `MAX_INPUT_LENGTH` before normal parsing begins;
- `metadata.diagnostics.truncated` means ordinary issue collection hit
  `MAX_ISSUES` while processing an invalid input at or below the input length
  limit.

## Message rules

Messages must be non-empty strings that help humans understand the issue. They
should include the relevant concept, such as missing scheme separator, invalid
type casing, malformed percent escape, invalid UTF-8, duplicate decoded version,
or input length limit.

Messages must not be used to encode machine-only data that is absent from `code`,
`span`, or metadata. Tests and fixtures must not assert exact message strings.
They may assert that a message is a non-empty string when needed.

## Invariants

Implementation and tests must preserve these invariants:

1. `VersIssue.code` uses only active v0.1.0 core issue codes.
2. Reserved semantic and support codes are exported separately and never emitted by
   core public functions in v0.1.0.
3. Every ordinary issue has `severity: "error"`.
4. Human-readable messages are not the machine contract.
5. Spans, when present, index the original input string.
6. Spans use zero-based half-open UTF-16 code-unit offsets.
7. Unreliable source locations omit `span` rather than guessing.
8. Fatality is not exposed as a public issue field.
9. Issue ordering is deterministic and follows source position, phase order, and
   table order.
10. A failure result contains at most `16` ordinary issues.
11. Diagnostic truncation uses presence-based metadata with `truncated: true` and
    `maxIssues: 16`.
12. Diagnostic truncation does not add a sentinel issue.
13. Failure metadata does not expose parser internals or omitted issue counts.
14. `resource.input_too_long` is emitted before normal parser phases and is distinct
    from diagnostic truncation metadata.
15. `parseVers()`, `validateVers()`, and `canonicalizeVers()` share the same
    diagnostic behavior for the same input.
