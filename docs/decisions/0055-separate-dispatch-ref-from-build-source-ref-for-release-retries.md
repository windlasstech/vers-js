---
parent: Decisions
nav_order: 55
status: accepted
date: 12026-11-01
decision-makers: Yunseo Kim
relations:
  - type: partially-supersedes
    target: ADR-0054
    scope:
      "the manual-rerun dispatch coupling for release retries: the requirement that a manual
      workflow_dispatch run on the release tag ref itself and that release_tag match the selected
      ref, including the corresponding dispatch-from-tag confirmation clause; builder selection,
      full-SHA pinning, tokenless publication, provenance distribution, the blank-environment model,
      reserved-input handling, and publish convergence remain in force"
  - type: see-also
    target: ADR-0051
---

# Separate Dispatch Ref from Build Source Ref for Release Retries

## Context and Problem Statement

ADR-0051 establishes maintainer-created signed annotated tags as the release source and trigger for
hosted publication. ADR-0054 selects the Windlass slsa-builder reusable workflow as the provenance
producer and preserves the `verify` to `publish` to `release` dependency order.

ADR-0054 originally coupled manual retries to the release tag ref. Its manual-rerun rule requires
dispatch from the release tag itself and requires the `release_tag` input to match that selected
ref. This same-tag model gives the invocation and the build one obvious source identity, but it also
makes the tagged revision supply the workflow definition used for the retry.

That coupling blocks an important failure-recovery case. If the release pipeline is broken, for
example because a caller or builder integration defect is fixed after the signed tag was pushed, a
retry dispatched from the old tag can reuse the broken pipeline. Repairing the pipeline on `main`
does not help while the retry must run from the tag. Moving or recreating the tag would undermine
the immutable signed release source and is not an acceptable routine recovery mechanism.

