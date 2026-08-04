<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC44-REPAIR05",
    "repairId": "WC44-REPAIR05",
    "parentWorkCardId": "WC44"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44-REPAIR05_work_card_close_next_workspace_completion.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR05_work_card_close_next_workspace_completion.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC44-REPAIR05 Work Card Close / Next Workspace Completion",
    "reviewResult": "RevisionRequested",
    "blockingDefects": 2,
    "operatorValidationRequired": false
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "The implementation adds the missing close projection bridge and a dedicated Close / Next view, but the close return is renderer-only while backend current workflow still resolves work-card-close. After returning to phase-work-card-selection, the next handoff action can still call generateCurrentHandoff against backend work-card-close and reproduce the unauthorized handoff error. Additional renderer/source tests do not prove the real post-return handoff path.",
    "reviewedAt": "2026-08-04"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC44-REPAIR05 Work Card Close / Next Workspace Completion

Disposition: `RevisionRequested`  
Git mutation: none performed by this review

## Review Boundary

ChampCity MCP was used for repository inspection. The reviewed workspace was `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. MCP git status reported a dirty working tree with no staged files, 32 tracked modified files, and 34 untracked files at review start. The configured remote match is reported by diagnostics as `unknown`; repository identity is reported by MCP as `ChampCityChris/ChampCity_AI`.

The exact governing Work Card and Implementer Report were inspected first:

- `planning/phases/phase-08/Work_Cards/WC44-REPAIR05_work_card_close_next_workspace_completion.md`, revision 1, sha256 `91a984f25c894109ab02abc2f491910b65c85ea0d9532f3d0011b566c25d94f4`.
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR05_work_card_close_next_workspace_completion.md`, revision 1, sha256 `fda0468e451071284fbbaf5483673fb43c583ff92ee3211afffcefdb246a5577`.

The relevant production and test path inspected for this review included:

- `src/shared/workspaceContracts.ts`;
- `src/preload/index.ts`;
- `src/main/main.ts`;
- `src/main/currentWorkflow/currentWorkflowService.ts`;
- `src/main/workCardValidation/workCardValidationService.ts`;
- `src/main/workCardIntake/workCardIntakeService.ts`;
- `src/renderer/app/App.tsx`;
- `src/renderer/app/WorkCardCloseWorkspace.tsx`;
- `test/renderer/work-card-close-workspace.test.cjs`;
- `test/repository/runtime-wiring-source.test.cjs`;
- `test/workflow/current-execution-context.test.cjs`.

This review did not run local commands, launch Electron, or execute the application. MCP does not expose a confirmed command-execution lane. Implementer-reported `npm run typecheck`, `npm run build`, and `npm test` results are treated as reported evidence only. Source and test content were independently inspected.

## Implementation Accepted as Verified

The implementation does repair part of the previously confirmed defect.

`src/shared/workspaceContracts.ts` now exposes `getCurrentCloseProjection(): Promise<RuntimeActionResult>` on `ChampCityApi`. `src/preload/index.ts` maps that method to `currentWorkflow:getCloseProjection`. The existing main-process channel `currentWorkflow:getCloseProjection` remains the authority path into `currentWorkflowService.getCurrentCloseProjection()` and `workCardValidationService.getWorkCardCloseProjection()`.

`src/renderer/app/WorkCardCloseWorkspace.tsx` is a dedicated close surface. It renders the current phase/work-card identity, the projection action, close status, return target, reason, and close evidence mapped from `currentModel.sourceEvidence` against document inventory. This avoids depending on `getWorkspaceGroups(documents, "work-card-close")`, which would not show Validation Records because those remain owned by `work-card-validation`.

`src/renderer/app/App.tsx` now excludes `work-card-close` from the generic action workspace path and renders `WorkCardCloseWorkspace` for `activeWorkspaceId === "work-card-close"`. The close-specific component and the close-return source slice do not call `generateCurrentHandoff()`. This addresses the immediate incorrect button/action model inside the Close / Next view.

