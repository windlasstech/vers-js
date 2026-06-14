# Agent Notes for vers-js

Compact guidance for AI assistants working in this repository.

## Project Identity

- **vers-js** — Runtime-agnostic TypeScript library for parsing and validating VERS (VErsion Range Specifier) declarations.
- Current scope is v0.1.0: canonical syntax validation, parsed declaration metadata, and canonical string projection. It is a conforming parser, not a full semantic engine.
- Apache 2.0 licensed, owned by Windlass.

## Development Baseline

- **Runtime**: Node.js 22 LTS for development only. The published library must remain runtime-agnostic (Node.js, Deno, Bun).
- **Package manager**: pnpm 11.5.2, pinned via `devEngines.packageManager` in `package.json`.
- **Language**: TypeScript (ES2023 target, ESM-only, `"moduleResolution": "Bundler"`).
- **Lockfile**: `pnpm-lock.yaml` (frozen installs in CI via `pnpm ci`).
- **Toolchain** (decided, see ADR-0036 through ADR-0040 and ADR-0049):
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
pnpm run lint:md:fix      # markdownlint-cli2 --fix (also run by lefthook)
pnpm run lint:ts          # oxlint (reads .oxlintrc.json)
pnpm run lint:ts:fix      # oxlint --fix (also run by lefthook)
pnpm run lint:ts:github   # oxlint with GitHub Actions format
pnpm run fmt              # oxfmt (also run by lefthook)
pnpm run fmt:check        # oxfmt --check

# Type checking and build
pnpm run typecheck        # tsc --noEmit
pnpm run build            # tsc -p tsconfig.build.json

# Testing
pnpm run test             # vitest run
pnpm run test:watch       # vitest
pnpm run test:coverage    # vitest run --coverage

# Package verification (requires build first; scripts run it for you)
pnpm run test:package              # verify dist/ artifacts and package.json exports
pnpm run typecheck:package         # type-check a package consumer
pnpm run typecheck:package:blocked # verify subpath imports are blocked
pnpm run smoke:package             # runtime smoke test using the package name
pnpm run verify:package            # all of the above in order

# Runtime smoke testing (requires build first)
pnpm run smoke:runtime:node        # built package smoke under Node.js
pnpm run smoke:runtime:deno        # built package smoke under Deno
pnpm run smoke:runtime:bun         # built package smoke under Bun
pnpm run smoke:runtime             # all three runtimes
pnpm run verify:runtime            # build then run all runtime smoke tests
```

CI uses `pnpm ci` for reproducible installs. For local development, `pnpm install` is fine.

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

Start with `docs/architecture/index.md` when returning to the project.

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

## Architecture Invariants

These invariants are defined in `docs/architecture/scope-and-invariants.md` and `docs/architecture/public-api.md`. Agents must not violate them when proposing code changes:

1. **Public API is fixed**: Only `parseVers()`, `validateVers()`, and `canonicalizeVers()` are public. Each accepts exactly one `string` argument. Non-string input must throw `TypeError`. Malformed input returns `Result` failures, never repaired output.
2. **No parser internals in public results**: Public results must not expose tokens, scanner state, parser nodes, mutable state, or runtime-specific objects.
3. **ESM-only, root-only**: Package consumers import only from `"vers-js"`. No subpath imports (`vers-js/parser`, `vers-js/errors`). No CommonJS artifact. No default export.
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
4. `pnpm run typecheck` — type-checking (authoritative)
5. `pnpm run test` — tests (unit, parser, fixture, diagnostic, resource, package-boundary)
6. `pnpm run test:coverage` — coverage (also exercised in CI)
7. `pnpm run build` — package build
8. `pnpm run verify:package` — package artifact, consumer type, blocked subpath, and package-name smoke checks
9. `pnpm run verify:runtime` — built package smoke under Node.js, Deno, and Bun
10. Windlass supply-chain checks (Scorecard, OSV Scanner, Dependency Review)

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

## Changelog Management

- Maintain `CHANGELOG.md` according to [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), but use the organization's Human Era date convention for release headings (for example, `## [0.1.0] - 12026-06-13`).
- Changelog entries are for users and downstream integrators. Summarize notable upgrade-relevant behavior; do not generate changelog entries by dumping commit logs.
- For every PR, complete the organization PR template's `Changelog` section with:
  - **Category**: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`, or `None`
  - **User-facing note**: a short impact summary, or why no note is needed
- Use `None` for changes with no direct user-facing impact, such as test cleanup, internal refactoring, formatting, or CI-only maintenance.
- During development, update only the `[Unreleased]` section when a PR has user-facing impact. Group entries by `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, and `Security`; do not create empty category sections.
- For release PRs, move `[Unreleased]` entries into the new version section, recreate an empty `[Unreleased]` section at the top, update comparison links at the bottom of `CHANGELOG.md`, and use the finalized version section as the GitHub Release body.

