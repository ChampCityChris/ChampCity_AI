# WSF20-REPAIR19 — Recover failed Implement into governed replanning, not a false Review transition

**Type:** Repair Card  
**Parent:** WSF20 — Workspace Shell Foundation  
**Defects:** WSF20-D45 (false Continue / silent Refresh), D46 (failed-Implement replanning inaccessible), D47 (application-owned integration proof confused with Implementer responsibility)  
**Predecessor:** WSF20-REPAIR18  
**Starting baseline:** `f667a26f05fc619a61fddbc4bbd1f627cf3467a7` (`Dev`, reverify before implementation)

> Preserve all unrelated dirty Forgejo/bootstrap, MPSI, and WSF documents. Do not alter the live Greenfield_Test Project State, runtime packets or Git during implementation.

## Objective

Make a failed/partial source-backed WorkItem an actionable **Implement** state rather than presenting a Continue button that returns silently to the same stage. Let the Operator request a **governed revision of that exact failed WorkItem** using existing planning/disposition APIs, so an approved no-mutation contract may then follow the already accepted R13 Implement → Review/Tester path.

Clarify the Implementer's responsibility for application-owned integration validation. This is **not** a new mutation/checkpoint policy, SQL schema, or alternate Repair pipeline.

## Verified live RCA

**R18 succeeded:** Greenfield_Test parent SourceCheckpoint `afd043b6-ad5b-4e5e-ae49-b60a12fc85de` is **committed**, SourceBinding `5bce00f5-cfa7-47a1-af6d-6e20a9fbc259@10` is **ready** at `1e3f1530b3d4aaac7bc9411c22edc3a666c35e84`, and the managed Workflow checkout is **clean**. The old Repair reservation `8911e018-46a6-407a-836c-263d5170128d` was abandoned and replaced.

**The new Repair executed:** WorkItem `88f9ee9c-c99d-4272-a721-596eb8196b14`, attempt `937253a2-1c28-455a-b531-b909fe1137c7` (completed), and immutable ImplementationRecord `69fbed9e-0c3b-45d5-a7df-e4a11082453c` (`outcome=partial`). The packet states that Codex verified `conformance/phase-1/work-card-01.txt` was correct, deliberately left it unchanged, and treated unavailable `champcity-source-integrity` execution as a blocker. SQL WorkItem returned to `ready`; **no Repair SourceCheckpoint was created**. This is not a recurrence of R16–R18 source recovery.

### D45 — Continue does not reflect SQL navigation authority

- `WorkCardImplementWorkspace.tsx` enables **Continue to Review & Validation** whenever the latest attempt is merely `completed`. It does not require a successful implementation, exact current Review stage or satisfied source checkpoint semantics.
- Its `onNext` is wired through `GreenfieldStageComposition.tsx` to `GreenfieldWorkspace.resume()`, which reads `getGreenfieldNavigation` and returns the canonical SQL stage.
- `greenfieldNavigationService.ts` correctly retains **Implement** whenever the WorkItem remains `ready`; it selects Review only for the appropriate `validation_pending` completed attempt. Therefore the enabled Continue click reloads the same Implement stage with no explanation.
- **Refresh** in `WorkCardImplementWorkspace` rereads local data but supplies no success feedback; its bare `void refresh()` click does not catch/reveal a rejected read and does not explicitly refresh parent canonical navigation. On unchanged SQL it appears inert.
- `WorkCardImplementShell.tsx` gives every generic `Source checkpoint:` message the default green success styling, including `checkpoint.status=blocked`. The live screenshot shows this misleading signal.

### D46 — approved Repair permits no change, but the canonical WorkItem plan requires mutation

- The approved live Repair explicitly says **preserve the file if already correct** and records that no defect was identified; the file is correct. However its accepted `affectedPaths=["conformance/phase-1/work-card-01.txt"]` makes the execution contract `sourceMutation=required` under **WSF20-R13**. An actual zero-change result therefore cannot create the required Implementation SourceCheckpoint. Do not invent a Git edit to satisfy that contract.
- `workflowExecutionApplicationService.acceptWorkItemExecutionPlan()` **already allows governed replanning after partial/failed/abandoned attempts** when the WorkItem is `ready`, no incompatible Tester/Validation/checkpoint evidence exists, and source-backed HEAD and checkout are clean at the current SourceBinding revision. The current live Repair meets these conditions; do not create a new SQL recovery service or alter its protections.
- `WorkCardRepairWorkspace` already supports an Operator `revision_requested` planning disposition and existing MCP `work-item-planning` candidate ingress. But from canonical **Implement**, navigating to the Repair Planning rail opens *read-only inspection* in `GreenfieldWorkspace`; the Operator has no operative way to request the revision there.
- Required target: the Operator explicitly requests a planning revision **from the canonical failed-Implement context**. The existing typed review disposition changes the canonical SQL navigator to Repair Planning; the Architect may then resubmit, and the Operator approves the revised exact plan. This is an existing planning lifecycle, not a new approval gate.

