# SCL03 — Create Existing-Project Work Sources from `dev`

**Depends on:** SCL02  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL03_IMPLEMENTER_REPORT.md`

## Objective

For an existing Git-backed Project, create each new Work Intake SourceLine from the exact current `dev` revision without switching or requiring cleanliness of the primary checkout.

## Required Changes

1. Resolve local `dev` to an exact immutable SourceRevision.
2. Atomically create the deterministic Work Intake SourceLine from that revision using ref-level mechanics.
3. Record `repositoryId`, target SourceLine, exact base revision, Work Intake SourceLine, and current revision in source-preparation state.
4. Do not call checkout-switching `prepareBranch()` for intake establishment.
5. Treat branch collision as an inspectable source-preparation failure unless exact ownership/idempotency proves it is the same operation.
6. Update WIR branch verification consumers so Work Intake ownership is not inferred from the process-selected current branch.

## Constraints

- Default integration target is `dev`; do not hard-code future provider semantics into shared contracts.
- No worktree provisioning.
- No checkout switch during Save.
- No remote requirement.

## Acceptance Criteria

- Dirty primary `dev` can coexist with creation of a second Work Intake branch from the committed `dev` ref.
- Primary branch/HEAD/files remain unchanged by SourceLine creation.
- Exact base revision is durable evidence.
- Retry is idempotent or fails with bounded ownership diagnostics.

## Validation

Focused Git fixture tests for dirty-primary branch creation and Work Intake binding verification plus planner work-item validation.

## Post-Implementation

Report + checkpoint commit; continue to SCL04.
