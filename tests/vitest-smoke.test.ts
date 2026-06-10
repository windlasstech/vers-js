import { describe, expect, it } from "vitest";

describe("Vitest configuration", (): void => {
  it("runs separated TypeScript test files", (): void => {
    expect("tests/vitest-smoke.test.ts").toMatch(/\.test\.ts$/u);
  });
});
