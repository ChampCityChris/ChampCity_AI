<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC44-REPAIR06",
    "repairId": "WC44-REPAIR06",
    "parentWorkCardId": "WC44"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44-REPAIR06_close_return_selection_authority.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR06_close_return_selection_authority.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC44-REPAIR06 Close Return Selection Authority",
    "reviewResult": "ApprovedForOperatorValidation",
    "blockingDefects": 0,
    "operatorValidationRequired": true
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "WC44-REPAIR06 adds scoped backend close-return selection authority and a scoped next-intake handoff path while preserving the rule that work-card-close is not a generic handoff-producing workspace. Approved for Operator validation; reported command results were not independently run by this review.",
    "reviewedAt": "2026-08-04"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC44-REPAIR06 Close Return Selection Authority

Disposition: `Approved for Operator validation`  
Git mutation: none performed by this review

## Review Boundary

ChampCity MCP was used for repository inspection. The reviewed workspace was `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. MCP git status reported a dirty working tree with no staged files, 32 tracked modified files, and 37 untracked files at review time. The repository identity reported by MCP is `ChampCityChris/ChampCity_AI`; diagnostics reported remote match as `unknown`.

The exact governing Work Card and Implementer Report were inspected first:

- `planning/phases/phase-08/Work_Cards/WC44-REPAIR06_close_return_selection_authority.md`, revision 1, sha256 `084e0cd204d103d39b32461d038b2d095b6c0275bc07a6c0a2ae13ae95ef744d`.
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR06_close_return_selection_authority.md`, revision 1, sha256 `ea1b493bb6050b4f815a730166a0ba086cedda3a89081177fc4450d1e8000f8b`.

The inspected production and test path included:

- `src/main/currentWorkflow/currentWorkflowService.ts`;
- `src/main/main.ts`;
- `src/preload/index.ts`;
- `src/shared/workspaceContracts.ts`;
- `src/main/architectOutputs/architectOutputWorkspaceService.ts`;
- `src/renderer/app/App.tsx`;
- `src/renderer/app/WorkCardCloseWorkspace.tsx`;
- `test/workflow/current-execution-context.test.cjs`;
- `test/renderer/work-card-close-workspace.test.cjs`;
- `test/repository/runtime-wiring-source.test.cjs`.

This review did not run local commands, launch Electron, or execute the application. MCP does not expose a confirmed command-execution lane. Implementer-reported command results are treated as reported evidence only; source and test content were independently inspected through MCP.

## Implementation Accepted as Verified

WC44-REPAIR06 addresses the blocking defect identified in `ARCHITECT_REVIEW_WC44-REPAIR05_work_card_close_next_workspace_completion.md`.

The implementation adds scoped backend post-close selection authority without making `work-card-close` a generic handoff-producing workspace. `currentWorkflowService.getCloseReturnSelectionProjection()` resolves the current workflow, requires `activeWorkspaceId === "work-card-close"`, verifies the existing close projection is closed and returns `phase-work-card-selection`, then calls existing `selectNextWorkCardCandidate()`. For selected results, it includes the existing `getWorkCardIntakeProjection()` output. For terminal selection states, it returns the existing candidate-selection state and explanations.

The implementation adds `currentWorkflowService.generateCloseReturnNextIntakeHandoff()`. It repeats the close-return authority check, requires a selected candidate, and then calls the existing `generateWorkCardIntakeHandoff()`. This preserves the existing Work Card Intake handoff format and does not create closeout state, hidden flags, route tokens, or alternate candidate state.

`generateCurrentHandoff()` still has no `work-card-close` case and continues to reject backend `work-card-close`. That is correct because `work-card-close` remains a close projection and continuation surface, not a handoff-producing workspace.

`src/main/main.ts`, `src/preload/index.ts`, and `src/shared/workspaceContracts.ts` expose both scoped actions through explicit close-return IPC/API methods:

```text
currentWorkflow:getCloseReturnSelectionProjection
currentWorkflow:generateCloseReturnNextIntakeHandoff
```

`App.tsx.returnFromWorkCardCloseToSelection()` now calls `window.champcity.getCloseReturnSelectionProjection()` before transitioning to `phase-work-card-selection`. The returned selection panel is populated from that backend projection. The post-close selection button calls `window.champcity.generateCloseReturnNextIntakeHandoff()` instead of `window.champcity.generateCurrentHandoff()`.

The generic `Run Current Handoff Action` button is suppressed while a close-return selection projection is active. This is the critical correction: the returned selection path no longer depends on generic current-workflow handoff authority while backend current workflow still derives `work-card-close` from the approved validation evidence.