### D47 — validation ownership conflated at Implementer handoff

- The live packet says `Required champcity-source-integrity validation could not be run: the checkout declares the application-owned runner but provides no callable validation entry point.`
- `managedRepositoryIntegrationPolicy.ts` defines `runner.kind=source-integrity` as an **application-owned integration policy**. `integrationPolicyProvider.ts` and `integrationSourceIntegrityRunner.ts` execute it against the registered **isolated integration candidate**, using application-supplied immutable context. It is intentionally **not** a shell/npm script exposed in a normal WorkItem checkout.
- The accepted WorkItem `proofIntent` describes this check **wherever the workflow invokes it**. The prompt in `buildWorkflowWorkItemCodexPrompt()` tells the Implementer to follow all proofIntent and says independent proof cannot be claimed, but does not explicitly distinguish future application-owned integration validation from implementation-local work. In this live run Codex treated that future validation as a missing Implementer prerequisite and returned `partial`.
- The Implementer's semantic result must remain truthful: do not silently convert an existing `partial` packet to `implemented` or claim a validation passed merely because it is deferred.

## Required correction

### A. Accurate navigation, Refresh and checkpoint presentation

In the existing Work Card Implement renderer and Greenfield composition:

1. Compute **Continue** eligibility from the exact current SQL navigation/review boundary, not `ImplementationAttempt.attemptState=completed` alone. At minimum require canonical `work-card-report-review` for the same WorkItem, the latest successful implemented result, and a fulfilled implementation checkpoint policy (`committed` or R13 `not-required`). Do not auto-advance upon polling.
2. On `partial`/`failed` completed attempts while the WorkItem remains `ready`, keep canonical Implement and show a bounded explanation that Review/Tester is not yet eligible. Disable Continue, rather than letting it silently resume to Implement.
3. Make explicit **Refresh** consume/reveal success or failure and reconcile the current exact navigation projection. Preserve R16's surfaced Start result until an explicit Refresh or authoritative subsequent result.
4. Render `checkpoint=blocked` as a failure/warning, `committed` as success, and `not-required` neutrally. Never display a blocked checkpoint in green.
5. Preserve read-only inspection, exact WorkItem identity, running/cancel statuses and existing approved successful transitions.

### B. Use the existing typed WorkItem planning-revision path

From the *canonical* Implement surface **only** when the latest attempt is completed with unsuccessful `partial`/`failed`/`abandoned` outcome, the exact WorkItem is `ready` and eligible for governed revision:

1. Expose a concise **Request Work Card Revision** action with Operator-entered revision reason (same approval vocabulary as the existing Work Card Planning/Repair surface).
2. Invoke the existing typed `reviewStructuredWorkItemPlanning(... outcome: "revision_requested", expectedRecordVersion, notes)` for the **exact** Workflow and WorkItem; then refresh authoritative SQL navigation. The request changes disposition, not the immutable old attempt/result.
3. Let the canonical SQL resolver enter the existing `work-card-repair` (or ordinary `work-card-planning` for non-Repair WorkItems) stage. Reuse its existing MCP candidate ingress, current contract review, Operator approval and next Implement Start. Never create a renderer-only writable noncanonical inspection exception.
4. Retain all existing application/domain replanning guardrails: no successful/checkpointed/Tester-validated prior implementation, no conflicting live attempt, exact SourceBinding and clean checkout, version CAS, approval required for revised plan. If a typed review or save guard refuses for a valid failed case, correct **only** that precise boundary under matching tests; do not bypass it with renderer-authored WorkItem mutations.
5. Preserve historic unsuccessful ImplementationAttempt/ImplementationRecord/packet bytes. A revised and approved WorkItem must create/reuse the appropriate **new** reservation without replacing historical evidence.

**For the current live exercise:** the Architect should revise the already-conforming, test-only Repair to **`affectedPaths=[]`**, preserving its meaningful inspection/proof intent and exact parent lineage, subject to normal Operator approval. Under R13 this is a source-backed read-only/no-mutation WorkItem: the Implementer can inspect the existing file, return `implemented` if true, no implementation SourceCheckpoint is required, and Review/Tester may proceed at the same source revision. If actual correction were required, retain nonempty affected paths and perform an approved edit. Do **not** infer either choice from prose or automatically change the live plan.

### C. Clarify stage responsibility in the existing Implementer prompt

In `buildWorkflowWorkItemCodexPrompt()`, state unambiguously:

- `proofIntent` may describe downstream Tester/Validator/integration proof; only implementation-local checks available within the exact WorkItem execution boundary belong to the Implementer.
- Application-owned integration checks such as `champcity-source-integrity` are run later by ChampCity on registered candidate source. They are not expected to be callable from the WorkItem checkout; do not treat that fact **alone** as a blocker to an otherwise successfully implemented, policy-compliant WorkItem.
- Do not claim a check passed without running it. Report outstanding downstream proof truthfully in `residualRisks` when appropriate.
- The approved `sourceMutation` contract still governs implementation: **required** means a qualifying source change/checkpoint is necessary for success; **not-required** means zero unauthorized changes and checkpoint-not-required. Never fabricate file edits or a successful outcome to bypass mutation policy.

Keep this generic to source-backed WorkItems. Do not add a source-integrity shim, script, CLI launcher or new validation authority in the Implementer.

## Focused regression / acceptance

Extend **existing** owned test fixtures; avoid a new parallel Greenfield pipeline:

1. SQL-backed source-backed Repair with approved `affectedPaths` nonempty and conditional no-change wording, current correct file, clean checkout, latest completed `partial` record and WorkItem `ready`. Verify **Continue disabled**, bounded explanation, correct blocked styling and explicit Refresh feedback. Refresh failures must be visible; repeated read/refresh must not change SQL.
2. On a successful `implemented`+committed checkpoint WorkItem, or a legitimate R13 `implemented`+checkpoint-not-required WorkItem, **Continue enabled only at exact canonical Review & Validation**, and one click navigates to that stage.
3. The authorized **Request Work Card Revision** on the exact unsuccessful ready WorkItem records `revision_requested` via the existing typed API and moves canonical navigation to the existing writable planning/Repair stage. An unselected WorkItem, read-only inspection, still-running attempt, successful/checkpointed attempt, stale WorkItem version, or unclean checkout must not be modifiable.
4. Submit/review/approve an exact replacement plan with `affectedPaths=[]` through existing typed planning/ingress, after an immutable unsuccessful attempt. Prove no historical attempt/result/packet rewrite or ghost checkpoint, and next Start yields source-backed `sourceMutation=not-required`, genuinely unchanged HEAD/checkout and `implemented`, then Review & Validation with Tester eligible under R13.
5. For an actually changed mutation-required WorkItem, retain mandatory attributable checkpoint and strict no-change failure. Existing R16–R18 recovery, R13 no-mutation, source path scope, independent Tester proof, and integration-runner ownership remain intact.
6. Prompt test verifies the source-integrity runner is described as application-owned downstream validation, not a WorkItem npm/shell command, while semantic outcome and checkpoint obligations remain distinct.

**Test owners:** `test/renderer/work-card-implement-workspace.test.cjs`; `test/renderer/greenfield-shell-composition.test.cjs`; `test/workflow/workflow-execution-application-service.test.cjs`; `test/phase-planning/phase-planning-service.test.cjs`; existing Codex Implementer/Tester R13 owner and `test/agent-harness/integration-policy-semantics.test.cjs` only where affected. Add no test harness if these owners suffice.

Run the canonical **repair** validation profile with exact changed paths/owned capabilities, one build/static validation and focused failed-to-revision-to-no-mutation loop. Record separately any pre-existing or unrelated failures; do not repeatedly run broad suites.

## Implementation boundaries

Expected production owners: `src/renderer/app/WorkCardImplementWorkspace.tsx`, `src/renderer/app/WorkCardImplementShell.tsx`, `src/renderer/app/GreenfieldStageComposition.tsx` and/or `GreenfieldWorkspace.tsx` for the exact navigation callback, and `src/main/workCardBuilding/codexImplementerExecutionService.ts` for its Implementer prompt. Modify `workflowExecutionApplicationService.ts` or typed planning service **only if an exact existing guard demonstrably rejects** the already-supported safe unsuccessful-attempt replan. Do not add a new data model.

**Forbidden:** no live SQL edits, no manual Git cleanup, no retroactive conversion of `partial` into `implemented`, no fake checkpoint or dummy file mutation, no change to R13 nonempty-path mutation-required invariant, no integration validation run from WorkItem checkout, no new approval gate, no noncanonical writable inspection, no broad Git/source redesign, no Forgejo/bootstrap or unrelated Tester changes.

## Operator acceptance and Implementer checkpoint

On the **existing** Greenfield_Test Repair, reload the new build. The failed attempt is accurately displayed; Continue is unavailable with reason, Refresh visibly responds, and **Request Work Card Revision** returns to the canonical Repair Planning workflow. The Architect submits a no-mutation revision, the Operator approves it, and the existing Repair reruns against the clean source and advances through R13 to Review & Validation. No live data is repaired manually and no historic attempt is lost.

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR19_IMPLEMENTER_REPORT.md` with exact RCA, changed files, focused proof and receipts, source/packet preservation, and residual live acceptance. Commit **only attributable implementation/test/report files** using `WSF20-R19 restore failed Implement revision and truthful navigation`, then stop for Architect code review. Do not run the live Greenfield workflow during implementation.
