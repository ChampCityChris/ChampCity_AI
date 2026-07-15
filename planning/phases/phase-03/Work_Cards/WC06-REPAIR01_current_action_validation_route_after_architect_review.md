<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC06-REPAIR01",
  "artifactType": "work_card",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC06-REPAIR01_current_action_validation_route_after_architect_review.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC06-REPAIR01_current_action_validation_route_after_architect_review.md",
  "parentArtifactId": "champcity-ai/phase-03/work_card/WC06",
  "payload": {
    "kind": "work_card",
    "title": "Repair Work Card: WC06-REPAIR01 — Current Action Validation Route After Architect Review"
  },
  "payloadHash": "sha256:2ffba47f4c2812d3b07d0377e0d82e803a6d7f64640c163597f3f7acb6111843",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC06-REPAIR01",
      "champcity-ai/phase-03/implementer_report/WC06-REPAIR01",
      "champcity-ai/phase-03/validation_report/WC06-REPAIR01"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-03/implementer_report/WC06-REPAIR01"
    ],
    "sources": [
      "champcity-ai/phase-03/validation_report/WC06",
      "champcity-ai/phase-03/work_card/WC06_left_to_right_workflow_visibility"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-14T00:00:00.000Z",
  "workCardId": "WC06-REPAIR01"
}
-->

# Repair Work Card: WC06-REPAIR01 — Current Action Validation Route After Architect Review

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Parent Work Card: WC06 — Left-to-Right Workflow Visibility
Repair ID: WC06-REPAIR01
Created: 2026-07-13

## Repair Trigger

WC06 failed Operator validation.

Primary validation source:

- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC06_left_to_right_workflow_visibility.md`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC06_left_to_right_workflow_visibility.json`

The Operator-provided screenshot shows that the app displays `WC06` but routes the current action to `Full Work Card creation required` and opens `Ad Hoc Work Card Capture`. This is wrong because WC06 already has a full Work Card, Implementer Report, and Architect Review.

## Problem

The workflow guide is visible, but the durable current-action route is wrong.

Instead of routing WC06 to Operator validation after the Architect Review, the app routes to:

- action: `full_work_card_creation_required`
- visible step: `Full Work Card creation required`
- center workspace: `Ad Hoc Work Card Capture`

This blocks Operator validation because the routed validation screen for WC06 is not reachable. It also asks the Operator to create a Work Card that already exists.

## Goal

Correct current-action routing after Architect Review so WC06 routes to Operator validation when the durable evidence shows:

1. a full WC06 Work Card exists;
2. a WC06 Implementer Report exists;
3. a WC06 Architect Review exists and says ready for Operator validation;
4. no passing WC06 Operator validation report exists yet.

The correct current action should route to WC06 Operator validation, not ad hoc Work Card creation.

## Human Objective

When the Architect has reviewed a Work Card implementation and marked it ready for Operator validation, the app should guide the Operator to validate it.

It should not send the Operator backward to create a Work Card that already exists.

## Branch And Review Rule

Base branch for this repair:

- `feature/phase-03-wc06-left-to-right-workflow-visibility`

Repair implementation branch:

- `feature/phase-03-wc06-repair01-validation-route`

The Implementer must create the repair branch from the current WC06 feature branch. Do not merge to `dev`. Do not push to `master`. Architect review happens after the repair branch and repair Implementer Report are pushed.

## Included Scope

### 1. Fix current-action evidence ordering for WC06

The current-action evaluator must not choose `full_work_card_creation_required` for WC06 when the full WC06 Work Card already exists.

Inspect the evidence checks that decide whether a mapped Work Card candidate has a matching full executable Work Card. Repair the matching logic if necessary.

The evaluator should recognize the existing WC06 Work Card artifacts:

- `planning/phases/phase-03/Work_Cards/WC06_left_to_right_workflow_visibility.md`
- `planning/phases/phase-03/Work_Cards/WC06_left_to_right_workflow_visibility.json`

### 2. Route Architect-reviewed WC06 to Operator validation

When the following evidence exists:

- full Work Card;
- Implementer Report;
- Architect Review marked ready for Operator validation;
- no passing Operator validation record;

then the current action must be:

- Work Card ID: `WC06`
- responsible role: `operator`
- status: `needs_validation`
- action meaning: Operator validation required
- routed/support screen: Human Validation

The exact action identifier may use existing system vocabulary, but it must route to Operator validation, not full Work Card creation.

### 3. Prevent ad hoc Work Card Capture from opening for existing numbered Work Cards

`Ad Hoc Work Card Capture` must not be the routed current-action workspace for a numbered Work Card that already has a full Work Card artifact.

Ad hoc capture may remain available as a supporting tool if it already exists, but it must not be the primary route for WC06 validation.

### 4. Preserve WC06 workflow visibility

Do not remove or rewrite the WC06 left-to-right workflow guide unless a narrow route label adjustment is required.

Preserve:

- locked left-to-right sequence;
- Capture / Frame / Plan / Build / Prove grouping labels as subordinate grouping aids;
- approval/revision loop;
- Work Card validation/repair loop;
- phase loop;
- support-only process-step clicks.

### 5. Preserve WC04 and WC05 repairs

Do not regress:

- WC04 current-action panel behavior;
- validation target/draft behavior from WC04 repairs;
- WC05 supporting tools / return-to-current-action behavior.

