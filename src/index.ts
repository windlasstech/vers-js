import { parseInput } from "./parser.ts";
import type { VersCanonicalizeResult, VersParseResult, VersValidationResult } from "./types.ts";

function assertStringInput(input: string): void {
  if (typeof input !== "string") {
    throw new TypeError("VERS input must be a string.");
  }
}

function parseVers(input: string): VersParseResult {
  assertStringInput(input);
  return parseInput(input);
}

function validateVers(input: string): VersValidationResult {
  const result = parseVers(input);

  if (!result.ok) {
    return result;
  }

  return { ok: true, value: true };
}

function canonicalizeVers(input: string): VersCanonicalizeResult {
  const result = parseVers(input);

  if (!result.ok) {
    return result;
  }

  return { ok: true, value: result.value.canonical };
}

export type {
  VersCanonicalIssueCode,
  VersCanonicalizeResult,
  VersConstraint,
  VersConstraintIssueCode,
  VersCoreIssueCode,
  VersDiagnosticsMetadata,
  VersFailure,
  VersFailureMetadata,
  VersIssue,
  VersIssueCode,
  VersLexicalIssueCode,
  VersParseResult,
  VersRange,
  VersReservedCanonicalIssueCode,
  VersReservedIssueCode,
  VersResourceIssueCode,
  VersResult,
  VersSpan,
  VersStarConstraint,
  VersSuccess,
  VersSupportIssueCode,
  VersSyntaxIssueCode,
  VersValidationResult,
  VersVersionComparator,
  VersVersionConstraint,
} from "./types.ts";

export { canonicalizeVers, parseVers, validateVers };
