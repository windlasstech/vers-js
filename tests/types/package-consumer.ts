import { canonicalizeVers, parseVers, validateVers } from "vers-js";
import type {
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
} from "vers-js";

const parsed: VersParseResult = parseVers("vers:npm/>=1.0.0|<2.0.0");
const validated: VersValidationResult = validateVers("vers:npm/>=1.0.0|<2.0.0");
const canonicalized: VersCanonicalizeResult = canonicalizeVers("vers:npm/=1.0.0");
const success: VersSuccess<boolean> = { ok: true, value: true };
const span: VersSpan = { end: 1, start: 0 };
const issue: VersIssue = {
  code: "syntax.invalid_scheme",
  message: "Invalid scheme",
  severity: "error",
  span,
};
const diagnostics: VersDiagnosticsMetadata = { maxIssues: 16, truncated: true };
const metadata: VersFailureMetadata = { diagnostics };
const failure: VersFailure = { issues: [issue], metadata, ok: false };
const result: VersResult<boolean> = failure;
const starConstraint: VersStarConstraint = { comparator: "*", version: null };
const versionComparator: VersVersionComparator = ">=";
const versionConstraint: VersVersionConstraint = {
  comparator: versionComparator,
  version: "1.0.0",
};
const constraint: VersConstraint = versionConstraint;
const range: VersRange = {
  canonical: "vers:npm/>=1.0.0",
  constraints: [constraint, starConstraint],
  scheme: "vers",
  type: "npm",
};
const lexicalCode: VersLexicalIssueCode = "lexical.ascii_whitespace";
const syntaxCode: VersSyntaxIssueCode = "syntax.invalid_scheme";
const constraintCode: VersConstraintIssueCode = "constraint.empty_version";
const canonicalCode: VersCanonicalIssueCode = "canonical.duplicate_version";
const resourceCode: VersResourceIssueCode = "resource.input_too_long";
const coreCode: VersCoreIssueCode = lexicalCode;
const issueCode: VersIssueCode = syntaxCode;
const reservedCanonicalCode: VersReservedCanonicalIssueCode = "canonical.non_canonical_order";
const supportCode: VersSupportIssueCode = "support.unknown_type";
const reservedCode: VersReservedIssueCode = supportCode;
let consumedCount = 0;

if (parsed.ok) {
  const consumedRange: VersRange = parsed.value;
  const combinedConstraints = [...consumedRange.constraints, ...range.constraints];
  consumedCount = combinedConstraints.length;
} else {
  const consumedFailure: VersFailure = parsed;
  const combinedIssues = [...consumedFailure.issues, ...failure.issues];
  consumedCount = combinedIssues.length;
}

const values = [
  canonicalized,
  validated,
  success,
  result,
  coreCode,
  issueCode,
  constraintCode,
  canonicalCode,
  resourceCode,
  reservedCanonicalCode,
  reservedCode,
  consumedCount,
] as const;

for (const value of values) {
  if (value === undefined) {
    throw new Error("Package type consumer value must be defined.");
  }
}
