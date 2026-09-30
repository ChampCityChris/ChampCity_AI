# WRB02 / Repair02 — Workflow Hub Launcher Repair

**Status:** ACTIVE  
**Controlling card:** `WRB02-R02-01_reframe_workflow_hub_as_stable_launcher.md`

This repair supersedes the WRB02-02 presentation rule that made the Workflow Hub itself a multi-instance registry with inline creation forms.

The durable multi-instance Workflow model remains unchanged.

New presentation rule:

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

Required Hub order:

```text
Work Intake Routing | Greenfield Project       | Feature / Capability
Refactor / Migration | Integration / Composition | Issue Resolution
Infrastructure / Platform | Research / Prototype |
```

Greenfield Project remains visible for every Current Project. Greenfield-origin Projects retain an enabled historical/status card even after completion. Migrated Existing Projects show the same card greyed out and non-applicable.

Stop after implementation for Architect review.
