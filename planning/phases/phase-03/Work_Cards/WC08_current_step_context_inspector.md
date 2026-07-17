<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC08_current_step_context_inspector",
  "artifactType": "work_card",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC08_current_step_context_inspector.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC08_current_step_context_inspector.md",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: WC08 — Current Step Context Inspector"
  },
  "payloadHash": "sha256:927efb284bf254ef16d4772aadf806e00081c290e35afdf79bccc03fc0e81563",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC08",
      "champcity-ai/phase-03/implementer_report/WC08",
      "champcity-ai/phase-03/operator_validation/WC08",
      "champcity-ai/phase-03/repair_record/WC08",
      "champcity-ai/phase-03/work_card/WC08-REPAIR03",
      "champcity-ai/phase-03/work_card/WC08-REPAIR06"
    ],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Work Card: WC08 — Current Step Context Inspector

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Work Card ID: WC08
Created: 2026-07-14

## Purpose

Let the Operator inspect why the app selected the current required action without adding another permanent, duplicative workspace surface.

The current-action router now identifies the next required action, WC07/WC07-REPAIR01 gives the center workspace a readable artifact-review surface, and the left panel has been reduced to compact current-action orientation. WC08 must add explainability for the routed step: project state, phase state, evidence state, stale/superseded records, missing records, route reason, warning details, and read/write availability.

The inspector must support human understanding of the current route. It must not become another artifact browser, another process rail, another source-evidence stack, or another always-visible pane competing with the current action workspace.

## Source Authority

Primary planning authority:

- `planning/phases/phase-03/Work_Card_Plan.md`
- `planning/phases/phase-03/Work_Cards/WC08_current_step_context_inspector.md`
- `planning/phases/phase-03/Work_Cards/WC08_current_step_context_inspector.json`

Required observation-register authority reviewed before creation:

- `planning/project/Project_Observation_Register.md`
- `planning/project/Project_Observation_Register.json`
- `planning/phases/phase-03/Observation_Register.md`
- `planning/phases/phase-03/Observation_Register.json`

Implementation context that must be read before editing:

- `AGENTS.md`
- `docs/dev/VALIDATION_COMMAND_LANES.md`
- WC07 Work Card, Implementer Report, Architect Review, failed operator validation, WC07-REPAIR01 Work Card, Implementer Report, Architect Review, and passing operator validation
- WC04, WC05, and WC06 Architect Reviews and validation records as needed to preserve behavior

## Candidate Source

From `planning/phases/phase-03/Work_Card_Plan.md`:

- Candidate: WC08 — Current Step Context Inspector
- Order: 8
- Dependencies: WC02, WC03, WC07
- Purpose: Let the Operator see the durable-state evidence behind the routed current action.
- Summary: Map a context inspector that shows current project/phase state, relevant artifact paths, missing records, stale/superseded artifacts, MCP/write availability, and why the current step is available or blocked.

## Human Problem

The Operator needs to understand why ChampCity A/I believes the current action is correct. A route can be confusing or wrong if the underlying durable evidence is stale, missing, superseded, or partially blocked.

However, the UI has already had serious readability failures from duplicated context surfaces. WC08 must not reintroduce the same problem by adding another right drawer, inspector rail, evidence stack, or permanent diagnostic panel.

The Operator should be able to answer these questions quickly:

1. Why is this the current required action?
2. Which project, phase, and Work Card state caused this route?
3. Which source artifacts were used as evidence?
4. Which required records are missing?
5. Are any source artifacts stale, superseded, malformed, or warning-worthy?
6. Are app read/write capabilities available or degraded?
7. What should I inspect if the route looks wrong?

## Required Design Model

WC08 must implement a context inspector under a strict ownership model.

### Left panel ownership

The left panel remains a compact current-action summary. It must not regain:

- source-evidence card stacks;
- missing-evidence card stacks;
- route-outcome cards;
- warning stacks;
- long raw path lists;
- technical diagnostic dumps.

The left panel may include a compact affordance such as `Route context`, `Why this action?`, or `View diagnostics`, but the detailed inspector must not live as a long permanent left-panel scroll.

### Center workspace ownership

The center workspace owns current work and artifact review. The context inspector may be implemented as a clearly labeled, collapsible, tabbed, or modal-like view inside the center workspace, but it must not compete with the artifact review workspace or the current-action form.

Acceptable approaches:

- add a third center tab beside `Artifacts` and `Complete current action`, such as `Route context`;
- add a collapsible `Why this action?` section above or within the current-action workspace;
- add a lightweight inspector drawer that is closed by default and does not reduce the main workspace unless opened.

Unacceptable approaches:

- add another always-visible right-side panel;
- reintroduce a long source-evidence browser in the left panel;
- duplicate the artifact list already owned by WC07;
- duplicate the top workflow rail or Supporting Tools menu;
- show the same current-action summary in multiple locations;
- make the validation/current-action form harder to reach.

### Supporting screen mode

When the Operator is viewing a supporting/reference screen, do not show the full current-step context inspector as if it were part of that support screen.

Support mode may show a compact banner such as:

`Viewing supporting screen. Current action remains WCxx. Route context is available after returning to current action.`

The full inspector belongs to the routed current-action workspace, not every reference/recovery screen.

## Carried-Forward Observations Included

### PROJ-OBS-004 / PH03-OBS-007 — Top workflow/action bars and Supporting Tools are duplicative and consume workspace real estate

- Source: `planning/project/Project_Observation_Register.md`; `planning/phases/phase-03/Observation_Register.md`
- Included because: WC08 risks adding another context surface. The repair must avoid worsening top-level navigation clutter and should reduce context duplication where WC08 touches the UI.
- Acceptance impact: WC08 must not add another permanent pane or duplicate existing action-bar/supporting-tools information. Any context inspector must be collapsible, tabbed, or otherwise subordinate to the current workspace.
- Scope boundary: WC08 does not need to fully redesign the global workflow rail or Supporting Tools menu unless the Implementer can do so narrowly without destabilizing WC05/WC06. The required WC08 action is to avoid adding clutter and to make route context accessible without consuming persistent workspace real estate.

## Open Observations Reviewed But Not Included

### PROJ-OBS-001 / PH03-OBS-001 — Validation checklist should become editable / structured

Disposition for WC08: Not in scope. This belongs to WC12 or later validation-record workflow work.

### PROJ-OBS-002 / PH03-OBS-002 — Screenshot paste and evidence UI needs cleanup

Disposition for WC08: Not in scope. This belongs to WC12 or later validation evidence UX work.

### PROJ-OBS-003 / PH03-OBS-005 — Multi-project / workspace support does not exist

Disposition for WC08: Not in scope. This belongs to a future project/workspace management phase.

## Required Functional Behavior

### 1. Route explanation

Provide a human-readable explanation of the current route derived from the current required action model:

- current action ID;
- current action title;
- responsible role;
- workflow step;
- status;
- phase ID/title;
- Work Card ID/title, where present;
- reason field;
- success/failure/repair route, where present.

This explanation must avoid raw JSON presentation. Use readable labels and short explanations first. Technical detail can be collapsed.

### 2. Durable state evidence summary

Show the state categories that caused the route:

- project-level state;
- phase-level state;
- Work Card state;
- Implementer Report state;
- Architect Review state;
- Operator Validation state;
- Repair state, where present;
- closeout/project_roadmap/next-phase state, where present.

Do not duplicate WC07 artifact preview. The inspector may summarize evidence and link/select artifacts already represented by WC07, but WC07 remains the artifact review owner.

### 3. Missing record explanation

Show missing records in a readable diagnostic form:

- missing artifact type;
- expected path, collapsed or secondary;
- why it is required;
- whether it blocks, warns, or is informational.

### 4. Stale, superseded, malformed, and warning evidence

Surface warning records from the current-action model in plain language first, with technical detail collapsed.

The inspector must help the Operator distinguish:

- blocking warnings;
- non-blocking stale/superseded records;
- malformed or unreadable supporting artifacts;
- historical evidence that does not control current workflow state.

### 5. Read/write and app capability context

Expose available capability status without creating false certainty:

- current-action IPC state;
- whether planning artifact preview is available;
- whether direct app write/read status is known, degraded, or unavailable if the app already exposes that data;
- MCP/direct-write fallback notes if existing state exposes them.

Do not invent external connectivity or MCP state if it is not available to the application. If the data is not available, show `Not reported by current app state` rather than guessing.

### 6. Support current route debugging without mutation

The inspector is read-only. It must not:

- save artifacts;
- approve Work Cards;
- validate Work Cards;
- create repair cards;
- change durable workflow state;
- advance the current route;
- directly edit planning files.

### 7. Preserve artifact-review and current-action form usability

The inspector must not make the WC07 repaired workspace worse. The `Artifacts` and `Complete current action` areas must remain visible, understandable, and easy to reach.

## Required UI Behavior

- Inspector is not always-open by default unless it is compact enough not to reduce workspace usability.
- If implemented as a tab, it must be clearly named `Route context`, `Why this action?`, or similar.
- If implemented as a collapsible section, it must default to a compact summary and expand only on demand.
- If implemented as a drawer, it must be closed by default or easily dismissible and must not permanently shrink the artifact preview/current action form.
- It must use readable section headings and avoid dense raw JSON.
- Raw paths and technical details must be secondary/collapsed.
- It must not reintroduce the pre-WC07 long left-side evidence stack.

## Acceptance Criteria

- A current-action context inspector is available from the routed current-action workspace.
- The inspector explains why the current action was selected using human-readable labels.
- The inspector shows project, phase, Work Card, report, review, validation, and repair state categories when available.
- Missing records are explained with type, reason, and secondary/collapsed path detail.
- Warnings are grouped by severity and use plain-language wording before technical detail.
- Stale/superseded/historical records are not presented as controlling workflow authority.
- Read/write or app capability state is shown only when available; otherwise the UI says it is not reported.
- The inspector is read-only and does not mutate workflow state.
- The inspector does not add another always-visible pane competing with the workspace.
- The left panel remains compact and does not regain artifact/source/missing/warning stacks.
- Supporting/reference screens do not render the full context inspector as if it were their own content.
- WC07 artifact review remains the owner of artifact browsing/preview.
- `Artifacts` and `Complete current action` remain easy to reach.
- WC04, WC05, WC06, and WC07-REPAIR01 behavior remains preserved.
- WC09-WC15 behavior is not implemented.
- `IMPLEMENTER_REPORT_WC08_current_step_context_inspector.md` is created.

