# RWS06B-REPAIR01 — Persist Exact Planning Workspace Identity

**Status:** IMPLEMENTER_READY  
**Parent:** RWS06B — Exact Workflow Planning Adapters and Prompt Convergence  
**Failed review checkpoint:** `4da5a0142da3ed719ee57446f0316521244e382b`  
**Review baseline through:** `ce5e5c6ec0c96303cc9af498cef79e304db709e0`  
**Repair type:** source-level lifecycle persistence defect

## Failed review evidence

RWS06B created the shared exact-Workflow Planning service and renderer, but entry into Planning is not durably recorded by the current structured path.

Confirmed production path:

- `StructuredArchitectWorkspace` records the current exact Architect review through `recordArchitectReview(...)`.
- `ExactWorkflowPlanningWorkspace` then calls `prepareExactWorkflowPlanning(workflowId)`.
- `createExactWorkflowPlanningService()` currently returns `{get, prepare: get, ...}`; Prepare is only a read.
- The renderer sets local `planning=true`, so Planning appears during that mounted session.
- SQL `Workflow.body.currentWorkspace` remains at the Architect stage.
- Reopening the Workflow reconstructs from SQL through `workflowPlanningSurface()`, so the durable stage can fall back to Architect instead of the active Planning review.

The older Feature/Issue acceptance methods contain `feature-planning` / `issue-planning` transitions, but the RWS05/RWS06 structured Architect path uses `recordArchitectReview()`, not those legacy acceptance commands. They do not make the current shared path durable.

The RWS06B planning test fixture also starts workflows directly at `currentWorkspace: "planning"`, so it does not prove the real Intake → Architect → Prepare Planning transition.

## Confirmed defect

The renderer owns a workflow-stage transition that belongs to Structured Project State.

A user can enter exact Planning, leave/reopen the Workflow, and have the application reconstruct an earlier Architect stage because the Planning transition was never persisted.

This violates RWS06B's exact SQL-backed Planning contract.

## Root cause

The shared exact Planning service treated `prepare` as an alias for `get`, while `ExactWorkflowPlanningWorkspace` used local React state to represent entry into Planning.

The application therefore has two conflicting stage authorities:

```text
SQL Workflow.currentWorkspace = Architect stage
renderer local planning=true    = Planning stage
```

The repair must restore one durable stage authority: the exact SQL Workflow record.

## Objective

Make explicit entry into exact Planning a transactional Structured Project State transition for all six existing-project substantive Workflow families.

After Prepare Planning, reopening the same Workflow must reconstruct the same Planning surface from SQL without relying on renderer-local history.

## Architecture decision

Use the existing exact Planning workspace identities where already established and one shared Planning identity for the four workflow families that were added through RWS06:

- `feature-capability` → `feature-planning`
- `issue-resolution` → `issue-planning`
- `refactor-migration` → `planning`
- `integration-composition` → `planning`
- `infrastructure-platform` → `planning`
- `research-prototype` → `planning`

`planning` is a shared renderer/application stage disambiguated by exact Workflow type and ID. Do not create four duplicate route-specific Planning workspace implementations.

For Research, `planning` is also the durable post-Assessment surface for an approved typed `no-implementation-plan-required` outcome. That surface may offer Research closure without creating a Plan, WorkItem, or source mutation.

## Required implementation

### 1. Make Prepare Planning a real application command

Replace `prepare: get` in `createExactWorkflowPlanningService()` with a bounded prepare operation.

The command must:

1. load the exact active Workflow;
2. validate the current approved Intake and exact current approved Architect review using the existing `context(...)` rules;
3. preserve Research typed-outcome requirements;
4. derive the expected Planning workspace from the mapping above;
5. transactionally revise only `Workflow.body.currentWorkspace` to that Planning workspace;
6. record the normal StateChange/outbox mutation evidence;
7. return the current exact Planning model.

It must be idempotent when the Workflow is already in its expected Planning workspace.

It must not move an accepted `work-item-map` Workflow backward into Planning.

It must reject an unrelated/stale workspace transition rather than silently rewriting arbitrary Workflow state.

### 2. Reconstruct Planning from SQL

Update `workflowPlanningSurface()` / exact renderer dispatch so:

- Feature at `feature-planning` reopens the exact Planning surface;
- Issue at `issue-planning` reopens the exact Planning surface;
- Migration / Integration / Infrastructure / Research at `planning` reopen the exact Planning surface;
- the four Architect assessment workspace IDs still open the Architect portion of the same shared exact workspace;
- `work-item-map` and later exact execution stages continue routing to execution.

Do not make local `planning` state the authority for initial stage selection. Local state may still control immediate presentation after the persisted command returns, but it must agree with the returned/persisted Workflow state.

### 3. Preserve Research no-Plan semantics

