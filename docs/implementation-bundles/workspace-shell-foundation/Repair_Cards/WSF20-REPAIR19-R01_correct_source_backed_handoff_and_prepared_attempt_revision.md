# WSF20-REPAIR19-R01 — Correct source-backed handoff and prepared-attempt revision

**Type:** Repair Card  
**Parent:** WSF20-REPAIR19 (D45–D47)  
**Review findings:** R19-F01 — misleading Architect source-backed planning guidance; R19-F02 — prepared ImplementationAttempt incorrectly blocked from requesting a planning revision  
**Starting baseline:** `fe0c69d28749079f2713aebdd16f83083b4e29a5` on `Dev` (reverify before edits)

> Preserve unrelated untracked Forgejo, MPSI and WSF material. This is a follow-up correction of two reviewed R19 boundaries—not a new workflow, R13 rewrite, or broad regression-cleanup card.

## Objective

Complete R19 so that its **actual Architect Copy Handoff** accurately supports a source-backed WorkItem requiring no mutation, and an exact **prepared-but-never-started** ImplementationAttempt does not strand the Operator at Implement when a governed planning revision is needed.

Retain the accepted R19 completed-unsuccessful-attempt revision loop, canonical SQL navigation, R13 source-backed no-mutation behavior and strict mutation-required checkpointing.

## Confirmed RCA

### F01 — Handoff contradicts R13

`src/main/workCardPlanning/structuredWorkItemPlanningService.ts` still generates these misleading instructions:

- `affectedPaths ... empty for source-neutral work`;
- `Source mode: source-backed; accepted affected paths required`.

They imply every source-backed WorkItem must list paths. R13 deliberately defines **source capability separately from mutation intent**: for source-backed WorkItems, approved `affectedPaths=[]` means `sourceMutation=not-required`, source remains available for inspection, and no implementation checkpoint is required when no source is changed.

`structuredRepairWorkspaceService.ts` embeds `planning.handoff` in the real Repair Architect handoff used by **Copy Handoff**. R19's Greenfield fixture submits an empty-path plan directly via candidate ingress, so its pass does not establish that the real Architect handoff gives correct instructions.

### F02 — Prepared reservation rejected by the new guard

`structuredWorkItemPlanningService.review()` now calls `assertWorkItemPlanningRevisionEligible()` for `revision_requested` whenever **any** ImplementationAttempt exists, including `attemptState=prepared`.

That R19 guard explicitly requires `attemptState=completed` with a latest unsuccessful ImplementationRecord. A prepared attempt has no result, so the requested revision is rejected even if Codex never began. `get()` likewise offers `revisionEligibility` only for completed attempts, and `WorkCardImplementWorkspace` exposes the request action only for completed partial/failed/abandoned results.

This contradicts the already-supported reservation lifecycle. `test/workflow/workflow-execution-application-service.test.cjs` (**durable report preparation, stale reservation rejection and completed report survive SQLite reopen**) proves that an approved WorkItem may prepare an attempt, then revise its execution plan **before Run**; the stale prepared reservation is rejected/abandoned through the typed lifecycle and a fresh one can begin. R19 did not test this path through its newly guarded planning disposition and canonical Implement UI.

This finding is specific to an exact **prepared, unstarted** reservation. It is not authority to revise a running or successfully completed WorkItem, or to discard evidence.

## Required correction

### A. Correct the real Architect handoff, without new planning contracts

Update only the generated guidance in `structuredWorkItemPlanningService.ts`:

- Source-neutral WorkItem: `affectedPaths=[]`; no source repository mutation.
- Source-backed WorkItem requiring mutation: include only the exact approved, normalized paths; implementation must produce attributable changes and a committed checkpoint.
- Source-backed WorkItem requiring inspection/no mutation: **`affectedPaths=[]` is valid**; the Implementer may read the verified checkout but must leave Git/source unchanged; a successful semantic result uses R13 checkpoint-not-required.
- `affectedPaths` expresses **authorized mutation intent**, not the list of every file that might be read as context.
- Approval of mutation intent belongs to the existing Architect candidate + Operator review; do not infer `[]` from Repair prose, existing correctness or a failed result, and do not auto-edit an approved WorkItem.

Preserve exact IDs/revisions, Criteria, dependencies, candidate ingress and handoff size controls. Verify the **Repair's composed `handoff`** used by Copy Handoff, not only a hardcoded snippet.

### B. Respect prepared-but-unstarted attempts in existing revision eligibility

Correct the bounded R19 eligibility/review flow in `structuredWorkItemPlanningService.ts`, `workflowExecutionApplicationService.ts`, and only the relevant `WorkCardImplementWorkspace.tsx` action gating.

