<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC04-REPAIR01_validation_flow_and_current_action_panel_usability",
  "artifactType": "work_card",
  "createdAt": "2026-07-12T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC04-REPAIR01_validation_flow_and_current_action_panel_usability.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC04-REPAIR01_validation_flow_and_current_action_panel_usability.md",
  "payload": {
    "kind": "work_card",
    "title": "Repair Work Card: WC04-REPAIR01 — Validation Flow and Current Action Panel Usability"
  },
  "payloadHash": "sha256:61f2bddb45894fc8bb5960fb1b54495712c99d3a24c17457024248b90ab04d69",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC04-REPAIR01",
      "champcity-ai/phase-03/architect_review/WC04-REPAIR03",
      "champcity-ai/phase-03/implementer_report/WC04-REPAIR01",
      "champcity-ai/phase-03/implementer_report/WC04-REPAIR03",
      "champcity-ai/phase-03/operator_validation/WC04-REPAIR01",
      "champcity-ai/phase-03/work_card/WC05"
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

# Repair Work Card: WC04-REPAIR01 — Validation Flow and Current Action Panel Usability

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Parent Work Card: WC04 — Primary Current Action Panel
Repair ID: WC04-REPAIR01
Created: 2026-07-12

## Repair Trigger

WC04 received a deferred Operator validation decision. The operator validation records that the current-action panel is improved, but several usability and validation-flow defects prevent clean acceptance.

Primary source:

- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC04_primary_current_action_panel.md`

Supporting sources:

- `planning/phases/phase-03/Work_Cards/WC04_primary_current_action_panel.md`
- `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC04_primary_current_action_panel.md`
- `planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC04_primary_current_action_panel.md`
- `src/renderer/app/WorkflowRouterShell.tsx`

## Problem

WC04 improved the primary current-action panel, but the Operator validation flow still creates confusion and data-loss risk.

Observed defects from Operator validation:

- Screenshot evidence still cannot be pasted directly into the Screenshots input box.
- Warning and Information messages do not wrap and can be cut off.
- The app opens to Project Intake even when the routed current action is Operator Validation.
- The label “Manual Fallback” is unclear to a non-technical Operator.
- Text typed into a validation record is cleared when the Operator navigates away to view supporting information.
- Warning and Information messages are too technical for a non-technical user.
- Previous Work Card validation targets do not show whether they were completed or what report information exists.
- The right-side context panel appears to mirror the left current-action panel instead of providing distinct context.
- The Manual Validation Checklist appears to come from the Implementer Report and is not useful; it should use Architect-written validation guidance when available.

## Goal

Repair the WC04 validation-flow and current-action usability defects without starting the broader WC05-WC15 route-specific work.

The Operator should be able to validate the current Work Card without losing typed report content, without being dropped into an unrelated Project Intake screen, and without having to interpret developer-centric warnings or duplicated context panes.

## Branch And Review Rule

Base branch for this repair:

- `feature/phase-03-wc04-current-action-panel`

Repair implementation branch:

- `feature/phase-03-wc04-repair01-validation-flow`

The Implementer must create the repair branch from the current WC04 feature branch. Do not merge to `dev`. Do not push to `master`. Architect review happens after the repair branch and repair Implementer Report are pushed.

## Included Scope

### 1. Preserve validation draft content across navigation

When the Operator types into the operator validation form, that content must not be cleared merely because the Operator opens another screen, support panel, context panel, validation target, or manual support route.

Implement a safe in-renderer draft preservation mechanism for the active validation target. It may use component state lifted to a stable parent, local draft cache, or existing app state patterns. Do not broaden renderer filesystem access.

### 2. Align current-action route with the visible support workspace

When the current action is Operator Validation, the center workspace must not misleadingly default to Project Intake.

Acceptable approaches:

- on first current-action load, if the selected screen is only the legacy default and the route maps to a clear support screen, open that support screen once;
- or show a neutral current-action workspace state that prompts the Operator to open the supporting validation screen;
- or otherwise make the visible workspace consistent with the highlighted current action.

Do not reintroduce screen-picker behavior as primary workflow authority. The current-action panel remains primary.

### 3. Rename and explain “Manual Fallback”

Replace unclear “Manual Fallback” wording in the visible UI with Operator-friendly language such as:

- “Supporting screen”
- “Open supporting screen”
- “Manual support”

The copy must explain that these screens help complete the current action but do not replace the routed workflow authority.

### 4. Fix warning and information text wrapping

Warning, information, path, and evidence text must wrap or break safely inside their panels. Long file paths, warning codes, and technical identifiers must not create horizontal cutoff lines.

Use CSS utilities or component structure that supports wrapping, breaking long words, and scrolling only when appropriate.

### 5. Make warning and information messages understandable

The UI may still show technical codes, but the primary message should be understandable by a non-technical Operator.

Where possible, pair warning codes with plain-language meaning. For example, stale validation target warnings should explain that an older reference is being shown as context and is not blocking the current action.

### 6. Use Architect validation guidance for the checklist

The Manual Validation Checklist should prefer Architect-authored validation guidance, especially from the Architect Review. It should not primarily use Implementer Report checklists when an Architect Review exists.

Preferred source order:

1. Architect Review Operator validation guidance / Manual validation required section.
2. Work Card acceptance criteria or validation expectations.
3. Implementer Report manual validation required only as fallback.

### 7. Show prior validation target status and report context

When selecting previous Work Cards or validation targets, the UI should show whether the target has a operator validation and the recorded result/decision when available.

At minimum, show enough context to distinguish pending, passed, failed, deferred, or unknown targets, and provide the associated report filename or summary where available.

### 8. Distinguish the right-side context panel from the left current-action panel

The right context panel should not look like a smaller duplicate of the left current-action panel.

It should focus on evidence, source paths, missing artifacts, validation target status, report status, and current route metadata. It should not repeat the same primary action copy in the same hierarchy.

### 9. Screenshot evidence input usability

Improve the Screenshots input behavior for validation reports.

Preferred behavior: support direct paste from the clipboard when an image is available.

Acceptable minimum behavior: provide a clear, non-silent fallback for adding screenshot evidence, such as pasteable file paths, drag/drop, or a file picker if already supported by the app stack.

Do not add heavy dependencies or unrelated media-management systems.

## Out Of Scope

- Do not implement WC05-WC15 route-specific behavior.
- Do not perform a full screen-by-screen UI rework.
- Do not redesign the WC03 shell.
- Do not change the durable WC02 current-action evaluator unless a narrow bug is directly required for this repair.
- Do not create Operator validation records.
- Do not close Phase 03.
- Do not merge to `dev`.
- Do not push to `master`.
- Do not add provider SDKs, cloud services, browser automation, auth, database, or LLM API integrations.

## Acceptance Criteria

- Validation form text survives navigation away from and back to the validation screen for the active target.
- The visible workspace no longer opens to unrelated Project Intake when the current required action is Operator Validation.
- “Manual Fallback” wording is replaced or explained with Operator-friendly language.
- Warning and information messages wrap and remain readable.
- Technical warnings include plain-language meaning where feasible.
- The validation checklist prefers Architect Review guidance over Implementer Report text.
- Previous validation targets show report/result/decision context when available.
- The right context panel is distinct from the left current-action panel.
- Screenshot evidence input supports paste or provides a clear fallback instead of silent failure.
- Existing screens remain reachable.
- WC04 current-action panel remains the primary guided surface.
- No WC05-WC15 behavior is implemented prematurely.
- Automated validation passes or skipped checks are documented.
- WC04-REPAIR01 Implementer Report exists.

## Validation Expectations

- Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before validation.
- Run the normal Windows validation lane.
- Run TypeScript/type validation and build validation.
- Run current-action fixture validation if affected.
- Run focused checks for validation draft preservation if a testable path exists.
- Run local safety scans before staging.
- Do not perform Operator validation.

## Required Implementer Report

Create:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC04-REPAIR01_validation_flow_and_current_action_panel_usability.md`

