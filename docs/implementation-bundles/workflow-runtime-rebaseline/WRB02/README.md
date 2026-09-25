# WRB02 — Workflow Application, Inventory, and Routing

**Starting checkpoint:** `76ecb4f97ca8aa52b46fdfc95f25e186af20bc4b`
**Implementer:** GPT 6.0 Luna Medium
**Review cadence:** execute all five released cards sequentially; Architect review after WRB02-05.

## Bundle outcome

Current Projects expose independent Workflow instance collections. Operators may directly start repeatable substantive Workflows or use optional WIR. WIR performs only capture → Architect route assessment → Operator decision → target Workflow creation/handoff, then closes. Direct and routed targets use one Workflow application/source-baseline service.

## Released sequence

1. WRB02-01 — Establish Workflow Application Service and exact instance/source-baseline semantics
2. WRB02-02 — Replace Workflow Hub with multi-instance inventory and direct-start UX
3. WRB02-03 — Move WIR Architect routing assessment onto Structured Project State
4. WRB02-04 — Implement Operator route handoff, target creation, WIR closure, and exact target opening
5. WRB02-05 — Qualify Workflow application/routing and fence the legacy Current Project pipeline

After each card: focused validation, Implementer Report, exact attributable checkpoint, then proceed. Stop early only for a bundle-level architectural blocker. After WRB02-05: STOP for Architect bundle review.