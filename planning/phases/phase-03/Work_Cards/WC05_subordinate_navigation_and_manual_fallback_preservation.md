<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC05",
  "artifactType": "work_card",
  "createdAt": "2026-07-12T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC05_subordinate_navigation_and_manual_fallback_preservation.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC05_subordinate_navigation_and_manual_fallback_preservation.md",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: WC05 — Subordinate Navigation and Manual Fallback Preservation"
  },
  "payloadHash": "sha256:42937c3ebc2dbb6a00b5f951c1c32ce2bca7404b0646af91e1bf0c1c3e120e55",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC05",
      "champcity-ai/phase-03/implementer_report/WC05",
      "champcity-ai/phase-03/validation_report/WC05"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-03/implementer_report/WC05"
    ],
    "sources": [
      "champcity-ai/phase-03/validation_report/WC04-REPAIR02",
      "champcity-ai/phase-03/validation_report/WC04-REPAIR03",
      "champcity-ai/phase-03/work_card/WC04-REPAIR01_validation_flow_and_current_action_panel_usability",
      "champcity-ai/phase-03/work_card/WC04-REPAIR02_repair_validation_routing_gate",
      "champcity-ai/phase-03/work_card/WC04-REPAIR03_validation_target_context_and_panel_simplification",
      "champcity-ai/phase-03/work_card/WC04_primary_current_action_panel",
      "champcity-ai/phase-03/work_card_plan/Work_Card_Plan"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-14T00:00:00.000Z",
  "workCardId": "WC05"
}
-->

# Work Card: WC05 — Subordinate Navigation and Manual Fallback Preservation

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Work Card ID: WC05
Created: 2026-07-12

## Human Goal

The app should guide the Operator through the workflow without trapping them.

WC04 made the current-action panel the primary surface: it tells the Operator what to do now, why it is next, and what record should be created. WC05 makes the rest of the app behave correctly around that model.

In plain terms: the Operator should be able to open other screens for reference or support, but those screens should not become a competing workflow. The app should always make clear which action is current, which screen is merely helping, and how the Operator returns to the routed action.

## Problem

Before Phase 03, the app behaved too much like a collection of screens. The Operator could click into screens, but the UI did not consistently explain which screen was the correct next step or whether a screen was only supporting context.

WC04 repaired the primary current-action panel and repair routing. However, supporting navigation still needs a scoped pass so the Operator is not confused by redundant or competing navigation surfaces.

Known risks from WC04 validation and repairs:

- Secondary screens can appear to compete with the current-action route.
- A manually selected support screen can make the workspace look like the current workflow changed when it did not.
- Navigation labels such as “fallback” or generic tool directories can confuse a non-technical Operator.
- A route-specific primary action, process rail, and supporting-screen directory can become redundant if they are not clearly differentiated.
- The app needs a reliable way to return to the routed current action after the Operator opens a support screen.
- Imperfect durable state must not strand the Operator; manual supporting navigation still has to exist as an escape hatch.

## Goal

Make subordinate navigation safe, understandable, and visibly subordinate to the current-action router.

After WC05, the Operator should see one primary workflow direction, plus a limited set of supporting screens that can be opened for reference. Manual navigation must not override the current action, silently change durable workflow state, or make the app look like a screen picker again.

## Dependencies

- WC02 — Durable Current Required Action Model
- WC03 — Figma Workflow Router UI Shell Integration
- WC04 — Primary Current Action Panel
- WC04-REPAIR01 — Validation Flow and Current Action Panel Usability
- WC04-REPAIR02 — Repair Validation Routing Gate
- WC04-REPAIR03 — Validation Target Context and Panel Simplification

## Source Evidence

Primary planning source:

- `planning/phases/phase-03/Work_Card_Plan.md`

Relevant prior artifacts:

