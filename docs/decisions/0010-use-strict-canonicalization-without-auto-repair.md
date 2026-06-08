---
parent: Decisions
nav_order: 10
status: accepted
date: 12026-06-07
decision-makers: Yunseo Kim
---

# Use Strict Canonicalization Without Auto-Repair

## Context and Problem Statement

The first vers-js release will expose Result-centered functions for canonical
VERS syntax validation, canonicalization, and parsed declaration metadata.
ADR-0004 defines `parseVers()`, `validateVers()`, and `canonicalizeVers()` as
public functions that return explicit success or failure results. ADR-0005
defines successful parse output as plain syntax metadata that includes a
`canonical` VERS string. ADR-0008 limits v1 conformance to parse/canonical
fixtures and avoids semantic behavior outside canonical syntax validation.

The package now needs to define whether canonicalization repairs non-canonical
input or only returns canonical output for input that is already valid and
canonical. This affects parser structure, diagnostic behavior, and fixture
design for percent-decoding and reserialization.

The official VERS parse and validation guide states that tools should check that
the VERS string is canonical, report errors for non-canonical input, and should
not auto-correct non-canonical input during parsing.

Should vers-js automatically repair non-canonical VERS input, or reject it and
keep `canonicalizeVers()` as an explicit canonical-output projection?

## Decision Drivers

- The implementation should follow the official VERS parse and validation guide.
- Public functions should preserve the first-release boundary of canonical syntax
  validation and parsed metadata.
- Canonicalization behavior should be predictable for supply-chain tooling and
  should not silently change user-authored declarations.
- Parser fixtures should distinguish accepted canonical input from rejected
  non-canonical input.
- Percent-decoding and reserialization should have a stable public contract.
- Any future tolerant repair API should be added deliberately, not implied by the
  first `canonicalizeVers()` contract.

## Considered Options

- Strict canonicalization without auto-repair
- Repair non-canonical input in `canonicalizeVers()` only
- Add a tolerant repair API alongside strict parsing
- Remove `canonicalizeVers()` from v1

## Decision Outcome

Chosen option: "Strict canonicalization without auto-repair", because it follows
the official VERS guide, keeps all v1 public functions aligned with canonical
syntax validation, and avoids silently rewriting invalid or non-canonical input.

`parseVers()`, `validateVers()`, and `canonicalizeVers()` will all fail when the
input is malformed or non-canonical. `canonicalizeVers()` is not a tolerant
repair function. It validates canonical input and returns the canonical VERS
string represented by the parsed syntax metadata. Its successful result is
equivalent to projecting `canonical` from a successful `parseVers()` result.

Non-canonical inputs such as ASCII whitespace, invalid casing, leading or
trailing pipe separators, consecutive pipe separators, non-canonical ordering,
duplicate versions, invalid comparator sequences, invalid percent-encoding, and
unsupported forms must produce failure results with machine-readable issue codes
rather than repaired output.

Successful parse metadata exposes decoded version strings. Canonical output is
produced by reserializing the decoded metadata using vers-js canonical
percent-encoding rules. Percent-decoding is performed once for each version
component that contains percent-encoded octets. Malformed percent escapes,
invalid encoded byte sequences, and inputs that would require double-decoding are
validation failures rather than repair opportunities.

The public contract does not promise to preserve the exact raw input text after
successful parsing. It promises the decoded syntax metadata and the canonical
VERS string for that metadata.

### Consequences

- Good, because vers-js follows the official instruction not to auto-correct
  non-canonical input during parsing.
- Good, because all v1 entry points share one success boundary: valid and
  canonical VERS input.
- Good, because downstream tools can distinguish invalid user input from
  project-authored canonical output.
- Good, because fixtures can treat non-canonical forms as negative cases with
  stable diagnostic codes.
- Good, because `canonicalizeVers()` remains useful as a canonical-output helper
  without implying tolerant repair behavior.
- Neutral, because user-facing applications that want repair suggestions must
  build that behavior outside the v1 core API.
