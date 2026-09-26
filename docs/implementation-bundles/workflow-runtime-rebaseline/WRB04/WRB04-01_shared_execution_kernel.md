# WRB04-01 — Establish Exact-Workflow Shared Execution Kernel and Lazy Source Boundary

**Bundle:** WRB04 — Shared Execution Kernel and Workspaces  
**Starting checkpoint:** `495c9aca43bd6c90be4abfece01ed9e40fd4c82e`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Create the shared post-plan application boundary used by both Feature and Issue exact Workflow instances.

This card establishes execution projection, deterministic eligibility, exact identity, and lazy source preparation. It does not run the Implementer yet.

## 1. Shared contracts

Add bounded shared execution contracts keyed by:
- projectId;
- exact workflowId;
- exact canonical workItemId;
- optional exact phaseId.

Required projection:
- Workflow identity/state;
- canonical Work Item Map;
- WorkItem states/dependencies;
- phase membership;
- criteria and validation policy;
- current implementation attempts/validations/repairs;
- next eligible WorkItems;
- source state: non-source / unprepared / ready / blocked;
- current source revision when ready;
- later Tester/Validator/integration summary placeholders without inventing state.

Do not expose WorkIntake/route Decision/Fix Card alias as execution identity.

## 2. Workflow-scoped execution application service

Create one main-process service keyed by Project root + exact Workflow ID.

It must:
- validate selected Current Project;
- accept only current implementation-bearing Feature/Issue Workflows in WRB04;
- consume `getWorkflowExecutionPlan(projectId, workflowId)`;
- compute WorkItem readiness only inside that Workflow;
- reject malformed cross-Workflow state;
- expose exact current active WorkItem(s) deterministically;
- recover from SPS after restart.

Do not call transitional Project-wide `getExecutionPlan(projectId)`.

## 3. WorkItem execution eligibility

Add/normalize typed eligibility sufficient for shared execution:
- planned WorkItem becomes executable only when dependencies are closed;
- phased WorkItem requires owning Phase/dependency eligibility;
- completed/terminal WorkItems are not re-run;
- active Repair blocks parent completion but is independently executable;
- blocking Decisions/records are honored;
- Criteria do not require validation before implementation, only before closure.

Multiple independent ready WorkItems may be represented concurrently; do not serialize merely because there is one Workflow.

## 4. Lazy source boundary

Add a typed execution preparation operation.

For source-backed Workflows:
- before first source-mutating execution, call the existing exact Workflow materialization service;
- preserve exact SourceBaseline;
- create/reuse `workflow/<workflow-id>`;
- reuse exact RepositoryCheckout on retry/reopen;
- return bounded blocked state if checkout cannot be prepared.

For non-source Workflows:
- source-neutral execution remains representable;
- source-mutating execution fails boundedly;
- do not create fake Git state.

Planning/reopening/read-only map must not materialize source.

## 5. Current-owner repair semantics

Normalize WorkItem/Repair ownership helpers on the unique current exact Workflow.

Required:
- WorkItem owner resolves through `part_of` chain to the exact Workflow;
- Repair/Fix belongs to same current Workflow as its target;
- superseded Workflow IDs are historical and cannot receive new Repair membership;
- Workflow lineage may be used to validate retained source records, but execution owner is the unique current Workflow ID.

Modernize focused source-semantic fixtures that asserted creation against a superseded Workflow. Do not weaken the invariant.

## 6. Permanent proof

Prove:
- Feature and Issue yield the same execution projection shape;
- two concurrent Workflows remain isolated;
- direct/phased WorkItems derive correct readiness;
- cross-Workflow dependency/membership rejects;
- Repair ownership requires same current Workflow;
- stale superseded Workflow repair fixture is corrected/retired;
- source-backed preparation is lazy and idempotent;
- read-only query causes no materialization;
- non-source source-neutral path works;
- non-source source mutation fails without Git fabrication;
- no WorkIntake/route-owned execution identity is consulted.

## Non-scope

No Work Card Architect flow, Implementer run, Tester, Validator, WorkItem close, Phase close, integration, or UI convergence yet.

## Validation

Run build; focused Project State execution/ownership tests; Workflow source materialization tests; source-semantic-reference fixture after modernization; shared execution service tests; validation-plan preview; `git diff --check`.

## Report/checkpoint

Write `docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-01_IMPLEMENTER_REPORT.md`.

Suggested commit: `WRB04-01 establish shared Workflow execution kernel`.

Then proceed directly to WRB04-02.