### 6. Add fixture coverage for this routing failure

Add or update focused fixture coverage for this exact scenario:

- WC06 Work Card exists;
- WC06 Implementer Report exists;
- WC06 Architect Review exists and is ready for Operator validation;
- WC06 validation report is absent or failed;
- current action must route to Operator validation for WC06;
- current action must not route to full Work Card creation;
- current action must not route to WC07.

The fixture should catch the defect shown in the Operator screenshot.

## Out Of Scope

- Do not implement WC07-WC15.
- Do not redesign the left-to-right workflow guide.
- Do not perform a full screen-by-screen UI rework.
- Do not create a passing Operator validation report.
- Do not close Phase 03.
- Do not merge to `dev`.
- Do not push to `master`.
- Do not add provider SDKs, cloud services, database, auth, browser automation, MCP passthrough, connectors, or deployment code.

## Acceptance Criteria

- Current action no longer routes WC06 to `Full Work Card creation required` when the WC06 Work Card exists.
- Current action routes WC06 to Operator validation after the WC06 Architect Review exists and before a passing WC06 validation report exists.
- The routed/support workspace for WC06 validation is Human Validation, not Ad Hoc Work Card Capture.
- The visible current-action panel and workflow guide agree on the WC06 validation state.
- WC06 does not advance to WC07 before WC06 validation passes.
- WC06 left-to-right workflow visibility remains intact.
- WC05 supporting-tools behavior remains intact.
- WC04 validation/repair behavior remains intact.
- Focused fixture coverage exists for the failed routing scenario.
- Automated validation passes or skipped checks are documented.
- WC06-REPAIR01 Implementer Report exists.

## Validation Expectations

- Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before validation.
- Run the approved normal Windows validation lane.
- Run TypeScript/type validation and build validation.
- Run current-action fixture validation.
- Run WC06 workflow-visibility fixture validation.
- Run WC05 support-navigation fixture validation if affected.
- Run WC04 repair fixtures if affected.
- Run local safety scans before staging.
- Do not perform Operator validation.

## Required Implementer Report

Create:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC06-REPAIR01_current_action_validation_route_after_architect_review.md`

The report must include:

- repair branch name;
- implementation summary;
- files changed;
- root cause of why WC06 routed to full Work Card creation;
- how existing WC06 Work Card matching was corrected;
- how Architect Review to Operator validation routing was corrected;
- confirmation Ad Hoc Work Card Capture is no longer the routed WC06 validation workspace;
- confirmation WC06 does not route to WC07 prematurely;
- confirmation WC06 workflow visibility was preserved;
- confirmation WC04/WC05 behaviors were preserved;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action.

## Implementer Handoff Prompt

You are acting as Implementer for ChampCity A/I.

Repair Work Card:
WC06-REPAIR01 — Current Action Validation Route After Architect Review

Base branch:
feature/phase-03-wc06-left-to-right-workflow-visibility

Target repair branch:
feature/phase-03-wc06-repair01-validation-route

Expected remote:
ChampCityChris/ChampCity_AI

Use this Repair Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC06-REPAIR01_current_action_validation_route_after_architect_review.md

Implement only WC06-REPAIR01.

Do not implement WC07-WC15.
Do not merge to dev.
Do not push to master.
Do not perform Operator validation.

Primary objective:
Repair the current-action route after WC06 Architect Review. WC06 must route to Operator validation, not Full Work Card creation / Ad Hoc Work Card Capture, when the WC06 Work Card, Implementer Report, and Architect Review already exist and no passing WC06 validation report exists.

Before editing:
1. Confirm current repo and remote.
2. Confirm the base branch is available:
   feature/phase-03-wc06-left-to-right-workflow-visibility
3. Create and switch to:
   feature/phase-03-wc06-repair01-validation-route
4. Read AGENTS.md.
5. Read docs/dev/VALIDATION_COMMAND_LANES.md.
6. Read the WC06 failed validation report.
7. Read the WC06 Work Card, Implementer Report, and Architect Review.
8. Inspect current-action routing code, Work Card artifact matching, Architect Review detection, validation report detection, workflow visibility, and support-navigation mapping.

Required repairs:
1. Recognize the existing WC06 Work Card artifacts.
2. Stop routing WC06 to full Work Card creation when those artifacts exist.
3. Route WC06 to Operator validation after a ready-for-validation Architect Review exists and before passing validation exists.
4. Ensure the routed workspace is Human Validation, not Ad Hoc Work Card Capture.
5. Prevent premature WC07 advancement.
6. Preserve WC06 workflow visibility.
7. Preserve WC05 support navigation.
8. Preserve WC04 validation/repair behavior.
9. Add fixture coverage for the exact failed routing scenario.

Validation:
- Run the approved normal Windows validation lane.
- Run type/build validation.
- Run current-action fixture validation.
- Run WC06 workflow-visibility fixture validation.
- Run WC05 support-navigation fixture validation if affected.
- Run WC04 repair fixtures if affected.
- Run local safety scans before staging.

Required Implementer Report:
Create:
planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC06-REPAIR01_current_action_validation_route_after_architect_review.md

Final response must include:
- pushed repair branch;
- commit hash;
- validation results;
- skipped checks;
- remaining dirty/untracked files;
- confirmation that dev and master were not touched.
