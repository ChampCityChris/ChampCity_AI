# WSF20-REPAIR19-R03 — Rehydrate durable Implement status and read-only source context

**Type:** Repair Card  
**Parent:** WSF20-REPAIR19-R02  
**Defects:** R19-R02-F05 — valid ready source is reported unprepared during reopened completed-attempt status; R19-R02-F06 — terminal Implementer state is lost when the in-memory Codex session is gone  
**Starting baseline:** `6d88813d7b416980e62c556a3be4d6a28c9012a6` on `Dev` (reverify before edits)  
**Unrelated later work to preserve:** LOCALGIT01 at the starting HEAD; no LOCALGIT source may be reverted or redesigned by this repair.

> This repair is about durable status/read-only source inspection. It is **not** another SourceBinding/materialization/checkpoint recovery repair. Do not mutate `greenfield_test` during implementation.

## Objective

Make a source-backed WorkItem's Implement surface reconstruct the truthful durable execution state after an app/Background Agent/Codex service restart.

For an already completed ImplementationAttempt, status reads must:

1. verify an already-ready Workflow checkout **without materializing or changing it**;
2. rehydrate the previous terminal Implementer state from durable Project State and exact source/checkpoint evidence when no in-memory Codex session exists;
3. preserve retry/revision behavior equivalent to the same-process result;
4. never claim **"No terminal run yet"** or **"Source-backed Workflow checkout is not prepared and verified"** when durable SQL and Git prove otherwise.

Source preparation/recovery remains a Start-time mutation boundary. Status/Refresh remains read-only.

## Verified live RCA

Live `greenfield_test` currently proves the source is healthy:

- Workflow: `3500ba39-001e-4a09-82fd-23a1e4f5aa75`.
- Repair WorkItem: `88f9ee9c-c99d-4272-a721-596eb8196b14@4`, `workState=ready`.
- SourceBinding `5bce00f5-cfa7-47a1-af6d-6e20a9fbc259@10`: `preparationState=ready`, revision `1e3f1530b3d4aaac7bc9411c22edc3a666c35e84`, exact Workflow checkout/line IDs present.
- Agent Harness checkout `workflow-3500ba39-001e-4a09-82fd-23a1e4f5aa75`: registered `available`; Git status is clean.
- Parent SourceCheckpoint `afd043b6-ad5b-4e5e-ae49-b60a12fc85de` is committed at the same resulting revision.
- Repair ImplementationAttempt `937253a2-1c28-455a-b531-b909fe1137c7` is durably `completed`, linked to ImplementationRecord `69fbed9e-0c3b-45d5-a7df-e4a11082453c` with `outcome=partial`. Its source revision is exactly the current ready revision.
- The screenshot nevertheless reports **Unavailable**, **No terminal run yet**, and **Source-backed Workflow checkout is not prepared and verified.**

### F05 — read-only context requires mutation-path-only objects

`CodexImplementerExecutionService.getWorkflowWorkItemStatus()` falls through for a completed source-backed attempt and calls:

`resolveWorkflowWorkItemContext(workspaceRoot, selector)`

with the default `prepareSource=false`.

Inside `resolveWorkflowWorkItemContext()`, the read-only branch intentionally creates only:

`{ state: projection.source.state, currentRevisionId: projection.source.currentRevisionId }`

so status cannot materialize source.

The same function then requires:

- `preparation.sourceBinding`
- `preparation.repositoryCheckout`

before it will accept the source as ready. Those fields are supplied only by the `prepareSource=true` Start/materialization path. Therefore a valid source-backed read-only status call cannot satisfy its own predicate and throws the false message seen live.

The existing no-attempt status path avoids this function for source-backed readiness and therefore does not expose the defect. The existing reopened **implemented/no-mutation** test also avoids it through a separate special-case branch.

### F06 — durable terminal result is not reconstructed after restart

While a session is in `exactSessionsByOwner`, `getWorkflowWorkItemStatus()` can return `modelFromSession()`, preserving the true terminal state, `lastRunState`, result outcome, checkpoint presentation and retry semantics.

After restart, only SQL/runtime packet/source state remain. For a completed attempt other than the narrow implemented/no-mutation special case, status tries to rebuild a **fresh execution context**. If that succeeds it ends in `readyModel()`; if F05 fires it becomes `unavailableFromPreflight()`. Neither represents the durable prior terminal run. This is why the UI says **No terminal run yet** even though the immutable ImplementationRecord exists.

The missing test boundary is:

`source-backed → completed unsuccessful semantic result → discard CodexImplementerExecutionService instance → new service instance → getStatus()`

