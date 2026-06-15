import {
  array,
  constant,
  constantFrom,
  integer,
  oneof,
  string,
  stringMatching,
  tuple,
  uniqueArray,
} from "fast-check";

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
const BINARY_BASE = 2;
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
const CODE_POINT_MIN = 0;
const CODE_POINT_STEP = 1;
const UTF8_ONE_BYTE_MAX = 127;
const UTF8_TWO_BYTE_MAX = 2047;
const UTF8_THREE_BYTE_MAX = 65_535;
const UTF8_FOUR_BYTE_MAX = 1_114_111;
const UTF8_TWO_BYTE_PREFIX = 192;
const UTF8_THREE_BYTE_PREFIX = 224;
const UTF8_FOUR_BYTE_PREFIX = 240;
const UTF8_CONTINUATION_PREFIX = 128;
const UTF8_CONTINUATION_MODULO = 64;
const UTF8_TWO_BYTE_SHIFT = 6;
const UTF8_THREE_BYTE_FIRST_SHIFT = 12;
const UTF8_FOUR_BYTE_FIRST_SHIFT = 18;
const UTF8_FOUR_BYTE_SECOND_SHIFT = 12;
const SURROGATE_START = 55_296;
const SURROGATE_END = 57_343;
const BEFORE_SURROGATE_END = SURROGATE_START - CODE_POINT_STEP;
const AFTER_SURROGATE_START = SURROGATE_END + CODE_POINT_STEP;

const LOWER_ALPHA = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const TYPE_REST_CHARS = `${LOWER_ALPHA}${DIGITS}.-`;
const UNRESERVED = `${LOWER_ALPHA}ABCDEFGHIJKLMNOPQRSTUVWXYZ${DIGITS}-._~`;
const COMPARATORS = ["!=", "<", "<=", ">", ">=", "="] as const;
const NON_EQUALITY_COMPARATORS = COMPARATORS.filter((comparator) => comparator !== "=");
const NO_COMPARATOR = "";
const UPPERCASE_PERCENT_FIXTURES = [
  { canonicalVersion: "%E2%82%AC", decodedVersion: "€", encodedVersion: "%e2%82%ac" },
  { canonicalVersion: "%ED%95%9C", decodedVersion: "한", encodedVersion: "%ed%95%9c" },
  { canonicalVersion: "%F0%9F%99%88", decodedVersion: "🙈", encodedVersion: "%f0%9f%99%88" },
] as const;
const RESERVED_PERCENT_FIXTURES = [
  { canonicalVersion: "%21", decodedVersion: "!" },
  { canonicalVersion: "%27", decodedVersion: "'" },
  { canonicalVersion: "%28", decodedVersion: "(" },
  { canonicalVersion: "%29", decodedVersion: ")" },
  { canonicalVersion: "%2A", decodedVersion: "*" },
] as const;
const INVALID_PERCENT_ENCODINGS = ["%", "%0", "%xz", "abc%q0"] as const;
const INVALID_UTF8_ENCODINGS = ["%C3%28", "%E2%28%A1", "%F0%28%8C%BC"] as const;

function stringChars(input: string): string[] {
  const chars: string[] = [];

  for (const char of input) {
    chars.push(char);
  }

  return chars;
}

function percentByte(byte: number): string {
  return `%${byte.toString(HEX_RADIX).toUpperCase().padStart(PERCENT_ESCAPE_LENGTH, "0")}`;
}

function continuationByte(scalar: number): number {
  return UTF8_CONTINUATION_PREFIX + (scalar % UTF8_CONTINUATION_MODULO);
}

function leadingByte(prefix: number, scalar: number, shift: number): number {
  return prefix + Math.floor(scalar / BINARY_BASE ** shift);
}

function shiftedContinuationByte(scalar: number, shift: number): number {
  return continuationByte(Math.floor(scalar / BINARY_BASE ** shift));
}

function encodeThreeByteScalar(scalar: number): number[] {
  return [
    leadingByte(UTF8_THREE_BYTE_PREFIX, scalar, UTF8_THREE_BYTE_FIRST_SHIFT),
    shiftedContinuationByte(scalar, UTF8_TWO_BYTE_SHIFT),
    continuationByte(scalar),
  ];
}

