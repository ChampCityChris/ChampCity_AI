# WRB03 — Workflow Planning Normalization

**Starting checkpoint:** dff9951225c319591ffe41b73a99621eb43c257c  
**Implementer:** GPT 6.0 Luna Medium  
**Implementation checkpoint:** `46da96bcd8d596b68b2924d0fa8dce8e11e06e9d`  
**Status:** IMPLEMENTED / UNDER REPAIR01

## Outcome

Feature/Capability and Issue Resolution exact Workflow instances receive Workflow-owned intake/assessment/planning front halves. Accepted implementation planning is normalized into canonical Structured Project State BoundedSolution/WorkItem/Phase/Criterion graphs scoped to the exact Workflow.

Direct and WIR-routed Feature instances converge after target creation. WIR remains routing-only. Issue retains its bespoke intake/evidence/RCA semantics but reaches the same canonical planning boundary.

WRB03 stops at a read-only Work Item Map boundary. Shared execution, validation, repair, source checkpointing, and integration remain WRB04-owned.

## Implemented sequence

1. WRB03-01 — Establish Workflow-owned canonical planning graph and Workflow-scoped projection
2. WRB03-02 — Implement Feature/Capability exact-Workflow intake, Architect planning, and canonicalization
3. WRB03-03 — Implement Issue Resolution exact-Workflow evidence/RCA/correction planning and canonicalization
4. WRB03-04 — Converge exact-instance navigation and fence Current Project legacy route-owned planning
5. WRB03-05 — Qualify Workflow planning normalization and stop at the shared execution boundary

## Architect review

Architect review at `46da96bcd8d596b68b2924d0fa8dce8e11e06e9d` accepts the core WRB03 architecture but found bounded closure blockers:

- Feature/Issue mutation IPC handlers reject their correct two-argument preload calls;
- pre-plan Finding/RootCause ownership uses `relates_to` rather than the explicit `workflow_member` ownership contract;
- Issue RCA accepted RootCause identity is encoded in Decision rationale and promotion is not atomic;
- accepted Feature assessment content is discarded before plan preparation;
- broad “accepted Project architecture” selection leaks peer unexecuted Workflow plans into concurrent planning context.

See `ARCHITECT_REVIEW_2026-09-26.md`.

## Repair01

Repair01 is released under `Repair01/` as three sequential cards:

1. WRB03-R01-01 — Restore Feature/Issue planning IPC reachability
2. WRB03-R01-02 — Restore exact Workflow semantic ownership and atomic Issue RCA authority
3. WRB03-R01-03 — Preserve Feature assessment semantics, isolate Project context, and requalify WRB03

Luna executes all three sequentially with focused validation, one Implementer Report, and one attributable checkpoint per card. No intermediate Architect review is required.

After R01-03: STOP for final Architect closure.

## Execution rules

- Do not begin WRB04.
- Do not repair the deferred integrationGit linked-worktree/common-directory defect in WRB03.
- Do not preserve obsolete `relates_to` or Decision-rationale identity behavior merely to keep retired tests green.
- Do not run broad historical suites merely because legacy contracts select them. Run bounded proof for the changed boundary and report validation-plan previews honestly.
