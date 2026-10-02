# RWS03-REPAIR01 — Extract Shared Workflow Stage Rail and Restore Intake Top-Rail Parity

**Status:** IMPLEMENTER_READY  
**Parent:** RWS03  
**Type:** Operator-validation repair / renderer architecture  
**Baseline reviewed:** `dev` at `650c314397910fdab8e44500c805b028a154149c`

## Defect

RWS03 passes code review but fails Operator UI validation.

All six substantive existing-project Intakes now use the approved two-column intake body, but they are missing the top lifecycle/action rail that is part of the approved Greenfield workflow UI.

Verified cause:

- Greenfield receives `NestedWorkflowRail` from `App.tsx` only when `isDevelopmentForeground` is true.
- Existing-project Workflow instances use `shellView === "workflow-instance"`, so they never receive that rail.
- `NestedWorkflowRail` currently hard-codes the Greenfield Project pipeline and also owns Phase/Work Card subloops.
- The reusable `IntakeWorkspaceShell` correctly owns the workspace heading/body; the lifecycle rail is higher-level workflow chrome and must not be duplicated inside the intake shell.

## Objective

Extract the **top pipeline visual component** from the Greenfield rail into a reusable `WorkflowStageRail`, port Greenfield's Project pipeline onto that shared component with no visual/behavioral change, and render the same rail above every RWS03 substantive Intake.

This repair is about the top rail only. Do not redesign intake forms or build the next workspace family.

## Architecture decision

Create:

`src/renderer/app/WorkflowStageRail.tsx`

The component owns only the approved top pipeline presentation:

- `workflow-navigation-header`;
- `figma-pipeline-nav`;
- pipeline steps;
- connectors;
- `StageIcon`;
- selected/required/status tone rendering;
- accessible step labels.

Move the current reusable `PipelineStep` presentation out of `NestedWorkflowRail.tsx` into this component.

The component accepts an ordered typed stage model. At minimum each stage contains:

- stable stage ID;
- label;
- status label;
- selection state (`available | exact | parent`);
- required flag;
- optional navigation callback/enabled state.

It must not know Greenfield workspace IDs, Feature/Issue services, Electron APIs, Project State, or Workflow persistence.

### Greenfield remains the reference consumer

`NestedWorkflowRail` remains the Greenfield/Project adapter and still owns:

- Project-specific status derivation;
- Greenfield destination workspace IDs;
- Phase loop;
- Work Card loop;
- execution-context logic.

Replace only its hard-coded top pipeline rendering with `WorkflowStageRail`.

The Phase and Work Card `ContextLoopBar` behavior must remain unchanged.

Greenfield Project Intake must remain visually identical to the Operator-approved reference.

## Existing-project intake rail model

Create a small renderer model/helper, e.g.:

`src/renderer/app/workflowStageRailModel.ts`

It derives the top rail for the six RWS03 intake Workflow types from canonical `workflowType` and `currentWorkspace`.

For this repair, the substantive Workflow rail has seven stable high-level stages:

| Position | Default label | Issue Resolution label |
| --- | --- | --- |
| 1 | Intake | Intake |
| 2 | Architect Assessment | Root Cause Analysis |
| 3 | Planning | Correction Planning |
| 4 | Topology | Topology |
| 5 | Execution | Execution |
| 6 | Validation | Validation |
| 7 | Close | Close |

The Workflow type is already visible in the workspace heading; do not make every rail label excessively long.

### Status during the RWS03 Intake family

When the exact Workflow is at its registry entry workspace:

- Intake = `Open` and selected;
- all later stages = `Not Ready`;
- only Intake is navigable/current;
- future stages are disabled/non-navigating placeholders.

Do not invent advancement for Refactor/Migration, Integration, Infrastructure, or Research.

For Feature/Issue later persisted stages, the helper may reflect already-existing states using the known exact workspace names, but this is not authorization to redesign those provisional workspaces. At minimum, their Intake rendering must be correct.

Unknown/mismatched workspace names must fail closed to no substantive rail model rather than guessing by suffix.

## App composition

Update `App.tsx` so the top rail selection is:

1. Greenfield/Development foreground -> existing `NestedWorkflowRail` adapter;
2. RWS03 substantive Intake foreground -> `WorkflowStageRail` using the exact Workflow rail model;
3. otherwise no new rail.

The substantive rail must appear in the same application position as the Greenfield Project rail: above the sidebar/workspace body, not inside the left intake column.

Do not render two rails simultaneously.

Do not move `Back to Workflows`; it remains the intake workspace header action.

## Required production areas

Create:

- `src/renderer/app/WorkflowStageRail.tsx`
- `src/renderer/app/workflowStageRailModel.ts`

Modify only as required:

- `src/renderer/app/NestedWorkflowRail.tsx`
- `src/renderer/app/App.tsx`
- existing rail CSS only if extraction requires selector generalization.

No main-process, preload, IPC, Project State, Workflow intake persistence, source-control, or database change is authorized.

## Preserve

Preserve unchanged:

- RWS01 Greenfield Intake body and shell;
- Greenfield top rail labels/status behavior/navigation;
- Greenfield Phase and Work Card subloops;
- RWS03 six substantive intake forms/questions/persistence;
- embedded ChatGPT ownership and two-column layout;
- Feature Prepare Assessment and Issue Prepare RCA actions;
- Back to Workflows navigation;
- all Workflow IDs/currentWorkspace persistence.

## Forbidden changes

Do not:

- put Greenfield-specific stage IDs into `WorkflowStageRail`;
- duplicate the Greenfield rail JSX for substantive Workflows;
- place the rail inside `IntakeWorkspaceShell`;
- redesign `NestedWorkflowRail` Phase/Work Card loops;
- create backend stage state;
- make future placeholder stages clickable;
- invent new Workflow workspace transitions;
- redesign Feature Assessment, Issue RCA, Planning, Execution, Validation, or Close workspaces;
- change intake persistence or RWS02 questions;
- perform broad `App.tsx` cleanup beyond rail composition.

## Focused proof

Prefer existing owners.

Extend `test/renderer/project-rail-presentation.test.cjs` and/or `test/renderer/workflow-hub-shell.test.cjs` to prove:

1. `WorkflowStageRail` renders the same pipeline class structure, connectors, status text, selected state, and accessible step semantics used by Greenfield.
2. `NestedWorkflowRail` delegates its Project pipeline to the shared rail while Phase/Work Card loops remain present.
3. Greenfield still renders exactly seven Project stages in the existing order:
   - Project Intake
   - Architect Interview
   - Project Planning
   - Phase Map
   - Phases
   - Project Validation
   - Project Close
4. Every one of the six substantive RWS03 entry workspaces produces a seven-stage rail with Intake selected/Open and later stages Not Ready.
5. Issue uses `Root Cause Analysis` and `Correction Planning`; the other workflows use `Architect Assessment` and `Planning`.
6. Future stages have no active navigation callback at Intake.
7. App composition cannot render both Greenfield and substantive top rails for the same foreground.
8. RWS03 `WorkflowIntakeWorkspace` remains a consumer of `IntakeWorkspaceShell`; no rail markup is added inside it.

Reuse the RWS01 Greenfield renderer proof and RWS03 Workflow-intake proof unchanged where possible.

Do not create a new permanent test file unless existing rail/renderer owners cannot prove a materially distinct boundary; justify any new file in the Implementer Report.

## Validation

Use an exact changed-path input:

- `npm run validate:plan -- --profile work-item --changes tmp/rws03-r01-changes.json`
- `npm run test:affected -- --changes tmp/rws03-r01-changes.json`
- focused rail/renderer owners after the composed build when needed;
- `git diff --check`.

Do not run full/release qualification.

Operator visual validation is required.

## Acceptance criteria

1. Greenfield Project Intake retains its existing approved top rail with no material visual or behavioral change.
2. Feature, Issue, Refactor/Migration, Integration, Infrastructure, and Research Intake each show the same top-rail visual system above the workspace.
3. Existing-project Intake shows Intake selected/Open and later stages Not Ready.
4. The rail remains outside the two-column `IntakeWorkspaceShell`.
5. Greenfield and substantive Workflows use the same `WorkflowStageRail` presentation component rather than copied JSX.
6. Greenfield Phase/Work Card subloops are unchanged.
7. Future placeholder stages cannot navigate or mutate Workflow state.
8. RWS03 intake persistence, questions, embedded browser, and continuation actions are unchanged.
9. Focused proof passes; unrelated broader failures are reported rather than repaired.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS03_REPAIR01_IMPLEMENTER_REPORT.md`

Report:

- verified baseline/root;
- shared rail API and files changed;
- exact Greenfield extraction boundary;
- substantive stage-model labels/status behavior;
- proof that Phase/Work Card loops were untouched;
- focused/composed validation results;
- tests reused/extended/new with coverage-gap justification;
- deviations/blockers;
- remaining Operator visual validation.

## Checkpoint and STOP

Create one attributable checkpoint commit:

`RWS03-R01 restore shared workflow top rail`

Then STOP for Architect review and Operator visual validation. Do not begin the next workspace-family extraction.
