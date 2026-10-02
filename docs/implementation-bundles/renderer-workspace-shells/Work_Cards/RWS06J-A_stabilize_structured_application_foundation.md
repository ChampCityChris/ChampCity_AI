# RWS06J-A — Stabilize Structured Application Foundation

**Status:** IMPLEMENTER_READY
**Execution mode:** CONTINUOUS_BUNDLE_STEP — complete this card, write its report, create its checkpoint, then immediately begin RWS06J-B in the same execution run. Do not return to the Operator/Architect between cards. A checkpoint is evidence, not a stop point.
**Parent:** RWS06J — Final Structured-State Cutover, App Shell Cleanup, and Bundle Qualification
**Starting point:** current uncommitted RWS06J working tree on `dev` after `92aceef2ba03e1e0fd4ef46fd2f6e02700ea6641`

## Objective

Stabilize and checkpoint the structured application foundation already implemented under RWS06J before continuing destructive legacy cleanup.

This card owns the current structured router/settings/browser/Greenfield foundation and fixes the three source defects found in Architect review.

## Review findings to repair

### A. Project-wide authority is being flipped from workflow-open actions

Current source adds `selectStructuredWorkflowAuthority(workflowId)` and calls it from Project Creation open, Work Intake open, direct Workflow start, routed target open, and normal Workflow open.

The implementation then calls `advanceProviderGeneration(... authority: "structured")`.

This is incorrect because `project_state_authority` is Project-wide, not Workflow-scoped. Opening one exact Workflow must not mutate global Project authority, especially while J still contains reachable legacy workflow code.

Remove this workflow-open authority mutation and the misleading workflow-scoped public API.

Structured authority selection belongs to the later project-wide cutover card.

### B. Greenfield navigation still allows renderer-local stage authority

`greenfieldNavigationService.ts` currently:

- largely trusts `Workflow.body.currentWorkspace`;
- selects the first non-closed/non-cancelled/non-blocked Phase/WorkItem;
- does not derive the stage from the structured review/lifecycle facts enumerated by RWS06J.

`GreenfieldWorkspace.tsx` additionally accepts `go(destination)`, fetches SQL, and then overrides the returned SQL stage with the caller-provided destination.

That can display a stage the SQL projection did not resolve and can mask a missing durable transition.

Repair the boundary so the renderer never overrides current stage authority. After each mutation, refresh and render the destination resolved by Structured Project State.

The navigation service must derive the applicable current stage and exact Phase/WorkItem identity from current SQL state, review decisions, lifecycle, and execution plan. Blocked active work must not be skipped in favor of later work.

### C. ApplicationBrowserHost reintroduces nested browser-column ownership

RWS05-REPAIR05 established that workflow shells own `.figma-browser-column` and callers pass the unwrapped browser panel.

`ApplicationBrowserHost.tsx` currently returns its own `<div className="figma-browser-column">`, and `StructuredWorkflowWorkspace` passes that component into shells that already own the browser column.

Remove the wrapper from `ApplicationBrowserHost`. It owns native browser attachment/status/reload/retry, not layout-column ownership.

## Preserve current progress

Preserve and include in this checkpoint:

- `StructuredWorkflowWorkspace` as the substantive workflow router;
- `OptionalWorkIntakeWorkspace`;
- `ApplicationSettingsController` / extracted settings workspace;
- SQL-only `workflowIntakeState`;
- removed automatic Phase Map / Phase Loop / WorkItem Planning / WorkItem Review Markdown adoption;
- removed `workReview:migrate`;
- current Issue renderer retirement already performed;
- existing RWS05-REPAIR05 browser/review composition.

## Required proof

Prove:

1. no Workflow-open/start/routed-open path advances provider authority;
2. no renderer/public API named as Workflow authority selection remains;
3. provider generation is unchanged by list/open/start/route operations;
4. Greenfield reopen uses only the SQL navigation projection;
5. Greenfield renderer does not override the resolved stage with a local destination;
6. pending/revision-requested review state resumes at its exact structured stage;
7. blocked current Phase/WorkItem remains current rather than being skipped;
8. historical Markdown cannot alter Greenfield navigation;
9. `ApplicationBrowserHost` renders the browser panel without a `.figma-browser-column` wrapper;
10. browser attach/resize/detach/retry proof remains green;
11. structured router, optional WIR, and settings focused tests remain green;
12. `git diff --check` passes.

Prefer extending existing workflow/application, Phase Planning, workflow-hub, and browser attachment tests. New tests require a coverage-gap justification.

## Expected production scope

- `src/renderer/app/App.tsx`
- `src/renderer/app/StructuredWorkflowWorkspace.tsx`
- `src/renderer/app/GreenfieldWorkspace.tsx`
- `src/renderer/app/ApplicationBrowserHost.tsx`
- `src/main/workflow/greenfieldNavigationService.ts`
- `src/shared/greenfieldNavigationContracts.ts`
- `src/main/workflow/workflowApplicationService.ts`
- `src/main/workflow/workflowApplicationIpc.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- existing tests affected by these exact contracts.

## Forbidden changes

- no project-wide authority cutover in this card;
- no new Markdown migration;
- no legacy workflow restoration;
- no schema redesign;
- no new workflow-specific state machine in `App.tsx`;
- no broad legacy service deletion yet;
- no unrelated test/catalog cleanup.

## Acceptance

The card passes when the currently implemented structured foundation is source-correct, Project authority remains unchanged, Greenfield navigation is genuinely SQL-derived, the browser host respects shell ownership, and focused proof passes.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06J-A_IMPLEMENTER_REPORT.md`

Include exact files changed, the three repaired root causes, focused proof, unrelated failures, and any deviation.

## Checkpoint

Commit:

`RWS06J-A stabilize structured application foundation`

Stage only RWS06J-A attributable paths. This is a mechanical sequence step, not an approval gate.

**Do not stop here.** After the commit succeeds, immediately open and execute RWS06J-B. Do not wait for review, approval, confirmation, or another user message. Stop only for a genuine external blocker that prevents safe continuation and cannot be repaired within the remaining RWS06J cards.