## Acceptance Criteria Assessment

| AC | Result | Assessment |
|---:|---|---|
| 1 | Pass | WC44-REPAIR05 close projection display remains intact and `WorkCardCloseWorkspace` remains the close surface. |
| 2 | Pass | `generateCurrentHandoff()` still rejects backend `work-card-close`; no `work-card-close` switch case was added. |
| 3 | Pass | `getCloseReturnSelectionProjection()` verifies Work Card Close authority and closed evidence before returning selection. |
| 4 | Pass | The projection calls existing `selectNextWorkCardCandidate()` and does not duplicate candidate logic. |
| 5 | Pass | The renderer return action calls the scoped projection and transitions to `phase-work-card-selection` with projection state retained. |
| 6 | Pass | The returned selection path suppresses the generic handoff button when close-return selection state exists. |
| 7 | Pass | Selected next candidate can create the next normal intake handoff through the scoped action. |
| 8 | Pass | The scoped next-intake action calls existing `generateWorkCardIntakeHandoff()` and returns its normal result. |
| 9 | Pass | Non-selected states are represented in `CloseReturnSelectionProjection` and rendered by `CloseReturnSelectionCard` without fake handoff creation. |
| 10 | Pass | Workflow tests prove the closed Work Card is classified complete and the next candidate is WC02 when present. |
| 11 | Pass | No inspected source creates closeout documents, hidden completion flags, route tokens, alternate candidate state, or disposition mutation. |
| 12 | Pass | Close-return authority is blocked when backend workflow is not Work Card Close; missing close and RevisionRequested cases are tested. |
| 13 | Pass | RevisionRequested validation continues to resolve to `work-card-repair` and the close-return action rejects it. |
| 14 | Pass | Tests cover Approved validation, backend close, close-return projection, selected next-candidate handoff, all-complete state, and generic handoff rejection. |
| 15 | Pass | Source tests assert the close-return function and selection panel avoid generic `generateCurrentHandoff()` for post-close action. |
| 16 | Reported only | Implementer reported typecheck, TypeScript compile, Vite build, focused tests, and full Node test lane passing; this review did not independently run commands. |
| 17 | Pass | No dependency addition is reported or observed in files touched by this pass. |
| 18 | Reported / observed no staged files | Implementer reported no Git mutation; MCP status shows no staged files. |

## Non-Blocking Concerns

The backend repository-derived current workflow may still report `work-card-close` after the scoped next-intake handoff because the repair correctly avoids hidden close acknowledgement state and does not mutate the pending Implementer Report disposition. The renderer intentionally reaches Work Card Planning through explicit close-return selection state and the existing Architect-output workspace path. This is acceptable under WC44-REPAIR06, but it must be manually validated in the running Electron app.

The running app should be checked for any stale error or feedback banner after the post-close scoped handoff. Source inspection shows the renderer transitions to `work-card-planning` and the regular architect-output refresh effect should load the Formal Work Card preparation surface. This was not proven by launching the app in this review.

## Command Evidence

The Implementer reported:

- `npx tsc --noEmit`: passed.
- `npx tsc`: passed.
- `npx vite build`: sandbox attempt failed with documented `spawn EPERM`; normal Windows validation lane passed.
- `node --test --test-concurrency=1`: sandbox attempt failed with documented `spawn EPERM`; normal Windows validation lane passed with 262 tests passed and 0 failed.
- Focused reruns for current workflow, runtime wiring, and Work Card Close workspace tests: passed with 17 tests passed and 0 failed.

These are reported results only. This review did not independently execute those commands.

## Manual Validation Required

Operator validation is required before this repair should be treated as complete in the workflow.

Required running-app checks:

1. Complete Review & Validation for a Work Card with `Validate Passed`.
2. Confirm Close / Next displays current evidence.
3. Click `Return to Phase Building / Next Work Card`.
4. Confirm Work Card Selection displays the scoped backend close-return selection state.
5. If a next candidate exists, click the scoped selection action and confirm the next Work Card Intake handoff is generated without the previous `work-card-close` generic handoff error.
6. Confirm the closed Work Card is not reselected.
7. Confirm no closeout, hidden completion artifact, or report disposition mutation was created.
8. Confirm `Request Repair` from Review & Validation still routes to Work Card Repair.

## Final Assessment

WC44-REPAIR06 is approved for Operator validation. The implementation is bounded, preserves the authority model, and supplies the missing scoped backend action path that WC44-REPAIR05 lacked. No further repair card is warranted from repository inspection alone.
