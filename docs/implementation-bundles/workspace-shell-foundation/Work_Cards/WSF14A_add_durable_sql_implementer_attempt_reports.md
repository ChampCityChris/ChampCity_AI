# WSF14A — Add durable SQL ImplementationAttempt and Implementer Report projection

**Type:** Architecture Foundation Work Card  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Depends on:** WSF14 checkpoint `31b67e9`  
**Unblocks:** WSF15 Implement shell and WSF16 Review & Validation.

## Objective

Restore the durable pre-execution Implementer Report preparation/recovery boundary in Structured Project State without weakening immutable `ImplementationRecord` semantics.

Read and follow `../WSF14A_DURABLE_IMPLEMENTER_REPORT_ATTEMPT_AUDIT.md`.

## Domain entity

Add typed `ImplementationAttempt` as defined by the audit.

It is mutable lifecycle state for one exact execution/report attempt. It is not a result record and must not replace `ImplementationRecord`.

Add typed relationships:

- `implementation_attempt_for`
- `attempt_result`

No SQLite schema migration.

## Typed application commands

Provide bounded commands/read models for:

1. `prepareImplementationAttempt(workflowId, workItemId)`
2. `getImplementationAttempt(workflowId, workItemId)` / exact current report projection
3. begin/run using exact prepared attempt
4. finish exact attempt with immutable `ImplementationRecord`
5. read generated Implementer Report document projection

Preparation must be idempotent for the same current approved contract.

## Contract snapshot

Preparation must capture enough exact SQL identity/version evidence to detect stale execution context without copying free-form Markdown authority.

Use current:

- WorkItem planning contract revision;
- BoundedSolution;
- applicable Criteria;
- Phase/dependencies;
- Workflow ownership;
- SourceBaseline/binding identity when applicable.

Prefer exact entity/version sources + deterministic digest over duplicating semantic bodies in the attempt.

## Source boundary

**Create Implementer Report must not prepare source.**

For source-backed work:

- reserve against exact Workflow baseline/current authoritative source identity available before materialization;
- source checkout materialization remains a Run concern;
- Run verifies materialized source is compatible with the reserved attempt before execution begins.

## Codex execution integration

Refactor the exact WorkItem Implementer path so the stable `ImplementationAttempt.id` is the execution reference.

Do not generate an unrelated random executionRef after a prepared attempt exists.

For existing shared structured callers that Run directly, application orchestration may prepare/recover an attempt automatically immediately before Run to preserve compatibility. Do not alter other workflow-family UI in this card.

## Runtime recovery

Prepared attempt survives reopen/restart.

If SQL says `running` but no live Codex session exists, presentation must report recovery/inspection required. Do not automatically start another execution or manufacture an ImplementationRecord.

No persistent Codex thread/session implementation is required in this card.

## Result boundary

On completion:

- create one immutable `ImplementationRecord`;
- require `ImplementationRecord.executionRef === ImplementationAttempt.id`;
- link it via `attempt_result`;
- transition attempt to completed;
- preserve current WorkItem state transition and source checkpoint semantics;
- idempotent repeated completion with the same exact result remains safe; conflicting result fails closed.

Tester continues to consume the immutable `ImplementationRecord`, not the mutable attempt.

## Implementer Report document projection

Create a SQL-derived document view for the exact attempt.

Pending view: contract/context/status only.

Completed view: same report identity plus immutable implementation result and relevant source/checkpoint evidence.

It must be compatible with the standard document display/export mechanism and exportable to Markdown.

No model-authored Implementer Report Markdown is canonical.

## Preserve

- WSF01–WSF14 accepted shell behavior;
- SQL authority;
- WorkItem planning approval boundary;
- existing Tester/Validation semantics;
- existing source checkpoint semantics;
- Repair WorkItems using the same shared execution foundation;
- other workflow-family renderers unchanged.

## Forbidden

- no `Pending` ImplementationRecord;
- no renderer-local report state;
- no Markdown report authority;
- no Create action that begins Codex execution;
- no Create action that materializes source;
- no second random execution identity after attempt preparation;
- no generic file watcher;
- no SQLite schema migration;
- no new workflow-specific execution stack.

## Focused proof

Prove:

1. approved WorkItem contract prepares exactly one durable Pending attempt;
2. repeated prepare returns same current attempt;
3. reopen/new service instance recovers the prepared attempt;
4. preparation does not alter WorkItem state or materialize source;
5. contract revision/source-context change makes old prepared attempt stale and prevents Run;
6. Run uses the exact attempt ID as executionRef and moves WorkItem/attempt to running;
7. terminal result creates exactly one immutable ImplementationRecord linked to attempt;
8. completed attempt/report reconstructs after restart;
9. Pending and completed document projections are deterministic and Markdown-exportable;
10. direct Run compatibility auto-prepares a durable attempt rather than bypassing it;
11. Repair WorkItem uses the same attempt model;
12. Tester still targets ImplementationRecord;
13. running-without-live-session fails closed for recovery/inspection;
14. no legacy Implementer Report file is required for authority.

## Tests / validation

Use existing Project State, WorkItem execution, Codex Implementer, source checkpoint, structured review and renderer characterization owners where possible. Extend rather than multiply suites.

Run build/static and exact affected validation. No full/release qualification.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF14A_IMPLEMENTER_REPORT.md`.

Include domain contract, idempotence/recovery proof, source preparation separation, Codex executionRef change, result linkage, Pending/completed document projection/export, Repair WorkItem fixture, test classification, and remaining Operator validation.

## Checkpoint

`WSF14A add durable SQL Implementer attempt reports`

Then resume WSF15 and continue sequentially through WSF20.
