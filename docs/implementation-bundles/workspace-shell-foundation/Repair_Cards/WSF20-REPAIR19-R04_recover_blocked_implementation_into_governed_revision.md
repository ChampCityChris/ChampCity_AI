# WSF20-REPAIR19-R04 — Recover blocked implementation into governed Work Card revision

**Type:** Repair Card  
**Parent:** WSF20-REPAIR19-R03  
**Defects:** R19-R03-F07 — exact semantic `blocked` Implement result is excluded from the governed revision path; R19-R03-F08 — blocked WorkItem cannot re-enter approved planning even when the approved contract itself is impossible  
**Starting baseline:** `c1ba97dbefd1099af7c0dd3c07d059d72082daf5` on `Dev` (reverify before edits)

> This is a generic WorkItem lifecycle correction exposed by a Repair. Do not add a Repair-specific execution engine, auto-convert blocked work into success, fabricate source changes, or mutate the live Greenfield project during implementation.

## Objective

Allow an exact completed **semantic `blocked` ImplementationRecord** to enter the existing governed Work Card revision lifecycle when the current source and evidence prove that revising the approved execution contract is the safe next action.

The intended lifecycle is:

`Implement → semantic blocked → WorkItem blocked → Operator Request Work Card Revision → canonical Planning/Repair Planning → Architect replacement contract → Operator approval → WorkItem ready → fresh Implement attempt`

Preserve the existing successful, partial, failed, abandoned, prepared, checkpoint-recovery, Tester/Validation and source-integrity behavior.

## Verified live RCA

The current `greenfield_test` incident is no longer a source-preparation or stale-session failure.

### R03 succeeded

At application startup, the prior terminal Implement result was rehydrated correctly:

- the screen showed `Last Run: failed`;
- the false **No terminal run yet** message was gone;
- the false **Source-backed Workflow checkout is not prepared and verified** message was gone;
- SourceBinding remained `ready`;
- the Workflow checkout remained clean.

### A new Implement attempt really ran

The latest click created a new durable attempt and result:

- Repair WorkItem: `88f9ee9c-c99d-4272-a721-596eb8196b14`
- new ImplementationAttempt: `93ed1646-e2cf-49dc-8134-0ba51ad8fc7f`
- attempt state: `completed`
- reserved WorkItem version: `4`
- source revision: `1e3f1530b3d4aaac7bc9411c22edc3a666c35e84`
- new ImplementationRecord: `201ad55b-efe9-4d65-b567-55d22c35c7c8`
- result outcome: `blocked`

The Implementer correctly reported:

> The artifact already conforms and must remain unchanged. The required sourceMutation policy cannot be satisfied without an unauthorized edit.

The WorkItem contract at version 4 still has:

`affectedPaths=["conformance/phase-1/work-card-01.txt"]`

while its approved instructions explicitly say to preserve the file unchanged when already correct. In ChampCity semantics, nonempty `affectedPaths` means `sourceMutation=required`. The Implementer therefore cannot honestly return `implemented` without manufacturing an unauthorized source edit.

The source itself is healthy:

- SourceBinding `5bce00f5-cfa7-47a1-af6d-6e20a9fbc259@10` is `ready`;
- Workflow checkout is registered and clean;
- current HEAD remains `1e3f1530b3d4aaac7bc9411c22edc3a666c35e84`;
- no new Repair SourceCheckpoint was created.

### F07 — semantic blocked is excluded from the R19 revision gate

`WorkCardImplementWorkspace.tsx` defines an unsuccessful completed result only as:

`partial | failed | abandoned`

and requires the WorkItem to be `ready`.

After the correct semantic `blocked` result, the Repair is now:

`workState=blocked`

so the renderer hides the governed revision action.

`structuredWorkItemPlanningService.get()` likewise computes revision eligibility only when the WorkItem is `planned` or `ready`.

`workflowExecutionApplicationService.executionPlanningContext()` also requires `planned|ready`, and its implementation-history gate accepts only `partial|failed|abandoned` (plus the existing bounded scope-failure case).

`assertWorkItemPlanningRevisionEligible()` repeats the same ready + completed unsuccessful assumption.

Therefore an exact semantic blocked result is outside every layer of the revision path.

### F08 — contract-correction deadlock

The application correctly moved the WorkItem to `blocked` after the semantic blocked result. That state is useful evidence: implementation cannot satisfy the currently approved contract.

But there is no transition from that exact safe blocked state back into planning. Re-running Implement simply reserves another attempt under the same impossible contract and produces another blocked result.

This is a lifecycle deadlock:

`approved mutation-required contract contradicts real source state → honest Implementer blocks → WorkItem blocked → planning refuses blocked WorkItem → contract cannot be corrected`.

