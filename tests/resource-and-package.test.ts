import { describe, expect, it } from "vitest";

import { canonicalizeVers, parseVers, validateVers } from "../src/index.ts";

const MAX_INPUT_LENGTH = 1024;
const OVER_MAX_INPUT_LENGTH = 1025;
const MAX_ISSUES = 16;
const SINGLE_ISSUE_COUNT = 1;
const ISSUE_CAP_EXCEEDING_PIPE_COUNT = 18;
const EMPTY_LENGTH = 0;

describe("resource limits", (): void => {
  it("does not reject inputs at exactly 1024 UTF-16 code units solely for length", (): void => {
    const prefix = "vers:generic/";
    const input = `${prefix}${"a".repeat(MAX_INPUT_LENGTH - prefix.length)}`;

    expect(input.length).toBe(MAX_INPUT_LENGTH);
    expect(parseVers(input).ok).toBe(true);
  });

  it("rejects inputs above 1024 UTF-16 code units before normal parsing", (): void => {
    const prefix = "vers:generic/";
    const input = `${prefix}${"a".repeat(OVER_MAX_INPUT_LENGTH - prefix.length)}`;
    const result = parseVers(input);

    expect(input.length).toBe(OVER_MAX_INPUT_LENGTH);
    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.issues).toHaveLength(SINGLE_ISSUE_COUNT);
      expect(result.issues[0]).toMatchObject({
        code: "resource.input_too_long",
        severity: "error",
      });
      expect(result.issues[0]?.span).toBeUndefined();
      expect(result.issues[0]?.message.length).toBeGreaterThan(EMPTY_LENGTH);
    }
  });

  it("adds truncation metadata when more than 16 ordinary issues would be emitted", (): void => {
    const result = parseVers(`vers:npm/${"|".repeat(ISSUE_CAP_EXCEEDING_PIPE_COUNT)}`);

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.issues).toHaveLength(MAX_ISSUES);
      expect(result.metadata).toEqual({ diagnostics: { maxIssues: MAX_ISSUES, truncated: true } });
    }
  });
});

describe("package boundary", (): void => {
  it("exports only the three runtime functions at the root", async (): Promise<void> => {
    const vers = await import("../src/index.ts");

    expect(parseVers).toBeTypeOf("function");
    expect(validateVers).toBeTypeOf("function");
    expect(canonicalizeVers).toBeTypeOf("function");
    expect("default" in vers).toBe(false);
    expect(Object.keys(vers).toSorted()).toEqual(["canonicalizeVers", "parseVers", "validateVers"]);
  });
});
