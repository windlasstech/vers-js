// JSON.parse makes duplicate object members invisible: the later member wins.
// A reviver cannot observe the discarded member, so detection needs its own pass.
// Value semantics stay with the native parser.
// This module adds exactly one responsibility: duplicate-member rejection over already-valid JSON input.
class StrictJsonError extends Error {
  constructor(code, offset) {
    super(`${code} at offset ${offset}`);
    this.name = "StrictJsonError";
    this.code = code;
    this.offset = offset;
  }
}

// Returns the offset just past the closing quote.
// The input is valid JSON, so every escape is well formed and the closing quote always exists.
function skipString(text, start) {
  let offset = start + 1;
  while (text[offset] !== '"') {
    offset += text[offset] === "\\" ? 2 : 1;
  }
  return offset + 1;
}

// Escaped names are decoded before comparison.
// A member whose name carries a Unicode escape counts as the same key as its decoded form.
function recordKey(frame, name, start) {
  if (frame.keys.has(name)) {
    throw new StrictJsonError("json.duplicate-member", start);
  }
  frame.keys.add(name);
  frame.expectKey = false;
}

// Tracks only what key recognition needs.
// A string is an object member name when the innermost frame is an object whose last structural token was "{" or ",".
// Array frames are null placeholders on the stack.
function applyStructural(stack, character) {
  if (character === "{") {
    stack.push({ expectKey: true, keys: new Set() });
  } else if (character === "[") {
    stack.push(null);
  } else if (character === "}" || character === "]") {
    stack.pop();
  } else if (character === ",") {
    const frame = stack.at(-1);
    if (frame !== null && frame !== undefined) {
      frame.expectKey = true;
    }
  }
}

function scanString(stack, text, start) {
  const offset = skipString(text, start),
    frame = stack.at(-1);
  if (frame !== null && frame !== undefined && frame.expectKey) {
    recordKey(frame, JSON.parse(text.slice(start, offset)), start);
  }
  return offset;
}

function scanDuplicateMembers(text) {
  const stack = [];
  let offset = 0;
  while (offset < text.length) {
    if (text[offset] === '"') {
      offset = scanString(stack, text, offset);
    } else {
      applyStructural(stack, text[offset]);
      offset += 1;
    }
  }
}

function parseNative(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new StrictJsonError("json.depth-exceeded", 0);
    }
    throw new StrictJsonError("json.syntax-invalid", 0);
  }
}

function parseStrictJson(text) {
  if (typeof text !== "string") {
    throw new StrictJsonError("json.input-invalid", 0);
  }
  const value = parseNative(text);
  scanDuplicateMembers(text);
  return value;
}

export { parseStrictJson };