`test/renderer/work-card-close-workspace.test.cjs` adds component-level proof that the close projection, evidence names, return button, and closed/not-closed states render. `test/repository/runtime-wiring-source.test.cjs` now includes `currentWorkflow:getCloseProjection` / `getCurrentCloseProjection`. `test/workflow/current-execution-context.test.cjs` verifies the backend can resolve `work-card-close`, load a closed projection, reject `generateCurrentHandoff()` while current workflow is `work-card-close`, and classify the candidate as complete through `selectNextWorkCardCandidate()`.

## Blocking Findings

### 1. Close return still does not restore a backend-authorized next-candidate action

The Work Card objective required this runtime sequence:

```text
Current Approved Validation Record
→ Operator clicks Return to Phase Building / Next Work Card
→ renderer verifies current close projection and refreshes repository evidence
→ renderer transitions to phase-work-card-selection without writing new lifecycle state
→ Work Card selection re-evaluates approved validation evidence and shows the next eligible candidate or all-complete state
```

The implementation transitions only the renderer `activeWorkspaceId` to `phase-work-card-selection`. It does not change the backend current workflow model. The backend current workflow resolver still derives `work-card-close` from the fresh Approved Validation Record associated with the still-Pending Implementer Report.

The relevant source path is:

```text
currentWorkflowService.modelForPendingReportWithValidationDecision()
→ Pending implementer-report + fresh Approved validation-record
→ activeWorkspaceId: "work-card-close"
```

`App.tsx.returnFromWorkCardCloseToSelection()` calls `transitionToWorkflowStep("phase-work-card-selection", ...)`, but it does not cause `getCurrentWorkspaceModel()` to become `phase-work-card-selection`. That matters because the phase-work-card-selection action button still calls `window.champcity.generateCurrentHandoff()`, and `generateCurrentHandoff()` recomputes backend current workflow from repository evidence rather than accepting the renderer's selected workspace.

The backend `generateCurrentHandoff()` source still begins with:

```text
const model = getCurrentWorkspaceModel(workspaceRoot)
switch (model.activeWorkspaceId) { ... }
```

Therefore, after the renderer-only return, the next `Run Current Handoff Action` from the visible selection workspace can still execute against backend `model.activeWorkspaceId === "work-card-close"` and throw:

```text
Current workflow step does not authorize a handoff action: work-card-close
```

That is the same class of error the repair was intended to eliminate from the close/next process. The current fix hides the invalid handoff button in the close view, but it does not prove or complete the next-candidate return path.

Affected acceptance criteria: 6, 9, 10, 11, 16, and 17.

### 2. Tests do not prove the real post-return production path

The added tests prove useful source and component conditions, but they do not prove the actual runtime path after `Return to Phase Building / Next Work Card`.

Specifically, `test/workflow/current-execution-context.test.cjs` directly calls `selectNextWorkCardCandidate(root, "phase-01")` after backend `getCurrentWorkspaceModel()` resolves `work-card-close`. That proves candidate selection can classify a completed candidate if called directly. It does not prove that the application can reach the candidate-selection handoff path through the real current workflow service after the close return.

The missing proof is the production sequence that matters:

```text
Approved validation record exists
→ backend current workflow resolves work-card-close
→ user clicks close return
→ renderer displays phase-work-card-selection
→ user runs current handoff action for the next candidate
→ generateCurrentHandoff() uses backend current workflow
→ next candidate handoff is generated or all-complete state is shown without work-card-close rejection
```

No inspected test proves that sequence. The existing source tests are primarily regex-based and would not fail if the renderer transitions visually while the backend action authority remains stuck on `work-card-close`.

Affected acceptance criteria: 6, 9, 10, 11, 16, and 17.

## Non-Blocking Process Finding

The governing Work Card artifact still has `documentDisposition.status: "Pending"` and workflow status `pending_operator_approval`. The Operator may have authorized implementation outside the repository, but the durable repository evidence does not show the Work Card itself as Approved. This should be corrected by the normal lifecycle mechanism if this pass continues, but the functional blocking findings above are sufficient to require revision.

## Acceptance Criteria Assessment

