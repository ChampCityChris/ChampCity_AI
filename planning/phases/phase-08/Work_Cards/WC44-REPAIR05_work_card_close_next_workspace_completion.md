<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
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
      "path": "planning/project/Design_Documents/PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC13_work_card_validation_close_and_next_candidate_return.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44-REPAIR04_operator_validation_decision_workspace_transition.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Work Card Close / Next Workspace Completion",
    "status": "pending_operator_approval",
    "executionMode": "one bounded Close / Next workspace repair",
    "parentWorkCardId": "WC44",
    "confirmedDefect": "work-card-close resolves from current validation evidence, but the renderer lacks a close-specific projection and return action. The visible/generic handoff route can call currentWorkflow:generateHandoff and is rejected because work-card-close is not an authorized handoff-generating step.",
    "rootCause": "WC13/WC44 implementation completed validation authority and backend close projection, but did not complete the shared/preload renderer contract and operator-visible Close / Next workspace surface. Close evidence is also not displayed because generic document grouping assigns validation records to work-card-validation, not work-card-close.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR05_work_card_close_next_workspace_completion.md"
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "Architect RCA repair card drafted from repository evidence and Operator screenshot. Operator approval is required before implementation.",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# WC44-REPAIR05 — Work Card Close / Next Workspace Completion

Status: Pending Operator approval  
Parent: `WC44`  
Git mutation: prohibited

## Verified Repository Evidence

The Operator-provided screenshot shows the running application on `Close / Next` for `MVP-01-WC01` with this visible failure:

```text
Error invoking remote method 'currentWorkflow:generateHandoff':
Error: Current workflow step does not authorize a handoff action: work-card-close
```

The screenshot is valid user-visible failure evidence. It is not, by itself, source authority. The source inspection below confirms the production-path defect.

The Phase 08 workspace inventory defines `work-card-close` as a production workspace:

```text
id: work-card-close
label: Work Card Close
level: workCard
stage: close
order: 10
owner: WC13
```

`planning/phases/phase-08/Work_Cards/WC13_work_card_validation_close_and_next_candidate_return.md` is the governing close contract for this surface. It requires `work-card-close` to derive close from current Approved validation evidence, create no separate closeout or hidden completed flag, and show a visible return to Phase Building selection.

`planning/phases/phase-08/Work_Cards/WC44-REPAIR04_operator_validation_decision_workspace_transition.md` repaired the renderer transition into the backend-resolved next workspace after Operator validation. It did not authorize replacing `work-card-close` with a generic handoff action or inventing a closeout record.

The inspected production path confirms:

```text
Review & Validation decision
→ workCardValidationService.applyOperatorValidationDecision()
→ canonical Validation Record
→ currentWorkflowService modelForPendingReportWithValidationDecision()
→ activeWorkspaceId: work-card-close when Validation Record is Approved
→ workCardValidationService.getWorkCardCloseProjection()
→ returnTarget: phase-work-card-selection when closed
```

Confirmed source facts:

1. `src/shared/workspaceContracts.ts` registers `work-card-close` as a visible workspace in the production registry.
2. `src/main/currentWorkflow/currentWorkflowService.ts` resolves `work-card-close` when the fresh Validation Record for the current Implementer Report revision is `Approved`.
3. `src/main/workCardValidation/workCardValidationService.ts` implements `getWorkCardCloseProjection()`, returning `closed`, `returnTarget`, and `reason` from current validation evidence.
4. `src/main/currentWorkflow/currentWorkflowService.ts` implements `getCurrentCloseProjection()` and delegates to `getWorkCardCloseProjection()` for `work-card-close`.
5. `src/main/main.ts` registers the IPC handler `currentWorkflow:getCloseProjection`.
6. `src/shared/workspaceContracts.ts` does not expose `getCurrentCloseProjection` on `ChampCityApi`.
7. `src/preload/index.ts` does not expose `currentWorkflow:getCloseProjection` to the renderer.
8. `src/renderer/app/App.tsx` has generic action workspace rendering, but no dedicated `work-card-close` workspace surface that loads close projection or executes the required return action.
9. `src/main/currentWorkflow/currentWorkflowService.ts` does not authorize `work-card-close` in `generateCurrentHandoff()`. Calling `currentWorkflow:generateHandoff` from `work-card-close` therefore correctly throws the screenshot error.
10. `src/shared/workspaces/documentWorkspace.ts` classifies Validation Records under `work-card-validation`. It does not make close evidence visible in `work-card-close`, so the generic view can show `No documents in this workflow step` even when close evidence exists.
11. Existing tests prove service-level close projection and current workflow resolution to `work-card-close`, but they do not prove the renderer/preload/IPC close-next path or the Operator-visible return action.

