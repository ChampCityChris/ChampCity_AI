# WRB04-R04-01 — Expose Durable Structured Checkpoint Recovery

**Parent:** WRB04 Repair04  
**Starting baseline:** `8a6a9ab065cb94d13d1f774cdfa8a62f6bc82b62`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Complete the Current Project recovery path for exact source-backed implementation and Tester checkpoint states that are already intentionally retryable in the structured checkpoint layer.

Required recovery:

```text
valid semantic implementation/test result
→ structured checkpoint blocked|inspection-required
→ durable exact recovery projection
→ retry/reconcile existing checkpoint
→ committed checkpoint OR still-blocked exact evidence
→ continue normal shared runtime
```

Do not rerun the Implementer or Tester merely to retry application-owned Git checkpoint mechanics.

## 1. Persist exact implementation checkpoint attribution durably

The source-backed Implementer runtime currently holds App Server-attributed implementation paths only in memory.

Extend the application-owned WorkItem attempt packet so a successful source-backed semantic attempt persists the exact checkpoint inputs required for later reconciliation.

Use a backward-compatible packet revision/optional structure equivalent to:

```ts
sourceCheckpointAttempt?: {
  repositoryCheckoutId: string;
  sourceLineId: string;
  expectedRevisionId: string;
  attributablePaths: string[];
}
```

Requirements:

- written only from application-observed exact source-backed execution state;
- paths already passed the existing safe path validation;
- sorted unique bounded paths;
- no arbitrary renderer/model path input;
- packet remains under `.champcity/runtime/work-item-attempts/`;
- packet identity remains bound to exact project/workflow/workItem/executionRef/contractDigest.

Do not store secret values or full model transcript.

## 2. Add an exact implementation checkpoint recovery projection

Add one bounded application projection keyed by:

- exact Workflow ID;
- exact WorkItem ID.

Derive:

- latest successful ImplementationRecord;
- exact executionRef;
- WorkItem durable state;
- source-backed vs source-neutral;
- linked SourceCheckpoint, if any;
- checkpoint state;
- checkpoint ID;
- expected revision;
- resulting revision;
- whether exact retry/reconciliation is currently safe;
- bounded blocker/reason.

For source-neutral implementation, recovery state is `not-applicable`.

For source-backed implementation:

- `committed` means Tester may proceed;
- `blocked|inspection-required|pending` with durable attempt attribution may be retryable;
- missing/corrupt attribution packet is inspection-required and not automatically retryable;
- WorkItem must be the exact current `validation_pending` owner of the latest successful attempt.

Do not infer retryability from an in-memory session alone.

## 3. Add exact implementation checkpoint retry/reconcile action

Add an application action equivalent to:

`retryWorkflowImplementationCheckpoint(workflowId, workItemId, implementationRecordId)`

Main derives:

- Project root/id;
- exact current Workflow/WorkItem;
- latest successful ImplementationRecord;
- executionRef;
- durable attempt packet;
- exact SourceBinding;
- checkout/source-line identity;
- expected revision;
- attributed path set.

Call the existing structured implementation checkpoint service using the **same durable checkpoint identity**.

Do not create another Git implementation.

Success:

- exact SourceCheckpoint becomes committed;
- SourceBinding advances to exact resulting revision;
- ImplementationRecord ↔ SourceCheckpoint relationship remains exact;
- WorkItem stays `validation_pending`;
- Tester becomes eligible.

Blocked/inspection result:

- preserve existing checkpoint/evidence;
- return exact state/message;
- do not create duplicate checkpoint identity;
- do not mutate WorkItem to ready/implemented again.

## 4. Reconcile uncertain committed implementation checkpoint

Prove the existing semantic checkpoint reconciliation behavior is reachable through the new action.

Fixture:

- durable SourceCheckpoint exists in inspection-required/pending state;
- exact source commit may already exist;
- commit matches saved boundary/base/path/receipt semantics;
- retry recognizes the exact commit and advances SourceBinding/SourceCheckpoint without another commit.

Conflicting commit/path identity remains inspection-required.

## 5. Correct durable Implementer status

When no active in-memory exact Implementer session exists, status/projection must not say `canRunAgain` merely because the previous session object failed.

For a source-backed WorkItem with:

- latest successful ImplementationRecord;
- WorkItem `validation_pending`;
- uncommitted/blocked/inspection implementation checkpoint;

show:

- Implementer semantic attempt complete;
- checkpoint recovery required;
- Implementer rerun not eligible;
- exact recovery reason.

Do not offer a second Implementer start until the durable state genuinely returns to a retryable WorkItem lifecycle state.

## 6. Add exact Tester checkpoint recovery projection

TesterResult already persists:

- exact Workflow/WorkItem/ImplementationRecord;
- permanentTestPaths;
- checkpointState;
- implementer revision.

Expose the current exact Tester checkpoint recovery state.

For a source-backed current TesterResult:

- `not-required` → no recovery;
- `committed` → Validator may proceed;
- `pending` with blocked/inspection SourceCheckpoint → retryable if exact identity remains current;
- conflicting source/binding/result identity → non-retryable inspection.

Do not create a second TesterResult.

## 7. Add exact Tester checkpoint retry/reconcile action

Add an application action equivalent to:

`retryWorkflowTesterCheckpoint(workflowId, workItemId, implementationRecordId, testerResultId)`

Preflight:

- exact current Workflow;
- exact `validation_pending` WorkItem;
- latest successful ImplementationRecord;
- exactly one TesterResult for that implementation;
- TesterResult sourceMode source-backed;
- TesterResult checkpointState pending;
- permanentTestPaths non-empty;
- exact current SourceBinding remains on expected Implementer/candidate reconciliation boundary.

Delegate to existing `checkpointStructuredTesterResult()`.

Success:

- TesterResult transitions to committed;
- candidateRevisionId/sourceCheckpointId set;
- SourceBinding advances;
- Validator may proceed.

Blocked/inspection preserves durable state for another exact retry.

## 8. Shared Workspace recovery controls

Add a bounded **Source Checkpoint Recovery** section.

Implementation checkpoint:

- show checkpoint state/message;
- show exact ImplementationRecord/checkpoint IDs;
- show Retry/Reconcile only when the recovery projection says retryable.

Tester checkpoint:

- show pending/blocked/inspection state;
- show exact TesterResult/checkpoint IDs;
- show Retry/Reconcile when safe.

Do not expose Git commands, arbitrary paths, commit messages, or raw packet files.

## 9. Restart/reopen recovery

Close/reopen application services after:

- implementation checkpoint blocked;
- implementation checkpoint inspection-required;
- implementation checkpoint reconciliation success;
- Tester checkpoint blocked;
- Tester checkpoint inspection-required;
- Tester checkpoint reconciliation success.

The actionable recovery state must derive from durable SPS + application-owned packet evidence.

No in-memory model session required.

## Permanent proof

At minimum prove:

1. source-backed attempt packet persists exact attributed checkpoint input;
2. renderer/model cannot author those persisted fields;
3. implementation blocked checkpoint is visible after process reopen;
4. retry uses the same boundary/checkpoint identity;
5. uncertain matching implementation commit reconciles without duplicate commit;
6. conflicting commit remains inspection-required;
7. committed implementation recovery makes Tester eligible;
8. WorkItem is never returned to Implementer-ready solely for checkpoint retry;
9. source-neutral implementation has no checkpoint recovery action;
10. Tester blocked checkpoint is visible after reopen;
11. Tester retry uses the same TesterResult and checkpoint identity;
12. uncertain matching Tester commit reconciles;
13. committed Tester retry transitions the existing TesterResult to committed;
14. duplicate TesterResult is never created;
15. invalid/foreign Workflow/WorkItem/Implementation/Tester identity fails closed.

## Non-scope

Do not change:

- Architect scope-violation rollback/replan from R03-01;
- source evidence lineage from R03-02;
- Repair source-mode policy from R03-03;
- validation policy compatibility;
- integration.

## Validation

Run:

- build;
- semantic checkpoint retry/reconciliation tests;
- structured implementation checkpoint recovery tests;
- structured Tester checkpoint recovery tests;
- exact Workflow application/IPC/preload tests;
- shared renderer checkpoint-recovery tests;
- process-reopen recovery tests;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair04/Reports/WRB04-R04-01_IMPLEMENTER_REPORT.md`

Commit:

`WRB04-R04-01 expose durable checkpoint recovery`

Then immediately proceed to R04-02.
