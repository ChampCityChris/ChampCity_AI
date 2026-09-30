# SCL05 — Implement Deterministic Implementation and Disposition Checkpoint Service

**Depends on:** SCL03, SCL04  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL05_IMPLEMENTER_REPORT.md`

## Verified Evidence

Existing `workItemCheckpointService`, `lifecycleEvidenceCheckpointService`, and application checkpoint receipt formats already provide substantial source material.

## Objective

Unify machine-owned checkpoint creation behind one semantic service supporting ImplementationRevision and lifecycle/disposition revisions without agent-operated Git.

## Required Changes

1. Provide semantic operations for implementation and disposition checkpoints.
2. Verify expected Work Intake/SourceLine/current revision before mutation.
3. Calculate/stage only attributable paths for source checkpoints.
4. Generate deterministic commit subjects/messages/receipts from structured workflow identity.
5. Support evidenced lifecycle checkpoints when a workflow boundary requires chronology even if no source file changed.
6. Make retries idempotent by checkpoint identity/expected prior revision.
7. Record `pending | committed | blocked | inspection-required` outcomes.

## Constraints

- A commit is evidence, not product approval.
- No model-generated commit messages.
- No implicit stage-all.
- No reset/clean/stash recovery.

## Acceptance Criteria

- Completed implementation produces an exact immutable ImplementationRevision before review.
- Operator disposition can produce a deterministic lifecycle revision.
- Duplicate retry cannot double-commit the same checkpoint.
- Wrong SourceLine/revision fails visibly without destructive recovery.

## Validation

Focused checkpoint/receipt/source-attribution tests and planner work-item validation.

## Post-Implementation

Report + checkpoint commit; continue to SCL06.
