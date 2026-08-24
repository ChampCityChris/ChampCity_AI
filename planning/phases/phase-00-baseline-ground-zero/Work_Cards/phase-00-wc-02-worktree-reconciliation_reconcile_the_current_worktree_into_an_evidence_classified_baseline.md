<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "formal-work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-00-baseline-ground-zero",
    "workCardId": "phase-00-wc-02-worktree-reconciliation",
    "candidateId": "phase-00-wc-02-worktree-reconciliation"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-00-baseline-ground-zero/Phase_Planning.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-00-baseline-ground-zero/Work_Card_Plan.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-00-baseline-ground-zero/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_phase-00-wc-02-worktree-reconciliation.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "phaseId": "phase-00-baseline-ground-zero",
    "workCardId": "phase-00-wc-02-worktree-reconciliation",
    "candidateId": "phase-00-wc-02-worktree-reconciliation",
    "candidate": {
      "candidateId": "phase-00-wc-02-worktree-reconciliation",
      "order": 2,
      "title": "Reconcile the Current Worktree Into an Evidence-Classified Baseline",
      "purpose": "Classify the material modified, deleted, and untracked repository state against current production source, current tests, approved planning, and intentional historical cleanup; preserve accepted implementation and intentional deletions; and correct or remove only state for which current evidence establishes a baseline defect or contradiction. Do not reconstruct deleted Phase 01-08 history merely for completeness.",
      "dependsOn": [
        "phase-00-wc-01-development-readiness"
      ],
      "resolutionStatus": "planned",
      "resolutionReason": "Approved evidence establishes that the repository is materially dirty and mixes accepted reconstruction/Harness work with intentional historical cleanup. The baseline must become understood and explainable before it can be validated or accepted.",
      "evidencePaths": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
        "planning/project/Phase_Map/PHASE_MAP_champcity_a_i.md",
        "planning/phases/phase-00-baseline-ground-zero/Phase_Interview.md"
      ],
      "phaseId": "phase-00-baseline-ground-zero"
    },
    "returnToPhasePlanningOnRejected": true,
    "repositoryAuthority": {
      "projectRepository": "C:\\Users\\chapm\\Projects\\ChampCity_AI"
    }
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": "2026-08-24T14:46:58.796Z"
  }
}
CHAMPCITY-METADATA -->

# phase-00-wc-02-worktree-reconciliation — Reconcile the Current Worktree Into an Evidence-Classified Baseline

## Verified Repository Evidence

The selected workspace is the Git-backed `champcity_ai` repository and supports filesystem read, artifact write, and Git inspection. The approved Work Card Intake handoff exists at `planning/phases/phase-00-baseline-ground-zero/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_phase-00-wc-02-worktree-reconciliation.md` revision 1. Its application-owned Formal Work Card target is `planning/phases/phase-00-baseline-ground-zero/Work_Cards/phase-00-wc-02-worktree-reconciliation_reconcile_the_current_worktree_into_an_evidence_classified_baseline.md`; that final target does not yet exist, which is consistent with this being the pre-promotion Architect draft workflow.

The approved `Work_Card_Plan.md` defines this candidate as classification and reconciliation of modified, deleted, and untracked repository state, preserving accepted implementation and intentional historical cleanup and forbidding reconstruction of deleted Phase 01-08 history merely for completeness. Work Card 03 separately owns active guidance/prompt alignment, Work Card 04 separately owns fresh full-baseline validation, and Work Card 05 separately owns the Operator-accepted clean Git baseline.

Current read-only `git status --short` shows 22 tracked modified paths and 14 untracked status entries, one of which is the `Validation_Records/` directory. It currently shows no deleted (`D`) entries. The material tracked state is:

