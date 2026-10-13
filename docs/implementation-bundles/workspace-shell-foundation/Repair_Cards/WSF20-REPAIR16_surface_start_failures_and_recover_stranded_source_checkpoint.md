# WSF20-REPAIR16 — Surface Implement Start failures and recover stranded source checkpoints

**Type:** Repair Card  
**Parent:** WSF20  
**Defects:** WSF20-D39, D40, D41  
**Starting baseline:** `a9c885e685f97b8beda3f94c7d7739a82e29b2a6`

> Preserve unrelated dirty Forgejo/bootstrap work. Do not stage, amend, restore, or modify it as part of R16.

## Objective

Fix the live Repair dead-end without manual Git or SQL intervention.

Required end state:

1. clicking **Implement** always surfaces the exact Start result;
2. mutation-required runs reconcile final Git state even if App Server file-change telemetry is incomplete;
3. the existing stranded parent implementation can be safely checkpointed or rejected/restored from durable evidence;
4. the current Repair then rebinds to the current source revision and can start normally.

No schema migration.

# D39 — renderer must consume the Start result

## Required correction

Create a dedicated Implement-start path in `WorkCardImplementWorkspace` instead of sending Start through the generic fire-and-refresh action helper.

After calling:

`startWorkflowWorkItemCodexExecution(workflowId, workItemId, selection)`

the renderer must inspect the returned `CodexImplementerExecutionModel`.

Required behavior:

- `running` → immediately set execution to the returned running model and begin normal polling;
- `unavailable` / `failed` / blocked terminal-preflight model → preserve that returned model in the Status tab and expose `failureReason` / `retryBlocker`; do not instantly overwrite it with a Ready status refresh;
- completed immediate return → display the returned completed state, then refresh durable report/navigation context;
- thrown IPC error → existing bounded error presentation.

The Operator must never experience a Start failure as a visual no-op.

Refreshing later may re-read current durable status, but the initial Start result must remain visible until the Operator explicitly refreshes or a later authoritative running/completed status supersedes it.

## Proof

Add a renderer regression where Start returns `state=unavailable` with a source-preparation failure while a prepared attempt exists. Prove:

- click invokes Start exactly once;
- returned failure is visible;
- no immediate status refresh overwrites it with Ready;
- explicit Refresh may then re-read status.

# D40 — reconcile actual Git changes before mutation-required checkpointing

## Governing invariant

A source-backed mutation-required WorkItem starts from an exact clean managed checkout under an exclusive execution lease.

Therefore final Git working-tree state is deterministic evidence of the changes attributable to that attempt and may be used to supplement missing runtime file-change telemetry.

## Required correction

Before persisting the final source checkpoint decision for any source-backed WorkItem, reconcile actual Git state:

- verify checkout root, repository common directory, workflow branch, and HEAD still equal the exact expected source identity;
- collect final tracked modifications plus untracked files from Git;
- normalize and bound paths;
- compare actual final paths to the approved WorkItem `affectedPaths`.

For `sourceMutation=required`:

- any actual path outside approved scope remains a scope violation and uses the existing restore/reject path;
- if runtime event attribution is incomplete but all actual final paths are in approved scope, use the verified final Git path set as the checkpoint attributable paths;
- if semantic result is implemented and verified final path set is non-empty/in-scope, create the implementation SourceCheckpoint from those paths;
- if semantic result is implemented but final path set is empty, retain the existing blocked/no-change behavior;
- event telemetry may add evidence but must not be the sole source of truth.

For `sourceMutation=not-required`, preserve R13 behavior: any actual source edit remains unauthorized and is restored/rejected.

After a successful checkpoint, the managed checkout must be clean and SourceBinding must advance to the checkpoint revision.

## Runtime packet

Write `sourceCheckpointAttempt` into the attempt evidence packet from the reconciled final path set, not only from App Server events.

That keeps normal retry/recovery deterministic after restart.

# D41 — recover the existing stranded live attempt

## Add a deterministic legacy/fallback recovery path

Extend implementation checkpoint recovery for a completed successful source-backed mutation-required attempt that has:

- current exact ImplementationAttempt / ImplementationRecord pair;
- no committed implementation SourceCheckpoint;
- runtime packet missing `sourceCheckpointAttempt` or missing attributable paths;
- exact current WorkItem planning review still approved;
- non-empty approved WorkItem `affectedPaths`;
- managed workflow checkout HEAD still equals the attempt's reserved source revision;
- current dirty checkout paths are non-empty;
- every dirty path is within the approved affected path scope;
- no ambiguous newer ImplementationRecord/attempt owns the WorkItem;
- no unrelated source checkpoint already owns those changes.

If and only if all conditions hold:

- reconstruct bounded attributable paths from exact Git status;
- call the existing structured implementation checkpoint creation path;
- link the checkpoint to the existing immutable ImplementationRecord;
- advance SourceBinding/current revision exactly as a normal successful checkpoint would;
- do not create a replacement ImplementationRecord;
- do not create a replacement parent ImplementationAttempt;
- leave historical packet immutable if packet rewriting is not already an accepted recovery mechanism; durable SQL/checkpoint state is authority.

If dirty paths are outside approved scope, ambiguous, or source identity has drifted, fail closed and present an inspection-required reason. Do not auto-delete evidence.

## Live fixture

Add a regression matching the observed state:

- baseline source revision R0;
- approved mutation-required WorkItem allowing `conformance/phase-1/work-card-01.txt`;
- completed successful ImplementationRecord/Attempt at R0;
- no SourceCheckpoint;
- runtime packet with semantic implemented result but no `sourceCheckpointAttempt`;
- workflow checkout dirty only with `conformance/phase-1/work-card-01.txt`.

Prove recovery creates exactly one committed implementation checkpoint, advances binding revision, and leaves the checkout clean.

# Current Repair prepared-attempt handling

The live Repair already has a prepared attempt reserved against the pre-recovery source revision.

After parent checkpoint recovery advances the source revision, Start must not remain stuck on that stale prepared reservation.

Use `prepareImplementationAttempt()` idempotently at Start so:

- current prepared attempt with matching reservation is reused;
- stale prepared attempt is abandoned by the existing typed lifecycle command;
- one new prepared attempt is created against the current source revision;
- no duplicate live prepared/running attempts exist.

Do not manually mutate attempt state in the renderer.

# Start sequencing with recoverable dirty source

When Start for a new WorkItem/Repair encounters an otherwise valid dirty workflow checkout caused by exactly one recoverable prior implementation checkpoint gap:

- perform the deterministic recovery above before normal source materialization;
- then rerun/continue exact source preparation against the advanced revision;
- refresh/re-prepare the current WorkItem attempt if its reservation became stale;
- start Codex only after the checkout is clean and exact.

Do not make generic materialization silently clean arbitrary dirty worktrees.

# Focused proof

Run/extend existing owners. Prove at minimum:

1. renderer surfaces returned Start `unavailable` state instead of appearing inert;
2. mutation-required allowed file change with no App Server `file_change` event is reconciled from Git and checkpointed;
3. out-of-scope unreported change is rejected/restored;
4. semantic implemented + truly no final changes remains blocked for mutation-required work;
5. normal telemetry-attributed mutation-required path remains unchanged;
6. R13 no-mutation path remains checkpoint-not-required;
7. legacy packet-without-attribution recovery succeeds only when exact approved dirty paths match;
8. ambiguous/out-of-scope/stale legacy recovery fails closed;
9. recovery creates no replacement ImplementationRecord;
10. recovery produces one committed checkpoint and clean checkout;
11. stale prepared Repair attempt is abandoned/re-prepared after source revision advances;
12. fresh Repair Start then reaches a running Codex session;
13. workflow checkout is clean after committed checkpoint;
14. existing Tester/no-mutation R13 regression remains green;
15. Greenfield Repair loop proceeds from parent Request Repair → Repair Implement without manual Git cleanup.

Run at minimum:

- `test/renderer/work-card-implement-workspace.test.cjs`;
- Codex Implementer execution service owner;
- structured workflow checkpoint / semantic checkpoint owners;
- workflow execution application owner;
- full SQL Greenfield Repair lifecycle owner;
- R13 no-mutation Implementer/Tester owner;
- static/build validation excluding unrelated dirty Forgejo work.

## Operator acceptance

Continue the current live project without deleting the untracked file manually:

1. rebuild/reopen current Repair Implement;
2. press Implement;
3. if the prior parent residue is exact/in-scope, ChampCity recovers it into a committed implementation checkpoint;
4. the workflow checkout becomes clean and SourceBinding advances;
5. stale Repair reservation is refreshed automatically;
6. Repair Implementer starts and Status becomes Running;
7. any Start failure is shown explicitly instead of disappearing.

## Forbidden changes

- no manual Git cleanup instructions as the product fix;
- no manual SQL edits;
- no blanket `git clean -fd` or reset of arbitrary dirty source;
- no checkpoint fabrication without exact approved path/source proof;
- no weakening source-scope enforcement;
- no schema migration;
- no renderer-authored source identity;
- no unrelated Tester redesign;
- no Forgejo/bootstrap changes.

## Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR16_IMPLEMENTER_REPORT.md`

Include the live-equivalent stranded-attempt fixture, returned Start failure presentation proof, checkpoint recovery proof, stale prepared-attempt refresh proof, and focused receipts.

## Checkpoint

`WSF20-R16 surface Start failures and recover stranded source checkpoint`

Then stop for Operator audit.
