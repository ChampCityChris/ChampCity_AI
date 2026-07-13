# Work Card: WC06 — Left-to-Right Workflow Visibility

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Work Card ID: WC06
Created: 2026-07-13

## Human Goal

The Operator should be able to look at the application and understand, left to right, where they are in the ChampCity A/I process.

The app must stop relying on the Operator to infer process position from whichever screen happens to be open. WC04 made the current-action panel primary. WC05 made supporting screens subordinate. WC06 now makes the workflow itself visibly understandable as a left-to-right process map.

In plain terms: the Operator should be able to answer three questions without reading repo files or guessing from screen names:

1. Where am I in the overall workflow?
2. What has already happened?
3. What happens next, including whether this is inside a loop or repair path?

## Source Authority

Primary sources:

- `planning/phases/phase-03/Work_Cards/WC06_left_to_right_workflow_visibility.md`
- `planning/phases/phase-03/Work_Card_Plan.md`
- WC02 current-action model and fixtures
- WC03 workflow router shell
- WC04 current-action panel and accepted repair chain
- WC05 subordinate navigation and accepted validation report

Workflow authority:

`Project Intake -> Project Interview -> Reconciliation Review -> Project Mapping -> Operator Project Approval -> Phase Mapping -> Operator Phase Approval -> Work Card Loop -> Phase Closeout -> Operator Phase Closeout Approval -> Roadmap Update -> Next Phase Activation -> Repeat Phase Mapping / Work Card Loop`

Supporting mental model:

`Capture -> Frame -> Plan -> Build -> Prove`

The supporting mental model may be used as a plain-language grouping aid, but it must not replace the locked workflow sequence above.

## Problem

The existing UI has a process rail, but the Operator still has to infer too much. The rail is not yet a sufficient left-to-right process map. It does not clearly explain the full workflow sequence, the distinction between project setup, phase planning, Work Card loop, validation/repair, closeout, roadmap update, and next-phase repeat.

The prior Operator feedback established that vertical/up-down process explanations are not acceptable for this workflow. The process needs to be readable left to right on a widescreen monitor.

The current UI must preserve the router model while making the process visible enough that a non-technical Operator can follow it without already understanding the repo artifacts.

## Objective

Improve the visible workflow strip/process rail into a true left-to-right workflow guide.

The result should show the current workflow step, completed/past steps, upcoming steps, blocked or repair states, loop boundaries, and next-step direction in a way that supports the locked workflow model.

This Work Card does not populate every route-specific screen. It improves process visibility and orientation.

## Branch Rule

Base branch:

- `dev`

Implementation branch:

- `feature/phase-03-wc06-left-to-right-workflow-visibility`

Do not implement directly on `dev`. Do not merge to `dev`. Do not push to `master`.

## Included Scope

### 1. Replace vague rail behavior with explicit left-to-right workflow visibility

The UI must make the workflow sequence readable from left to right. It may improve the existing process rail or add a dedicated workflow visibility strip, but it must not create another competing workflow authority.

The display should show the locked workflow progression in an Operator-readable form.

### 2. Show current step clearly

The current step derived from the durable current-action model must be visually obvious.

The active step should stand out more clearly than completed, future, or support-only steps.

The active step should align with the current-action panel and not with an arbitrary supporting screen.

### 3. Show completed, current, upcoming, blocked, and repair states

The UI should distinguish at least these states where evidence supports them:

- completed / already satisfied;
- current / action required now;
- upcoming / not ready yet;
- blocked / missing required evidence;
- repair loop / failed validation or repair route active.

If the app cannot confidently compute a state, it should say so plainly rather than pretend.

### 4. Make loops visible

The workflow strip must communicate that the process includes loops, not just a straight line.

At minimum, show or explain these loops:

- Work Card Loop: Work Card -> Implementer -> Architect Review -> Operator Validation -> Repair if needed -> validation again;
- Phase Loop: Phase Mapping -> Work Card Loop -> Phase Closeout -> Roadmap Update -> Next Phase Activation -> repeat for next phase;
- approval/revision loops where Operator approval sends work back for revision.

The loop representation should remain left-to-right. Do not switch to a top-down process map.

### 5. Preserve WC05 support-navigation semantics

Clicking a process step may open a supporting screen, but it must not imply the workflow state changed.

Any click behavior on the workflow strip must be labeled as support/reference navigation only unless it is the routed primary action.

The primary current-action panel remains the workflow authority.

### 6. Improve plain-language process grouping

The UI may group the locked workflow into broad human-readable phases such as:

- Capture;
- Frame;
- Plan;
- Build;
- Prove.

These groups should help the Operator understand the workflow, but the app must still preserve the exact locked workflow steps underneath.

### 7. Keep existing screens reachable

Do not remove supporting tools, process rail access, reference phase/card selectors, or current-action routing created by WC04/WC05.

WC06 should improve visual orientation, not remove recovery paths.

## Out of Scope

