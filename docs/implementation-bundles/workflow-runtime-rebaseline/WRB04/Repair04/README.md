# WRB04 Repair04 — Checkpoint Recovery and Final Qualification

**Parent bundle:** WRB04 — Shared Execution Kernel and Workspaces  
**Authoritative starting baseline:** `8a6a9ab065cb94d13d1f774cdfa8a62f6bc82b62`  
**Implementer:** GPT 6.0 Luna Medium  
**Status:** RELEASED

## Read first

1. `CODE_REVIEW_AND_RCA_2026-09-28.md`
2. this README
3. the current Repair04 card only
4. the prior Repair04 report explicitly required by that card

## Execute the full released sequence

Execute these cards sequentially without waiting for Architect review between passing cards:

1. `WRB04-R04-01_expose_durable_structured_checkpoint_recovery.md`
2. `WRB04-R04-02_fence_source_neutral_deterministic_and_fix_runtime_failure_presentation.md`
3. `WRB04-R04-03_final_qualification_and_closeout.md`

For each card:

1. verify the required prior checkpoint/report;
2. implement only that card;
3. run the focused validation;
4. write one Implementer Report;
5. create exactly one attributable checkpoint commit;
6. verify repository state;
7. immediately proceed to the next released card.

**Do not stop after R04-01 or R04-02 merely for Architect review.**

Stop early only for:

- a genuine architecture contradiction;
- repository state inconsistent with the required prior checkpoint;
- a destructive/unapproved external action;
- an unresolvable blocker inside the current card.

After R04-03 checkpoints, STOP for human Architect review.

Do not begin WRB05.

## Reports

Write:

`Reports/<REPAIR_ID>_IMPLEMENTER_REPORT.md`

R04-03 writes:

`Reports/WRB04-R04-03_FINAL_QUALIFICATION_REPORT.md`

## Historical status

Repair03 remains the implementation baseline being corrected.

Do not rewrite Repair03 reports/cards.

Earlier repair bundles remain historical evidence.
