import { canonicalizeVers, parseVers, validateVers } from "../../dist/index.js";

const minimumIssueCount = 1;
const runtimeExports = await import("../../dist/index.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(!("default" in runtimeExports), "package must not expose a default runtime export");
assert(typeof parseVers === "function", "parseVers must be exported");
assert(typeof validateVers === "function", "validateVers must be exported");
assert(typeof canonicalizeVers === "function", "canonicalizeVers must be exported");

const parsed = parseVers("vers:npm/>=1.0.0|<2.0.0");

assert(parsed.ok, "valid VERS input must parse");

if (parsed.ok) {
  assert(parsed.value.scheme === "vers", "parsed scheme must match");
  assert(parsed.value.type === "npm", "parsed type must match");
  assert(parsed.value.canonical === "vers:npm/>=1.0.0|<2.0.0", "canonical value must match");
}

const canonicalized = canonicalizeVers("vers:npm/>=1.0.0|<2.0.0");

assert(canonicalized.ok, "valid VERS input must canonicalize");

if (canonicalized.ok) {
  assert(canonicalized.value === "vers:npm/>=1.0.0|<2.0.0", "canonicalized string must match");
}

const failed = validateVers("not-vers");

assert(!failed.ok, "invalid VERS input must return a failure Result");

if (!failed.ok) {
  assert(Array.isArray(failed.issues), "failure Result must include an issues array");
  assert(
    failed.issues.length >= minimumIssueCount,
    "failure Result must include at least one issue",
  );
}