- Phase-00 WC01 revision/report evidence: `planning/phases/phase-00-baseline-ground-zero/Work_Cards/phase-00-wc-01-development-readiness_verify_and_establish_current_build_development_readiness.md` and its canonical Implementer Report.
- REPAIR07 policy/prompt cluster: `planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`, `src/main/workCardPlanning/workCardPlanningService.ts`, `src/main/workCardValidation/workCardValidationService.ts`, and their focused prompt-contract tests.
- REPAIR06A and child execution-safety cluster: `src/main/main.ts`, `src/main/workCardBuilding/codexAppServerProtocol.ts`, `src/main/workCardBuilding/codexAppServerTransport.ts`, `src/main/workCardBuilding/codexImplementerExecutionPolicy.ts`, `src/main/workCardBuilding/codexImplementerExecutionService.ts`, `src/preload/index.ts`, `src/renderer/app/App.tsx`, `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`, `src/renderer/styles.css`, `src/shared/workspaceContracts.ts`, and the associated Work Card Building/renderer tests.
- REPAIR06B report-registration proof: `test/work-card-building/work-card-building-review-service.test.cjs`.

The current untracked repair cards and matching Implementer Reports for REPAIR06A, REPAIR06A-REPAIR01, REPAIR06A-REPAIR02, REPAIR06A-REPAIR02-REPAIR01, REPAIR06B, and REPAIR07 were inspected. Their reported changed-file surfaces correspond to the current tracked diff clusters, they consistently prohibit Git mutation, and they provide the audit rationale for why those source/test changes exist. They are evidence-bearing repository artifacts, not disposable untracked junk. The current WC02 Intake handoff is likewise application-owned workflow evidence and must be retained.

Current production inspection confirms the final REPAIR06A-child architecture represented by the dirty source: normal Work Card implementation uses repository-scoped `workspace-write`; explicit environment resolution retains the broader host-authority path; owned routine implementation approvals are frictionlessly resolved; obvious catastrophic host actions are hard-denied; user-input and MCP-elicitation requests remain interactive; and the IPC/preload/shared/renderer approval compatibility surface remains wired. `src/preload/index.ts` also independently confirms that the retained direct Project Planning read-model route `projectPlanning:getWorkspaceModel` / `getProjectPlanningWorkspaceModel` coexists with the generic Architect-output contract.

A concrete baseline contradiction is independently verified in `test/repository/runtime-wiring-source.test.cjs`. Its test `one generic Architect-output IPC and preload contract serves all catalog workspaces` currently treats the entire `/projectPlanning:/` namespace as retired. That contradicts the retained production/preload Project Planning read-model route. REPAIR07 explicitly identifies this assertion as stale and states that verified current production architecture outranks the obsolete source-string invariant. Production code must not be changed to satisfy that stale assertion.

`src/main/documents/canonicalMarkdownDocumentWriter.ts` confirms that substantive canonical revision/disposition transitions remain application-owned. REPAIR06B used that existing writer and added focused report-registration proof; WC02 must not hand-edit canonical metadata or reopen WC01 lifecycle state.

WC01 execution evidence establishes Git, Node.js, npm, repository dependency readiness, and a successful build in the approved Windows lane. No currently unverified machine-level development capability is required for this repository-state reconciliation, so this Work Card does not introduce a development-environment requirement block.

There is no new product runtime, IPC, preload, renderer, persistence, or UI workflow to implement for WC02. Those layers were inspected because their current dirty bytes require classification and preservation. The WC02 state transition is the repository working tree itself: evidence-classify every material entry, preserve proven current implementation/audit state, correct the one verified stale test invariant, and leave an auditable final worktree for later validation and Git-baseline cards.

No material Operator-owned architecture choice remains. Any repository entry whose ownership cannot be established from current repository evidence is unresolved evidence, not permission for the Implementer to guess, restore, delete, or redesign it.

## Objective

Convert the current materially dirty worktree into an evidence-classified, explainable baseline by preserving the existing repair-backed production/test/planning bytes and audit artifacts, correcting the verified stale Project Planning source-string test invariant without changing production behavior, and accounting for every final modified/deleted/untracked path in the canonical Implementer Report. This Work Card does not require a clean Git worktree; clean-baseline establishment remains Work Card 05.

## Runtime Sequence

