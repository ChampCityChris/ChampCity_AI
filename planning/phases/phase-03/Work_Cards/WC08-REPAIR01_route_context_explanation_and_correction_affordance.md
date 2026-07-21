<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC08-REPAIR01_route_context_explanation_and_correction_affordance",
  "artifactType": "work_card",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC08-REPAIR01_route_context_explanation_and_correction_affordance.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC08-REPAIR01_route_context_explanation_and_correction_affordance.md",
  "payload": {
    "kind": "work_card",
    "title": "Repair Work Card: WC08-REPAIR01 — Route Context Explanation and Correction Affordance"
  },
  "payloadHash": "sha256:3ac818fb3169193c410c4b03f703e34da16b260b68ca96824289d46c09b29868",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR01",
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR04",
      "champcity-ai/phase-03/operator_validation/WC08-REPAIR01",
      "champcity-ai/phase-03/work_card/WC08-REPAIR03",
      "champcity-ai/phase-03/work_card/WC08-REPAIR04"
    ],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Repair Work Card: WC08-REPAIR01 — Route Context Explanation and Correction Affordance

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Parent Work Card: WC08 — Current Step Context Inspector
Repair ID: WC08-REPAIR01
Created: 2026-07-14

## Repair Trigger

WC08 received a partial Operator validation decision. The Route Context tab satisfied the layout and non-duplication requirements, but failed the core human-readability requirement: it does not clearly explain to a non-technical Operator why the application selected the current action.

Primary validation source:

- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08_current_step_context_inspector.md`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08_current_step_context_inspector.json`

Supporting evidence:

- `planning/phases/phase-03/Validation_Evidence/WC08_current_step_context_inspector/`
- `planning/phases/phase-03/Work_Cards/WC08_current_step_context_inspector.md`
- `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08_current_step_context_inspector.md`
- `planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC08_current_step_context_inspector.md`

## Operator Validation Result

The operator validation contains a mixed raw result but a controlling partial decision:

- Validation Result: `Pass`
- Failed item: `5. It explains why the current action was selected.`
- Operator Decision: `Partial - repair or follow-up needed`

The Operator's failure statement is controlling for repair routing.

## Observed Failure

The Operator stated:

> There is a whole lot of information here but it is completely unclear what it is communicating.

The Operator also observed:

> Information contained in Route Context is vast but does not clearly communicate to a non-technical user why the application has determined the progress. It also doesn't provide any ability to tell the application that it is incorrect. Navigation tabs now have a random flow of order they were created as opposed to a logical flow of how they would be used. Route Context may be better positioned as a tab in the Left Context menu as it directly relates to the Next Required Action information displayed there rather than the workspace. This doesn't mean it can use the workspace to display information when clicked but that the tab's placement itself doesn't make sense.

## Repair Diagnosis

The WC08 implementation likely exposed route evidence, categories, warnings, and capability context, but it failed to translate that information into a short Operator-facing explanation.

The defect is not missing data. The defect is information architecture and wording.

The current Route Context appears to answer:

- What categories exist?
- What records are available?
- What technical state does the router see?

But it does not clearly answer:

- Why is this the next required action?
- What evidence caused the app to route here instead of somewhere else?
- What must happen next?
- What would make the app move forward?
- What can the Operator do if the app is wrong?

## Repair Goal

Turn Route Context from a technical state dump into a plain-language route explanation.

The Operator should be able to read the first section and understand, without technical knowledge:

1. The app selected this step because X evidence exists.
2. The app has not moved beyond this step because Y evidence is missing or not passed yet.
3. The expected next record is Z.
4. If this route is wrong, the Operator has an explicit correction/review path.

## Critical Scope Constraint

Preserve everything that passed validation.

Do not reintroduce the WC07 clutter failure. Do not add another permanent pane, another artifact list, another source evidence browser, another warning stack, or another always-visible inspector.

This repair is about the content and placement of route explanation, not expanding the UI surface area.

## Required Repair

### 1. Add a plain-language route explanation summary

At the top of Route Context, add a concise section that directly explains the current route.

Suggested heading:

`Why this is the current action`

The section must use plain language and should be structured as a small decision chain, for example:

