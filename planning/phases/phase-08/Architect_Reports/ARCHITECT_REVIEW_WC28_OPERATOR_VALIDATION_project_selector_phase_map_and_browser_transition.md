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
    "title": "WC28 Operator Validation Review",
    "reviewResult": "RepairRequired",
    "repairWorkCardId": "WC28-REPAIR01"
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "Operator validation found three bounded application-shell defects: the project selector still exposes the full repository path; Phase Map is not an embedded-Architect workspace with a usable handoff path; and direct transitions between embedded-browser workflow steps can leave the browser detached at Starting browser.",
    "reviewedAt": "2026-07-30"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC28 Operator Validation

Disposition: `RepairRequired`  
Repair: `WC28-REPAIR01`  
Git mutation: none

## Accepted WC28 Work

The following WC28 changes remain accepted:

- project selection moved to the left sidebar;
- duplicate workflow navigation was removed from the sidebar;
- top-rail navigation uses the shared workflow-step transition path;
- startup and project selection resolve the evidence-derived current step;
- stale cross-step document selection is cleared;
- Phase Map source evidence includes both Project Profile and Project Roadmap;
- Project Planning retains Profile/Roadmap bundle disposition authority;
- typecheck, build, and 130 tests passed independently.

## Defect 1 — Project Selector Exposes Unnecessary Repository Path

The sidebar renders both `projectDisplayName(workspace)` and `workspace.workspaceRoot`. Operator validation confirms the full local repository path is unnecessary and visually wraps poorly.

Required correction:

- show the selected project name only;
- remove the full repository path from the persistent sidebar card;
- retain Choose Project and clear-project actions;
- do not replace the path with another verbose repository identifier.

## Defect 2 — Phase Map Is Not a Usable Architect Workspace

The renderer treats only Architect Interview and Project Planning as browser-enabled workflow steps. Phase Map therefore presents generic handoff/output controls without the embedded ChatGPT pane needed to execute the Architect handoff in the same workflow step.

Required correction:

- Phase Map must use the embedded-Architect dual-pane layout;
- Phase Map must retain visible handoff preparation and output controls;
- provide a clear Prepare Phase Map Handoff action and a Copy Phase Map Handoff action;
- the copied instruction must identify the current approved Project Profile and Project Roadmap, the generated handoff, and the exact Phase Map target;
- do not move Profile/Roadmap disposition into Phase Map;
- do not change the Phase Map canonical artifact format or add an MCP action in this repair.

## Defect 3 — Embedded Browser Fails During Browser-Enabled Step Transitions

Direct Architect Interview → Project Planning navigation reproduces:

```text
Starting browser...
Embedded browser attachment did not become visible (detached).
```

The browser loads only after navigating through a workflow step without the embedded browser. The attachment effect creates a new coordinator for the destination while cleanup from the prior coordinator performs an asynchronous detach. Coordinator generations restart locally, so an older detach can race with and hide the newer attachment.

Required correction:

- direct transitions between any browser-enabled workflow steps must transfer or reattach the browser without an intermediate non-browser step;
- attachment generations must be globally monotonic across coordinator instances, or the main-process attachment authority must otherwise reject stale detach/bounds/status operations;
- an old cleanup completion must not hide or mark detached a newer attachment;
- leaving all browser-enabled workflow steps must still detach and hide the browser;
- retry remains available for genuine attachment failure.

## Disposition

WC28 remains accepted for its completed shell changes, but cannot close until WC28-REPAIR01 passes deterministic and Operator validation. No unrelated WC28 behavior is reopened.
