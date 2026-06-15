import { test } from "@fast-check/vitest";
import { canonicalizeVers, parseVers, validateVers } from "vers-js";
import type { VersConstraint, VersFailure, VersParseResult } from "vers-js";
import { describe, expect } from "vitest";

import {
  anyVersInputArbitrary,
  exactMaxInputArbitrary,
  explicitEqualityDeclarationArbitrary,
  invalidPercentEncodingDeclarationArbitrary,
  invalidUtf8DeclarationArbitrary,
  issueCapPressureInputArbitrary,
  mixedVersInputArbitrary,
  overMaxInputArbitrary,
  percentEncodedDeclarationArbitrary,
  uppercasePercentEncodedDeclarationArbitrary,
  uppercaseTypeDeclarationArbitrary,
  validNonDuplicateDeclarationArbitrary,
  validOrderedConstraintDeclarationArbitrary,
} from "./arbitraries/vers.ts";

const MAX_INPUT_LENGTH = 1024;
const MAX_ISSUES = 16;
const SINGLE_CONSTRAINT_COUNT = 1;

interface OrderedConstraintFixture {
  comparators: readonly string[];
  input: string;
  versions: readonly string[];
}

function assertFailure(result: { ok: boolean }): asserts result is VersFailure {
  expect(result.ok).toBe(false);
}

function assertFailureCode(result: VersParseResult, code: string): void {
  assertFailure(result);

  const codes = result.issues.map((issue) => issue.code);

  expect(codes).toContain(code);
}

function assertVersionConstraintMatches(
  constraint: VersConstraint,
  comparator: string,
  version: string,
): void {
  expect(constraint.comparator).toBe(comparator);

  if (constraint.comparator !== "*") {
    expect(constraint.version).toBe(version);
  }
}

function assertConstraintAtIndex(
  result: VersParseResult,
  index: number,
  fixture: OrderedConstraintFixture,
): void {
  if (!result.ok) {
    return;
  }

  const comparator = fixture.comparators[index];
  const version = fixture.versions[index];
  const constraint = result.value.constraints[index];

  if (comparator !== undefined && version !== undefined && constraint !== undefined) {
    expect(constraint).toBeDefined();
    assertVersionConstraintMatches(constraint, comparator, version);
  }
}

function assertConstraintOrder(result: VersParseResult, fixture: OrderedConstraintFixture): void {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    return;
  }

  expect(result.value.constraints).toHaveLength(fixture.comparators.length);

  for (const [index] of fixture.comparators.entries()) {
    assertConstraintAtIndex(result, index, fixture);
  }

  expect(result.value.canonical).toBe(fixture.input);
}

function assertExplicitEquality(result: VersParseResult, input: string): void {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    return;
  }

  expect(result.value.constraints).toHaveLength(SINGLE_CONSTRAINT_COUNT);

  const [constraint] = result.value.constraints;

  expect(constraint).toBeDefined();

  if (constraint !== undefined && constraint.comparator !== "*") {
    expect(constraint.comparator).toBe("=");
  }

  expect(result.value.canonical).not.toContain("=");
  expect(canonicalizeVers(input)).toEqual({
    ok: true,
    value: result.value.canonical,
  });
}

function assertPercentEscapeStable(result: VersParseResult, decodedVersion: string): void {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    return;
  }

  expect(result.value.constraints).toHaveLength(SINGLE_CONSTRAINT_COUNT);

  const [constraint] = result.value.constraints;

  expect(constraint).toBeDefined();

  if (constraint !== undefined && constraint.comparator !== "*") {
    expect(constraint.version).toBe(decodedVersion);
  }

  const { canonical } = result.value;

  expect(canonicalizeVers(canonical)).toEqual({ ok: true, value: canonical });
}