R19/R01/R02 tested same-process failed/partial presentation, returned Start reconciliation, prepared reservations and restarted successful no-mutation work. They did not exercise this durable unsuccessful-result rehydration branch.

## Required correction

### A. Separate read-only source verification from source preparation

Refactor the existing source-context logic in `src/main/workCardBuilding/codexImplementerExecutionService.ts` so two explicit operations exist conceptually:

- **inspect existing source** — read-only; uses current SQL SourceBinding projection plus deterministic managed-topology/Git verification;
- **prepare source for Start** — existing `prepareExecution(... sourceMutating:true)` materialization/recovery path.

For a source-backed projection already in `ready`:

- derive/verify exact managed Workflow checkout path;
- require current revision, repositoryCheckoutId and workSourceLineId;
- verify expected `workflowRepositoryCheckoutId(workflowId)`, `workflowSourceLineName(workflowId)`, checkout top-level, branch, HEAD, common Git directory against Dev, clean status and canonical nonredirected checkout;
- construct the existing `sourceBacked` execution-context identity without requiring a materialization-only `SourceBinding`/RepositoryCheckout return object;
- create the current WorkItem execution contract from SQL **without mutation**;
- perform no `prepareImplementationAttempt`, materialization, checkpoint recovery, Git mutation, branch switch, SQL write or workspace re-registration.

If the SourceBinding is actually `unprepared` or `blocked`, or Git identity/HEAD/branch/common-directory/cleanliness no longer matches, fail closed with the real bounded reason. Do not turn status into automatic repair.

The `prepareSource=true` path remains the sole source-materialization/recovery path and must retain R16–R18 behavior.

### B. Rehydrate completed Implementer status from durable evidence

For an exact durable `ImplementationAttempt.attemptState=completed` with `implementationRecordId`, and no live exact session:

1. Load the exact linked ImplementationRecord and prove its `executionRef`, WorkItem and Workflow ownership match the attempt.
2. Use the **historical WorkItem record version reserved by that attempt** when reconstructing the run's mutation contract/presentation. Do not reinterpret an old attempt using a later revised WorkItem's `affectedPaths`.
3. Load current source/checkpoint recovery evidence read-only and establish whether the historical execution's source boundary is still exact.
4. Return a durable `CodexImplementerExecutionModel` representing the previous run, rather than a new-run `readyModel`.

Required same-process parity:

- `implemented` + valid committed implementation checkpoint → terminal `completed`, checkpoint `committed`, no rerun solely because the service restarted.
- `implemented` + R13 historical `sourceMutation=not-required` + unchanged verified source → terminal `completed`, checkpoint `not-required`.
- `partial`/`failed` historical result → preserve a terminal run and its retryability according to the same rules as the live-session branch. For a historical source-backed **mutation-required** unsuccessful run with no committed checkpoint, expose the same blocked-checkpoint/failure presentation used when the run originally completed; do **not** convert it into source-preparation failure.
- `abandoned`/cancelled semantic history must remain identifiable as a terminal prior run and retryable only where current policy permits.
- an implemented mutation-required result with pending/blocked/inspection-required exact checkpoint recovery retains the existing **recover checkpoint instead of rerun** rule.

At minimum rehydrate: `state`, `lastRunState`, `canRunAgain`, `retryBlocker`, `failureReason`, `checkpoint`, `executionKind`, Workflow/WorkItem/version identities, reservation digest, sourceMode and `reportUpdated=true`. It is acceptable for ephemeral event/stderr/approval/runtime tails to be empty after process loss unless already durably stored; do not fabricate telemetry.

Where the runtime packet supplies immutable started/completed/model/result evidence, it may be used only after exact Project/Workflow/WorkItem/executionRef validation. Do not rewrite the packet or make it a new authority over SQL.

### C. Preserve the current governed revision path

For the live shape—completed `partial`, WorkItem `ready`, source clean/ready—the restarted status must:

- show the prior terminal run rather than "No terminal run yet";
- not report the checkout unprepared;
- preserve the R19/R01/R02 **Request Work Card Revision** eligibility derived from typed planning SQL;
- keep Continue to Review & Validation disabled;
- allow Implement rerun only if current execution/retry rules actually permit it.

After the Operator requests revision and approves a new `affectedPaths=[]` contract, a **fresh service instance** must show the canonical revised planning state and Start the next source-backed/no-mutation reservation through the normal Start path. No previous attempt/result/packet may be rewritten.

## Focused regression / acceptance

Extend existing owners; do not create another execution harness.

