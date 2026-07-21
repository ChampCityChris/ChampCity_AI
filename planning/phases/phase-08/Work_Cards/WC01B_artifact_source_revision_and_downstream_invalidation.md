# Work Card — Phase 08 WC01B Artifact Source Revision and Downstream Invalidation

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: high
Depends on: WC01A
Execution authorization: withheld
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC01B_artifact_source_revision_and_downstream_invalidation.md`

## Purpose

Implement monotonic artifact revision identity, source-revision references, freshness evaluation, and coordinated downstream invalidation so stale approved documents cannot remain current after an authoritative source changes.

## Source Designs

- `planning/project/Design_Documents/ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`
- `planning/project/Design_Documents/EVIDENCE_DERIVED_LIFECYCLE_PROJECTION_AND_WORKSPACE_RESOLUTION.md`
- `planning/project/Design_Documents/GENERATED_ARCHITECT_HANDOFF_CONTRACT.md`

## Required Implementation

Implement:

- positive integer `artifactRevision` in synchronized Markdown/JSON pairs;
- source-revision references using repository-relative paths and revision integers;
- revision increment on substantive content or source-set changes, not disposition-only changes;
- freshness states and plain-language stale-source diagnostics;
- coordinated reset of supported downstream review documents to `Pending` when an approved source is revised;
- all-or-nothing invalidation for Project and Phase planning bundles;
- regeneration of non-review handoffs after source changes;
- validation precedence after Formal Work Card, Implementer Report, or repair revisions;
- preservation of stale historical reports and validation attempts without treating them as current.

## Required Invalidation Coverage

At minimum cover the full chain from Project Intake through Project Close, including:

- Project Intake → Interview → Project Planning → Phase Map;
- Phase Interview → Phase Planning bundle → Work Card candidates;
- Work Card Plan → Formal Work Card and later evidence;
- Formal Work Card → Implementer Report, repairs, Validation Records;
- implementation or repair changes → prior validation becomes stale for close purposes.

## Failure Safety

Source revision and downstream invalidation must be staged as a bounded transaction. A partial invalidation may not be reported as success. When complete rollback is impossible, the source and affected documents must expose an explicit recoverable stale-state error.

## Explicit Non-Goals

Do not introduce hashes, timestamps as authority, Git commit references as source identity, hidden revision databases, execution runs, lifecycle UI, provider integration, or Git operations.

## Required Validation

```text
npm run typecheck
npm run build
npm test
```

Tests must cover each required invalidation chain, bundle atomicity, stale validation after repair, handoff regeneration, disposition-only changes, rollback, and resolver stale diagnostics.

## Acceptance Criteria

1. Current artifacts have monotonic integer revisions.
2. Generated downstream artifacts record source revisions.
3. Stale source relationships are detected deterministically.
4. Downstream approvals cannot remain current after source revision.
5. Planning bundle invalidation is coordinated.
6. Prior reports and validation attempts remain readable but non-current.
7. Passing validation is invalidated by later implementation changes.
8. Non-review handoffs regenerate and remain non-gating.
9. No hash, timestamp, Git, or hidden-state authority is added.
10. Typecheck, build, and tests pass.
11. No Git mutation occurs.

## Implementer Report Requirements

Record repository verification, changed files, revision and source-reference schemas, every invalidation edge, transaction behavior, stale diagnostics, validation precedence, validation results, and confirmation that no prohibited authority was introduced.

The report must end with `Document.Status=Pending`.

## Manual Validation After Architect Review

The Operator should revise controlled Project, Phase, Work Card, and repair sources and confirm that downstream work returns to the correct review workspace with an accurate stale-source explanation.

## Document Disposition

Document.Status=Approved
