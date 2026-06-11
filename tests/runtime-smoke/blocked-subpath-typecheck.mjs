import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const JSON_INDENT = 2;
const SUCCESS_STATUS = 0;
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const workspace = path.join(repositoryRoot, ".temp", "blocked-subpath-typecheck");

rmSync(workspace, { force: true, recursive: true });
mkdirSync(workspace, { recursive: true });

writeFileSync(
  path.join(workspace, "consumer.ts"),
  'import { parseInput } from "vers-js/parser";\nparseInput("vers:npm/1.0.0");\n',
);
writeFileSync(
  path.join(workspace, "tsconfig.json"),
  JSON.stringify(
    {
      compilerOptions: {
        lib: ["ES2023"],
        module: "ESNext",
        moduleResolution: "Bundler",
        noEmit: true,
        strict: true,
        target: "ES2023",
        types: [],
      },
      include: ["consumer.ts"],
    },
    null,
    JSON_INDENT,
  ),
);

const result = spawnSync("pnpm", ["exec", "tsc", "-p", path.join(workspace, "tsconfig.json")], {
  cwd: repositoryRoot,
  encoding: "utf8",
});

assert.notEqual(result.status, SUCCESS_STATUS, "blocked package subpath type import must fail");
assert.match(
  `${result.stdout}\n${result.stderr}`,
  /vers-js\/parser/u,
  "blocked package subpath diagnostic must mention vers-js/parser",
);
