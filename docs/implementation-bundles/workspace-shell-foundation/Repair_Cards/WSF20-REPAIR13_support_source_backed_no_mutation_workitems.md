# WSF20-REPAIR13 — Support source-backed WorkItems with no source mutation

**Type:** Repair Card  
**Parent:** WSF20  
**Defect:** WSF20-D32  
**Starting baseline:** `1dd01650cfbe3950f4871726f10199da912cd9c0`

> Existing dirty Forgejo hotfix files on `dev` are unrelated. Do not stage or modify them in this card.

## Objective

Separate Workflow source capability from exact WorkItem mutation intent.

A Workflow may be source-backed while a particular approved WorkItem requires no repository mutation.

For such a WorkItem:

- Implementer may inspect/use the source-backed checkout;
- no implementation SourceCheckpoint is required if no source changes are permitted or produced;
- successful semantic implementation can proceed to Tester/Review against the unchanged current source revision;
- unexpected source edits remain a failure and must be restored/rejected.

No schema migration is required.

## Governing rule

Use the approved exact WorkItem execution plan as authority:

`sourceMutationRequired = approved WorkItem affectedPaths.length > 0`

Do not derive WorkItem mutation intent solely from existence of a SourceBinding.

## Required correction

### 1. Implementer execution contract

In the exact Workflow WorkItem context:

- source-neutral Workflow remains `sourceMutation: not-required`;
- source-backed Workflow + non-empty approved WorkItem `affectedPaths` => `sourceMutation: required`;
- source-backed Workflow + empty approved WorkItem `affectedPaths` => `sourceMutation: not-required`, while retaining the current source revision identity for context.

Allow `sourceMutation: not-required` with a non-null source revision for a source-backed Workflow.

Do not treat that combination as inconsistent.

### 2. Source-backed no-mutation sandbox behavior

For a source-backed/no-mutation WorkItem:

- source checkout may be used for read/context;
- source modifications are not authorized;
- if the Implementer changes files anyway, treat them as out-of-scope, restore/reject using existing attribution controls;
- successful `implemented` with zero attributable changes is valid.

### 3. Finalization/checkpoint

If exact contract says source mutation is not required:

- do not attempt `createImplementationCheckpoint`;
- set presentation checkpoint state to `not-required`;
- keep SourceBinding/current revision unchanged;
- terminal Implementer state may be completed when semantic result is implemented;
- do not generate the “No attributable source changes…” blocked checkpoint message.

For mutation-required WorkItems, existing checkpoint enforcement remains unchanged.

### 4. Recovery projection

`getCheckpointRecoveryProjection()` must derive whether an implementation checkpoint is required from the exact approved WorkItem plan.

For source-backed/no-mutation successful implementation:

- implementation checkpoint state = `not-required`;
- retryable = false;
- reason = null / clear bounded success explanation;
- do not say “recover durable SourceCheckpoint.”

For mutation-required source-backed implementation with missing checkpoint, retain strict pending/blocked recovery.

### 5. Tester boundary

Allow Tester to consume a successful source-backed/no-mutation ImplementationRecord without an implementation checkpoint when all of these are true:

- exact WorkItem approved `affectedPaths` is empty;
- SourceBinding is ready;
- current binding revision equals the Implementer revision/context revision;
- no implementation SourceCheckpoint exists because none was required.

Tester remains source-backed.

If Tester makes permanent test changes, its own checkpoint lifecycle remains unchanged.

For mutation-required WorkItems, Tester must still require the committed implementation checkpoint.

### 6. Current live attempt recovery

Add a deterministic recovery path for an already-completed semantic ImplementationAttempt that:

- belongs to a source-backed Workflow;
- has successful ImplementationRecord outcome;
- has no implementation checkpoint;
- exact WorkItem approved `affectedPaths` is empty;
- current SourceBinding revision still matches the attempt's reserved/current revision.

That state must be reclassified as checkpoint-not-required without mutating or replacing the immutable ImplementationRecord.

After resolver refresh, the WorkItem should proceed to the normal Tester / Review & Validation path rather than remain trapped in Implement.

No manual SQL edits.

### 7. Do not weaken real source mutation proof

Keep strict failure for:

- WorkItem has non-empty affectedPaths but no attributable implementation changes;
- checkpoint creation fails for a mutation-required WorkItem;
- source revision/binding changed unexpectedly;
- out-of-scope source changes;
- ambiguous or stale implementation attempt.

## Focused proof

Prove both source-backed modes.

### No-mutation WorkItem

1. source-backed Workflow + approved WorkItem affectedPaths=[];
2. execution contract reports `sourceMutation=not-required` with current source revision retained;
3. Implementer returns implemented and no file changes;
4. no SourceCheckpoint is created;
5. attempt/result complete successfully;
6. recovery projection says implementation checkpoint not-required;
7. status does not instruct impossible checkpoint recovery;
8. Tester context can start from unchanged current revision;
9. TesterResult with no permanent test changes records checkpointState=not-required and candidateRevisionId=current revision;
10. WorkItem can proceed through review/validation.

### Mutation-required WorkItem

11. non-empty affectedPaths still requires attribution/checkpoint;
12. no attributable changes remains blocked/failed;
13. Tester refuses source-backed implementation without its committed checkpoint;
14. existing checkpoint recovery remains retryable only when exact attribution packet exists.

### Existing attempt

15. fixture an already-completed successful no-mutation attempt with no checkpoint and prove restart/reopen reclassifies it as not-required without a new attempt/result.

Run Codex Implementer, Tester execution, workflow execution application, checkpoint/source-state and Greenfield navigation owners.

## Operator acceptance

Using the current live no-code WorkItem:

- refresh/reopen after R13;
- current completed attempt is not told to recover a nonexistent checkpoint;
- workflow advances to the correct downstream review/test stage;
- no new implementation attempt is created;
- source revision remains unchanged.

## Forbidden changes

- no schema migration;
- no weakening checkpoint rules for mutation-required work;
- no fake SourceCheckpoint;
- no manual SQL repair;
- no report/result replacement;
- no Forgejo hotfix files;
- no UI tab work from R12.

## Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR13_IMPLEMENTER_REPORT.md`

## Checkpoint

`WSF20-R13 support source-backed no-mutation WorkItems`

Then stop for Operator audit.
