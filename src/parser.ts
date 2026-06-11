import type {
  VersConstraint,
  VersFailure,
  VersIssue,
  VersIssueCode,
  VersRange,
  VersSpan,
  VersVersionComparator,
} from "./types.ts";

const MAX_INPUT_LENGTH = 1024;
const MAX_ISSUES = 16;
const SCHEME = "vers";
const SCHEME_PREFIX = "vers:";
const ASCII_TAB = 9;
const ASCII_LINE_FEED = 10;
const ASCII_VERTICAL_TAB = 11;
const ASCII_FORM_FEED = 12;
const ASCII_CARRIAGE_RETURN = 13;
const ASCII_SPACE = 32;
const ASCII_PERCENT = 37;
const LOWERCASE_A = 97;
const LOWERCASE_F = 102;
const LOWERCASE_Z = 122;
const UPPERCASE_A = 65;
const UPPERCASE_F = 70;
const UPPERCASE_Z = 90;
const DIGIT_ZERO = 48;
const DIGIT_NINE = 57;
const ASCII_DASH = 45;
const ASCII_DOT = 46;
const ASCII_UNDERSCORE = 95;
const ASCII_TILDE = 126;
const HEX_RADIX = 16;
const HEX_ESCAPE_WIDTH = 2;
const ESCAPE_WIDTH = 3;
const FIRST_INDEX = 0;

interface ParseSuccess {
  ok: true;
  value: VersRange;
}

type InternalParseResult = ParseSuccess | VersFailure;

interface IssueDraft {
  code: VersIssueCode;
  span?: VersSpan;
}

interface Structure {
  constraintStart: number;
  type: string;
}

interface ConstraintSegment {
  end: number;
  start: number;
  text: string;
}

interface ComparatorRead {
  invalidLength: number;
  length: number;
  value: VersVersionComparator;
}

interface VersionRegion {
  comparator: VersVersionComparator;
  end: number;
  raw: string;
  start: number;
}

class Parser {
  readonly #input: string;
  readonly #issues: VersIssue[] = [];
  #truncated = false;

  public constructor(input: string) {
    this.#input = input;
  }

  public parse(): InternalParseResult {
    if (this.#input.length > MAX_INPUT_LENGTH) {
      this.#add({ code: "resource.input_too_long" });
      return this.#failure();
    }

    return this.#parseNormal();
  }

  #parseNormal(): InternalParseResult {
    this.#scanLexical();

    if (this.#hasIssues()) {
      return this.#failure();
    }

    const structure = this.#parseStructure();

    if (structure === undefined) {
      return this.#failure();
    }

