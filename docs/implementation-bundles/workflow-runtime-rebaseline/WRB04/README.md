# WRB04 — Shared Execution Kernel and Workspaces

**Authoritative reviewed baseline:** `3d4399e563665afbd38426416d12a84989a51470`  
**Status:** REPAIR02 QUALIFICATION COMPLETE / AWAITING FINAL ARCHITECT ACCEPTANCE
**WRB05:** unauthorized until final WRB04 Architect acceptance

## Sole active execution path

Read:

1. `Repair02/CODE_REVIEW_AND_RCA_2026-09-28.md`
2. `Repair02/README.md`
3. the current Repair02 card only

The completed WRB04-06 implementation at `3d4399e563665afbd38426416d12a84989a51470` is the baseline being repaired.

Do not reinterpret or resume the old WRB04-06 card.

## Repair02 sequence

1. `Repair02/WRB04-R02-01_restore_architect_work_item_execution_contract.md`
2. `Repair02/WRB04-R02-02_correct_human_criterion_semantics.md`
3. `Repair02/WRB04-R02-03_correct_phase_validation_and_repair.md`
4. `Repair02/WRB04-R02-04_correct_exact_runtime_interaction_and_concurrency.md`
5. `Repair02/WRB04-R02-05_requalify_and_close_wrb04.md`

## Why Repair02 exists

The final WRB04-06 sweep found bounded correctness gaps in the completed shared Workspace:

- missing canonical Architect WorkItem execution planning;
- exact Implementer contract still uses empty affected paths/generic proof intent;
- accepted-solution completion Criteria are omitted from the Implementer contract;
- Operator Criterion decisions use owner-wide disposition and can inherit unrelated planning acceptance;
- human visual actions can record only pass;
- human action APIs accept derived source/implementation identity from renderer;
- source-neutral deterministic Phase validation can manufacture pass evidence;
- semantic Phase validation uses one member as aggregate evidence;
- failed Phase Criteria have no correction WorkItem path;
- WorkItem-owned deferred visual Criteria cannot complete correctly at the Phase boundary;
- free-text runtime questions are not answerable in the shared Workspace;
- global runtime `busy` reserializes exact runs at the UI.

The controlling RCA contains the evidence and repair boundaries.

## Historical material

The prior Repair01 package was authored before the completed `3d4399e5` baseline and is non-authoritative.

It is archived under:

`docs/implementation-bundles/workflow-runtime-rebaseline/history/WRB04/Repair01_PRE_3D4399_NONAUTHORITATIVE/`

Completed earlier WRB04 cards/reports remain under the WRB04 history tree.

R02-05 qualification is recorded in `Repair02/Reports/WRB04-R02-05_FINAL_QUALIFICATION_REPORT.md`. Architect acceptance remains outstanding; see the report for directly tested scenarios and remaining qualification limits.

## Completion rule

After WRB04-R02-05 checkpoints, STOP for final Architect review.

Do not begin WRB05.