## Validation Expectations

The Implementer must:

- read `AGENTS.md`;
- read `docs/dev/VALIDATION_COMMAND_LANES.md`;
- run the approved normal Windows validation lane;
- run type/build validation;
- run current-action-only fixture validation if affected;
- run WC04/WC05/WC06/WC07 focused fixtures if affected;
- add or update a focused WC08 fixture that verifies layout ownership, read-only behavior, warning/missing record presentation, and non-duplication of WC07 artifact review;
- run local safety scans before staging.

Do not perform Operator validation.

## Files Expected To Change

Likely files, subject to actual implementation needs:

- `src/renderer/app/WorkflowRouterShell.tsx`
- `src/shared/workCards/currentRequiredAction.ts`, only if additional typed route-context fields are needed from existing state
- `src/shared/workCards/artifactReviewWorkspace.ts`, only if integration with existing artifact rows is needed without duplicating artifact browsing
- `scripts/verify-wc08-current-step-context-inspector.mjs`
- existing WC04/WC05/WC06/WC07 focused fixture scripts if live-state expectations must be aligned
- `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08_current_step_context_inspector.md`

Do not add dependencies unless separately justified and explicitly approved in the Implementer Report.

## Out Of Scope

- Do not implement WC09-WC15.
- Do not redesign the full app shell.
- Do not fully redesign or remove the WC06 workflow guide.
- Do not fully redesign Supporting Tools unless a narrow, non-breaking cleanup is required to prevent WC08 duplication.
- Do not implement validation checklist authoring improvements.
- Do not implement screenshot paste/evidence cleanup.
- Do not implement multi-project/workspace management.
- Do not add unrestricted renderer filesystem access.
- Do not add provider SDKs, database, cloud services, authentication, MCP integration, connector behavior, deployment, release, or packaging changes.
- Do not create Operator validation records.
- Do not merge to `dev`.
- Do not push to `master`.

## Required Implementer Report

Create:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08_current_step_context_inspector.md`

The report must include:

- branch name;
- implementation summary;
- files changed;
- how the inspector explains route selection;
- how missing records, warnings, stale/superseded records, and capability state are displayed;
- how the inspector avoids duplicating WC07 artifact review;
- how PROJ-OBS-004 / PH03-OBS-007 was handled or constrained;
- how the left panel remains compact;
- how supporting-screen mode avoids full inspector rendering;
- how read-only behavior is preserved;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- confirmation WC09-WC15 were not implemented;
- remaining dirty/untracked files;
- final recommended next action.

## Implementer Handoff Prompt

You are acting as Implementer for ChampCity A/I.

Work Card:
WC08 — Current Step Context Inspector

Base branch:
dev

Target branch:
feature/phase-03-wc08-current-step-context-inspector

Expected remote:
ChampCityChris/ChampCity_AI

Use this Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC08_current_step_context_inspector.md

Implement only WC08.

Do not implement WC09-WC15.
Do not merge to dev.
Do not push to master.
Do not perform Operator validation.

Primary objective:
Add a readable, read-only current-step context inspector that explains why the current action was selected. The inspector must show route reason, state categories, missing records, warnings, stale/superseded evidence, and available app capability context without adding another always-visible pane or duplicating WC07 artifact review.

Before editing:
1. Confirm current repo and remote.
2. Confirm dev is clean and up to date.
3. Create and switch to feature/phase-03-wc08-current-step-context-inspector.
4. Read AGENTS.md.
5. Read docs/dev/VALIDATION_COMMAND_LANES.md.
6. Read this WC08 Work Card.
7. Read planning/project/Project_Observation_Register.md and planning/phases/phase-03/Observation_Register.md.
8. Read WC07 and WC07-REPAIR01 reports/validation records to understand the recent UI readability failure.
9. Inspect WorkflowRouterShell, current-action routing, artifactReviewWorkspace, support navigation, and workflow visibility.

Required implementation:
- Add a current-step context inspector in the routed current-action workspace.
- Keep the left panel compact; do not restore source/missing/warning stacks there.
- Do not add another always-visible right panel.
- Do not duplicate the WC07 artifact list or preview.
- Explain route selection, source state categories, missing records, warnings, stale/superseded records, and available capability state.
- Make raw paths and technical detail secondary/collapsed.
- Keep inspector read-only.
- Suppress the full inspector in supporting/reference screen mode.
- Preserve WC04/WC05/WC06/WC07 behavior.

Final response must include:
- pushed branch;
- commit hash;
- validation results;
- skipped checks;
- remaining dirty/untracked files;
- confirmation that dev and master were not touched.
