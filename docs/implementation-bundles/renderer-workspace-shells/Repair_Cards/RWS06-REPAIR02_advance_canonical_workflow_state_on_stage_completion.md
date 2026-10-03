# RWS06-REPAIR02 — Advance Canonical Workflow State on Stage Completion

**Status:** IMPLEMENTER_READY
**Parent:** RWS06-REPAIR01 — Existing-Project Workflow Progression
**Failed human validation checkpoint:** `b957a6adee4127e8fa4a40ce380483180b0b5808`
**Repair type:** canonical stage advancement / workflow reopen defect

## Failed human validation evidence

Operator validation on the rebuilt application still opens the live Refactor / Migration Workflow at Intake even though its exact SQL Intake is already approved.

Exact live Workflow:

- Workflow ID: `d224ccbd-0f64-4524-9945-fd7a72dcb51a`
- Workflow type: `refactor-migration`
- Intake ID: `f6a9b3bc-5d84-4979-ae0e-52daae6ba831`
- Intake version: `1`
- Intake disposition: `Approved`

The current generated Intake projection was regenerated after the repaired build and still reports `Approved`.

The application therefore has authoritative evidence that Intake is complete, yet the Workflow remains persisted at `refactor-intake` and reopens on work that is already complete.

## Confirmed defect

RWS06-REPAIR01 repaired renderer re-resolution after an explicit stage-transition command, but the underlying workflow model still separates:

```text
Operator approves current stage
        ↓
Decision recorded
        ↓
Workflow.currentWorkspace remains on completed stage
        ↓
user must explicitly "Prepare" / click Next
        ↓
second command finally advances currentWorkspace
```

That is the wrong state-machine boundary.

Source review confirms:

### Intake

`recordWorkflowIntakeDecision()` records the exact Operator Decision but does **not** advance the owning Workflow.

The Workflow remains at its entry workspace until a later `prepareArchitectWorkspace()` call changes `currentWorkspace`.

### Architect

`recordArchitectReview()` records the exact Operator Decision but does **not** advance the owning Workflow.

The Workflow remains at its Architect/RCA workspace until a later `prepareExactPlanningWorkspace()` call changes `currentWorkspace`.

### Plan

Plan approval already behaves correctly.

`recordPlanReview(approved)` accepts the canonical graph and advances the Workflow to `work-item-map` inside the governed acceptance path.

This is the desired model.

## Governing invariant

For existing-project substantive Workflows:

> **The persisted Workflow must always identify the first incomplete required stage.**

When a stage becomes complete through its authoritative Operator disposition or completion command, that same governed operation must advance the Workflow to the next required stage.

Opening or reopening a Workflow is read-only:

```text
open exact Workflow
-> read Workflow.currentWorkspace
-> render that persisted stage
```

Opening a Workflow must not mutate SQL merely to catch stale stage state up.

The workflow rail is secondary navigation/status. It is not the mechanism that advances canonical workflow state.

## Objective

Make all six existing-project Workflow families reopen directly on the work that still needs to be done.

Canonical sequence:

```text
new Workflow
-> Intake

approve current Intake
-> Architect Assessment / RCA

approve current Architect Assessment / RCA
-> Planning
   OR Research terminal closure when the approved typed outcome requires no Plan

approve current Plan
-> work-item-map / shared Execution

complete Execution / Validation / Integration
-> existing governed next/terminal state
```

There must be no required "Prepare next stage" click between completed stages.

## Required implementation

### 1. Intake approval advances the owning Workflow atomically

Update the authoritative Intake review path so an `approved` disposition advances the exact active owning Workflow from its canonical Intake entry workspace to the exact Architect/RCA workspace.

For the six existing-project substantive families:

- Feature / Capability -> `feature-assessment`
- Issue Resolution -> `issue-rca`
- Refactor / Migration -> `refactor-assessment`
- Integration / Composition -> `integration-assessment`
- Infrastructure / Platform -> `infrastructure-assessment`
- Research / Prototype -> `research-assessment`

Required semantics:

- create the exact Intake review Decision;
- validate exact Intake version and ownership;
- on `approved`, advance that same Workflow in the same governed operation/transaction;
- record the Workflow state mutation;
- on `revision_requested` or `rejected`, leave the Workflow at Intake;
- never move a Workflow backward;
- never advance another Workflow;
- never infer stage from Markdown.

Project Creation / Greenfield remains governed by its existing Project-specific flow and is out of scope unless a shared helper is factored without behavior change.

### 2. Architect approval advances the owning Workflow

Update the authoritative Architect review path so an approved current Architect/RCA revision no longer leaves the Workflow sitting on a completed Architect stage.

For implementation-bearing outcomes:

- Feature -> `feature-planning`
- Issue -> `issue-planning`
- Migration -> `planning`
- Integration -> `planning`
- Infrastructure -> `planning`
- Research with typed `research-plan-required` outcome -> `planning`

The Workflow advancement must be tied to the exact approved current Architect review and must preserve freshness/identity guards.

On `revision_requested` or `rejected`, remain at the Architect/RCA stage.

### 3. Research no-Plan approval closes instead of waiting for another stage click

For Research / Prototype with one exact typed Architect outcome:

`no-implementation-plan-required`

the approved Architect review represents completion of the substantive Research workflow rather than readiness for Planning.

Do not leave that Workflow sitting on an approved Architect screen requiring a separate navigation click merely to discover that no Plan is required.

Use the existing Research completion semantics and evidence requirements. Preserve the existing typed outcome and terminal `research-close` state.

If atomic closure can be performed safely inside the Architect approval transaction using existing domain rules, prefer that. Do not duplicate Research completion policy in renderer code.

### 4. Opening a Workflow must remain read-only

Do **not** solve stale stage state by mutating during:

- `getWorkflow()`;
- inventory listing;
- App open;
- renderer mount;
- workflow rail rendering.

The persisted Workflow must already be at the correct first incomplete stage before it is opened.

`App.refreshWorkflowStage()` remains useful after a successful stage-completing command so the currently mounted application immediately follows the new persisted state.

### 5. Remove stage-transition responsibility from "Prepare" actions

`prepareStructuredArchitectWorkspace()` and `prepareExactWorkflowPlanning()` may remain as idempotent handoff/readiness preparation helpers if still useful.

They must no longer be the required commands that make canonical Workflow state catch up after approval.

A Workflow reopened after completed Intake/Architect approval must land correctly even if neither Prepare button was ever clicked.

Where existing renderer controls still call these functions, they must not be necessary for normal progression.

### 6. Make renderer completion immediately follow persisted advancement

After the Operator approves:

- Intake;
- Architect/RCA;
- Plan;

the mounted application should call the existing exact Workflow reload boundary and render the new persisted current stage.

The renderer does not choose the destination. It reloads exact identity and dispatches from SQL.

This is immediate UX behavior; the canonical state advancement belongs to the domain/application command.

### 7. Rail becomes secondary status/navigation

Correct any rail assertions that encode a completed stage as current merely because no Prepare button was clicked.

The rail should reflect the persisted current stage and completed prior stages.

Do not require rail interaction to progress normal workflow execution.

Backward/history navigation, if currently supported safely, may remain secondary. Do not expand this repair into a broad navigation-history redesign.

## Existing-project stage ownership

The expected primary persisted progression is:

| Workflow family | Intake complete -> | Architect complete -> | Plan complete -> |
| --- | --- | --- | --- |
| Feature | `feature-assessment` | `feature-planning` | `work-item-map` |
| Issue | `issue-rca` | `issue-planning` | `work-item-map` |
| Migration | `refactor-assessment` | `planning` | `work-item-map` |
| Integration | `integration-assessment` | `planning` | `work-item-map` |
| Infrastructure | `infrastructure-assessment` | `planning` | `work-item-map` |
| Research, Plan required | `research-assessment` | `planning` | `work-item-map` |
| Research, no Plan | `research-assessment` | terminal `research-close` | n/a |

## Expected production scope

Primary domain owner:

- `src/shared/projectState/projectStateService.ts`

Application/service owners likely needing convergence:

- `src/main/workflow/workflowIntakeService.ts`
- `src/main/architectOutputs/structuredArchitectWorkspaceService.ts`
- `src/main/workPlanning/exactWorkflowPlanningService.ts`

Renderer owners only as needed to refresh immediately after approval:

- `src/renderer/app/WorkflowIntakeWorkspace.tsx`
- `src/renderer/app/WorkflowIntakeReview.tsx`
- `src/renderer/app/StructuredArchitectWorkspace.tsx`
- `src/renderer/app/ExactWorkflowPlanningWorkspace.tsx`
- `src/renderer/app/StructuredWorkflowWorkspace.tsx`
- `src/renderer/app/App.tsx`
- stage rail model/tests where stale assumptions exist.

Do not create a new resolver that reconstructs current stage independently from persisted Workflow state.

## Preserve

- SQL as sole Workflow stage authority;
- exact Intake identity/version and Operator disposition;
- Architect semantic freshness and exact review cycle;
- Plan acceptance/topology behavior;
- RWS06-REPAIR01 exact Workflow reload and fail-closed dispatch;
- direct and WIR-routed equivalence;
- source-backed/source-neutral semantics;
- shared WorkItem execution;
- validation, Repair and integration gates;
- Greenfield Project/Phase authoring;
- active Project lifecycle correction from RWS06I-REPAIR02;
- generated Markdown as projection only.

