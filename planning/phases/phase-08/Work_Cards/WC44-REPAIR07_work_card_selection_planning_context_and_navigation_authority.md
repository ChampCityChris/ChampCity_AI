<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
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
      "path": "planning/phases/phase-08/Work_Cards/WC44-REPAIR06_close_return_selection_authority.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR06_close_return_selection_authority.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC44-REPAIR06_close_return_selection_authority.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Work Card Selection, Planning Context, and Navigation Authority",
    "status": "approved_for_implementation",
    "executionMode": "one bounded post-close selection and navigation repair",
    "parentWorkCardId": "WC44",
    "confirmedDefect": "After close-return, Work Card Selection can show the next candidate, but Work Card Planning and navigation still use stale current-workflow/context evidence from the just-closed Work Card.",
    "rootCause": "The renderer stores close-return selection as local state while backend current workflow can still resolve the closed Work Card. Current workflow only considers missing next Work Card formal planning from the all-approved branch, so a pending Implementer Report with approved validation can continue to dominate over the newly created next Work Card Intake handoff. Navigation also mixes renderer active workspace, active Architect-output model, and index-based rail tones rather than a single authoritative workflow presentation.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR07_work_card_selection_planning_context_and_navigation_authority.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Operator validation after WC44-REPAIR06 found that returned Work Card Selection and Planning remain context-confused and navigation state is not reliable. Implement only the bounded selection/planning-context/navigation authority repair described here.",
    "reviewedAt": "2026-08-04"
  }
}
CHAMPCITY-METADATA -->

# WC44-REPAIR07 — Work Card Selection, Planning Context, and Navigation Authority

Status: Approved for Implementer execution  
Parent: `WC44`  
Git mutation: prohibited

## Verified Repository Evidence

Operator validation after WC44-REPAIR06 produced these user-visible failures:

```text
Close / Next return
→ Work Card Selection screen shows the next candidate but still includes a generic document selector / "Document workflow not yet implemented" area
→ Prepare Work Card Planning opens Work Card Planning but displays the just-closed WC01 Formal Work Card instead of the selected WC02 context
→ project, phase, and Work Card rails do not consistently show completed / in-progress / pending state
```

The screenshots are valid user-visible failure evidence. Source inspection confirmed the production causes.

Inspected production path:

```text
WorkCardCloseWorkspace.tsx
→ App.tsx returnFromWorkCardCloseToSelection()
→ closeReturnSelectionResult renderer state
→ phase-work-card-selection generic FigmaActionWorkspace
→ App.tsx generateCloseReturnNextIntakeAndTransition()
→ currentWorkflowService.generateCloseReturnNextIntakeHandoff()
→ generateWorkCardIntakeHandoff()
→ refreshCurrentModel()
→ resolveCurrentWorkspaceModel()
→ modelForPendingReportWithValidationDecision()
→ stale work-card-close / WC01 authority can continue to dominate
→ App.tsx forced transitionToWorkflowStep("work-card-planning")
→ work-card-planning renders using mismatched current model / selected document state
```

Confirmed source facts:

1. `src/renderer/app/App.tsx` routes `phase-work-card-selection` through the generic `FigmaActionWorkspace` unless specialized local `closeReturnSelectionResult` exists. The generic workspace includes the document selector and empty document slot that appear in the screenshot.
2. `generateCloseReturnNextIntakeAndTransition()` creates the scoped next intake handoff, then force-transitions the renderer to `work-card-planning` even when `refreshCurrentModel()` does not resolve the selected candidate as current.
3. `resolveCurrentWorkspaceModel()` only calls `missingWorkCardIntakeOrFormalModel()` from the `current.status === "all-approved"` branch. If a still-Pending Implementer Report remains current, `modelForPendingReportWithValidationDecision()` can continue to resolve `work-card-close` for the just-closed Work Card.
4. A newly created Approved Work Card Intake handoff for the next selected candidate does not currently have priority over the prior closed Work Card report/validation context.
5. `documentIdForWorkflowStep()` can preserve a selected document that belongs to the destination workspace; this can preserve an old Work Card document when the destination is `work-card-planning` and no candidate-specific preferred document is selected.
6. `NestedWorkflowRail.tsx` chooses active phase/work-card loop items from a mix of renderer `activeWorkspaceId` and `currentModel.executionContext`. When those disagree, rail state can be stale.
7. `NestedWorkflowRail.tsx` derives step tone by index relative to one active step, not from per-step evidence, so completed / in-progress / pending can be visually wrong.
8. `App.tsx` derives `architectInterviewRailStatus` from the currently loaded `architectOutputModel`. If the active model is not the architect-interview workspace, `architectInterviewRailStatusFromGenericModel()` returns `Open`, which can drive Project Planning, Phase Map, and Phases to `Not Ready` even when project-level evidence exists.