## Release Workflow

- The canonical maintainer release runbook is `docs/release.md`. Keep signed tag, npm Trusted Publishing, provenance, and GitHub Release process details there rather than duplicating the full workflow in README or AGENTS notes.

## CI / Security

- Reusable workflows from `windlasstech/.github`:
  - Scorecard supply-chain security
  - OSV Scanner (full scan on schedule + push to main; PR scan on PRs + merge groups)
  - Dependency Review (on PRs + merge groups)
- Do not add build/test CI that bypasses these security checks.
- **Always reference** `windlasstech/.github` main branch security docs before making security-relevant changes:
  - Primary security policy: <https://raw.githubusercontent.com/windlasstech/.github/refs/heads/main/SECURITY.md>
  - Artifact attestations: <https://raw.githubusercontent.com/windlasstech/.github/refs/heads/main/docs/security/artifact-attestations.md>
  - Dependency security: <https://raw.githubusercontent.com/windlasstech/.github/refs/heads/main/docs/security/dependency-security.md>
  - SLSA compliance framework: <https://raw.githubusercontent.com/windlasstech/.github/refs/heads/main/docs/security/slsa-compliance-framework.md>
  - Workflow hardening: <https://raw.githubusercontent.com/windlasstech/.github/refs/heads/main/docs/security/workflow-hardening.md>
- Supply-chain baseline from the organization policy:
  - SLSA Build L1/L2 are required; Build L3+ is the target wherever feasible.
  - SLSA Source L1/L2 are required; Source L3 controls are followed where feasible; Source L4 is structurally blocked for a 1-person organization.
  - Release source integrity uses GPG-signed annotated tags, GPG-signed commits on `main`, protected branches/tags, linear history, and required CI gates.
  - Released artifacts that consumers run, install, deploy, or download must include signed provenance attestations. Prefer SLSA GitHub Generator builders/generators; use reusable-workflow attestations when practical; use direct `actions/attest` only as the baseline path when Build L3+ is not yet feasible.
  - Released binaries and container images must include signed SPDX and CycloneDX SBOM attestations when the build can generate them; public releases should publish the same SBOM files as release assets when possible.
  - Registry-published release artifacts should upload linked artifacts storage metadata with `artifact-metadata: write` when supported.
  - Dependency security is layered: committed lockfiles, Dependabot, cooldowns, Dependency Review, and OSV Scanner. Security updates bypass cooldowns; normal version updates use cooldowns.
  - Workflow hardening requires SHA-pinned third-party actions, hardened runners, explicit minimal top-level permissions, job-level elevation only when required, OIDC instead of long-lived cloud credentials, and protected production environments.
- GitHub Actions permission reminders:
  - Artifact attestations with `actions/attest`: `contents: read`, `id-token: write`, `attestations: write`.
  - Linked artifacts storage records: add `artifact-metadata: write` and use registry artifact subjects by immutable digest.
  - Container registry pushes: add `packages: write` only on the job that pushes images.
  - Release asset upload: add `contents: write` only on the release job.
  - PR comments: add `pull-requests: write` only for jobs that write comments.

## Pull Requests

- PRs must follow the template defined in `windlasstech/.github`:
  - <https://raw.githubusercontent.com/windlasstech/.github/refs/heads/main/.github/PULL_REQUEST_TEMPLATE.md>
- **Always fetch the template content** and write the PR body to match it. Do not rely on `gh pr create` to auto-populate the template; if it does not, manually compose the body using the fetched template structure.

## Common Traps

