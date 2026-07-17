<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC07-REPAIR01_artifact_workspace_ui_simplification_and_preview_usability",
  "artifactType": "work_card",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC07-REPAIR01_artifact_workspace_ui_simplification_and_preview_usability.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC07-REPAIR01_artifact_workspace_ui_simplification_and_preview_usability.md",
  "payload": {
    "kind": "work_card",
    "title": "Repair Work Card: WC07-REPAIR01 — Artifact Workspace Layout Ownership and Preview Usability"
  },
  "payloadHash": "sha256:2bffd8f10b949e855cffaa926cde0da305a071016efdbfea737b4cd0f7314ca5",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC07-REPAIR01",
      "champcity-ai/phase-03/implementer_report/WC07-REPAIR01",
      "champcity-ai/phase-03/operator_validation/WC07-REPAIR01"
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

# Repair Work Card: WC07-REPAIR01 — Artifact Workspace Layout Ownership and Preview Usability

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Parent Work Card: WC07 — Artifact Review Workspace
Repair ID: WC07-REPAIR01
Created: 2026-07-14
Rewritten: 2026-07-14

## Repair Trigger

WC07 received a deferred Operator validation decision. The operator validation records that the Operator could not meaningfully validate WC07 because the artifact review workspace was visually confusing, duplicative, hard to operate, and did not make document access or preview behavior obvious.

Primary source:

- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC07_artifact_review_workspace.md`

Supporting sources:

- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC07_artifact_review_workspace.json`
- `planning/phases/phase-03/Validation_Evidence/WC07_artifact_review_workspace/image.png`
- `planning/phases/phase-03/Validation_Evidence/WC07_artifact_review_workspace/image_2.png`
- `planning/phases/phase-03/Validation_Evidence/WC07_artifact_review_workspace/image_3.png`
- `planning/phases/phase-03/Validation_Evidence/WC07_artifact_review_workspace/image_4.png`
- `planning/phases/phase-03/Validation_Evidence/WC07_artifact_review_workspace/image_5.png`
- `planning/phases/phase-03/Work_Cards/WC07_artifact_review_workspace.md`
- `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC07_artifact_review_workspace.md`
- `planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC07_artifact_review_workspace.md`
- `planning/phases/phase-03/Observation_Register.md`

## Failed Validation Summary

The Operator operator validation records:

- Validation Result: `Not Tested`
- Operator Decision: `Deferred - not validated yet`

The report lists these failed WC07 checks:

1. Current routed workspace shows useful artifact context above the route-specific screen.
2. Operator validation routes show Work Card, Implementer Report, Architect Review, and expected Operator Validation.
3. Architect review routes show Work Card, Implementer Report, and expected Architect Review output.
4. Artifact labels are readable and full paths do not dominate.
5. Planning Markdown preview works inline and stays read-only.
6. Expected output, source artifacts, and missing evidence are visually distinct.

The report and screenshots also show a broader UI defect: the implementation created multiple competing artifact/context surfaces. The left panel, center workspace, routed form, preview area, workflow rail, and supporting-screen mode all display overlapping context. The result is not merely cluttered. It prevents the Operator from understanding what screen owns the current task.

## Core Diagnosis

The failed WC07 implementation already has too many visible panes, repeated artifact summaries, duplicated current-action information, duplicated source evidence, and competing places that appear to show the same context.

The repair must **remove, consolidate, or suppress existing duplicate surfaces**. Do not add another pane beside the current clutter. Do not add another embedded window. Do not solve this by placing a cleaner component next to the existing confusing layout.

The defect is a layout-ownership failure:

- The persistent left panel is acting as both a current-action summary and an artifact browser.
- The center workspace is also acting as an artifact browser.
- The routed validation form is visually demoted by artifact scaffolding.
- Supporting/reference screens can show current-action artifact context even though the user is no longer viewing the routed current-action workspace.
- Artifact cards look important but are inconsistently clickable, previewable, or inert.
- Markdown preview technically exists but is not discoverable or visually central enough to validate.

## Repair Goal

Create a strict layout ownership model.

Human goal:

The Operator should be able to answer these questions in under five seconds:

1. What is my current required action?
2. Am I on the current-action workspace or only viewing supporting/reference material?
3. Where do I inspect artifacts?
4. Which artifact is selected?
5. Can this artifact be previewed, opened elsewhere in the app, or is it missing/non-previewable?
6. Where do I complete the current action form?

