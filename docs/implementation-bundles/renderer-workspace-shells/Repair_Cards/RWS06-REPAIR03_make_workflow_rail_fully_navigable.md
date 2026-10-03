# RWS06-REPAIR03 — Make Workflow Rail Fully Navigable Without Changing Canonical Stage

**Status:** IMPLEMENTER_READY
**Parent:** RWS06 — Remaining Workspace and Structured-State Completion
**Depends on:** RWS06-REPAIR02 — Advance Canonical Workflow State on Stage Completion
**Failed human validation finding:** rail stages marked Not Ready are disabled and cannot be inspected
**Repair type:** renderer navigation / read-only stage inspection

## Confirmed defect

The Workflow rail currently conflates two different concepts:

1. **canonical Workflow progression** — which stage actually owns the next required work; and
2. **Operator navigation** — which stage the Operator wants to inspect.

Current rail implementations disable future/not-ready stages and often disable completed prior stages. In the Intake rail, only Intake is clickable. In the Architect rail, Intake is disabled and Planning is clickable only when ready. Later stages are hard-coded disabled.

That is not the intended Operator experience.

The rail is a secondary navigation surface. It must not be the state machine, but every stage card should still be inspectable.

## Governing invariant

Keep these identities separate:

```text
Workflow.currentWorkspace
    = authoritative first incomplete required stage
    = persisted SQL
    = controls where normal Workflow open/reopen lands
    = changed only by governed stage completion

inspectedStage
    = temporary renderer navigation selection
    = not authoritative
    = never persisted as Workflow progress
    = may point at completed, current, or not-ready stages
```

Opening/reopening a Workflow defaults `inspectedStage` to the canonical stage derived from `Workflow.currentWorkspace`.

Clicking a rail card changes only `inspectedStage`.

## Objective

For every substantive existing-project Workflow, the Operator can click any rail card:

- completed prior stage -> inspect its persisted evidence/history;
- canonical current stage -> work normally;
- future/not-ready stage -> enter that stage surface in a clearly blocked/read-only state showing why work cannot begin.

No rail click may advance or regress canonical Workflow state.

## Required behavior

### 1. Every stage rail card is navigable

For substantive existing-project Workflows, all seven stage cards must be clickable:

1. Intake
2. Architect Assessment / RCA
3. Planning / Correction Planning
4. Topology / Work Item Map
5. Execution
6. Validation
7. Close

A status of `Not Ready` means work actions are unavailable. It does **not** mean the card is disabled for inspection.

Accessibility text must distinguish:

- current required stage;
- completed stage;
- not-ready stage;
- inspected stage.

Do not label a not-ready stage as "Workflow step unavailable" merely because work cannot yet be performed.

### 2. Introduce presentation-only inspected stage state

Add one bounded renderer navigation state owned by the application/workflow shell.

It may be named `inspectedStage`, `selectedRailStage`, or equivalent.

Rules:

- initialize/reset from persisted `Workflow.currentWorkspace`;
- reset to canonical stage after an authoritative progression reload;
- reset when opening a different Workflow;
- rail click changes only this renderer state;
- never write it to SQL;
- never pass it to a domain mutation as a destination;
- never let it substitute for `currentWorkspace`.

This is presentation state, not canonical workflow state.

### 3. Current stage remains fully functional

When the inspected stage equals the canonical current stage, render the existing normal work surface with its ordinary actions and gates.

Examples:

- current Architect stage -> Architect output/review actions work;
- current Planning -> Plan authoring/review works;
- current Execution -> Implementer/Tester/validation/close actions work.

RWS06-REPAIR02 remains responsible for advancing canonical state on completion.

### 4. Completed stages are inspectable, not editable by default

When the Operator selects a completed prior stage, show persisted evidence for that stage without reopening its governed work.

Examples:

- Intake -> exact saved Intake and disposition;
- Architect/RCA -> accepted review projection and semantic output;
- Planning -> accepted Plan/review projection;
- Topology -> accepted Work Item Map;
- completed Execution/Validation/Close -> available historical projection/evidence.

Do not create a new revision merely by viewing a completed stage.

