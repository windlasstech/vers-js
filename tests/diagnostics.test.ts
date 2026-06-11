import { describe, expect, it } from "vitest";

import { parseVers } from "../src/index.ts";
import type { VersFailure, VersIssueCode, VersSpan } from "../src/types.ts";

const NON_EMPTY_LENGTH = 0;

interface ExpectedIssue {
  code: VersIssueCode;
  span?: VersSpan;
}

type DiagnosticCase = readonly [string, string, ExpectedIssue[]];

const diagnosticCases = [
  [
    "ascii whitespace",
    "vers:npm/>=1.0.0 |<2.0.0",
    [{ code: "lexical.ascii_whitespace", span: { end: 17, start: 16 } }],
  ],
  [
    "raw invalid version character",
    "vers:generic/1/2",
    [{ code: "lexical.invalid_character", span: { end: 15, start: 14 } }],
  ],
  [
    "missing scheme separator",
    "vers-npm/1.0.0",
    [{ code: "syntax.missing_scheme_separator", span: { end: 4, start: 4 } }],
  ],
  [
    "invalid scheme",
    "VERS:npm/1.0.0",
    [{ code: "syntax.invalid_scheme", span: { end: 4, start: 0 } }],
  ],
  ["missing type", "vers:/1.0.0", [{ code: "syntax.missing_type", span: { end: 5, start: 5 } }]],
  [
    "invalid type case",
    "vers:NPM/1.0.0",
    [{ code: "syntax.invalid_type_case", span: { end: 6, start: 5 } }],
  ],
  [
    "missing constraint separator",
    "vers:npm",
    [{ code: "syntax.missing_constraint_separator", span: { end: 8, start: 8 } }],
  ],
  [
    "missing constraints",
    "vers:npm/",
    [{ code: "constraint.missing_constraints", span: { end: 9, start: 9 } }],
  ],
  [
    "leading pipe",
    "vers:npm/|1.0.0",
    [{ code: "constraint.leading_pipe", span: { end: 10, start: 9 } }],
  ],
  [
    "trailing pipe",
    "vers:npm/1.0.0|",
    [{ code: "constraint.trailing_pipe", span: { end: 15, start: 14 } }],
  ],
  [
    "consecutive pipes",
    "vers:npm/1.0.0||2.0.0",
    [
      { code: "constraint.consecutive_pipe", span: { end: 16, start: 15 } },
      { code: "constraint.empty_constraint", span: { end: 15, start: 15 } },
    ],
  ],
  [
    "empty version",
    "vers:npm/<=",
    [{ code: "constraint.empty_version", span: { end: 11, start: 11 } }],
  ],
  [
    "invalid comparator",
    "vers:npm/=>1.0.0",
    [{ code: "constraint.invalid_comparator", span: { end: 11, start: 9 } }],
  ],
  [
    "invalid star",
    "vers:npm/>=*",
    [{ code: "constraint.invalid_star_constraint", span: { end: 12, start: 11 } }],
  ],
  [
    "invalid percent",
    "vers:generic/%G0",
    [{ code: "constraint.invalid_percent_encoding", span: { end: 16, start: 13 } }],
  ],
  [
    "invalid utf8",
    "vers:generic/%C3%28",
    [{ code: "constraint.invalid_utf8", span: { end: 19, start: 13 } }],
  ],
  [
    "duplicate decoded version",
    "vers:npm/1.0.0|=1.0.0",
    [{ code: "canonical.duplicate_version", span: { end: 21, start: 16 } }],
  ],
] satisfies DiagnosticCase[];

function expectFailure(result: ReturnType<typeof parseVers>): asserts result is VersFailure {
  expect(result.ok).toBe(false);
}

function selectIssue(issue: { code: VersIssueCode; span?: VersSpan }): ExpectedIssue {
  if (issue.span === undefined) {
    return { code: issue.code };
  }

  return { code: issue.code, span: issue.span };
}

describe("diagnostics", (): void => {
  it.each(diagnosticCases)(
    "reports %s",
    (_name: string, input: string, expectedIssues: ExpectedIssue[]): void => {
      const result = parseVers(input);

      expectFailure(result);
      expect(result.issues.map(selectIssue)).toEqual(expectedIssues);

      for (const issue of result.issues) {
        expect(issue.severity).toBe("error");
        expect(issue.message.length).toBeGreaterThan(NON_EMPTY_LENGTH);
      }
    },
  );

  it("does not emit reserved semantic ordering diagnostics", (): void => {
    const result = parseVers("vers:npm/>=2.0.0|<1.0.0");

    expect(result).toEqual({
      ok: true,
      value: {
        canonical: "vers:npm/>=2.0.0|<1.0.0",
        constraints: [
          { comparator: ">=", version: "2.0.0" },
          { comparator: "<", version: "1.0.0" },
        ],
        scheme: "vers",
        type: "npm",
      },
    });
  });
});
