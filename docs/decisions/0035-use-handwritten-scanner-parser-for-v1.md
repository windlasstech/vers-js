---
parent: Decisions
nav_order: 35
status: accepted
date: 12026-06-08
decision-makers: Yunseo Kim
---

# Use a Handwritten Scanner Parser for V1

## Context and Problem Statement

ADR-0004 keeps parser internals outside the public API. ADR-0016 defines logical
parser phases with explicit fatal boundaries while allowing the concrete
implementation to remain compact. ADR-0023, ADR-0024, and ADR-0025 define spans as
zero-based, half-open UTF-16 offsets into the original input string. ADR-0027 and
ADR-0028 define fixed v1 resource budgets for input length and diagnostic issue
count. ADR-0031 keeps the v1 public API string-only and optionless.

VERS v1 syntax is a compact, separator-driven ASCII string format: `vers:`, a
type, `/`, a pipe-separated constraint list, comparator prefixes, version text,
and percent-encoded version substrings. The implementation must produce stable
plain result data and namespaced diagnostics without exposing tokens, parse trees,
or generated-parser artifacts.

Should v1 use a handwritten scanner/parser, an internal lexer plus structured
parser, a parser generator, or another parsing approach?

## Decision Drivers

- The implementation must preserve ADR-0016's logical phases and fatal-boundary
  behavior.
- Diagnostic spans must target the original input string with precise UTF-16
  offsets.
- Diagnostic collection must respect the fixed issue cap while issues are being
  collected, not after an unbounded list has been generated.
- The parser should remain runtime-agnostic and avoid generator runtime
  dependencies in the published package.
- The first release should keep implementation complexity proportional to the
  compact VERS grammar.
- Future parser approaches should remain possible if the grammar or tooling needs
  grow beyond v1 assumptions.

## Considered Options

- Handwritten scanner/parser
- Handwritten lexer with small structured parser
- Parser generator
- Validator-first regular-expression checks

## Decision Outcome

Chosen option: "Handwritten scanner/parser", because VERS v1 is a small
separator-driven string language whose diagnostic, span, fatal-boundary, and
resource-budget requirements are easier to satisfy directly than through a token
stream or generated parse tree.

The v1 implementation will scan the input string directly and construct parsed
syntax metadata only after the relevant structural boundaries are trustworthy. The
code may be organized into helper functions that mirror ADR-0016's logical phases,
but it will not create a mandatory token stream or public parser structure as part
of normal parsing.

The handwritten scanner/parser must still behave as if it passed through the
logical phases from ADR-0016:

1. lexical pre-scan;
2. structural scheme and type parsing;
3. constraint-list splitting;
4. per-constraint syntax validation;
5. percent-decoding and decoded metadata construction;
6. canonicality validation and canonical string projection.

Internal helper names, cursor state, partial segment records, and any transient
structures are implementation details. They must not be exported through package
subpaths or public result values.

### Consequences

- Good, because the implementation can track spans with raw string indices.
- Good, because fatal boundaries and issue-cap checks can be enforced exactly at
  the points where diagnostics are discovered.
- Good, because v1 avoids parser-generator runtime dependencies and generated
  artifacts.
- Good, because the parser can stay small while still preserving the logical phase
  contract.
- Neutral, because the parser may still use small internal segment records when
  they clarify phase boundaries.
- Bad, because the grammar is less visible than it would be in a grammar file or
  tokenized parser pipeline.
- Bad, because maintainers must preserve phase discipline manually as checks are
  added.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- v1 parser code does not depend on a parser generator or parser runtime package;
- parsing starts from the original input string and directly tracks UTF-16 offsets;
- issue-cap checks happen before adding newly discovered diagnostics;
- code structure documents or otherwise preserves ADR-0016's logical phases;
- public exports do not expose scanner cursors, tokens, parser nodes, or generated
  artifacts;
- tests cover successful parsing, fatal whole-input boundaries, per-constraint
  boundaries, and multi-issue accumulated diagnostics.

## Pros and Cons of the Options

### Handwritten scanner/parser

This option uses direct string scanning, index tracking, and phase-shaped helper
functions without a separate token stream.

- Good, because VERS syntax is compact and separator-driven.
- Good, because it gives direct control over spans, issue ordering, fatal
  boundaries, input-length checks, and issue-cap enforcement.
