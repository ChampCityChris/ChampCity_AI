# WRB04 — Shared Execution Kernel and Workspaces

**Authoritative implemented baseline:** `5585d0354fcc68a09ca2562731af6ee7668cc376`  
**Status:** REPAIR03 RELEASED / WRB04 OPEN  
**WRB05:** unauthorized until final WRB04 Architect acceptance

## Sole active execution path

Read:

1. `Repair03/CODE_REVIEW_AND_RCA_2026-09-28.md`
2. `Repair03/README.md`
3. the current Repair03 card only

Repair02 remains the implemented baseline under review. Do not rewrite or reinterpret its cards/reports as new instructions.

## Repair03 sequence

1. `Repair03/WRB04-R03-01_repair_work_item_planning_ux_and_scope_recovery.md`
2. `Repair03/WRB04-R03-02_correct_source_backed_evidence_lineage_and_completion.md`
3. `Repair03/WRB04-R03-03_make_repairs_executable_across_source_modes.md`
4. `Repair03/WRB04-R03-04_requalify_and_close_wrb04.md`

Execute R03-01 through R03-04 sequentially with one report/checkpoint per card.

Do not stop between passing cards merely for Architect review. Stop after R03-04 for human Architect review.

## Why Repair03 exists

Repair02 corrected most of the post-WRB04-06 defects. Final code review found four remaining state-machine seams:

- out-of-scope source mutation leaves an implemented/validation-pending WorkItem with no legal replan/retry path;
- cumulative solution/Phase evidence incorrectly treats every source-backed TesterResult as needing the final source revision, and Workflow completion retroactively revalidates closed WorkItems/Phases against later revisions;
- source-neutral generated Repair WorkItems can receive deterministic Criteria that the production source-neutral Validator cannot satisfy;
- WorkItem planning still lacks the embedded Architect browser product path, and returned exact-runtime start refusals can be displayed as successful starts.

The controlling RCA contains the exact evidence and repair boundaries.

## Completion rule

After WRB04-R03-04 checkpoints, STOP for final Architect review.

Do not begin WRB05.
