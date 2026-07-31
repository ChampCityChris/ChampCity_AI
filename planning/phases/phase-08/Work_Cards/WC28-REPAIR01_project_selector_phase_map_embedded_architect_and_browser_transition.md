<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC28-REPAIR01",
    "repairId": "WC28-REPAIR01"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC28_current_project_startup_navigation_and_phase_map_clarity.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC28_OPERATOR_VALIDATION_project_selector_phase_map_and_browser_transition.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Project Selector, Phase Map Embedded Architect, and Browser Transition Repair",
    "status": "approved_for_implementation",
    "parentWorkCardId": "WC28",
    "executionMode": "one bounded repair pass",
    "recommendedReasoning": "high",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC28-REPAIR01_project_selector_phase_map_embedded_architect_and_browser_transition.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Correct only the three Operator-validation defects. Preserve accepted WC28 startup, navigation, document-selection, and authority behavior.",
    "reviewedAt": "2026-07-30"
  }
}
CHAMPCITY-METADATA -->

# WC28-REPAIR01 — Project Selector, Phase Map Embedded Architect, and Browser Transition

Status: Approved for Implementer execution  
Parent: `WC28`  
Git mutation: prohibited  
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC28-REPAIR01_project_selector_phase_map_embedded_architect_and_browser_transition.md`

## Objective

Correct three Operator-validation defects without reopening accepted WC28 behavior:

1. remove the full repository path from the sidebar project selector;
2. make Phase Map a usable embedded-Architect workflow step;
3. make direct transitions between embedded-browser workflow steps reliable.

## Defect 1 — Project Selector

The sidebar must display only:

```text
Selected Project
<Project Name>
Choose Project
Clear Project
```

Remove the visible full repository path. Do not replace it with a remote URL, workspace ID, branch, or other verbose identifier.

## Defect 2 — Phase Map Embedded Architect Surface

Phase Map must use the same embedded ChatGPT browser foundation as Architect Interview and Project Planning.

Required behavior:

- Phase Map uses the dual-pane layout with the document/output area and embedded ChatGPT pane visible together;
- the existing Phase Map current-state evidence remains visible;
- before a Phase Map exists, show `Prepare Phase Map Handoff` and no Phase Map disposition control;
- after preparation, show `Copy Phase Map Handoff`;
- the copied instruction names:
  - current Approved Project Profile;
  - current Approved Project Roadmap;
  - generated Phase Map handoff;
  - exact Phase Map output target;
- the existing Phase Map output-entry/save path remains available in this repair;
- after a Pending Phase Map exists, select it and allow Phase Map disposition;
- Project Profile/Roadmap disposition remains exclusively in Project Planning.

A generic `Run Current Handoff Action` label is not sufficient for Phase Map. Use Phase Map-specific labels.

Do not add or modify an MCP action in this repair.

## Defect 3 — Browser Transition Race

Direct navigation must work between all browser-enabled workflow steps, including:

```text
Architect Interview → Project Planning
Project Planning → Architect Interview
Architect Interview → Phase Map
Project Planning → Phase Map
Phase Map → either prior browser-enabled step
```

Required behavior:

- the destination browser attaches without requiring an intermediate non-browser workflow step;
- the destination must not remain at `Starting browser...` with attachment state `detached`;
- an older step’s asynchronous detach, zero-bounds update, hide, or status response must not override a newer attachment;
- attachment authority must use a globally monotonic generation or equivalent cross-instance stale-operation rejection;
- leaving all browser-enabled steps still hides the browser;
- Retry remains available only for a genuine current attachment failure.

Do not solve this with timeouts, delayed retries, forced rail hops, or duplicate browser instances.

## Authorized Production Surface

Expected changes are limited to:

```text
src/renderer/app/App.tsx
src/renderer/styles.css
src/shared/architectInterview/architectBrowserAttachmentCoordinator.ts
src/main/architectInterview/*browser*                           [only if stale generation must be enforced in main]
src/main/phaseMap/phaseMapService.ts                            [Phase Map instruction only]
src/main/currentWorkflow/currentWorkflowService.ts              [narrow Phase Map action labeling/instruction only]
src/main/main.ts                                                [narrow copy IPC only if required]
src/preload/index.ts                                            [matching narrow API only if required]
src/shared/workspaceContracts.ts                                [matching narrow contract only if required]
focused renderer, browser-coordinator, and Phase Map tests
```

## Non-Scope

Do not:

- change WC28 startup resolution or top-rail navigation;
- restore duplicate sidebar workflow navigation;
- move Profile/Roadmap disposition into Phase Map;
- change Phase Map artifact metadata or domain schema;
- add a Phase Map MCP persistence action;
- change Project Planning polling or reconciliation;
- add recent projects, settings, MCP tools, or roadmap tracking;
- add dependencies;
- perform Git operations.

## Required Proof

Record each item as `Proven`, `OperatorValidationPending`, or `NotProven`.

1. Sidebar shows Revisionary without its full local repository path.
2. Choose Project and clear-project actions remain functional.
3. Phase Map shows the embedded ChatGPT pane and Phase Map controls in one usable screen.
4. Empty Phase Map shows Prepare Handoff and no disposition control.
5. Prepared Phase Map exposes a copied instruction containing both approved planning inputs, handoff path, and exact output target.
6. Pending Phase Map is selected and can be dispositioned only in Phase Map.
7. Project Planning remains the sole Profile/Roadmap disposition authority.
8. Direct Architect Interview → Project Planning browser transition reaches attached-visible without an intermediate rail step.
9. Direct transitions involving Phase Map also reach attached-visible.
10. A delayed stale detach/hide completion cannot override a newer attachment in deterministic tests.
11. Leaving all browser-enabled workflow steps detaches the browser.
12. WC28 startup, project selection, sidebar, top-rail navigation, and stale-document clearing do not regress.
13. `npm run typecheck`, `npm run build`, and `npm test` pass in the approved lane.
14. Operator validates items 1, 3, 4, 8, and 9 in the running Electron application.

## Completion

Create the Implementer Report only after proof items 1–13 pass. Item 14 may remain `OperatorValidationPending` until the Operator performs the running-product check.

Ordinary corrections remain inside WC28-REPAIR01. Do not create WC28-REPAIR02 merely to move unfinished work.

No Git operation is authorized.
