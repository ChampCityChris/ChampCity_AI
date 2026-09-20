# Work Intake Routing — Repair Plan After WIR21

**Status:** Architect repair decomposition for Operator-directed continuation — 2026-09-20

## Trigger

WIR22 stopped correctly at dependency verification. The governing failed-review evidence is:

- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md`
- `docs/implementation-bundles/work-intake-routing/REPAIR_EVIDENCE_2026-09-20.md`

The bundle has valid checkpoint commits WIR01–WIR21. WIR22 did not pass and WIR23 was not opened.

## Repair Objective

Complete the missing production seam from an approved non-Issue routed Work Plan into the established Formal Work Card → implementation/report → validation/Repair → close lifecycle without manufacturing fake Phases for direct Plans, while preserving genuine Phase semantics for phased Plans.

Separately repair the confirmed WIR04 Work Intake Workspace layout/interaction defect before WIR22 resumes.

## Architectural Decision

The repair MUST reuse the established Work Card lifecycle rather than build a second implementation engine.

For current V1 persistence only, introduce one compatibility addressing concept for Work Item artifacts:

- legacy Phase scope — preserves existing `planning/phases/<phaseId>/...` behavior;
- routed direct-Plan scope — Work Item artifacts are owned by the approved routed Plan with no Phase identity;
- routed Phase scope — Work Item artifacts are owned by one genuine Phase declared by the approved routed Plan.

This compatibility scope is an implementation/persistence adapter, not a new canonical product domain entity. Future Structured Project State remains authoritative for the target domain model.

## Repair Sequence

1. **WIR22-REPAIR01 — Establish Routed Development Execution Binding**  
   Bind an approved current non-Issue routed Plan to durable execution evidence without creating legacy Phase artifacts.

2. **WIR22-REPAIR02 — Generalize V1 Work Item Artifact Scope Beyond Mandatory Phase**  
   Generalize Work Card identities/path resolution so legacy Phase, routed direct Plan, and routed genuine Phase scopes can share the lifecycle.

3. **WIR22-REPAIR03 — Connect Routed Work Items to Formal Work Card Planning and Build Review**  
   Use generic Plan eligibility to start the correct routed Work Item and reuse Formal Work Card + Implementer Report mechanics.

4. **WIR22-REPAIR04 — Connect Routed Work Items to Validation, Repair, and Close**  
   Reuse validation, Repair, effective completion, and close-return mechanics under routed scopes.

5. **WIR22-REPAIR05 — Connect Routed Phase and Plan Completion to Generic Execution**  
   Feed actual Work Item/Phase evidence back into the generic executor, preserve Phase criteria, and derive real Plan completion.

6. **WIR22-REPAIR06 — Wire Routed Completion to Machine-Owned Git and Integration Services**  
   Connect successful routed Work Item/Plan completion to WIR19–WIR21 checkpoint/integration services through production callers.

7. **WIR04-REPAIR01 — Repair Work Intake Workspace Layout and Form UX**  
   Correct the visually failed Work Intake Workspace while leaving Workflow Hub redesign to original WIR22.

Then resume:

8. **WIR22 — Make Start Work the Canonical Workflow Hub Entry**
9. **WIR23 — End-to-End Routing, Execution, Git, and Integration Acceptance**

## Why These Are Separate Repairs

- REPAIR01 owns route Plan activation/freshness, not Work Card internals.
- REPAIR02 owns the phase-only identity/path defect.
- REPAIR03 owns planning/build entry into the existing lifecycle.
- REPAIR04 owns downstream validation/Repair/close semantics.
- REPAIR05 owns generic Plan/Phase progression and completion.
- REPAIR06 owns production source-control/integration orchestration.
- WIR04-REPAIR01 owns the confirmed UI defect and no execution semantics.

Combining these would create another broad multi-domain card and recreate the drift risk this bundle was designed to prevent.

## Preservation

The repair bundle must preserve:

- all WIR01–WIR21 checkpoint history;
- current legacy Development workflows and paths;
- current Issue Resolution routed execution;
- route/Plan/decomposition freshness and supersession;
- direct Plans having no fabricated Phase layer;
- genuine phased Plan dependency/criteria semantics;
- machine-owned Git mechanics and Integration Repair boundaries;
- WIR22 ownership of the Workflow Hub Start Work cutover.

## Checkpoint Rule

Each passing Repair Card receives exactly one checkpoint commit through the execution harness.

Do not create a WIR22 checkpoint for the blocked attempt. Preserve the blocked WIR22 report as failed-review evidence.

After the repair sequence passes, resume WIR22 on top of the final repair checkpoint.
