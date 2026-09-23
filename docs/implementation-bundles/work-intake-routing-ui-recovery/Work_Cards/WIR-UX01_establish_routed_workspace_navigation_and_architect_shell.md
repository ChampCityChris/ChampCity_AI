# WIR-UX01 — Establish Routed Workspace Navigation and Architect Shell

**Status:** IMPLEMENTER_READY  
**Type:** UI architecture repair  
**Parent:** Work Intake Routing UI/UX Recovery

## Objective

Replace the single nested Work Intake renderer composition with an evidence-driven routed Workspace shell capable of presenting Intake, Routing, Architect Assessment, Plan, Execution, and Integration as distinct task-oriented stages.

Establish the reusable document + Architect composition needed by later cards.

## Governing invariant

A routed lifecycle stage is a Workspace, not a child panel rendered beneath every prior stage.

Renderer navigation may project authoritative backend state, but may not create route/topology/eligibility authority.

Architect-backed routed Workspaces must use the existing embedded ChatGPT browser attachment mechanism.

## Verified ownership

Current defect owners:

- `src/renderer/app/App.tsx`
  - one `shellView === "work-intake"`;
  - no Work Intake rail;
  - `shouldAttachEmbeddedArchitectSurface` excludes Work Intake;
  - renders only `WorkIntakeWorkspace`.

- `src/renderer/app/WorkIntakeWorkspace.tsx`
  - renders Routing as a child after save.

Existing presentation sources to reuse:

- `NestedWorkflowRail.tsx`
- `IssueResolutionRail.tsx`
- `ContextLoopBar.tsx`
- `IssueDocumentChatWorkspaceShell.tsx`
- `figma/FigmaBrowserPanel.tsx`

## Exact implementation

### 1. Generalize the existing document/chat shell

Create:

`src/renderer/app/DocumentChatWorkspaceShell.tsx`

Move the environment-neutral layout currently implemented by `IssueDocumentChatWorkspaceShell` into this component.

Keep `IssueDocumentChatWorkspaceShell` as a compatibility wrapper or migrate its two current consumers mechanically. Do not change Issue UI behavior in this card.

The generic shell must preserve:

- Workspace header;
- readable document/review column;
- browser column;
- browser actions slot;
- compact class hooks;
- existing scroll ownership.

### 2. Add routed navigation contracts

Create:

`src/shared/workIntakeNavigationContracts.ts`

Define:

`WorkIntakeStageId = "intake" | "routing" | "assessment" | "plan" | "execution" | "integration"`

and a projection containing:

- intakeId;
- active/required stage;
- ordered stage availability entries with human-readable reason;
- selected route when one exists;
- execution substep summary when execution exists;
- whether the stage requires Architect browser presentation.

Do not persist this projection. It is a query/view contract over existing durable evidence.

### 3. Add main-process navigation projection

Create:

`src/main/workIntake/workIntakeNavigationService.ts`

Compose existing owners:

- Work Intake;
- Routing Assessment/Route Decision;
- Work Planning assessment/plan;
- Routed Workflow/Integration.

The service determines stage availability/required stage from those owners. It must not perform transitions.

Required progression:

- no Intake -> intake;
- Intake without route assessment/decision -> routing;
- selected non-Issue route without approved assessment -> assessment;
- approved Research with no implementation plan required -> integration;
- approved assessment without approved Plan -> plan;
- approved Plan not complete -> execution;
- completed Plan -> integration.

Issue-route navigation may report Assessment as externally owned by Issue Resolution; WIR-UX04B will supply the bridge.

Expose this query through `ChampCityApi`.

### 4. Add routed rail

Create:

`src/renderer/app/WorkIntakeRoutingRail.tsx`

Model it on the existing pipeline rails.

Requirements:

- six top-level stages;
- current/available/unavailable states;
- unavailable reason through accessible title/text;
- no raw backend enum labels;
- selected route shown as task context, not as a second navigation tree.

### 5. App shell integration

In `App.tsx`:

- maintain the selected Work Intake ID and routed stage;
- render `WorkIntakeRoutingRail` whenever a current routed Intake exists;
- reconcile requested stage against the navigation projection;
- preserve the user's stage when still available;
- otherwise move to the service-reported required stage;
- extend embedded Architect attachment eligibility to Work Intake stages whose navigation projection says Architect interaction is required.

Do not attach ChatGPT during Intake capture, Implement, or Integration merely because they are Work Intake stages.

### 6. Stop inline lifecycle expansion

Modify `WorkIntakeWorkspace.tsx` so it owns Intake capture/confirmation only.

Remove its direct child rendering of `WorkRoutingAssessmentPanel`.

After successful save, notify App to refresh navigation and open Routing.

## Expected boundary

Primary source changes:

- App shell;
- Work Intake capture;
- new generic document/chat shell;
- new routed navigation contract/service/rail;
- IPC/preload/API declaration for the navigation query.

No route, planning, branch, source-control, execution, or integration transition semantics change.

## Bounded continuation

If existing App shell state naming makes exact stage storage awkward, continue within:

- `App.tsx`;
- routed navigation contract/service;
- Work Intake renderer files.

Do not stop merely because another renderer boolean currently assumes only Development/Issue foreground state. Normalize those booleans as necessary while preserving existing Development/Issue behavior.

## Validation

Create one focused permanent renderer/navigation owner:

`test/renderer/work-intake-routed-workspaces.test.cjs`

For this card it must prove:

- saved Intake does not render Routing as a child of the intake form;
- routed rail stage order is exact;
- navigation projection never selects future stages without required backend evidence;
- Work Intake Architect stages can make the embedded browser attachment predicate true;
- existing Development and Issue attachment predicates remain true in their current cases.

Run the existing Issue Architect/Planning renderer owners affected by shell generalization.

Do not run the full suite.

## Completion evidence

Report exact files, projection rules, rail behavior, existing shell reuse, focused test results, and whether the running app was visually inspected.