describe("property-based VERS invariants", (): void => {
  describe("public API consistency", (): void => {
    test.prop([anyVersInputArbitrary])(
      "parseVers and validateVers agree on the success boundary",
      (input) => {
        const parseResult = parseVers(input);
        const validateResult = validateVers(input);

        expect(parseResult.ok).toBe(validateResult.ok);
      },
    );

    test.prop([mixedVersInputArbitrary])(
      "canonicalizeVers matches parseVers canonical projection",
      (input) => {
        const parseResult = parseVers(input);
        const canonicalResult = canonicalizeVers(input);

        expect(canonicalResult.ok).toBe(parseResult.ok);

        if (parseResult.ok && canonicalResult.ok) {
          expect(canonicalResult.value).toBe(parseResult.value.canonical);
        }
      },
    );

    test.prop([mixedVersInputArbitrary])("canonicalizeVers is idempotent on success", (input) => {
      const first = canonicalizeVers(input);

      if (!first.ok) {
        return;
      }

      const second = canonicalizeVers(first.value);

      expect(second).toEqual({ ok: true, value: first.value });
    });
  });

  describe("canonical syntax invariants", (): void => {
    test.prop([validNonDuplicateDeclarationArbitrary])(
      "generated valid declarations parse as public metadata",
      (input) => {
        const result = parseVers(input);

        expect(result.ok).toBe(true);

        if (!result.ok) {
          return;
        }

        expect(result.value.scheme).toBe("vers");
        expect(result.value.canonical).toBe(input);
        expect(canonicalizeVers(input)).toEqual({ ok: true, value: input });
      },
    );

    test.prop([validOrderedConstraintDeclarationArbitrary])(
      "constraint order is preserved for valid generated declarations",
      (fixture) => {
        assertConstraintOrder(parseVers(fixture.input), fixture);
      },
    );

    test.prop([explicitEqualityDeclarationArbitrary])(
      "explicit equality canonicalizes to bare equality",
      (input) => {
        assertExplicitEquality(parseVers(input), input);
      },
    );

    test.prop([uppercaseTypeDeclarationArbitrary])(
      "uppercase type input fails without repair",
      (input) => {
        const result = parseVers(input);

        expect(result.ok).toBe(false);

        if (!result.ok) {
          const codes = result.issues.map((issue) => issue.code);

          expect(codes).toContain("syntax.invalid_type_case");
        }
      },
    );
  });

  describe("resource and diagnostic boundaries", (): void => {
    test.prop([overMaxInputArbitrary])(
      "oversized inputs fail at the resource boundary before syntax diagnostics",
      (input) => {
        expect(input.length).toBeGreaterThan(MAX_INPUT_LENGTH);

        for (const operation of [parseVers, validateVers, canonicalizeVers]) {
          const result = operation(input);

          assertFailure(result);
          expect(result.issues).toHaveLength(SINGLE_CONSTRAINT_COUNT);

          const [issue] = result.issues;

          expect(issue).toBeDefined();

          if (issue !== undefined) {
            expect(issue.code).toBe("resource.input_too_long");
            expect(issue.span).toBeUndefined();
          }
        }
      },
    );

    test.prop([exactMaxInputArbitrary])(
      "inputs at the exact resource boundary still parse",
      (input) => {
        expect(input.length).toBe(MAX_INPUT_LENGTH);

        const result = parseVers(input);

        expect(result.ok).toBe(true);

        if (result.ok) {
          expect(result.value.canonical).toBe(input);
        }
      },
    );

    test.prop([issueCapPressureInputArbitrary, anyVersInputArbitrary])(
      "failed parses never exceed the diagnostic issue cap",
      (pressureInput, anyInput) => {
        for (const input of [pressureInput, anyInput]) {
          const result = parseVers(input);

          if (!result.ok) {
            expect(result.issues.length).toBeLessThanOrEqual(MAX_ISSUES);

            if (result.issues.length >= MAX_ISSUES) {
              expect(result.metadata).toEqual({
                diagnostics: { maxIssues: MAX_ISSUES, truncated: true },
              });
            }
          }
        }
      },
    );
  });

  describe("percent encoding", (): void => {
    test.prop([percentEncodedDeclarationArbitrary])(
      "percent escape canonicalization is stable",
      (fixture) => {
        assertPercentEscapeStable(parseVers(fixture.input), fixture.decodedVersion);
      },
    );

    test.prop([uppercasePercentEncodedDeclarationArbitrary])(
      "lowercase percent hex is accepted and canonicalized to uppercase hex",
      (fixture) => {
        const result = parseVers(fixture.input);

        expect(result.ok).toBe(true);

        if (!result.ok) {
          return;
        }

        const [constraint] = result.value.constraints;

        expect(constraint).toBeDefined();

        if (constraint !== undefined && constraint.comparator !== "*") {
          expect(constraint.version).toBe(fixture.decodedVersion);
        }

        expect(result.value.canonical).toBe(fixture.canonical);
        expect(canonicalizeVers(fixture.input)).toEqual({ ok: true, value: fixture.canonical });
      },
    );

    test.prop([invalidPercentEncodingDeclarationArbitrary])(
      "invalid percent escapes fail with a percent-encoding diagnostic",
      (input) => {
        assertFailureCode(parseVers(input), "constraint.invalid_percent_encoding");
      },
    );

    test.prop([invalidUtf8DeclarationArbitrary])(
      "invalid UTF-8 percent sequences fail with a UTF-8 diagnostic",
      (input) => {
        assertFailureCode(parseVers(input), "constraint.invalid_utf8");
      },
    );
  });
});