This is not fundamentally Repair-specific. Repairs expose it more often because a requested correction may already be satisfied, no longer be needed, or need its mutation scope revised after inspection.

## Required correction

### A. Define one exact revision-eligible semantic blocked state

Extend the existing planning/revision guard rather than creating a new workflow.

A completed blocked WorkItem is revision-eligible **only** when all of the following are true:

1. exact active Workflow and exact current WorkItem;
2. latest current ImplementationAttempt is `completed`;
3. it owns exactly one latest ImplementationRecord for this WorkItem/Workflow;
4. latest result outcome is `blocked`;
5. WorkItem state is exactly `blocked`;
6. there is no successful `implemented` attempt for the current contract lineage that would make replanning unsafe;
7. no TesterResult, Validation, committed/pending/inspection SourceCheckpoint, or downstream disposition owns the blocked attempt;
8. no live/running/prepared competing attempt exists;
9. source-neutral or, for source-backed work, current SourceBinding remains `ready`, exact checkout identity/branch/HEAD/common repository remain valid, and Git status is clean;
10. no source mutation from the blocked attempt remains;
11. current planning review was approved before the blocked run;
12. Operator supplies an explicit nonblank revision reason and correct WorkItem CAS/version.

A generic WorkItem that is blocked for unrelated reasons—dependency, Phase, source binding failure, validation ownership, checkpoint recovery, ambiguous provenance, dirty source, active child Repair, or terminal lifecycle—must **not** become revisionable merely because its state says `blocked`.

Use the exact result/attempt/source provenance as authority.

### B. Extend existing typed revision flow, not a new Repair path

Update the same existing owners used by R19/R01/R02:

- `workflowExecutionApplicationService.executionPlanningContext()`
- `assertWorkItemPlanningRevisionEligible()`
- `structuredWorkItemPlanningService.get()/review()/save`
- `WorkCardImplementWorkspace.tsx`

Required behavior:

1. Treat exact completed `blocked` result + exact `workState=blocked` as a fourth governed unsuccessful planning case alongside partial/failed/abandoned.
2. `structuredWorkItemPlanningService.get()` must expose `revisionEligibility.eligible=true` for this exact safe blocked state.
3. Implement renderer must show the same bounded explanation and **Request Work Card Revision** control for a revision-eligible blocked result. Continue to Review & Validation remains disabled. Implement may remain unavailable/disabled when repeating the current contract would be pointless.
4. Clicking Request Revision records the existing typed `revision_requested` planning disposition; no direct WorkItem/source mutation from the renderer.
5. Canonical Greenfield navigation must then select the existing `work-card-repair` / `work-card-planning` surface because the planning disposition is no longer approved.
6. Architect submits a replacement contract through the existing candidate ingress and Operator review. No automatic inference that `affectedPaths=[]` is correct.
7. Saving/approving that replacement must intentionally reopen the exact blocked WorkItem to the existing executable planning state (`planned` or `ready`, whichever is canonical for the current planning lifecycle), while preserving all prior attempts/results unchanged.
8. A subsequent `prepareImplementationAttempt()` creates a fresh reservation against the new WorkItem version/contract. The old blocked attempt remains immutable historical evidence.
9. No special `repair` or `fix` execution branch. Feature/integration/infrastructure WorkItems with the same exact blocked-contract condition use the same path.

If `saveWorkItemPlanningContract()` currently cannot transition an exact revision-requested blocked WorkItem back to the canonical planned/ready state, add the **smallest typed state transition there** (or in the existing Project State planning owner). Do not add a renderer-authored WorkItem-state mutation or generic unblock command.

### C. Preserve blocked semantics

Do **not** weaken semantic `blocked`.

The latest live Implementer was correct to block. Preserve:

- mutation-required + no attributable source change cannot become `implemented`;
- no fake/no-op source commit;
- no automatic conversion of `blocked` to `partial` just to reuse R19;
- no automatic `affectedPaths=[]`;
- no source checkpoint for a blocked no-change attempt;
- no Tester/Review progression from blocked implementation;
- no deletion or rewrite of previous attempt/result/packet evidence.

The correction is **blocked → planning revision**, not blocked → success.

## Focused regression / acceptance

Use existing fixtures and owners.

1. **Exact contradiction fixture:** source-backed WorkItem has nonempty `affectedPaths`; approved implementation instructions require preserving the already-conforming target unchanged. Real Implementer returns semantic `blocked`; no files change; no checkpoint is created; WorkItem becomes `blocked`.
2. On the R04 baseline, prove:
   - renderer has no Request Revision action;
   - `revisionEligibility=false`;
   - typed revision request is rejected because WorkItem is not planned/ready / outcome not accepted.