- Bad, because users cannot pass near-valid VERS input and receive an automatic
  canonical replacement from vers-js v1.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- `parseVers()`, `validateVers()`, and `canonicalizeVers()` reject malformed and
  non-canonical input;
- `canonicalizeVers()` returns the same canonical string exposed by successful
  parse metadata;
- no v1 public function silently reorders constraints, removes duplicates,
  changes casing, trims whitespace, or repairs separators in user input;
- malformed percent-encoding fails with machine-readable diagnostics;
- successful parse metadata exposes decoded version strings and canonical output
  is produced by deterministic reserialization;
- tests include project-owned negative fixtures for non-canonical input that the
  official canonical parse fixture does not cover.

## Pros and Cons of the Options

### Strict canonicalization without auto-repair

This option rejects non-canonical input in all v1 public entry points and treats
`canonicalizeVers()` as a canonical-output projection for valid canonical input.

- Good, because it follows the official VERS parsing guidance directly.
- Good, because it matches ADR-0004, ADR-0005, ADR-0006, ADR-0007, and ADR-0008.
- Good, because it avoids type-specific semantic sorting or simplification that
  would exceed v1 scope.
- Bad, because it does not provide automatic user input cleanup.

### Repair non-canonical input in `canonicalizeVers()` only

This option keeps `parseVers()` and `validateVers()` strict but lets
`canonicalizeVers()` repair near-valid non-canonical input when it can produce a
canonical string.

- Good, because it can improve user-facing workflows that want suggested fixes.
- Good, because JavaScript libraries sometimes expose separate cleanup functions
  for forgiving normalization.
- Bad, because the boundary between validation and repair becomes ambiguous.
- Bad, because repairing order, duplicate versions, or comparator sequences may
  require type-specific comparison and simplification outside v1 scope.
- Bad, because it conflicts with the official VERS guidance not to auto-correct
  non-canonical input during parsing.

### Add a tolerant repair API alongside strict parsing

This option keeps the v1 parser strict and adds a separate function such as
`repairVers()` or `normalizeVers()` for best-effort cleanup.

- Good, because the repair behavior would be explicitly named and separate from
  parsing and validation.
- Good, because it preserves a future path for CLI or UI repair suggestions.
- Bad, because it expands the first-release API and fixture surface.
- Bad, because defining safe repair rules is premature while v1 excludes semantic
  comparison, containment, and simplification.

### Remove `canonicalizeVers()` from v1

This option exposes parse and validate functions only, relying on `parseVers()`
metadata for canonical output.

- Good, because it avoids any chance that callers interpret canonicalization as
  repair.
- Good, because it keeps the public API smaller.
- Bad, because ADR-0004 already selected a public `canonicalizeVers()` equivalent.
- Bad, because callers benefit from a focused helper that returns the canonical
  string without unpacking parse metadata.

## More Information

This decision defines canonicalization behavior only. The public functional API
shape is decided in ADR-0004. The successful parse data model is decided in
ADR-0005. Diagnostic collection and issue-code structure are decided in ADR-0006
and ADR-0007. The v1 conformance fixture family is decided in ADR-0008, and the
upstream pinning policy is decided in ADR-0009.

External references:

- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- VERS test overview:
  <https://github.com/package-url/vers-spec/blob/main/docs/tests.md>
- VERS canonical parse tests:
  <https://github.com/package-url/vers-spec/blob/main/tests/vers_canonical_parse_test.json>
- npm semver strict, clean, and coerce API precedent:
  <https://github.com/npm/node-semver/blob/main/README.md>
- MDN `encodeURIComponent()` percent-encoding behavior:
  <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent>

This decision should be revisited if one of the following becomes true:

- the official VERS specification changes its guidance on auto-correction;
- vers-js adds an explicitly named tolerant repair API;
- v1 scope expands to include type-specific comparison, containment,
  simplification, or native range translation;
- official VERS fixtures define a separate canonicalization or repair fixture
  family with normative behavior.
