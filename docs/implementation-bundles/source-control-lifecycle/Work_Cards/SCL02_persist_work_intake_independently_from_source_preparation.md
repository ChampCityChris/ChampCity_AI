# SCL02 — Persist Work Intake Independently from Source Preparation

**Depends on:** SCL01Z  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL02_IMPLEMENTER_REPORT.md`

## Verified Evidence

`getWorkIntakeProjection()` currently converts dirty primary-checkout state into `blockedReason`; `WorkIntakeWorkspace` disables Save from that value; `submitWorkIntake()` persists only inside `workIntakeBranchService.establish()`.

## Objective

Make Save Work Intake capture Operator intent first and represent source preparation as separate retryable application state.

## Required Changes

1. Persist Work Intake identity/content through canonical ProjectStateService `WorkIntake` state before source preparation.
2. Persist source preparation through canonical `SourceBinding` state as `unprepared | preparing | ready | blocked` with bounded diagnostic evidence.
3. Use the SCL01 RepositoryService semantic boundary for source operations and SCL01A–SCL01Z Project State for workflow authority.
4. Remove primary-checkout cleanliness from Save eligibility.
5. Preserve entered/saved Intake state when source preparation fails.
6. Keep repository Markdown as generated projection/export only; it is no longer an admission authority after SCL01Z.
7. Update UI projection/contracts so Save is disabled only by actual intake-form validity/busy state, not unrelated repository dirtiness.

## Constraints

- Do not implement branch creation policy beyond invoking the SCL01 semantic boundary.
- Do not silently mutate or clean the primary checkout.
- Do not introduce Electron-specific concepts into the semantic contracts.
- Do not create another V1 persistence adapter or dual-write Project State.

## Acceptance Criteria

- A dirty primary checkout cannot prevent Work Intake capture.
- Failed source preparation leaves a visible saved Intake with blocked/retryable source state.
- Reload restores the saved Intake/source state.
- Existing clean-repository submission behavior remains functionally available.

## Validation

Focused Work Intake persistence/projection/UI contract tests plus validation planner work-item profile.

## Post-Implementation

Report + checkpoint commit; continue to SCL03.
