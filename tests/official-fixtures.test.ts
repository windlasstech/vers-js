import { describe, expect, it } from "vitest";

import { canonicalizeVers, parseVers, validateVers } from "../src/index.ts";
import type { VersConstraint, VersParseResult, VersVersionComparator } from "../src/types.ts";
import upstreamFixture from "./fixtures/upstream/vers_canonical_parse_test.json" with { type: "json" };
import dispositionFixture from "./fixtures/vers-canonical-disposition.json" with { type: "json" };

const VERSION_CONSTRAINT_TUPLE_LENGTH = 2;
const NON_EMPTY_LENGTH = 0;

interface DispositionRecord {
  disposition: string;
  input: string;
  reason: string;
}

interface UpstreamExpectedOutput {
  scheme: string;
  version_constraints: string[][];
}

interface UpstreamCase {
  description: string;
  expected_failure?: boolean;
  expected_failure_reason?: string;
  expected_output?: UpstreamExpectedOutput;
  input: string;
  test_group: string;
  test_type: string;
}

interface UpstreamFixture {
  $schema: string;
  tests: UpstreamCase[];
}

interface PublicResults {
  canonicalized: ReturnType<typeof canonicalizeVers>;
  parsed: VersParseResult;
  validated: ReturnType<typeof validateVers>;
}

const upstream: UpstreamFixture = upstreamFixture;
const dispositions: DispositionRecord[] = dispositionFixture;

function findDisposition(testCase: UpstreamCase): DispositionRecord {
  const disposition = dispositions.find(
    (record: DispositionRecord): boolean => record.input === testCase.input,
  );

  if (disposition === undefined) {
    throw new Error(`Missing fixture disposition for ${testCase.input}`);
  }

  return disposition;
}

function readVersionParts(constraint: string[]): [VersVersionComparator, string] {
  if (constraint.length !== VERSION_CONSTRAINT_TUPLE_LENGTH) {
    throw new Error(`Invalid upstream version constraint tuple: ${constraint.join(",")}`);
  }

  const [comparator, version] = constraint;

  if (version === undefined) {
    throw new Error(`Missing upstream version in constraint tuple: ${constraint.join(",")}`);
  }

  switch (comparator) {
    case "=":
    case "!=":
    case "<":
    case "<=":
    case ">":
    case ">=": {
      return [comparator, version];
    }
    default: {
      throw new Error(`Invalid upstream version comparator: ${String(comparator)}`);
    }
  }
}

function expectedConstraints(expectedOutput: UpstreamExpectedOutput): VersConstraint[] {
  return expectedOutput.version_constraints.map((constraint: string[]): VersConstraint => {
    const [comparator, version] = readVersionParts(constraint);

    return { comparator, version };
  });
}

function expectParseSuccess(
  result: VersParseResult,
): asserts result is Extract<VersParseResult, { ok: true }> {
  expect(result.ok).toBe(true);
}

function expectParseFailure(
  result: VersParseResult,
): asserts result is Extract<VersParseResult, { ok: false }> {
  expect(result.ok).toBe(false);
}

function assertBlockingFailure(
  parsed: VersParseResult,
  validatedOk: boolean,
  canonicalizedOk: boolean,
): void {
  expectParseFailure(parsed);
  expect(validatedOk).toBe(false);
  expect(canonicalizedOk).toBe(false);
}

function assertBlockingSuccess(testCase: UpstreamCase, results: PublicResults): void {
  expect(testCase.expected_output).toBeDefined();

  if (testCase.expected_output === undefined) {
    return;
  }
  expectParseSuccess(results.parsed);
  expect(results.parsed.value).toEqual({
    canonical: testCase.input,
    constraints: expectedConstraints(testCase.expected_output),
    scheme: "vers",
    type: testCase.expected_output.scheme,
  });
  expect(results.validated).toEqual({ ok: true, value: true });
  expect(results.canonicalized).toEqual({ ok: true, value: testCase.input });
}

function assertBlockingCore(testCase: UpstreamCase): void {
  const results: PublicResults = {
    canonicalized: canonicalizeVers(testCase.input),
    parsed: parseVers(testCase.input),
    validated: validateVers(testCase.input),
  };

  if (testCase.expected_failure === true) {
    assertBlockingFailure(results.parsed, results.validated.ok, results.canonicalized.ok);
    return;
  }

  assertBlockingSuccess(testCase, results);
}

function assertKnownDivergence(testCase: UpstreamCase): void {
  expect(testCase.expected_failure).toBe(true);
  expect(testCase.expected_failure_reason).toBeTypeOf("string");
  expect(parseVers(testCase.input)).toEqual({
    ok: true,
    value: {
      canonical: testCase.input,
      constraints: [
        { comparator: ">=", version: "2.0.0" },
        { comparator: "<", version: "1.0.0" },
      ],
      scheme: "vers",
      type: "npm",
    },
  });
  expect(validateVers(testCase.input)).toEqual({ ok: true, value: true });
  expect(canonicalizeVers(testCase.input)).toEqual({ ok: true, value: testCase.input });
}

describe("upstream VERS canonical parse fixtures", (): void => {
  it("has one local disposition for every pinned upstream case", (): void => {
    expect(dispositions).toHaveLength(upstream.tests.length);

    for (const testCase of upstream.tests) {
      expect(findDisposition(testCase)).toBeDefined();
    }
  });

  it.each(upstream.tests)(
    "applies local disposition for $description",
    (testCase: UpstreamCase): void => {
      const disposition = findDisposition(testCase);

      expect(disposition.reason.length).toBeGreaterThan(NON_EMPTY_LENGTH);

      if (disposition.disposition === "blocking-core") {
        assertBlockingCore(testCase);
        return;
      }

      if (disposition.disposition === "known-divergence") {
        assertKnownDivergence(testCase);
        return;
      }

      expect(disposition.disposition).toBe("future-semantic");
    },
  );
});
