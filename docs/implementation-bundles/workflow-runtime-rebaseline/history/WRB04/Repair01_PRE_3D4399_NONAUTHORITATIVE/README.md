# WRB04 Repair01 — Shared Execution Workspace Completion

**Parent bundle:** WRB04 — Shared Execution Kernel and Workspaces  
**Blocked parent card:** WRB04-06  
**Reviewed product checkpoint:** `2a1f7c0c526761b8a7b71b788c4980a5f1f389aa`  
**Architect review checkpoint:** `2a8181e0aa5c8644431d371135caf96e5d416ed6`  
**Implementer:** GPT 6.0 Luna Medium  
**Status:** RELEASED

## Read first

1. `CODE_REVIEW_AND_RCA_2026-09-28.md`
2. this README
3. the current Repair Card only
4. only the dependency report explicitly named by that card

Do not preload later Repair Cards.

The failed/submitted qualification evidence remains under:

`../Reports/WRB04-06_SUBMITTED_QUALIFICATION_2026-09-28.md`

Do not rewrite it as passing evidence.

## Repair sequence

1. **WRB04-R01-01 — Restore Architect WorkItem Planning and Typed Decomposition**
2. **WRB04-R01-02 — Complete Human Criterion Evidence Actions**
3. **WRB04-R01-03 — Complete Exact Phase Validation and Close**
4. **WRB04-R01-04 — Wire Exact Implementer and Tester Interaction Controls**
5. **WRB04-R01-05 — Requalify Shared Execution and Close WRB04**

## Execution rule

For each Repair Card:

1. verify the prior required checkpoint/report;
2. implement only that Repair Card;
3. run its focused validation;
4. write one Implementer Report;
5. create exactly one attributable checkpoint commit;
6. verify repository state;
7. then read the next card.

If a true material architecture contradiction is found, stop and return it to the Architect.

Do not respond to an ordinary implementation defect by splitting the card again.

## Frozen accepted architecture

Repair01 must preserve the accepted WRB04 runtime unless a card explicitly changes the affected boundary.

Do not redesign:

- exact Workflow/WorkItem identity;
- source-backed/source-neutral execution;
- Implementer/Tester/Validator role separation;
- checkout concurrency/leases;
- canonical Repair mechanics;
- typed WorkItem/Workflow completion;
- exact Workflow integration;
- linked-Dev candidate mechanics;
- Integration Repair;
- WIR routing-only ownership;
- direct and routed target convergence.

## Repair Reports

Write reports under:

`Reports/<REPAIR_ID>_IMPLEMENTER_REPORT.md`

R01-05 writes:

`Reports/WRB04-R01-05_FINAL_QUALIFICATION_REPORT.md`

## Stop rule

After R01-05 checkpoints, STOP for final Architect review.

Do not begin WRB05.