## Confirmed Defect

`work-card-close` is required and backend-resolved, but the user-facing workspace is incomplete.

The application reaches `work-card-close` after a passing Operator validation decision, but the renderer does not have a close-specific surface that:

```text
loads current close projection
→ displays the Approved Validation Record / Implementer Report evidence
→ disables invalid actions when close evidence is not current
→ offers the authorized Return to Phase Building / Next Work Card action
→ re-enters phase-work-card-selection without writing hidden completion state
```

The observed error occurs because the running UI exposes or allows the generic handoff route in a context where the backend correctly refuses handoff generation:

```text
work-card-close
→ currentWorkflow:generateHandoff
→ generateCurrentHandoff()
→ default rejection
→ Error: Current workflow step does not authorize a handoff action: work-card-close
```

This is not an Operator action error. It is a product wiring defect: the close workspace presents or falls through to the wrong action model.

## Root Cause

The implementation completed the validation authority and backend close projection but did not complete the renderer contract for `work-card-close`.

The specific root causes are:

1. `currentWorkflow:getCloseProjection` exists in the main process but is not exposed through the shared `ChampCityApi` or preload bridge, so the renderer cannot use the authoritative close projection.
2. `work-card-close` falls through to generic action/document rendering instead of a dedicated close-next workspace.
3. The generic action surface is handoff/disposition oriented, while `work-card-close` is a projection-and-navigation view. It must not generate a handoff.
4. Close evidence is source-evidence based, but generic document grouping assigns Validation Records to `work-card-validation`; this leaves `work-card-close` visually empty.
5. Test coverage stops at service/current-workflow resolution and does not exercise the renderer-visible close-next path.

## Objective

Make `work-card-close` a functional evidence-derived Close / Next workspace.

One bounded runtime outcome:

```text
Current Approved Validation Record for the current Work Card/report revision
→ Operator opens Close / Next and clicks Return to Phase Building / Next Work Card
→ renderer verifies current close projection and refreshes repository evidence
→ renderer transitions to phase-work-card-selection without writing new lifecycle state
→ Work Card selection re-evaluates approved validation evidence and shows the next eligible candidate or all-complete state
```

## Runtime Sequence

### Existing authoritative evidence

The current repository contains:

```text
Approved Formal Work Card
Pending current Implementer Report for that Work Card
Approved Validation Record sourced to the current Work Card and current Implementer Report revision
```

The current workflow resolver derives:

```text
activeWorkspaceId: work-card-close
currentTarget: Close / Next Work Card
sourceEvidence: [current Implementer Report path, current Validation Record path]
```

The close projection derives:

```text
closed: true
returnTarget: phase-work-card-selection
reason: Current Approved Validation Record closes the Work Card.
```

### Authorized application action

The Operator clicks one explicit button in `work-card-close`:

```text
Return to Phase Building / Next Work Card
```

The renderer must not call `currentWorkflow:generateHandoff` for this action.

### Required state transition

The renderer must:

1. call the exposed close projection API;
2. verify `closed === true` and `returnTarget === "phase-work-card-selection"`;
3. refresh documents, current workflow model, and resolver result;
4. transition to `phase-work-card-selection` using the existing renderer transition helper and refreshed evidence;
5. use resolver/current model evidence for document selection when available.

If the refreshed projection is not closed, the renderer must not transition to selection. It must show the projection reason and remain on, or return to, the backend-required workspace.

### Persistence or rendering result

No repository artifact is written by the close-next action.

The existing Approved Validation Record remains the durable close evidence. `selectNextWorkCardCandidate()` remains responsible for treating the completed Work Card as complete from Approved validation evidence.

### Operator-visible outcome

The Operator sees:

```text
Close evidence and reason
→ no red handoff error
→ Return to Phase Building / Next Work Card button
→ Phase Work Card Selection after click
→ next eligible Work Card candidate or all-complete phase candidate state
```

## Required Changes

### 1. Expose the close projection to the renderer

Add a typed renderer API method to `src/shared/workspaceContracts.ts`:

```text
getCurrentCloseProjection(): Promise<RuntimeActionResult>
```

Expose it in `src/preload/index.ts` by invoking:

```text
currentWorkflow:getCloseProjection
```

Preserve the existing IPC handler in `src/main/main.ts`. Do not rename the channel unless the old channel is also updated everywhere in the same bounded change.

### 2. Add a dedicated Work Card Close workspace surface

Add a dedicated renderer surface for `activeWorkspaceId === "work-card-close"`, either as a new component such as:

```text
src/renderer/app/WorkCardCloseWorkspace.tsx
```

or a narrowly isolated branch in `App.tsx` if a separate component is not practical.

