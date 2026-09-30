# WRB04 Repair03 — Final State-Machine Corrections

**Parent bundle:** WRB04 — Shared Execution Kernel and Workspaces  
**Authoritative starting baseline:** `5585d0354fcc68a09ca2562731af6ee7668cc376`  
**Implementer:** GPT 6.0 Luna Medium  
**Status:** RELEASED

## Read first

1. `CODE_REVIEW_AND_RCA_2026-09-28.md`
2. this README
3. the current Repair Card only
4. the prior Repair report explicitly named by that card

## Execute the full released sequence

Execute these cards sequentially without waiting for Architect review between passing cards:

1. `WRB04-R03-01_repair_work_item_planning_ux_and_scope_recovery.md`
2. `WRB04-R03-02_correct_source_backed_evidence_lineage_and_completion.md`
3. `WRB04-R03-03_make_repairs_executable_across_source_modes.md`
4. `WRB04-R03-04_requalify_and_close_wrb04.md`

For each card:

1. verify the required prior checkpoint/report;
2. implement only that card;
3. run its focused validation;
4. write one Implementer Report;
5. create exactly one attributable checkpoint commit;
6. verify repository state;
7. immediately proceed to the next released card.

**Do not stop after R03-01, R03-02, or R03-03 merely for Architect review.**

Stop early only for:
- a genuine architecture contradiction;
- repository state inconsistent with the required prior checkpoint;
- a destructive/unapproved external action;
- an unresolvable blocker inside the current card.

After R03-04 checkpoints, STOP for human Architect review.

Do not begin WRB05.

## Reports

Write:

`Reports/<REPAIR_ID>_IMPLEMENTER_REPORT.md`

R03-04 writes:

`Reports/WRB04-R03-04_FINAL_QUALIFICATION_REPORT.md`

## Historical status

Repair02 remains the implemented baseline being corrected. Do not rewrite its reports/cards.

Earlier Repair01 is non-authoritative historical material.
