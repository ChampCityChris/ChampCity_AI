<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC44-REPAIR07",
    "repairId": "WC44-REPAIR07",
    "parentWorkCardId": "WC44"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44-REPAIR07_work_card_selection_planning_context_and_navigation_authority.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR07_work_card_selection_planning_context_and_navigation_authority.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC44-REPAIR07 Work Card Selection, Planning Context, and Navigation Authority",
    "reviewResult": "Approved",
    "blockingDefects": 0,
    "operatorValidationRequired": true
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "WC44-REPAIR07 satisfies the bounded repair contract. Source evidence shows dedicated Work Card Selection rendering, resolver priority for approved next Work Card intake handoff, candidate-specific transition guards, and rail-state alignment improvements. Approved for Operator validation; running Electron manual workflow remains required.",
    "reviewedAt": "2026-08-04"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC44-REPAIR07 Work Card Selection, Planning Context, and Navigation Authority

Disposition: `Approved for Operator validation`  
Git mutation: none performed by this review

## Review Boundary

ChampCity MCP was used for repository inspection. The reviewed workspace was `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. MCP git status reported a dirty working tree with no staged files. The changed paths relevant to this review include the WC44-REPAIR07 Work Card, its Implementer Report, modified current-workflow/renderer/navigation files, and focused tests.

The exact governing Work Card and Implementer Report were inspected first:

- `planning/phases/phase-08/Work_Cards/WC44-REPAIR07_work_card_selection_planning_context_and_navigation_authority.md`, revision 1, sha256 `05869083024313a25c367b39b39b9828af71184454d1c0c9c809f095d2c7a55f`.
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR07_work_card_selection_planning_context_and_navigation_authority.md`, revision 1, sha256 `5650b4bfaf9140ad3522e8b671bfdeedd2473d6559323a6778bef5d1c3e69332`.

The production and test path inspected included:

```text
src/main/currentWorkflow/currentWorkflowService.ts
src/renderer/app/App.tsx
src/renderer/app/WorkCardSelectionWorkspace.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/shared/workspaces/projectLifecycleRailStatus.ts
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-selection-workspace.test.cjs
test/renderer/work-card-close-workspace.test.cjs
test/renderer/project-rail-presentation.test.cjs
```

This review did not execute local commands or launch Electron. Implementer-reported command results are treated as reported evidence only. Source and test content were independently inspected through ChampCity MCP.

## Contract Alignment

WC44-REPAIR07 was intended to correct the remaining post-close authority split: the renderer could show a next candidate while backend current workflow and selected document state still pointed at the just-closed Work Card. The implementation addresses that issue by making the approved next Work Card intake handoff resolver-visible before the closed Work Card report/validation model is allowed to continue dominating.

`currentWorkflowService.resolveCurrentWorkspaceModel()` now checks `approvedWorkCardIntakeWithoutApprovedFormalModel()` before `modelForPendingReportWithValidationDecision()`. That helper requires a repository-derived selected candidate, an Approved Work Card Intake handoff for that candidate, and no Approved Formal Work Card for that target. When those conditions hold, it returns `work-card-planning` for the selected candidate. This satisfies the central requirement that WC02 planning authority can supersede stale WC01 close authority after the WC02 intake handoff exists.

`App.tsx` now excludes `phase-work-card-selection` from the generic `FigmaActionWorkspace` and renders `WorkCardSelectionWorkspace`. The dedicated selection workspace displays candidate state and candidate explanations, and it avoids the generic document selector, empty document slot, and `Document workflow not yet implemented` block that the Operator observed.

`generateCloseReturnNextIntakeAndTransition()` now uses the scoped `generateCloseReturnNextIntakeHandoff()` path, refreshes documents/model/resolver, requires the refreshed model to be `work-card-planning` for the selected candidate, clears stale selected-document state, and only then transitions to Work Card Planning. This prevents spoofing Planning when backend authority still resolves a different Work Card.

`NestedWorkflowRail.tsx` now uses the backend-required workspace as the phase/work-card loop authority when present, and `App.tsx` derives Architect Interview rail status from repository documents unless the active Architect-output model is actually the Architect Interview workspace. This addresses the rail regression where unrelated active Architect-output models could push later project statuses back to `Not Ready`.

## Acceptance Criteria Assessment