The surface must render:

- current phase ID;
- current Work Card ID and title when available;
- close projection `closed`, `returnTarget`, and `reason`;
- source evidence from `currentModel.sourceEvidence`;
- readable display names for the matched evidence documents when available;
- a disabled/error state when close evidence is missing, stale, unreadable, or not Approved;
- one explicit action: `Return to Phase Building / Next Work Card`.

The surface must not depend on `getWorkspaceGroups(documents, "work-card-close")` to find close evidence. Close evidence must come from current model/projection evidence, because Validation Records remain owned by the validation workspace.

### 3. Remove incorrect generic handoff behavior from close

Ensure `work-card-close` does not render or trigger `Run Current Handoff Action`.

Do not add a `work-card-close` case to `generateCurrentHandoff()`. `work-card-close` is not a handoff-producing workspace. The backend rejection is correct; the UI path that reaches it is wrong.

If a generic action surface remains reachable, it must explicitly exclude `work-card-close` from handoff rendering and route `work-card-close` to the dedicated close workspace surface.

### 4. Implement the close-next return action

The `Return to Phase Building / Next Work Card` action must:

```text
call getCurrentCloseProjection()
→ verify closed true and returnTarget phase-work-card-selection
→ listDocuments()
→ refresh current model
→ resolve current document
→ transitionToWorkflowStep("phase-work-card-selection", refreshed evidence)
```

The transition must be renderer navigation only. It must not create a closeout document, mutate the Validation Record, mutate the Implementer Report disposition, write a hidden completed flag, or mark the Work Card complete by side effect.

If the refreshed current model no longer supports close because a later Formal Work Card/report/repair revision made validation stale, show the projection reason and do not transition to candidate selection.

### 5. Preserve candidate completion authority

Do not change the completion authority from Approved Validation Records. `src/main/workCardIntake/workCardIntakeService.ts` may continue to use Approved validation evidence to determine completed candidates.

A change to candidate selection is authorized only if a test proves `work-card-close` return cannot otherwise re-enter `phase-work-card-selection` with correct next-candidate/all-complete behavior. Any such change must be narrowly justified in the Implementer Report.

### 6. Add production-path tests

Add focused tests that fail against the current defect.

Minimum proof:

1. shared/preload/API wiring exposes `getCurrentCloseProjection` to the renderer contract;
2. the `work-card-close` renderer path does not call `generateCurrentHandoff`;
3. starting from an Approved validation decision, current workflow resolves `work-card-close`, the close projection is closed, and the close workspace action transitions to `phase-work-card-selection`;
4. if close projection is not closed, the return action is disabled or blocked and no transition occurs;
5. close-next does not write a new repository document and does not mutate report/validation dispositions;
6. `selectNextWorkCardCandidate()` sees the just-closed candidate as complete and selects the next eligible candidate, dependency-blocked state, all-complete state, or explicitly-resolved state according to existing evidence.

Do not rely only on service tests that call `getWorkCardCloseProjection()` directly. The defect is in the shared/preload/renderer production path.

## Preserved Behavior

Preserve unchanged:

- Operator validation decision authority;
- Validation Record as durable pass-or-repair authority;
- Implementer Report as implementation evidence only;
- Implementer Report disposition remaining unchanged by Operator validation decisions;
- advisory Architect review being non-authoritative;
- post-validation repair path on `RevisionRequested`;
- `work-card-validation` document ownership for Validation Records;
- `phase-work-card-selection` as evidence-derived next-candidate selection;
- `phase-close` and `project-close` closeout behavior;
- Codex execution surfaces and SDK integration;
- existing workspace registry IDs;
- no Git operation.

## Authorized Surface

Authorized production files:

```text
src/shared/workspaceContracts.ts
src/preload/index.ts
src/renderer/app/App.tsx
src/renderer/app/WorkCardCloseWorkspace.tsx
```

Authorized only if directly required for typed payloads or tests:

```text
src/main/currentWorkflow/currentWorkflowService.ts
src/main/main.ts
src/shared/workspaces/documentWorkspace.ts
```

Authorized tests:

```text
test/app-shell/app-shell.test.cjs
test/workflow/current-execution-context.test.cjs
test/work-card-validation/work-card-validation-service.test.cjs
test/renderer/document-review-surface-source.test.cjs
test/renderer/work-card-report-review-workspace.test.cjs
test/renderer/work-card-close-workspace.test.cjs
```

