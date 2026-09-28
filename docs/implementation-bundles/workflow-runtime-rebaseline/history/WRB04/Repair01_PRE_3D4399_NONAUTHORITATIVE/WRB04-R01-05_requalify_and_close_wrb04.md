# WRB04-R01-05 — Requalify Shared Execution and Close WRB04

**Parent:** WRB04 Repair01  
**Depends on:** WRB04-R01-04 passing checkpoint/report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Perform final WRB04 qualification against the repaired shared Feature/Issue execution path and produce the closure evidence required for Architect acceptance.

This is a qualification/closeout card.

It is not authorization for another broad production implementation pass.

If qualification discovers a new production defect, stop and report it to the Architect. Do not silently absorb it into this card.

## 1. Verify repair checkpoints

Before qualification, verify:

- R01-01 WorkItem planning/decomposition report/checkpoint;
- R01-02 human Criterion evidence report/checkpoint;
- R01-03 Phase validation report/checkpoint;
- R01-04 runtime interaction report/checkpoint.

Repository must contain only expected current work before qualification begins.

## 2. State/action coverage audit

Produce one bounded table in the final report covering every reachable shared execution state:

| Canonical state / obligation | Application action | Shared Workspace control | Permanent proof |
| --- | --- | --- | --- |

At minimum cover:

- WorkItem execution planning required;
- WorkItem decomposition candidate;
- ready WorkItem;
- Implementer running;
- Implementer pending approval;
- Implementer pending input;
- Implementer MCP elicitation;
- Implementer cancelled/failed/rerunnable;
- validation_pending;
- Tester running;
- Tester pending approval/input;
- Tester no permanent test required;
- Tester test-only checkpoint;
- deterministic WorkItem Criterion;
- semantic WorkItem Criterion;
- visual WorkItem/solution Criterion;
- Operator WorkItem/solution Criterion;
- failed Criterion → Repair;
- active Repair;
- Repair completed/requeued parent;
- WorkItem complete;
- deterministic Phase Criterion;
- semantic Phase Criterion;
- visual/deferred Phase Criterion;
- Operator Phase Criterion;
- Phase complete;
- Workflow execution complete;
- integration-ready;
- integration conflict/validation failure;
- Integration Repair;
- declared Operator integration decision;
- integrated/closed Workflow.

A state with no valid action/control is a failed qualification.

## 3. Feature source-backed vertical

Use a disposable managed Current Project with linked Dev and one direct Feature.

The fixture must exercise a nontrivial path:

1. Feature intake/assessment/accepted plan;
2. Work Item Map;
3. Architect WorkItem execution planning;
4. typed decomposition OR explicit proof that no decomposition is required, with at least one decomposition scenario separately covered;
5. exact Implementer contract containing persisted Architect boundaries/path/proof intent and WorkItem + solution Criteria;
6. source materialization;
7. Implementer;
8. one exact interaction request/response fixture;
9. implementation checkpoint;
10. Tester;
11. one Tester interaction request/response fixture;
12. Validator;
13. one human-policy WorkItem/solution Criterion;
14. one failed Criterion → canonical Repair;
15. Repair shared execution loop;
16. WorkItem completion;
17. phased path with at least one Phase Criterion;
18. Phase validation/close;
19. Workflow execution completion;
20. exact Workflow integration through `createWorkflowIntegrationService`;
21. linked-Dev advancement;
22. Workflow closed.

Do not replace this with separate service proofs that never compose.

## 4. Issue vertical

Use an accepted Issue RCA/correction plan.

Prove that after the Issue front half:

- exact fix WorkItem enters the same shared WorkItem planning boundary;
- Implementer/Tester/Validator/Repair are the same services;
- Phase behavior is shared if phased;
- exact Workflow integration is shared;
- no Issue Fix Card/private Issue execution identity owns the Current Project target.

Issue RCA remains valid pre-plan context.

## 5. WIR target convergence

Route one Work Intake to Feature.

Prove:

- WIR remains a closed routing summary;
- exact `targetWorkflowId` opens the Feature front half;
- target uses the same WorkItem planning/execution Workspace as direct Feature;
- no target planning/execution/source/integration authority is keyed by WorkIntake;
- no `routedDevelopmentExecutionService` owns target execution.

## 6. Source-neutral vertical

Prove one exact source-neutral Workflow through:

```text
WorkItem planning
→ Implementer
→ Tester
→ Validator/human policy as applicable
→ completion
→ Workflow closed
```

No:

- RepositoryCheckout;
- SourceCheckpoint;
- fake revision;
- IntegrationRecord.

## 7. Tester lifecycle qualification

Prove both:

- `NO_PERMANENT_TEST_REQUIRED` / equivalent no-test result succeeds;
- one Tester-owned permanent proof change can modify the allowed test/fixture/support/catalog surface and checkpoint it.

Validator consumes the correct post-Tester candidate.

No routine full-suite gate is introduced.

## 8. Restart/reopen matrix

Using durable SQLite/source fixtures, recreate application services after each meaningful boundary.

At minimum reopen after:

1. accepted WorkItem execution plan;
2. typed decomposition;
3. ready WorkItem;
4. successful Implementer / validation-pending;
5. TesterResult/checkpoint;
6. Validator evidence;
7. human Criterion evidence/Decision;
8. active Repair;
9. completed WorkItem;
10. Phase validation pending;
11. Phase evidence complete;
12. Phase closed;
13. integration-ready Workflow;
14. retained integration candidate;
15. retained Integration Repair;
16. integrated/closed Workflow.

Running external model processes need not survive process death.

For a process death during a pending interactive model request, prove the reopened state is truthful and rerunnable/inspectable; do not claim the old request remains live.

No recovery step may depend on Markdown filename scanning or renderer memory.

## 9. Concurrency qualification

Prove:

- two independent exact Workflows can have Implementer runs concurrently while exact capacity remains;
- shared UI does not disable the second solely because global legacy `busy` is true;
- same exact Workflow checkout still prevents overlapping source-mutating roles;
- source-neutral independent WorkItems may run concurrently within capacity;
- capacity exhaustion returns a bounded visible reason.

## 10. Legacy authority fence

Audit production callers after repairs.

Current Project Feature/Issue target execution must not derive authority from:

- WorkIntake route identity;
- `routedDevelopmentExecutionService`;
- `routedDevelopmentExecutionBinding`;
- private Issue Fix Card execution;
- Markdown/currentWorkflow reconstruction;
- project-wide execution-plan selection.

Retained legacy modules are acceptable only when exact remaining callers are documented and cannot be reached from the new Current Project target path.

Do not delete unrelated legacy code merely to make grep output empty.

## 11. Desktop usability smoke

Run the supported desktop launch smoke.

If the window is available to automation/manual inspection, verify:

- direct Feature enters Feature front half then shared execution;
- Issue enters Issue front half then same execution;
- WorkItem Planning contains the Architect interaction, not a raw text-only status panel;
- exact interaction panels render when fixture state requires them;
- human Criterion and Phase actions are visible only when applicable;
- errors/status are visible;
- Back to Workflows returns to Hub;
- reopening a Workflow returns to SPS-derived stage.

If the environment does not expose the desktop window, state that limitation exactly.

Deterministic renderer interaction tests must still prove the user actions.

Do not claim visual acceptance from `npm start` exit code alone.

## 12. Validation

Run the bounded final proof set:

- build;
- R01-01 focused WorkItem planning/decomposition tests;
- R01-02 human Criterion tests;
- R01-03 Phase validation tests;
- R01-04 exact runtime interaction/concurrency tests;
- Feature composed vertical;
- Issue composed vertical;
- WIR target convergence;
- source-neutral composed vertical;
- restart/reopen matrix;
- direct exact Workflow integration service test;
- shared renderer interaction tests;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`;
- desktop launch smoke.

Do not run the historical full repository suite merely for ceremony.

## 13. Final report and parent status

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair01/Reports/WRB04-R01-05_FINAL_QUALIFICATION_REPORT.md`

The report must include:

- exact checkpoints;
- state/action coverage matrix;
- Feature/Issue/WIR/source-neutral results;
- recovery matrix;
- concurrency results;
- legacy caller audit;
- desktop evidence/limitations;
- remaining unrelated debt;
- explicit statement that no WRB05 work or web migration started.

Update parent WRB04 README/rebaseline to **qualification complete / awaiting Architect acceptance**.

Do not declare WRB04 accepted on the Implementer's authority.

## Checkpoint and STOP

Commit:

`WRB04-R01-05 requalify shared execution runtime`

Then STOP for final Architect review.

Do not begin WRB05.
