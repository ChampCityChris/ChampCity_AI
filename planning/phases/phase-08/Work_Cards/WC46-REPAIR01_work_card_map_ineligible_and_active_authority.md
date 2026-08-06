<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR01",
    "repairId": "WC46-REPAIR01",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46_work_card_map_and_candidate_scoped_planning.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46_work_card_map_and_candidate_scoped_planning.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46_work_card_map_and_candidate_scoped_planning.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Work Card Map Ineligible Status and Active Work Card Authority",
    "status": "approved_for_implementation",
    "executionMode": "one bounded WC46 repair",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "WC46 adds a Work Card Map and candidate-scoped Begin Planning, but downstream Work Card Planning, current-workflow, and Architect-output target resolution can still substitute an implicit next candidate after the Operator selects a specific eligible candidate. The map also lacks an explicit Ineligible category for candidates whose dependencies are not complete.",
    "rootCause": "Candidate selection is scoped at the Begin Planning entry point only. Active Work Card authority is not modeled as repository-derived state, so downstream resolvers still consult selectNextWorkCardCandidate() instead of active-candidate lifecycle evidence. Formal Work Card preparation also still reaches implicit candidate selection through workCardPlanningService.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR01_work_card_map_ineligible_and_active_authority.md",
    "revisionNotes": "Revision 2 adds src/main/workCardPlanning/workCardPlanningService.ts to the authorized production surface and explicitly requires Formal Work Card preparation to consume repository-derived active Work Card authority."
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Scope-corrected repair card. Implementer must include workCardPlanningService because Formal Work Card preparation still uses implicit next-candidate selection. Do not add Architect approval gates, hidden state, or extra candidate workflow categories.",
    "reviewedAt": "2026-08-04"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR01 — Work Card Map Ineligible Status and Active Work Card Authority

Status: Approved for Implementer execution  
Parent: `WC46`  
Revision: 2 — scope correction  
Git mutation: prohibited

## Verified Repository Evidence

The failed review is `planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46_work_card_map_and_candidate_scoped_planning.md` revision 1. It recorded `RevisionRequested` because WC46 created the Work Card Map and candidate-scoped `Begin Planning` entry point, but downstream planning authority can still fall back to implicit next-candidate selection.

The relevant production path was inspected:

```text
WorkCardMapWorkspace.tsx
→ App.tsx beginMappedWorkCardPlanningAndTransition(candidateId)
→ window.champcity.beginWorkCardPlanning(phaseId, candidateId)
→ currentWorkflowService.beginWorkCardPlanning()
→ workCardIntakeService.beginWorkCardPlanningForCandidate()
→ generateWorkCardIntakeHandoff(workspaceRoot, phaseId, candidateId)
→ currentWorkflowService.getCurrentWorkspaceModel()
→ approvedWorkCardIntakeWithoutApprovedFormalModel()
→ architectOutputWorkspaceService.exactWorkCardPlanningHandoff()
→ workCardPlanningService.resolveCurrentFormalWorkCardSelection()
```

Confirmed source facts:

1. `workCardIntakeService.getWorkCardMapProjection()` reads Approved `Work_Card_Plan.md` and currently exposes `Complete` / `Eligible` user-facing statuses.
2. `beginWorkCardPlanningForCandidate()` verifies the selected candidate is `Eligible` before writing or reusing that candidate's normal Work Card Intake handoff.
3. `currentWorkflowService.approvedWorkCardIntakeWithoutApprovedFormalModel()` still derives the planning candidate from `selectNextWorkCardCandidate()` instead of candidate-specific active evidence.
4. `architectOutputWorkspaceService.exactWorkCardPlanningHandoff()` still filters Approved Work Card Intake handoffs through `selectNextWorkCardCandidate()`.
5. `workCardPlanningService.resolveCurrentFormalWorkCardSelection()` still calls `selectNextWorkCardCandidate()`, so Formal Work Card preparation can target the implicit next candidate instead of the Operator-selected active candidate.
6. No inspected source creates hidden selected-candidate state, route tokens, close acknowledgements, closeout documents, or disposition mutations.

## Operator Decision Evidence

The Operator clarified the intended flow:

```text
Work Card Map may show multiple Eligible candidates when their dependencies are complete.
After Begin Planning is clicked for one candidate, the Work Card loop must lock to that selected Work Card until it completes or routes through repair.
Candidates whose dependencies are not complete should be visibly Ineligible.
```

Multiple Eligible candidates are allowed. The defect is not multiple eligibility; the defect is failure to preserve the selected candidate after Begin Planning.

## Confirmed Defect

WC46 establishes candidate scope at the action boundary but does not establish repository-derived active Work Card authority after the action succeeds.

If `WC02` and `WC03` are both `Eligible`, the Operator may click `Begin Planning` on `WC03`. WC46 can create or reuse the WC03 intake handoff, but current workflow, Architect-output target resolution, or Formal Work Card preparation may still use the implicit candidate returned by `selectNextWorkCardCandidate()` and resolve WC02 instead.

