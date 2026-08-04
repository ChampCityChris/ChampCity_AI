<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
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
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC44-REPAIR05_work_card_close_next_workspace_completion.md",
      "revision": 1
    },
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
    "title": "Close Return Selection Authority",
    "status": "approved_for_implementation",
    "executionMode": "one bounded post-close selection authority repair",
    "parentWorkCardId": "WC44",
    "confirmedDefect": "After WC44-REPAIR05, Return to Phase Building / Next Work Card changes renderer state to phase-work-card-selection, but backend current workflow can still resolve work-card-close; selection actions using currentWorkflow:generateHandoff can therefore still reject with work-card-close.",
    "rootCause": "WC44-REPAIR05 repaired the close view but did not provide backend-supported post-close candidate-selection action authority. The renderer returns to a selection screen while generic handoff execution still recomputes current workflow from repository evidence and sees work-card-close.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR06_close_return_selection_authority.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Operator requested a concise bounded repair card after Architect Review WC44-REPAIR05 returned RevisionRequested. Implement only the post-close selection authority repair; do not reopen validation, close projection display, Codex, or unrelated UI redesign scope.",
    "reviewedAt": "2026-08-04"
  }
}
CHAMPCITY-METADATA -->

# WC44-REPAIR06 — Close Return Selection Authority

Status: Approved for Implementer execution  
Parent: `WC44`  
Git mutation: prohibited

## Verified Repository Evidence

The failed review is `planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC44-REPAIR05_work_card_close_next_workspace_completion.md` revision 1. It recorded `RevisionRequested` because WC44-REPAIR05 added the close projection bridge and dedicated Close / Next renderer, but did not complete the action-authority path after close return.

The relevant production path was inspected:

```text
WorkCardCloseWorkspace.tsx
→ App.tsx returnFromWorkCardCloseToSelection()
→ transitionToWorkflowStep("phase-work-card-selection")
→ phase-work-card-selection generic action surface
→ window.champcity.generateCurrentHandoff()
→ currentWorkflowService.generateCurrentHandoff()
→ getCurrentWorkspaceModel()
→ modelForPendingReportWithValidationDecision()
→ activeWorkspaceId: "work-card-close"
→ default handoff rejection
```

Confirmed source facts:

1. `src/renderer/app/App.tsx` now transitions the renderer to `phase-work-card-selection` after close return.
2. `src/renderer/app/WorkCardCloseWorkspace.tsx` no longer calls `generateCurrentHandoff()`.
3. `src/main/currentWorkflow/currentWorkflowService.ts` still recomputes current workflow inside `generateCurrentHandoff()`.
4. `modelForPendingReportWithValidationDecision()` still maps a fresh Approved Validation Record for the current Pending Implementer Report revision to `activeWorkspaceId: "work-card-close"`.
5. `generateCurrentHandoff()` has no `work-card-close` case and correctly rejects `work-card-close` as a non-handoff-producing workspace.
6. `src/main/workCardIntake/workCardIntakeService.ts` already contains the authoritative candidate-selection logic: `selectNextWorkCardCandidate()` and `generateWorkCardIntakeHandoff()`.
7. `test/workflow/current-execution-context.test.cjs` directly proves candidate selection can classify the closed candidate as complete, but it does not prove the returned selection screen can act through backend authority.

## Confirmed Defect

WC44-REPAIR05 made the Close / Next screen visually correct, but the returned Work Card Selection screen is not action-authoritative. The renderer shows `phase-work-card-selection`, while the backend current workflow can still be `work-card-close`. Any returned selection action that calls generic `currentWorkflow:generateHandoff` can still reproduce the unauthorized `work-card-close` handoff error.

This is not a close projection display defect and not a Validation Record persistence defect. It is a post-close action-authority defect.

## Root Cause

The application uses two different authorities after close return:

```text
renderer activeWorkspaceId = phase-work-card-selection
backend getCurrentWorkspaceModel().activeWorkspaceId = work-card-close
```

The visible selection workspace relies on generic `generateCurrentHandoff()`, but that backend method intentionally ignores renderer navigation state and recomputes the current repository-derived workflow. Since the Approved Validation Record still makes the pending report resolve to `work-card-close`, generic handoff execution remains blocked.

The missing piece is a scoped post-close selection authority that verifies closed evidence and then uses the existing candidate-selection engine without making `work-card-close` a handoff-producing workspace.

## Objective

Make the Close / Next return path usable end to end without adding persistence or alternate lifecycle authority.

Required bounded runtime outcome:

```text
current Approved Validation Record
→ Operator clicks Return to Phase Building / Next Work Card
→ backend verifies close projection is closed
→ backend evaluates next Work Card candidate using existing selection logic
→ renderer shows the next selection state
→ Operator can generate the next Work Card Intake handoff, or see all-complete/blocked/resolved state
→ no work-card-close handoff rejection occurs
```