- Do not implement WC07 Artifact Review Workspace.
- Do not implement WC08 Current Step Context Inspector.
- Do not implement WC09-WC15 route-specific behavior.
- Do not create a full diagramming engine.
- Do not generate a static PNG or Markdown process map as the product solution.
- Do not change the locked workflow sequence.
- Do not make supporting screen clicks mutate durable workflow state.
- Do not create Operator validation records.
- Do not close Phase 03.
- Do not merge to `dev`.
- Do not push to `master`.
- Do not add provider SDKs, cloud services, browser automation, auth, database, or external integrations.

## Acceptance Criteria

- The UI shows a left-to-right workflow strip or equivalent left-to-right process guide.
- The guide uses the locked workflow sequence as authority.
- The current step is visually obvious and agrees with the current-action panel.
- Completed/past, current, upcoming, blocked, and repair states are distinguishable where evidence supports them.
- Work Card and phase loops are visible or clearly explained.
- Operator approval/revision and validation/repair loops are represented or explained.
- The display remains usable on a widescreen layout without forcing the Operator into a vertical process map.
- Clicking workflow steps, if supported, is clearly support/reference navigation and does not mutate durable state.
- Existing WC04 current-action behavior remains intact.
- Existing WC05 support-navigation behavior remains intact.
- The router does not advance to WC07 prematurely.
- WC07-WC15 behavior is not implemented prematurely.
- Automated validation passes or skipped checks are documented.
- WC06 Implementer Report exists.

## Validation Expectations

Before validation, read:

- `AGENTS.md`
- `docs/dev/VALIDATION_COMMAND_LANES.md`

Run the approved normal Windows validation lane.

Expected checks:

- TypeScript/type validation.
- Production build validation.
- Existing current-action fixture validation if affected.
- Existing WC04/WC05 focused fixtures if affected.
- A focused workflow-visibility fixture if feasible.
- Local safety scans before staging.

Do not perform Operator validation.

## Required Implementer Report

Create:

`planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC06_left_to_right_workflow_visibility.md`

The report must include:

- branch name;
- implementation summary;
- files changed;
- how the left-to-right workflow guide was implemented;
- how the locked workflow sequence is represented;
- how current/completed/upcoming/blocked/repair states are represented;
- how Work Card, validation/repair, phase, and approval/revision loops are represented;
- how WC04 current-action behavior was preserved;
- how WC05 support-navigation behavior was preserved;
- confirmation WC07-WC15 were not implemented;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action.

## Manual Validation Guidance For Architect Review

The Operator should later validate that:

1. The workflow is readable left to right.
2. The current step is obvious without opening a support screen.
3. The process guide matches the current-action panel.
4. The Work Card loop is understandable.
5. The repair/validation loop is understandable.
6. The phase loop and next-phase repeat are understandable.
7. The guide does not make supporting screens look like workflow authority.
8. Clicking steps, if available, opens support/reference only and does not advance state.
9. The view remains usable on a widescreen monitor.
10. WC04 and WC05 behavior still works.
11. The app does not advance to WC07 prematurely.
12. WC07-WC15 behavior is not present.

## Implementer Handoff Prompt

You are acting as Implementer for ChampCity A/I.

Work Card:
WC06 — Left-to-Right Workflow Visibility

Base branch:
dev

Target branch:
feature/phase-03-wc06-left-to-right-workflow-visibility

Expected remote:
ChampCityChris/ChampCity_AI

Use this Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC06_left_to_right_workflow_visibility.md

Implement only WC06.

Do not implement WC07-WC15.
Do not merge to dev.
Do not push to master.
Do not perform Operator validation.

Primary objective:
Make the ChampCity A/I workflow visibly understandable as a left-to-right process guide while preserving the current-action router as the primary workflow authority.

Human objective:
The Operator should be able to look at the app and understand where they are, what already happened, what happens next, and where loops or repairs occur. Humans read this workflow left to right; do not solve this with a vertical process map.

Before editing:
1. Confirm current repo and remote.
2. Confirm dev is clean and available.
3. Create and switch to feature/phase-03-wc06-left-to-right-workflow-visibility.
4. Read AGENTS.md.
5. Read docs/dev/VALIDATION_COMMAND_LANES.md.
6. Read the WC06 Work Card.
7. Read the WC04 and WC05 validation reports.
8. Inspect WorkflowRouterShell, current-action routing, process rail, and support-navigation code.

Required implementation:
1. Show the locked workflow as a left-to-right process guide.
2. Make the current step visually obvious.
3. Distinguish completed/current/upcoming/blocked/repair states where evidence supports them.
4. Show or explain Work Card, validation/repair, phase, and approval/revision loops.
5. Preserve WC04 current-action panel behavior.
6. Preserve WC05 support-navigation behavior.
7. Keep supporting screen clicks support-only.
8. Do not mutate durable workflow state from process-step navigation.
9. Do not implement WC07-WC15.

Validation:
- Run the approved normal Windows validation lane.
- Run type/build validation.
- Run current-action fixture validation if affected.
- Run WC04/WC05 focused fixture validation if affected.
- Add focused workflow-visibility fixture checks if feasible.
- Run local safety scans before staging.

Required Implementer Report:
Create:
planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC06_left_to_right_workflow_visibility.md

Final response must include:
- pushed branch;
- commit hash;
- validation results;
- skipped checks;
- remaining dirty/untracked files;
- confirmation that dev and master were not touched.