```text
The app selected WC08 Architect Review because:
1. WC08 Work Card exists.
2. WC08 Implementer Report exists.
3. No passing WC08 Operator Operator Validation exists yet.
Therefore the next required action is Architect review or Operator validation, depending on the current route evidence.
```

Adapt the actual language to the current action state. Do not hard-code WC08 strings. Use current-action state, evidence, missing records, validation state, repair state, and route status generically.

### 2. Separate explanation from diagnostic detail

The top of Route Context must not begin with a large technical category dump.

Required hierarchy:

1. Plain-language summary: `Why this is the current action`
2. `What happens next`
3. `What would change this route`
4. `If this looks wrong`
5. Detailed route diagnostics, collapsed or lower priority

The existing state categories can remain, but they must become secondary diagnostic details, not the primary explanation.

### 3. Add an Operator correction/review affordance

WC08 must give the Operator a clear way to respond when the app appears wrong.

This does not need to mutate durable state in WC08. It can be a read-only guidance affordance or non-mutating action.

Acceptable options:

- A visible `This route looks wrong` / `Review route decision` affordance that expands guidance.
- Guidance that says which evidence to inspect in Artifacts and which validation/report record would correct the route.
- A non-mutating handoff/copy block for reporting the routing concern to Architect.

Out of scope for WC08:

- Automatically changing the route.
- Writing correction records.
- Mutating durable workflow state.
- Implementing a full route override system.

The Operator must not feel trapped by the app's routing decision.

### 4. Reconsider tab placement/order without increasing clutter

The Operator observed that tab order feels like creation order rather than usage order.

Repair the tab order and labeling so the flow is logical for a human.

Recommended order:

1. `Complete current action`
2. `Artifacts`
3. `Why this step?` or `Route context`

Rationale:

- The user comes to the screen to complete the current action.
- Artifacts support completing the action.
- Route context explains why the app chose the action.

If the implementer chooses a different order, the report must justify why it better supports human use.

Do not move Route Context into the left panel as a permanent expanded pane. The left panel must stay compact. If a left-panel affordance is added, it must be a compact button or link that selects the Route Context tab in the center workspace.

### 5. Preserve passed WC08 behavior

The following passed items must remain true:

- Route Context is easy to find.
- Route Context does not consume permanent workspace area when not selected.
- Left panel remains compact.
- Inspector is not shown in supporting/reference screens.
- Raw paths, technical IDs, warning codes, and fallback paths remain secondary/collapsed.
- Stale/superseded/historical records are visibly non-controlling.
- Capability state does not falsely claim write/MCP availability.
- Artifacts remains the only artifact list/preview surface.
- Complete current action remains easy to reach.
- Reading the inspector does not mutate workflow state.
- WC04/WC05/WC06/WC07 behavior remains usable.
- WC09-WC15 behavior does not appear.

## Carried-Forward Observations Included

### PH03-WC08-OBS-001 — Route Context is too technical and does not explain progress

- Source: `VALIDATION_REPORT_WC08_current_step_context_inspector.md`
- Included because: This is the failed WC08 acceptance item.
- Acceptance impact: The repaired Route Context must start with a plain-language route explanation and next-action rationale.

### PH03-WC08-OBS-002 — Operator needs a way to say the route is wrong

- Source: `VALIDATION_REPORT_WC08_current_step_context_inspector.md`
- Included because: The Operator specifically noted there is no ability to tell the app that its route determination is incorrect.
- Acceptance impact: The repair must provide a visible correction/review affordance, even if it is non-mutating guidance in this Work Card.

### PH03-WC08-OBS-003 — Tab order does not match human workflow

- Source: `VALIDATION_REPORT_WC08_current_step_context_inspector.md`
- Included because: The Operator observed that tab order feels based on creation history rather than use sequence.
- Acceptance impact: The repair must reorder or relabel tabs into a logical human workflow without adding clutter.

## Out of Scope

- Do not implement WC09-WC15.
- Do not redesign the top workflow rail or Supporting Tools menu.
- Do not add another permanent panel.
- Do not move detailed diagnostics into the persistent left panel.
- Do not create a second artifact browser.
- Do not add a route override mutation system.
- Do not write validation records or correction records from this repair.
- Do not merge to `dev`.
- Do not push to `master`.
- Do not perform Operator validation.

