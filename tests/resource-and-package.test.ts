import { describe, expect, it } from "vitest";

import { canonicalizeVers, parseVers, validateVers } from "../src/index.ts";

describe("resource limits", (): void => {
  it("does not reject inputs at exactly 1024 UTF-16 code units solely for length", (): void => {
    const prefix = "vers:generic/";
    const input = `${prefix}${"a".repeat(1024 - prefix.length)}`;

    expect(input.length).toBe(1024);
    expect(parseVers(input).ok).toBe(true);
  });

  it("rejects inputs above 1024 UTF-16 code units before normal parsing", (): void => {
    const prefix = "vers:generic/";
    const input = `${prefix}${"a".repeat(1025 - prefix.length)}`;

    expect(input.length).toBe(1025);
    expect(parseVers(input)).toEqual({
      issues: [
        {
          code: "resource.input_too_long",
          message: "Invalid VERS declaration: resource.input_too_long.",
          severity: "error",
        },
      ],
      ok: false,
    });
  });

  it("adds truncation metadata when more than 16 ordinary issues would be emitted", (): void => {
    const result = parseVers(`vers:npm/${"|".repeat(18)}`);

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.issues).toHaveLength(16);
      expect(result.metadata).toEqual({ diagnostics: { maxIssues: 16, truncated: true } });
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
