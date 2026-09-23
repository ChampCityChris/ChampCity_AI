# WIR-UX03 — Rebuild Route Architect Assessment and Plan Workspaces

**Status:** IMPLEMENTER_READY  
**Depends on:** WIR-UX02  
**Type:** Routed planning UX repair

## Objective

Replace the stage-selecting `WorkPlanningPanel` with separate Architect Assessment and Plan Workspaces using the established document + embedded Architect interaction and document disposition patterns.

## Governing invariant

Assessment and Plan are distinct workflow tasks. The user does not manually select the planning stage from a dropdown and does not receive later lifecycle stages nested beneath the current planning document.

## Exact implementation

Create:

- `WorkArchitectAssessmentWorkspace.tsx`
- `WorkPlanWorkspace.tsx`

A small shared routed-planning presentation helper is permitted when it removes duplication without hiding stage-specific content.

### Architect Assessment Workspace

Use the generic document/chat shell.

Document column:

- current Intake/route context in compact status;
- route-specific Assessment document when present;
- route/profile label;
- readable Markdown body;
- disposition area: Approve, Request Revision, Reject.

Architect column:

- embedded ChatGPT;
- Prepare Handoff;
- Copy Handoff;
- Refresh;
- Reload ChatGPT.

Do not expose a stage selector.

For Research, render the structured research outcome clearly. If approved outcome is `no-implementation-plan-required`, navigation advances directly to Integration.

### Plan Workspace

Same established shell and handoff pattern.

Document column:

- approved Assessment available as supporting tab/context;
- Work Plan as primary document;
- direct/phased topology summary;
- Phase/Work Item structure in readable hierarchy;
- Plan disposition.

Plan approval unlocks Execution through navigation. It does not render execution on the same screen.

### Review behavior

Continue using `reviewWorkPlanning` and current canonical artifacts. No new planning authority is introduced.

RevisionRequested stays in the same Workspace and enables a revised handoff.

### Retire wrong component

Remove `WorkPlanningPanel.tsx` after its remaining consumers have moved in this card or the immediately dependent cards. It must not remain as the routed stage orchestrator.

Do not preserve the `Planning stage` select control.

## App integration

Map:

- routed `assessment` -> `WorkArchitectAssessmentWorkspace`;
- routed `plan` -> `WorkPlanWorkspace`.

Both are Architect browser stages.

On review mutation, refresh navigation and remain/move according to authoritative state.

## Bounded continuation

Fix all renderer-local assumptions that depend on `WorkPlanningPanel` while preserving the backend `workPlanningKernel`.

Do not redesign route profiles or plan grammar to make the workspace easier.

## Validation

Extend the routed workspace test owner to prove:

- Assessment and Plan are separate App-rendered stages;
- both expose embedded Architect;
- neither exposes a stage dropdown;
- neither nests decomposition or execution;
- approved Research terminal outcome points to Integration;
- approved ordinary Assessment points to Plan;
- approved Plan points to Execution.

Replace `research-routed-integration.test.cjs`'s obsolete assertion that Research closure renders `RoutedExecutionPanel` inside `WorkPlanningPanel`. The permanent proof should instead assert navigation to Integration with no Plan/Execution stage required.
