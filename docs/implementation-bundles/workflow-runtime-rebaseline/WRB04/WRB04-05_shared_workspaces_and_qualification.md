# WRB04-05 — Converge Shared Execution Workspaces, Fence Legacy Execution, and Qualify WRB04

**Depends on:** WRB04-04 checkpoint  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Make the WRB04 shared execution kernel the only Current Project post-plan path for Feature and Issue, provide one reusable Workspace family, retire/fence the replaced route-owned/private Issue execution path, and qualify the bundle end-to-end.

After this card, stop for Architect review. Do not begin WRB05.

## 1. Shared execution Workspace family

After WRB03 `work-item-map`, Feature and Issue must enter the same task-oriented UI family.

Required surfaces, names may vary:
- Work Item Map / eligibility;
- Work Item planning/decomposition;
- Implementer execution/status;
- Tester regression design;
- Validation review;
- Repair;
- Work Item close/next;
- Phase validation/close when applicable;
- Workflow completion/integration;
- Integration Repair when required.

Workflow type may affect labels/context only where the user task genuinely differs.

Do not create parallel Feature Work Card and Issue Fix Card execution UI stacks.

## 2. Exact navigation and recovery

Every execution Workspace receives exact workflowId and workItemId/phaseId/integrationId as applicable.

Restart/reopen recovers from SPS/runtime receipts:
- current WorkItem stage;
- current implementation attempt;
- source checkpoint;
- Tester result;
- Validation/Repair;
- Phase state;
- Integration candidate/repair.

Do not infer stage from latest Markdown filename.

Same-title/same-type Workflow instances remain independent.

## 3. Implementer/Tester/Validator role presentation

The UI must make role boundaries intelligible without creating human approval bureaucracy.

Implementer:
- bounded handoff/status/report.

Tester:
- determination summary;
- regression-design action/result;
- permanent proof changes or NO_PERMANENT_TEST_REQUIRED.

Validator:
- Criterion results;
- independent semantic result where required;
- visual/operator actions only when policy declares them.

Do not ask the Operator to approve routine Tester or deterministic Validator work.

## 4. Repair presentation

A failed validation shows:
- affected WorkItem;
- failed Criteria/evidence;
- canonical Repair identity;
- repair scope;
- same shared execution loop.

Nested repair lineage remains understandable.

The UI must not resurrect legacy Repair Markdown as canonical state.

## 5. Current Project legacy execution fence

Search production renderer/main/preload paths and ensure exact Feature/Issue post-plan navigation does not invoke:
- route-owned `workPlanningKernel`;
- `routedDevelopmentExecutionBinding`;
- `routedDevelopmentExecutionService`;
- WorkIntake-keyed `structuredIntegrationService`;
- private `issueExecutionPlan`;
- old Issue Fix Card execution ownership;
- old `currentWorkflowService` Markdown execution pipeline as Current Project authority.

Delete zero-production-caller modules/tests where bounded and safe.

If a module remains for Project Creation, unsupported historical paths, or later WRB05 work, document the exact remaining caller. Do not add a legacy/current mode switch.

## 6. Vertical qualification — Feature

Use a disposable source-backed Current Project.

1. Start/plan Feature through WRB03 canonical graph.
2. Open Work Item Map.
3. Enter shared Work Item execution.
4. Materialize exact Workflow source lazily.
5. Run a bounded Implementer fixture/adapter.
6. Record ImplementationRecord + implementation checkpoint.
7. Run Tester determination and one outcome.
8. Run independent Validator.
9. Trigger at least one Repair scenario and close it through same loop.
10. Close WorkItem/Phase as applicable.
11. Mark Workflow execution complete.
12. Build/validate integration candidate from managed linked Dev.
13. Integrate to Dev.
14. Confirm final Workflow closure and exact IntegrationRecord.

## 7. Vertical qualification — Issue

Repeat the same post-plan kernel from an Issue correction graph.

Issue-specific RCA remains context only.

Prove:
- canonical `fix` WorkItem enters same Work Item planning/Implementer/Tester/Validator/Repair UI/services;
- no private Issue execution binding/Fix Card engine;
- same source checkpoint and integration service;
- exact same completion rules.

## 8. Direct vs WIR-routed convergence

For at least one WIR-routed Feature:
- route creates target;
- target plan is canonical;
- target execution/integration uses exact Workflow service;
- WIR closure/history has no effect on execution;
- no WorkIntake branch/integration identity is reconstructed.

## 9. Non-source qualification

For a non-source Project:
- plan remains valid;
- source-neutral WorkItem can progress through shared semantic execution where applicable;
- no fake Repository/branch/checkpoint/integration is created;
- a source-mutating action fails boundedly with source unavailable.

## 10. Tester/test-suite qualification

Prove:
- implementation-local proof does not automatically become permanent;
- NO_PERMANENT_TEST_REQUIRED is successful;
- one bounded permanent-test update is Tester-owned and test-surface constrained;
- Validator consumes post-Tester revision;
- no full-suite run is inserted into every WorkItem by default;
- Validation Planner receives only durable selected proof.

Do not turn bundle qualification into a universal permanent corpus audit.

## 11. Lean validation strategy

Run:
- build;
- shared execution application tests;
- WorkItem planning/decomposition tests;
- Implementer/checkpoint tests;
- Tester/Determination tests;
- Validator/Repair/completion tests;
- Phase/Workflow completion tests;
- exact Workflow integration + linked-worktree tests;
- shared renderer/navigation tests;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

Run additional selected lanes only when they protect a changed reachable production boundary.

Do not repeatedly run the historical full development/Issue lifecycle suite.

## 12. Bundle report

Write `docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-05_BUNDLE_QUALIFICATION_REPORT.md`.

Include:
- all five checkpoint SHAs;
- final shared services/contracts/Workspace paths;
- exact identity/ownership model;
- Feature/Issue convergence evidence;
- Tester/Determination/Validator evidence;
- Repair recursion evidence;
- Phase/Workflow completion evidence;
- linked-worktree/common-directory integration evidence;
- exact managed Dev integration result;
- legacy execution modules/tests removed or retained with exact caller;
- validation evidence and preview;
- residual WRB05 scope;
- explicit confirmation WRB05 was not started.

## Checkpoint and STOP

Commit:

`WRB04-05 qualify shared Workflow execution kernel`

Then STOP for human Architect review.

Do not begin WRB05.
