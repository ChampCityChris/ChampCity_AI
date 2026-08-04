<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44-REPAIR07_work_card_selection_planning_context_and_navigation_authority.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR07_work_card_selection_planning_context_and_navigation_authority.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC44-REPAIR07_work_card_selection_planning_context_and_navigation_authority.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Work Card Map and Candidate-Scoped Planning",
    "status": "approved_for_implementation",
    "executionMode": "one bounded Work Card Map flow change",
    "dependsOn": [
      "WC44-REPAIR07"
    ],
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46_work_card_map_and_candidate_scoped_planning.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Replace implicit next-candidate Work Card Selection with an explicit Work Card Map driven by Approved Work_Card_Plan evidence. User-facing states are limited to Complete and Eligible. Candidate-specific Begin Planning is the only way to enter Work Card Planning from the map.",
    "reviewedAt": "2026-08-04"
  }
}
CHAMPCITY-METADATA -->

# WC46 — Work Card Map and Candidate-Scoped Planning

Status: Approved for Implementer execution  
Git mutation: prohibited

## Verified Repository Evidence

Operator validation after `WC44-REPAIR07` shows the current flow still fails to make Work Card Planning clearly candidate-scoped:

```text
WC01 closed
→ navigation/context shows MVP-01-WC02 Planning
→ Work Card Planning content still displays the Approved WC01 Formal Work Card
```

The screenshot is valid user-visible failure evidence. Repository inspection confirms a larger flow-design problem rather than a narrow button defect.

Inspected production path:

```text
Approved Work_Card_Plan.md
→ workCardIntakeService.readCandidates()
→ selectNextWorkCardCandidate()
→ generateWorkCardIntakeHandoff()
→ currentWorkflowService.resolveCurrentWorkspaceModel()
→ App.tsx phase-work-card-selection / work-card-planning rendering
→ architectOutputWorkspaceService targetPathsForWorkspace("work-card-planning")
→ NestedWorkflowRail current/active presentation
```

Confirmed source facts:

1. `src/main/workCardIntake/workCardIntakeService.ts` already reads candidates from the Approved `Work_Card_Plan.md` through `readCandidates()` and validates them through `validateCandidates()`.
2. The same service derives candidate completion from current Approved validation evidence through `candidateCompletionEvidence()`.
3. `generateWorkCardIntakeHandoff()` currently takes only `workspaceRoot` and `phaseId`; it does not accept an explicit `candidateId` selected by the Operator from a map.
4. `selectNextWorkCardCandidate()` includes several internal candidate states. For this Work Card, the only user-facing map statuses authorized are `Complete` and `Eligible`.
5. `src/renderer/app/WorkCardSelectionWorkspace.tsx` renders a transient close-return projection. It does not render the full Approved `Work_Card_Plan.md` as a durable map comparable to the Phase Map workspace.
6. `src/renderer/app/phaseMapPresentation.tsx` demonstrates the existing pattern for rendering a canonical planning artifact as an operator-facing map/accordion view.
7. `src/main/architectOutputs/architectOutputWorkspaceService.ts` resolves the Work Card Planning target from an Approved `work-card-intake-handoff` by workspace, not from an explicit candidate selection argument.
8. `src/renderer/app/App.tsx` can clear stale selected-document state during close-return preparation, but current Work Card Planning still depends on correct backend/current-target resolution to prevent WC01 content from appearing under WC02 rail context.
9. `src/renderer/app/NestedWorkflowRail.tsx` still labels the top of the Work Card subflow as `Work Card Loop`; the Operator-facing concept needed here is a `Work Card Map`.

## Objective

Replace the implicit next-candidate selection flow with an explicit Work Card Map flow driven by the Approved `Work_Card_Plan.md`.

One bounded runtime outcome:

```text
Approved Work_Card_Plan.md
→ Work Card Map displays all Work Card candidates
→ WC01 shows Complete from Approved validation evidence
→ WC02 shows Eligible when it is incomplete and predecessors are complete
→ Operator expands WC02 and clicks Begin Planning
→ application creates or reuses the normal WC02 Work Card Intake handoff
→ Work Card Planning opens for WC02 and never displays stale WC01 content
```

## Runtime Sequence

### Existing authoritative evidence

```text
Approved Phase Planning bundle
Approved Work_Card_Plan.md
Approved validation evidence for completed candidates
No Approved Formal Work Card for the selected eligible candidate
```

### Authorized application action

```text
Operator opens Work Card Map
→ expands an Eligible candidate
→ clicks Begin Planning
```

### Required state transition

```text
phase-work-card-selection / Work Card Map
→ beginWorkCardPlanning(phaseId, candidateId)
→ verify candidate is Eligible from repository evidence
→ write or reuse the normal Work Card Intake handoff for that exact candidate
→ refresh current workflow
→ resolve work-card-planning for the same candidateId
```

### Persistence or rendering result