1. From the selected repository root, capture an immutable starting snapshot using read-only Git/file inspection: current branch identity, `git status --short`, `git diff --name-status`, tracked working-copy hashes for every modified file, recursive enumeration and hashes of every untracked file, and explicit deleted-path enumeration if any deletion exists at execution time.
2. Expand directories such as `planning/phases/phase-00-baseline-ground-zero/Validation_Records/` to individual files. A directory-only classification is insufficient.
3. Classify every starting dirty path into exactly one of these evidence classes:
   - `retain-current` — current bytes are supported by approved/current planning, a governing repair/work-card artifact, matching implementation evidence, or current application-owned workflow evidence;
   - `retain-intentional-deletion` — the path is currently deleted and current approved evidence proves the deletion is intentional historical cleanup;
   - `correct-verified-contradiction` — current repository evidence proves a narrow contradiction and this Work Card explicitly authorizes its correction;
   - `remove-proven-orphan` — only when exact repository evidence proves the artifact is duplicate/temporary/orphaned and another identified authoritative artifact supersedes it.
4. Apply the Architect-owned initial classifications in Required Changes. Do not ask the Implementer to reinterpret the architecture or decide whether the known repair clusters should be kept.
5. Correct only the stale Project Planning assertion in `test/repository/runtime-wiring-source.test.cjs` as specified below. Do not change production code to make the obsolete assertion true.
6. Do not remove any current repair card/report, WC02 handoff, WC01 canonical artifact/report, or valid current Validation Record. If a Validation Record cannot be proven current/valid from its identity/source revisions, leave it untouched and report the unresolved evidence.
7. Capture the final snapshot using the same status, enumeration, and hash procedure.
8. Compare starting and final snapshots. Every final dirty path must be attributable either to a preserved starting classification or to the exact WC02-authorized test/report change. If unrelated concurrent changes appear, stop reconciliation, leave those bytes untouched, record the mismatch, and keep implementation incomplete rather than reconciling a moving target.
9. Update only the application-owned canonical Implementer Report with the complete classification ledger and proof. The report remains Pending for Architect review.

## Required Changes

Use this classification ledger shape in the Implementer Report for every individual dirty file:

```text
path | initial git state | initial sha256/absent | evidence class | governing evidence | WC02 action | final git state | final sha256/absent
```

Apply these current evidence-grounded classifications unless execution-time bytes no longer match the inspected state:

- `retain-current`: the current Phase-00 WC01 revision-2 Work Card and current WC01 Implementer Report. WC02 does not alter their metadata, disposition, body, or source-revision relationship.
- `retain-current`: all currently modified REPAIR06A/child execution-safety production, shared-contract, preload, renderer, style, and focused-test files identified in Verified Repository Evidence. Preserve their starting bytes exactly.
- `retain-current`: the current REPAIR07 Work Card/Repair Card standard, planning/validation prompt-service changes, and focused prompt-contract tests. Preserve their starting bytes exactly.
- `retain-current`: `test/work-card-building/work-card-building-review-service.test.cjs` current REPAIR06B report-registration proof. Preserve its starting bytes exactly.
- `retain-current`: the six currently untracked repair cards and six matching repair Implementer Reports named by current status. Preserve them byte-for-byte.
- `retain-current`: the WC02 Work Card Intake handoff at `planning/phases/phase-00-baseline-ground-zero/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_phase-00-wc-02-worktree-reconciliation.md`.
- `retain-current` for each valid current file under `planning/phases/phase-00-baseline-ground-zero/Validation_Records/` whose identity/source relationship is consistent with the current Phase-00 workflow. Do not rewrite those records merely because the directory is untracked.
- `retain-intentional-deletion`: none are present in the Architect's current status snapshot. If execution-time status contains deletions, classify each from current approved evidence. Do not reconstruct deleted Phase 01-08 history merely for completeness.

The one pre-authorized `correct-verified-contradiction` is `test/repository/runtime-wiring-source.test.cjs`:

- In the named test `one generic Architect-output IPC and preload contract serves all catalog workspaces`, remove the blanket invariant that every `/projectPlanning:/` channel is retired.
- Preserve the generic Architect-output assertions already in that test.
- Make the Project Planning exception explicit by positively preserving the current `projectPlanning:getWorkspaceModel` / `getProjectPlanningWorkspaceModel` read-model path and, if a negative Project Planning assertion is retained, narrow it to retired write-style forms such as `projectPlanning:(save|submit|saveOutput)` rather than the whole namespace.
- Do not modify `src/main/main.ts`, `src/preload/index.ts`, `src/renderer/app/App.tsx`, or Project Planning production code to satisfy this test.
- Do not broaden this correction into cleanup of unrelated assertions in the shared test file.

No current entry is pre-authorized as `remove-proven-orphan`. Removal is permitted only if execution-time inspection identifies an exact duplicate/temporary artifact and proves, by named repository authority, both why it is non-authoritative and which retained artifact supersedes it. If that proof is incomplete, preserve the file and record the unresolved classification instead of deleting it.

This Work Card must not create a separate reconciliation ledger, migration file, manifest, or baseline database. The canonical Implementer Report is the durable reconciliation record.

## Preserved Behavior

Preserve without reopening:

- current Phase-00 planning boundaries and the Work Card 02/03/04/05 separation of responsibility;
- WC01 revision-2 canonical Work Card and its current Implementer Report/lifecycle evidence;
- existing canonical writer and application-owned metadata/disposition authority;
- retained Project Planning read-model authority through `projectPlanning:getWorkspaceModel` and `getProjectPlanningWorkspaceModel`;
- generic Architect-output routes and catalog workflow alongside that retained Project Planning read model;
- normal Work Card implementation `workspace-write` authority and explicit environment-resolution broader authority;
- frictionless handling of routine owned implementation approvals;
- hard denial of the existing bounded catastrophic host-action set, including protected ChampCity termination, machine/session termination, and Windows service stop/restart/disable forms covered by the repair chain;
- interactive Codex user input and MCP elicitation, cancellation, streaming, report lifecycle, and side-effect-free status polling;
- REPAIR07 test-evidence relevance and failed-test classification guidance;
- all evidence-bearing repair cards/reports and valid Phase-00 Validation Records;
- intentional historical cleanup. Deleted Phase 01-08 history is not to be reconstructed merely because older repository history once contained it.

## Authorized Surface

Expected write surface for WC02 is intentionally small:

- `test/repository/runtime-wiring-source.test.cjs` — only the verified stale Project Planning invariant correction described above;
- `planning/phases/phase-00-baseline-ground-zero/Implementer_Reports/IMPLEMENTER_REPORT_phase-00-wc-02-worktree-reconciliation_reconcile_the_current_worktree_into_an_evidence_classified_baseline.md` — update the existing application-owned canonical report after Work Card approval/registration;
- a specific untracked file may be removed only if it meets the `remove-proven-orphan` rule with complete evidence and the removal is individually documented.

Required read/verification surface includes:

- all paths in the execution-time dirty snapshot, recursively including `Validation_Records/`;
- `planning/phases/phase-00-baseline-ground-zero/Phase_Planning.md`;
- `planning/phases/phase-00-baseline-ground-zero/Work_Card_Plan.md`;
- the WC02 Intake handoff;
- current WC01 Work Card and Implementer Report;
- the current REPAIR06A/child, REPAIR06B, and REPAIR07 cards/reports;
- `planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`;
- `src/main/main.ts`;
- `src/main/workCardBuilding/codexAppServerProtocol.ts`;
- `src/main/workCardBuilding/codexAppServerTransport.ts`;
- `src/main/workCardBuilding/codexImplementerExecutionPolicy.ts`;
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`;
- `src/main/workCardPlanning/workCardPlanningService.ts`;
- `src/main/workCardValidation/workCardValidationService.ts`;
- `src/main/documents/canonicalMarkdownDocumentWriter.ts`;
- `src/preload/index.ts`;
- `src/renderer/app/App.tsx`;
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`;
- `src/shared/workspaceContracts.ts`;
- the focused tests represented in the current dirty snapshot;
- `test/repository/runtime-wiring-source.test.cjs` and supporting current Project Planning presentation evidence.

