# WRB02 — Workflow Application, Inventory, and Routing

**Starting checkpoint:** 76ecb4f97ca8aa52b46fdfc95f25e186af20bc4b  
**Implementer:** GPT 6.0 Luna Medium  
**Final accepted checkpoint:** dff9951225c319591ffe41b73a99621eb43c257c  
**Status:** CLOSED / ACCEPTED

## Bundle outcome

Current Projects expose independent Workflow instance collections. Operators may directly start repeatable substantive Workflows or use optional WIR. WIR performs only capture → Architect route assessment → Operator decision → target Workflow creation/handoff, then closes. Direct and routed targets use one Workflow application/source-baseline service.

The five-card core implementation reached ee064aaa562cb548bd59ae3642ea39aea5d69650. Architect review accepted the core architecture and released Repair01. Repair01 completed at dff9951225c319591ffe41b73a99621eb43c257c and is accepted by FINAL_ARCHITECT_DISPOSITION_2026-09-26.md.

## Implemented sequence

1. WRB02-01 — Establish Workflow Application Service and exact instance/source-baseline semantics
2. WRB02-02 — Replace Workflow Hub with multi-instance inventory and direct-start UX
3. WRB02-03 — Move WIR Architect routing assessment onto Structured Project State
4. WRB02-04 — Implement Operator route handoff, target creation, WIR closure, and exact target opening
5. WRB02-05 — Qualify Workflow application/routing and fence the legacy Current Project pipeline

## Repair outcome

Repair01 restored:
- Greenfield one-time Project Creation entry semantics;
- completed WIR history/open behavior;
- bounded WIR display titles while preserving complete Work Intake request;
- Current Project source-materialization proof.

The structured-integration modernization exposed a downstream linked-worktree/common-directory defect in integration candidate ownership. That defect is explicitly deferred to WRB04 and is not waived.

See:
- Repair01/ARCHITECT_REVIEW_2026-09-26.md
- Repair01/Reports/WRB02-R01-02_FINAL_QUALIFICATION_REPORT.md
- Repair01/Reports/WRB02-R01-03_CLOSURE_REPORT.md
- FINAL_ARCHITECT_DISPOSITION_2026-09-26.md

## Next bundle

WRB03 — Workflow Planning Normalization is released from dff9951225c319591ffe41b73a99621eb43c257c.
