<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR02",
    "repairId": "WC46-REPAIR02",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR02_close_state_guard_and_active_work_card_resume_routing.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR02_close_state_guard_and_active_work_card_resume_routing.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR01_work_card_map_ineligible_and_active_authority.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review - WC46-REPAIR02 Close-State Guard and Active Work Card Resume Routing",
    "reviewResult": "ApprovedForOperatorValidation",
    "blockingDefects": 0,
    "operatorValidationRequired": true
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "WC46-REPAIR02 satisfies the bounded close-state guard and active Work Card resume routing repair. Operator manual validation is required before workflow closure.",
    "reviewedAt": "2026-08-04"
  }
}
CHAMPCITY-METADATA -->

# Architect Review - WC46-REPAIR02 Close-State Guard and Active Work Card Resume Routing

Disposition: `Approved for Operator validation`  
Git mutation: none performed by this review

## Review Boundary

ChampCity MCP was used for repository inspection. The reviewed workspace was `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. MCP git status reported a dirty working tree and zero staged files. Diagnostics reported the configured remote match as `unknown`; MCP reports repository identity as `ChampCityChris/ChampCity_AI`.

The exact governing repair card and Implementer Report were inspected first:

- `planning/phases/phase-08/Work_Cards/WC46-REPAIR02_close_state_guard_and_active_work_card_resume_routing.md`, revision 1, sha256 `961130d5a43b721d49510e26e92923a2078b1da31d9d7b95423c2ee89299d32b`.
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR02_close_state_guard_and_active_work_card_resume_routing.md`, revision 1, sha256 `9d70e4b5aa1882e28dac1823cde728894074dc906ab2436210cf251dccb99200`.

The inspected production and test path included:

```text
src/main/workCardIntake/workCardIntakeService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/app/WorkCardMapWorkspace.tsx
test/work-card-intake/work-card-intake-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-map-workspace.test.cjs
```

This review did not run local commands, launch Electron, or execute tests. Implementer-reported command results are treated as reported evidence only. Source and tests were independently inspected through MCP.

## Accepted Implementation Evidence

The implementation preserves the WC46-REPAIR01 active Work Card model and adds the specific WC46-REPAIR02 close-state guard.

`src/main/workCardIntake/workCardIntakeService.ts` now accepts Work Card Map and Begin Planning options through `WorkCardMapProjectionOptions` and `BeginWorkCardPlanningOptions`. The active authority helper still derives active state from repository artifacts and now accepts `treatClosePendingAsActive`. By default, close-pending candidates remain active when Approved validation exists and the Pending Implementer Report plus matching Approved Validation Record indicate the current loop still belongs to Work Card Close.

The close-pending detection is bounded to existing lifecycle evidence. `closePendingActiveEvidence()` requires a fresh Pending Implementer Report for the same phase/work card and a fresh Approved Validation Record whose source revisions reference that report revision. That satisfies the repair requirement without adding a persisted close acknowledgement, sidecar, route token, closeout, or disposition mutation.

`getWorkCardMapProjection()` defaults to treating close-pending as active. When the renderer calls it from the visible Close / Next return path with `closeReturnCompleted: true`, the completed candidate is shown as `Complete` and the remaining map candidates recalculate from Approved validation evidence and `Work_Card_Plan.md`. This implements the required distinction between direct map access while close is still pending and map access after the Operator performs the visible Close / Next action.

`beginWorkCardPlanningForCandidate()` uses the same option boundary. Without `closeReturnCompleted`, a different candidate is rejected while a close-pending active candidate exists. With `closeReturnCompleted`, the next eligible candidate may be started without creating hidden persistence.

`src/renderer/app/App.tsx` now routes the Work Card Map action by refreshed backend current workspace rather than assuming `work-card-planning`. The allowed resume destinations are `work-card-planning`, `work-card-building-review`, `work-card-report-review`, `work-card-repair`, and `work-card-close`. The renderer validates that the backend model still belongs to the selected candidate and blocks instead of spoofing success if it receives an unauthorized workspace or mismatched candidate.

`src/renderer/app/WorkCardMapWorkspace.tsx` now distinguishes the primary action label: `Begin Planning` for a new eligible candidate, and `Continue Work Card` for the selected active candidate. The candidate status set remains exactly `Complete`, `Eligible`, and `Ineligible`; the active marker remains a separate indicator, not a fourth status.

## Acceptance Criteria Assessment

| AC | Result | Assessment |
|---:|---|---|
| 1 | Pass | Close-pending active authority is preserved by default through report/validation evidence. |
| 2 | Pass | Direct Work Card Map access blocks other candidates while a candidate is close-pending active. |
| 3 | Pass | Close / Next remains the visible return action from Work Card Close to Work Card Map. |
| 4 | Pass | The explicit close-return map call uses `closeReturnCompleted: true` and displays the candidate as `Complete`. |
| 5 | Pass | Same-active-candidate action reuses the existing handoff. |
| 6 | Pass | Renderer now uses the backend current workspace instead of hard-coding planning. |
| 7 | Pass | Authorized resume destinations are explicitly allowed in renderer validation. |
| 8 | Pass | Different-candidate action while one candidate is active is rejected with active-candidate evidence. |
| 9 | Pass | New eligible candidate action still resolves to `work-card-planning`. |
| 10 | Pass | Renderer blocks mismatched candidate or unauthorized workspace results. |
| 11 | Pass | Work Card Map labels begin versus continuation without adding another candidate status. |
| 12 | Pass | Formal Work Card preparation remains active-candidate scoped from WC46-REPAIR01. |
| 13 | Pass | Multiple active incomplete candidates still produce conflict handling. |
| 14 | Pass | All-complete map still routes toward `phase-validation`, not Phase Intake. |
| 15 | Pass | No hidden persistence, route token, close acknowledgement, closeout, or disposition mutation was found in inspected source. |
| 16 | Pass | Existing repair-routing tests remain covered by the reported full test lane. |
| 17 | Pass | Added/updated tests cover close-pending guard, close-return map, different-candidate rejection, and active continuation to a non-planning workspace. |
| 18 | Reported only | Implementer reported typecheck, build, focused tests, and full test lane passing. This review did not run commands. |
| 19 | Pass | No dependency addition was reported or observed in inspected code. |
| 20 | Reported / observed | Implementer reported no Git mutation; MCP status shows zero staged files. |

## Command Evidence

The Implementer reported:

```text
npx tsc --noEmit                                             passed
npx tsc                                                       passed
focused node --test lanes                                    passed in normal Windows lane
npx vite build                                                passed in normal Windows lane
node --test --test-concurrency=1                              passed, 276 tests
```

Sandboxed focused tests and sandboxed Vite build reportedly failed with known `spawn EPERM`, then passed in the normal Windows lane. These are reported results only.

## Operator Validation Required

Manual validation should now proceed in the running application:

1. Begin Planning for an Eligible Work Card.
2. Confirm the map identifies that Work Card as active.
3. Progress the active Work Card beyond Planning and confirm the map action continues to the current workspace.
4. Confirm other candidates cannot be started while the active candidate is in progress.
5. Validate Passed for the active candidate and confirm Close / Next remains the required visible transition.
6. Click Close / Next and confirm the map shows the completed candidate as `Complete`.
7. Confirm remaining candidates recalculate `Eligible` / `Ineligible`.
8. Confirm all-complete routes to Phase Validation, not Phase Intake.
9. Confirm `Request Repair` still routes to Work Card Repair.

## Review Conclusion

WC46-REPAIR02 satisfies the bounded repair. The remaining risk is live UI behavior under Electron, which requires Operator validation. No new repair card is required from this review.
