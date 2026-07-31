<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC28-REPAIR02",
    "repairId": "WC28-REPAIR02"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC28-REPAIR01_project_selector_phase_map_embedded_architect_and_browser_transition.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC28-REPAIR01_OPERATOR_VALIDATION_FAILED_selector_layout_and_phase_map_disposition.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Project Selector Layout and Phase Map Disposition Completion",
    "status": "approved_for_implementation",
    "parentWorkCardId": "WC28-REPAIR01",
    "rootWorkCardId": "WC28",
    "executionMode": "one concise repair pass",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC28-REPAIR02_project_selector_layout_and_phase_map_disposition_completion.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Correct the two failed REPAIR01 acceptance behaviors and preserve the accepted browser-transition implementation.",
    "reviewedAt": "2026-07-30"
  }
}
CHAMPCITY-METADATA -->

# WC28-REPAIR02 — Project Selector Layout and Phase Map Disposition Completion

Status: Approved for Implementer execution  
Parent: `WC28-REPAIR01`  
Git mutation: prohibited

## Objective

Correct only these two failed REPAIR01 behaviors:

1. Project selector controls overlap in the running application.
2. A Pending Phase Map cannot be dispositioned in the Phase Map dual-pane screen.

Preserve the accepted direct embedded-browser transition correction from WC28-REPAIR01.

## Required Change 1 — Project Selector Layout

The sidebar project selector must render this content without overlap at all supported application widths:

```text
Selected Project
<Project Name>
Choose Project
Clear Project
```

Requirements:

- no full repository path;
- no button overlap, clipping, negative positioning, or hidden text;
- `Choose Project` and `Clear Project` must be individually clickable;
- use a deterministic stacked full-width layout unless another layout is demonstrably non-overlapping at the current 280px sidebar width;
- preserve the existing choose and clear handlers.

## Required Change 2 — Phase Map Disposition

Phase Map remains an embedded-Architect dual-pane workflow step.

Before a Phase Map output exists:

- show Phase Map preparation/copy/output controls as currently implemented;
- show no Phase Map disposition selector or apply button.

After a readable Pending, Rejected, or RevisionRequested `phase-map` artifact exists and is selected:

- show Phase Map-specific disposition controls in the Phase Map screen;
- allow `Approved`, `Rejected`, and `RevisionRequested`;
- require non-empty revision instructions for `RevisionRequested` if the existing disposition service supports review notes for this artifact; otherwise preserve the currently supported Phase Map disposition contract without inventing a second review system;
- apply disposition only to the selected canonical Phase Map artifact;
- do not expose Profile or Roadmap disposition in Phase Map;
- after disposition, refresh repository evidence and resolve the next current workflow step.

The controls must be rendered in the actual Phase Map dual-pane path. Merely retaining unused generic disposition code elsewhere in `App.tsx` is not proof.

## Required Change 3 — Preserve Browser Transition Fix

Do not replace, weaken, bypass, or duplicate the globally monotonic embedded-browser attachment generation implemented in WC28-REPAIR01.

Direct navigation among Architect Interview, Project Planning, and Phase Map must remain supported without an intermediate non-browser step.

## Authorized Production Surface

Expected changes are limited to:

```text
src/renderer/app/App.tsx
src/renderer/styles.css
focused renderer tests
```

A narrow shared helper change is allowed only when required to render or validate the Phase Map review controls. Do not change main-process browser authority, Phase Map handoff generation, MCP actions, or artifact schemas in this card.

## Non-Scope

Do not:

- change the Phase Map prompt or handoff contract;
- add or change an MCP save action;
- revise the Project Roadmap;
- remove the Phase Map manual output field;
- alter Project Planning authority;
- redesign the sidebar;
- change startup resolution, top-rail navigation, or document selection;
- add dependencies;
- perform Git operations.

## Required Proof

Record each item as `Proven`, `OperatorValidationPending`, or `NotProven`.

1. Project selector buttons do not overlap at the current desktop width.
2. Project selector buttons do not overlap at the minimum supported application width.
3. Choose Project still opens project selection.
4. Clear Project still clears the selected project.
5. Empty Phase Map has no disposition controls.
6. A Pending Phase Map renders Phase Map-specific disposition controls in the dual-pane screen.
7. Applying a Phase Map disposition changes only the selected Phase Map artifact.
8. Approved Phase Map advances repository-derived workflow state.
9. Profile and Roadmap disposition remains exclusive to Project Planning.
10. Direct navigation among all three browser-enabled workflow steps still reaches `attached-visible`.
11. `npm run typecheck`, `npm run build`, and `npm test` pass in the approved lane.
12. Operator validates items 1, 5, 6, 8, and 10 in the running Electron application.

## Completion

Create the Implementer Report only after proof items 1–11 pass. Item 12 may remain `OperatorValidationPending`.

No Git operation is authorized.
