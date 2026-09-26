# WRB04 — Shared Execution Kernel and Workspaces

**Starting checkpoint:** `495c9aca43bd6c90be4abfece01ed9e40fd4c82e`  
**Implementer:** GPT 6.0 Luna Medium  
**Status:** IN PROGRESS — WRB04-01 complete; WRB04-02 revised/re-released after correct architectural stop.  
**Review cadence:** execute released cards sequentially; Architect review after WRB04-05.

## Outcome

Feature/Capability and Issue Resolution leave their bespoke WRB03 planning front halves at the same canonical Work Item Map and execute through one shared post-plan runtime.

WRB04 includes:
- exact Workflow/WorkItem execution ownership;
- lazy source materialization;
- Work Item planning/decomposition;
- Implementer execution + source checkpoints;
- first-class Tester regression-design and bounded Test Lifecycle Determination;
- independent Validator and canonical Repair loop;
- Phase/Workflow completion;
- exact-Workflow integration;
- linked-worktree/common-directory integration repair;
- Integration Repair;
- shared reusable execution Workspaces;
- retirement/fencing of Current Project route-owned/private Issue execution paths.

## Sequence

1. WRB04-01 — Establish exact-Workflow shared execution application kernel and lazy source boundary  
   **Complete:** `ae6eb789f829e2c7320827eb24767709cc458bcd`
2. WRB04-02 — Establish exact Workflow/WorkItem Implementer runtime, typed decomposition, and implementation checkpoints  
   **Revised/re-released:** see `WRB04-02_ARCHITECT_CLARIFICATION_2026-09-26.md`
3. WRB04-03 — Implement Tester/Determination, Validator, Repair loop, and typed completion
4. WRB04-04 — Normalize Phase/Workflow completion and exact-Workflow integration, including linked-worktree candidate repair
5. WRB04-05 — Converge shared execution Workspaces, fence legacy execution, and qualify Feature/Issue end-to-end

## WRB04-02 architectural stop

Luna correctly stopped before modifying files when it established that the current Codex runtime has no exact Workflow/WorkItem execution selector and only resolves legacy current-workspace Work Cards, routed Work Intake plans, or Issue Fix Cards.

That stop is classified as an Architect miss in the original WRB04-02 specification, not an Implementer defect.

The revised WRB04-02 defines the missing exact runtime selector/context/finalization boundary. WRB04-03 remains blocked until it completes.

## Execution rules

- Luna executes cards sequentially.
- Each completed card gets focused validation, an Implementer Report, and one attributable checkpoint commit.
- No intermediate Architect review unless an architectural contradiction cannot be bounded within the owning card.
- Do not preserve obsolete WorkIntake/Markdown execution authority for compatibility.
- Do not wrap the new exact path in `routed-development` or legacy Issue selectors.
- Do not weaken exact current Workflow ownership to satisfy stale repair fixtures.
- Do not turn Tester into an Operator approval gate.
- Do not run the entire historical suite repeatedly. Use focused validation and exact validation-plan previews under the lean-test policy.

After WRB04-05: STOP for human Architect review. Do not begin WRB05.