The Work Card Map also leaves dependency-blocked candidates unlabeled, which makes the map less clear than intended.

## Objective

Add `Ineligible` as the only additional Work Card Map status and make the Work Card loop bind to one repository-derived active Work Card after Begin Planning.

Required bounded runtime outcome:

```text
Approved Work_Card_Plan.md
→ Work Card Map shows Complete / Eligible / Ineligible
→ Operator clicks Begin Planning on WC03
→ WC03 intake handoff is created or reused
→ WC03 becomes the repository-derived active Work Card
→ Formal Work Card preparation, Planning, Build, Review & Validation, Repair, and Close bind to WC03
→ Begin Planning for other candidates is blocked while WC03 is active
→ WC03 reaches Approved validation and Close / Next returns to Work Card Map
→ Work Card Map recalculates statuses from repository evidence
```

## Required Changes

### 1. Add the Ineligible map status

Extend the Work Card Map projection and renderer to support exactly these user-facing candidate statuses:

```text
Complete
Eligible
Ineligible
```

Rules:

- `Complete` means current Approved validation evidence exists for the candidate.
- `Eligible` means the candidate is not Complete, all declared dependencies are Complete, and there is no other active Work Card in the phase.
- `Ineligible` means the candidate is not Complete and at least one declared dependency is not Complete, or the candidate cannot begin planning because another Work Card is already active.

No other user-facing candidate status labels are authorized.

### 2. Add repository-derived active Work Card authority

Add a narrow main-process service/helper that derives the active Work Card for a phase from existing repository evidence. It must not use renderer state.

The helper must identify an active candidate when the repository contains candidate-specific Work Card loop evidence that has not reached terminal completion. Valid active evidence includes:

```text
Approved work-card-intake-handoff for candidate with missing/unapproved Formal Work Card target
Pending/RevisionRequested/Rejected Formal Work Card for candidate
Approved Formal Work Card for candidate with missing/pending Implementer Report
Pending Implementer Report for candidate without Approved Validation Record
RevisionRequested repair path for candidate
Approved Validation Record for candidate while backend current workflow is still work-card-close
```

Terminal completion for map display is current Approved validation evidence once the Operator returns to Work Card Map. No hidden close-return acknowledgement, sidecar, or route token may be added.

If repository evidence indicates more than one active incomplete Work Card in the same phase, block with a visible conflict reason and evidence paths. Do not silently select by latest-file or plan order.

### 3. Lock Begin Planning while a Work Card is active

`Begin Planning(phaseId, candidateId)` must:

1. compute active Work Card authority for the phase;
2. if the same candidate is already active, reuse its existing candidate-specific handoff and route to that candidate's current loop workspace;
3. if a different candidate is active, reject with a visible reason identifying the active candidate and supporting evidence;
4. if no candidate is active, verify the selected candidate is `Eligible` and create/reuse that candidate's normal intake handoff.

This is a repository-derived single-active-Work-Card rule. It is not an Architect gate.

### 4. Preserve active candidate authority in downstream resolvers

Replace downstream implicit candidate selection after candidate-specific handoff evidence exists.

Required behavior:

```text
Begin Planning(WC03)
→ active Work Card helper returns WC03
→ getCurrentWorkspaceModel() resolves WC03 Planning / Build / Review / Repair / Close as appropriate
→ getArchitectOutputWorkspaceModel("work-card-planning") uses WC03 handoff/formal target
→ Formal Work Card preparation targets WC03
→ WC02 is not substituted merely because it sorts earlier or is also Eligible
```

Specific required corrections:

- `currentWorkflowService` must not use `selectNextWorkCardCandidate()` as active Work Card authority after candidate-specific intake handoff evidence exists.
- `architectOutputWorkspaceService` must resolve Work Card Planning target from active candidate handoff/formal target evidence, not implicit next-candidate selection.
- `workCardPlanningService.resolveCurrentFormalWorkCardSelection()` must consume repository-derived active Work Card authority and must not call `selectNextWorkCardCandidate()` for Formal Work Card preparation after an active candidate exists.
- Shared helper placement is allowed where the Implementer can avoid circular imports. Document the exact helper path in the Implementer Report.

### 5. Preserve Work Card Map and phase completion behavior

Close / Next continues to return to Work Card Map. When all planned candidates are `Complete`, Work Card Map shows all Work Cards complete and routes toward existing Phase Validation, not Phase Intake.

## Preserved Behavior

Preserve unchanged:

- Approved Validation Record as durable Work Card completion evidence;
- Implementer Report as implementation evidence only;
- Work Card Map as the Operator selection surface;
- candidate-scoped Begin Planning API shape unless a minimal typed return extension is needed;
- normal Work Card Intake handoff artifact type and target path convention;
- `work-card-close` not being a generic handoff-producing workspace;
- `RevisionRequested` routing to Work Card Repair;
- phase/project closeout behavior;
- Codex execution and Review & Validation workspaces;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/main/workCardIntake/workCardIntakeService.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/app/WorkCardMapWorkspace.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/app/WorkCardCloseWorkspace.tsx
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
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR01_work_card_map_ineligible_and_active_authority.md
```

Adjacent test helper changes under `test/` are allowed only if explained in the Implementer Report.

## Acceptance Criteria

1. Work Card Map renders exactly three user-facing candidate status labels: `Complete`, `Eligible`, and `Ineligible`.
2. Complete candidates have no `Begin Planning` action.
3. Eligible candidates expose `Begin Planning` only when no other Work Card is active in the phase.
4. Candidates with incomplete declared dependencies display `Ineligible` and have no enabled `Begin Planning` action.
5. Once `Begin Planning` succeeds for a candidate, that candidate becomes the repository-derived active Work Card.
6. While one candidate is active, Work Card Map visibly identifies the active Work Card and blocks `Begin Planning` for other candidates.
7. Re-entering `Begin Planning` for the same active candidate reuses that candidate's existing handoff and routes to that candidate's current loop workspace without duplicate state.
8. Beginning a different candidate while one is active is rejected with a visible reason and evidence path(s).
9. `getCurrentWorkspaceModel()` resolves Planning / Build / Review & Validation / Repair / Close for the active candidate, not the implicit first eligible candidate.
10. `getArchitectOutputWorkspaceModel("work-card-planning")` resolves the active candidate's Work Card Intake handoff and formal target path.
11. `workCardPlanningService` Formal Work Card preparation targets the active selected candidate, not the implicit next candidate.
12. A fixture with at least two simultaneously Eligible candidates proves selecting the later candidate keeps that later candidate active through current workflow, Architect-output target resolution, and Formal Work Card preparation.
13. Multiple active incomplete candidates in the same phase produce a visible conflict instead of silent latest-file or plan-order selection.
14. Close / Next returns to Work Card Map and the completed candidate displays `Complete` after return.
15. All-complete Work Card Map routes toward Phase Validation, not Phase Intake.
16. No hidden selected-candidate state, route token, map sidecar, close acknowledgement, closeout document, alternate persistence, validation mutation, or Implementer Report mutation is created.
17. `RevisionRequested` validation still routes to Work Card Repair.
18. Automated tests prove multi-Eligible selection, active-candidate lock, Ineligible rendering, same-candidate reuse, different-candidate rejection, Formal Work Card preparation targeting, all-complete Phase Validation transition, and repair routing preservation.
19. Typecheck, build, focused tests, and full test lane pass in the approved normal Windows environment.
20. No dependency is added.
21. No Git operation occurs.

## Negative Constraints

Do not:

- add user-facing statuses beyond `Complete`, `Eligible`, and `Ineligible`;
- add Architect approval, validation, or policy gates for candidate selection;
- use renderer state as active Work Card authority;
- use `selectNextWorkCardCandidate()` as active Work Card authority after candidate-specific handoff evidence exists;
- infer the active candidate from latest-file ordering without identity checks;
- silently select among multiple active incomplete candidates;
- duplicate candidate authority in renderer code;
- create hidden selected-candidate state, route tokens, sidecar files, or close acknowledgement persistence;
- mutate validation records, Implementer Reports, phase closeouts, or project closeouts;
- route all-complete Work Cards to Phase Intake;
- redesign styling outside the Work Card Map status and active-candidate indication;
- alter Codex execution or unrelated Review & Validation behavior;
- add dependencies;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR01_work_card_map_ineligible_and_active_authority.md
```

The report must include:

- repository path, branch, remote, and working status verification;
- all changed files;
- confirmation that no Git mutation occurred;
- exact active Work Card authority helper/path;
- exact Work Card Map projection changes for `Ineligible`;
- proof that only `Complete`, `Eligible`, and `Ineligible` render as candidate statuses;
- proof that `Begin Planning` locks the loop to the selected candidate;
- proof that a later eligible selected candidate is not replaced by an earlier eligible candidate;
- proof that same-candidate reuse and different-candidate rejection work;
- proof that Work Card Planning and Formal Work Card preparation target the active candidate;
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

1. Open Work Card Map after one Work Card is complete.
2. Confirm completed candidates show `Complete`.
3. Confirm candidates with satisfied dependencies show `Eligible`.
4. Confirm candidates with incomplete dependencies show `Ineligible`.
5. Select an Eligible candidate that is not first by plan order when such a fixture exists.
6. Confirm Work Card Planning and Formal Work Card preparation open for the selected candidate.
7. Confirm the Work Card loop remains bound to that candidate through Planning / Build / Review & Validation / Close.
8. Confirm other candidates cannot be started while the selected candidate is active.
9. Complete the active candidate and return to Work Card Map.
10. Confirm the completed candidate now shows `Complete` and the map recalculates remaining eligibility.
11. Confirm all-complete routes to Phase Validation, not Phase Intake.
12. Confirm `Request Repair` still routes to Work Card Repair.
