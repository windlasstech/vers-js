---
parent: Decisions
nav_order: 49
status: accepted
date: 12026-06-11
decision-makers: Yunseo Kim
---

# Use devEngines.packageManager for pnpm Pinning

## Context and Problem Statement

ADR-0003 selects pnpm as the development package manager and requires a pinned
pnpm version for reproducible contributor and CI workflows. At the time, the ADR
named the top-level `packageManager` field as the pinning mechanism.

pnpm v11 deprecates the top-level `packageManager` field for this purpose in
favor of `devEngines.packageManager`. The repository already uses
`devEngines.packageManager`, and npm enforces that metadata by rejecting npm-based
commands in this package.

Should vers-js keep the older top-level `packageManager` wording or use
`devEngines.packageManager` as the package-manager pinning contract?

## Decision Drivers

- The repository should follow pnpm v11 metadata conventions.
- Contributor tooling should fail early when the wrong package manager is used.
- The package-manager pin must remain development metadata and must not affect the
  published runtime package boundary.
- Existing accepted ADR bodies should remain immutable; newer decisions should
  update earlier decisions through a new ADR.

## Considered Options

- Use `devEngines.packageManager` for pnpm pinning
- Keep top-level `packageManager`
- Use both fields

## Decision Outcome

Chosen option: "Use `devEngines.packageManager` for pnpm pinning", because it
matches pnpm v11 guidance and preserves the project goal of reproducible pnpm
development workflows.

The repository will pin pnpm through:

```json
{
  "devEngines": {
    "packageManager": {
      "name": "pnpm",
      "version": "11.5.2",
      "onFail": "download"
    }
  }
}
```

Documentation that previously said pnpm is pinned through top-level
`packageManager` should be interpreted as updated by this ADR. The project should
not add a duplicate top-level `packageManager` field unless a future pnpm or Node.js
tooling change requires it.

### Consequences

- Good, because package-manager metadata matches the current pnpm major version.
- Good, because npm and other non-pnpm commands fail early during development.
- Good, because ADR-0003's pnpm choice and lockfile/cooldown policy remain intact.
- Neutral, because contributors still need pnpm or a toolchain capable of honoring
  `devEngines.packageManager`.
- Bad, because older documentation and tooling examples that expect top-level
  `packageManager` need to be updated.

### Confirmation

Compliance with this decision is confirmed when architecture and implementation
reviews show that:

- `package.json` pins pnpm through `devEngines.packageManager`;
- documentation references `devEngines.packageManager` instead of top-level
  `packageManager` for pnpm v11 pinning;
- `pnpm-lock.yaml` remains committed when dependencies exist;
- pnpm dependency cooldown settings remain committed in `pnpm-workspace.yaml`;
- package scripts and published artifacts remain npm-compatible and do not rely on
  pnpm-specific runtime behavior.

## Pros and Cons of the Options

### Use devEngines.packageManager for pnpm pinning

This option uses the current pnpm v11 metadata shape already present in the
repository.

- Good, because it follows current pnpm package-manager metadata guidance.
- Good, because the package manager requirement is scoped to development engines.
- Good, because wrong package-manager usage fails before scripts run.

### Keep top-level packageManager

This option keeps the metadata field named in ADR-0003.

- Good, because it matches older Corepack-oriented examples.
- Bad, because it keeps deprecated pnpm v11 metadata in a greenfield repository.
- Bad, because it conflicts with the repository's current `package.json` shape.

### Use both fields

This option duplicates the pnpm version in both top-level `packageManager` and
`devEngines.packageManager`.

- Good, because it may satisfy older tools that only inspect top-level
  `packageManager`.
- Bad, because duplicate version pins can drift.
- Bad, because the project does not currently need the deprecated field.

## More Information

This decision updates ADR-0003's pinning mechanism only. It does not change the
selection of pnpm, the committed lockfile policy, frozen CI installs, dependency
cooldown settings, or npm-compatible package publication boundary.
