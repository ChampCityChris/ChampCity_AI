# WSF20-REPAIR17 — Recover a blocked SourceBinding after failed materialization

**Type:** Repair Card  
**Parent:** WSF20  
**Defect:** WSF20-D42  
**Predecessor:** WSF20-REPAIR16  
**Starting baseline:** `193c2cf672c806433598be8403a50ee905720a39` (`Dev` HEAD; reverify before edits)

> Preserve all existing dirty development work, including Forgejo/bootstrap changes and untracked WSF documents. This card authorizes a bounded Implementer repair, not live-project surgery.

## Objective

Complete R16's stranded-implementation recovery when an earlier failed source materialization has persisted the managed `SourceBinding` as `blocked`. The recovered parent checkpoint must leave a clean Workflow checkout and a verified `ready` binding so the existing Repair WorkItem can start normally.

Do not introduce a Greenfield-only source-control path, a second checkpoint engine, or a manual Git/SQL recovery requirement.

## D42 — observed failure and RCA

**Live evidence (read-only, Greenfield_Test):**

- Workflow: `3500ba39-001e-4a09-82fd-23a1e4f5aa75`; parent WorkItem: `7ae778e7-6f49-4dcb-8262-fd4ee277dfde`.
- Parent attempt packet: `.champcity/runtime/work-item-attempts/eeb23acd-d3c4-4417-825a-5658449345b3.json`.
- Parent packet reports `implemented`, without `sourceCheckpointAttempt`; no Repair runtime packet exists.
- Workflow Git HEAD remains `5e9ae23798f177efba1453bfc7cd39a77006376a` and is dirty only with `?? conformance/phase-1/work-card-01.txt`.
- Repair Implement Start now surfaces `REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED` rather than silently appearing inert.

**Confirmed code-level deadlock:**

1. `workflowSourceMaterializationService.materialize()` rejects a dirty checkout and, when the binding was `ready`, persists `preparationState: blocked` with `REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED`.
2. R16 `prepareExecution()` attempts legacy checkpoint recovery before ordinary materialization, but `inspectLegacyImplementationCheckpoint()` calls `bindingForWorkflow()`, which rejects any binding not `ready`.
3. Even if legacy inspection were extended alone, `semanticCheckpointService.checkpoint()` independently refuses checkpoints when binding preparation state is not `ready`.
4. `prepareExecution()` collapses most non-inspection recovery errors to the generic materialization failure code.
5. R16's `Greenfield stranded parent checkpoint recovers before a stale prepared Repair starts` fixture keeps the SourceBinding `ready`: it creates the stranded file and invokes recovery without first reproducing the persisted failed-materialization state.

The live SQL binding state has not been directly inspected through MCP. Treat `blocked` as the precise code-path hypothesis to reproduce and prove in tests, not as an independently verified live SQL field.

## Required correction

### A. Extend only the exact legacy recovery inspection

In `structuredWorkflowCheckpointService.ts`, permit R16 legacy implementation checkpoint inspection to consider a `blocked` SourceBinding **only** when all of the following hold:

- The binding is the single active binding for the unique current substantive Workflow lineage, and its immutable SourceBaseline identity is exact.
- The recorded blocking code is the expected checkout-materialization failure, not an unrelated source or policy failure.
- The current binding's source line, checkout ID, and revision are compatible with the parent's reserved successful ImplementationAttempt.
- Parent WorkItem planning is still approved and unchanged; its latest immutable ImplementationRecord/Attempt pair is successful, current, and mutation-required.
- The historical packet is the exact parent packet and has no usable checkpoint attribution, as already constrained by R16.
- The original managed Git checkout root, Git common directory, Workflow branch and HEAD equal the reserved source identity.
- Final dirty tracked/untracked paths are nonempty, bounded, and within the parent's exact approved `affectedPaths`; no competing checkpoint or newer implementation owns them.
- The existing exclusive Implementer/Tester source lease is obtained and identity/proof are rechecked under that lease before mutation.

Preserve the strict `ready` requirement for normal preparation, execution, Tester and ordinary checkpoint operations. An unrelated `blocked` binding must not become executable or recoverable merely because a failure code matches.

### B. Restore the existing checkpoint path under explicit recovery authority

The semantic checkpoint layer must be able to finalize the **same** R16 proven legacy implementation boundary even when its binding is persistently `blocked`.

- Prefer a narrowly internal recovery-specific qualification/handoff to the existing semantic implementation checkpoint machinery; do not add a caller-selectable generic readiness bypass.
- Reuse existing checkpoint boundary identity, receipt digest, Git staging/commit verification, `SourceCheckpoint` linking, and idempotent pending/blocked retry rules.
- Never checkpoint unrelated dirty paths, create replacement parent attempts/records, or rewrite the historical packet.
- Preserve fail-closed behavior when provenance, saved checkpoint identity, staging, source revision or lease ownership is ambiguous.
- Do not transition the binding to general-purpose `ready` based on the failure code or clean up the checkout before a proven checkpoint.

### C. Restore complete source lifecycle after successful recovery

After the exact implementation checkpoint is verified committed, establish all of these invariants before allowing normal Repair Start:

- `SourceCheckpoint` is committed and linked to the original parent ImplementationRecord.
- SourceBinding `currentRevisionId` equals the committed checkpoint revision.
- SourceBinding `preparationState` is `ready`; obsolete materialization `failureCode` is cleared.
- The managed Workflow checkout is clean, and its HEAD, SourceLine and Git repository identity are still exact.

Handle interrupted finalization safely: if the Git checkpoint is already committed but binding lifecycle completion was interrupted, recognize the exact durable checkpoint and finish/reconcile the binding without a duplicate Git commit. This must work even when the working tree is already clean (the current `prepareExecution()` only enters dirty-source legacy recovery when Git status is nonempty). If exact commit/SQL evidence cannot be reconciled, return inspection-required without modifying unrelated source.

### D. Preserve existing Start semantics and actionable errors

- Continue R16 Start ordering: exact Repair reservation → recovery (when required) → materialization/verification → typed stale-reservation replacement → Codex Start.
- An advanced source revision must abandon/reprepare the stale Repair reservation through `prepareImplementationAttempt()`; do not update attempts directly in the renderer.
- Do not materialize, mutate source or perform recovery in ordinary Status polling.
- Return bounded, distinct inspection/recovery failure information instead of folding a failed recovery into the generic materialization code. Preserve the R16 renderer's non-swallowed Start-result presentation.

## Focused proof — mandatory red-to-green fixture

Extend the existing `test/phase-planning/phase-planning-service.test.cjs` Greenfield stranded-parent/Repair test. The new test must **first fail against the exact R16 starting baseline** and then pass with R17:

1. Build a genuine synthetic Git/SQLite Greenfield Workflow and a source-backed approved mutation-required parent WorkItem.
2. Complete its ImplementationRecord/Attempt without a checkpoint; preserve a packet lacking `sourceCheckpointAttempt` and leave only `conformance/phase-1/work-card-01.txt` uncommitted.
3. Invoke the actual source materialization path while the checkout is dirty; assert materialization fails **and** SourceBinding is durably `blocked` with the expected failure code.
4. Retain/create a planned and approved Repair with a prepared reservation for the original revision.
5. Invoke the real Repair Implement Start path, not a direct bypass of its preparation logic.
6. Assert exactly one committed parent checkpoint, preserved parent record/attempt/packet bytes, advanced source revision, clean checkout, binding `ready` with cleared failure, and abandonment/recreation of the stale Repair reservation.
7. Assert the exact Repair reaches Running via the deterministic Codex adapter, completes with its own checkpoint, and leaves a clean checkout.

Add targeted negative and interruption cases in the existing source-control/application owners:

- Other blocked reasons, out-of-scope changes, missing/stale planning, redirected checkout, changed branch/HEAD, newer/ambiguous owners, conflicting SourceCheckpoints and competing leases all fail closed without source loss.
- A committed-but-binding-blocked interruption reconciles idempotently when durable proof matches; it never creates a second checkpoint/commit.
- Repeated recovery/Start must not duplicate the parent checkpoint or live Repair attempts.
- Normal `ready` binding checkpointing, R13 source-backed no-mutation Implementer/Tester, R16 telemetry-independent Git attribution, and R16 Start failure display remain unchanged.

Relevant existing owners:

- `test/phase-planning/phase-planning-service.test.cjs`
- `test/source-control/structured-workflow-checkpoint.test.cjs`
- `test/source-control/semantic-checkpoint-service.test.cjs`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- `test/workflow/workflow-execution-application-service.test.cjs`
- `test/renderer/work-card-implement-workspace.test.cjs` (regression only unless needed)

Use the focused repair validation/build lane once after iteration; do not repeatedly run unrelated broad suites. Report existing baseline failures separately from R17 failures.

## Implementation boundaries

Expected production owners:

- `src/main/sourceControl/structuredWorkflowCheckpointService.ts`
- `src/main/sourceControl/semanticCheckpointService.ts`
- `src/main/workflow/workflowExecutionApplicationService.ts`

Change `workflowSourceMaterializationService.ts` or the Codex Implementer service only if the verified recovery sequence requires it. No schema migration, new recovery authority store, Greenfield-specific branch, or Tester redesign.

Do not alter the real Greenfield_Test source, SQL, attempts, checkpoints, or runtime packets during implementation. No manual `git reset`, `git clean`, file deletion, SQL edits, or silent state fabrication. Preserve the unrelated dirty ChampCity_AI `Dev` tree and all Forgejo/bootstrap work.

## Operator acceptance

After build/relaunch, reopen the **existing** Greenfield_Test Repair Implement workspace. Press Implement without manual cleanup. The product must recover the original parent checkpoint, leave the source checkout clean, advance and ready the binding, refresh the stale Repair reservation and start the Repair Codex session. If recovery is unsafe, show the exact inspection blocker while preserving source and historical evidence. Do not recreate the test project.

## Implementer report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR17_IMPLEMENTER_REPORT.md` with: RCA, exact diff/scope, red-to-green blocked-binding regression, interrupted-finalization proof, focused validation receipts, and explicit remaining live acceptance.

## Checkpoint

`WSF20-R17 recover blocked SourceBinding after failed materialization`

Commit only the bounded implementation/test/report files. Stop for Operator audit; do not run live-project recovery.
