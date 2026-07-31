<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC28"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC28_current_project_startup_navigation_and_phase_map_clarity.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC28_current_project_startup_navigation_and_phase_map_clarity.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC28 Current Project Startup, Navigation, and Phase Map Clarity",
    "reviewResult": "OperatorValidationPending",
    "deterministicImplementationAccepted": true,
    "repairRequired": false
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "Code review and independent validation passed. Final disposition awaits one Operator-observed Electron startup and navigation smoke using the persisted Revisionary project.",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC28 Current Project Startup, Navigation, and Phase Map Clarity

Disposition: `OperatorValidationPending`  
Deterministic implementation: accepted  
Repair required: no  
Git mutation: none

## Accepted Findings

The implementation satisfies the five WC28 corrections in source:

1. Persisted-project startup and project selection refresh repository evidence and transition through `getCurrentWorkspaceModel().activeWorkspaceId`; the selection path no longer forces Project Intake.
2. Visible repository terminology uses `Project`, while process locations are described as workflow steps.
3. Project selection is located at the top of the persistent left sidebar.
4. Duplicate Project, Phase, and Work Card lists are removed from the sidebar; the top rail uses the shared workflow-step transition function.
5. Workflow transitions clear documents not owned by the destination. Phase Map receives Profile and Roadmap as input evidence, does not expose disposition without a selected Phase Map output, and retains Phase Map-only disposition authority.

Project Planning continues to own synchronized Project Profile and Project Roadmap disposition.

## Code Review

`transitionToWorkflowStep()` is the single renderer navigation entry point used by the top rail and resolver-driven transitions. `documentIdForWorkflowStep()` accepts only documents classified to the destination workflow step, prefers the current review document, and clears the prior preview when no destination document exists.

Startup restoration calls `getSelectedWorkspace()`, then refreshes repository evidence with resolver use enabled. `refreshDocuments()` obtains the current-workflow model and passes its `activeWorkspaceId` to the transition path. For the current Revisionary corpus, the production current-workflow service resolves `project-phase-map`.

Phase Map readiness now exposes both:

- `planning/project/PROJECT_PROFILE.md`
- `planning/project/Project_Roadmap/PROJECT_ROADMAP_<project>.md`

The Phase Map disposition control is unavailable unless the selected document is assigned to the Phase Map workflow step and is not a non-review handoff. Before Phase Map output exists, navigation therefore clears the prior Roadmap preview and leaves only handoff/output-generation actions.

## Independent Validation

```text
npm run typecheck → passed
npm run build     → passed
npm test          → 130/130 passed
```

HEAD remained unchanged at `a94e0720afb110ed7a0fc748b14cc9799d923099`.

## Operator Validation Required

Using the persisted Revisionary project:

1. restart the application and confirm it opens Phase Map;
2. confirm the sidebar shows Selected Project, Revisionary, Choose Project, and no duplicate workflow lists;
3. navigate Project Planning → Phase Map and confirm the Roadmap preview clears;
4. confirm both Profile and Roadmap appear as Phase Map input evidence;
5. confirm no Phase Map disposition control is available before a Phase Map output exists;
6. create or load a Pending Phase Map and confirm it is selected and can be dispositioned in Phase Map.

A passing smoke completes WC28. Any failure remains inside WC28; no repair card is presently justified.
