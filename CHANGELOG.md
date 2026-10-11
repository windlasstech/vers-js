# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- CVE-2026-104848: prototype pollution in tinypool's worker options (`execArgv`/`env`) allowed code
  execution inside every pool worker of the formatting toolchain (oxfmt); combined with a separate
  prototype-pollution source, exploitation in CI could theoretically have reached the build and
  release pipeline. Resolved by the oxfmt 0.71.0 upgrade pulling in tinypool 2.2.0.
- CVE-2026-104849: prototype pollution of tinypool's `run()` options (`filename`) could redirect
  execution to an attacker-controlled worker module. Resolved by the same tinypool 2.2.0 upgrade.
- Also raised other transitive development-only dependencies past OSV-flagged versions via pnpm
  overrides: katex (CVE-2026-103923), nanoid (CVE-2026-67213, CVE-2026-67214), postcss
  (CVE-2026-69153, CVE-2026-73646), smol-toml (GHSA-r4xh-jqrq-34v2, no CVE assigned), and
  source-map-js (CVE-2026-93749) — denial-of-service or input-channel-limited issues with no path to
  release artifacts. braces (CVE-2026-93687) remains unresolved because it has no fixed version. All
  affected packages are development-only; the published package has no runtime dependencies and
  consumers are not affected.

### Changed

- Combined consecutive `const` declarations in the parser source to comply with the `one-var` rule
  introduced by the upgraded oxlint development toolchain. No behavior or public API change.

## [0.1.2] - 12026-08-13

### Changed

- Release pipeline now publishes through the Windlass
  [slsa-builder](https://github.com/windlasstech/slsa-builder) npm SLSA3 reusable workflow with
  tokenless npm Trusted Publishing, attaching SLSA v1 provenance as an npm registry attestation;
  GitHub Releases now carry the signed provenance bundle (`.intoto.jsonl`) alongside the tarball and
  its SHA-256/SHA-512 checksums. No package behavior change.

### Security

- CVE-2026-59195: raised the pinned development pnpm toolchain to a version not affected by the
  `configDependencies` lockfile path traversal (fixed upstream in pnpm 10.34.4 and 11.8.0). The pin
  is development-only; consumers of the published package are not affected.

## [0.1.1] - 12026-06-16

### Changed

- Published package name changed from unscoped `vers-js` to scoped `@windlass/vers-js` after npm
  registry name-similarity rejection.

## [0.1.0] - 12026-06-13

### Added

- Initial release of `vers-js` as a runtime-agnostic TypeScript library for canonical VERS syntax
  validation.
- Public root exports for `parseVers()`, `validateVers()`, and `canonicalizeVers()`.
- Structured Result values for successful parses, validation results, canonical strings, and
  machine-readable diagnostics.
- Strict canonical parsing behavior with no repair, coercion, warning, or recovery modes.
- Parsed declaration metadata for VERS ranges and constraints while preserving constraint order.
- Single-pass percent-decoding, deterministic canonical serialization, and bounded
  diagnostic/resource behavior.
- Official VERS canonical parse fixture coverage, project diagnostic fixtures, package-boundary
  checks, and runtime smoke tests for Node.js, Deno, and Bun.
- ESM-only, root-only package publishing with named exports and no runtime dependencies.

[Unreleased]: https://github.com/windlasstech/vers-js/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/windlasstech/vers-js/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/windlasstech/vers-js/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/windlasstech/vers-js/releases/tag/v0.1.0