- Do not leak parser internals (`Parser` class, `parseInput`, scanner state) through the public API or exported types.
- Do not add Node.js/Deno/Bun-specific globals or imports to `src/`; Oxlint's `no-restricted-globals` and `import/no-nodejs-modules` rules enforce runtime agnosticism.
- Do not implement comparison, containment, native range translation, resolver behavior, or vulnerability interpretation unless a new ADR explicitly expands scope.
- Do not expose a default export or subpath exports from `package.json`.
- Do not assert exact `VersIssue.message` strings in tests.
- Do not edit the upstream fixture at `tests/fixtures/upstream/vers_canonical_parse_test.json`; local divergences are captured in `tests/fixtures/vers-canonical-disposition.json`.

<!-- CODEGRAPH_START -->

## CodeGraph

This project has a CodeGraph MCP server (`codegraph_*` tools) configured. CodeGraph is a tree-sitter-parsed knowledge graph of every symbol, edge, and file. Reads are sub-millisecond and return structural information grep cannot.

### When to prefer codegraph over native search

Use codegraph for **structural** questions — what calls what, what would break, where is X defined, what is X's signature. Use native grep/read only for **literal text** queries (string contents, comments, log messages) or after you already have a specific file open.

| Question                                                  | Tool                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| "Where is X defined?" / "Find symbol named X"             | `codegraph_search`                                                                   |
| "What calls function Y?"                                  | `codegraph_callers`                                                                  |
| "What does Y call?"                                       | `codegraph_callees`                                                                  |
| "How does X reach/become Y? / trace the flow from X to Y" | `codegraph_trace` (one call = the whole path, incl. callback/React/JSX dynamic hops) |
| "What would break if I changed Z?"                        | `codegraph_impact`                                                                   |
| "Show me Y's signature / source / docstring"              | `codegraph_node`                                                                     |
| "Give me focused context for a task/area"                 | `codegraph_context`                                                                  |
| "See several related symbols' source at once"             | `codegraph_explore`                                                                  |
| "What files exist under path/"                            | `codegraph_files`                                                                    |
| "Is the index healthy?"                                   | `codegraph_status`                                                                   |

### Rules of thumb

- **Answer directly — don't delegate exploration.** For "how does X work" / architecture questions, answer with 2-3 codegraph calls: `codegraph_context` first, then ONE `codegraph_explore` for the source of the symbols it surfaces. For a specific **flow** ("how does X reach Y") start with `codegraph_trace` from→to — one call returns the whole path with dynamic hops bridged — then ONE `codegraph_explore` for the bodies; don't rebuild the path with `codegraph_search` + `codegraph_callers`. Codegraph IS the pre-built index, so spawning a separate file-reading sub-task/agent — or running a grep + read loop — repeats work codegraph already did and costs more for the same answer.
- **Trust codegraph results.** They come from a full AST parse. Do NOT re-verify them with grep — that's slower, less accurate, and wastes context.
- **Don't grep first** when looking up a symbol by name. `codegraph_search` is faster and returns kind + location + signature in one call.
- **Don't chain `codegraph_search` + `codegraph_node`** when you just want context — `codegraph_context` is one call.
- **Don't loop `codegraph_node` over many symbols** — one `codegraph_explore` call returns several symbols' source grouped in a single capped call, while each separate node/Read call re-reads the whole context and costs far more.
- **Index lag**: the file watcher debounces ~500ms behind writes; don't re-query immediately after editing a file in the same turn.

### If `.codegraph/` doesn't exist

The MCP server returns "not initialized." Ask the user: _"I notice this project doesn't have CodeGraph initialized. Want me to run `codegraph init -i` to build the index?"_

<!-- CODEGRAPH_END -->

## Useful References

- VERS introduction: <https://www.packageurl.org/docs/vers/introduction>
- VERS spec: <https://packageurl.org/docs/vers/specification>
- VERS tests: <https://packageurl.org/docs/vers/tests>
- VERS parsing guide: <https://github.com/package-url/vers-spec/blob/main/docs/how-to-parse.md>
- Upstream canonical parse fixture (browse): <https://github.com/package-url/vers-spec/blob/main/tests/vers_canonical_parse_test.json>
- Upstream canonical parse fixture (raw): <https://raw.githubusercontent.com/package-url/vers-spec/main/tests/vers_canonical_parse_test.json>
- Local fixture disposition table: `tests/fixtures/vers-canonical-disposition.json`
- MADR template: embedded in `docs/decisions/0000-use-markdown-architectural-decision-records.md`
- Windlass dependency-security policy: <https://github.com/windlasstech/.github/blob/main/docs/security/dependency-security.md>
