<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC28-REPAIR01",
    "repairId": "WC28-REPAIR01"
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
    "title": "Architect Review — WC28-REPAIR01 Project Selector, Phase Map Embedded Architect, and Browser Transition",
    "reviewResult": "RevisionRequested",
    "continueWithinRepairId": "WC28-REPAIR01",
    "additionalRepairAuthorized": false
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "Project selector and browser transition corrections are accepted. Phase Map dual-pane conversion removed the only rendered Phase Map disposition path and did not replace it with Phase Map-specific review controls. Correct within WC28-REPAIR01 and rerun validation.",
    "reviewedAt": "2026-07-30"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC28-REPAIR01

Disposition: `RevisionRequested` within `WC28-REPAIR01`  
Additional repair card: prohibited  
Git mutation: none

## Accepted Corrections

The following implementation is accepted:

- the sidebar no longer displays the full local repository path;
- `Choose Project` and `Clear Project` remain available;
- Phase Map now uses the embedded ChatGPT dual-pane foundation;
- Phase Map exposes specific Prepare and Copy Handoff controls;
- the copied Phase Map instruction identifies the Approved Profile, Approved Roadmap, generated handoff, and exact output target;
- the existing local Phase Map Markdown save path remains available;
- browser attachment authority is globally monotonic across coordinator instances;
- main-process attachment generation checks reject stale bounds and hide operations;
- retry is limited to current attachment failure/error state.

Independent validation passed:

```text
npm run typecheck → passed
npm run build     → passed
npm test          → 133/133 passed
```

## Blocking Defect — Pending Phase Map Cannot Be Dispositioned

The repair card requires:

```text
Pending Phase Map is selected and can be dispositioned only in Phase Map.
```

The renderer does not currently provide that behavior.

Phase Map was added to `isArchitectEnabledWorkspace()`. That suppresses `CurrentActionPanel`, which previously contained the Phase Map disposition selector and `Apply Current Disposition` action.

The new `PhaseMapActionBar` provides:

```text
Prepare Phase Map Handoff
Copy Phase Map Handoff
Refresh Phase Map
Reload ChatGPT
Retry Embedded Browser
```

It does not provide a disposition selector or an apply-review action.

The document-preview footer also does not provide Phase Map disposition. Because `project-phase-map` remains in `specializedDispositionWorkspaceIds`, the renderer shows only:

```text
Specialized review controls appear when the current outputs exist.
```

No specialized Phase Map review controls actually exist.

Therefore the implemented flow is:

```text
Prepare handoff
→ copy handoff
→ paste returned Phase Map Markdown
→ save Pending Phase Map
→ Pending Phase Map is selected
→ no available control to Approve, Reject, or Request Revision
```

## Test Defect

The test named `Phase Map actions do not offer disposition before a Phase Map output is selected` only searches the source for the old `CurrentActionPanel` gating variables. It does not prove that the panel is rendered in Phase Map, and it does not prove that disposition becomes available after a Pending Phase Map exists.

That test currently passes while the required product behavior is absent.

## Required Correction

Within `WC28-REPAIR01`:

1. Add Phase Map-specific review controls to the rendered Phase Map dual-pane surface.
2. Before a readable current Phase Map output exists, show no disposition selector or apply action.
3. After a readable current Phase Map output exists and is selected, expose `Approve`, `Reject`, and `Request Revision` through Phase Map authority.
4. Apply disposition only to the selected/current Phase Map artifact. Do not expose Profile/Roadmap disposition in Phase Map.
5. Replace the source-presence test with a deterministic rendering/decision helper test that proves both states:
   - no output → disposition unavailable;
   - Pending Phase Map → disposition available.
6. Rerun typecheck, build, and the full test suite.
7. Revise the Implementer Report proof matrix. Proof item 6 is currently `NotProven`, not `Proven`.

## Remaining Operator Validation

After the correction, Operator validation remains required for:

- project selector appearance;
- Phase Map dual-pane usability;
- empty Phase Map Prepare state;
- direct Architect Interview ↔ Project Planning transitions;
- direct transitions involving Phase Map.