## Forbidden changes

- no mutation-on-open/read;
- no renderer-derived canonical stage;
- no rail-driven required progression;
- no hidden automatic approval;
- no weakening revision/freshness guards;
- no Workflow-ID-specific workaround;
- no schema migration;
- no alternate stage state field;
- no duplicate per-family state machines;
- no broad workflow redesign beyond correcting completion-to-next-stage ownership.

## Regression proof

### 1. Reopen-at-first-incomplete-stage matrix

For all six existing-project substantive Workflow families:

1. create Workflow -> open resolves canonical Intake;
2. save and approve exact Intake;
3. without calling any Architect Prepare transition command, reopen exact Workflow;
4. assert persisted `currentWorkspace` is the exact Architect/RCA stage;
5. save and approve exact Architect output;
6. without calling any Planning Prepare transition command, reopen exact Workflow;
7. assert persisted `currentWorkspace` is exact Planning;
8. approve Plan;
9. reopen exact Workflow;
10. assert `work-item-map` / shared Execution.

This must be a service/application integration proof against real SQL state, not a mocked React destination.

### 2. Mounted application proof

Exercise the actual mounted App flow so that:

- Operator Intake approval causes exact Workflow reload and Architect surface immediately;
- Operator Architect approval causes exact Workflow reload and Planning surface immediately;
- Operator Plan approval causes exact Workflow reload and Execution surface immediately.

No explicit Next/Prepare click may be required between those approvals.

### 3. Reopen proof

After each completed stage, destroy/recreate the relevant renderer/application fixture or otherwise reopen from fresh Workflow state.

Prove it still lands at the first incomplete stage.

This is the regression that failed human validation.

### 4. Negative dispositions

Prove:

- Intake Revision Requested/rejected stays at Intake;
- Architect Revision Requested/rejected stays at Architect/RCA;
- stale revision cannot advance Workflow;
- mismatched Workflow/Intake/review identity cannot advance another Workflow.

### 5. Research split

Prove:

- research-plan-required approval advances to Planning;
- no-implementation-plan-required approval uses the governed Research terminal path and does not enter Planning.

### 6. Direct/WIR equivalence

Run the same persisted progression semantics for direct and WIR-routed targets. Provenance must not alter the state machine.

## Correct stale tests

Remove or revise tests whose expected behavior requires:

- approved Intake to remain at Intake until Prepare is clicked;
- approved Architect review to remain at Architect until Planning Prepare is clicked;
- all future rail stages to stay disabled merely because `currentWorkspace` was not advanced by the approval command.

Do not replace them with source-text assertions. Test the persisted Workflow state and actual application reopen behavior.

## Validation

Use `test_toolbox` for focused proof.

Required:

- six-family existing-project progression matrix;
- mounted App progression owner;
- WIR routed target preservation;
- Research outcome/closure proof;
- shared Execution preservation;
- production build/static validation;
- exact changed-path repair profile/planner preview;
- `git diff --check`.

Do not run full/release qualification for this bounded lifecycle correction.

## Acceptance criteria

RWS06-REPAIR02 passes when:

1. approved Intake atomically advances canonical Workflow state to Architect/RCA;
2. reopening an Intake-approved Workflow never lands on Intake;
3. approved Architect/RCA atomically advances implementation-bearing Workflows to Planning;
4. reopening an Architect-approved Workflow never lands on the completed Architect stage;
5. Research no-Plan uses its governed terminal path rather than entering Planning;
6. Plan approval continues advancing to `work-item-map`;
7. the mounted application follows each persisted advancement immediately through exact Workflow reload;
8. no Prepare/Next/rail click is required merely to make canonical state catch up;
9. direct and WIR-routed Workflows have identical progression semantics;
10. revision-requested/rejected/stale states remain fail-closed;
11. opening/listing a Workflow performs no state mutation;
12. focused validation passes.

## Human acceptance

Final acceptance requires Operator validation on the real rebuilt application:

- opening the existing Migration Workflow lands directly on Architect Migration Assessment because its Intake is already approved;
- completing/approving that assessment subsequently lands directly on Planning without an extra stage-transition click.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06_REPAIR02_IMPLEMENTER_REPORT.md`

Include:

- exact domain commands changed;
- before/after persisted `currentWorkspace` behavior;
- six-family reopen matrix;
- Intake and Architect negative disposition proof;
- Research Plan/no-Plan proof;
- direct/WIR equivalence;
- mounted application progression proof;
- tests corrected because they encoded the old two-step behavior;
- validation receipts;
- remaining human validation.

## Checkpoint

Commit:

`RWS06-R02 advance canonical Workflow state on stage completion`

Then return directly to Architect review and Operator human validation.