| AC | Result | Evidence |
|---:|---|---|
| 1 | Pass | `phase-work-card-selection` is routed to `WorkCardSelectionWorkspace`, not the generic action/document workspace. |
| 2 | Pass | The dedicated component contains no generic selector or `Document workflow not yet implemented` rendering. Focused renderer test asserts these are absent. |
| 3 | Pass | The component renders selected candidate identity, phase, closed Work Card context, and explanations from `CloseReturnSelectionProjection`. |
| 4 | Pass | The returned selection path uses `generateCloseReturnNextIntakeHandoff()`, and source tests assert it does not use generic `generateCurrentHandoff()`. |
| 5 | Pass | The scoped backend action still calls `generateWorkCardIntakeHandoff()`; no alternate handoff format was introduced. |
| 6 | Pass | `approvedWorkCardIntakeWithoutApprovedFormalModel()` causes `getCurrentWorkspaceModel()` to resolve `work-card-planning` / WC02 after the WC02 intake handoff exists. |
| 7 | Pass | `generateCloseReturnNextIntakeAndTransition()` clears stale selected document state and requires WC02 model authority before transition. |
| 8 | Pass | If refreshed model/work-card identity does not match the selected candidate, the renderer sets a blocking error and returns without spoofing success. |
| 9 | Pass | Existing `selectNextWorkCardCandidate()` remains the selection engine and classifies WC01 complete from Approved validation evidence. |
| 10 | Pass | Terminal selection states render without creating fake planning handoffs; the component disables planning when projection state is not `selected`. |
| 11 | Pass | Architect Interview rail status is now document-derived when the active Architect-output model is unrelated. |
| 12 | Pass | Project Planning / Phase Map no longer depend on unrelated active Architect-output model state for Architect Interview completion. |
| 13 | Pass | Phase/work-card loop state now uses the backend required workspace when renderer workspace and current model disagree. |
| 14 | Pass | Focused workflow test verifies post-handoff model is WC02 / Planning rather than WC01 / Close. |
| 15 | Pass | No inspected production path creates a closeout document, hidden flag, route token, alternate candidate file, or disposition mutation. |
| 16 | Pass | Repair routing remains before next-candidate planning in the resolver; focused test preserves `RevisionRequested` → `work-card-repair`. |
| 17 | Pass | Workflow test covers WC01 approved validation → close return selection → WC02 handoff → WC02 planning model. |
| 18 | Pass | Renderer/source tests cover the rail regression and candidate-specific workflow alignment. |
| 19 | Reported only | Implementer reports typecheck, build, focused tests, and full Node suite passed. Not independently executed in this review. |
| 20 | Pass | No package/dependency changes are listed for this repair. |
| 21 | Reported / MCP-consistent | Implementer reports no Git mutation; MCP status shows no staged files. |

## Non-Blocking Notes

The dedicated Work Card Selection view is driven by close-return selection projection. That is appropriate for the defect repaired here, but broader first-candidate selection ergonomics should be watched during later workflow use. I did not find a repository-backed blocker inside the WC44-REPAIR07 contract because the repaired path is specifically post-close selection into the next Work Card.

The navigation rail repair is deliberately minimal. It corrects the authority mismatch and active-workspace/status derivation defects without redesigning the rail. Final visual clarity still requires Operator validation in the running Electron app.

## Command Evidence

The Implementer reported:

```text
npx tsc --noEmit — passed
npx tsc — passed
npx vite build — sandbox spawn EPERM, normal Windows lane passed
focused node --test lane — sandbox spawn EPERM, normal Windows lane passed, 50 tests
full node --test lane — normal Windows lane passed, 267 tests
```

These are reported results only. This Architect review did not independently execute local commands.

## Manual Validation Required

Operator manual validation remains required before treating this as product-validated:

1. Complete a Work Card with `Validate Passed`.
2. Click `Return to Phase Building / Next Work Card`.
3. Confirm Work Card Selection displays the next candidate and no generic document selector or `Document workflow not yet implemented` block.
4. Click `Prepare Work Card Planning`.
5. Confirm Work Card Planning opens for the next Work Card, not the just-closed Work Card.
6. Confirm project, phase, and Work Card rails show sensible completed / in-progress / pending status.
7. Confirm no new closeout or hidden completion artifact exists.
8. Confirm `Request Repair` still routes to Work Card Repair.

## Disposition

`Approved for Operator validation`.

No blocking defects were identified in the repository evidence inspected for WC44-REPAIR07. Final pass authority remains with the Operator through running-app validation.

Document.Status=Approved