Authorized durable report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR05_work_card_close_next_workspace_completion.md
```

Adjacent test helper changes are allowed only under `test/` and only when the Implementer Report explains why existing helpers could not prove the real path.

## Risks and Constraints

The main risk is solving a navigation defect by adding a second lifecycle authority. Do not do that.

The close-next action is not a lifecycle write. It is an evidence-derived renderer transition back to candidate selection. Approved validation evidence is already the durable authority.

The second risk is masking stale evidence. The close workspace must show the projection reason and block return when close projection is false.

The third risk is breaking `phase-close` or `project-close` by generalizing close behavior. This repair is limited to `work-card-close`.

## Acceptance Criteria

1. `work-card-close` remains registered at Work Card / Close and resolves from a fresh Approved Validation Record for the current Work Card/report revision.
2. The renderer exposes and uses `currentWorkflow:getCloseProjection` through the shared `ChampCityApi` and preload bridge.
3. The `work-card-close` UI displays close projection state, reason, return target, current phase ID, current Work Card ID, and source evidence paths.
4. The `work-card-close` UI displays matched evidence document names when the current Implementer Report and Validation Record are present in document inventory.
5. The `work-card-close` UI does not render `Run Current Handoff Action` and does not call `window.champcity.generateCurrentHandoff()`.
6. Clicking `Return to Phase Building / Next Work Card` from a closed projection transitions the renderer to `phase-work-card-selection` without app restart or manual rail click.
7. The close-next action creates no new repository artifact, no closeout document, no route token, no hidden completed flag, and no persistence side channel.
8. The close-next action does not mutate Validation Record disposition or Implementer Report disposition.
9. After return to `phase-work-card-selection`, the completed candidate is treated as complete from Approved validation evidence and is not re-selected as eligible.
10. If another candidate is eligible, the selection workspace presents that candidate and its Work Card Intake handoff path.
11. If no candidate is eligible because all are complete, the selection workspace presents the all-complete state without creating a fake Work Card.
12. If close projection is false because validation is missing, stale, unreadable, or not Approved, the return action is disabled or blocked and the projection reason is visible.
13. If a later Formal Work Card, Implementer Report, or repair revision makes validation stale, `work-card-close` no longer permits return as closed.
14. `RevisionRequested` validation continues to resolve to `work-card-repair` and is not affected by the close workspace repair.
15. `phase-close` and `project-close` behavior is unchanged.
16. Automated tests cover the shared/preload/renderer path and fail if `work-card-close` calls `generateCurrentHandoff`.
17. Automated tests cover the close-next positive path and at least one negative/stale-evidence path.
18. Typecheck, build, and the relevant test lanes pass in the approved normal Windows environment.
19. No dependency is added.
20. No Git operation occurs.

## Negative Constraints

Do not:

- add `work-card-close` as a `generateCurrentHandoff()` case;
- create a Work Card closeout document;
- create or consume a hidden completed flag;
- change Validation Record authority;
- change Implementer Report authority or disposition semantics;
- infer close status from renderer-only state;
- hard-code completion by Work Card ID;
- create a duplicate candidate-selection mechanism;
- move Validation Records out of `work-card-validation` ownership unless separately authorized;
- alter phase/project closeout behavior;
- add dependencies;
- perform Git staging, commit, push, reset, clean, stash, or checkout.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR05_work_card_close_next_workspace_completion.md
```

The Implementer Report must include:

- repository path, branch, remote, and working status verification;
- all changed files;
- confirmation that no Git mutation occurred;
- RCA confirmation or corrected RCA if implementation evidence disproves any finding above;
- exact close projection API path from main through preload to renderer;
- proof that `work-card-close` does not call `generateCurrentHandoff`;
- proof that close evidence is displayed from current model/projection source evidence;
- proof that closed return transitions to `phase-work-card-selection`;
- proof that stale or missing close evidence blocks return;
- proof that no closeout, hidden flag, or alternate persistence is created;
- proof that candidate selection re-evaluates and does not reselect the completed candidate;
- commands run and results;
- tests added or modified;
- any validation skipped and why;
- residual risk and Operator manual validation remaining.

End the report with:

```text
Document.Status=Pending
```

## Manual Validation

After Architect review of the Implementer Report, the Operator must validate in the running application:

1. Complete Review & Validation for a Work Card with `Validate Passed`.
2. Confirm the application moves to `Close / Next Work Card`.
3. Confirm the Close / Next workspace displays current close evidence and does not show `Run Current Handoff Action`.
4. Click `Return to Phase Building / Next Work Card`.
5. Confirm the application moves to Work Card Selection without the `currentWorkflow:generateHandoff` error.
6. Confirm the just-validated Work Card is treated as complete and the next eligible candidate, blocked state, or all-complete state is displayed.
7. Confirm no new closeout or hidden completion artifact was created.
8. Confirm `Request Repair` from Review & Validation still routes to Work Card Repair.