| AC | Result | Assessment |
|---:|---|---|
| 1 | Pass | `work-card-close` remains registered and backend resolution to close remains supported. |
| 2 | Pass | Shared API and preload now expose `currentWorkflow:getCloseProjection`. |
| 3 | Pass | Close surface displays projection state, reason, return target, phase ID, Work Card ID, and source evidence paths. |
| 4 | Pass | Evidence names are matched from current model source evidence and document inventory. |
| 5 | Pass | Close UI and close-return function do not call `generateCurrentHandoff()`. |
| 6 | Fail | The renderer transitions to `phase-work-card-selection`, but backend current workflow remains `work-card-close`; the next action can still be unauthorized. |
| 7 | Pass | Inspected close-return source performs navigation/refresh only and writes no artifact. |
| 8 | Pass | Inspected close-return source does not mutate Validation Record or Implementer Report disposition. |
| 9 | Fail | Direct service call proves candidate completion, but the actual returned workspace action authority remains backend `work-card-close`. |
| 10 | Not proven | No production-path proof that the next eligible candidate can be presented and acted on after close return. |
| 11 | Not proven | No production-path proof that all-complete state is reached after close return through the real current workflow action path. |
| 12 | Pass | Component test and source render disabled/blocking state when projection is not closed. |
| 13 | Not proven | The inspected component blocks false projection, but no integrated stale-evidence production path is proven. |
| 14 | Pass | `RevisionRequested` validation resolver path remains separate and routes to `work-card-repair`. |
| 15 | Pass | No inspected source change alters phase/project closeout behavior. |
| 16 | Partial / Fail | Tests prove close view avoids `generateCurrentHandoff`, but not that the returned selection path avoids the backend `work-card-close` rejection. |
| 17 | Partial / Fail | Positive and negative component/source tests exist, but not the real post-return handoff path. |
| 18 | Reported only | Implementer reported typecheck/build/test passing; commands were not independently run in this review. |
| 19 | Pass | No new dependency is reported or observed in the files changed for this pass. |
| 20 | Reported / observed no staged files | Implementer reported no Git mutation; MCP status shows no staged files, but the tree remains dirty. |

## Required Revision

Revise the Close / Next implementation so the returned selection path is actually usable under backend workflow authority.

A valid repair must preserve the core rule that no separate closeout document, hidden completed flag, or alternate persistence side channel is created. It must solve the authority mismatch between renderer-selected `phase-work-card-selection` and backend current workflow still resolving `work-card-close`.

The fix must prove the complete production sequence:

```text
Approved validation record exists
→ current workflow resolves work-card-close
→ close projection is closed
→ Operator triggers Return to Phase Building / Next Work Card
→ phase-work-card-selection becomes both visible and action-authoritative
→ next candidate handoff can be generated, or all-complete/dependency-blocked/explicitly-resolved state is displayed, without a work-card-close handoff rejection
```

Acceptable implementation directions include, but are not limited to, making the close-return action call a backend service that returns the evidence-derived candidate-selection result without creating lifecycle state, or making the renderer selection surface consume the candidate-selection projection/result directly rather than invoking generic `generateCurrentHandoff()` against a stale close backend model. The Implementer must not add `work-card-close` to `generateCurrentHandoff()` as a handoff-producing case, must not mutate Implementer Report disposition, and must not introduce hidden completion state.

Required new/updated tests must fail against the current implementation and prove:

1. after close return, the selection action does not call backend `generateCurrentHandoff()` while backend current workflow still resolves `work-card-close`, unless the backend has been correctly made to return selection authority;
2. the next eligible candidate handoff can be generated from the returned selection state, or an all-complete/dependency-blocked/explicitly-resolved state is displayed;
3. no closeout document, hidden flag, route token, or disposition mutation is created;
4. stale/missing close projection still blocks return;
5. `RevisionRequested` validation still routes to repair.

## Command Evidence

The Implementer reported:

- `npm run typecheck`: passed.
- `npm run build`: sandbox attempt failed with documented `spawn EPERM`; normal Windows lane passed.
- `npm test`: passed, 260 tests passed, 0 failed.

These are reported results only. This review did not independently execute those commands.

## Manual Validation

Manual Operator validation should not be started for this pass as-is. The current code can still leave the returned selection screen without backend action authority for the next handoff path. Request revision first.
