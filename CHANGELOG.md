# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 12026-06-16

### Changed

- Published package name changed from unscoped `vers-js` to scoped
  `@windlass/vers-js` after npm registry name-similarity rejection.
- Required pnpm version in `devEngines` raised from `11.5.2` to `11.7.0`.

## [0.1.0] - 12026-06-13

### Added

- Initial release of `vers-js` as a runtime-agnostic TypeScript library for
  canonical VERS syntax validation.
- Public root exports for `parseVers()`, `validateVers()`, and
  `canonicalizeVers()`.
- Structured Result values for successful parses, validation results,
  canonical strings, and machine-readable diagnostics.
- Strict canonical parsing behavior with no repair, coercion, warning, or
  recovery modes.
- Parsed declaration metadata for VERS ranges and constraints while preserving
  constraint order.
- Single-pass percent-decoding, deterministic canonical serialization, and
  bounded diagnostic/resource behavior.
- Official VERS canonical parse fixture coverage, project diagnostic fixtures,
  package-boundary checks, and runtime smoke tests for Node.js, Deno, and Bun.
- ESM-only, root-only package publishing with named exports and no runtime
  dependencies.

[Unreleased]: https://github.com/windlasstech/vers-js/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/windlasstech/vers-js/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/windlasstech/vers-js/releases/tag/v0.1.0
