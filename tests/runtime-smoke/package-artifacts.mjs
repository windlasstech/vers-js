import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import packageJson from "../../package.json" with { type: "json" };

const expectedArtifacts = [
  "dist/index.js",
  "dist/index.js.map",
  "dist/index.d.ts",
  "dist/index.d.ts.map",
  "dist/parser.js",
  "dist/parser.d.ts",
  "dist/types.js",
  "dist/types.d.ts",
];

for (const path of expectedArtifacts) {
  assert(existsSync(path), `${path} must exist after package build`);
}

assert.equal(packageJson.type, "module", "package must be ESM-only");
assert.equal(packageJson.types, "./dist/index.d.ts", "root types must point at dist/index.d.ts");
assert.deepEqual(
  packageJson.exports,
  {
    ".": {
      default: "./dist/index.js",
      types: "./dist/index.d.ts",
    },
  },
  "package must expose only the root export",
);
