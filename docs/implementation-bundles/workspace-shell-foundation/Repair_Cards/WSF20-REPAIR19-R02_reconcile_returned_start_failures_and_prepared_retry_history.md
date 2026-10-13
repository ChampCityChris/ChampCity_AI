# WSF20-REPAIR19-R02 — Reconcile returned Start failures and prepared retry history

**Type:** Repair Card  
**Parent:** WSF20-REPAIR19-R01 (R19-F02 follow-up)  
**Review findings:** R19-R01-F03 — returned Start failure leaves newly prepared reservation undiscovered; R19-R01-F04 — valid prepared retry is rejected solely because the WorkItem has unsuccessful execution history  
**Starting baseline:** `bdabfebd098c07c2868d323cb38547df7455fb67` on `Dev` (verify again before edits)

> Keep all unrelated untracked Forgejo/MPSI/WSF work untouched. This is a narrow correction to the R19-R01 recovery path, not authority to change SQL, Git, validation policy or the live Greenfield_Test workflow.

## Objective

Complete the existing governed **Request Work Card Revision** workflow for two legitimate pre-execution cases:

1. **Implement returns `state=unavailable`**, after a durable `prepared` reservation has been created, without throwing an exception. The Operator must see the returned failure **and** the current SQL-approved revision eligibility without having to discover and press Refresh manually.
2. The latest current attempt is `prepared` but the same WorkItem has earlier **completed unsuccessful** ImplementationRecords. A new attempt that has not begun must remain eligible for a governed revision when all prior evidence, current reservation and source integrity qualify.

Do not create a new revision API, new approval, checkpoint exception, or execution state. Continue to Review & Validation remains unavailable until the real SQL review boundary is reached.

## Confirmed RCA from R19-R01 code review

**F03 — returned error is not the catch path.** In `src/main/workCardBuilding/codexImplementerExecutionService.ts`, `startWorkflowWorkItemSelected()` first calls `prepareImplementationAttempt()` and `assertImplementationAttemptCurrent()`, then can return `unavailableFromPreflight(...)` or `unavailableModelFromContext(...)` during source/materialization/lease preparation without throwing to the renderer. The newly prepared reservation persists even though Codex did not begin.

In `src/renderer/app/WorkCardImplementWorkspace.tsx`, `start()` sets the returned execution model and refreshes authoritative SQL **only if `result.state==="completed"`**. Its R01 reservation-recovery refresh is only in `catch`. After a returned `unavailable`, `report`, `planning.revisionEligibility` and `navigation` can still reflect the previous no-attempt state, hiding Request Work Card Revision. Explicit Refresh recovers it, but R01's acceptance requirement was an actionable returned pre-execution Start failure. R16 also requires the returned Start failure to remain visible instead of being overwritten by a later Ready status read.

**F04 — historical evidence mistaken for this reservation's execution.** `workflowExecutionApplicationService.assertWorkItemPlanningRevisionEligible()` correctly recognizes an exact `attemptState="prepared"`, but then rejects if `item.implementationAttempts.length` or `item.record.body.startedAt` is truthy. Both describe **WorkItem history**, not whether the **current prepared attempt** has begun. After one `partial`/`failed`/abandoned prior implementation, the WorkItem may legitimately retain previous results and `startedAt` while a new prepared retry remains unstarted.

The shared `executionPlanningContext()` already rejects any historically `implemented` result, conflicting Tester/Validation/SourceCheckpoint evidence, incompatible/active execution, and unclean or changed source. R01 also validates the exact current reservation via `assertImplementationAttemptCurrent()`. Preserve those protections; the two blanket historical guards are not valid substitutes for attempt-specific provenance.

**Qualification:** F03 and F04 are confirmed source-code defects with concrete reachable lifecycle ordering. They have not been independently reproduced as a new incident in live `greenfield_test`; the Implementer must reproduce them against this baseline in disposable SQL/Git fixtures.

## Required correction

### A. Reconcile a returned Start failure without suppressing it

In the existing `WorkCardImplementWorkspace.start()` only:

- For a returned pre-execution `unavailable`/other terminal unsuccessful model, retain **that exact returned `CodexImplementerExecutionModel`** (including failureReason and retryBlocker) and refresh current SQL attempt/report, planning eligibility, execution projection and canonical navigation **after** the Start call settles.
- Reuse the existing R01 *sequential* read order for status versus planning-eligibility inspection to avoid the verified SQLite writer-lock contention. The auxiliary status read must **not overwrite** the returned failure until an explicit Operator Refresh or a truly authoritative newer execution state exists.
- Preserve the existing thrown-error path and its diagnostic text; failure to refresh after a returned model must show a bounded refresh error **alongside** the original returned Start failure, not replace it or claim success.
- Expose Request Work Card Revision only when **typed SQL eligibility says true**, canonical exact WorkItem/Workflow Implement is current, a valid unstarted current reservation is present, and the Operator supplies a nonblank reason. An unavailable model never independently authorizes a revision.
- Do not allow Review/Tester, automatic revised planning, checkpoint recovery or new Implementer attempt based only on the returned state. A failure after execution actually began must follow its actual running/completed evidence, not be mislabeled pre-execution.