3. With R04:
   - exact blocked result is rehydrated correctly after service restart;
   - `revisionEligibility=true`;
   - renderer shows blocked-result explanation and reason-gated Request Work Card Revision;
   - Continue remains disabled;
   - read/Refresh performs no SQL/Git mutation.
4. Request revision through the real typed review API. Verify canonical navigation moves to the existing Repair Planning/Work Card Planning surface without changing source or historical result.
5. Submit and approve replacement `affectedPaths=[]` contract through existing semantic candidate ingress. Verify:
   - blocked WorkItem reopens through the typed planning owner;
   - old attempt/result/packet remain byte-identical;
   - source HEAD/status unchanged;
   - new WorkItem version reflects only approved planning changes/state transition.
6. Start a **new** Implement attempt. Verify new reservation uses the new WorkItem version and `sourceMutation=not-required`, source checkout is read-only, already-correct artifact is unchanged, semantic result is `implemented`, checkpoint is `not-required`, and navigation reaches Review & Validation/Tester under R13.
7. Restart before and after the revised attempt to preserve R03 durable-status behavior.
8. Negative cases remain blocked from replanning:
   - blocked result with dirty checkout;
   - SourceBinding blocked/unprepared or HEAD drift;
   - Tester/Validation evidence exists;
   - pending/committed/inspection checkpoint exists;
   - latest attempt is running/prepared;
   - ambiguous/wrong-owner result;
   - successful implementation history makes revision unsafe;
   - dependency/Phase/active child Repair is the true blocker;
   - stale WorkItem CAS;
   - blank reason;
   - read-only inspection.
9. Existing `partial`, `failed`, `abandoned`, prepared-retry and successful WorkItem revision tests remain green.
10. Existing mutation-required WorkItems that genuinely need an edit still require attributable changes and committed checkpoint.

**Primary owners:**  
`src/main/workflow/workflowExecutionApplicationService.ts`  
`src/main/workCardPlanning/structuredWorkItemPlanningService.ts`  
`src/renderer/app/WorkCardImplementWorkspace.tsx`

**Tests:**  
`test/phase-planning/phase-planning-service.test.cjs`  
`test/workflow/workflow-execution-application-service.test.cjs`  
`test/renderer/work-card-implement-workspace.test.cjs`  
`test/work-card-building/codex-implementer-execution-service.test.cjs` only as necessary for semantic blocked/restart preservation.

Touch `src/shared/projectState/projectStateService.ts` only if the existing planning-save owner needs a bounded typed blocked→planned/ready transition after `revision_requested`. Do not add a new persisted state machine or generic unblock API.

## Live Operator acceptance after Architect review

Use the existing live Repair. Do not create another test Repair.

Current live state:

- Repair `88f9ee9c-c99d-4272-a721-596eb8196b14@6`
- `workState=blocked`
- latest attempt `93ed1646-e2cf-49dc-8134-0ba51ad8fc7f`
- latest result `201ad55b-efe9-4d65-b567-55d22c35c7c8`
- result outcome `blocked`
- SourceBinding ready at `1e3f1530b3d4aaac7bc9411c22edc3a666c35e84`
- Workflow checkout clean

Acceptance:

1. Restart app/service and open the Repair Implement screen.
2. It shows the latest blocked terminal result truthfully.
3. **Request Work Card Revision** is available with reason required.
4. Request revision; canonical Repair Planning opens.
5. Architect submits the deliberate inspection-only contract with `affectedPaths=[]`; Operator approves.
6. The exact Repair becomes executable again without manual SQL/Git manipulation.
7. Implement runs a fresh attempt, does not edit the already-correct file, returns `implemented`, checkpoint `not-required`.
8. Continue reaches Review & Validation and independent Tester.
9. Historical partial and blocked attempts/results remain visible/immutable.

Do not press Implement repeatedly under the old contract during implementation/qualification.

## Validation and handoff

Run the canonical **repair** validation planner with exact changed paths, focused affected owners and one production build. Preserve R13, R16–R18, R19/R01/R02/R03 focused regression owners. Do not repeatedly run unrelated broad suites.

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR19_R04_IMPLEMENTER_REPORT.md`

Include baseline red proof, exact blocked-state transition, immutable old attempts/results, navigation proof, revised no-mutation success, focused receipts and remaining live Operator acceptance.

**Checkpoint:** `WSF20-R19-R04 recover blocked Implement into planning revision`

Commit only attributable implementation/tests/report files. Preserve LOCALGIT01 and unrelated documentation. Stop for Architect review. No push, release, manual SQL edit, Git cleanup, SourceBinding mutation or live `greenfield_test` execution during implementation.
