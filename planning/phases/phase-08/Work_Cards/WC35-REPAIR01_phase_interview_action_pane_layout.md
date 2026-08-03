<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC35-REPAIR01"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC35_phase_interview_workspace_and_draft_ingestion_cutover.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Phase Interview Action Pane Layout Repair",
    "status": "approved_for_implementation",
    "executionMode": "one bounded renderer presentation repair",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC35-REPAIR01_phase_interview_action_pane_layout.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Repair only the malformed Phase Interview top action pane. Preserve all validated WC35 workflow, polling, persistence, and review behavior.",
    "reviewedAt": "2026-07-31"
  }
}
CHAMPCITY-METADATA -->

# WC35-REPAIR01 — Phase Interview Action Pane Layout Repair

Status: Approved for Implementer execution  
Git mutation: prohibited

## Observed Defect

Operator visual validation confirmed that WC35 functional behavior passes, but the Phase Interview top pane is malformed. The current action bar places lifecycle, required action, browser state, selected phase, evidence, a three-column facts list, and four action buttons into one ten-column horizontal grid. Long phase purpose and repository-relative source paths collapse into narrow vertical text columns and overlapping labels.

## Verified Cause

`PhaseInterviewActionBar` renders all information and actions as direct children of one `.phase-interview-action-bar` grid. CSS defines ten columns, while `.phase-interview-phase-facts` adds another three-column grid inside one constrained column. This layout cannot remain readable at the normal application width.

## Objective

Replace only the Phase Interview top-pane layout with a stable two-tier presentation:

```text
context row
→ lifecycle
→ required action
→ embedded ChatGPT state
→ selected phase summary

evidence and action row
→ dependencies / source references / closeouts in readable wrapping blocks
→ Prepare / Copy / Refresh / Reload controls grouped together
```

## Required Changes

1. Refactor only the Phase Interview action-bar markup and styles.
2. Keep the same displayed values, button labels, enablement rules, handlers, polling errors, and feedback.
3. Use grouped containers so long phase purpose, source-reference paths, and closeout paths wrap horizontally within practical widths.
4. Dependencies, source references, and closeouts must each have a clear label and readable value area.
5. Action buttons must remain visible, aligned, and usable without compressing evidence text.
6. The pane must remain stable at the normal desktop width shown during Operator validation and degrade cleanly at narrower widths.
7. Do not truncate repository paths unless the complete value remains available through wrapping or an existing native title mechanism.

## Authorized Surface

```text
src/renderer/app/App.tsx
src/renderer/styles.css
one adjacent Phase Interview presentation component only if extraction materially improves clarity
focused rendered-layout tests
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC35-REPAIR01_phase_interview_action_pane_layout.md
```

Do not alter Phase Interview services, WC30 draft handling, polling, handoff content, review behavior, workspace contracts, current workflow resolution, dashboard behavior, or any other workspace.

## Required Proof

1. Production Phase Interview action pane no longer uses the ten-column compressed layout.
2. Lifecycle, required action, browser state, selected phase, evidence facts, and all four primary controls remain present.
3. Long selected-phase purpose and repository-relative paths render in readable wrapped blocks without overlap.
4. Dependencies, source references, and closeouts remain distinguishable.
5. Prepare, Copy, Refresh, and Reload retain their existing enablement and handlers.
6. Polling errors and action feedback remain visible.
7. Rendered tests exercise representative long phase titles, purpose text, and source-reference paths through the production component; source-string assertions alone are insufficient.
8. Existing WC35 and WC36 behavior remains unchanged.
9. Typecheck, build, and complete tests pass in the normal Windows lane.
10. Operator running-product validation remains pending.

## Non-Scope

Do not redesign the full application header, global rails, execution-context dashboard, Phase Interview workflow, embedded browser, document preview, or disposition controls. Do not add new persistence, dependencies, or Git operations.

## Completion

Create the Implementer Report only after proof items 1–9 pass. Do not claim Operator running-product validation.