## Confirmed Defect

The product lacks a single post-close Work Card selection/planning authority. WC44-REPAIR06 created scoped actions, but the UI and current workflow still split authority among:

```text
renderer activeWorkspaceId
renderer closeReturnSelectionResult
backend getCurrentWorkspaceModel()
selectedDocumentId preservation
active Architect-output model
rail index math
```

This makes the returned Work Card Selection screen unclear, and it lets Work Card Planning render stale WC01 context after WC02 was selected.

## Root Cause

The previous repair did not promote the selected next Work Card candidate and its Approved intake handoff into the normal current workflow model. The resolver still allows the just-closed Work Card's Pending Implementer Report plus Approved Validation Record to dominate as `work-card-close`. The renderer then forces visual navigation to Planning without backend-confirmed WC02 planning authority.

The navigation rail has the same architectural flaw: it presents status from local renderer state and partially related models instead of one repository-derived workflow presentation.

## Objective

Make post-close selection, Work Card Planning, and navigation consume one candidate-specific workflow authority.

Required bounded runtime outcome:

```text
WC01 has current Approved Validation Record
→ Operator returns to Work Card Selection
→ selection screen shows WC02 as the selected next candidate with no generic document selector
→ Operator prepares Work Card Planning
→ repository contains the normal WC02 Work Card Intake handoff
→ current workflow resolves WC02 Work Card Planning / Formal Work Card preparation
→ Work Card Planning displays WC02 target/context, not WC01
→ navigation rails show completed/in-progress/pending from the same workflow evidence
```

## Runtime Sequence

### Existing authoritative evidence

```text
Approved Phase Planning + Work Card Plan
Approved WC01 Formal Work Card
Pending WC01 Implementer Report
Approved WC01 Validation Record sourced to the current report revision
No WC02 Formal Work Card yet
```

### Authorized application action

```text
Return to Phase Building / Next Work Card
→ Prepare Work Card Planning for selected candidate WC02
```

### Required state transition

```text
work-card-close / WC01
→ candidate-selection projection selects WC02
→ normal WC02 Work Card Intake handoff is created
→ current workflow resolves work-card-planning for WC02
→ Formal Work Card preparation targets WC02
```

### Persistence or rendering result

Only the existing normal Work Card Intake handoff may be written when the Operator explicitly prepares planning. No closeout, hidden state, route token, report disposition mutation, validation mutation, or alternate selection artifact is allowed.

### Operator-visible outcome

The Operator sees a dedicated Work Card Selection screen, then a Work Card Planning screen for WC02. The rail must not continue to present WC01 Close as the active work-card context once WC02 planning handoff is the next unresolved Work Card evidence.

## Required Changes

### 1. Make next Work Card intake/formal planning resolver-visible

Update `resolveCurrentWorkspaceModel()` or a narrowly scoped helper so that an Approved Work Card Intake handoff for the selected next candidate whose Formal Work Card target is missing or unresolved becomes the current `work-card-planning` model even when an earlier Work Card's Pending Implementer Report has Approved validation evidence.

Required behavior:

```text
Approved intake handoff for WC02 exists
+ WC02 Formal Work Card target does not exist or is unresolved
→ getCurrentWorkspaceModel() returns work-card-planning / WC02
```

This must be evidence-derived from the existing Work Card Plan, candidate selection, and Approved Work Card Intake handoff. It must not use route tokens, hidden flags, session state, or renderer-only state.

The just-closed Work Card may still have a Pending Implementer Report. That report must not block the next candidate once a later eligible candidate's intake handoff has been created.

### 2. Replace generic `phase-work-card-selection` rendering

Add a dedicated Work Card Selection renderer surface for `phase-work-card-selection` and route the workspace to it instead of generic `FigmaActionWorkspace`.

