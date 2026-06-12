type VersResult<ResultValue> = VersSuccess<ResultValue> | VersFailure;

interface VersSuccess<ResultValue> {
  ok: true;
  value: ResultValue;
}

interface VersFailure {
  ok: false;
  issues: VersIssue[];
  metadata?: VersFailureMetadata;
}

interface VersFailureMetadata {
  diagnostics?: VersDiagnosticsMetadata;
}

interface VersDiagnosticsMetadata {
  maxIssues: number;
  truncated: true;
}

type VersParseResult = VersResult<VersRange>;
type VersValidationResult = VersResult<true>;
type VersCanonicalizeResult = VersResult<string>;

interface VersRange {
  canonical: string;
  constraints: VersConstraint[];
  scheme: "vers";
  type: string;
}

type VersConstraint = VersStarConstraint | VersVersionConstraint;

interface VersStarConstraint {
  comparator: "*";
  version: null;
}

interface VersVersionConstraint {
  comparator: VersVersionComparator;
  version: string;
}

type VersVersionComparator = "=" | "!=" | "<" | "<=" | ">" | ">=";

interface VersIssue {
  code: VersIssueCode;
  message: string;
  severity: "error";
  span?: VersSpan;
}

interface VersSpan {
  end: number;
  start: number;
}

type VersIssueCode = VersCoreIssueCode;

type VersCoreIssueCode =
  | VersLexicalIssueCode
  | VersSyntaxIssueCode
  | VersConstraintIssueCode
  | VersCanonicalIssueCode
  | VersResourceIssueCode;

type VersLexicalIssueCode = "lexical.ascii_whitespace" | "lexical.invalid_character";

type VersSyntaxIssueCode =
  | "syntax.missing_scheme_separator"
  | "syntax.invalid_scheme"
  | "syntax.missing_type"
  | "syntax.invalid_type_case"
  | "syntax.missing_constraint_separator";

type VersConstraintIssueCode =
  | "constraint.missing_constraints"
  | "constraint.leading_pipe"
  | "constraint.trailing_pipe"
  | "constraint.consecutive_pipe"
  | "constraint.empty_constraint"
  | "constraint.empty_version"
  | "constraint.invalid_comparator"
  | "constraint.invalid_star_constraint"
  | "constraint.invalid_percent_encoding"
  | "constraint.invalid_utf8";

type VersCanonicalIssueCode = "canonical.duplicate_version";

type VersResourceIssueCode = "resource.input_too_long";

type VersReservedIssueCode = VersReservedCanonicalIssueCode | VersSupportIssueCode;

type VersReservedCanonicalIssueCode =
  | "canonical.non_canonical_order"
  | "canonical.invalid_comparator_sequence";

type VersSupportIssueCode = "support.unknown_type" | "support.unsupported_semantic";

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
};
