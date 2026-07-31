<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC28"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Architect_Reports/CODE_REVIEW_PROJECT_SHELL_NAVIGATION_AND_PHASE_MAP_CLARITY.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Current Project Startup, Navigation, and Phase Map Clarity",
    "status": "approved_for_implementation",
    "executionMode": "one bounded application-shell pass",
    "recommendedReasoning": "high",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC28_current_project_startup_navigation_and_phase_map_clarity.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Implement the five verified shell defects without changing Project Planning or Phase Map artifact authority.",
    "reviewedAt": "2026-07-30"
  }
}
CHAMPCITY-METADATA -->

# WC28 — Current Project Startup, Navigation, and Phase Map Clarity

Status: Approved for Implementer execution  
Phase: phase-08  
Git mutation: prohibited  
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC28_current_project_startup_navigation_and_phase_map_clarity.md`

## Objective

Correct five application-shell defects:

1. open the selected project at its evidence-derived current workflow step;
2. use `Project` for the selected repository and `workflow step` for process screens;
3. move project selection into the top of the left sidebar;
4. remove duplicate process navigation from the left sidebar;
5. prevent stale cross-step document previews and make Phase Map purpose/actions explicit.

## Required Change 1 — Open the Current Workflow Step

When a project is restored at application startup or selected by the Operator:

```text
load project
→ refresh repository evidence
→ getCurrentWorkspaceModel()
→ set active workflow step to model.activeWorkspaceId
```

Do not force Project Intake before or after resolution.

For Revisionary’s current evidence, startup must open `project-phase-map`.

Selection behavior:

- when the current step has a current review document, select and load it;
- when the current step is ready but has no output document, clear the prior selected document;
- manual top-rail navigation remains permitted after initial resolution.

## Required Change 2 — Correct Visible Terminology

Use these user-facing meanings:

```text
Project = selected repository and planning corpus
Workflow step = Project Intake, Architect Interview, Project Planning, Phase Map, etc.
```

At minimum replace visible repository-selection language:

```text
Choose Workspace  → Choose Project
Selected workspace → Selected Project
workspace path/context → project repository/path/context
```

Change relevant accessibility labels as well.

Do not perform a broad internal rename of `WorkspaceId`, IPC channel names, service names, or persisted schemas in this card.

## Required Change 3 — Move Project Selection to the Sidebar

At the top of the persistent left sidebar, show one compact project selector containing:

- selected project name;
- repository-relative or approved display path already available to the renderer;
- `Choose Project` action;
- existing clear/reset selection action when applicable.

Remove the `Choose Workspace` action from the workflow-screen header.

Remove the large repeated `Selected workspace` panel from workflow screens.

Do not add recent-project persistence, project creation, or project management in this card.

## Required Change 4 — Remove Duplicate Process Navigation

Remove the Project, Phase, and Work Card workflow-step lists from the left sidebar.

The top lifecycle rail becomes the sole navigation control for workflow steps.

The left sidebar becomes application-level navigation and currently needs only the project selector. Do not add fake or disabled placeholders for future MCP tools, settings, or roadmap tracking.

## Required Change 5 — Phase Map Selection and Action Clarity

All workflow-step navigation must use one transition function rather than directly calling `setActiveWorkspaceId`.

On transition:

1. set the destination workflow step;
2. clear `selectedDocumentId` and `selectedDocument` when the selected document is not owned by the destination;
3. select the destination’s current document when one exists;
4. otherwise show the destination empty/required-action state.

For Phase Map specifically:

- Approved Project Profile and Project Roadmap are input evidence only;
- both input paths must appear in the Phase Map current-action evidence;
- before a Phase Map output exists, show handoff/output-generation actions and no document disposition action;
- do not display the previously selected Roadmap as the Phase Map preview;
- after a Pending Phase Map exists, select it and enable Phase Map disposition;
- Project Profile/Roadmap bundle disposition remains exclusively in Project Planning.

Do not move Project Planning review controls into Phase Map.

## Authorized Production Surface

Expected changes are limited to:

```text
src/renderer/app/App.tsx
src/renderer/styles.css
src/renderer/app/NestedWorkflowRail.tsx                  [only if transition callback shape changes]
src/main/currentWorkflow/currentWorkflowService.ts       [Phase Map input evidence/capability only]
src/shared/workspaceContracts.ts                         [only if a narrow action-capability field is required]
focused renderer/current-workflow tests
```

## Non-Scope

Do not:

- change Project Planning Profile/Roadmap disposition authority;
- redesign Phase Map generation or its canonical artifact format;
- change MCP actions or handoff contracts;
- alter repository preflight or reconciliation behavior;
- add recent-project storage or a project database;
- add application settings, embedded MCP tooling, or roadmap tracking;
- rename internal workspace identifiers broadly;
- add dependencies;
- perform Git operations.

## Required Proof

Record each item as `Proven`, `OperatorValidationPending`, or `NotProven`.

1. Application startup with Revisionary opens Phase Map rather than Project Intake.
2. Choosing an already-established project opens its evidence-derived current workflow step.
3. A greenfield project with no Intake still opens Project Intake.
4. Visible repository terminology uses Project; process screens remain workflow steps.
5. The project selector appears at the top of the left sidebar and can choose a project.
6. The workflow header and body no longer repeat `Choose Workspace` or the large selected-workspace panel.
7. The left sidebar no longer renders Project, Phase, or Work Card workflow-step lists.
8. Top rail navigation still opens every registered workflow step.
9. Moving from Project Planning to an empty Phase Map clears the Roadmap preview.
10. Phase Map Ready state shows both Profile and Roadmap as input evidence and does not enable disposition before a Phase Map exists.
11. A Pending Phase Map is selected in Phase Map and can be dispositioned there.
12. Project Planning continues to own synchronized Profile/Roadmap disposition.
13. Project Intake, Architect Interview, and Project Planning accepted flows do not regress.
14. `npm run typecheck`, `npm run build`, and `npm test` pass in the approved lane.

## Completion

Create the Implementer Report only after proof items 1–14 are satisfied. Ordinary corrections remain inside WC28; do not create WC28-REPAIR01 merely to move unfinished work.

No Git operation is authorized.
