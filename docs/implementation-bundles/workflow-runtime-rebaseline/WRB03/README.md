# WRB03 — Workflow Planning Normalization

**Starting checkpoint:** dff9951225c319591ffe41b73a99621eb43c257c  
**Implementer:** GPT 6.0 Luna Medium  
**Review cadence:** execute all five released cards sequentially with one attributable checkpoint and Implementer Report per card; Architect review after WRB03-05.

## Outcome

Feature/Capability and Issue Resolution exact Workflow instances receive usable Workflow-owned intake/assessment/planning front halves. Accepted planning is normalized into canonical Structured Project State BoundedSolution/WorkItem/Phase/Criterion graphs scoped to the exact Workflow.

Direct and WIR-routed Feature instances converge after target creation. WIR remains routing-only. Issue retains its bespoke intake/evidence/RCA semantics but reaches the same canonical planning boundary.

WRB03 stops at a read-only Work Item Map boundary. Shared execution, validation, repair, source checkpointing, and integration remain WRB04-owned.

## Sequence

1. WRB03-01 — Establish Workflow-owned canonical planning graph and Workflow-scoped projection
2. WRB03-02 — Implement Feature/Capability exact-Workflow intake, Architect planning, and canonicalization
3. WRB03-03 — Implement Issue Resolution exact-Workflow evidence/RCA/correction planning and canonicalization
4. WRB03-04 — Converge exact-instance navigation and fence Current Project legacy route-owned planning
5. WRB03-05 — Qualify Workflow planning normalization and stop at the shared execution boundary

## Execution rules

- Luna executes cards sequentially.
- Each card gets focused validation, an Implementer Report, and one checkpoint commit.
- No human Architect review is required between released cards unless an architectural contradiction is discovered.
- Do not begin WRB04.
- Do not repair the deferred integrationGit linked-worktree/common-directory defect in WRB03.
- Do not run broad historical suites merely because legacy contracts select them. Run bounded proof for the changed boundary and report validation-plan previews honestly.
