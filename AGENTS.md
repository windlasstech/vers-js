# Agent Notes for vers-js

Compact guidance for AI assistants working in this repository.

## Project Identity

- **vers-js** — TypeScript library for parsing and validating VERS (VErsion Range Specifier) declarations.
- Early-stage / greenfield: no source code yet; only architectural decision records (ADRs) exist.
- Apache 2.0 licensed, owned by Windlass.

## Development Baseline

- **Runtime**: Node.js 22 LTS for development only. The published library must remain runtime-agnostic (Node.js, Deno, Bun).
- **Package manager**: pnpm (will be pinned via `packageManager` in `package.json` once created).
- **Language**: TypeScript (ES2023 target, ESM-only, `"moduleResolution": "Bundler"`).
- **Lockfile**: `pnpm-lock.yaml` (frozen installs in CI).
- **Toolchain** (decided, see ADR-0036 through ADR-0040):
  - **Build**: `tsc` only — no bundler. Build script: `tsc -p tsconfig.build.json`.
  - **Typecheck**: `tsc --noEmit` (authoritative; Oxlint does not replace this).
  - **Test**: Vitest. Run: `vitest run`. Watch: `vitest`.
  - **Lint**: Oxlint with type-aware linting. Run: `oxlint --type-aware`.
  - **Format**: Oxfmt. Run: `oxfmt --check`.

## Critical Constraints

- **Runtime-agnostic core**: Library code must avoid runtime-specific globals (`process`, `Buffer`, `Deno`, `Bun`).
- **Public API boundary**: Expose stable data-oriented functions (e.g., `parseVers()`, `validateVers()`, `canonicalizeVers()`) with explicit success/failure results and machine-readable error codes. Do not leak parser internals.
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

## Repo Conventions

- **ADRs**: Use MADR 4.0.0 format. Store in `docs/decisions/` with sequential numbering (`0001-title.md`).
- **Dates in documents**: Use Holocene Era / Human Era year format (e.g., `12026-06-07`).
- **Dependency policy**: `minimumReleaseAge` cooldown (default ≥1440 minutes) via pnpm settings. Commit `.npmrc` or `pnpm-workspace.yaml` with this policy once dependencies exist.

## Commits

- **DCO sign-off required**: Every commit must include a `Signed-off-by:` line. Use `git commit -s` (or `git commit --signoff`) for all commits.

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

- No `package.json`, `tsconfig.json`, or source files yet.
- No test runner, linter, or formatter configured yet.
- No npm/publish scripts yet.
- If adding these, align with the decisions in `docs/decisions/` (TypeScript, Node.js LTS, pnpm).

## Useful References

- VERS spec: <https://packageurl.org/docs/vers/specification>
- VERS tests: <https://packageurl.org/docs/vers/tests>
- MADR template: embedded in `docs/decisions/0000-use-markdown-architectural-decision-records.md`
- Windlass dependency-security policy: <https://github.com/windlasstech/.github/blob/main/docs/security/dependency-security.md>