The dedicated screen must show:

- active phase ID;
- closed/current candidate context when returning from Close / Next;
- selected next candidate or all-complete / dependency-blocked / explicitly-resolved / invalid-plan state;
- candidate explanations;
- one valid action when a candidate is selected: `Prepare Work Card Planning`.

It must not show the generic document selector, empty document slot, or `Document workflow not yet implemented` area for Work Card Selection.

### 3. Candidate-specific planning transition

After `Prepare Work Card Planning` succeeds:

1. refresh documents;
2. refresh current workflow model;
3. require the refreshed model to be `work-card-planning` for the selected candidate;
4. clear stale selected-document state if it belongs to the previous Work Card;
5. select the WC02 intake handoff or WC02 Formal Work Card target according to the existing Architect-output preparation path;
6. render Work Card Planning for WC02 only.

Do not force `transitionToWorkflowStep("work-card-planning")` when the refreshed backend model still resolves a different Work Card. Show an error instead.

### 4. Navigation projection repair

Repair the navigation layer only enough to make current workflow status truthful for this flow.

Required behavior:

- top project rail status must not derive Architect Interview status from the currently active non-interview `architectOutputModel`;
- project/phase/work-card rails must consume one evidence-derived workflow/navigation projection or equivalent shared derivation;
- the active Work Card context after WC02 planning handoff is WC02 Planning, not WC01 Close;
- completed prior Work Card steps may show completed, current WC02 Planning shows in-progress, and future steps show pending/not-ready according to repository evidence;
- renderer-selected workspace and backend current workflow disagreement must not produce contradictory rail state.

Do not redesign visual styling. This is a state-authority repair, not a Figma redesign pass.

### 5. Preserve WC44-REPAIR06 close-return actions

Preserve the scoped close-return actions introduced by WC44-REPAIR06. They may be reused by the dedicated Work Card Selection screen. Do not revert to generic `generateCurrentHandoff()` for post-close candidate preparation.

## Preserved Behavior

Preserve unchanged:

- Approved Validation Record as durable Work Card completion evidence;
- Implementer Report as implementation evidence only;
- Implementer Report disposition not mutated by Operator validation or close return;
- `work-card-close` not being a generic handoff-producing workspace;
- WC44-REPAIR06 scoped close-return projection and next-intake actions;
- `selectNextWorkCardCandidate()` and `generateWorkCardIntakeHandoff()` as the candidate-selection/handoff engines;
- Work Card Intake handoff format and target paths;
- post-validation `RevisionRequested` routing to repair;
- phase/project close behavior;
- Codex execution surfaces;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/main/currentWorkflow/currentWorkflowService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/shared/workspaces/projectLifecycleRailStatus.ts
src/shared/workspaces/projectRailPresentation.ts
src/renderer/app/App.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/app/WorkCardCloseWorkspace.tsx
src/renderer/app/WorkCardSelectionWorkspace.tsx
```

`WorkCardSelectionWorkspace.tsx` is optional but preferred. If not created, the dedicated selection surface must be isolated in `App.tsx` and documented.

Tests authorized:

```text
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-close-workspace.test.cjs
test/renderer/work-card-selection-workspace.test.cjs
test/renderer/project-rail-presentation.test.cjs
test/renderer/figma-redesign-shell.test.cjs
test/repository/runtime-wiring-source.test.cjs
test/app-shell/app-shell.test.cjs
```

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR07_work_card_selection_planning_context_and_navigation_authority.md
```

Adjacent test helper changes under `test/` are allowed only if explained in the Implementer Report.

## Risks and Constraints

The risk is solving stale context by adding hidden lifecycle state. Do not do that. The correct authority is already available: Work Card Plan candidate evidence, Approved validation evidence for completed candidates, and Approved Work Card Intake handoff evidence for the next candidate.

A second risk is over-redesigning the rail. Keep this repair to truthful state derivation and current-workflow alignment. Do not restyle the rail or expand unrelated workflow stages.

## Acceptance Criteria

