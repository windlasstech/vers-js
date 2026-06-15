import { array, constant, constantFrom, integer, oneof, stringMatching, tuple } from "fast-check";

const MAX_INPUT_LENGTH = 1024;
const MAX_ISSUES = 16;
const MIN_CONSTRAINTS = 1;
const MAX_CONSTRAINTS = 12;
const MIN_VERSIONS = 1;
const MAX_VERSIONS = 8;
const MIN_VERSION_LENGTH = 1;
const MAX_VERSION_LENGTH = 64;
const MAX_TYPE_REST_LENGTH = 24;
const ISSUE_CAP_MIN_MULTIPLIER = 2;
const ISSUE_CAP_MAX_MULTIPLIER = 2;
const OVER_MAX_EXTRA = 1;
const ZERO_INDEX = 0;
const MIXED_VALID_WEIGHT = 3;
const MIXED_BROAD_WEIGHT = 1;
const MIXED_OVER_MAX_WEIGHT = 1;
const ANY_BROAD_WEIGHT = 2;
const ANY_VALID_WEIGHT = 1;
const STAR_WEIGHT = 1;
const BARE_VERSION_WEIGHT = 4;
const COMPARATOR_VERSION_WEIGHT = 4;
const HEX_RADIX = 16;
const PERCENT_ESCAPE_LENGTH = 2;

const LOWER_ALPHA = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const TYPE_REST_CHARS = `${LOWER_ALPHA}${DIGITS}.-`;
const UNRESERVED = `${LOWER_ALPHA}ABCDEFGHIJKLMNOPQRSTUVWXYZ${DIGITS}-._~`;
const COMPARATORS = ["!=", "<", "<=", ">", ">=", "="] as const;
const NON_EQUALITY_COMPARATORS = COMPARATORS.filter((comparator) => comparator !== "=");
const HEX_DIGITS = "0123456789abcdef";

function stringChars(input: string): string[] {
  const chars: string[] = [];

  for (const char of input) {
    chars.push(char);
  }

  return chars;
}

const typeFirstChar = constantFrom(...stringChars(LOWER_ALPHA));
const typeRestChar = constantFrom(...stringChars(TYPE_REST_CHARS));
const unreservedChar = constantFrom(...stringChars(UNRESERVED));
const comparatorChar = constantFrom(...COMPARATORS);
const nonEqualityComparatorChar = constantFrom(...NON_EQUALITY_COMPARATORS);
const hexDigit = constantFrom(...stringChars(HEX_DIGITS));

const typeArbitrary = tuple(
  typeFirstChar,
  array(typeRestChar, { maxLength: MAX_TYPE_REST_LENGTH }),
).map(([first, rest]) => `${first}${rest.join("")}`);

const bareVersionArbitrary = array(unreservedChar, {
  maxLength: MAX_VERSION_LENGTH,
  minLength: MIN_VERSION_LENGTH,
}).map((chars) => chars.join(""));

const percentEscapeArbitrary = tuple(hexDigit, hexDigit).map(
  ([firstDigit, secondDigit]) => `%${firstDigit}${secondDigit}`,
);

const encodedByteArbitrary = oneof(unreservedChar, percentEscapeArbitrary);

const encodedVersionArbitrary = array(encodedByteArbitrary, {
  maxLength: MAX_VERSION_LENGTH,
  minLength: MIN_VERSION_LENGTH,
}).map((tokens) => tokens.join(""));

const comparatorVersionConstraintArbitrary = tuple(
  comparatorChar,
  oneof(bareVersionArbitrary, encodedVersionArbitrary),
).map(([comparator, version]) => `${comparator}${version}`);

const constraintArbitrary = oneof(
  { arbitrary: constant("*"), weight: STAR_WEIGHT },
  { arbitrary: bareVersionArbitrary, weight: BARE_VERSION_WEIGHT },
  { arbitrary: comparatorVersionConstraintArbitrary, weight: COMPARATOR_VERSION_WEIGHT },
);

const constraintsListArbitrary = array(constraintArbitrary, {
  maxLength: MAX_CONSTRAINTS,
  minLength: MIN_CONSTRAINTS,
}).map((constraints) => constraints.join("|"));