### B. Qualify the current prepared attempt independent of unsuccessful history

In the existing `assertWorkItemPlanningRevisionEligible()` and its shared planning guard:

- Keep the exact current `ImplementationAttempt` `prepared`, matching WorkItem version, Workflow, reservation contract, `implementationRecordId` absent, and durable `assertImplementationAttemptCurrent()` verification.
- Prove the **current** reservation has not transitioned to `running`/completed or acquired a result/checkpoint. Do not use historical WorkItem `startedAt` or the mere count of older ImplementationRecords as current-attempt start proof.
- Permit earlier completed `partial`/`failed`/`abandoned` records when they belong to this exact WorkItem, have no successful `implemented` result, and no incompatible current or historical Tester, Validation, checkpoint or source-ownership evidence. Preserve all prior record/packet bytes and durable attempt IDs.
- Preserve R19 and R01 source-neutral/source-backed checks; source-backed ready reservations must have the exact clean managed checkout/HEAD/SourceBinding, and unprepared ones must not materialize source during eligibility reads. Redirected checkout, dirty paths, changed revision, conflicting lease/attempt or ambiguous provenance fail closed.
- Continue to use the existing typed `reviewStructuredWorkItemPlanning(outcome="revision_requested")`, CAS and Operator reason, then canonical Planning/Repair candidate ingress and review. The existing typed `prepareImplementationAttempt()` must own abandonment of a stale prepared reservation and creation/reuse of a new one after approval. Do not rewrite or delete the older failed history.

### C. Focused red-to-green proof

Extend existing owners; no parallel test harness.

1. **Returned failure:** In a SQL-backed Greenfield fixture with no initial attempt, invoke the real Implement adapter's Start so it **returns** `unavailable` after reserving a prepared attempt but before Codex begins (e.g. injected source-preparation failure). Verify R01 baseline keeps the old planning/attempt projection until manual Refresh. With R02, verify exact returned error remains in execution console, SQL projections refresh automatically, and the reason-gated revision action appears only when authoritative eligibility is true. Explicit Refresh remains available and distinct.
2. **Unsuccessful-history retry:** Complete a first real `partial` or `failed` attempt, leave the WorkItem ready with its historical `startedAt` and immutable ImplementationRecord/packet, then create an exact **new prepared retry** that has not begun. Assert R01's prepared eligibility fails due to historical fields, then R02 succeeds without any SQL/Git mutation on reads. Exercise the actual typed revision disposition and canonical Repair Planning return.
3. Approve an exact revised no-mutation contract through existing semantic ingress. Verify old successful/unsuccessful records remain byte-identical; stale prepared attempt is abandoned through typed reprepare, and the new source-backed/read-only attempt returns `implemented` at the unchanged revision with checkpoint-not-required and Tester/Review availability under R13.
4. Negative cases: older **successful** implementation; current attempt running/completed; prepared attempt with mismatched WorkItem version; wrong Workflow/WorkItem or read-only inspection; checkout identity drift/dirty worktree; checkpoint/Tester/Validation ownership conflicts; failed or stale SQL refresh; returned unavailable after an attempt has actually begun; blank reason or stale CAS. All remain non-destructive and fail closed.
5. Preserve passing R19 completed-unsuccessful revision and R01 first-prepared reservation fixtures, R16 surfaced Start failures, R13 mutation-required checkpoints, R17–R18 legacy recovery and existing handoff guidance.

**Expected test owners:** `test/renderer/work-card-implement-workspace.test.cjs`, `test/phase-planning/phase-planning-service.test.cjs`, `test/workflow/workflow-execution-application-service.test.cjs`, and existing Codex Implementer source-backed/R13 owner only for necessary preservation. Prefer extending current R19/R01 fixtures rather than introducing a new permanent suite.

Run the **canonical repair validation planner** with exact changed paths, then bounded affected-owner tests and a single necessary production build. Record R19's earlier broad-profile failures and any unqualified tests separately; do not repeatedly run unrelated broad suites or count prior failing receipts as passes.

## Boundaries, report and checkpoint

**Expected production owners:** `src/renderer/app/WorkCardImplementWorkspace.tsx` and `src/main/workflow/workflowExecutionApplicationService.ts`. Touch `structuredWorkItemPlanningService.ts` only if its existing typed review/get path proves insufficient; avoid changes to `codexImplementerExecutionService.ts` unless a concrete executor defect is established.

No SQL schema migration, new persisted start flag, new Operator approval gate, reclassification of an earlier partial as implemented, automatic edits to approved `affectedPaths`, synthetic SourceCheckpoint, manual Git recovery, source deletion, direct live-project mutation, or unrelated Forgejo/Tester changes.

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR19_R02_IMPLEMENTER_REPORT.md` with the exact returned-model and historical-start RCA, baseline red tests, final bounded receipts, affected files, source preservation and unverified live acceptance.

**Checkpoint:** `WSF20-R19-R02 reconcile returned Start failure and prepared retry`

Commit only attributable implementation/test/report changes, excluding unrelated dirty work. Stop for Architect review; no push or live `greenfield_test` acceptance run.
