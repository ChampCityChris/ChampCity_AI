<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC04_primary_current_action_panel",
  "artifactType": "work_card",
  "createdAt": "2026-07-12T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC04_primary_current_action_panel.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC04_primary_current_action_panel.md",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: WC04 — Primary Current Action Panel"
  },
  "payloadHash": "sha256:b78b79100d36a01cc864ecd0594a5fe265789e0b39f4a7972826ac7b3751d2e9",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC04",
      "champcity-ai/phase-03/implementer_report/WC04",
      "champcity-ai/phase-03/implementer_report/WC04-REPAIR01",
      "champcity-ai/phase-03/validation_report/WC04",
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

# Work Card: WC04 — Primary Current Action Panel

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Created: 2026-07-12

## Purpose

Replace screen-picker behavior with a stronger primary guided action surface inside the WC03 workflow-router shell.

WC04 does not replace the WC03 shell. It refines the current-action panel so the Operator can understand the next required action without guessing which legacy screen to open.

## Source Authority

Approved Phase 03 Work Card Plan:

- `planning/phases/phase-03/Work_Card_Plan.md`

Dependencies already completed and validated:

- WC02 — Durable Current Required Action Model
- WC03 — Figma Workflow Router UI Shell Integration

Relevant artifacts:

- `planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC03_figma_workflow_router_ui_shell_integration.md`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC03_figma_workflow_router_ui_shell_integration.md`
- `src/shared/workCards/currentRequiredAction.ts`
- `src/renderer/app/WorkflowRouterShell.tsx`
- `src/renderer/app/App.tsx`

## Operator Context

WC03 passed because the shell is now visually aligned to the intended workflow. The Operator also observed that many things on individual screens do not yet function as intended and that a later screen-by-screen evaluation/rework phase may be needed.

WC04 must not attempt to fix every screen. WC04 should make the primary current-action panel more useful, more honest, and more guiding so the Operator knows what is next, why it is next, what evidence is being used, and what action or fallback screen should be opened.

## Problem

The WC03 shell displays current-action state, but the Operator still needs a clearer primary action surface. The app should not force the Operator to infer the workflow from subordinate screens.

The current-action panel should answer these questions at a glance:

- What am I supposed to do now?
- Who owns the next action?
- Why is this the next action?
- What phase and Work Card does this relate to?
- What source evidence caused this route?
- What artifact or record will be created or reviewed?
- What happens after success?
- What happens after failure, revision, or repair?
- Which fallback screen should I open if I need to perform the task manually?
- Is this warning informational, actionable, or blocking?

## Goal

Turn the current-action area into the primary guided action panel for the workflow router while preserving the WC03 source-code visual shell.

The current-action panel should become the Operator’s main decision surface, not just a small summary box.

## Included Scope

- Refine `WorkflowRouterShell` current-action panel behavior and presentation.
- Keep the WC03 visual shell intact; do not redesign the entire shell.
- Use the WC02 current-action model as the only routing authority.
- Display the current action title, summary, reason, responsible role, status, phase, Work Card, expected output, routes, manual fallback, warnings, source artifacts, and missing artifacts clearly.
- Make the primary next action visually obvious.
- Add clear action/fallback affordance for opening the relevant subordinate screen.
- Improve warning display so informational warnings are not treated as blockers and blocking warnings are visually distinct.
- Separate source evidence, missing evidence, and expected output so they are not visually conflated.
- Clarify when a screen is only a fallback/manual support screen rather than the primary workflow authority.
- Add a clear empty/loading/error state when the current-action model cannot load.
- Add or update tests/fixtures for current-action panel rendering if feasible within the current test framework.
- Create the required WC04 Implementer Report.

## Out Of Scope

- Do not implement WC05 subordinate navigation redesign beyond what is required for the current-action panel’s fallback button.
- Do not implement WC07 artifact review workspace actions.
- Do not implement WC09 Phase Mapping route correction.
- Do not implement WC10 Work Card handoff route correction.
- Do not implement WC11 Implementer Report to Architect Review route.
- Do not implement WC12 validation/repair route behavior.
- Do not implement WC13 closeout/roadmap/next-phase behavior.
- Do not perform a screen-by-screen rework phase.
- Do not remove existing screens.
- Do not create Operator validation records.
- Do not close Phase 03.
- Do not add provider SDKs, cloud services, browser automation, auth, database, or LLM API calls.
- Do not push directly to `dev` or `master`.

## Current-Action Panel Requirements

### Primary action summary

The panel must clearly show:

- action title
- action summary
- responsible role
- status
- phase ID/title if available
- Work Card ID/title if available

The title and primary action should be more prominent than supporting metadata.

### Why this is next

The panel must display the current-action `reason` in plain language. If the reason is long, it may be visually constrained, but the full text should remain accessible or readable.

### Expected output

The panel must display the expected artifact/output separately from source evidence. It should show:

- expected output artifact type
- expected output path if available
- expected output description if available

### Route outcomes

The panel must show available route outcomes:

- success route
- failure route
- repair route

Do not invent routes. Display only what the WC02 model provides.

### Manual fallback

The panel must provide a clear fallback action that opens the best matching subordinate screen.

If the WC02 current-action model provides fallback instructions or an artifact path, show them. If no fallback exists, the panel should still preserve manual navigation access through the WC03 shell.

### Warnings

Warnings must be grouped and labeled by severity:

- info
- warning
- blocking

Blocking warnings should be visually distinct. Non-blocking warnings should not make the panel look failed.

### Evidence

The panel should display compact evidence sections:

- source artifacts
- missing artifacts
- expected output

If lists are long, show the most relevant items and provide an overflow/expand affordance or clear count.

### Load and error states

The panel must handle:

- loading current-action state
- current-action load error
- no current action returned
- current action complete/no-current-action state

These states must not crash the renderer.

## Branch And Review Rule

Base branch: `dev`

Implementation branch: `feature/phase-03-wc04-current-action-panel`

The Implementer must create the feature branch from `dev`, commit WC04 work to that feature branch, and push the feature branch to origin. The Implementer must not push WC04 directly to `dev` or `master`, and must not merge the feature branch into `dev`.

Architect review happens after the pushed feature branch and Implementer Report are available.

If the Implementer Report is committed in the same commit as the work, it must say `Commit hash: pending until commit is created`. The final Implementer response must provide the actual commit hash and pushed branch.

## Acceptance Criteria

- The WC03 shell remains visible and recognizable.
- The current-action panel is clearly the primary guided action surface.
- The panel displays action title, summary, responsible role, status, reason, phase/work-card references, expected output, source evidence, missing evidence, routes, warnings, and manual fallback where available.
- The panel uses WC02 current-action data and does not duplicate routing logic in the renderer.
- Blocking and non-blocking warnings are visually distinct.
- The fallback action opens or clearly points to the relevant subordinate screen.
- Existing screens remain reachable.
- Renderer filesystem access is not broadened.
- WC05-WC15 route-specific scope is not implemented prematurely.
- Validation passes or skipped checks are documented.
- WC04 Implementer Report exists.

## Validation Expectations

- Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before editing.
- Run the appropriate normal Windows validation lane.
- Run TypeScript/type validation and build validation.
- Run tests relevant to renderer/current-action panel behavior if available.
- Run current-action fixture validation if affected.
- Run local safety scans before staging.
- Confirm no secrets, environment files, source archives, screenshots, build outputs, or unrelated files are staged.
- Do not perform Operator validation.

## Operator Validation Focus

Operator validation for WC04 should focus on whether the current-action panel actually guides the user.

Validate:

- the next required action is obvious without opening a legacy screen first;
- the panel explains why the action is next;
- expected output is separate from source evidence;
- fallback/manual navigation is understandable;
- warnings do not all look like failures;
- existing screens remain reachable;
- route-specific behavior that belongs to later Work Cards was not prematurely implemented.

## Required Implementer Report

Create:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC04_primary_current_action_panel.md`

The report must include:

- feature branch name;
- implementation summary;
- files changed;
- how WC02 current-action data is used;
- how the WC03 shell was preserved;
- which current-action fields are displayed;
- how warnings/fallbacks/evidence are handled;
- confirmation WC05-WC15 were not implemented;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action.

## Implementer Handoff

You are acting as Implementer for ChampCity A/I.

Work Card: WC04 — Primary Current Action Panel

Base branch: `dev`
Target branch: `feature/phase-03-wc04-current-action-panel`
Expected remote: `ChampCityChris/ChampCity_AI`

Use this Work Card as the source of truth:
`planning/phases/phase-03/Work_Cards/WC04_primary_current_action_panel.md`

Implement only WC04. Preserve the WC03 shell. Do not implement WC05-WC15. Do not merge to `dev`. Do not push to `master`.

Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before editing. Use the WC02 current-action model as the routing authority. Create and push the WC04 feature branch. Create the required Implementer Report when complete.