- Good, because it keeps the published package free of parser-generator runtime
  dependencies.
- Good, because it avoids converting generator-specific errors into `VersIssue`
  values.
- Bad, because the implementation must be reviewed carefully to keep logical phase
  boundaries from becoming implicit control-flow accidents.

### Handwritten lexer with small structured parser

This option first converts the input into internal tokens and then parses the token
stream with a small handwritten parser.

- Good, because lexer and parser responsibilities are explicit in code.
- Good, because issue-code namespaces can map cleanly to lexer, parser, and
  validator modules.
- Good, because token-level tests can help if the grammar grows.
- Bad, because v1 does not need a full token stream to parse `:`, `/`, `|`,
  comparator prefixes, and version substrings.
- Bad, because token allocation and token-shape design add implementation surface
  without changing the public result shape.
- Bad, because internal token structures could become de facto contracts if they
  leak through tests, examples, or subpath exports.

### Parser generator

This option uses a tool such as Chevrotain, Peggy, Nearley, Ohm, ANTLR, or
Tree-sitter to define grammar rules and produce or execute a parser.

- Good, because grammar rules can be more visible and easier to compare with a
  formal grammar.
- Good, because some tools provide built-in error reporting, recovery, grammar
  diagnostics, or editor-oriented parse trees.
- Bad, because v1 must translate tool-specific parse errors into the `VersIssue`
  catalog.
- Bad, because generated trees and tokens are unnecessary for the public v1 data
  model.
- Bad, because parser-generator runtime dependencies, build steps, or generated
  artifacts add supply-chain and maintenance surface for a compact DSL.
- Bad, because issue caps, reliable span omission, and fatal-boundary stopping may
  require tool-specific workarounds.

### Validator-first regular-expression checks

This option validates most syntax through regular expressions and split operations,
then constructs parsed metadata only after validation passes.

- Good, because simple checks can be concise.
- Good, because some lexical checks can still be usefully expressed with safe
  regular expressions.
- Bad, because structural dependencies can become duplicated across validation and
  metadata construction.
- Bad, because cascading diagnostics are easier to produce accidentally when checks
  run independently of fatal boundaries.
- Bad, because percent-decoding, canonicality, duplicate detection, and comparator
  sequence checks need trustworthy parsed constraint metadata.

## More Information

This decision refines the implementation approach allowed by ADR-0016. It does not
change the public API selected by ADR-0004, the syntax metadata model selected by
ADR-0005, the diagnostic collection policy selected by ADR-0006, the span policy
selected by ADR-0023 through ADR-0026, or the v1 optionless API decisions selected
by ADR-0030 through ADR-0034.

External references:

- VERS parse and validation guide:
  <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- VERS specification:
  <https://github.com/package-url/vers-spec/blob/main/docs/standard/specification.md>
- npm node-semver README:
  <https://github.com/npm/node-semver#readme>
- Babel parser options and error recovery:
  <https://babeljs.io/docs/babel-parser>
- Chevrotain FAQ:
  <https://chevrotain.io/docs/FAQ.html>
- Peggy documentation:
  <https://peggyjs.org/documentation.html>
- Tree-sitter getting started:
  <https://tree-sitter.github.io/tree-sitter/creating-parsers/1-getting-started.html>

This decision should be revisited if one of the following becomes true:

- VERS grammar grows beyond compact separator-driven syntax and gains nested,
  recursive, or ambiguous constructs;
- implementation experience shows that the scanner control flow obscures ADR-0016
  phase boundaries or makes issue ordering hard to review;
- tests or fixtures need stable token-level assertions that are awkward to express
  against direct scanner behavior;
- future advisory validation, warning, repair, or editor tooling needs a clearer
  internal token stream or parse tree;
- parser performance, bundle size, or diagnostic quality becomes worse than a
  structured lexer/parser or generator alternative in measured benchmarks;
- maintainers need grammar-as-artifact documentation more than direct scanner
  debuggability;
- a future implementation exposes enough internal segment state that a handwritten
  lexer plus small structured parser would reduce complexity;
- a third-party parser generator offers compelling runtime-agnostic TypeScript
  output with no unacceptable dependency, build, diagnostic, or resource-control
  tradeoffs.