function encodeFourByteScalar(scalar: number): number[] {
  return [
    leadingByte(UTF8_FOUR_BYTE_PREFIX, scalar, UTF8_FOUR_BYTE_FIRST_SHIFT),
    shiftedContinuationByte(scalar, UTF8_FOUR_BYTE_SECOND_SHIFT),
    shiftedContinuationByte(scalar, UTF8_TWO_BYTE_SHIFT),
    continuationByte(scalar),
  ];
}

function encodeCodePointUtf8Bytes(scalar: number): number[] {
  if (scalar <= UTF8_ONE_BYTE_MAX) {
    return [scalar];
  }

  if (scalar <= UTF8_TWO_BYTE_MAX) {
    return [
      leadingByte(UTF8_TWO_BYTE_PREFIX, scalar, UTF8_TWO_BYTE_SHIFT),
      continuationByte(scalar),
    ];
  }

  return scalar <= UTF8_THREE_BYTE_MAX
    ? encodeThreeByteScalar(scalar)
    : encodeFourByteScalar(scalar);
}

const typeFirstChar = constantFrom(...stringChars(LOWER_ALPHA));
const typeRestChar = constantFrom(...stringChars(TYPE_REST_CHARS));
const unreservedChar = constantFrom(...stringChars(UNRESERVED));
const comparatorChar = constantFrom(...COMPARATORS);
const nonEqualityComparatorChar = constantFrom(...NON_EQUALITY_COMPARATORS);
const unicodeScalarChar = oneof(
  integer({ max: BEFORE_SURROGATE_END, min: CODE_POINT_MIN }),
  integer({ max: UTF8_FOUR_BYTE_MAX, min: AFTER_SURROGATE_START }),
).map((codePoint) => String.fromCodePoint(codePoint));

const typeArbitrary = tuple(
  typeFirstChar,
  array(typeRestChar, { maxLength: MAX_TYPE_REST_LENGTH }),
).map(([first, rest]) => `${first}${rest.join("")}`);

const bareVersionArbitrary = array(unreservedChar, {
  maxLength: MAX_VERSION_LENGTH,
  minLength: MIN_VERSION_LENGTH,
}).map((chars) => chars.join(""));

const comparatorVersionConstraintArbitrary = tuple(comparatorChar, bareVersionArbitrary).map(
  ([comparator, version]) => `${comparator}${version}`,
);

const constraintArbitrary = oneof(
  { arbitrary: constant("*"), weight: STAR_WEIGHT },
  { arbitrary: bareVersionArbitrary, weight: BARE_VERSION_WEIGHT },
  { arbitrary: comparatorVersionConstraintArbitrary, weight: COMPARATOR_VERSION_WEIGHT },
);

const constraintsListArbitrary = array(constraintArbitrary, {
  maxLength: MAX_CONSTRAINTS,
  minLength: MIN_CONSTRAINTS,
}).map((constraints) => constraints.join("|"));

const validAsciiDeclarationArbitrary = tuple(typeArbitrary, constraintsListArbitrary).map(
  ([type, constraints]) => `vers:${type}/${constraints}`,
);

const validNonDuplicateDeclarationArbitrary = tuple(
  typeArbitrary,
  uniqueArray(bareVersionArbitrary, {
    maxLength: MAX_VERSIONS,
    minLength: MIN_VERSIONS,
    selector: (version) => version,
  }),
).map(([type, versions]) => `vers:${type}/${versions.join("|")}`);