## Required Layout Ownership Model

### 1. Top workflow guide owns orientation only

The locked workflow guide and Work Card loop may show where the user is in the process. They must not become artifact browsers or a competing workspace.

The top workflow guide may remain visible, but it must not cause confusion about the current workspace. If existing layout constraints make it consume too much vertical space, it may be made more compact or collapsible, provided WC06 orientation behavior remains intact.

### 2. Left panel owns compact current-action summary only

The left panel must stop acting as an artifact browser when the center artifact workspace is active.

The left panel may show:

- Next required action.
- Responsible role.
- Workflow step.
- Phase.
- Work Card.
- Why this is next.
- Expected output summary.
- A compact count of source artifacts, missing artifacts, and warnings.
- A primary `Continue current action` / `Return to current action` affordance.

The left panel must not show these as long card stacks while the center artifact workspace is active:

- Source evidence cards.
- Missing evidence cards.
- Warning stacks.
- Route outcomes.
- Routed-screen launcher details.
- Repeated artifact lists already shown in the center workspace.
- Full raw path walls.

If those details remain available from the left panel, they must be collapsed behind a secondary details affordance and must not duplicate the center artifact workspace as another primary browsing surface.

### 3. Center workspace owns current work

The center workspace is the only primary work area.

When the user is on the routed current action, the center workspace must show:

- One artifact review surface.
- One current-action form or routed action surface.
- Clear labels explaining which area is artifact evidence and which area is the form/screen used to complete the action.

The center workspace must not duplicate current-action summary cards that are already visible in the left panel. It may show a short header for context, but it must not repeat the entire left-panel summary.

### 4. Center artifact review owns artifact browsing

Artifact browsing belongs only to the center workspace.

There must be one artifact list or artifact selector. Do not render artifact lists in multiple places. Do not show source evidence as cards in the left panel and again in the center. Do not display expected output in both the left panel and center as competing detailed panels.

Acceptable structure:

- Header: current action and route context.
- Artifact list grouped by role.
- Large preview/details pane.
- Current action form or a clearly labeled tab/section for it.

Unacceptable structure:

- Artifact lists in both left and center as primary UI.
- Expected output cards in multiple locations.
- Current-action summary repeated across left and center.
- Nested embedded windows.
- Tiny preview panes.
- Inert artifact cards that look clickable.
- Artifact context rendered inside unrelated support/reference screens.

### 5. Supporting screen mode owns reference/recovery only

When the Operator is viewing a supporting/reference screen, such as Project Intake, the app must suppress the full current-action artifact workspace.

Supporting screen mode must show:

- The selected supporting screen.
- A clear banner stating this is reference/support only.
- A clear statement that the durable current action has not changed.
- A prominent `Return to current action` button.

Supporting screen mode must not show:

- The full WC07 current-action artifact workspace.
- Current-action artifact lists.
- Current-action preview panes.
- Expected-output panels for the current action.
- Duplicate evidence context that belongs to the current-action workspace.

The artifact review workspace belongs to the routed current action, not every supporting/reference screen.

### 6. Current action form must remain usable

The current action form cannot be buried underneath a large artifact wall.

For Operator Validation, the validation form must be easy to reach and visually connected to the current action. Acceptable approaches:

- A clear tab structure such as `Artifacts` and `Validation Record`, with the active tab obvious.
- A split layout where artifact review and the validation form both remain readable.
- A stacked layout where the form appears before excessive evidence details and does not require hunting through duplicated context.

The Operator must always know where to complete the current action.

## Required Artifact Interaction Rules

Every artifact row or card must have exactly one visible state:

- `Preview` — safe Markdown preview is available.
- `Open support screen` — the app can open an existing screen that represents this artifact or context.
- `Not previewable` — the artifact exists but cannot currently be previewed.
- `Missing` — the artifact is expected but unavailable.

No inert artifact cards. If a card is not clickable, it must not look clickable. If a card has a button, the button must do something visible or show a clear error state.

Previewable Markdown artifacts must visibly load content in a large readable preview pane. Empty preview states must explain one of these conditions:

- No artifact selected.
- The selected artifact is not previewable.
- The selected artifact is missing.
- Preview failed, with plain-language reason.
- Preview is loading.

The preview must remain read-only and must not save, approve, validate, repair, or advance workflow state.

## Required Artifact Groups

The artifact list must clearly group artifacts by role when applicable:

- Expected Output.
- Work Card.
- Implementer Report.
- Architect Review.
- Operator Validation.
- Repair Artifacts.
- Source Evidence.
- Missing Evidence.
- Other Support.

Expected output, source artifacts, and missing evidence must be visually distinct.

Full repo-relative paths may remain available under secondary details, but they must not be the primary label or dominate the screen.

## Required Route Coverage

### Operator validation route

The Operator validation route must visibly expose:

- Work Card.
- Implementer Report.
- Architect Review.
- Expected Operator Validation.
- Relevant prior validation or evidence records where present.
- The validation form.

### Architect review route

The Architect review route must visibly expose:

- Work Card.
- Implementer Report.
- Expected Architect Review output.
- The current review form/screen if present.

### Repair validation route

The repair validation route must visibly expose:

- Parent Work Card.
- Failed parent validation.
- Repair Work Card.
- Repair Implementer Report.
- Expected repair validation output.
- Any referenced evidence files.

## Carried-Forward Observations Included

### PH03-OBS-003 — Source Evidence should not show full raw paths

- Source: `planning/phases/phase-03/Observation_Register.md`
- Included because: WC07 artifact review must use readable labels and functional preview/open affordances instead of raw path walls.
- Acceptance impact: Full paths may exist under details, but they must not be the primary UI label. Source evidence must not be duplicated as a long persistent left-panel card stack when the center artifact workspace is active.

### PH03-OBS-004 — Supporting screens are reachable but not populated

- Source: `planning/phases/phase-03/Observation_Register.md`
- Included because: WC07 must prevent blank artifact workspace states when current-action artifact context exists.
- Acceptance impact: Current-action artifact context must populate the routed current-action workspace. Supporting/reference screens must remain reference-only and must not render the full current-action artifact workspace.

### PH03-OBS-006 — Work Card Loop needs artifact access during validation

- Source: `planning/phases/phase-03/Observation_Register.md`
- Included because: WC07 must expose Work Card, Implementer Report, Architect Review, validation records, repair records, and expected output during validation/review routes.
- Acceptance impact: Operator validation must allow the Operator to inspect those artifacts without hunting through blank supporting screens or duplicate artifact surfaces.

## Out Of Scope

- Do not implement WC08-WC15.
- Do not build a full document management system.
- Do not add unrestricted renderer filesystem access.
- Do not add browser automation, Playwright, provider SDKs, database, cloud service, authentication, MCP, connector, deployment, or release features.
- Do not redesign the entire app shell outside the layout ownership changes required for WC07 repair.
- Do not replace the current-action router.
- Do not mutate durable workflow state through artifact preview or support navigation.
- Do not create Operator validation records.
- Do not close Phase 03.
- Do not merge to `dev`.
- Do not push to `master`.

## Acceptance Criteria

- The repaired UI is visibly simpler than the failed WC07 implementation.
- The left panel is reduced to compact current-action summary and no longer acts as the primary source-evidence browser while the center artifact workspace is active.
- The center workspace is the only primary artifact-review surface.
- There is one artifact list or selector, not multiple competing artifact lists.
- There is one expected-output presentation, not duplicate detailed expected-output cards in multiple places.
- Current-action summary is not redundantly repeated across left and center as competing card groups.
- Supporting screen mode suppresses the full current-action artifact workspace and clearly identifies itself as reference/support only.
- Artifact groups are visually clear and include expected output, source artifacts, missing evidence, Work Card, Implementer Report, Architect Review, validation, and repair artifacts where applicable.
- Artifact labels are readable and do not use full paths as the primary display.
- Full paths are available only as secondary details.
- Previewable Markdown artifacts visibly load in a large readable pane.
- Non-previewable artifacts clearly say they cannot be previewed.
- Missing artifacts clearly say they are missing.
- No artifact card appears clickable unless it has a working visible action.
- Operator validation routes visibly expose Work Card, Implementer Report, Architect Review, expected Operator Validation, and the validation form when present.
- Architect review routes visibly expose Work Card, Implementer Report, and expected Architect Review output when present.
- Repair validation routes visibly expose parent Work Card, failed validation, repair Work Card, repair Implementer Report, and expected repair validation output when present.
- Expected output, source artifacts, and missing evidence are visually distinct.
- Previewing artifacts remains read-only and does not save, approve, validate, repair, or advance workflow state.
- Process/action bar navigation remains support-only and does not become workflow authority.
- WC04 current-action panel remains available as a compact summary.
- WC05 support-navigation behavior remains intact.
- WC06 left-to-right workflow guide remains intact.
- WC08-WC15 behavior does not appear prematurely.
- WC07-REPAIR01 Implementer Report exists.