An approved Research outcome of `no-implementation-plan-required` may enter the durable `planning` surface so the user can inspect the outcome and invoke the existing exact Research close command.

It must still:

- create no `PlanReviewCycle`;
- create no BoundedSolution/WorkItems for implementation;
- create no source checkout/checkpoint;
- reject execution;
- close only through the existing exact typed Research closure command.

### 4. Preserve accepted Plan transition

Plan approval already materializes the canonical graph and advances the Workflow to `work-item-map`.

Do not change deterministic topology, PlanReviewCycle semantics, materialization identity, or execution readiness.

The repair ends at durable Planning entry/reopen.

## Expected production scope

Primary:

- `src/main/workPlanning/exactWorkflowPlanningService.ts`
- `src/renderer/app/workflowPlanningDispatch.ts`
- `src/renderer/app/ExactWorkflowPlanningWorkspace.tsx`

Potential narrow Structured Project State support:

- `src/shared/projectState/projectStateService.ts` only if a bounded typed transition helper is preferable to direct service-layer mutation;
- existing IPC/preload contracts only if the current Prepare return type must expose the persisted Workflow stage.

Do not modify schema or introduce a new persistence mechanism.

## Preserve

Do not change:

- RWS06A deterministic topology resolver;
- exact Plan candidate/review contracts;
- route-specific prompt/profile content;
- direct/WIR target equivalence;
- Feature/Issue accepted graph adoption;
- SourceBaseline/currentness rules;
- WorkItem kinds;
- Research no-Plan outcome semantics;
- execution/validation/repair/close logic from RWS06G–I;
- optional WIR behavior;
- Greenfield Project Creation planning;
- unrelated RWS06J work or dirty files.

## Forbidden changes

- No renderer-only substitute state for persisted Workflow stage.
- No new Markdown authority.
- No route-specific duplicate Planning renderer for Migration/Integration/Infrastructure/Research.
- No schema change.
- No automatic Plan creation for Research no-Plan outcomes.
- No regression from `work-item-map` back to Planning.
- No broad lifecycle refactor.

## Regression proof

Inspect existing ownership before adding tests. Prefer extending:

- `test/workflow/workflow-application-service.test.cjs`
- `test/workflow/workflow-planning-ipc.test.cjs`
- existing renderer/workflow hub dispatch tests if needed.

Prove the real production lifecycle for all six exact workflow types:

1. start exact Workflow from its normal entry;
2. save/approve Intake;
3. prepare/save/approve structured Architect assessment/RCA;
4. invoke production Prepare Planning;
5. assert the SQL Workflow `currentWorkspace` equals the mapping in this card;
6. discard renderer-local state / reopen;
7. assert workflow dispatch reconstructs exact Planning;
8. save/review a Plan and prove accepted graph still advances to `work-item-map`.

Also prove:

- Prepare Planning is idempotent at the expected Planning stage;
- stale/unapproved Architect state cannot advance;
- accepted `work-item-map` cannot be moved backward;
- Research no-Plan reopens the durable post-Assessment Planning/outcome surface, creates no Plan/WorkItems, and still rejects execution.

Do not use fixtures that begin directly at `currentWorkspace: "planning"` as the only proof of this defect.

## Validation

Run the repair profile with the exact changed-path set plus focused production lifecycle proof.

Required reporting:

- validation planner preview;
- repair/affected validation selected for exact paths;
- focused exact workflow application/planning tests;
- focused renderer dispatch test if modified;
- `git diff --check`.

Broader unrelated failures remain separate evidence and are not part of this repair.

## Acceptance criteria

RWS06B-REPAIR01 passes when:

1. Prepare Planning durably revises the exact SQL Workflow stage.
2. All six exact workflow families reopen into the correct Planning/outcome surface from SQL.
3. Feature/Issue preserve `feature-planning` / `issue-planning`.
4. Migration/Integration/Infrastructure/Research use the shared `planning` stage.
5. Research no-Plan remains implementation-free and can still close through its typed outcome.
6. Accepted Plans still advance to `work-item-map`.
7. No renderer-local stage state is required to recover Planning after reopen.
8. Focused repair proof passes without weakening currentness or identity checks.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06B_REPAIR01_IMPLEMENTER_REPORT.md`

Include:

- confirmed root cause;
- exact files changed;
- per-workflow persisted workspace matrix;
- real lifecycle/reopen proof;
- Research no-Plan proof;
- existing tests reused/extended and any new-test coverage-gap justification;
- repair-profile commands/results;
- unrelated failures;
- deviations or blockers.

## Checkpoint and return path

Commit:

`RWS06B-R01 persist exact planning workspace identity`

After the bounded repair and its proof, return to the existing RWS06 bundle/J qualification workflow. No new approval gate is created by this card.