1. Returning from WC01 Close / Next displays a dedicated Work Card Selection screen, not the generic document selector workspace.
2. Work Card Selection does not show `Document workflow not yet implemented`, generic empty document slots, or generic repository document-selection controls.
3. Work Card Selection displays the backend-derived selected next candidate WC02 and candidate explanations.
4. `Prepare Work Card Planning` from the returned selection screen uses scoped close-return / selection authority, not generic `currentWorkflow:generateHandoff()`.
5. The normal WC02 Work Card Intake handoff is created at the existing target path and remains the only new lifecycle artifact for this action.
6. After the WC02 intake handoff is created, `getCurrentWorkspaceModel()` resolves `work-card-planning` for WC02, not `work-card-close` for WC01.
7. Work Card Planning displays WC02 candidate/target context and does not display or preserve the WC01 Formal Work Card as the current planning document.
8. If the refreshed backend model does not resolve WC02 Work Card Planning after handoff creation, the renderer shows a blocking error and does not spoof Planning success.
9. The completed WC01 candidate is not reselected as eligible after close return.
10. All-complete, dependency-blocked, explicitly-resolved, and invalid-plan selection states render without creating a fake Work Card or fake handoff.
11. Project top rail status is derived from repository evidence or a workspace-specific model, not from an unrelated active `architectOutputModel`.
12. Project Planning and Phase Map rails do not revert to `Not Ready` merely because the active workspace is Work Card Planning or Work Card Selection.
13. Phase and Work Card loop active/current state aligns with the same candidate-specific current workflow model used by the workspace body.
14. After WC02 handoff creation, the Work Card rail shows WC02 Planning as current/in-progress and does not continue to show WC01 Close / Next as the active work-card context.
15. The repair creates no closeout document, hidden completed flag, route token, alternate candidate state file, or disposition mutation.
16. `RevisionRequested` validation still routes to Work Card Repair and is not affected by the selection/planning repair.
17. Automated tests prove the full sequence: WC01 approved validation → close return → dedicated Work Card Selection selects WC02 → Prepare Work Card Planning → current model and UI target WC02.
18. Automated tests prove the rail status regression: project/phase/work-card rail states remain truthful when the active workspace is Work Card Selection or WC02 Planning.
19. Typecheck, build, focused tests, and full test lane pass in the approved normal Windows environment.
20. No dependency is added.
21. No Git operation occurs.

## Negative Constraints

Do not:

- add hidden close acknowledgement, route tokens, session state, or alternate persistence;
- mark the Implementer Report Approved to advance workflow;
- change Validation Record authority;
- add `work-card-close` to generic `generateCurrentHandoff()`;
- duplicate candidate-selection logic in the renderer;
- create a parallel Work Card Intake handoff format;
- preserve stale selectedDocumentId when it belongs to the prior Work Card;
- redesign the rail visually;
- alter phase/project closeout behavior;
- alter Codex execution or Review & Validation behavior;
- add dependencies;
- perform Git staging, commit, push, reset, clean, stash, or checkout.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR07_work_card_selection_planning_context_and_navigation_authority.md
```

The Implementer Report must include:

- repository path, branch, remote, and working status verification;
- all changed files;
- confirmation that no Git mutation occurred;
- proof that Work Card Selection is no longer the generic document selector workspace;
- proof that WC02 intake handoff evidence makes WC02 current for Work Card Planning;
- proof that Work Card Planning no longer displays stale WC01 context after WC02 selection;
- proof that rail status derivation no longer depends on unrelated active Architect-output model state;
- proof that project, phase, and work-card rails align with the candidate-specific current workflow projection;
- proof that no hidden state or closeout artifact was created;
- proof that `RevisionRequested` repair routing is preserved;
- commands run and results;
- validation skipped and reason;
- Operator manual validation remaining;
- residual risks.

End with:

```text
Document.Status=Pending
```

## Manual Validation

After Architect review of the Implementer Report, the Operator must validate in the running application:

1. Complete a Work Card with `Validate Passed`.
2. Click `Return to Phase Building / Next Work Card`.
3. Confirm Work Card Selection displays the next candidate and no generic document selector / `Document workflow not yet implemented` block.
4. Click `Prepare Work Card Planning`.
5. Confirm Work Card Planning opens for the next Work Card, not the just-closed Work Card.
6. Confirm project, phase, and Work Card rails show sensible completed / in-progress / pending status.
7. Confirm no new closeout or hidden completion artifact exists.
8. Confirm `Request Repair` still routes to Work Card Repair.
