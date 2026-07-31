<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC28-REPAIR01"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC28-REPAIR01_project_selector_phase_map_embedded_architect_and_browser_transition.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC28-REPAIR01_project_selector_phase_map_embedded_architect_and_browser_transition.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "WC28-REPAIR01 Operator Validation Failure — Selector Layout and Phase Map Disposition",
    "reviewResult": "RevisionRequested",
    "parentWorkCardId": "WC28",
    "separateArchitectureFinding": "RCA_PHASE_MAP_HANDOFF_MCP_PERSISTENCE_AND_ROADMAP_SCOPE_GAP"
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "Operator validation failed. Correct the overlapping project-selector controls and add actual Phase Map disposition controls after a Pending Phase Map exists. The separate Phase Map MCP persistence and Roadmap-scope defect is not authorized inside this repair.",
    "reviewedAt": "2026-07-30"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC28-REPAIR01 Operator Validation Failure

Disposition: `RevisionRequested`  
Git mutation: none

## Accepted Work

The following implementation remains accepted:

- the full local repository path is removed from the selected-project display;
- Phase Map uses the embedded ChatGPT dual-pane foundation;
- Phase Map-specific Prepare and Copy Handoff controls exist;
- direct transitions between browser-enabled workflow steps use monotonic attachment generations;
- stale bounds, detach, hide, and status completions are rejected;
- deterministic validation passed before Operator testing.

## Blocking Defect 1 — Project Selector Controls Overlap

The running application shows `Choose Project` and `Clear Project` overlapping inside the 280-pixel sidebar.

The source cause is the combination of:

```text
.project-selector-actions {
  grid-template-columns: minmax(0, 1fr) auto;
}

.text-button {
  min-width: 184px;
}
```

Both actions are text buttons, so their minimum widths exceed the available selector width.

Required correction:

- render the two actions without overlap at the supported minimum application width;
- prefer two stacked full-width controls or another deterministic compact layout;
- do not widen the entire application sidebar merely to accommodate these buttons;
- preserve visible labels `Choose Project` and `Clear Project`.

## Blocking Defect 2 — Pending Phase Map Still Has No Disposition Surface

The repair moved Phase Map into `isArchitectEnabledWorkspace()`. This suppresses `CurrentActionPanel`, which previously contained the generic current-disposition action.

`PhaseMapActionBar` provides Prepare, Copy, Refresh, Reload, and Retry controls but no disposition selector or apply action. The preview footer displays only a placeholder statement that specialized controls will appear.

Required correction:

- before a Phase Map output exists, show no disposition control;
- after the canonical `phase-map` output exists and is selected, show Phase Map-specific `Approve`, `Reject`, and `Request Revision` controls;
- apply disposition only to the selected canonical Phase Map output;
- do not expose disposition for the Phase Map handoff;
- keep Project Profile and Project Roadmap disposition exclusively in Project Planning;
- replace the source-text-only assertion with proof that the rendered Phase Map path includes the review controls after output creation.

## Operator Observation About Current Missing Output

Revisionary currently has no file at:

```text
planning/project/Phase_Map/PHASE_MAP_revisionary.md
```

Therefore no disposition should be visible in the current empty-output state. However, the renderer would still fail to show disposition after the file is created, so the implementation defect remains real.

## Separate Architecture Finding

The Phase Map prompt and persistence problem is recorded separately because WC28-REPAIR01 explicitly prohibited a Phase Map MCP persistence action. Do not expand this repair into that cross-repository implementation.

## Required Completion Evidence

1. Running application shows non-overlapping `Choose Project` and `Clear Project` controls.
2. Empty Phase Map shows no disposition controls.
3. After a valid Pending Phase Map is created through the existing local save path, the Phase Map is selected and its disposition controls are visible and functional.
4. Profile/Roadmap review remains unchanged.
5. Browser-enabled transitions remain functional.
6. Typecheck, build, and full tests pass.
7. Revised Implementer Report accurately marks Operator-visible items pending until retested.