- Keep R19's completed-unsuccessful revision case unchanged.
- Recognize a **current `prepared` attempt without an associated ImplementationRecord, execution start, SourceCheckpoint or Tester/Validation evidence** as pre-execution, not as a failed/successful implementation. For the exact current `planned/ready` WorkItem with approved current planning, allow the Operator to request `revision_requested` through the **existing typed planning-review API**, with exact identity, expected record-version CAS and a nonempty reason.
- Expose **Request Work Card Revision** in canonical Implement for that eligible prepared state, including when Start failed **before** Codex began. Do not require a fabricated `partial` result. Continue to Review must remain disabled.
- On successful disposition, resume the **canonical** Repair/Work Card Planning shell, submit/review/approve the replacement contract through existing semantic ingress, and let normal `prepareImplementationAttempt()` abandon the old stale prepared reservation and create/reuse the correct new reservation. No direct SQL changes, report replacement or renderer-owned abandonment.
- Read-only inspection, wrong WorkItem, stale version, superseded reservation, active/running attempt, completed successful result, existing source checkpoint or incompatible downstream evidence remain ineligible. Do not make dirty/unverified source executable or materialize/checkpoint merely to inspect revision eligibility.
- When blocked by a genuine provenance or safety constraint, provide a specific bounded reason instead of silently hiding an otherwise valid revision path. Reuse existing guards and typed commands; do not add a new authority or approval gate.

### C. Focused regression proof

Extend existing test owners instead of adding a new test harness.

1. **Actual handoff:** source-backed Greenfield WorkItem and exact Repair Architect handoff explicitly authorize `affectedPaths=[]` for inspection-only work and describe nonempty paths as mutation-required. Source-neutral guidance remains accurate. The test reads the real `createStructuredRepairWorkspaceService().get(...).handoff` (the Copy Handoff source), not a synthetic replacement string.
2. **Pre-execution reservation:** approved source-backed WorkItem / Repair has an exact durable `prepared` attempt, no running Codex session and no ImplementationRecord. From canonical Implement, show an enabled reason-gated Request Revision; invoke the real typed review API; verify SQL `revision_requested` and canonical Planning/Repair routing with no source or result mutation. No new attempt is created on read/Refresh.
3. Submit and approve the revised `affectedPaths=[]` plan through existing candidate ingress. Verify the original prepared attempt stays historically identifiable, becomes `abandoned` through the normal typed reprepare, and the new attempt executes source-backed/read-only; unchanged HEAD and clean checkout; `implemented`, checkpoint `not-required`; normal Review/Tester eligibility under R13.
4. **Negative cases:** a running attempt cannot revise; completed successful and checkpoint-owning attempts cannot revise; stale/wrong WorkItem and read-only inspection cannot revise; unexpected dirty or redirected checkout must not be modified. Existing completed `partial` R19 recovery remains green.
5. **Compatibility:** mutation-required nonempty `affectedPaths` still requires actual changes plus exact committed checkpoint; zero-change mutation-required execution remains blocked. R16–R18 historical recovery semantics are unchanged.

**Relevant existing owners:** `test/work-card-planning/work-card-planning-service.test.cjs`, `test/work-card-repair/work-card-repair-service.test.cjs`, `test/workflow/workflow-execution-application-service.test.cjs`, `test/renderer/work-card-implement-workspace.test.cjs`, and `test/phase-planning/phase-planning-service.test.cjs`. Reuse the existing R13 Implementer/Tester test as preservation proof where required. Prefer extending the current prepared-reservation test to prove the exact failed R19 guard before accepting the correction.

Use the canonical **repair** validation planner with exact changed paths and bounded focused owners; one necessary production build. Distinguish R19's previously reported broad-profile failures (772 pass / 21 fail / 1 skip at its earlier run) from any new regression; do not expand this card into unrelated source/integration diagnostics or repeatedly run the broad suite.

## Boundaries, report and handoff

**Expected production owners:** `src/main/workCardPlanning/structuredWorkItemPlanningService.ts`, the R19 eligibility helper in `src/main/workflow/workflowExecutionApplicationService.ts`, and the existing `src/renderer/app/WorkCardImplementWorkspace.tsx` revision action if necessary. Do not modify Greenfield navigation authority, create a second planning service, revise SQL schemas, rewrite historical attempts/packets, alter R13, fabricate Git edits or source-integrity validation, or touch unrelated Forgejo work.

No live `greenfield_test` SQL, source or attempts may be modified during implementation. Operator live qualification remains on the **existing** failed Repair after Architect code review.

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR19_R01_IMPLEMENTER_REPORT.md`, including confirmed R19 red regression, exact changed files, focused validation receipts, proof of current source-neutral/source-backed behavior and remaining live acceptance.

**Checkpoint:** `WSF20-R19-R01 correct Architect handoff and prepared revision`.

Commit only attributable implementation/tests/report files. Stop for Architect review. No live-project recovery, push, or release.
