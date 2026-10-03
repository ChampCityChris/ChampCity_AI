# RWS06-REPAIR01 — Converge Existing-Project Workflow Progression on Authoritative SQL State

**Status:** IMPLEMENTER_READY
**Parent bundle:** RWS06 — Remaining Workspace and Structured-State Completion
**Failed review checkpoint:** `4f8cf32c0f7c41a717c0153715c0d24be586b520`
**Repair type:** application progression / renderer re-resolution defect

## Failed review evidence

Operator dogfooding exposed a SQL-native Refactor / Migration Workflow whose approved Intake did not visibly progress into the Architect stage.

Observed SQL-backed instance:

- Workflow ID: `d224ccbd-0f64-4524-9945-fd7a72dcb51a`
- Workflow type: `refactor-migration`
- Intake ID: `f6a9b3bc-5d84-4979-ae0e-52daae6ba831`
- Intake version: `1`
- Intake disposition: `Approved`

The generated Intake projection explicitly states that Structured Project State is authoritative. This is not a pre-SQL Markdown compatibility problem.

Architect source review confirmed the implementation defect independently of that one instance:

1. Workflow services persist stage changes in SQL.
2. Renderer stage ownership is inconsistent after those mutations.
3. Some boundaries explicitly reopen the exact Workflow from SQL.
4. Other boundaries switch local React state and continue rendering from stale Workflow props.
5. Plan approval persists `currentWorkspace = "work-item-map"`, but `ExactWorkflowPlanningWorkspace` continues locally and renders a read-only `WorkflowPlanningMap` instead of handing control back to the application router.
6. Leaving and reopening the Workflow causes the application to read `work-item-map` and correctly enter shared Execution.
7. Feature and Issue dispatch currently treat unknown active workspace values as Execution by fallback rather than failing closed.

No additional Operator symptom clarification or rediscovery of the Migration record is required for this repair. The defect is established by the production source and dogfood behavior.

## Confirmed defect

Existing-project Workflow progression does not have one application-owned handoff after persisted stage mutation.

The application can therefore have:

```text
SQL Workflow.currentWorkspace = next stage
renderer still holding prior Workflow summary
local component state continues rendering prior stage
```

This affects the shared progression contract for:

- Feature / Capability
- Issue Resolution
- Refactor / Migration
- Integration / Composition
- Infrastructure / Platform
- Research / Prototype

The confirmed visible failure is stale renderer routing, not missing SQL transition support.

## Root cause

Stage transitions were implemented with mixed ownership:

- Intake -> Architect already has a parent reopen pattern.
- Architect -> Planning changes SQL but also uses local component state.
- Plan -> Execution changes SQL but leaves the Planning component mounted.
- Execution refreshes SQL projections internally rather than consistently returning stage ownership to the application shell.
- Feature / Issue dispatch has an unsafe catch-all to Execution.

The governing invariant was never enforced:

> After a command changes persisted Workflow stage or terminal lifecycle, the application must re-resolve that exact Workflow from Structured Project State and route from its persisted state.

## Required implementation

### 1. Add one application-owned exact Workflow progression callback

The top-level Workflow application shell must own a callback that:

1. receives or closes over the exact Workflow ID;
2. calls the existing exact Workflow read service;
3. verifies the returned Workflow ID matches the requested ID;
4. replaces the parent Workflow summary with the freshly persisted SQL projection;
5. allows normal `StructuredWorkflowWorkspace` dispatch to choose the next surface;
6. returns to the Workflow list/type surface when the exact Workflow is terminal.

Do not create a second renderer stage model.

### 2. Route all existing-project stage-changing surfaces through that callback

Use the same callback at the existing-project progression boundaries:

```text
Intake -> Architect/RCA
Architect/RCA -> Planning
Plan approval -> shared Execution
Research no-Plan closure -> terminal Workflow/list
Execution/Close/Integration -> refreshed exact Workflow or terminal Workflow/list
```

Required behavior:

- `WorkflowIntakeWorkspace` prepares the Architect stage, then awaits the application progression callback.
- Architect preparation of Planning persists the Planning workspace, then awaits the same callback rather than relying on a local stage switch.
- approved Plan persists `work-item-map`, then awaits the same callback.
- shared Execution refresh/closure notifies the parent when persisted Workflow stage/lifecycle changes.
- ordinary within-stage edits may remain local and must not cause unnecessary parent routing.

The callback must carry only exact Workflow identity. It must not accept a caller-supplied destination stage.

### 3. Repair Plan -> Execution specifically

After successful Plan approval:

```text
recordPlanReview(approved)
-> SQL accepts topology
-> Workflow.currentWorkspace = work-item-map
-> application reloads exact Workflow
-> StructuredWorkflowWorkspace dispatches "execution"
-> WorkflowExecutionWorkspace mounts
```

Do not:

- leave the user in `ExactWorkflowPlanningWorkspace`;
- render `WorkflowPlanningMap` as a substitute for Execution;
- set renderer-owned `currentWorkspace`;
- require the user to leave and reopen the Workflow.

The accepted Work Item Map remains read-only topology context inside shared Execution.

### 4. Make dispatch fail closed

Correct `workflowPlanningSurface()` so every execution transition is explicit.

For each existing-project substantive Workflow:

- canonical Intake workspace -> Intake;
- exact Architect/RCA workspace -> Architect/RCA surface;
- exact Planning workspace -> Planning surface;
- only known execution-stage workspaces -> shared Execution;
- closed/non-active -> terminal/generic handling;
- unknown or mismatched active workspace -> generic/error-safe handling.