const validOrderedConstraintDeclarationArbitrary = tuple(
  typeArbitrary,
  uniqueArray(tuple(nonEqualityComparatorChar, bareVersionArbitrary), {
    maxLength: MAX_VERSIONS,
    minLength: MIN_VERSIONS,
    selector: ([, version]) => version,
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

const starDeclarationArbitrary = typeArbitrary.map((type) => `vers:${type}/*`);

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

const exactMaxInputArbitrary = tuple(
  typeArbitrary,
  oneof(constant(NO_COMPARATOR), nonEqualityComparatorChar),
).map(([type, comparator]) => {
  const prefix = `vers:${type}/${comparator}`;

  return `${prefix}${"a".repeat(MAX_INPUT_LENGTH - prefix.length)}`;
});

const issueCapPressureInputArbitrary = integer({
  max: MAX_ISSUES * ISSUE_CAP_MAX_MULTIPLIER,
  min: MAX_ISSUES + ISSUE_CAP_MIN_MULTIPLIER,
}).map((pipeCount) => `vers:generic/${"|".repeat(pipeCount)}`);

const broadInputArbitrary = stringMatching(/^[\x20-\x7E]{0,128}$/);
const broadUnicodeInputArbitrary = string({
  maxLength: MAX_INPUT_LENGTH + OVER_MAX_EXTRA,
  size: "max",
});

const mixedVersInputArbitrary = oneof(
  { arbitrary: validAsciiDeclarationArbitrary, weight: MIXED_VALID_WEIGHT },
  { arbitrary: broadInputArbitrary, weight: MIXED_BROAD_WEIGHT },
  { arbitrary: overMaxInputArbitrary, weight: MIXED_OVER_MAX_WEIGHT },
);

const anyVersInputArbitrary = oneof(
  { arbitrary: broadInputArbitrary, weight: ANY_BROAD_WEIGHT },
  { arbitrary: validAsciiDeclarationArbitrary, weight: ANY_VALID_WEIGHT },
);

function encodeUtf8Percent(input: string): string {
  const encoded: string[] = [];

  for (const codePoint of input) {
    const scalar = codePoint.codePointAt(ZERO_INDEX);

    if (scalar !== undefined) {
      encoded.push(...encodeCodePointUtf8Bytes(scalar).map(percentByte));
    }
  }

  return encoded.join("");
}

const unicodeScalarVersionArbitrary = array(unicodeScalarChar, {
  maxLength: MAX_VERSIONS,
  minLength: MIN_VERSIONS,
}).map((chars) => chars.join(""));

const percentEncodedDeclarationArbitrary = tuple(typeArbitrary, bareVersionArbitrary).map(
  ([type, version]) => ({
    decodedVersion: version,
    input: `vers:${type}/${encodeUtf8Percent(version)}`,
  }),
);

const percentEncodedUnicodeDeclarationArbitrary = tuple(
  typeArbitrary,
  unicodeScalarVersionArbitrary,
).map(([type, version]) => ({
  decodedVersion: version,
  input: `vers:${type}/${encodeUtf8Percent(version)}`,
}));

const uppercasePercentEncodedDeclarationArbitrary = tuple(
  typeArbitrary,
  constantFrom(...UPPERCASE_PERCENT_FIXTURES),
).map(([type, fixture]) => ({
  canonical: `vers:${type}/${fixture.canonicalVersion}`,
  decodedVersion: fixture.decodedVersion,
  input: `vers:${type}/${fixture.encodedVersion}`,
}));

const reservedPercentEncodedDeclarationArbitrary = tuple(
  typeArbitrary,
  constantFrom(...RESERVED_PERCENT_FIXTURES),
).map(([type, fixture]) => ({
  canonical: `vers:${type}/${fixture.canonicalVersion}`,
  decodedVersion: fixture.decodedVersion,
  input: `vers:${type}/${fixture.canonicalVersion}`,
}));

const invalidPercentEncodingDeclarationArbitrary = tuple(
  typeArbitrary,
  constantFrom(...INVALID_PERCENT_ENCODINGS),
).map(([type, version]) => `vers:${type}/${version}`);

const invalidUtf8DeclarationArbitrary = tuple(
  typeArbitrary,
  constantFrom(...INVALID_UTF8_ENCODINGS),
).map(([type, version]) => `vers:${type}/${version}`);

export {
  anyVersInputArbitrary,
  broadInputArbitrary,
  broadUnicodeInputArbitrary,
  exactMaxInputArbitrary,
  explicitEqualityDeclarationArbitrary,
  invalidPercentEncodingDeclarationArbitrary,
  invalidUtf8DeclarationArbitrary,
  issueCapPressureInputArbitrary,
  mixedVersInputArbitrary,
  overMaxInputArbitrary,
  percentEncodedDeclarationArbitrary,
  percentEncodedUnicodeDeclarationArbitrary,
  reservedPercentEncodedDeclarationArbitrary,
  starDeclarationArbitrary,
  uppercasePercentEncodedDeclarationArbitrary,
  uppercaseTypeDeclarationArbitrary,
  validAsciiDeclarationArbitrary,
  validNonDuplicateDeclarationArbitrary,
  validOrderedConstraintDeclarationArbitrary,
};