## Validation Expectations

- Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before validation.
- Run the approved normal Windows validation lane.
- Run TypeScript/type validation and build validation.
- Run WC07 artifact workspace focused fixture validation if maintained or updated.
- Add or update focused fixture coverage for the layout ownership rules where feasible, including suppression of current-action artifact workspace in supporting-screen mode and non-duplication of artifact lists.
- Run current-action-only fixture validation if affected.
- Run WC04/WC05/WC06 preservation fixtures if affected.
- Run local safety scans before staging.
- Do not perform Operator validation.

## Required Implementer Report

Create:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC07-REPAIR01_artifact_workspace_ui_simplification_and_preview_usability.md`

The report must include:

- repair branch name;
- implementation summary;
- files changed;
- how the UI was simplified compared with failed WC07;
- what duplicate panels or repeated information were removed, consolidated, or suppressed;
- how the left panel was reduced to compact current-action summary;
- how the center workspace became the single artifact-review owner;
- how supporting-screen mode suppresses the current-action artifact workspace;
- how artifact grouping is displayed;
- how readable labels replaced raw path-dominant display;
- how Markdown preview usability was fixed;
- how non-previewable and missing artifacts are explained;
- how inert artifact cards were avoided;
- how Operator validation, Architect review, and repair validation routes expose the required artifacts;
- how current-action router authority is preserved;
- how WC04/WC05/WC06 behavior was preserved;
- confirmation WC08-WC15 were not implemented;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action.

## Implementer Handoff Prompt

You are acting as Implementer for ChampCity A/I.

Repair Work Card:
WC07-REPAIR01 — Artifact Workspace Layout Ownership and Preview Usability

Base branch:
feature/phase-03-wc07-artifact-review-workspace

Target repair branch:
feature/phase-03-wc07-repair01-artifact-ui-simplification

Expected remote:
ChampCityChris/ChampCity_AI

Use this Repair Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC07-REPAIR01_artifact_workspace_ui_simplification_and_preview_usability.md

Implement only WC07-REPAIR01.

Do not implement WC08-WC15.
Do not merge to dev.
Do not push to master.
Do not perform Operator validation.

Primary objective:
Repair the WC07 artifact workspace by enforcing strict layout ownership. The failed implementation already has too many panes, duplicate artifact displays, duplicate current-action summaries, long left-panel evidence stacks, confusing support-screen mixing, and unclear artifact click/preview behavior. Do not add another pane to the existing clutter. Remove, consolidate, or suppress duplicate surfaces so the Operator has one clear artifact workspace.

Before editing:
1. Confirm current repo and remote.
2. Confirm the base branch is available:
   feature/phase-03-wc07-artifact-review-workspace
3. Create and switch to:
   feature/phase-03-wc07-repair01-artifact-ui-simplification
4. Read AGENTS.md.
5. Read docs/dev/VALIDATION_COMMAND_LANES.md.
6. Read this WC07-REPAIR01 Work Card.
7. Read the failed WC07 operator validation.
8. Review the WC07 validation evidence screenshots.
9. Read WC07 Work Card, Implementer Report, and Architect Review.
10. Read planning/phases/phase-03/Observation_Register.md.
11. Inspect WorkflowRouterShell, artifactReviewWorkspace model, preview IPC, current-action routing, support navigation, and Human Validation screen.

Required repair:
- Apply the layout ownership model.
- Left panel = compact current-action summary only.
- Center workspace = current work and artifact review owner.
- Supporting screen mode = reference/recovery only; no full current-action artifact workspace.
- One artifact list, not multiple competing artifact lists.
- One expected-output presentation, not duplicate detailed expected-output panels.
- Large readable Markdown preview for previewable Markdown.
- Explicit `Preview`, `Open support screen`, `Not previewable`, or `Missing` state for every artifact row/card.
- No inert artifact cards.
- Current action form remains easy to find and use.
- Preserve current-action router authority.
- Preserve WC04/WC05/WC06 behavior.

Final response must include:
- pushed repair branch;
- commit hash;
- validation results;
- skipped checks;
- remaining dirty/untracked files;
- confirmation that dev and master were not touched.