No production TypeScript change is expected. If evidence reveals a different production defect, do not expand this Work Card to repair it; record the exact finding for separate disposition. A narrowly necessary adjacent change is authorized only within the stale test itself and its directly required assertion wording.

## Risks and Constraints

- The worktree is a moving shared state. Concurrent external edits can invalidate classification. Snapshot mismatch must block completion rather than trigger automatic reconciliation.
- Untracked does not mean disposable. The current repair cards/reports and application-owned workflow artifacts explain the dirty implementation and are to be preserved.
- Historical deletion does not mean missing implementation. Do not restore Phase 01-08 artifacts merely to make the repository look complete.
- Current repair reports are evidence, not sole authority. Classification must also match current source/test bytes and approved/current planning or workflow evidence.
- The stale Project Planning assertion is a test-baseline defect. Production behavior must not be changed to satisfy it.
- WC02 does not own broad guidance cleanup, broad test cleanup, full integration validation, or Git baseline creation. Do not absorb WC03, WC04, or WC05.
- Do not perform formatting, line-ending normalization, package/lockfile changes, dependency upgrades, or unrelated documentation cleanup while touching retained files.
- An unresolved file classification is a blocker for claiming WC02 complete. The safe state is to preserve the file and report why authority could not be established.

## Acceptance Criteria

1. **Complete starting inventory.** The Implementer Report contains an individual-file ledger for every execution-time modified, deleted, and untracked file, including recursive contents of untracked directories. Each entry records initial state/hash, one allowed evidence class, named governing evidence, action, and final state/hash. No material dirty path is omitted or classified only at directory level.

2. **Repair-backed current bytes are preserved.** Every currently modified production/shared/preload/renderer/style file and every current focused test belonging to the REPAIR06A/child, REPAIR06B, or REPAIR07 clusters remains byte-identical to its WC02 starting hash, except `test/repository/runtime-wiring-source.test.cjs`, which was not in the starting dirty set and is the explicit WC02 correction. The WC01 Work Card/report and all retained untracked repair cards/reports likewise remain byte-identical.

3. **Historical cleanup is not reversed.** Execution-time status records whether deleted paths exist. No absent Phase 01-08 history is reconstructed merely for completeness. Any actual deleted entry is restored only if current approved evidence specifically proves the deletion itself is erroneous; otherwise it is retained as intentional deletion or left unresolved.

4. **The stale Project Planning invariant is corrected at the test boundary.** The named runtime-wiring test no longer rejects the entire `projectPlanning:` namespace. Focused proof establishes the retained `projectPlanning:getWorkspaceModel` / `getProjectPlanningWorkspaceModel` path while still rejecting any explicitly retained retired Project Planning write-style forms. Generic Architect-output assertions continue to pass. No production source is changed for this correction.

5. **No production behavior is changed by WC02.** Before/after hashes prove all production TypeScript/renderer/style files present in the starting dirty snapshot are unchanged by this Work Card. If a production contradiction is discovered, it is reported for separate disposition rather than repaired here.

6. **Workflow/audit artifacts are not treated as junk.** The WC02 Intake handoff, the six current repair cards, their six matching Implementer Reports, and every valid current Phase-00 Validation Record remain present and unchanged. If any Validation Record is malformed, stale, or source-mismatched, the exact evidence is recorded and the file is preserved unless the `remove-proven-orphan` standard is fully satisfied.

7. **Final worktree is fully explainable.** Final `git status --short` and recursive untracked enumeration map every remaining dirty file to a ledger entry. The only WC02-created repository-content change outside the canonical report is the authorized stale-test correction, unless an individually proven orphan removal occurred. No unexplained new path remains.

8. **Focused validation matches WC02 ownership.** Run the relevant named test rather than making the entire multi-domain repository suite a WC02 gate:

```text
node --test --test-concurrency=1 --test-name-pattern="one generic Architect-output IPC and preload contract serves all catalog workspaces" test/repository/runtime-wiring-source.test.cjs
```