Existing explicit revision/reopen mechanisms, where governed and supported, remain separate actions. Rail navigation alone never reopens work.

### 5. Future/not-ready stages open in blocked inspection mode

When the Operator selects a stage after the canonical current stage:

- render a recognizable stage-specific surface or bounded stage inspection shell;
- prominently show `Not Ready`;
- show the exact prerequisite/blocker needed to make it current;
- disable/hide all state-changing work controls;
- allow safe read-only context that already exists.

Examples:

- future Architect stage while Intake incomplete:
  - show Architect Assessment surface/context;
  - blocker: current Intake must be approved;
  - no Save Architect output / review actions.

- future Planning while Architect incomplete:
  - blocker: current Architect/RCA revision must be approved;
  - no candidate save/review.

- future Execution before accepted Plan:
  - blocker: accepted Plan / Work Item Map required;
  - no Implementer/Tester/validation controls.

Do not call service mutations to manufacture readiness merely because the stage is being inspected.

### 6. Read services must support inspection without weakening mutation gates

Where current stage services throw simply because prerequisites are incomplete, introduce or reuse bounded read projections that can describe stage readiness/blockers without authorizing work.

Prefer:

- read model says `ready: false` plus reason/blockers;
- mutation commands retain their existing strict preconditions.

Do **not** weaken save/review/execute commands just to make a future stage render.

Do **not** mutate on read.

If a generic read-only Stage Inspection model is the smallest clean solution, it may be added, but it must derive from existing SQL authority and must not become another workflow state machine.

### 7. One rail model across the workflow

Current rail behavior is duplicated between:

- App-level `workflowStageRailModel.ts`;
- `StructuredArchitectWorkspace`;
- later workspace-specific navigation.

Converge enough of this duplication that stage labels/status/clickability cannot disagree across surfaces.

The repair does not require a wholesale visual redesign, but there should be one canonical renderer mapping for:

- stage IDs/order;
- labels per workflow family;
- canonical current stage;
- completed/current/not-ready status;
- selected/inspected stage;
- rail click target.

### 8. Canonical open behavior from RWS06-REPAIR02 wins

Normal Workflow open/reopen must always start on the canonical first incomplete stage.

Example:

```text
Intake approved
Workflow.currentWorkspace = refactor-assessment

open Workflow
-> Architect Migration Assessment

Operator clicks Intake
-> inspect completed Intake

Operator leaves/reopens Workflow
-> Architect Migration Assessment again
```

Likewise, clicking future Planning while Architect is current must not make a later reopen land at Planning.

## Stage status semantics

At minimum support these presentation states:

- **Completed** — authoritative stage completion evidence exists and canonical Workflow is beyond it.
- **Current / Open** — this is the canonical first incomplete required stage.
- **Not Ready** — stage is after canonical current stage and prerequisites are incomplete.
- **Terminal / Closed** where applicable.

Selection/inspection is orthogonal to status.

A selected Not Ready stage remains Not Ready.

## Expected production scope

Likely renderer owners:

- `src/renderer/app/WorkflowStageRail.tsx`
- `src/renderer/app/workflowStageRailModel.ts`
- `src/renderer/app/StructuredWorkflowWorkspace.tsx`
- `src/renderer/app/App.tsx`
- `src/renderer/app/WorkflowIntakeWorkspace.tsx`
- `src/renderer/app/StructuredArchitectWorkspace.tsx`
- `src/renderer/app/ExactWorkflowPlanningWorkspace.tsx`
- `src/renderer/app/WorkflowExecutionWorkspace.tsx`

Potential bounded read-model owners only if required for not-ready inspection:

- existing Intake/Architect/Planning/Execution read services;
- shared stage-readiness contracts.

Avoid changes to stage-completion mutation semantics; those belong to RWS06-REPAIR02.

## Preserve

- SQL `Workflow.currentWorkspace` as sole canonical progression authority;
- RWS06-REPAIR02 completion-to-next-stage semantics;
- exact Workflow identity;
- Intake/Architect/Plan approval and revision gates;
- fail-closed mutation commands;
- direct/WIR equivalence;
- shared Execution;
- Research no-Plan closure;
- Greenfield workflow behavior unless explicitly required by a shared presentation helper;
- generated Markdown as projection only.

