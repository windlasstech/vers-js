import { describe, expect, it } from "vitest";

import { canonicalizeVers, parseVers, validateVers } from "../src/index.ts";

const NON_STRING_NUMBER_INPUT = 123;

describe("public VERS API", (): void => {
  it("parses comparator ranges as syntax metadata", (): void => {
    const result = parseVers("vers:npm/>=1.0.0|<2.0.0");

    expect(result).toEqual({
      ok: true,
      value: {
        canonical: "vers:npm/>=1.0.0|<2.0.0",
        constraints: [
          { comparator: ">=", version: "1.0.0" },
          { comparator: "<", version: "2.0.0" },
        ],
        scheme: "vers",
        type: "npm",
      },
    });
  });

  it("projects validate and canonicalize success payloads from the same parser boundary", (): void => {
    expect(validateVers("vers:npm/>=1.0.0|<2.0.0")).toEqual({ ok: true, value: true });
    expect(canonicalizeVers("vers:npm/>=1.0.0|<2.0.0")).toEqual({
      ok: true,
      value: "vers:npm/>=1.0.0|<2.0.0",
    });
  });

  it("canonicalizes explicit equality to bare equality", (): void => {
    expect(parseVers("vers:npm/=1.0.0")).toEqual({
      ok: true,
      value: {
        canonical: "vers:npm/1.0.0",
        constraints: [{ comparator: "=", version: "1.0.0" }],
        scheme: "vers",
        type: "npm",
      },
    });
  });

  it("accepts lowercase percent hex and emits uppercase canonical percent escapes", (): void => {
    expect(parseVers("vers:generic/%c3%a9")).toEqual({
      ok: true,
      value: {
        canonical: "vers:generic/%C3%A9",
        constraints: [{ comparator: "=", version: "é" }],
        scheme: "vers",
        type: "generic",
      },
    });
  });

  it("decodes percent escapes once", (): void => {
    expect(parseVers("vers:generic/%252F")).toEqual({
      ok: true,
      value: {
        canonical: "vers:generic/%252F",
        constraints: [{ comparator: "=", version: "%2F" }],
        scheme: "vers",
        type: "generic",
      },
    });
  });

  it("preserves syntactic constraint order", (): void => {
    expect(parseVers("vers:npm/<2.0.0|>=1.0.0")).toEqual({
      ok: true,
      value: {
        canonical: "vers:npm/<2.0.0|>=1.0.0",
        constraints: [
          { comparator: "<", version: "2.0.0" },
          { comparator: ">=", version: "1.0.0" },
        ],
        scheme: "vers",
        type: "npm",
      },
    });
  });

  it("supports namespace-style access through the module namespace object", async (): Promise<void> => {
    const vers = await import("../src/index.ts");

    expect(vers.parseVers).toBe(parseVers);
    expect(vers.validateVers).toBe(validateVers);
    expect(vers.canonicalizeVers).toBe(canonicalizeVers);
    expect("default" in vers).toBe(false);
    expect(Object.keys(vers).toSorted()).toEqual(["canonicalizeVers", "parseVers", "validateVers"]);
  });

  it("throws TypeError for non-string runtime input", (): void => {
    const values = [null, undefined, NON_STRING_NUMBER_INPUT, {}, [], new Uint8Array()];

    for (const value of values) {
      expect(() => Reflect.apply(parseVers, null, [value])).toThrow(TypeError);
      expect(() => Reflect.apply(validateVers, null, [value])).toThrow(TypeError);
      expect(() => Reflect.apply(canonicalizeVers, null, [value])).toThrow(TypeError);
    }
  });
});

describe("positive project VERS fixtures", (): void => {
  it("parses standalone star constraints", (): void => {
    expect(parseVers("vers:npm/*")).toEqual({
      ok: true,
      value: {
        canonical: "vers:npm/*",
        constraints: [{ comparator: "*", version: null }],
        scheme: "vers",
        type: "npm",
      },
    });
  });

  it("accepts unknown lowercase type names as syntax-only metadata", (): void => {
    expect(parseVers("vers:support.unknown-type/1.0.0")).toEqual({
      ok: true,
      value: {
        canonical: "vers:support.unknown-type/1.0.0",
        constraints: [{ comparator: "=", version: "1.0.0" }],
        scheme: "vers",
        type: "support.unknown-type",
      },
    });
  });

  it("parses every valid version comparator", (): void => {
    expect(parseVers("vers:npm/1.0.0|!=1.0.1|<2.0.0|<=2.0.1|>0.9.0|>=1.0.2")).toEqual({
      ok: true,
      value: {
        canonical: "vers:npm/1.0.0|!=1.0.1|<2.0.0|<=2.0.1|>0.9.0|>=1.0.2",
        constraints: [
          { comparator: "=", version: "1.0.0" },
          { comparator: "!=", version: "1.0.1" },
          { comparator: "<", version: "2.0.0" },
          { comparator: "<=", version: "2.0.1" },
          { comparator: ">", version: "0.9.0" },
          { comparator: ">=", version: "1.0.2" },
        ],
        scheme: "vers",
        type: "npm",
      },
    });
  });

  it("rejects duplicate decoded versions across raw and percent-encoded spelling", (): void => {
    const result = parseVers("vers:generic/%C3%A9|=%c3%a9");

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.issues.map((issue) => issue.code)).toEqual(["canonical.duplicate_version"]);
    }
  });
});