## Runtime Sequence

### Existing authoritative evidence

```text
Approved Formal Work Card
+ current Pending Implementer Report
+ fresh Approved Validation Record sourced to that report revision
= Work Card is closed by validation evidence
```

### Authorized application actions

1. Operator clicks `Return to Phase Building / Next Work Card` from `work-card-close`.
2. If the backend reports a selected next candidate, Operator clicks a selection-specific action to create the normal Work Card Intake handoff.

### Required state transition

```text
work-card-close
→ close-return selection projection
→ phase-work-card-selection display with backend selection result
→ selected candidate generates normal Work Card Intake handoff
→ work-card-planning / Formal Work Card preparation becomes reachable
```

If no candidate is selected, the returned selection surface must display the backend result: `all-complete`, `dependency-blocked`, `explicitly-resolved`, or `invalid-plan`.

### Persistence or rendering result

The close-return projection writes nothing. If a candidate is selected and the Operator explicitly generates the next intake handoff, the only allowed write is the existing normal Work Card Intake handoff created by `generateWorkCardIntakeHandoff()`.

No closeout, hidden completed flag, route token, report disposition mutation, validation disposition mutation, or alternate candidate state may be created.

### Operator-visible outcome

The Operator sees a usable selection state after close return. Running the next selection action must not call generic `currentWorkflow:generateHandoff()` in a context where backend current workflow remains `work-card-close`.

## Required Changes

### 1. Add scoped backend close-return selection authority

Add a narrow current-workflow service path that is explicitly for post-close continuation. It must:

1. resolve the current workflow model;
2. require `activeWorkspaceId === "work-card-close"` or otherwise prove the supplied phase/work-card evidence is the current closed Work Card;
3. call the existing close projection path and require `closed === true` and `returnTarget === "phase-work-card-selection"`;
4. call `selectNextWorkCardCandidate(workspaceRoot, phaseId)`;
5. return the candidate-selection result;
6. when the result is `selected`, include the existing Work Card Intake projection/targets needed by the renderer.

Name is implementer discretion only for code style, but the API must be explicitly scoped to close-return selection. It must not be a generic renderer-selected workspace override.

### 2. Add scoped next-intake handoff action

Add a second narrow backend action for the Operator’s post-close selection button. It must:

1. repeat the close projection verification from Required Change 1;
2. call `selectNextWorkCardCandidate(workspaceRoot, phaseId)`;
3. require the result to be `selected`;
4. call the existing `generateWorkCardIntakeHandoff(workspaceRoot, phaseId)`;
5. return the normal Work Card Intake handoff result.

This action writes only the existing approved non-review Work Card Intake handoff. It must not write close state.

### 3. Expose the scoped actions through shared contract and preload

Add typed `ChampCityApi` methods and preload bridge calls for the two scoped close-return actions. The IPC names must make the close-return scope explicit.

Do not reuse `currentWorkflow:generateHandoff` for the post-close selection path.

### 4. Update the renderer post-close selection path

Modify `App.tsx` and/or a dedicated selection component so that after `Return to Phase Building / Next Work Card`:

1. the renderer calls the scoped close-return selection projection;
2. the renderer transitions to `phase-work-card-selection` with that projection available;
3. the phase selection UI displays selected/all-complete/blocked/resolved state from the projection;
4. if selected, the visible action calls the scoped next-intake handoff action, not `window.champcity.generateCurrentHandoff()`;
5. after handoff generation, the renderer refreshes documents/current model/resolver and transitions into the existing Work Card Planning/Formal Work Card preparation path.

### 5. Preserve existing selection and validation authority

Reuse `selectNextWorkCardCandidate()` and `generateWorkCardIntakeHandoff()`. Do not duplicate candidate-selection logic in the renderer. Do not add `work-card-close` as a `generateCurrentHandoff()` case.

## Preserved Behavior

Preserve unchanged:

- WC44-REPAIR05 close projection bridge and `WorkCardCloseWorkspace` evidence display;
- Validation Record as durable pass-or-repair authority;
- Implementer Report as implementation evidence only;
- Implementer Report disposition remaining unchanged by Operator validation;
- `RevisionRequested` routing to `work-card-repair`;
- existing Work Card Intake handoff format and target paths;
- phase/project close behavior;
- Codex execution and Review & Validation workspaces;
- no Git operation.

## Authorized Surface

Production files authorized:

```text
src/main/currentWorkflow/currentWorkflowService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/app/WorkCardCloseWorkspace.tsx
```

Optional renderer file if needed for separation:

```text
src/renderer/app/WorkCardSelectionWorkspace.tsx
```

