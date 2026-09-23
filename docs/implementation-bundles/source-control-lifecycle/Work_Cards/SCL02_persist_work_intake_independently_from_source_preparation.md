# SCL02 — Persist Work Intake Independently from Source Preparation

**Depends on:** SCL01  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL02_IMPLEMENTER_REPORT.md`

## Verified Evidence

`getWorkIntakeProjection()` currently converts dirty primary-checkout state into `blockedReason`; `WorkIntakeWorkspace` disables Save from that value; `submitWorkIntake()` persists only inside `workIntakeBranchService.establish()`.

## Objective

Make Save Work Intake capture Operator intent first and represent source preparation as separate retryable application state.

## Required Changes

1. Add a bounded Work Intake semantic-state port and V1 host adapter consistent with existing application-state persistence patterns.
2. Persist Work Intake identity/content before source preparation.
3. Represent source preparation as `unprepared | preparing | ready | blocked` with bounded diagnostic evidence.
4. Remove primary-checkout cleanliness from Save eligibility.
5. Preserve entered/saved Intake state when source preparation fails.
6. Keep repository Markdown as a migration artifact/projection rather than the sole admission authority.
7. Update UI projection/contracts so Save is disabled only by actual intake-form validity/busy state, not unrelated repository dirtiness.

## Constraints

- Do not implement branch creation policy beyond invoking the SCL01 semantic boundary.
- Do not silently mutate or clean the primary checkout.
- Do not introduce Electron-specific concepts into the semantic contracts.

## Acceptance Criteria

- A dirty primary checkout cannot prevent Work Intake capture.
- Failed source preparation leaves a visible saved Intake with blocked/retryable source state.
- Reload restores the saved Intake/source state.
- Existing clean-repository submission behavior remains functionally available.

## Validation

Focused Work Intake persistence/projection/UI contract tests plus validation planner work-item profile.

## Post-Implementation

Report + checkpoint commit; continue to SCL03.
