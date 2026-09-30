# WRB02 / Repair02 — Workflow Hub Launcher Repair

**Implementation checkpoint:** `336571e3a00b8b686e624504702cc700f5c6f68e`  
**Status:** **ACCEPTED**

Controlling card:

`WRB02-R02-01_reframe_workflow_hub_as_stable_launcher.md`

Architect review:

`ARCHITECT_REVIEW_2026-09-30.md`

The durable multi-instance Workflow model remains unchanged.

Accepted presentation rule:

```text
Workflow Hub
-> stable workflow catalog / launcher

Workflow-type intake surface
-> Start New
-> instance list/history
-> exact instance selection

Exact Workflow surface
-> workflow-specific intake/planning/execution
```

Accepted Hub order:

```text
Work Intake Routing | Greenfield Project        | Feature / Capability
Refactor / Migration | Integration / Composition | Issue Resolution
Infrastructure / Platform | Research / Prototype |
```

Greenfield Project remains visible for every Current Project. Greenfield-origin Projects retain an enabled historical/status card after completion. Migrated Existing Projects show the same card disabled/non-applicable.

The Hub no longer renders inline Workflow creation forms or Workflow instance rows.

Next step: Operator visual review of the rendered desktop screen.
