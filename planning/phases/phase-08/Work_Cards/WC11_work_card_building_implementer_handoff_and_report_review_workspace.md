# Work Card — Phase 08 WC11 Work Card Building Implementer Handoff and Report Review Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: high
Depends on: WC10, WC03
Execution authorization: withheld
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC11_work_card_building_implementer_handoff_and_report_review_workspace.md`

## Purpose

Implement `work-card-building-review`, present the exact current Approved Formal Work Card as the Implementer instruction, detect the corresponding current Implementer Report, and record Architect review directly through that report's disposition.

## Controlling Designs

- `WORK_CARD_LIFECYCLE_REVIEW_REPAIR_AND_VALIDATION_WORKSPACE_DEFINITION.md`
- `PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`

## Workspace

```text
id: work-card-building-review
level: workCard
stage: building
order: 10
```

`work-card-repair` follows at order 20. Preserve the accepted WC03 browser-security contract when handing the report and repository evidence to the Architect.

## Implementer Handoff

The current Approved Formal Work Card pair is the sole authoritative Implementer instruction. Display its identity, path, current artifact revision, expected report path, and validation commands.

Do not create a second prompt, execution packet, release token, hash gate, or execution run.

## Implementer Report Pair

```text
planning/phases/<phase-id>/Implementer_Reports/IMPLEMENTER_REPORT_<work-card-id>_<slug>.md
planning/phases/<phase-id>/Implementer_Reports/IMPLEMENTER_REPORT_<work-card-id>_<slug>.json
```

The report begins Pending, references the exact parent Work Card path and revision, has its own artifact/source revision metadata, and records repository verification, files changed, implementation, validation results, acceptance evidence, deviations, blockers, and remaining Operator validation.

A mismatched or stale report cannot be reviewed as current.

## Architect Review

- `Approved`: current implementation is ready for Operator validation.
- `RevisionRequested`: a bounded pre-validation repair is required.
- `Rejected`: implementation/report cannot support continuation; parent remains unresolved.

The report itself is the durable Architect review target. No separate Architect Review approval artifact is created.

## Freshness

A Formal Work Card revision invalidates the report. A substantive report revision invalidates any later Validation Record that referenced an older report revision.

## Explicit Non-Goals

No direct Codex control, source execution, repair creation, Operator validation, Validation Record, Work Card close, hidden execution state, provider API, DOM automation, new dependency, or Git operation.

## Required Validation

```text
npm run typecheck
npm run build
npm test
```

Cover stable workspace ID/order, Approved-only handoff, report path/parent/revision validation, stale report handling, report dispositions, WC03 security regression, and no premature Validation Record.

## Acceptance Criteria

1. `work-card-building-review` exists at Work Card / Building order 10.
2. The exact current Approved Work Card is the handoff authority.
3. The current report path and parent revision are validated.
4. Stale or mismatched reports cannot advance.
5. Architect review is stored on the report pair.
6. Approved enables validation; RevisionRequested enables WC12.
7. No Validation Record or separate review artifact is created.
8. WC03 security remains intact.
9. Typecheck, build, and tests pass.
10. No Git mutation occurs.

## Implementer Report Requirements

Record repository verification, changed files, workspace ID/order, handoff and report contracts, source freshness, Architect review behavior, WC03 regression, and validation results. End with `Document.Status=Pending`.

## Manual Validation After Architect Review

The Operator should verify correct report matching, reject a stale report after a Work Card revision, and confirm Approved/RevisionRequested outcomes expose only the proper next action.

## Document Disposition

Document.Status=Approved
