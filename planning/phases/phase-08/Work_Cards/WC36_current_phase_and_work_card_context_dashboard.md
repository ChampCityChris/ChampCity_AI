<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC36"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC35_phase_interview_workspace_and_draft_ingestion_cutover.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Current Phase and Work Card Context Dashboard",
    "status": "approved_for_implementation",
    "executionMode": "one bounded renderer and projection pass",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC36_current_phase_and_work_card_context_dashboard.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Add one repository-derived execution-context dashboard to the left column without changing lifecycle authority, persistence, or workflow progression.",
    "reviewedAt": "2026-07-31"
  }
}
CHAMPCITY-METADATA -->

# WC36 — Current Phase and Work Card Context Dashboard

Status: Approved for Implementer execution  
Git mutation: prohibited

## Verified Defect

The project and loop rails show broad lifecycle position but do not provide the Operator with the granular execution context needed during the phase and Work Card loops. The left column currently shows only the selected project.

## Objective

Add one persistent, repository-derived dashboard below the selected-project controls that answers:

```text
Which phase is active?
What is the phase trying to accomplish?
Where are we in the phase loop?
Which Work Card or repair is active?
Where are we in the Work Card loop?
```

The dashboard is a read-only projection. It must not become a second workflow resolver or store progress state.

## Required Projection

Derive the dashboard from existing canonical evidence and the current workflow model.

### Current Phase

When a phase is selected, show:

- phase ID;
- phase title;
- phase order and total phase count;
- phase purpose;
- direct dependencies;
- current phase-loop step.

Before a Phase Map is Approved, show `No active phase` with the current project-level step.

### Current Work Card

When a Work Card is selected or active, show:

- Work Card ID;
- Work Card title;
- current Work Card-loop step;
- current disposition or execution state;
- active repair ID when the current work is a repair.

Before Work Card selection, show `No active Work Card` and the current phase-loop step.

### Progress Labels

Use the existing lifecycle vocabulary and current workflow authority. Do not invent completion percentages. Display discrete stages only:

```text
Phase Intake
Phase Planning
Work Cards
Phase Validation
Phase Close

Work Card Intake
Planning
Build / Review
Validation
Close
Repair
```

## Required UI Behavior

- Place the dashboard in the existing left column below Selected Project.
- Keep it visible across project-level, phase-level, and Work Card-level workspaces.
- Use concise labels and allow long titles/purpose text to wrap.
- Highlight the active phase and Work Card identifiers.
- Show a clear empty state rather than stale information.
- Refresh automatically when repository evidence or the current workflow model changes.
- Preserve current project selection controls.

## Authority and Data Rules

- Current phase authority comes from the Approved Phase Map projection and closeout-derived first-incomplete phase.
- Phase title, order, purpose, and dependencies come from canonical Phase Map metadata.
- Current Work Card and repair authority come from the existing current-workflow resolver and canonical Work Card evidence.
- The dashboard must clear stale phase or Work Card values when authority changes.
- The renderer must not parse filenames as primary authority when canonical identity is available.
- No new persistence, cache file, local storage, database record, or manual selection state may be introduced.

## Authorized Surface

```text
src/main/currentWorkflow/currentWorkflowService.ts only to expose already-resolved display context
src/shared/workspaceContracts.ts only for a compact execution-context projection
src/renderer/app/App.tsx
one adjacent execution-context dashboard component/helper
src/renderer/styles.css
focused projection and rendered-dashboard tests
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC36_current_phase_and_work_card_context_dashboard.md
```

Do not change Phase Map selection, Work Card candidate selection, lifecycle transitions, disposition rules, handoff generation, persistence, MCP, preload authority, or workspace routing.

## Required Proof

1. Before Phase Map approval, the dashboard shows no active phase and no stale Work Card.
2. After Phase Map approval, the dashboard shows the first incomplete phase ID, title, order/total, purpose, dependencies, and active phase-loop step.
3. Before Work Card selection, it shows no active Work Card.
4. During Work Card Intake, Planning, Build/Review, Validation, and Close, it shows the correct Work Card ID, title, and loop step.
5. During a repair, it shows the parent Work Card and active repair ID without replacing parent authority.
6. Completing a Work Card advances or clears the Work Card context from repository evidence.
7. Closing a phase advances the phase context to the next incomplete phase.
8. Project switching clears prior-project context before loading the next project.
9. The dashboard is read-only and introduces no new persistence or workflow authority.
10. Existing rails, project selector, workspaces, and lifecycle behavior remain unchanged.
11. Tests render the production dashboard with representative project, phase, Work Card, repair, phase-transition, and project-switch states; source-string assertions alone are insufficient.
12. Typecheck, build, and complete tests pass in the normal Windows lane.
13. Operator running-product validation remains pending.

## Non-Scope

Do not redesign the top rails, add percentages, add editing controls, create a phase picker, create a Work Card picker, change workflow resolution, add navigation shortcuts, add dependencies, or perform Git operations.

## Completion

Create the Implementer Report only after proof items 1–12 pass. Do not claim Operator running-product validation.
