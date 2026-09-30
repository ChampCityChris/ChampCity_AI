# WIR-UX05A — Rebuild Routed Work Item Map, Planning, and Implement Workspaces

**Status:** IMPLEMENTER_READY  
**Depends on:** WIR-UX03, WIR-UX04A  
**Type:** Generic Plan execution UX repair — first half

## Objective

Replace the first half of `RoutedExecutionPanel` with a routed Work Item loop modeled on the established Development Work Card loop:

Work Item Map → Planning → Implement.

## Governing invariant

The generic execution engine may be shared, but the user still works one lifecycle task at a time.

Formal Work Card Architect planning uses the same visible embedded Architect interaction model as existing Work Card Planning.

Implement uses the same Codex execution presentation as existing Work Card implementation.

## Exact implementation

### 1. Execution sub-navigation

Extend the routed navigation presentation with a nested execution loop using `ContextLoopBar`.

Required steps:

- Work Item Map;
- Planning;
- Implement;
- Review & Validation;
- Repair;
- Close / Next;
- Acceptance when required.

This card implements the first three; WIR-UX05B implements the rest.

### 2. Work Item Map

Create `RoutedWorkItemMapWorkspace.tsx`.

Model interaction on `WorkCardMapWorkspace`:

- candidate list;
- selected Work Item detail;
- eligibility/blocker state;
- active Work Item;
- Begin/Continue primary action;
- optional Decompose action opening WIR-UX04A.

If routed execution is not activated yet, the primary action activates the approved Plan and refreshes the map.

Do not expose raw fingerprints in primary UI.

### 3. Work Item Planning

Create `RoutedWorkItemPlanningWorkspace.tsx`.

Use document + Architect shell.

It must present:

- current Work Item candidate/intake handoff;
- Formal Work Card draft/current contract;
- embedded ChatGPT;
- Prepare Handoff;
- Copy Handoff;
- Refresh;
- contract disposition: Approve / Request Revision / Reject.

### 4. Restore Prepare/Copy separation

Current `routedWorkflowService` action `prepare` prepares and copies the Work Card Architect handoff.

Split the UI adapter contract:

- `prepare` prepares only;
- add routed action `copy` that copies the current prepared instruction;
- `check-draft` refreshes/promotes;
- repair planning receives analogous behavior through its current repair draft owner.

The underlying ArchitectOutputRuntime remains unchanged.

### 5. Implement Workspace

Create `RoutedImplementWorkspace.tsx`.

Reuse:

- `DevelopmentEnvironmentStatus`;
- `CodexExecutionActions`;
- `CodexExecutionConsole`.

Present current Work Item/contract/report target using the same hierarchy as `WorkCardBuildingReviewWorkspace`.

Do not include report review/validation controls here.

Runtime interrupt/approval/input/elicitation actions remain available while running.

### 6. Retire monolith responsibility

After this card, `RoutedExecutionPanel` must no longer render Work Item Map, Formal Work Card planning, or Implement presentation. It may remain temporarily for later stages until WIR-UX05B/06.

## Bounded continuation

Fix routed action availability/projection fields needed to present the established UX, but do not create new execution eligibility rules.

If a presentation needs a label/path/revision currently hidden inside a nested record, add it to `RoutedWorkflowModel` as a read-only projection.

## Validation

Prove:

- routed Execution opens Work Item Map rather than a long execution panel;
- Planning mounts ChatGPT and has separate Prepare/Copy;
- contract review controls appear only with a current draft;
- Implement reuses Codex console/actions;
- no report validation/Repair/Integration controls appear in Implement;
- decomposition opens the contextual workspace and returns to selected replacement.

Run existing Codex presentation tests affected by reuse.
