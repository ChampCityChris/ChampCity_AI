# Work Card: Figma Workflow Router UI Shell Integration

## Work Card ID

WC03

Created: 2026-07-03
Updated: 2026-07-03

## Phase

phase-03 — Workflow Router Screen Correction and Guided Current Action UI

## Status

ready_for_implementer

## Source Authority

Phase 03 Operator approval:

- `planning/phases/phase-03/Operator_Phase_Approval.md`
- `planning/phases/phase-03/Operator_Phase_Approval.json`

Approved Phase 03 Work Card Plan:

- `planning/phases/phase-03/Work_Card_Plan.md`

WC02 validation pass:

- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC02_durable_current_required_action_model.md`

WC02 Architect Review:

- `planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC02_durable_current_required_action_model.md`

Workflow baseline authority:

- `docs/workflow/PROCESS_BASELINE.md`
- `docs/workflow/PROCESS_MAP.drawio`

## Purpose

Integrate the Figma-inspired workflow-router UI shell into the real Electron/React application so the durable current required action model from WC02 becomes visible and usable.

This Work Card establishes the visual shell and layout system for Phase 03. Route-specific behavior corrections remain later Work Cards unless directly required to connect the shell to the current-action model.

## Problem

The application still exposes too much screen-picker behavior and does not yet present the workflow-router model as the primary Operator experience. WC02 created the durable current-action state model, but the UI must now display that model clearly.

The Operator needs a left-to-right, guided interface that answers:

- what step am I on?
- what action is required now?
- why is it next?
- which artifact/evidence supports this?
- what will be written or reviewed?
- what happens if it passes, fails, or needs repair?
- where can I manually navigate if the router is wrong or unavailable?

## Goal

Adapt the Figma workflow-router shell into the app and wire it to live durable current-action state rather than demo/static state.

The shell must create a stable layout foundation for later WC04 through WC15 route-specific work.

## Included Scope

- Integrate the Figma-inspired workflow-router shell into the existing Electron/React renderer.
- Use the WC02 current required action model as live state input.
- Add a top status strip showing project, branch/repo state where available, active phase, current Work Card, and current required action status.
- Add a horizontal left-to-right workflow/process rail based on the locked workflow.
- Add a primary current required action area that displays title, summary, responsible role, reason, expected output, success route, failure route, repair route, manual fallback, and warnings.
- Add an artifact workspace region that can display the relevant current-action artifact path(s), expected output path, and missing artifacts.
- Add a context inspector region that shows source artifacts, stale/superseded warnings, and durable-state evidence behind the routed action.
- Add a subordinate navigation area or drawer that preserves access to existing screens as manual fallback/supporting views without making screen-picking the primary workflow model.
- Add a bottom activity/evidence log area or placeholder region suitable for later route-specific evidence display.
- Replace or remove Figma demo state, stale labels, prototype-only controls, and static example artifacts.
- Preserve current working screens by nesting or routing them into the new shell rather than deleting functionality.
- Add fixture/static validation for the UI shell labels and current-action state wiring if feasible within the existing validation framework.
- Create the required WC03 Implementer Report.
- Confirm or update `AGENTS.md` with the corrected Implementer branch/review rule if it is not already present.

## Corrected Agent / Branch Review Rule To Incorporate

WC03 must include the corrected agent review workflow in the Implementer instructions and, if missing, in `AGENTS.md`.

The rule is:

```text
Implementers must not push Work Card implementation directly to master or dev unless the Work Card explicitly authorizes it.

Normal implementation work must happen on a feature branch created from dev.

Branch naming pattern:
feature/<phase-id>-<work-card-id>-<short-slug>

Example:
feature/phase-03-wc03-router-ui-shell

Architect review happens after the feature branch is pushed.

Only Architect/Operator-approved work may be merged into dev.

Implementers must not merge their own feature branch into dev unless the Work Card explicitly authorizes it.

