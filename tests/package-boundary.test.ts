import { describe, expect, it } from "vitest";

import packageJson from "../package.json" with { type: "json" };

const ROOT_EXPORT = ".";

describe("package metadata boundary", (): void => {
  it("declares an ESM-only root package surface", (): void => {
    expect(packageJson.type).toBe("module");
    expect(packageJson.sideEffects).toBe(false);
    expect(packageJson.types).toBe("./dist/index.d.ts");
    expect(packageJson.exports[ROOT_EXPORT]).toEqual({
      default: "./dist/index.js",
      types: "./dist/index.d.ts",
    });
  });

  it("does not expose unsupported package entry points", (): void => {
    expect(Object.keys(packageJson.exports).toSorted()).toEqual([ROOT_EXPORT]);
    expect("require" in packageJson.exports[ROOT_EXPORT]).toBe(false);
    expect("browser" in packageJson.exports[ROOT_EXPORT]).toBe(false);
    expect("node" in packageJson.exports[ROOT_EXPORT]).toBe(false);
    expect("deno" in packageJson.exports[ROOT_EXPORT]).toBe(false);
    expect("bun" in packageJson.exports[ROOT_EXPORT]).toBe(false);
    expect("typesVersions" in packageJson).toBe(false);
  });

  it("limits published files to package artifacts and top-level documentation", (): void => {
    expect(packageJson.files.toSorted()).toEqual([
      "CHANGELOG.md",
      "LICENSE",
      "README.ko.md",
      "README.md",
      "dist",
    ]);
  });
});
