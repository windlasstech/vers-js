import assert from "node:assert/strict";

import { canonicalizeVers, parseVers, validateVers } from "vers-js";

const EMPTY_LENGTH = 0;
const vers = await import("vers-js");

async function assertBlockedSubpath(specifier) {
  await assert.rejects(
    import(specifier),
    (error) => error instanceof Error && error.message.length > EMPTY_LENGTH,
    `${specifier} must not be importable`,
  );
}

assert(!("default" in vers), "package must not expose a default runtime export");
assert.deepEqual(Object.keys(vers).toSorted(), ["canonicalizeVers", "parseVers", "validateVers"]);

const parsed = parseVers("vers:npm/>=1.0.0|<2.0.0");
assert(parsed.ok, "package-name import must parse valid input");

const canonicalized = canonicalizeVers("vers:npm/=1.0.0");
assert(canonicalized.ok, "package-name import must canonicalize valid input");

if (canonicalized.ok) {
  assert.equal(canonicalized.value, "vers:npm/1.0.0");
}

const failed = validateVers("not-vers");
assert(!failed.ok, "package-name import must return failure Results for invalid input");

await assertBlockedSubpath("vers-js/parser");
await assertBlockedSubpath("vers-js/errors");
await assertBlockedSubpath("vers-js/types");
