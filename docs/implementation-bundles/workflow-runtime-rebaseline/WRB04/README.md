# WRB04 — Shared Execution Kernel and Workspaces

**Authoritative implemented baseline:** `8a6a9ab065cb94d13d1f774cdfa8a62f6bc82b62`  
**Status:** REPAIR04 qualification complete / awaiting Architect acceptance
**WRB05:** unauthorized until final WRB04 Architect acceptance

## Sole active execution path

Read:

1. `Repair04/CODE_REVIEW_AND_RCA_2026-09-28.md`
2. `Repair04/README.md`
3. the current Repair04 card only

Repair03 remains the implemented baseline being corrected. Do not rewrite Repair03 reports/cards.

## Repair04 sequence

1. `Repair04/WRB04-R04-01_expose_durable_structured_checkpoint_recovery.md`
2. `Repair04/WRB04-R04-02_fence_source_neutral_deterministic_and_fix_runtime_failure_presentation.md`
3. `Repair04/WRB04-R04-03_final_qualification_and_closeout.md`

Execute R04-01 through R04-03 sequentially with one report/checkpoint per card.

Do not stop between passing R04-01/R04-02 cards merely for Architect review. Stop after R04-03 for human Architect review.

## Why Repair04 exists

Repair03 corrected its intended state-machine defects. Final Architect review found three remaining closure seams:

- retryable implementation and Tester structured checkpoint blocked/inspection states are not reachable from the Current Project product path after the model session ends;
- the shared runtime action helper can erase or misattribute returned unavailable/failed models;
- source-neutral canonical planning can still accept required deterministic Criteria even though the product has no source-neutral deterministic provider.

Repair03 final qualification also left source-backed deterministic Phase and source-backed Repair composed proof explicitly open. R04-03 owns those final qualifications.

The controlling RCA contains the exact evidence and boundaries.

## Completion rule

After WRB04-R04-03 checkpoints, STOP for final Architect review.

R04-03 qualification evidence and remaining proof limits are recorded in `Repair04/Reports/WRB04-R04-03_FINAL_QUALIFICATION_REPORT.md`. This status does not declare Architect acceptance.

Do not begin WRB05.