- `planning/phases/phase-03/Work_Cards/WC04_primary_current_action_panel.md`
- `planning/phases/phase-03/Work_Cards/WC04-REPAIR01_validation_flow_and_current_action_panel_usability.md`
- `planning/phases/phase-03/Work_Cards/WC04-REPAIR02_repair_validation_routing_gate.md`
- `planning/phases/phase-03/Work_Cards/WC04-REPAIR03_validation_target_context_and_panel_simplification.md`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC04-REPAIR01_validation_flow_and_current_action_panel_usability_2.md`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC04-REPAIR02_repair_validation_routing_gate.md`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC04-REPAIR03_validation_target_context_and_panel_simplification.md`

Likely implementation surfaces:

- `src/renderer/app/App.tsx`
- `src/renderer/app/WorkflowRouterShell.tsx`
- `src/shared/workCards/currentRequiredAction.ts`
- `src/shared/workCards/validationTarget.ts`
- `src/shared/workCards/validationRecord.ts`
- `src/main/workCards/workCardFileStore.ts`
- existing current-action and validation fixture scripts

## Included Scope

### 1. Make supporting navigation visibly subordinate

The UI must distinguish between:

- the routed current action;
- the primary button or route that helps complete that current action;
- optional supporting screens/tools opened for reference.

Supporting navigation may be called “Supporting tools,” “More tools,” “Reference screens,” or similar. Avoid “manual fallback” as visible primary copy unless it is explained in plain language.

The Operator should not mistake a supporting screen for the active workflow step.

### 2. Preserve manual navigation as an escape hatch

The Operator must still be able to open existing screens when router state is incomplete, stale, or imperfect.

Manual supporting navigation must remain available for Alpha usability. It should be framed as support, not as the main workflow.

### 3. Add or preserve a clear return path to the routed action

When the Operator opens a supporting screen manually, the UI should provide a clear way to return to the routed current action.

Acceptable approaches include:

- a visible “Return to current action” control;
- a primary current-action button that remains visible and clearly labeled;
- a persistent current-action panel that explains the current routed action while support screens are open.

### 4. Keep manual support screen selection from mutating durable workflow state

Opening a support screen must not mark a workflow step complete, change the current required action, create a validation record, or imply the route has advanced.

The selected support screen may be local UI state. Durable project state remains artifact-driven.

### 5. Make active support-screen context clear

When the center workspace shows a supporting screen, the UI should label that state plainly. For example:

- “Viewing supporting screen: Human Validation”
- “This screen is available for reference. Current action remains: [title].”

The exact wording is left to implementation judgment, but the distinction must be clear to a non-technical Operator.

### 6. Remove or reduce redundant navigation surfaces

If the process rail, primary current-action button, and More Tools directory all expose similar behavior, reduce duplication where safe.

The route-specific primary action should remain more prominent than manual browsing.

Do not remove access to existing screens unless there is a clear replacement path.

### 7. Handle missing or stale route targets gracefully

If the routed support screen cannot be resolved, the UI should say so plainly and offer available supporting screens without making the router look broken.

The Operator should see:

- what the app tried to route to;
- why it could not open automatically, if known;
- what manual supporting screens are still available.

### 8. Preserve WC04 repair behavior

WC05 must not regress the WC04 repair chain. In particular:

- the current-action panel remains primary;
- Human Validation can still route to the active validation target;
- draft preservation must remain intact;
- prior validation status/report context must remain intact;
- current-action routing must not advance prematurely;
- the app must not reintroduce a duplicative right context panel.

## Out Of Scope

- Do not implement WC06 left-to-right workflow map beyond preserving existing process rail behavior.
- Do not implement WC07 artifact review workspace.
- Do not implement WC08 context inspector.
- Do not implement WC09-WC15 route-specific workflow corrections.
- Do not create a full screen-by-screen redesign.
- Do not change the locked workflow sequence.
- Do not create Operator validation records.
- Do not close Phase 03.
- Do not merge to `dev`.
- Do not push to `master`.
- Do not add provider SDKs, cloud services, authentication, databases, browser automation, LLM APIs, or unrelated integrations.

## Required Behavior

The Implementer must ensure the UI supports this model:

```text
Current-action router = primary workflow authority
Primary route button = preferred next action helper
Supporting screens/tools = optional reference or recovery surfaces
Manual support navigation = escape hatch, not workflow state
```

The app should answer these Operator questions without requiring technical interpretation:

```text
What am I supposed to do now?
Which screen helps me do it?
Am I looking at the routed action or just a supporting screen?
How do I get back to the routed action?
Did opening this screen change workflow state?
What can I do if the routed screen is unavailable?
```

## Acceptance Criteria

- The routed current action remains visually primary after a support screen is opened.
- Manual supporting navigation remains available.
- Manual supporting navigation is clearly labeled as support/reference/tooling, not the main workflow.
- The UI provides a clear return path to the routed current action.
- Opening a support screen does not mutate durable workflow state or imply the current action changed.
- The active support screen is visibly identified as a support screen when applicable.
- The route-specific primary action remains more prominent than manual browsing.
- Redundant navigation controls are removed, collapsed, or clearly differentiated where safe.
- Missing or unresolved support routes produce plain-language guidance rather than silent failure.
- Existing screens remain reachable unless intentionally replaced by an equivalent path.
- WC04 repair behavior remains intact.
- Current-action routing does not advance to WC06 or later work prematurely.
- No WC06-WC15 behavior is implemented prematurely.
- Automated validation passes or skipped checks are documented.
- WC05 Implementer Report exists.

## Validation Expectations

Before validation, read:

- `AGENTS.md`
- `docs/dev/VALIDATION_COMMAND_LANES.md`

Run the normal Windows validation lane.

Required validation:

- TypeScript/type validation.
- Build validation.
- Existing current-action fixture validation if affected.
- Existing WC04 repair fixture validation if affected.
- Focused navigation/support-screen fixture validation if feasible.
- Local safety scan before staging.

Do not perform Operator validation.

## Required Implementer Report

Create:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC05_subordinate_navigation_and_manual_fallback_preservation.md`

