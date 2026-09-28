# WRB04-06 — Converge Shared Execution Workspaces and Qualify WRB04

**Depends on:** completed WRB04-05  
**Implementer:** GPT 6.0 Luna Medium  
**Execution rule:** ONE card, ONE report, ONE commit. Do not split this card.

## Objective

Make the implemented WRB04 runtime usable through one Current Project UI/navigation family, fence obsolete Current Project execution authority, and perform final vertical qualification for Feature and Issue.

This is the final WRB04 card.

## 1. One shared execution Workspace family

After WRB03 planning reaches `work-item-map`, Feature and Issue use the same post-plan surfaces.

Required user tasks:
- Work Item Map / readiness;
- WorkItem execution-contract planning/decomposition;
- Implementer status/run;
- Tester status/run;
- Validator results/actions;
- Repair status/run;
- WorkItem close/next;
- Phase validation/close when applicable;
- Workflow completion/integration;
- Integration Repair when needed.

Workflow type may affect labels/context only.

Do not rebuild parallel Feature and Issue execution UIs.

## 2. Exact navigation and recovery

Every action carries exact IDs:
- workflowId;
- workItemId;
- implementationRecordId / testerResultId / integrationId when relevant.

Reopen/restart derives stage from SPS/runtime evidence.

Do not scan filenames to determine stage.

Same-title/same-type concurrent Workflows remain independent.

## 3. Role presentation

Implementer:
- exact WorkItem contract;
- run/status/result/checkpoint.

Tester:
- determination summary;
- role boundary;
- no-change or proof-change result;
- test checkpoint where applicable.

Validator:
- Criterion-by-Criterion result;
- deterministic/semantic/human/deferred distinction.

Repair:
- exact failed Criterion/evidence;
- canonical Repair WorkItem;
- same shared execution loop.

Operator is requested only for declared human/visual/product decisions.

## 4. Source/integration presentation

Show:
- source-neutral vs source-backed;
- immutable baseline;
- current Workflow revision;
- checkout/source line when prepared;
- integration candidate status;
- conflict/repair/validation state;
- final Dev result.

Do not expose WorkIntake as source/integration owner.

## 5. Current Project legacy fence

Audit renderer/preload/main production callers.

Feature/Issue Current Project execution must not enter:
- `workPlanningKernel`;
- `routedDevelopmentExecutionBinding`;
- `routedDevelopmentExecutionService`;
- WorkIntake-keyed structured integration;
- private `issueExecutionPlan`;
- Issue Fix Card ownership;
- old `currentWorkflowService` Markdown execution authority.

Remove zero-production-caller modules/tests where bounded and safe.

If retained for historical/unsupported paths, document exact remaining production caller.

Do not add a legacy/current mode switch.

## 6. Restart/recovery proof

For an exact Workflow interrupted/reopened at each important stage, recover:
- ready WorkItem;
- running/completed implementation evidence;
- TesterResult/checkpoint;
- Validator results;
- Repair state;
- completed WorkItem/Phase;
- integration candidate/repair;
- final closed Workflow.

Running external agent processes do not have to survive app process death, but durable state must recover to a truthful rerunnable/inspection state.

## 7. Feature vertical qualification

Use a disposable source-backed Current Project:

1. create/plan Feature;
2. Work Item Map;
3. exact execution contract;
4. Implementer;
5. implementation checkpoint;
6. Tester;
7. Validator;
8. force one Repair path;
9. complete Repair;
10. complete WorkItem/Phase;
11. complete Workflow execution;
12. integration candidate from linked Dev;
13. integrate;
14. Workflow closes;
15. reopen/recover final state.

## 8. Issue vertical qualification

Repeat from an accepted Issue correction plan.

Issue RCA remains pre-plan context.

Prove exact fix WorkItem uses the same:
- execution contract;
- Implementer;
- Tester;
- Validator;
- Repair;
- completion;
- integration;
- Workspace family.

No private Issue execution engine.

## 9. WIR convergence qualification

Route one WIR request to Feature.

After target creation:
- WIR stays closed summary;
- target Workflow executes/integrates through exact Workflow services;
- WIR identity cannot control target planning/execution/source/integration.

## 10. Source-neutral qualification

Prove one non-source Workflow:
- implementation;
- source-neutral Tester;
- Validator;
- WorkItem completion;
- Workflow completion;
- no RepositoryCheckout/SourceCheckpoint/IntegrationRecord fabrication.

## 11. Test lifecycle qualification

Prove:
- implementation-local proof is not automatically permanent;
- `NO_PERMANENT_TEST_REQUIRED` is successful;
- one Tester-owned fixture/support/catalog update checkpoints correctly;
- Validator consumes the resulting candidate;
- no full-suite run is inserted as a routine WorkItem gate.

## 12. User-facing usability check

Perform focused renderer/workspace proof and a bounded application launch/smoke sufficient to verify:
- controls are present;
- exact Workflow navigation works;
- no dead-end text-only screens at the implemented Feature/Issue path;
- error/status state is visible;
- Back to Workflows returns to Hub;
- restart/reopen works.

This is engineering/product smoke, not a visual-design redesign.

## 13. Final WRB04 audit

Document:
- active exact services/contracts/workspaces;
- legacy modules removed/retained and exact callers;
- remaining WRB05 scope;
- all WRB04 checkpoint commits;
- focused validation evidence;
- known unrelated test debt;
- explicit statement that no later Workflow-family front half or web-client migration was started.

## Validation

Run:
- build;
- shared execution renderer/navigation tests;
- Feature vertical focused qualification;
- Issue vertical focused qualification;
- WIR handoff regression;
- source-neutral vertical;
- linked-worktree integration proof;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`;
- bounded launch smoke.

Do not use the historical full test suite as the primary acceptance mechanism.

## Report

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-06_FINAL_QUALIFICATION_REPORT.md`

## Checkpoint and STOP

Commit:

`WRB04-06 qualify shared execution runtime`

Then **STOP for human Architect review**.

Do not begin WRB05.