master remains the stable baseline branch and must not receive direct Implementer pushes.
```

For WC03, use:

```text
feature/phase-03-wc03-router-ui-shell
```

The Implementer Report must say `Commit hash: pending until commit is created` if the report is committed in the same commit as the work. The final Implementer response must provide the actual commit hash and pushed branch.

## Out Of Scope

- Do not implement WC04 primary current-action panel refinements beyond what is needed for the shell foundation.
- Do not implement all route-specific screens in this pass.
- Do not rewrite the full app architecture.
- Do not delete current workflows or artifact screens unless replaced safely by shell routing.
- Do not create WC04 or later Work Cards.
- Do not create Operator validation records.
- Do not close Phase 03.
- Do not merge the feature branch into `dev`.
- Do not push to `master`.
- Do not add provider SDKs, cloud services, browser automation, auth, database, or LLM API calls.
- Do not commit large local design archives or zip files.

## Figma Source Handling

The Figma source is implementation input and visual/layout reference only. It is not process authority.

If a local Figma source package is present, inspect it as design input. If the package is not present or is intentionally ignored because it is too large for repo safety scanning, use the existing source files, prior screenshots, and Phase 03 Work Card Plan descriptions as the shell specification.

Do not commit bulky Figma zip/source archives unless explicitly approved.

Replace Figma prototype/demo behavior with live app state. Do not preserve fake sample data as authoritative workflow state.

## Required UI Shell Areas

### 1. Top Status Strip

Must show, at minimum:

- project/app identity
- active phase ID/title where available
- current Work Card ID/title where available
- current required action status
- responsible role
- warning count or warning indicator if warnings exist

### 2. Horizontal Workflow Rail

Must present the locked workflow left-to-right:

```text
Project Intake -> Project Interview -> Reconciliation Review -> Project Mapping -> Operator Project Approval -> Phase Mapping -> Operator Phase Approval -> Work Card Loop -> Phase Closeout -> Operator Phase Closeout Approval -> Roadmap Update -> Next Phase Activation -> Repeat Phase Mapping / Work Card Loop
```

The rail must visually distinguish current, completed, future, blocked, or warning states if that data is available. If full status is not available yet, it must at least highlight the current workflow step from WC02.

### 3. Current Required Action Area

Must display WC02 model fields including:

- action title
- summary
- reason
- responsible role
- status
- phase/work-card references
- expected output
- success route
- failure route
- repair route
- manual fallback
- warnings

### 4. Artifact Workspace

Must show relevant artifact paths from current-action state, including:

- source artifacts
- missing artifacts
- expected output path or artifact type

This region may be read-only in WC03. Editing and route-specific artifact actions belong to later Work Cards unless already safely available.

### 5. Context Inspector

Must show durable-state evidence behind the routed current action:

- source artifact list
- warning list
- stale/superseded artifact context
- manual fallback instructions

### 6. Subordinate Navigation / Manual Fallback

Must preserve access to existing screens. The router shell is primary; manual navigation is fallback/supporting navigation.

The UI should not trap the Operator if current-action state is incomplete or wrong.

### 7. Bottom Activity / Evidence Log Region

May be a placeholder in WC03, but the layout should reserve the area for later evidence/status events.

## Current-Action Integration Requirements

- Use the WC02 current required action IPC/preload path rather than duplicating state logic in the renderer.
- Renderer must not directly access the filesystem.
- If current-action state fails to load, show a clear fallback state with manual navigation access.
- If warnings exist, show them without treating all warnings as blockers.
- Stale validation-target references must not crash the shell.
- Superseded Phase 03 artifacts must be shown as context/warnings, not active authority.

## Acceptance Criteria

- The app has a workflow-router shell layout rather than only a screen picker.
- The shell displays live WC02 current required action data.
- The locked workflow appears left-to-right in the process rail.
- The current required action area displays action title, reason, role, status, expected output, routes, fallback, and warnings.
- Existing screens remain reachable through subordinate/manual navigation.
- Figma demo/static state is removed or clearly replaced by live app state.
- The shell does not implement WC04-WC15 route-specific scope prematurely.
- Renderer filesystem access is not broadened.
- Stale validation-target warnings do not crash the shell.
- Superseded Phase 03 artifacts remain warnings/context only.
- `AGENTS.md` contains the corrected Implementer feature-branch review rule, or the Implementer Report confirms it was already present.
- Work is committed and pushed only to the WC03 feature branch, not to `dev` or `master`.
- Required validation passes or skipped checks are documented.
- WC03 Implementer Report exists.

## Validation Expectations

- Read `docs/dev/VALIDATION_COMMAND_LANES.md` before validation.
- Run the appropriate normal Windows validation lane.
- Run TypeScript/type validation.
- Run build validation.
- Run tests relevant to renderer/state wiring if available.
- Run or update fixture/static validation for current-action shell labels/state wiring if feasible.
- Run local path/secrets/large-file safety scan before staging.
- Report any skipped validation with precise reason.
- Do not perform Operator validation.

## Risk Level

high

## Risks And Watch Items

- This pass changes the app’s primary layout model. It must preserve existing workflows while moving the router to the foreground.
- The Figma source is design input, not implementation authority. Avoid copying demo-state behavior directly.
- Do not turn WC03 into the full WC04-WC15 route-specific implementation pass.
- Keep the current-action state source centralized in WC02 model/IPC.
- Do not regress existing artifact screens while adding shell navigation.
- Avoid hiding manual fallback routes; the Operator still needs escape hatches.
- Feature-branch workflow must be followed to avoid unreviewed work landing directly on `dev`.

## Implementer Instructions

You are acting as Implementer for ChampCity A/I.

Codex does not have ChampCity MCP access. Do not claim to use MCP.

Target branch workflow:

1. Confirm current branch and remote.
2. Ensure `dev` is available and aligned with `origin/dev`.
3. Create and switch to feature branch:
   `feature/phase-03-wc03-router-ui-shell`
4. Implement WC03 only.
5. Run required validation.
6. Stage only WC03-scoped files.
7. Commit to the feature branch.
8. Push the feature branch to origin.
9. Do not merge into `dev`.
10. Do not push to `master`.

Before editing:

- Read `AGENTS.md`.
- Read `docs/dev/VALIDATION_COMMAND_LANES.md`.
- Read `docs/workflow/PROCESS_BASELINE.md`.
- Read the WC02 Implementer Report and Architect Review.
- Inspect the WC02 current-action model and IPC/preload wiring.
- Inspect existing renderer structure before replacing or moving UI.

Deliverable report path:

```text
planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC03_figma_workflow_router_ui_shell_integration.md
```

The report must include:

- feature branch name
- commit hash pending in report if same commit
- final response must include actual commit hash
- push status
- summary of UI shell changes
- files changed
- how WC02 current-action data is loaded
- how Figma source was used or why it was not available
- confirmation WC04-WC15 were not implemented
- validation commands and results
- skipped checks and reasons
- safety scan results
- remaining dirty/untracked files
- recommended next action

## Builder Handoff Prompt

```text
You are acting as Implementer for ChampCity A/I.

Work Card: WC03 — Figma Workflow Router UI Shell Integration

Target branch: feature/phase-03-wc03-router-ui-shell
Base branch: dev
Expected remote: ChampCityChris/ChampCity_AI
Repository root placeholder: <PROJECT_REPO>

Use this Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC03_figma_workflow_router_ui_shell_integration.md

Do not rely on chat context beyond this instruction.

Implement only WC03. Do not implement WC04-WC15. Do not merge to dev. Do not push to master.

Read AGENTS.md and docs/dev/VALIDATION_COMMAND_LANES.md before editing. Use the WC02 current required action model as live state input. Create and push the WC03 feature branch. Create the required Implementer Report when complete.
```