const validDeclarationArbitrary = tuple(typeArbitrary, constraintsListArbitrary).map(
  ([type, constraints]) => `vers:${type}/${constraints}`,
);

const validNonDuplicateDeclarationArbitrary = tuple(
  typeArbitrary,
  array(bareVersionArbitrary, { maxLength: MAX_VERSIONS, minLength: MIN_VERSIONS }),
).map(([type, versions]) => `vers:${type}/${versions.join("|")}`);

const validOrderedConstraintDeclarationArbitrary = tuple(
  typeArbitrary,
  array(tuple(nonEqualityComparatorChar, bareVersionArbitrary), {
    maxLength: MAX_VERSIONS,
    minLength: MIN_VERSIONS,
  }),
).map(([type, pairs]) => {
  const constraints = pairs.map(([comparator, version]) => `${comparator}${version}`);

  return {
    comparators: pairs.map(([comparator]) => comparator),
    input: `vers:${type}/${constraints.join("|")}`,
    versions: pairs.map(([, version]) => version),
  };
});

const explicitEqualityDeclarationArbitrary = tuple(typeArbitrary, bareVersionArbitrary).map(
  ([type, version]) => `vers:${type}/=${version}`,
);

const uppercaseTypeDeclarationArbitrary = tuple(
  stringMatching(/^[A-Z][A-Za-z0-9.-]{0,24}$/),
  bareVersionArbitrary,
).map(([type, version]) => `vers:${type}/${version}`);

const overMaxInputArbitrary = stringMatching(/^[\x20-\x7E]+$/).map((suffix) => {
  const prefix = "vers:generic/";
  const padding = "a".repeat(
    Math.max(ZERO_INDEX, MAX_INPUT_LENGTH + OVER_MAX_EXTRA - prefix.length - suffix.length),
  );
  const candidate = `${prefix}${padding}${suffix}`;

  return candidate.length > MAX_INPUT_LENGTH
    ? candidate
    : `${candidate}${"a".repeat(MAX_INPUT_LENGTH + OVER_MAX_EXTRA - candidate.length)}`;
});

const issueCapPressureInputArbitrary = integer({
  max: MAX_ISSUES * ISSUE_CAP_MAX_MULTIPLIER,
  min: MAX_ISSUES + ISSUE_CAP_MIN_MULTIPLIER,
}).map((pipeCount) => `vers:generic/${"|".repeat(pipeCount)}`);

const broadInputArbitrary = stringMatching(/^[\x20-\x7E]{0,128}$/);

const mixedVersInputArbitrary = oneof(
  { arbitrary: validDeclarationArbitrary, weight: MIXED_VALID_WEIGHT },
  { arbitrary: broadInputArbitrary, weight: MIXED_BROAD_WEIGHT },
  { arbitrary: overMaxInputArbitrary, weight: MIXED_OVER_MAX_WEIGHT },
);

const anyVersInputArbitrary = oneof(
  { arbitrary: broadInputArbitrary, weight: ANY_BROAD_WEIGHT },
  { arbitrary: validDeclarationArbitrary, weight: ANY_VALID_WEIGHT },
);

function encodeUtf8Percent(input: string): string {
  const encoded: string[] = [];

  for (const codePoint of input) {
    const scalar = codePoint.codePointAt(ZERO_INDEX);

    if (scalar !== undefined) {
      encoded.push(`%${scalar.toString(HEX_RADIX).padStart(PERCENT_ESCAPE_LENGTH, "0")}`);
    }
  }

  return encoded.join("");
}

const percentEncodedDeclarationArbitrary = tuple(typeArbitrary, bareVersionArbitrary).map(
  ([type, version]) => ({
    decodedVersion: version,
    input: `vers:${type}/${encodeUtf8Percent(version)}`,
  }),
);

export {
  anyVersInputArbitrary,
  broadInputArbitrary,
  explicitEqualityDeclarationArbitrary,
  issueCapPressureInputArbitrary,
  mixedVersInputArbitrary,
  overMaxInputArbitrary,
  percentEncodedDeclarationArbitrary,
  uppercaseTypeDeclarationArbitrary,
  validDeclarationArbitrary,
  validNonDuplicateDeclarationArbitrary,
  validOrderedConstraintDeclarationArbitrary,
};
