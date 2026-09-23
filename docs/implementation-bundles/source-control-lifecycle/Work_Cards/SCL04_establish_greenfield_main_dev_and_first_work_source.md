# SCL04 — Establish Greenfield `main`, `dev`, and First Work Source

**Depends on:** SCL03  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL04_IMPLEMENTER_REPORT.md`

## Objective

Give a new Git-backed ChampCity Project a deterministic source topology: stable `main`, integration `dev`, and a first Work Intake SourceLine from `dev`.

## Required Changes

1. Add a semantic repository-bootstrap operation to the RepositoryService boundary.
2. For an empty/new supported repository, establish one deterministic initial SourceRevision on `main`.
3. Create `dev` from that exact revision.
4. Create the first Work Intake SourceLine from the exact `dev` revision.
5. Persist Project/Work Intake/source-preparation identities and receipts.
6. Make retry safe across partial bootstrap states.

## Constraints

- First implementation work must not occur directly on `main` or `dev`.
- Do not require a remote.
- Do not make Git initialization vocabulary part of workflow-facing contracts.
- Do not create product worktree orchestration.

## Acceptance Criteria

- New Project topology is `main → dev → work-intake/<id>`.
- Exact initial/base revisions are recorded.
- Partial failure is retryable without duplicating or overwriting incompatible refs.
- Existing-project flow from SCL03 remains unchanged.

## Validation

Isolated temporary-repository bootstrap fixtures plus planner work-item validation.

## Post-Implementation

Report + checkpoint commit; continue to SCL05.