1. **Exact live-shape restart regression:** create a source-backed mutation-required Repair, materialize exact clean source, run a real Implementer semantic `partial` result, and capture same-process terminal model. Destroy that `CodexImplementerExecutionService`; create a new instance and call `getStatus()`. On the R03 baseline this must reproduce the false read-only source error / missing terminal state. With R03:
   - SourceBinding/Git remain byte/state unchanged;
   - no materializer/preparation callback runs;
   - returned model represents the prior terminal run;
   - `lastRunState` is not null;
   - failure/checkpoint/retry semantics match same-process behavior;
   - it never contains "Source-backed Workflow checkout is not prepared and verified" when source is valid.
2. **Historical contract correctness:** after that unsuccessful run, revise the WorkItem from nonempty `affectedPaths` to `[]`. Before a new attempt runs, confirm rehydration of the **old** terminal attempt still uses its reserved historical mutation-required contract, while the next prepared Start uses the newly approved no-mutation contract. No historical record mutation.
3. **Restart after revised Start:** approve the no-mutation revision, prepare/start/complete `implemented` unchanged source, destroy service, reopen status; checkpoint remains `not-required`, terminal run is completed and Tester/Review path remains eligible.
4. **Committed mutation checkpoint restart:** source-backed mutation-required `implemented` + committed checkpoint survives service replacement as terminal completed with exact checkpoint identity/revision.
5. **Checkpoint recovery preservation:** implemented mutation-required result with real pending/inspection-required recovery still blocks rerun and routes to exact checkpoint recovery after restart.
6. **Fail closed:** read-only status with actual blocked/unprepared binding, dirty checkout, wrong HEAD/branch/common repository, redirected checkout, stale attempt/result linkage, historical WorkItem version missing/changed identity, or ambiguous result must return bounded unavailable/inspection evidence and perform no source/SQL mutation.
7. **No-attempt/prepared preservation:** existing fresh source-backed readiness and R01/R02 prepared reservation tests remain green; status does not materialize or reserve.
8. **Renderer proof:** `WorkCardImplementWorkspace` receiving the durable restarted partial model renders prior Last Run/terminal state, the partial-result explanation and governed revision controls; no false "No terminal run yet" or source-preparation error. Refresh is read-only.
9. Preserve R13, R16–R18, R19/R01/R02 focused owners and exact source checkpoint tests.

**Primary test owners:**  
`test/work-card-building/codex-implementer-execution-service.test.cjs`  
`test/phase-planning/phase-planning-service.test.cjs`  
`test/renderer/work-card-implement-workspace.test.cjs`

Use `test/workflow/workflow-execution-application-service.test.cjs` and source-control checkpoint owners only where a helper/source projection contract changes. Prefer extending the existing source-backed no-mutation/reopened-status and Greenfield Repair fixtures.

Run the canonical **repair** validation planner with exact changed paths, focused affected/preservation owners, and one necessary production build. Retain failed red receipts as failed. Do not repeatedly run the known broad profile; its unrelated historical failures remain separately tracked.

## Expected production scope

Primary:
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`

Only if needed to expose a clean reusable **read-only** source/durable-attempt projection:
- `src/main/workflow/workflowExecutionApplicationService.ts`

Tests listed above.

Do **not** modify SourceBinding rows, source topology schemas, repository checkout registrations, checkpoint semantics, WorkItem planning rules, SQL schema, Tester authority, LOCALGIT01 implementation, Forgejo work or Greenfield navigation. Do not add a persisted duplicate Codex session model merely to recreate UI state; Project State + immutable packet/source evidence already own the durable facts.

## Live Operator acceptance after Architect review

On the existing `greenfield_test` Repair, with a freshly launched application/service:

1. Refresh Implement. It shows the prior terminal `partial` run truthfully and does not claim the clean ready Workflow checkout is unprepared.
2. Enter a reason and **Request Work Card Revision**.
3. Canonical Repair Planning opens; Architect submits the deliberate no-mutation contract `affectedPaths=[]`; Operator approves.
4. Relaunch/restart once before Implement to exercise durable state again; the revised WorkItem remains actionable.
5. Start Implement. The new attempt runs source-backed/read-only, preserves the existing file, returns `implemented`, checkpoint is `not-required`, and navigation reaches Review & Validation.
6. Proceed through the normal independent Tester path.

No manual Git cleanup, SQL edit, packet rewrite or SourceBinding manipulation is acceptable.

## Implementer report and checkpoint

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR19_R03_IMPLEMENTER_REPORT.md`

Report the baseline restart reproduction, source-read invariants, durable model mapping, historical WorkItem version proof, final focused receipts, exact files changed and remaining live acceptance.

**Checkpoint:** `WSF20-R19-R03 rehydrate durable Implement status`

Commit only attributable source/tests/report files. Preserve all existing unrelated untracked documentation and LOCALGIT01. Stop for Architect code review. No push, release, or live `greenfield_test` mutation during implementation.