Feature and Issue must not fall into Execution merely because their workspace is not assessment/planning.

Use the shared Architect workspace registry/mapping where one already exists rather than duplicating string lists.

### 5. Preserve direct and WIR-routed equivalence

Direct-start and WIR-routed target Workflows must use the same progression callback and persisted-stage dispatch after creation.

WIR provenance is context only and must not create a second progression path.

## Expected production scope

Keep the repair centered on renderer/application orchestration.

Expected production owners:

- `src/renderer/app/App.tsx`
- `src/renderer/app/StructuredWorkflowWorkspace.tsx`
- `src/renderer/app/WorkflowIntakeWorkspace.tsx`
- `src/renderer/app/ExactWorkflowPlanningWorkspace.tsx`
- `src/renderer/app/WorkflowExecutionWorkspace.tsx`
- `src/renderer/app/workflowPlanningDispatch.ts`

Do not change SQL transition services unless implementation proves a distinct production defect. Current source review already established that the fresh SQL-native Migration path can persist the expected Architect workspace and that Plan acceptance persists `work-item-map`.

Do not add a one-off migration-state reconciliation or special-case the observed production Workflow ID.

## Preserve

- Structured Project State as stage authority;
- exact Workflow identity;
- Intake revision/disposition gates;
- Architect review freshness and Operator disposition;
- exact Planning review and deterministic topology;
- shared WorkItem execution;
- WorkItem/Phase validation and repair;
- source-neutral/source-backed behavior;
- integration semantics;
- WIR provenance;
- Research typed no-Plan closure;
- Greenfield Project/Phase authoring and shared execution;
- RWS06I-REPAIR02 active-Project lifecycle correction;
- generated Markdown as projection/evidence only.

## Forbidden changes

- no new Workflow stage field or renderer authority;
- no destination-stage argument supplied by child components;
- no duplicate progression engine per Workflow family;
- no Markdown parsing for progression;
- no unknown-workspace fallback to Execution;
- no Workflow-ID-specific workaround;
- no schema/migration change;
- no lifecycle bypass;
- no new approval gate;
- no unrelated UI redesign or RWS06 cleanup.

## Regression proof

Extend existing stable owners rather than creating six copied suites.

### Service progression matrix

Parameterize all six existing-project Workflow types and prove:

1. Workflow starts at its canonical Intake workspace.
2. exact SQL Intake saves and approves.
3. Architect preparation persists the exact Architect/RCA workspace.
4. Architect review approval permits exact Planning preparation.
5. Planning preparation persists the exact Planning workspace.
6. approved Plan persists `work-item-map`.
7. accepted topology is available to shared Execution.

This matrix proves the SQL state machine. It does not need to use the production Migration UUID.

### Renderer progression proof

Add behavioral renderer proof that the shared application callback causes the parent exact Workflow to be reloaded and rerouted after:

- Intake -> Architect;
- Architect -> Planning;
- Plan approval -> Execution;
- terminal Research/Execution closure -> terminal/list handling.

Prove Plan approval reaches `WorkflowExecutionWorkspace` without leaving/reopening the Workflow.

### Dispatch proof

For all six types prove:

- all canonical front-half workspaces route to their exact surface;
- known execution workspaces route to Execution;
- mismatched/unknown active workspaces return generic/error-safe handling;
- Feature and Issue no longer fail open to Execution.

### Routed equivalence

Retain or extend existing WIR proof to show the routed target uses the same application progression path after creation.

## Validation

Inspect `validation/capability-map.json` before changing ownership.

Required:

- focused Workflow service progression matrix;
- focused renderer progression tests;
- focused dispatch fail-closed tests;
- WIR routed-target preservation proof;
- Greenfield/shared-execution preservation proof;
- validation planner preview for exact changed paths;
- repair/affected-capability validation;
- `git diff --check`.

The current MCP `test_toolbox` defect (`Unsupported toolbox request fields`) is a separate Agent Harness defect. If still present, use the repository-authoritative normal Windows validation lane and report that tooling defect separately. Do not stop this repair to ask the Operator for runtime symptom detail already resolved by source review.

## Acceptance criteria

RWS06-REPAIR01 passes when:

1. Intake, Architect/RCA, Planning, and Execution share one application-owned exact Workflow reload handoff.
2. all six existing-project Workflow families route from freshly persisted SQL after a stage-changing command.
3. Refactor / Migration Intake reaches Architect Migration Assessment through the shared progression path.
4. Plan approval immediately enters shared Execution from persisted `work-item-map`.
5. no supported Workflow requires leave/reopen to observe its persisted next stage.
6. Feature and Issue unknown/mismatched workspaces fail closed rather than enter Execution.
7. direct-start and WIR-routed target Workflows behave identically after creation.
8. SQL remains the only stage authority.
9. existing Greenfield, Research closure, execution, validation, repair, and integration behavior remains intact.
10. focused regression and exact changed-path validation pass.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06_REPAIR01_IMPLEMENTER_REPORT.md`

Include:

- files changed;
- exact progression callback contract;
- stage boundaries moved from local state to application re-resolution;
- six-Workflow service matrix results;
- renderer Intake -> Architect -> Planning -> Execution proof;
- dispatch fail-closed proof;
- direct/WIR equivalence proof;
- tests modified/added and coverage justification;
- validation receipts;
- unrelated failures or blockers.

Do not include speculative RCA of the Operator's click behavior or request additional runtime description unless new source evidence contradicts this card.

## Checkpoint and return path

Commit:

`RWS06-R01 converge existing-project workflow progression`

Then return to RWS06 Architect source review / acceptance.
