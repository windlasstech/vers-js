# Agent Notes for vers-js

Compact guidance for AI assistants working in this repository.

## Project Identity

- **vers-js** — TypeScript library for parsing and validating VERS (VErsion Range Specifier) declarations.
- Early-stage / greenfield: no source code or tests yet; only architectural decision records (ADRs), architecture specifications, and repo scaffolding exist.
- Apache 2.0 licensed, owned by Windlass.

## Development Baseline

- **Runtime**: Node.js 22 LTS for development only. The published library must remain runtime-agnostic (Node.js, Deno, Bun).
- **Package manager**: pnpm, pinned via `devEngines.packageManager` in `package.json`.
- **Language**: TypeScript (ES2023 target, ESM-only, `"moduleResolution": "Bundler"`).
- **Lockfile**: `pnpm-lock.yaml` (frozen installs in CI via `pnpm ci`).
- **Toolchain** (decided, see ADR-0036 through ADR-0040):
  - **Build**: `tsc` only — no bundler. Build script: `tsc -p tsconfig.build.json`.
  - **Typecheck**: `tsc --noEmit` (authoritative; Oxlint does not replace this).
  - **Test**: Vitest. Run: `vitest run`. Watch: `vitest`.
  - **Lint**: Oxlint with type-aware linting (configured in `.oxlintrc.json`).
  - **Format**: Oxfmt (configured in `.oxfmtrc.json`).
  - **Markdown lint**: `markdownlint-cli2` (configured in `.markdownlint-cli2.jsonc`).

### Preferred commands

Use the `package.json` scripts rather than bare CLI invocations. The scripts include flags that match CI:

```bash
# Linting and formatting
pnpm run lint:md          # markdownlint-cli2
pnpm run lint:ts          # oxlint (reads .oxlintrc.json)
pnpm run lint:ts:github   # oxlint with GitHub Actions format
pnpm run fmt              # oxfmt
pnpm run fmt:check        # oxfmt --check

# Type checking and build (once tsconfig files exist)
pnpm run typecheck        # tsc --noEmit
pnpm run build            # tsc -p tsconfig.build.json

# Testing (once configured)
pnpm run test             # vitest run
pnpm run test:watch       # vitest
```

### Pre-commit hooks

`lefthook.yml` enforces auto-fix on commit:

1. `lint:md:fix` — auto-fix markdown issues and stage
2. `lint:ts:fix` — auto-fix TS lint issues and stage
3. `fmt` — run Oxfmt and stage

Commit-msg hook enforces DCO sign-off. If you bypass hooks, CI will still catch violations.

## Spec-Driven Development (SDD)

This project follows SDD methodology. Do not implement before reading the specs.

1. **ADRs first** (`docs/decisions/`): understand _why_ architecture was chosen
2. **Specs second** (`docs/architecture/`): define _exact observable behavior_
3. **Implementation third**: build against the specifications

### Specification writing order

When drafting or reviewing architecture specs, follow this sequence:

1. `scope-and-invariants.md` — boundary first
2. `public-api.md` — callable surface
3. `data-model-and-canonical-output.md` — success values
4. `character-encoding.md` — input processing rules
5. `parser-phases.md` — execution order
6. `diagnostics.md` — failure values
7. `fixtures.md` — test expectations
8. `resource-limits.md` — resource boundaries
9. `build-and-test.md` — scaffolding and verification
10. Add new documents as needed.

## Critical Constraints

- **Runtime-agnostic core**: Library code must avoid runtime-specific globals (`process`, `Buffer`, `Deno`, `Bun`). Oxlint enforces this via `no-restricted-globals`.
- **Public API boundary**: Expose stable data-oriented functions (`parseVers()`, `validateVers()`, `canonicalizeVers()`) with explicit success/failure results and machine-readable error codes. Do not leak parser internals.
- **Scope discipline**: First release covers canonical VERS syntax validation and parsed declaration metadata only. Do not implement comparison, containment, native range translation, resolver behavior, or vulnerability interpretation unless a new ADR explicitly expands scope.

## Architecture Invariants

These invariants are defined in `docs/architecture/scope-and-invariants.md` and `docs/architecture/public-api.md`. Agents must not violate them when proposing code changes:

1. **Public API is fixed**: Only `parseVers()`, `validateVers()`, and `canonicalizeVers()` are public. Each accepts exactly one `string` argument. Non-string input must throw `TypeError`. Malformed input returns `Result` failures, never repaired output.
2. **No parser internals in public results**: Public results must not expose tokens, scanner state, parser nodes, mutable state, or runtime-specific objects.
3. **ESM-only, root-only**: Package consumers import only from `"vers-js"`. No subpath imports (`vers-js/parser`, `vers-js/errors`). No CommonJS artifact.
4. **Strict canonical validation**: All public functions validate canonical VERS syntax. They do not trim whitespace, change casing, rewrite separators, reorder constraints, deduplicate, or repair percent escapes.
5. **Type validation is syntax-only**: The parser validates `type` characters and lowercase casing. It must not reject unknown types (e.g., `support.unknown_type` is reserved, not active).
6. **Constraint order preserved**: The parser preserves input constraint order. It does not sort, simplify, or normalize for containment.
7. **Error-only, no warnings**: Public functions do not accept warning, advisory, loose, repair, recovery, or coercion modes. Successful results carry no warnings.
8. **Issue codes are machine-readable**: `VersIssue.code` uses the core issue-code union. Human-readable `message` fields are convenience text, not the stable contract.

