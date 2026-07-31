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
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC27_project_planning_current_state_reconciliation_and_legacy_evidence.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Code Review — Project Shell Navigation and Phase Map Clarity",
    "reviewResult": "NewWorkCardRequired",
    "workCardId": "WC28"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Five bounded application-shell defects were verified. They are assigned to WC28 and do not alter Project Planning or Phase Map artifact authority.",
    "reviewedAt": "2026-07-30"
  }
}
CHAMPCITY-METADATA -->

# Code Review — Project Shell Navigation and Phase Map Clarity

Disposition: `NewWorkCardRequired`  
Work Card: `WC28`  
Git mutation: none

## Verified Findings

### 1. Startup and project selection force Project Intake

`App.tsx` initializes `activeWorkspaceId` from `workspaceDefinitions[0].id`, which is Project Intake. `activateWorkspaceSelection()` also explicitly calls:

```text
setActiveWorkspaceId("project-intake-capture")
```

before repository resolution completes.

The application already has the correct evidence-derived authority in `getCurrentWorkspaceModel()`. For Revisionary it resolves Phase Map as the active step after Project Planning completion. The renderer is not using that authority as the initial destination.

### 2. Repository and process screens share the same visible term

The UI uses “workspace” for both:

- the selected repository; and
- lifecycle screens such as Project Intake, Project Planning, and Phase Map.

Visible examples include `Choose Workspace`, `Selected workspace`, the sidebar `aria-label="Workspaces"`, and process-screen naming. This makes project selection and workflow navigation appear to be the same concept.

The internal `WorkspaceId` vocabulary does not need to be renamed in this card. The defect is user-facing terminology.

### 3. Project selection is repeated inside every process screen

The project chooser remains in the screen header and a large `Selected workspace` panel is rendered inside ordinary lifecycle screens. The same project context is repeated while consuming vertical workspace.

Project selection is application-level navigation and belongs at the top of the persistent left sidebar.

### 4. The left sidebar duplicates the top lifecycle rail

`App.tsx` defines `navigationGroups` containing Project, Phase, and Work Card process screens. The sidebar renders those groups while the top rail already provides lifecycle navigation.

The two navigation systems can disagree about user focus and unnecessarily crowd the application shell. The top rail should remain the workflow-step navigator. The left sidebar should become project/application navigation.

### 5. Workflow-step changes preserve an unrelated selected document

`NestedWorkflowRail` receives:

```text
onWorkspaceChange={setActiveWorkspaceId}
```

Changing the workflow step therefore changes only `activeWorkspaceId`; it does not clear or replace `selectedDocumentId` and `selectedDocument`.

This produced the observed Phase Map screen:

- Phase Map had no document;
- the document list correctly said `No documents in this workspace`;
- the preview still displayed the Project Roadmap selected in Project Planning.

The Phase Map action surface is also ambiguous before a Phase Map exists:

- `missingPhaseMapModel()` reports only the Roadmap in `sourceEvidence`, although both Approved Profile and Roadmap are required inputs;
- the generic `CurrentActionPanel` renders `Apply Current Disposition` without proving a Phase Map exists;
- clicking it before Phase Map creation can only fail in the service.

Project Profile and Project Roadmap disposition remains owned by Project Planning. Phase Map owns only Phase Map handoff, output, preview, and disposition.

## Required Product Direction

```text
Selected Project
→ evidence-derived current workflow step
→ top rail navigates workflow steps
→ left sidebar selects the project and later application-level tools
→ each workflow step displays only its own selected output document
```

WC28 should correct the shell and selection behavior without redesigning artifact protocols, Project Planning review, Phase Map generation, or MCP integration.
