# WRB04 — Shared Execution Kernel and Workspaces

**Backend/runtime first pass:** accepted through WRB04-05  
**Reviewed shared-Workspace checkpoint:** `2a1f7c0c526761b8a7b71b788c4980a5f1f389aa`  
**Status:** REPAIR01 RELEASED / WRB04-06 BLOCKED

## Sole active execution path

Read:

1. `Repair01/CODE_REVIEW_AND_RCA_2026-09-28.md`
2. `Repair01/README.md`
3. the current Repair Card only

Do not implement `WRB04-06_shared_workspaces_qualification.md` directly.

Do not create another WRB04 repair sequence unless Architect review explicitly does so.

## Repair01 sequence

1. `Repair01/WRB04-R01-01_restore_architect_work_item_planning_and_decomposition.md`
2. `Repair01/WRB04-R01-02_complete_human_criterion_evidence_actions.md`
3. `Repair01/WRB04-R01-03_complete_exact_phase_validation_and_close.md`
4. `Repair01/WRB04-R01-04_wire_exact_runtime_interaction_controls.md`
5. `Repair01/WRB04-R01-05_requalify_and_close_wrb04.md`

## Why Repair01 exists

The shared backend/runtime is substantially correct, but the first shared execution Workspace was qualified without a complete state/action coverage matrix.

Confirmed defects include:

- missing Architect WorkItem planning/elaboration;
- no product path for typed WorkItem decomposition;
- exact Implementer contract hard-codes empty affected paths/generic proof intent;
- exact Implementer contract omits accepted-solution completion Criteria;
- no human visual/Operator Criterion action path;
- Operator Criterion disposition is owner-wide rather than Criterion-specific;
- no exact Phase validation path;
- missing exact Implementer/Tester interaction controls;
- UI-level use of global runtime `busy` reserializes concurrent exact execution;
- restart/reopen qualification did not cover the complete execution state machine.

The RCA owns the complete evidence and root-cause hierarchy.

## Historical material

Completed and failed-review WRB04 cards/reports are stored under:

`docs/implementation-bundles/workflow-runtime-rebaseline/history/WRB04/`

Do not use historical artifacts as current implementation instructions.

## Completion rule

After WRB04-R01-05 checkpoints, STOP for final Architect review.

WRB05 remains unauthorized until WRB04 receives final Architect acceptance.
