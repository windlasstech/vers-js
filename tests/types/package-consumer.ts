import { canonicalizeVers, parseVers, validateVers } from "@windlass/vers-js";
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
} from "@windlass/vers-js";

const parsed: VersParseResult = parseVers("vers:npm/>=1.0.0|<2.0.0"),
  validated: VersValidationResult = validateVers("vers:npm/>=1.0.0|<2.0.0"),
  canonicalized: VersCanonicalizeResult = canonicalizeVers("vers:npm/=1.0.0"),
  success: VersSuccess<boolean> = { ok: true, value: true },
  span: VersSpan = { end: 1, start: 0 },
  issue: VersIssue = {
    code: "syntax.invalid_scheme",
    message: "Invalid scheme",
    severity: "error",
    span,
  },
  diagnostics: VersDiagnosticsMetadata = { maxIssues: 16, truncated: true },
  metadata: VersFailureMetadata = { diagnostics },
  failure: VersFailure = { issues: [issue], metadata, ok: false },
  result: VersResult<boolean> = failure,
  starConstraint: VersStarConstraint = { comparator: "*", version: null },
  versionComparator: VersVersionComparator = ">=",
  versionConstraint: VersVersionConstraint = {
    comparator: versionComparator,
    version: "1.0.0",
  },
  constraint: VersConstraint = versionConstraint,
  range: VersRange = {
    canonical: "vers:npm/>=1.0.0",
    constraints: [constraint, starConstraint],
    scheme: "vers",
    type: "npm",
  },
  lexicalCode: VersLexicalIssueCode = "lexical.ascii_whitespace",
  syntaxCode: VersSyntaxIssueCode = "syntax.invalid_scheme",
  constraintCode: VersConstraintIssueCode = "constraint.empty_version",
  canonicalCode: VersCanonicalIssueCode = "canonical.duplicate_version",
  resourceCode: VersResourceIssueCode = "resource.input_too_long",
  coreCode: VersCoreIssueCode = lexicalCode,
  issueCode: VersIssueCode = syntaxCode,
  reservedCanonicalCode: VersReservedCanonicalIssueCode = "canonical.non_canonical_order",
  supportCode: VersSupportIssueCode = "support.unknown_type",
  reservedCode: VersReservedIssueCode = supportCode;
let consumedCount = 0;

if (parsed.ok) {
  const consumedRange: VersRange = parsed.value,
    combinedConstraints = [...consumedRange.constraints, ...range.constraints];
  consumedCount = combinedConstraints.length;
} else {
  const consumedFailure: VersFailure = parsed,
    combinedIssues = [...consumedFailure.issues, ...failure.issues];
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