The matching test passes. Use a scoped read-only diff/whitespace check for the WC02 test change. Broader tests may be run as supporting evidence but unrelated/pre-existing failures are classified rather than automatically attributed to WC02. Full baseline build/integration cleanliness remains Work Card 04.

9. **Failure handling is conservative.** A concurrent worktree change, unclassifiable material artifact, source-revision ambiguity, or evidence conflict causes WC02 to remain incomplete with the exact blocker recorded. The Implementer does not resolve ambiguity through deletion, restoration, production redesign, or Git reset/clean operations.

10. **No Git mutation occurs.** Read-only Git inspection is permitted and reported. No stage, commit, push, tag, branch change, merge, rebase, reset, restore, clean, checkout, or stash is performed.

11. **Canonical proof is complete and Pending.** The exact application-owned WC02 Implementer Report target is updated with the full ledger, acceptance evidence, commands/results, changed-file accounting, any individually justified removal, residual risks, and remaining Operator validation. Its workflow disposition remains Pending for Architect review.

## Negative Constraints

Do not:

- use `git restore`, `git checkout`, `git reset`, `git clean`, stash, or any other bulk mechanism to make the worktree resemble `HEAD`;
- stage, commit, push, tag, merge, rebase, or change branches;
- delete untracked repair cards/reports, the WC02 Intake handoff, or Validation Records merely because they are untracked;
- reconstruct deleted Phase 01-08 planning/history merely for completeness;
- change production source to satisfy the stale Project Planning source-string test;
- alter WC01 canonical metadata, disposition, source revisions, or report status;
- hand-edit canonical metadata or create an alternate canonical writer;
- create a second reconciliation ledger, baseline manifest, schema, database, or migration mechanism;
- broaden the stale-test correction into unrelated runtime-wiring test cleanup;
- perform the guidance/prompt reconciliation owned by WC03;
- perform the fresh full-baseline build/integration/smoke validation owned by WC04;
- establish, stage, commit, or otherwise claim the clean Operator-accepted Git baseline owned by WC05;
- modify package manifests, lockfiles, dependencies, machine tooling, provider integrations, MCP/OAuth architecture, or unrelated UI;
- normalize formatting or line endings across retained files;
- delete or rewrite a file whose authority remains uncertain.

## Implementer Report Requirements

The Implementer must update the existing canonical report at exactly:

`planning/phases/phase-00-baseline-ground-zero/Implementer_Reports/IMPLEMENTER_REPORT_phase-00-wc-02-worktree-reconciliation_reconcile_the_current_worktree_into_an_evidence_classified_baseline.md`

Do not create an alternate report. Implementation is incomplete until that exact report contains complete auditable evidence and remains Pending for Architect review.

The report must:

- verify the selected repository/workspace and approved WC02 Work Card identity used for implementation;
- capture the complete starting and final `git status --short` evidence plus recursive untracked-file enumeration;
- include the required per-file classification ledger and hashes;
- identify the governing evidence used for every `retain-current`, `retain-intentional-deletion`, `correct-verified-contradiction`, or `remove-proven-orphan` decision;
- explicitly list the starting repair-backed production/test files whose bytes were preserved and prove their final hashes match;
- list every untracked repair card/report and Validation Record retained, removed, or left unresolved and explain why;
- document the exact stale Project Planning test change and prove production source was not changed for it;
- map Acceptance Criteria 1-11 to concrete commands, file/hash evidence, named test results, and final state;
- identify every file changed by WC02 itself and distinguish it from pre-existing dirty state;
- record any concurrent worktree mutation, evidence conflict, unresolved classification, scope expansion, or blocker;
- record all read-only Git commands/inspection used and confirm no Git mutation occurred;
- distinguish focused WC02 proof from broader validation intentionally deferred to WC04;
- identify remaining Operator validation and residual risk without claiming Operator acceptance, Phase completion, or clean Git baseline establishment.

## Manual Validation

None is required for WC02 product behavior. This Work Card introduces no UI, interactive runtime, timing-sensitive, or embedded-browser behavior. Operator review is the repository diff/classification evidence and the canonical Implementer Report; live product validation belongs to later cards when their owned behavior requires it.