## Forbidden changes

- no rail click that mutates `Workflow.currentWorkspace`;
- no rail click that calls Prepare merely to make a stage current;
- no renderer-owned canonical progression state;
- no mutation-on-read;
- no weakening service preconditions;
- no automatic reopening/revision of completed stages;
- no special-case production Workflow IDs;
- no schema migration;
- no duplicate per-workflow rail state machines;
- no broad visual redesign.

## Regression proof

### 1. Full rail clickability

For all six existing-project substantive workflow families, prove all seven rail cards are interactive regardless of readiness.

Do not assert that Not Ready means disabled.

### 2. Canonical versus inspected stage

For each family:

1. establish canonical Intake;
2. inspect future Architect/Planning/Execution;
3. assert `Workflow.currentWorkspace` never changes;
4. reopen Workflow;
5. assert it returns to canonical Intake.

Repeat after canonical advancement to Architect and Planning.

### 3. Completed-stage inspection

After Intake approval advances canonical state to Architect:

- click Intake;
- render exact completed Intake evidence;
- no Intake save/review mutation occurs merely by viewing;
- reopen -> Architect.

After Architect approval advances to Planning:

- click Architect;
- render accepted review;
- no new Architect cycle/revision is created;
- reopen -> Planning.

### 4. Not-ready inspection

At minimum prove:

- Architect can be inspected while Intake current;
- Planning can be inspected while Architect current;
- Execution can be inspected before Plan acceptance.

Each must show a stage-specific Not Ready reason and expose no work mutation capable of bypassing prerequisites.

### 5. Current-stage work remains functional

When selected stage equals canonical current stage, existing focused tests for Intake, Architect, Planning, Execution, Validation and Close remain green.

### 6. Direct/WIR equivalence

Rail inspection behavior must be identical for direct and WIR-routed target Workflows.

## Correct stale tests

Revise tests that currently assert:

- future rail stages are disabled;
- lack of `onClick` is expected for Not Ready;
- prior stages become inaccessible after progression.

Replace with assertions that distinguish navigation availability from work readiness.

## Validation

Required focused proof:

- renderer navigation owner;
- stage-specific read-only/blocker projections used by the rail;
- RWS06-REPAIR02 progression matrix;
- WIR routed-workspace preservation;
- shared Execution preservation;
- production build/static validation;
- exact changed-path repair plan/profile;
- `git diff --check`.

Use `test_toolbox` for focused validation.

No full/release qualification for this bounded renderer/navigation repair.

## Acceptance criteria

RWS06-REPAIR03 passes when:

1. every rail stage is clickable for inspection;
2. rail selection never changes canonical `Workflow.currentWorkspace`;
3. normal Workflow open/reopen lands on the canonical first incomplete stage;
4. completed prior stages are inspectable without reopening work;
5. future stages are inspectable in explicit Not Ready/read-only mode;
6. state-changing controls are unavailable when the inspected stage is not canonical/ready;
7. current-stage work remains fully functional;
8. rail labels/status remain consistent across Intake, Architect, Planning and Execution surfaces;
9. direct and WIR-routed targets behave identically;
10. focused regression and exact-path validation pass.

## Human acceptance

Operator validation must confirm on a real existing-project Workflow:

- reopening lands on the current work stage;
- clicking a completed stage opens it for inspection;
- clicking a future Not Ready stage opens that workspace/view but does not allow work;
- returning/reopening lands back on the canonical current stage.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06_REPAIR03_IMPLEMENTER_REPORT.md`

Include:

- renderer navigation state introduced;
- canonical-vs-inspected state boundary;
- stage readiness/read-only model used;
- rail duplication removed/converged;
- completed-stage inspection proof;
- future-stage Not Ready proof;
- no-mutation-on-navigation proof;
- direct/WIR proof;
- focused validation receipts;
- remaining human validation.

## Checkpoint

Commit:

`RWS06-R03 make Workflow rail inspection fully navigable`

Implement after RWS06-REPAIR02 so canonical progression semantics are stable first.