The only lifecycle artifact written by `Begin Planning` is the existing normal `work-card-intake-handoff` for the selected candidate. If that exact handoff already exists and is current, it may be reused. No map state, route token, hidden selected-candidate file, closeout document, or disposition mutation is allowed.

### Operator-visible outcome

The Operator sees a Work Card Map, not a generic document selector. Eligible candidates have a visible `Begin Planning` action. Complete candidates have no planning action. After beginning WC02, Work Card Planning shows WC02 context and WC02 targets only.

When all Work Cards in the phase are Complete, the Work Card Map shows the phase Work Card set as complete and provides a transition toward the existing Phase Validation workspace. It must not return to Phase Intake.

## Required Changes

### 1. Rename the visible Work Card Loop / Selection concept to Work Card Map

Preserve internal workspace IDs where practical, especially `phase-work-card-selection`, to avoid unnecessary registry churn. Change the user-visible label and surface behavior to `Work Card Map`.

At minimum:

- update the Work Card sub-rail label currently shown as `Work Card Loop` to `Work Card Map`;
- render `phase-work-card-selection` as a dedicated Work Card Map workspace;
- remove generic document selector / empty document slot / `Document workflow not yet implemented` UI from this workspace.

### 2. Add a Work Card Map projection from Approved Work_Card_Plan evidence

Add a backend projection that reads the Approved `Work_Card_Plan.md` for the current phase and returns all candidates in order.

Authorized user-facing candidate states for this Work Card are only:

```text
Complete
Eligible
```

Rules:

- `Complete` means current Approved validation evidence exists for that candidate.
- `Eligible` means the candidate is not Complete and all planned predecessor candidates required for this phase are Complete.
- Candidates that are neither Complete nor Eligible may be displayed without a status badge and without action; do not introduce additional named user-facing states in this Work Card.
- Do not render or introduce user-facing statuses named `Dependency Blocked`, `Deferred`, `Superseded`, `Already Satisfied`, or `Carried Forward` in this pass.

The backend may reuse existing internal candidate-selection/explanation helpers, but the renderer must not duplicate candidate authority.

### 3. Add candidate-scoped Begin Planning authority

Add a backend action equivalent to:

```text
beginWorkCardPlanning(phaseId, candidateId)
```

The action must:

1. read current Approved `Work_Card_Plan.md` evidence;
2. verify the requested candidate exists;
3. verify the requested candidate is currently `Eligible` under the two-state map rules;
4. create or reuse the normal Work Card Intake handoff for exactly that `candidateId`;
5. return the handoff path, formal Work Card target path, phase ID, candidate ID, and refreshed planning target data.

Do not call a generic `select next candidate` action when the Operator selected a specific candidate. Existing `generateWorkCardIntakeHandoff()` may be refactored to accept a candidate ID or wrapped by a candidate-scoped function, but the final runtime behavior must be candidate-specific.

### 4. Make Work Card Planning candidate-scoped

After `Begin Planning`, the refreshed current model and Work Card Planning workspace must be for the selected candidate.

Required behavior:

```text
Begin Planning for WC02
→ Approved WC02 intake handoff exists
→ current workflow resolves work-card-planning for WC02
→ Work Card Planning loads the WC02 handoff/formal target
→ WC01 Formal Work Card is not selected or displayed as the current planning document
```

This requires exact candidate scoping in the planning target resolver. Do not rely on the latest Approved Work Card intake handoff alone if multiple handoffs exist.

### 5. Preserve close and phase advancement behavior

Close / Next for an individual Work Card must return to the Work Card Map.

When every planned Work Card candidate in the current phase is Complete, the Work Card Map must show that Work Cards are complete for the phase and provide an Operator-visible transition to the existing Phase Validation workspace.

Do not create Phase Validation, Phase Close, or Next Phase behavior in this Work Card beyond the transition target required to leave the Work Card Map. Do not route all-complete Work Cards back to Phase Intake.

## Preserved Behavior

Preserve unchanged:

- Approved Validation Record as durable Work Card completion authority;
- Implementer Report as implementation evidence only;
- Formal Work Card target path convention;
- Work Card Intake handoff artifact type and canonical metadata shape unless a candidate ID parameter requires a minimal extension to existing service input;
- `work-card-close` not being a generic handoff-producing workspace;
- `RevisionRequested` routing to Work Card Repair;
- phase/project closeout behavior;
- Codex execution and Review & Validation workspaces;
- no Git operation.

## Authorized Surface

Production files authorized:

```text
src/main/workCardIntake/workCardIntakeService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/app/WorkCardSelectionWorkspace.tsx
src/renderer/app/WorkCardMapWorkspace.tsx
src/renderer/app/phaseMapPresentation.tsx
```

`WorkCardMapWorkspace.tsx` is preferred. If the Implementer reuses `WorkCardSelectionWorkspace.tsx`, the report must explain why the reused component remains a true Work Card Map and no longer a close-return selection surface.

Tests authorized:

```text
test/work-card-intake/work-card-intake-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-selection-workspace.test.cjs
test/renderer/work-card-map-workspace.test.cjs
test/renderer/project-rail-presentation.test.cjs
test/repository/runtime-wiring-source.test.cjs
test/app-shell/app-shell.test.cjs
```

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46_work_card_map_and_candidate_scoped_planning.md
```

Adjacent test helper changes under `test/` are allowed only if the Implementer Report explains why existing helpers could not prove the production path.

## Risks and Constraints

This Work Card changes flow. It is not another WC44 repair. Keep scope to the Work Card Map and candidate-scoped planning authority.

Do not introduce additional Architect approval gates, candidate policy statuses, or process states. The only user-facing candidate states authorized here are `Complete` and `Eligible`.

The Work Card Map is an Operator selection surface. It must not grant the Architect role new lifecycle authority.

## Acceptance Criteria

1. The visible Work Card subflow entry is labeled `Work Card Map`, not `Work Card Loop`.
2. `phase-work-card-selection` renders a dedicated Work Card Map based on Approved `Work_Card_Plan.md` evidence.
3. The Work Card Map shows all candidates from the current phase Work Card Plan in plan order.
4. A candidate with current Approved validation evidence displays `Complete` and has no `Begin Planning` action.
5. A candidate that is incomplete and whose planned predecessors are Complete displays `Eligible` and exposes `Begin Planning` on expansion.
6. No other user-facing candidate status labels are introduced in this pass.
7. The Work Card Map does not show the generic document selector, generic empty document slot, or `Document workflow not yet implemented` area.
8. `Begin Planning` passes the selected `candidateId` to a candidate-scoped backend action.
9. The backend rejects `Begin Planning` for a candidate that is not currently Eligible.
10. `Begin Planning` for WC02 creates or reuses only the normal WC02 Work Card Intake handoff at the existing target path.
11. After WC02 `Begin Planning`, `getCurrentWorkspaceModel()` resolves `work-card-planning` for WC02.
12. Work Card Planning for WC02 loads WC02 handoff/formal target evidence and does not display WC01 as the current planning document.
13. Multiple Approved Work Card Intake handoffs do not cause Work Card Planning to select the wrong candidate by latest-file ordering.
14. Close / Next for an individual Work Card returns to the Work Card Map.
15. When all planned Work Card candidates are Complete, the Work Card Map displays a phase Work Cards complete state and offers transition to Phase Validation, not Phase Intake.
16. The implementation creates no hidden selected-candidate state, route token, close acknowledgement, closeout document, alternate map persistence, or disposition mutation.
17. `RevisionRequested` validation still routes to Work Card Repair.
18. Automated tests prove the full sequence: WC01 Complete → Work Card Map shows WC01 Complete and WC02 Eligible → Begin Planning WC02 → WC02 Work Card Planning opens with WC02 target and no WC01 current document.
19. Automated tests prove the all-complete map state transitions toward Phase Validation and does not generate a fake Work Card.
20. Typecheck, build, focused tests, and full test lane pass in the approved normal Windows environment.
21. No dependency is added.
22. No Git operation occurs.

## Negative Constraints

Do not:

- add user-facing statuses beyond `Complete` and `Eligible`;
- introduce dependency-blocked/deferred/superseded/already-satisfied/carried-forward workflow UI in this pass;
- add Architect approval or validation gates for candidate selection;
- use generic `generateCurrentHandoff()` for Work Card Map `Begin Planning`;
- infer the selected candidate from latest handoff ordering;
- duplicate candidate-selection authority in renderer code;
- show WC01 as the current Work Card Planning document after WC02 is selected;
- create hidden selected-candidate state, route tokens, or sidecar persistence;
- create or mutate validation records, Implementer Reports, phase closeouts, or project closeouts;
- route all-complete Work Cards to Phase Intake;
- redesign styling outside the Work Card Map surface;
- alter Codex execution or Review & Validation behavior;
- add dependencies;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, or tag.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46_work_card_map_and_candidate_scoped_planning.md
```

The report must include:

- repository path, branch, remote, and working status verification;
- all changed files;
- confirmation that no Git mutation occurred;
- exact Work Card Map projection path;
- exact candidate-scoped Begin Planning API path;
- proof that only `Complete` and `Eligible` render as candidate statuses;
- proof that `Begin Planning` passes and verifies candidate ID;
- proof that WC02 planning resolves WC02 target evidence and does not display WC01;
- proof that all-complete routes toward Phase Validation rather than Phase Intake;
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

1. Complete WC01 with `Validate Passed`.
2. Click `Return to Phase Building / Next Work Card`.
3. Confirm the app opens Work Card Map.
4. Confirm WC01 shows `Complete`.
5. Confirm WC02 shows `Eligible`.
6. Expand WC02 and click `Begin Planning`.
7. Confirm Work Card Planning opens for WC02 and does not display WC01 as the current planning document.
8. Complete all Work Cards in a test phase or fixture and confirm Work Card Map routes toward Phase Validation, not Phase Intake.
9. Confirm `Request Repair` still routes to Work Card Repair.
