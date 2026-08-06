<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
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
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR01_work_card_map_ineligible_and_active_authority.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR01_work_card_map_ineligible_and_active_authority.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR01_work_card_map_ineligible_and_active_authority.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Close-State Guard and Active Work Card Resume Routing",
    "status": "approved_for_implementation",
    "executionMode": "one bounded WC46 active-authority repair",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "WC46-REPAIR01 adds Ineligible status and repository-derived active Work Card authority, but active authority can drop when Approved validation evidence exists while the workflow is still in Work Card Close, and the renderer still treats Begin Planning as a planning-only transition instead of a resume action for the active Work Card's current loop workspace.",
    "rootCause": "The active Work Card authority helper excludes candidates with Approved validation evidence without preserving the pending Close / Next state, and App.tsx validates Begin Planning success only against work-card-planning even though the backend returns the refreshed current workspace for the active candidate.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR02_close_state_guard_and_active_work_card_resume_routing.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Repair only the remaining active-authority defects from WC46-REPAIR01 review. Do not revisit style-surface scope findings in this repair.",
    "reviewedAt": "2026-08-04"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR02 — Close-State Guard and Active Work Card Resume Routing

Status: Approved for Implementer execution  
Parent: `WC46`  
Git mutation: prohibited

## Verified Repository Evidence

The failed review is:

```text
planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR01_work_card_map_ineligible_and_active_authority.md
```

The review disposition was `RevisionRequested` for the remaining active-authority defects after WC46-REPAIR01.

Inspected production path:

```text
WorkCardMapWorkspace.tsx
→ App.tsx beginMappedWorkCardPlanningAndTransition(candidateId)
→ window.champcity.beginWorkCardPlanning(phaseId, candidateId)
→ currentWorkflowService.beginWorkCardPlanning()
→ workCardIntakeService.beginWorkCardPlanningForCandidate()
→ workCardIntakeService.resolveActiveWorkCardAuthority()
→ currentWorkflowService.getCurrentWorkspaceModel()
→ workCard-close / work-card-planning / work-card-building-review / work-card-report-review / work-card-repair
```

Confirmed source facts:

1. `workCardIntakeService.resolveActiveWorkCardAuthority()` derives active Work Card authority from Approved candidate-specific `work-card-intake-handoff` evidence, but filters out candidates as soon as `candidateCompletionEvidence()` exists.
2. After Operator validation passes, `currentWorkflowService` can still resolve `work-card-close` from the Pending Implementer Report plus Approved Validation Record.
3. Because active authority drops when Approved validation exists, the Work Card Map can treat the just-validated candidate as complete while the current backend workflow is still `work-card-close`.
4. `currentWorkflowService.beginWorkCardPlanning()` already returns a refreshed `currentWorkspace` payload after calling `beginWorkCardPlanningForCandidate()`.
5. `App.tsx beginMappedWorkCardPlanningAndTransition()` ignores non-planning resume destinations and requires the refreshed model to be `work-card-planning` for the selected candidate. If the selected candidate is already active in Build, Review & Validation, Repair, or Close, the renderer shows an error instead of continuing to the active candidate's current workspace.
6. WC46-REPAIR01 correctly added `Ineligible`, active candidate indication, candidate-scoped Formal Work Card preparation, and conflict detection. Those passed portions must be preserved.

## Confirmed Defects

### Defect 1 — Close-state authority drops too early

The active authority helper removes a candidate from active state as soon as Approved validation evidence exists. That is correct only after the Work Card Close / Next step has returned the Operator to the Work Card Map.

Before Close / Next is performed, backend current workflow can still be `work-card-close`. In that state, the loop must remain bound to the just-validated candidate and must not allow another candidate to begin.

### Defect 2 — Begin Planning cannot resume an active Work Card outside Planning

Once an active Work Card exists, the map may still show the active candidate. If the Operator clicks the action for that same active candidate, the app should continue to the candidate's current loop workspace.

Current renderer behavior expects only this result:

```text
beginWorkCardPlanning(candidateId)
→ refreshed current model is work-card-planning for candidateId
```

That is too narrow. The active candidate's correct current workspace may be:

```text
work-card-planning
work-card-building-review
work-card-report-review
work-card-repair
work-card-close
```

## Root Cause

WC46-REPAIR01 modeled candidate lock from intake handoff evidence, but did not preserve a pending Close state after validation and did not treat `Begin Planning` as a continue/resume action for an already active candidate.

The backend has enough repository/current-workflow evidence to identify the active candidate and its current workspace. The renderer is still enforcing a stale assumption that candidate action always enters Planning.

## Objective

Preserve the single-active-Work-Card loop rule until the candidate has completed Close / Next, and route same-candidate actions to the active candidate's current workflow workspace.

Required bounded runtime outcome:

```text
Begin Planning(WC02)
→ WC02 becomes active
→ WC02 may progress to Planning / Build / Review & Validation / Repair / Close
→ Work Card Map action for WC02 continues to WC02's current workspace
→ Work Card Map action for any other candidate is blocked while WC02 is active
→ after Validate Passed, WC02 remains the close-pending active Work Card while backend current workflow is work-card-close
→ Close / Next returns to Work Card Map
→ WC02 displays Complete and remaining candidates recalculate Eligible / Ineligible
```

## Runtime Sequence

### Existing authoritative evidence

```text
Approved Work_Card_Plan.md
Approved candidate-specific Work Card Intake handoff
Formal Work Card / Implementer Report / Validation Record evidence for the active candidate
Current workflow model derived from repository evidence
```

### Authorized application action

```text
Operator opens Work Card Map
→ selects the active candidate or an Eligible candidate
→ clicks the map action
```

### Required state transition

```text
No active Work Card + Eligible candidate
→ create/reuse candidate-specific intake handoff
→ enter Work Card Planning for that candidate

Active Work Card exists for same candidate
→ do not create duplicate lifecycle state
→ continue to that candidate's current workflow workspace

Active Work Card exists for different candidate
→ reject with visible active-candidate reason and evidence
```

### Persistence or rendering result

No new persistence is authorized. The repair must derive active state from existing lifecycle artifacts and current workflow evidence. No hidden selected-candidate file, route token, close acknowledgement, map sidecar, disposition mutation, or closeout document is allowed.

## Required Changes

### 1. Preserve close-pending active authority

Update active Work Card authority so Approved validation evidence does not unlock the next candidate while backend current workflow is still `work-card-close` for that same Work Card.

Required behavior:

```text
Approved Validation Record exists for WC02
+ current workflow resolves work-card-close for WC02
→ WC02 remains close-pending active
→ Work Card Map blocks Begin Planning for WC01/WC03/other candidates
→ Close / Next remains the required Operator action before starting another candidate
```

Do not add a persistent close acknowledgement. If the app is refreshed while the current repository-derived workflow is still `work-card-close`, the app may return to Close / Next. This repair must not invent hidden state to remember that the Operator viewed or left the close screen.

### 2. Distinguish Begin Planning from Continue Active Work Card

The backend `beginWorkCardPlanning(phaseId, candidateId)` path may retain its public name, but its behavior must support both cases:

```text
No active Work Card + selected Eligible candidate
→ Begin Planning

Same candidate already active
→ Continue active Work Card
```

For the same active candidate, the backend result must identify the active candidate's current workspace and current Work Card context. The renderer must transition to that workspace instead of requiring `work-card-planning`.

Authorized destinations for same-candidate continuation:

```text
work-card-planning
work-card-building-review
work-card-report-review
work-card-repair
work-card-close
```

The backend must reject a different selected candidate while another candidate is active, with a visible reason and evidence paths.

### 3. Make Work Card Map action labels match behavior

In the Work Card Map renderer:

- show `Begin Planning` only when there is no active Work Card and the selected candidate is `Eligible`;
- show a continuation label, such as `Continue Work Card`, when the selected candidate is the active candidate;
- disable or suppress action for other candidates while an active candidate exists;
- do not add a fourth candidate status label. The allowed candidate statuses remain exactly `Complete`, `Eligible`, and `Ineligible`.

The active marker may remain separate from status.

### 4. Route renderer from backend destination, not a hard-coded planning expectation

Revise `App.tsx beginMappedWorkCardPlanningAndTransition()` so it uses the backend-refreshed current workspace for the selected candidate.

Required behavior:

```text
backend result currentWorkspace.activeWorkspaceId = work-card-building-review
→ renderer transitions to work-card-building-review

backend result currentWorkspace.activeWorkspaceId = work-card-report-review
→ renderer transitions to work-card-report-review

backend result currentWorkspace.activeWorkspaceId = work-card-close
→ renderer transitions to work-card-close
```

For a new Begin Planning action, `work-card-planning` remains the expected first destination. For same-active-candidate continuation, any authorized active Work Card workspace listed above is valid.

If the refreshed backend model does not identify the selected candidate or resolves outside the authorized destination set, the renderer must show a blocking error and must not spoof success.

### 5. Preserve completed map behavior after Close / Next

After Close / Next returns to Work Card Map, the completed candidate displays `Complete`, and remaining candidates recalculate `Eligible` or `Ineligible` from `Work_Card_Plan.md` and Approved validation evidence.

All-complete Work Card Map still routes toward existing Phase Validation, not Phase Intake.

## Preserved Behavior

Preserve unchanged:

- `Complete`, `Eligible`, and `Ineligible` as the only user-facing map statuses;
- Approved Validation Record as durable Work Card completion evidence;
- Work Card Map as the Operator selection surface;
- candidate-scoped Work Card Intake handoff artifact type and path convention;
- Formal Work Card preparation targeting the active selected candidate;
- conflict detection for multiple active incomplete candidates;
- `work-card-close` not being a generic handoff-producing workspace;
- `RevisionRequested` routing to Work Card Repair;
- phase/project closeout behavior;
- Codex execution and Review & Validation behavior;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/main/workCardIntake/workCardIntakeService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/app/WorkCardMapWorkspace.tsx
src/renderer/app/WorkCardCloseWorkspace.tsx
src/renderer/app/NestedWorkflowRail.tsx
```

Tests authorized:

```text
test/work-card-intake/work-card-intake-service.test.cjs
test/work-card-planning/work-card-planning-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-map-workspace.test.cjs
test/renderer/project-rail-presentation.test.cjs
test/repository/runtime-wiring-source.test.cjs
test/app-shell/app-shell.test.cjs
```

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR02_close_state_guard_and_active_work_card_resume_routing.md
```

Adjacent test helper changes under `test/` are allowed only if explained in the Implementer Report.

## Acceptance Criteria

1. A candidate with Approved validation evidence remains close-pending active while backend current workflow is `work-card-close` for that candidate.
2. While a candidate is close-pending active, Work Card Map blocks `Begin Planning` for every other candidate.
3. Close / Next remains the visible action that returns the Operator from Work Card Close to Work Card Map.
4. After Close / Next return, the completed candidate displays `Complete` and no active marker.
5. Same-active-candidate action reuses existing handoff and does not create duplicate lifecycle artifacts.
6. Same-active-candidate action routes to the candidate's actual current workspace, not always to `work-card-planning`.
7. Same-active-candidate continuation supports `work-card-planning`, `work-card-building-review`, `work-card-report-review`, `work-card-repair`, and `work-card-close`.
8. Different-candidate action while one candidate is active is rejected with a visible reason and evidence path(s).
9. New eligible candidate action still begins at `work-card-planning` for the selected candidate.
10. Renderer transition uses backend current workspace evidence and blocks if the backend returns a different candidate or an unauthorized workspace.
11. Work Card Map action label distinguishes new planning from active continuation without adding a fourth candidate status label.
12. Formal Work Card preparation continues to target the active selected candidate.
13. Multiple active incomplete candidates still produce a visible conflict instead of silent selection.
14. All-complete Work Card Map still routes toward Phase Validation, not Phase Intake.
15. No hidden selected-candidate state, route token, close acknowledgement, map sidecar, closeout document, alternate persistence, validation mutation, or Implementer Report mutation is created.
16. `RevisionRequested` validation still routes to Work Card Repair.
17. Automated tests prove close-pending active guard, same-active continuation to at least Planning and one non-Planning workspace, different-candidate rejection, Close / Next return to complete map, all-complete Phase Validation transition, and repair routing preservation.
18. Typecheck, build, focused tests, and full test lane pass in the approved normal Windows environment.
19. No dependency is added.
20. No Git operation occurs.

## Negative Constraints

Do not:

- add user-facing statuses beyond `Complete`, `Eligible`, and `Ineligible`;
- add Architect approval, validation, or policy gates for candidate selection;
- use renderer state as active Work Card authority;
- create hidden selected-candidate state, route tokens, sidecar files, or close acknowledgement persistence;
- mutate validation records, Implementer Reports, phase closeouts, or project closeouts;
- route all-complete Work Cards to Phase Intake;
- reintroduce generic `generateCurrentHandoff()` for Work Card Map candidate actions;
- silently select among multiple active incomplete candidates;
- alter Codex execution or unrelated Review & Validation behavior;
- add dependencies;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR02_close_state_guard_and_active_work_card_resume_routing.md
```

The report must include:

- repository path, branch, remote, and working status verification;
- all changed files;
- confirmation that no Git mutation occurred;
- exact close-pending active authority correction;
- exact backend return shape or destination field used for active continuation;
- proof that same-active-candidate continuation routes to the actual current workspace;
- proof that a different candidate is blocked while one is active;
- proof that Work Card Map action labels distinguish begin versus continue;
- proof that Close / Next returns to the completed map state;
- proof that Formal Work Card preparation remains active-candidate scoped;
- proof that all-complete still routes toward Phase Validation;
- proof that no hidden state or alternate persistence was created;
- proof that `RevisionRequested` repair routing is preserved;
- commands run and results;
- validation skipped and reason;
- residual risks and Operator manual validation remaining.

End with:

```text
Document.Status=Pending
```

## Manual Validation

After Architect review of the Implementer Report, the Operator must validate in the running application:

1. Begin Planning for an Eligible Work Card.
2. Confirm the map identifies that Work Card as active.
3. Progress the active Work Card beyond Planning and confirm the map action continues to the current workspace.
4. Confirm other candidates cannot be started while the active candidate is in progress.
5. Validate Passed for the active candidate and confirm Close / Next remains the required visible transition.
6. Click Close / Next and confirm the map shows the completed candidate as `Complete`.
7. Confirm remaining candidates recalculate `Eligible` / `Ineligible`.
8. Confirm all-complete routes to Phase Validation, not Phase Intake.
9. Confirm `Request Repair` still routes to Work Card Repair.