Tests authorized:

```text
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-close-workspace.test.cjs
test/renderer/work-card-report-review-workspace.test.cjs
test/repository/runtime-wiring-source.test.cjs
test/app-shell/app-shell.test.cjs
```

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR06_close_return_selection_authority.md
```

Adjacent test helper changes under `test/` are allowed only if the Implementer Report explains why existing helpers could not prove the real path.

## Risks and Constraints

The repair must not convert `work-card-close` into a handoff-producing workspace. The correct fix is a close-return continuation path that verifies closed evidence before evaluating the next candidate.

The repair must not create hidden persistence to remember that close was acknowledged. The Approved Validation Record is the only durable Work Card completion evidence.

The repair must not solve this by approving or mutating the Implementer Report. The Implementer Report remains evidence, not lifecycle authority.

## Acceptance Criteria

1. `work-card-close` still displays close projection and evidence from WC44-REPAIR05.
2. `generateCurrentHandoff()` still rejects backend `work-card-close`; no `work-card-close` case is added.
3. A scoped backend close-return selection projection verifies closed Work Card evidence before returning candidate selection.
4. The close-return selection projection uses `selectNextWorkCardCandidate()` and does not duplicate candidate logic.
5. The renderer return action calls the scoped close-return projection and transitions to `phase-work-card-selection` with that projection.
6. The returned selection screen does not call `window.champcity.generateCurrentHandoff()` for its post-close action path.
7. If the close-return projection is `selected`, the Operator can create the normal Work Card Intake handoff through a scoped close-return action.
8. The scoped intake action calls `generateWorkCardIntakeHandoff()` and writes only the normal Work Card Intake handoff.
9. If the selection result is `all-complete`, `dependency-blocked`, `explicitly-resolved`, or `invalid-plan`, the renderer displays that state and does not write a fake Work Card or fake handoff.
10. The completed Work Card is not reselected as eligible after close return.
11. The post-close path does not create a closeout document, hidden completed flag, route token, alternate candidate state, or disposition mutation.
12. Missing, stale, unreadable, or non-Approved close evidence blocks the close-return selection projection and leaves the user on/returned to close with a visible reason.
13. `RevisionRequested` validation continues to route to `work-card-repair` and does not use the close-return selection actions.
14. Automated tests prove the full sequence: Approved validation → backend close → close return → returned selection action → next intake handoff or all-complete state, without `work-card-close` handoff rejection.
15. Tests fail if the post-close selection path uses generic `currentWorkflow:generateHandoff()` while backend current workflow remains `work-card-close`.
16. Typecheck, build, focused tests, and full test lane pass in the approved normal Windows environment.
17. No dependency is added.
18. No Git operation occurs.

## Negative Constraints

Do not:

- add `work-card-close` to `generateCurrentHandoff()`;
- mark the Implementer Report Approved as a way to advance;
- change Validation Record authority or source revision semantics;
- create a Work Card closeout document;
- create hidden close-acknowledgement state;
- create route tokens or session-persistent lifecycle state;
- duplicate candidate-selection logic in the renderer;
- create a parallel Work Card Intake handoff format;
- alter phase/project closeout behavior;
- alter Codex execution or Review & Validation behavior;
- add dependencies;
- perform Git staging, commit, push, reset, clean, stash, or checkout.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR06_close_return_selection_authority.md
```

The Implementer Report must include:

- repository path, branch, remote, and working status verification;
- all changed files;
- confirmation that no Git mutation occurred;
- exact scoped backend close-return selection API path;
- exact scoped next-intake handoff API path;
- proof that `generateCurrentHandoff()` still rejects `work-card-close`;
- proof that post-close selection no longer uses generic handoff authority;
- proof that selected candidate handoff generation succeeds from close-return selection;
- proof that all-complete/blocked/resolved states display without writes;
- proof that no closeout, hidden flag, route token, or disposition mutation is created;
- proof that stale/missing close evidence blocks continuation;
- proof that `RevisionRequested` still routes to repair;
- commands run and results;
- tests added or modified;
- Operator manual validation remaining.

End with:

```text
Document.Status=Pending
```

## Manual Validation

After Architect review of the Implementer Report, the Operator must validate in the running app:

1. Validate Passed on a Work Card.
2. Confirm Close / Next displays evidence.
3. Click Return to Phase Building / Next Work Card.
4. Confirm Work Card Selection displays the next selected/all-complete/blocked/resolved state.
5. If a next candidate exists, generate the next Work Card Intake handoff without the `work-card-close` handoff error.
6. Confirm the closed Work Card is not reselected.
7. Confirm no closeout or hidden completion artifact was created.
8. Confirm Request Repair still routes to Work Card Repair.