## Acceptance Criteria

- Route Context starts with a plain-language `Why this is the current action` explanation.
- The explanation directly states what evidence caused the current action and what missing/pending evidence prevents the next route.
- `What happens next` is visible in plain language.
- `What would change this route` is visible in plain language.
- There is a visible `This route looks wrong` or equivalent correction/review affordance.
- The correction/review affordance does not mutate durable workflow state.
- Detailed categories, paths, warning codes, and capability diagnostics are secondary to the plain-language explanation.
- The tab order or labels follow a human workflow, not implementation chronology.
- `Complete current action` remains easy to reach.
- `Artifacts` remains the only artifact list/preview surface.
- Left panel remains compact.
- Supporting/reference screens do not show the full Route Context inspector.
- No WC07 clutter regression is introduced.
- WC04/WC05/WC06/WC07 behavior remains usable.
- WC09-WC15 behavior does not appear.
- WC08-REPAIR01 Implementer Report exists.

## Validation Expectations

- Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before validation.
- Run the approved normal Windows validation lane.
- Run TypeScript/type validation and build validation.
- Run WC08 focused fixture validation if maintained or updated.
- Run WC07 artifact workspace fixture validation if affected.
- Run current-action-only fixture validation if affected.
- Run WC04/WC05/WC06 preservation fixtures if affected.
- Run local safety scans before staging.
- Do not perform Operator validation.

## Required Implementer Report

Create:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08-REPAIR01_route_context_explanation_and_correction_affordance.md`

The report must include:

- repair branch name;
- implementation summary;
- files changed;
- how route explanation was made plain-language;
- how diagnostic detail was made secondary;
- how the correction/review affordance works without mutating state;
- how tab order/labels were corrected;
- how WC07 anti-clutter constraints were preserved;
- how supporting/reference mode suppression was preserved;
- how WC04/WC05/WC06/WC07 behavior was preserved;
- confirmation WC09-WC15 were not implemented;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action.

## Implementer Handoff Prompt

You are acting as Implementer for ChampCity A/I.

Repair Work Card:
WC08-REPAIR01 — Route Context Explanation and Correction Affordance

Base branch:
feature/phase-03-wc08-current-step-context-inspector

Target repair branch:
feature/phase-03-wc08-repair01-route-context-explanation

Expected remote:
ChampCityChris/ChampCity_AI

Use this Repair Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC08-REPAIR01_route_context_explanation_and_correction_affordance.md

Implement only WC08-REPAIR01.

Do not implement WC09-WC15.
Do not merge to dev.
Do not push to master.
Do not perform Operator validation.

Primary objective:
Repair the WC08 Route Context so it clearly explains, in plain language, why the app selected the current action. Preserve the passed layout behavior. Do not add another pane, another artifact list, or another technical state dump.

Before editing:
1. Confirm current repo and remote.
2. Confirm the base branch is available:
   feature/phase-03-wc08-current-step-context-inspector
3. Create and switch to:
   feature/phase-03-wc08-repair01-route-context-explanation
4. Read AGENTS.md.
5. Read docs/dev/VALIDATION_COMMAND_LANES.md.
6. Read this WC08-REPAIR01 Work Card.
7. Read the WC08 operator validation and evidence.
8. Read WC08 Work Card, Implementer Report, and Architect Review.
9. Inspect WorkflowRouterShell and currentStepContextInspector.

Required repair:
- Add a clear plain-language `Why this is the current action` summary.
- Add visible `What happens next` and `What would change this route` explanations.
- Add a non-mutating `This route looks wrong` / correction-review affordance.
- Make detailed route categories and technical diagnostics secondary.
- Reorder or relabel tabs into a logical human workflow.
- Preserve the left-panel compactness, support-mode suppression, artifact-review ownership, and read-only behavior.

Final response must include:
- pushed repair branch;
- commit hash;
- validation results;
- skipped checks;
- remaining dirty/untracked files;
- confirmation that dev and master were not touched.

## Document Disposition
Document.Status=Pending