The report must include:

- repair branch name;
- implementation summary;
- files changed;
- how validation draft preservation was implemented;
- how current-action route/workspace alignment was fixed;
- how warning wrapping and plain-language messaging were handled;
- how checklist source precedence was changed;
- how previous validation target status/report context is displayed;
- how screenshot evidence input was improved or what fallback is provided;
- confirmation WC05-WC15 were not implemented;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action.

## Implementer Handoff Prompt

You are acting as Implementer for ChampCity A/I.

Repair Work Card:
WC04-REPAIR01 — Validation Flow and Current Action Panel Usability

Base branch:
feature/phase-03-wc04-current-action-panel

Target repair branch:
feature/phase-03-wc04-repair01-validation-flow

Expected remote:
ChampCityChris/ChampCity_AI

Use this Repair Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC04-REPAIR01_validation_flow_and_current_action_panel_usability.md

Implement only WC04-REPAIR01. Do not implement WC05-WC15. Do not merge to dev. Do not push to master.

Primary objective:
Repair the deferred WC04 validation issues around validation-flow usability, current-action/workspace alignment, warning readability, validation checklist source, validation target context, right-side context duplication, and screenshot evidence input.

Before editing:
1. Confirm current repo and remote.
2. Confirm the base branch is available.
3. Create and switch to feature/phase-03-wc04-repair01-validation-flow from feature/phase-03-wc04-current-action-panel.
4. Read AGENTS.md.
5. Read docs/dev/VALIDATION_COMMAND_LANES.md.
6. Read the WC04 deferred operator validation.
7. Read the WC04 Architect Review and Implementer Report.
8. Inspect the validation screen, WorkflowRouterShell, current-action loading, and validation target/report loading code.

When complete:
- run required validation;
- stage only WC04-REPAIR01-scoped files;
- commit to the repair branch;
- push the repair branch to origin;
- create the required Implementer Report;
- include commit hash, push status, validation results, skipped checks, remaining dirty files, and confirmation that dev/master were not touched in the final response.

## Document Disposition
Document.Status=Pending
