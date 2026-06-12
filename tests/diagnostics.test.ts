import { describe, expect, it } from "vitest";

import { canonicalizeVers, parseVers, validateVers } from "../src/index.ts";
import type {
  VersCanonicalizeResult,
  VersFailure,
  VersIssue,
  VersParseResult,
  VersValidationResult,
} from "../src/types.ts";
import diagnosticFixture from "./fixtures/project-diagnostics.json" with { type: "json" };

const MAX_INPUT_LENGTH = 1024;
const OVER_MAX_INPUT_LENGTH = 1025;
const ISSUE_CAP_EXCEEDING_PIPE_COUNT = 18;
const EMPTY_LENGTH = 0;

type PublicResult = VersCanonicalizeResult | VersParseResult | VersValidationResult;

interface ExpectedIssue {
  code: string;
  fatality?: string;
  severity: string;
  span?: { end: number; start: number };
}

interface PublicIssueExpectation {
  code: string;
  severity: string;
  span?: { end: number; start: number };
}

interface ExpectedFailure {
  issueCount?: number;
  issues?: ExpectedIssue[];
  metadata?: {
    diagnostics: {
      maxIssues: number;
      truncated: boolean;
    };
  };
}

const fixtures = diagnosticFixture;

function inputFor(fixture: (typeof fixtures)[number]): string {
  if (fixture.input !== undefined) {
    return fixture.input;
  }

  if (fixture.inputKind === "over-max-length") {
    const prefix = "vers:generic/";
    return `${prefix}${"a".repeat(OVER_MAX_INPUT_LENGTH - prefix.length)}`;
  }

  return `vers:npm/${"|".repeat(ISSUE_CAP_EXCEEDING_PIPE_COUNT)}`;
}

function runOperation(operation: string, input: string): PublicResult {
  if (operation === "validateVers") {
    return validateVers(input);
  }

  if (operation === "canonicalizeVers") {
    return canonicalizeVers(input);
  }

  return parseVers(input);
}

function expectFailure(result: PublicResult): asserts result is VersFailure {
  expect(result.ok).toBe(false);
}

function publicIssue(issue: VersIssue): PublicIssueExpectation {
  expect("fatality" in issue).toBe(false);
  expect(issue.message.length).toBeGreaterThan(EMPTY_LENGTH);

  if (issue.span === undefined) {
    return { code: issue.code, severity: issue.severity };
  }

  return { code: issue.code, severity: issue.severity, span: issue.span };
}

function expectedPublicIssue(issue: ExpectedIssue): PublicIssueExpectation {
  if (issue.span === undefined) {
    return { code: issue.code, severity: issue.severity };
  }

  return { code: issue.code, severity: issue.severity, span: issue.span };
}

function assertExpectedFailure(
  result: PublicResult,
  expected: ExpectedFailure,
): asserts result is VersFailure {
  expectFailure(result);

  if (expected.issueCount !== undefined) {
    expect(result.issues).toHaveLength(expected.issueCount);
  }

  if (expected.issues !== undefined) {
    expect(result.issues.map(publicIssue)).toEqual(expected.issues.map(expectedPublicIssue));
  }

  expect(result.metadata).toEqual(expected.metadata);
}

describe("project diagnostic fixtures", (): void => {
  it("covers every active issue code", (): void => {
    const coveredCodes = new Set(
      fixtures.flatMap(
        (fixture): string[] => fixture.expected.issues?.map((issue): string => issue.code) ?? [],
      ),
    );

    expect([...coveredCodes].toSorted()).toEqual([
      "canonical.duplicate_version",
      "constraint.consecutive_pipe",
      "constraint.empty_constraint",
      "constraint.empty_version",
      "constraint.invalid_comparator",
      "constraint.invalid_percent_encoding",
      "constraint.invalid_star_constraint",
      "constraint.invalid_utf8",
      "constraint.leading_pipe",
      "constraint.missing_constraints",
      "constraint.trailing_pipe",
      "lexical.ascii_whitespace",
      "lexical.invalid_character",
      "resource.input_too_long",
      "syntax.invalid_scheme",
      "syntax.invalid_type_case",
      "syntax.missing_constraint_separator",
      "syntax.missing_scheme_separator",
      "syntax.missing_type",
    ]);
  });

  it("does not reject inputs at exactly 1024 UTF-16 code units solely for length", (): void => {
    const prefix = "vers:generic/";
    const input = `${prefix}${"a".repeat(MAX_INPUT_LENGTH - prefix.length)}`;

    expect(input.length).toBe(MAX_INPUT_LENGTH);
    expect(parseVers(input).ok).toBe(true);
  });

  it.each(fixtures)("applies $id to each declared public operation", (fixture): void => {
    const input = inputFor(fixture);
    const failures = fixture.operations.map((operation): VersFailure => {
      const result = runOperation(operation, input);
      assertExpectedFailure(result, fixture.expected);
      return result;
    });
    const [firstFailure] = failures;

    expect(firstFailure).toBeDefined();

    if (firstFailure !== undefined) {
      expect(failures.every((failure: VersFailure): boolean => failure === firstFailure)).toBe(
        false,
      );
      expect(failures).toEqual(failures.map((): VersFailure => firstFailure));
    }
  });

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