This failure mode already occurred in production. The first live npm dogfood of slsa-builder,
conducted by integrating the builder into this project's build and release workflow, failed exactly
this way: [run 31622651874](https://github.com/windlasstech/vers-js/actions/runs/31622651874) for
the signed `v0.1.2` tag failed on a settings-only pnpm workspace classification defect, as reported
in [slsa-builder issue #81](https://github.com/windlasstech/slsa-builder/issues/81). The dogfood
exercised the new builder-driven release path; the packaged `vers-js` library and its runtime
behavior were unchanged. The fix reached callers as a re-pinned reusable workflow reference on the
caller's `main` branch, but the release tag still carried the old caller workflow file with the old
pin, and the builder's runtime guards rejected a dispatch from `main` because the invocation ref was
not the version tag. The only in-contract recovery was deleting and recreating the signed tag, which
requires temporarily relaxing tag-protection rulesets and conflicts with the organization's
tag-immutability posture.

The upstream builder has since decided this scenario at the foundation level.
[slsa-builder ADR-0079](https://github.com/windlasstech/slsa-builder/blob/main/docs/decisions/0079-support-tags-only-caller-specified-build-source-ref-for-release-retries-across-profiles.md)
(accepted 12026-08-13) partially supersedes that project's ADR-0032 invocation-ref requirement for
manual dispatch and gives every producer profile one optional `source-ref` input with tags-only
semantics: when omitted, the invocation ref remains the built ref and existing tag-push and
tag-dispatch behavior is unchanged; when supplied, it must be a full `refs/tags/<tag-name>` ref
naming an existing tag that satisfies the profile's release tag convention
(`v${package.json version}` for npm), it must resolve to a commit with fail-closed handling before
install, pack, signing, or publish, and a conflicting value on a tag-triggered run fails before
build. With `source-ref` supplied, the builder's runtime guards evaluate the built ref rather than
the invocation ref, and no profile ever creates, moves, signs, or deletes tags.

ADR-0079 also records the platform facts this caller-side proposal relies on: `workflow_dispatch`
executes the workflow file at the selected ref; the OIDC `ref` and `sha` claims, embedded in the
Fulcio certificate as the Source Repository Ref and Source Repository Digest extensions, are
platform-issued invocation-context values the signer cannot override; and `actions/checkout` can
build a caller-named ref independent of the run's ref, a separation this project's previous
hand-rolled pipeline already used in production for the `v0.1.1` publish. Under the SLSA v1
provenance model, ADR-0079 classifies a caller-selected source ref as an externally controlled input
recorded in signed `externalParameters`, with the resolved immutable commit recorded in
`resolvedDependencies`. ADR-0079 deferred the exact representation of the built-versus-invocation
identity split in the verification policy to a follow-up binding-model ADR, and that follow-up
landed as
[slsa-builder ADR-0080](https://github.com/windlasstech/slsa-builder/blob/main/docs/decisions/0080-bind-source-identity-policy-to-signed-provenance-fields-and-treat-certificate-source-claims-as-invocation-context.md)
(accepted 12026-08-13): source identity policy binds to the signed provenance fields, and the
certificate source claims serve as invocation context bound to a signed invocation record. This
proposal aligns the caller-side release record with those accepted builder contracts.

How can a retry use repaired pipeline code without changing the signed source that is verified,
built, and attested, and without weakening repository, provenance, or publication safeguards?

## Decision Drivers

- A broken release pipeline must be repairable through the normal change process and retried without
  moving, deleting, or recreating the signed release tag.
- The dispatch ref may select repaired workflow code, but it must not select an arbitrary source
  revision for the package build.
- The built source must remain the commit resolved from the existing release tag in the expected
  repository.
- Signed provenance must distinguish the builder-attested source identity from the certificate-bound
  workflow invocation identity.
- Manual retries must not require the invocation revision and built tag commit to be identical.
- Release source selection must accept full tag refs only for an explicit source ref, rejecting
  branches, pull request refs, and arbitrary commit SHAs.
- The pre-existing fail-closed release validation must keep applying to the tagged content selected
  for the build, not to the dispatch ref.
- The full-SHA builder pin, expected repository identity, tokenless publication model, job
  dependency ordering, and four-state publish convergence behavior must remain intact.
- The split must be documented honestly about which identity each piece of evidence proves, without
  overstating what any caller-side consistency check establishes.
- The release process must not gain a branch-push trigger or workflow-driven tag mutation authority.

## Considered Options

- Split the dispatch ref from the build source ref, with tags-only source selection
- Keep manual retries dispatched from the release tag only
- Allow an unconstrained builder source ref for retries

## Decision Outcome

Chosen option: "Split the dispatch ref from the build source ref, with tags-only source selection",
because it permits repaired pipeline code to retry a release while preserving the signed tag commit
as the sole package build source.

### Trigger and ref-selection model

The publish workflow has exactly two release entry points:

1. a push of a matching release tag; or
2. a manual `workflow_dispatch` with a required caller input named `release_tag`.

A branch push must not trigger the release workflow. Manual dispatch may select a repaired dispatch
ref, normally `main`, to obtain the repaired workflow definition and caller code. That dispatch ref
does not select the source to verify, build, or publish.

The caller's `release_tag` input uses an underscore and names the existing release tag, for example
`v0.1.2`. It is not the reusable builder's reserved `release-tag` input, which uses a hyphen: that
input is a release-asset distribution control, not a build-source selector, so it cannot substitute
for `source-ref`. This proposal leaves the builder's release-asset inputs unset because
release-asset mode is outside its scope; adopting that mode later remains possible and is not
prejudged here.

Ref selection follows these rules:

- On manual dispatch, the caller `verify` job checks out `release_tag`, not the dispatch ref, and
  performs its release checks on that tagged content.
- On manual dispatch, the caller passes exactly `refs/tags/<release_tag>` as the builder's
  `source-ref` input.
- On a tag push, the caller passes the exact empty string `""` as `source-ref`, preserving the
  builder's existing default byte-compatible tag-build behavior. It must not substitute the dispatch
  input, a short tag name, or another ref on this path.
- For every nonempty explicit source selector, the builder accepts only a full tag ref. It rejects
  branch refs, pull request refs, arbitrary SHAs, short tag refs, and other ref forms.
- For the manual full-tag path, the builder resolves `refs/tags/<release_tag>`, peels the annotated
  tag to its commit, and checks out that resolved commit before building. Resolution failure fails
  closed.

An existing signed annotated release tag, created and verified by an authorized maintainer under
ADR-0051, is a prerequisite for both entry points. The workflow must not create, move, delete, or
recreate a release tag. A manual retry reuses the existing tag and never converts a pipeline retry
into a new source-release decision.

Tag existence, successful tag resolution or peeling, and `gh release create --verify-tag` do not
prove that the tag has a valid signature or that an authorized signer created it. Those checks must
not be described as signature authorization proof, and they do not replace the maintainer-signed-tag
prerequisite.

### Validation and job ordering under the split

Under the split, the caller's release validation runs against the tagged content that `release_tag`
selects, so the validation target follows the build source rather than the dispatch ref. The
validation rules themselves are not re-decided here: the existing tag existence and tag,
`package.json`, and `CHANGELOG.md` version agreement checks, their fail-closed enforcement before
any externally visible npm publication or GitHub Release creation, and the `verify` to `publish` to
`release` dependency order that ADR-0054 preserves all continue unchanged, as the current release
workflow and runbook already implement them.

### Provenance identity model

Splitting the refs makes two identities distinct, and this decision requires reviewers and release
tooling not to conflate them: the invocation ref, which may carry repaired workflow code, and the
built tag commit, whose content the package is built from. The full-SHA builder pin and the expected
`windlasstech/vers-js` repository and Trusted Publisher identity remain unchanged.

How those identities are bound in signed provenance is not decided here. That binding model is
decided builder-side by slsa-builder ADR-0080: release-policy source expectations bind to the signed
provenance fields, the resolved commit appears in `resolvedDependencies`, and the certificate's
source claims serve as invocation context cross-checked against a signed invocation record. This
proposal relies on that accepted builder contract; it defines no vers-js-specific verification
policy.

Relying on that model carries an honest cost that this decision acknowledges: the built-source
identity is builder-attested rather than platform-claim-bound, so a verifier must trust the pinned
builder to resolve, check out, and report the tag commit correctly, while the Fulcio-backed
certificate directly supports only the invocation identity.

How this project's caller-side provenance consistency checks and consumer verification guidance
should align with the two-identity model, including the precise role and limits of payload
inspection, is a sibling question deferred to a follow-up decision. The existing checks continue
unchanged in the meantime.

### Publication convergence and scope limits

The publish convergence behavior decided by ADR-0054, including the same-run idempotent retry, the
`foreign-conflict` fail-closed state, and the zero-mutation handling of indeterminate registry
read-back, remains unchanged and is not re-specified here. Splitting the refs does not add a
recovery path that republishes an immutable npm version or creates a GitHub Release after a failed
publish prerequisite.

This decision partially supersedes only the ADR-0054 manual-rerun dispatch coupling at lines 91-93
and the corresponding dispatch-from-tag portion of the confirmation bullet at lines 123-124. Every
other ADR-0054 decision remains unchanged, including builder selection, full-SHA pinning, tokenless
publication, provenance distribution, the blank-environment model, reserved-input handling, and
publish convergence.

This decision does not redesign pnpm and builder compatibility, including the existing npm
`--provenance-file` publication path, and does not redesign GitHub protected environments. It does
not specify this project's provenance verification policy: the existing caller-side consistency
checks continue unchanged, and their alignment with the builder's two-identity binding model is
deferred to a follow-up decision. It makes no claim of current or historical SLSA conformance.

### Consequences

- Good, because a release retry can use repaired workflow code from `main` while building the
  original signed tag commit.
- Good, because retry recovery no longer creates pressure to move or recreate a signed release tag.
- Good, because full-tag-only source selection prevents a manual retry from substituting a branch,
  pull request, or arbitrary SHA as the package source.
- Good, because separate built-source and invocation identities describe the retry honestly without
  requiring two different commits to be equal.
- Good, because the builder pin, repository binding, dependency order, and four publish convergence
  states remain intact.
- Neutral, because the dispatch ref and built tag commit may legitimately differ, so reviewers and
  verification tooling must treat them as separate identities.
- Bad, because source correctness now relies explicitly on builder attestation as well as the
  certificate-bound invocation identity, adding a builder-attested trust cost.
- Bad, because two ref roles and two similarly named inputs, caller `release_tag` and reserved
  builder `release-tag`, require careful implementation and documentation to prevent confusion.
- Bad, because local consistency checks can be mistaken for cryptographic verification unless their
  limited role is stated and maintained.

### Confirmation

Compliance is confirmed prospectively through architecture, workflow, and recovery reviews showing
that:

- only matching tag pushes and manual `workflow_dispatch` can start the release path, and no branch
  push or workflow step can create, move, delete, or recreate a release tag;
- a manual retry can run repaired caller code from a dispatch ref other than the tag while the
  caller `verify` job checks out `release_tag`;
- manual dispatch passes exactly `refs/tags/<release_tag>` as `source-ref`, tag push passes exactly
  `""`, and the builder's release-asset distribution inputs, including `release-tag`, remain unset
  because this decision does not adopt release-asset mode;
- the builder resolves, peels, and checks out the full tag ref's commit, rejects branches, pull
  request refs, short refs, and arbitrary SHAs, and fails closed when resolution fails;
- the pre-existing release validation and the `verify` to `publish` to `release` dependency order
  are unchanged, with validation running against the `release_tag` content rather than the dispatch
  ref;
- signed annotated tag creation and maintainer verification remain prerequisites, and neither tag
  existence, peeling, nor `gh --verify-tag` is presented as signature authorization proof;
- the invocation ref and the built tag commit are treated as distinct identities, and no caller-side
  gate requires them to be equal;
- the full-SHA builder pin and the expected repository identity remain unchanged;
- the publish convergence behavior remains as ADR-0054 decided, including `foreign-conflict` and
  zero-mutation indeterminate read-back;
- this decision introduces no vers-js-specific provenance verification policy, and no existing
  caller-side consistency check is re-scoped or re-described as cryptographic verification; and
- retry documentation explains how to repair the pipeline through the normal change process,
  dispatch with the existing `release_tag`, and avoid any tag mutation or unconstrained source
  override.

## Pros and Cons of the Options

### Split the dispatch ref from the build source ref, with tags-only source selection

This option lets the dispatch ref supply repaired workflow code while the caller and builder
independently select the existing release tag as the verification and build source.

- Good, because it repairs the retry path without changing signed source history.
- Good, because the tag commit remains bound to source provenance and the invocation remains bound
  to its own certificate identity.
- Good, because tags-only source selection preserves a narrow release trust boundary.
- Good, because it preserves existing publication ordering and convergence behavior.
- Bad, because provenance consumers must understand separate source and invocation identities.
- Bad, because the builder must be trusted to attest the resolved built source correctly.
- Bad, because exact input and ref handling requires additional guards and review.

### Keep manual retries dispatched from the release tag only

This option preserves ADR-0054's original same-tag model for both the workflow invocation and build
source.

- Good, because the invocation ref and built source ref stay simple and normally identical.
- Good, because it avoids a separate builder-attested source and invocation split on retries.
- Bad, because a broken pipeline captured by the tag can remain broken on every permitted retry.
- Bad, because applying a pipeline fix through the normal branch and merge process does not produce
  a usable retry path.
- Bad, because operational pressure to move or recreate the signed tag increases, conflicting with
  release-source immutability.

### Allow an unconstrained builder source ref for retries

This option lets a manual retry choose any branch, pull request ref, tag, or arbitrary commit SHA as
the builder source independently of the release tag.

- Good, because it offers maximum flexibility during an emergency.
- Bad, because the release tag can name one source revision while the package is built from another.
- Bad, because branch or pull request content can bypass the maintainer-signed release-source
  prerequisite.
- Bad, because tag, package, changelog, provenance, and invocation identities become harder to bind
  and audit.
- Bad, because it expands the retry mechanism into arbitrary source publication authority.

## More Information

- [ADR-0051: Use Signed Tags and npm Trusted Publishing for Releases](0051-use-signed-tags-and-npm-trusted-publishing-for-releases.md)
  defines the signed-tag and hosted-publication trust boundary retained by this proposal.
- [ADR-0054: Use slsa-builder as the Release Provenance Producer](0054-use-slsa-builder-as-release-provenance-producer.md)
  remains authoritative except for the manual-rerun coupling at lines 91-93 and the corresponding
  dispatch-from-tag confirmation text at lines 123-124.
- [slsa-builder ADR-0079: Support a Tags-Only Caller-Specified Build Source Ref for Release Retries Across Profiles](https://github.com/windlasstech/slsa-builder/blob/main/docs/decisions/0079-support-tags-only-caller-specified-build-source-ref-for-release-retries-across-profiles.md)
  (accepted 12026-08-13) decides the builder-side contract this caller decision relies on: the
  optional tags-only `source-ref` input, built-ref runtime guards, and fail-closed tag resolution.
  It also documents the motivating `v0.1.2` dogfood failure of the slsa-builder integration in this
  project's release workflow. As a record of the external slsa-builder project, it is a reference
  here, not a frontmatter relations target.
- [slsa-builder ADR-0080: Bind Source Identity Policy to Signed Provenance Fields and Treat Certificate Source Claims as Invocation Context](https://github.com/windlasstech/slsa-builder/blob/main/docs/decisions/0080-bind-source-identity-policy-to-signed-provenance-fields-and-treat-certificate-source-claims-as-invocation-context.md)
  (accepted 12026-08-13) is the follow-up binding-model decision that ADR-0079 deferred to: it binds
  release-policy source expectations (repository, release tag ref, and commit SHA) to the signed
  provenance fields and treats the certificate source claims as invocation context bound to a signed
  invocation record, partially superseding that project's ADR-0068 certificate source-claim
  equality. It likewise is an external project record, not a frontmatter relations target.
- `.github/workflows/publish.yml` contains the caller workflow whose ref handling and mutation gates
  are to be reviewed against this proposal.
- [Release Process](../release.md) is the operational runbook for signed tag preparation, retries,
  provenance distribution, and failure recovery.
- Investigated but undecided: aligning this project's caller-side provenance consistency checks and
  consumer verification guidance with the builder's two-identity binding model (slsa-builder
  ADR-0080), including the precise role and limits of payload inspection, is a candidate for a
  follow-up ADR. This proposal deliberately does not decide it.
- Investigated but undecided: adopting the builder's release-asset distribution mode, which would
  use the reserved `release-tag` input for its intended purpose, is a separate future decision that
  this proposal neither makes nor precludes.
- This proposal addresses ref selection only. It does not claim a successful release, current or
  historical SLSA conformance, or cryptographic verification by caller-side payload inspection.