The report must include:

- implementation branch name;
- implementation summary;
- files changed;
- how supporting navigation was made subordinate to the current-action router;
- how the Operator returns to the routed current action;
- how manual support navigation remains available;
- how support-screen state is distinguished from durable workflow state;
- how redundant navigation surfaces were reduced or clarified;
- how missing/unresolved support routes are handled;
- confirmation WC04 repair behavior was preserved;
- confirmation WC06-WC15 were not implemented;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action.

## Branch And Commit Rules

Base branch:

- `dev`

Implementation branch:

- `feature/phase-03-wc05-subordinate-navigation-fallback`

Rules:

- Create the implementation branch from clean `dev`.
- Stage only WC05-scoped files.
- Commit to the WC05 feature branch.
- Push the WC05 feature branch to origin.
- Do not merge to `dev`.
- Do not push to `master`.

## Implementer Handoff Prompt

You are acting as Implementer for ChampCity A/I.

Work Card:
WC05 — Subordinate Navigation and Manual Fallback Preservation

Base branch:
dev

Target branch:
feature/phase-03-wc05-subordinate-navigation-fallback

Expected remote:
ChampCityChris/ChampCity_AI

Use this Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC05_subordinate_navigation_and_manual_fallback_preservation.md

Implement only WC05.

Do not implement WC06-WC15.
Do not merge to dev.
Do not push to master.
Do not perform Operator validation.

Primary objective:
Make subordinate/manual navigation safe and understandable while preserving the current-action router as the primary workflow authority.

Human objective:
The Operator should be able to open supporting screens for reference or recovery without mistaking them for the current workflow step. The current-action panel remains the boss. Supporting screens are tools.

Before editing:
1. Confirm current repo and remote.
2. Confirm `dev` is clean and available.
3. Create and switch to:
   feature/phase-03-wc05-subordinate-navigation-fallback
4. Read AGENTS.md.
5. Read docs/dev/VALIDATION_COMMAND_LANES.md.
6. Read the WC05 Work Card.
7. Read the WC04 Work Card and WC04 repair validation reports.
8. Inspect WorkflowRouterShell, App, current-action routing, validation target handling, and existing navigation controls.

Required implementation:
1. Keep the routed current action visually primary.
2. Preserve manual access to supporting screens.
3. Clearly label supporting screens/tools as support/reference, not workflow authority.
4. Provide a clear return path to the routed current action.
5. Make clear when the center workspace is showing a supporting screen.
6. Ensure opening a support screen does not mutate durable workflow state.
7. Remove, collapse, or clarify redundant navigation surfaces where safe.
8. Provide plain-language behavior when a routed support screen cannot be resolved.
9. Preserve WC04 repair behavior.
10. Do not implement WC06-WC15.

Validation:
- Run the approved normal Windows validation lane.
- Run type/build validation.
- Run current-action fixture validation if affected.
- Run WC04 repair fixture validation if affected.
- Add focused fixture checks for support navigation if feasible.
- Run local safety scans before staging.

Required Implementer Report:
Create:
planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC05_subordinate_navigation_and_manual_fallback_preservation.md

Final response must include:
- pushed branch;
- commit hash;
- validation results;
- skipped checks;
- remaining dirty/untracked files;
- confirmation that dev and master were not touched.