    return this.#parseStructured(structure);
  }

  #parseStructured(structure: Structure): InternalParseResult {
    const segments = this.#splitConstraints(structure.constraintStart);

    if (this.#hasIssues()) {
      return this.#failure();
    }

    const constraints = this.#parseSegments(segments);

    if (this.#hasIssues()) {
      return this.#failure();
    }

    this.#checkDuplicates(constraints, segments);

    if (this.#hasIssues()) {
      return this.#failure();
    }

    return Parser.success(structure.type, constraints);
  }

  private static success(type: string, constraints: VersConstraint[]): ParseSuccess {
    return {
      ok: true,
      value: {
        canonical: Parser.serializeRange(type, constraints),
        constraints,
        scheme: SCHEME,
        type,
      },
    };
  }

  #add(draft: IssueDraft): void {
    if (this.#issues.length >= MAX_ISSUES) {
      this.#truncated = true;
      return;
    }

    const issue: VersIssue = {
      code: draft.code,
      message: `Invalid VERS declaration: ${draft.code}.`,
      severity: "error",
    };

    if (draft.span !== undefined) {
      issue.span = draft.span;
    }

    this.#issues.push(issue);
  }

  #failure(): VersFailure {
    const issues = this.#issues.toSorted((left, right) => Parser.compareIssues(left, right));

    if (this.#truncated) {
      return {
        issues,
        metadata: { diagnostics: { maxIssues: MAX_ISSUES, truncated: true } },
        ok: false,
      };
    }

    return { issues, ok: false };
  }

  #hasIssues(): boolean {
    return this.#issues.length > 0;
  }

  private static compareIssues(left: VersIssue, right: VersIssue): number {
    const leftStart = left.span?.start ?? Number.POSITIVE_INFINITY;
    const rightStart = right.span?.start ?? Number.POSITIVE_INFINITY;

    if (leftStart !== rightStart) {
      return leftStart - rightStart;
    }

    return Parser.issueOrder(left.code) - Parser.issueOrder(right.code);
  }

  private static issueOrder(code: VersIssueCode): number {
    const order: Record<VersIssueCode, number> = {
      "canonical.duplicate_version": 19,
      "constraint.consecutive_pipe": 12,
      "constraint.empty_constraint": 13,
      "constraint.empty_version": 14,
      "constraint.invalid_comparator": 15,
      "constraint.invalid_percent_encoding": 17,
      "constraint.invalid_star_constraint": 16,
      "constraint.invalid_utf8": 18,
      "constraint.leading_pipe": 10,
      "constraint.missing_constraints": 9,
      "constraint.trailing_pipe": 11,
      "lexical.ascii_whitespace": 2,
      "lexical.invalid_character": 3,
      "resource.input_too_long": 1,
      "syntax.invalid_scheme": 5,
      "syntax.invalid_type_case": 7,
      "syntax.missing_constraint_separator": 8,
      "syntax.missing_scheme_separator": 4,
      "syntax.missing_type": 6,
    };

    return order[code];
  }

  #scanLexical(): void {
    for (let index = 0; index < this.#input.length; index += 1) {
      if (Parser.isAsciiWhitespace(this.#input.charCodeAt(index))) {
        this.#add({ code: "lexical.ascii_whitespace", span: { end: index + 1, start: index } });
      }
    }
  }

  private static isAsciiWhitespace(codeUnit: number): boolean {
    return (
      codeUnit === ASCII_TAB ||
      codeUnit === ASCII_LINE_FEED ||
      codeUnit === ASCII_VERTICAL_TAB ||
      codeUnit === ASCII_FORM_FEED ||
      codeUnit === ASCII_CARRIAGE_RETURN ||
      codeUnit === ASCII_SPACE
    );
  }

  #parseStructure(): Structure | undefined {
    const colonIndex = this.#schemeSeparatorIndex();

    if (colonIndex === undefined) {
      return undefined;
    }

    if (!this.#validateScheme(colonIndex)) {
      return undefined;
    }

    const slashIndex = this.#constraintSeparatorIndex();

    if (slashIndex === undefined) {
      return this.#parseMissingSlash();
    }

    return this.#parseStructureAfterSlash(slashIndex);
  }

  #constraintSeparatorIndex(): number | undefined {
    const slashIndex = this.#input.indexOf("/", SCHEME_PREFIX.length);

    if (slashIndex === -1) {
      return undefined;
    }

    return slashIndex;
  }

  #parseStructureAfterSlash(slashIndex: number): Structure | undefined {
    const type = this.#input.slice(SCHEME_PREFIX.length, slashIndex);

    if (!this.#validateType(type, SCHEME_PREFIX.length)) {
      return undefined;
    }

    return { constraintStart: slashIndex + 1, type };
  }

  #schemeSeparatorIndex(): number | undefined {
    const colonIndex = this.#input.indexOf(":");

    if (colonIndex !== -1) {
      return colonIndex;
    }

    this.#add({
      code: "syntax.missing_scheme_separator",
      span: { end: SCHEME.length, start: SCHEME.length },
    });
    return undefined;
  }

  #validateScheme(colonIndex: number): boolean {
    if (this.#input.slice(FIRST_INDEX, colonIndex) === SCHEME) {
      return true;
    }

    this.#add({ code: "syntax.invalid_scheme", span: { end: colonIndex, start: FIRST_INDEX } });
    return false;
  }

  #parseMissingSlash(): Structure | undefined {
    const type = this.#input.slice(SCHEME_PREFIX.length);

    if (!this.#validateType(type, SCHEME_PREFIX.length)) {
      return undefined;
    }

    this.#add({
      code: "syntax.missing_constraint_separator",
      span: { end: this.#input.length, start: this.#input.length },
    });

    return undefined;
  }

  #validateType(type: string, offset: number): boolean {
    if (type.length === 0) {
      this.#add({ code: "syntax.missing_type", span: { end: offset, start: offset } });
      return false;
    }

    return this.#validateTypeCharacters(type, offset);
  }

  #validateTypeCharacters(type: string, offset: number): boolean {
    const invalidIndex = Parser.invalidTypeIndex(type);

    if (invalidIndex === undefined) {
      return true;
    }

    this.#addTypeIssue(type, offset, invalidIndex);
    return false;
  }

  private static invalidTypeIndex(type: string): number | undefined {
    if (!Parser.isLowercaseLetter(type.charCodeAt(FIRST_INDEX))) {
      return FIRST_INDEX;
    }

    return Parser.invalidTypeTailIndex(type);
  }

  private static invalidTypeTailIndex(type: string): number | undefined {
    for (let index = 1; index < type.length; index += 1) {
      if (!Parser.isTypeTail(type.charCodeAt(index))) {
        return index;
      }
    }

    return undefined;
  }

  #addTypeIssue(type: string, offset: number, index: number): void {
    const codeUnit = type.charCodeAt(index);
    const code = Parser.isUppercaseLetter(codeUnit)
      ? "syntax.invalid_type_case"
      : "lexical.invalid_character";
    this.#add({ code, span: { end: offset + index + 1, start: offset + index } });
  }

  private static isLowercaseLetter(codeUnit: number): boolean {
    return codeUnit >= LOWERCASE_A && codeUnit <= LOWERCASE_Z;
  }

  private static isUppercaseLetter(codeUnit: number): boolean {
    return codeUnit >= UPPERCASE_A && codeUnit <= UPPERCASE_Z;
  }

  private static isTypeTail(codeUnit: number): boolean {
    return (
      Parser.isLowercaseLetter(codeUnit) ||
      Parser.isDigit(codeUnit) ||
      codeUnit === ASCII_DASH ||
      codeUnit === ASCII_DOT
    );
  }

  private static isDigit(codeUnit: number): boolean {
    return codeUnit >= DIGIT_ZERO && codeUnit <= DIGIT_NINE;
  }

  #splitConstraints(start: number): ConstraintSegment[] {
    const list = this.#input.slice(start);

    if (list.length === 0) {
      this.#add({ code: "constraint.missing_constraints", span: { end: start, start } });
      return [];
    }

    this.#addPipeIssues(list, start);

    return this.#segmentsFromList(list, start);
  }

  #addPipeIssues(list: string, offset: number): void {
    if (list.startsWith("|")) {
      this.#add({ code: "constraint.leading_pipe", span: { end: offset + 1, start: offset } });
    }

    if (list.endsWith("|")) {
      this.#add({
        code: "constraint.trailing_pipe",
        span: { end: offset + list.length, start: offset + list.length - 1 },
      });
    }

    for (let index = 1; index < list.length; index += 1) {
      if (list[index - 1] === "|" && list[index] === "|") {
        this.#add({
          code: "constraint.consecutive_pipe",
          span: { end: offset + index + 1, start: offset + index },
        });
        this.#add({
          code: "constraint.empty_constraint",
          span: { end: offset + index, start: offset + index },
        });
      }
    }
  }

  #segmentsFromList(list: string, offset: number): ConstraintSegment[] {
    const segments: ConstraintSegment[] = [];
    let segmentStart = offset;

    for (let index = 0; index <= list.length; index += 1) {
      if (index === list.length || list[index] === "|") {
        const end = offset + index;
        segments.push({ end, start: segmentStart, text: this.#input.slice(segmentStart, end) });
        segmentStart = end + 1;
      }
    }

    return segments;
  }

  #parseSegments(segments: readonly ConstraintSegment[]): VersConstraint[] {
    const constraints: VersConstraint[] = [];

    for (const segment of segments) {
      const constraint = this.#parseSegment(segment);

      if (constraint !== undefined) {
        constraints.push(constraint);
      }
    }

    return constraints;
  }

  #parseSegment(segment: ConstraintSegment): VersConstraint | undefined {
    if (segment.text.length === 0) {
      this.#add({
        code: "constraint.empty_constraint",
        span: { end: segment.end, start: segment.start },
      });
      return undefined;
    }

    if (segment.text === "*") {
      return { comparator: "*", version: null };
    }

    if (segment.text.includes("*")) {
      this.#addInvalidStar(segment);
      return undefined;
    }

    return this.#parseVersionSegment(segment);
  }

  #addInvalidStar(segment: ConstraintSegment): void {
    const starIndex = segment.text.indexOf("*");
    this.#add({
      code: "constraint.invalid_star_constraint",
      span: { end: segment.start + starIndex + 1, start: segment.start + starIndex },
    });
  }

  #parseVersionSegment(segment: ConstraintSegment): VersConstraint | undefined {
    const region = this.#parseVersionRegion(segment);

    if (region === undefined) {
      return undefined;
    }

    const decoded = this.#decodeVersion(region);

    if (decoded === undefined) {
      return undefined;
    }

    return { comparator: region.comparator, version: decoded };
  }

  #parseVersionRegion(segment: ConstraintSegment): VersionRegion | undefined {
    const comparator = Parser.readComparator(segment.text);

    if (comparator.invalidLength > 0) {
      this.#add({
        code: "constraint.invalid_comparator",
        span: { end: segment.start + comparator.invalidLength, start: segment.start },
      });
      return undefined;
    }

    const raw = segment.text.slice(comparator.length);

    if (raw.length === 0) {
      const point = segment.start + comparator.length;
      this.#add({ code: "constraint.empty_version", span: { end: point, start: point } });
      return undefined;
    }

    return {
      comparator: comparator.value,
      end: segment.end,
      raw,
      start: segment.start + comparator.length,
    };
  }

  private static readComparator(text: string): ComparatorRead {
    if (text.startsWith("!=")) {
      return { invalidLength: 0, length: 2, value: "!=" };
    }

    return Parser.readNonBangComparator(text);
  }

  private static readNonBangComparator(text: string): ComparatorRead {
    const twoCharacter = Parser.readTwoCharacterComparator(text);

    if (twoCharacter !== undefined) {
      return twoCharacter;
    }

    return Parser.readSingleCharacterComparator(text);
  }

  private static readTwoCharacterComparator(text: string): ComparatorRead | undefined {
    if (text.startsWith("<=")) {
      return { invalidLength: 0, length: 2, value: "<=" };
    }

    if (text.startsWith(">=")) {
      return { invalidLength: 0, length: 2, value: ">=" };
    }

    if (text.startsWith("=>") || text.startsWith("=<") || text.startsWith("!!")) {
      return { invalidLength: 2, length: 0, value: "=" };
    }

    return undefined;
  }

  private static readSingleCharacterComparator(text: string): ComparatorRead {
    if (text.startsWith("!")) {
      return { invalidLength: 1, length: 0, value: "=" };
    }

    if (text.startsWith("=")) {
      return { invalidLength: 0, length: 1, value: "=" };
    }

    return Parser.readInequalityComparator(text);
  }

  private static readInequalityComparator(text: string): ComparatorRead {
    if (text.startsWith("<")) {
      return { invalidLength: 0, length: 1, value: "<" };
    }

    if (text.startsWith(">")) {
      return { invalidLength: 0, length: 1, value: ">" };
    }

    return { invalidLength: 0, length: 0, value: "=" };
  }

  #decodeVersion(region: VersionRegion): string | undefined {
    if (!this.#validateVersionCharacters(region)) {
      return undefined;
    }

    return this.#decodeValidEscapes(region);
  }

  #validateVersionCharacters(region: VersionRegion): boolean {
    for (let index = 0; index < region.raw.length; index += 1) {
      const codeUnit = region.raw.charCodeAt(index);

      if (codeUnit === ASCII_PERCENT) {
        if (!this.#validateEscape(region, index)) {
          return false;
        }
        index += HEX_ESCAPE_WIDTH;
      } else if (!this.#validateRawVersionCodeUnit(codeUnit, region.start + index)) {
        return false;
      }
    }

    return true;
  }

  #decodeValidEscapes(region: VersionRegion): string | undefined {
    try {
      return decodeURIComponent(region.raw);
    } catch {
      this.#add({
        code: "constraint.invalid_utf8",
        span: { end: region.end, start: region.start },
      });
      return undefined;
    }
  }

  #validateEscape(region: VersionRegion, index: number): boolean {
    const escapeText = region.raw.slice(index, index + ESCAPE_WIDTH);

    if (
      escapeText.length === ESCAPE_WIDTH &&
      Parser.isHex(escapeText.charCodeAt(1)) &&
      Parser.isHex(escapeText.charCodeAt(2))
    ) {
      return true;
    }

    this.#add({
      code: "constraint.invalid_percent_encoding",
      span: { end: region.start + index + escapeText.length, start: region.start + index },
    });
    return false;
  }

  private static isHex(codeUnit: number): boolean {
    return (
      Parser.isDigit(codeUnit) ||
      (codeUnit >= UPPERCASE_A && codeUnit <= UPPERCASE_F) ||
      (codeUnit >= LOWERCASE_A && codeUnit <= LOWERCASE_F)
    );
  }

  #validateRawVersionCodeUnit(codeUnit: number, position: number): boolean {
    if (Parser.isUnreserved(codeUnit)) {
      return true;
    }

    this.#add({ code: "lexical.invalid_character", span: { end: position + 1, start: position } });
    return false;
  }

  private static isUnreserved(codeUnit: number): boolean {
    return (
      Parser.isUppercaseLetter(codeUnit) ||
      Parser.isLowercaseLetter(codeUnit) ||
      Parser.isDigit(codeUnit) ||
      codeUnit === ASCII_DASH ||
      codeUnit === ASCII_DOT ||
      codeUnit === ASCII_UNDERSCORE ||
      codeUnit === ASCII_TILDE
    );
  }

  #checkDuplicates(
    constraints: readonly VersConstraint[],
    segments: readonly ConstraintSegment[],
  ): void {
    const seen = new Map<string, number>();

    for (let index = 0; index < constraints.length; index += 1) {
      const constraint = constraints[index];

      if (constraint !== undefined && constraint.comparator !== "*") {
        if (seen.has(constraint.version)) {
          this.#addDuplicateIssue(segments[index]);
        } else {
          seen.set(constraint.version, index);
        }
      }
    }
  }

  #addDuplicateIssue(segment: ConstraintSegment | undefined): void {
    if (segment === undefined) {
      this.#add({ code: "canonical.duplicate_version" });
      return;
    }

    this.#add({ code: "canonical.duplicate_version", span: Parser.versionSpan(segment) });
  }

  private static versionSpan(segment: ConstraintSegment): VersSpan {
    const comparator = Parser.readComparator(segment.text);
    return { end: segment.end, start: segment.start + comparator.length };
  }

  private static serializeRange(type: string, constraints: readonly VersConstraint[]): string {
    return `${SCHEME_PREFIX}${type}/${constraints.map((constraint) => Parser.serializeConstraint(constraint)).join("|")}`;
  }

  private static serializeConstraint(constraint: VersConstraint): string {
    if (constraint.comparator === "*") {
      return "*";
    }

    const version = Parser.serializeVersion(constraint.version);
    return constraint.comparator === "=" ? version : `${constraint.comparator}${version}`;
  }

  private static serializeVersion(version: string): string {
    return encodeURIComponent(version).replace(/[!'()*]/gu, (character) =>
      Parser.encodeReservedCharacter(character),
    );
  }

  private static encodeReservedCharacter(character: string): string {
    return `%${character.charCodeAt(FIRST_INDEX).toString(HEX_RADIX).toUpperCase().padStart(HEX_ESCAPE_WIDTH, "0")}`;
  }
}

export function parseInput(input: string): InternalParseResult {
  return new Parser(input).parse();
}
