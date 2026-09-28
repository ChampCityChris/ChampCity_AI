# WRB04 — Shared Execution Kernel and Workspaces

**Implementer:** GPT 6.0 Luna Medium  
**Accepted runtime checkpoint:** `ff4c4a35a3d8b7196745e98062ad5ed0427b3355`  
**Current repository baseline before WRB04-04:** `78bdfa7b6c373d318e73428e2d7d28152ba46271`  
**Status:** WRB04-04 IN PROGRESS — partial implementation exists in the working tree and must be continued, not discarded.

## READ THIS FIRST

There is exactly one active card:

`WRB04-04_validation_repair_completion.md`

Do not open WRB04-05 or WRB04-06 until WRB04-04 is fully complete and committed.

Do not create a new repair card, lettered child card, clarification card, recovery card, or alternate execution sequence.

Historical WRB04 cards, prior reports, recovery documents, and superseded files have been moved out of this active directory to:

`docs/implementation-bundles/workflow-runtime-rebaseline/history/WRB04/`

Do not use that history as implementation instructions unless the Architect explicitly directs you to inspect a specific historical artifact.

## Current working-tree state

WRB04-04 has a valid partial implementation already present.

Its current progress report is:

`Reports/WRB04-04_PROGRESS_2026-09-27.md`

That report is a progress record, not completion.

Preserve the current partial code and continue the same card.

Architect review of the partial work identified three corrections that are part of WRB04-04 scope:

1. Phase completion eligibility must be exact-Workflow scoped; the Current Project path must not rely on project-wide `getExecutionPlan(projectId)`.
2. Validator/projection must include completion-relevant Criteria owned by both the exact WorkItem and its accepted BoundedSolution.
3. Exact Implementer attempts must persist the actual Implementer principal rather than the human `local-operator`; Validator independence must be provable from persisted actor identity. Mechanical completion must use an appropriate application/system principal rather than impersonating the Operator.

After those corrections, finish every remaining requirement in the active WRB04-04 card.

## Only remaining sequence

After WRB04-04 is fully implemented, validated, reported, and committed:

1. `WRB04-05_workflow_completion_integration.md`
2. `WRB04-06_shared_workspaces_qualification.md`
3. STOP for human Architect review.

Do not begin WRB05.

## Execution rules

- One card = one completed engineering outcome, one Implementer Report, one attributable commit.
- Do not stop merely because the card is large if no architectural contradiction exists.
- If a genuine architecture contradiction prevents completion, stop and report that contradiction directly.
- Ordinary implementation defects are fixed inside the active card.
- Exact Workflow/WorkItem/SPS identity is canonical.
- Do not restore WorkIntake, Markdown Work Card, routed-development, or Issue Fix Card authority.
- Use focused validation. Do not run the historical full work-item profile as a routine completion gate.