## Verification Sequence

When implementing or validating changes, run checks in this order:

1. `pnpm run fmt:check` — formatting
2. `pnpm run lint:ts` — linting (type-aware via `.oxlintrc.json`)
3. `pnpm run lint:md` — markdown linting
4. `tsc --noEmit` — type-checking (authoritative)
5. `vitest run` — tests (unit, parser, fixture, diagnostic, resource, package-boundary)
6. `tsc -p tsconfig.build.json` — package build
7. Validate `package.json` metadata points at emitted files
8. Smoke-test built package under Node.js, Deno, and Bun
9. Windlass supply-chain checks (Scorecard, OSV Scanner, Dependency Review)

Independent checks may be reordered for CI speed, but release readiness requires all to pass.

## Test Architecture

| Layer                       | Purpose                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| Unit                        | Small parser helpers with internal contracts                                                  |
| Parser success              | Successful `parseVers`, `validateVers`, `canonicalizeVers` behavior                           |
| Official fixtures           | Pinned upstream `vers_canonical_parse_test.json` through local disposition table              |
| Project diagnostic fixtures | Active issue codes, severity, spans, fatality, ordering, metadata                             |
| Resource boundary           | Input length (`1024`/`1025` UTF-16 code-unit boundary), issue cap (`16`), truncation metadata |
| Package boundary            | Root exports, declaration metadata, default export, blocked subpaths                          |
| Runtime smoke               | Built package under Node.js, Deno, Bun                                                        |

Tests must not assert exact human-readable diagnostic message strings. They may assert that messages are non-empty strings.

## Repo Conventions

- **ADRs**: Use MADR 4.0.0 format. Store in `docs/decisions/` with sequential numbering (`0001-title.md`).
- **ADR immutability**: Existing accepted ADRs are immutable. Never edit the body of an accepted ADR after the fact. The only permitted post-acceptance change is updating the `status` field (e.g., to `superseded`, `deprecated`). If a decision changes, write a new ADR rather than rewriting history.
- **Dates in documents**: Use Holocene Era / Human Era year format (e.g., `12026-06-07`).
- **Bilingual README updates**: When editing any `README.md`, update the corresponding `README.ko.md` in the same directory as part of the same change.
- **Dependency policy**: `minimumReleaseAge` cooldown configured in `pnpm-workspace.yaml` (4320 minutes / 3 days). Security updates bypass cooldown per Dependabot config.
- **CodeGraph MCP**: `opencode.jsonc` configures a local CodeGraph MCP server. Other AI tool configs (`.cursor/`, `.claude/`, `.kiro/`, `.gemini/`) also reference CodeGraph.

## Commits

- **DCO sign-off required**: Every commit must include a `Signed-off-by:` line. Use `git commit -s` (or `git commit --signoff`) for all commits. Lefthook enforces this in the commit-msg hook.

## CI / Security

- Reusable workflows from `windlasstech/.github`:
  - Scorecard supply-chain security
  - OSV Scanner (full scan on schedule + push to main; PR scan on PRs + merge groups)
  - Dependency Review (on PRs + merge groups)
- Do not add build/test CI that bypasses these security checks.
- **Always reference** `windlasstech/.github` main branch security docs before making security-relevant changes:
  - Primary: <https://raw.githubusercontent.com/windlasstech/.github/refs/heads/main/SECURITY.md>
  - SLSA compliance framework: <https://raw.githubusercontent.com/windlasstech/.github/refs/heads/main/docs/security/slsa-compliance-framework.md>
  - Workflow hardening: <https://raw.githubusercontent.com/windlasstech/.github/refs/heads/main/docs/security/workflow-hardening.md>
  - Dependency security policy: <https://raw.githubusercontent.com/windlasstech/.github/refs/heads/main/docs/security/dependency-security.md>

## Pull Requests

- PRs must follow the template defined in `windlasstech/.github`:
  - <https://raw.githubusercontent.com/windlasstech/.github/refs/heads/main/.github/PULL_REQUEST_TEMPLATE.md>
- **Always fetch the template content** and write the PR body to match it. Do not rely on `gh pr create` to auto-populate the template; if it does not, manually compose the body using the fetched template structure.

## What Does Not Exist Yet (Agent Traps)

- Only initial TypeScript scaffolding exists; parser implementation files are not yet present.
- Only initial Vitest smoke-test scaffolding exists; parser, fixture, diagnostic,
  resource, package-boundary, and runtime smoke suites are not yet present.
- No npm publish or release scripts yet.
- If adding these, align with the decisions in `docs/decisions/` (TypeScript, Node.js LTS, pnpm) and the contracts in `docs/architecture/build-and-test.md`.

## Useful References

- VERS spec: <https://packageurl.org/docs/vers/specification>
- VERS tests: <https://packageurl.org/docs/vers/tests>
- MADR template: embedded in `docs/decisions/0000-use-markdown-architectural-decision-records.md`
- Windlass dependency-security policy: <https://github.com/windlasstech/.github/blob/main/docs/security/dependency-security.md>
