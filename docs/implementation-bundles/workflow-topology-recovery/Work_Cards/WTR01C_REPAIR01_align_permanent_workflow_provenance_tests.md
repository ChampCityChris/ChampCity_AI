# WTR01C Repair01 — Align Existing Permanent Tests with Workflow Provenance

**Parent card:** WTR01C — Establish WIR-to-Target Workflow Provenance  
**Implementer:** GPT 6.0 Luna Medium  
**Architect finding:** production implementation accepted; three existing permanent tests still encode the removed Work Intake `workflowId` / WIR-as-substantive-execution-owner model  
**Production changes allowed:** none  
**Report:** `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR01C_REPAIR01_IMPLEMENTER_REPORT.md`

## 1. Objective

Repair only the three existing permanent tests that were missed by the WTR01C card scope.

Do not restore `WorkIntakeSummary.workflowId`.

Do not attach substantive execution records to `routingWorkflowId`.

Each affected fixture must represent the corrected topology:

```text
Work Intake
  initiates
WIR Workflow
  routes_to
Independent target Workflow
  part_of
Phase / Work Item execution
```

This is a test-alignment repair. The WTR01C production implementation remains unchanged.

## 2. Files in scope

Modify exactly:

- `test/migration/structured-state-qualification.test.cjs`
- `test/source-control/source-lifecycle-package.test.cjs`
- `test/source-control/structured-workflow-checkpoint.test.cjs`

Create only the required Implementer Report.

Do not modify production source, validation catalog metadata, architecture, or other tests unless a direct unavoidable test-runner dependency is demonstrated and reported.

## 3. Required corrections

### 3.1 Structured-state qualification

In `test/migration/structured-state-qualification.test.cjs`:

- keep the legacy-import/cutover fixture unchanged;
- use `summary.routingWorkflowId` only as the WIR provenance source;
- create an independent canonical `feature-capability` target Workflow through `ProjectStateService.createWorkflow()`;
- link the WIR Workflow to that target using `linkWorkflowRouteTarget()`;
- attach the Phase/Work Items to the target Workflow, not the WIR Workflow;
- prove the resulting summary reports the target through `targetWorkflowId`.

Do not add new migration behavior or production compatibility.

### 3.2 Source lifecycle package qualification

In `test/source-control/source-lifecycle-package.test.cjs`, inside the existing `routeAndWork(...)` fixture path:

- after the route decision, create one independent target Workflow for the routed work;
- for the routes exercised by this test:
  - `feature-change` → use canonical `feature-capability`;
  - `issue-resolution` → use canonical `issue-resolution`;
- give each target a bounded test title and existing appropriate current workspace string;
- link `summary.routingWorkflowId` to the target with `linkWorkflowRouteTarget()`;
- attach the synthetic Work Item to the target Workflow;
- optionally re-read the summary and assert `targetWorkflowId` equals the created target.

Do not change the source-control implementation or its Work Intake-owned source model in this repair. WTR02 owns that later architecture correction.

### 3.3 Structured workflow checkpoint proof

In `test/source-control/structured-workflow-checkpoint.test.cjs`:

- after the existing Feature route decision, create a canonical `feature-capability` target Workflow;
- link the WIR routing Workflow to it with `linkWorkflowRouteTarget()`;
- attach the synthetic Work Item to the target Workflow;
- stop using removed `summary.workflowId`;
- prove the summary target identity where useful.

Do not modify checkpoint/source-control production behavior.

## 4. Explicit non-scope

Do not:

- change any file under `src/`;
- restore or alias `workflowId`;
- attach substantive Work Items to `routingWorkflowId`;
- create automatic target Workflow handoff in production;
- change route mappings outside these test fixtures;
- change SourceBinding ownership;
- alter source-control branch/checkpoint mechanics;
- retire or delete these tests in this repair;
- add new permanent test files;
- begin WTR01D.

## 5. Acceptance

Repair01 is complete when:

1. no test under `test/` references `summary.workflowId`;
2. the three affected tests model an independent target Workflow rather than WIR-owned execution;
3. `routes_to` provenance is used in those fixtures;
4. no production file changes;
5. the three repaired tests pass;
6. affected validation for the exact changed test/report paths passes or reports only explicitly unrelated pre-existing failures.

## 6. Validation

Run:

1. `npm run build`;
2. `node --test test/migration/structured-state-qualification.test.cjs test/source-control/source-lifecycle-package.test.cjs test/source-control/structured-workflow-checkpoint.test.cjs`;
3. validation planner preview for the exact final changed paths;
4. `npm run test:affected -- --changes <exact-changed-path manifest>`;
5. `git diff --check`.

Do not run the broad full suite unless the exact changed-path plan selects it.

## 7. Implementer Report

Write:

`docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR01C_REPAIR01_IMPLEMENTER_REPORT.md`

Report:

- starting SHA;
- exact three tests modified;
- how each fixture now models routing Workflow vs target Workflow;
- validation results;
- confirmation that no production files changed and no compatibility alias was introduced.

## 8. Checkpoint and stop

After validation and report:

- stage only the three repaired tests plus this report;
- perform the normal repository safety scan;
- create exactly one checkpoint commit.

Suggested subject:

`WTR01C Repair01 align permanent Workflow provenance tests`

No additional Operator Git approval is required.

Then stop. Do not begin WTR01D.
