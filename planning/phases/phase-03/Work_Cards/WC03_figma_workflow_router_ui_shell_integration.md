<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC03_figma_workflow_router_ui_shell_integration",
  "artifactType": "work_card",
  "createdAt": "2026-07-03T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC03_figma_workflow_router_ui_shell_integration.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC03_figma_workflow_router_ui_shell_integration.md",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: WC03 — Figma Workflow Router UI Shell Integration"
  },
  "payloadHash": "sha256:06a0199fc1463aeb7c9a47527e1bd4014c5582d4e6bddc0a7e48cf8cffc132ba",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC03",
      "champcity-ai/phase-03/implementer_report/WC03",
      "champcity-ai/phase-03/validation_report/WC03"
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

# Work Card: WC03 — Figma Workflow Router UI Shell Integration

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Revision: 2 — source-code-first rewrite

## Operator Correction

The previous WC03 version is superseded. WC03 is not a prose-based design interpretation task.

The Implementer must use the checked-in phase source package as the UI authority:

`planning/phases/phase-03/Figma_Source/Design Dark UI for ChampCity.zip`

The Implementer must not recreate, approximate, reinterpret, or redesign the Figma UI from written descriptions, screenshots, or memory. If the source package is missing, unreadable, or does not contain the expected React source files, the Implementer must stop as blocked and report that the mandatory source package is unavailable.

## Purpose

Import the provided dark workflow-router UI source design into the real ChampCity A/I Electron/React application with maximum visual fidelity, then connect the shell to the WC02 current required action model only where needed to replace demo/static workflow state.

## Source Authority

Use these project artifacts as process authority:

- `planning/phases/phase-03/Work_Card_Plan.md`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC02_durable_current_required_action_model.md`
- `planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC02_durable_current_required_action_model.md`
- `docs/workflow/PROCESS_BASELINE.md`

Use this package as visual/source-code authority:

- `planning/phases/phase-03/Figma_Source/Design Dark UI for ChampCity.zip`

## Mandatory Source Package Handling

The source package is implementation input for WC03. Do not commit a second copy of the archive. Do not move it unless required by the existing repo structure. Do not treat screenshots or prose as a substitute for the package.

Known expected package contents include a Vite/React export with `src/app/App.tsx`, `src/main.tsx`, `src/app/components`, `src/styles`, and `src/imports` assets. The Implementer must inspect the actual package before editing application code and must report the files inspected.

## 1:1 Import Standard

For WC03, 1:1 import means:

- use the provided source code as the starting implementation;
- preserve source layout hierarchy, dark theme, typography intent, spacing, cards, panels, borders, icons, density, and relative placement as closely as the current app stack allows;
- import/adapt source components, styles, and assets rather than rebuilding the UI from prose;
- replace demo/static workflow state only where it would misrepresent the real application state;
- document every unavoidable visual or technical deviation in the Implementer Report.

## Included Scope

- Import or adapt the source-code UI shell into the existing Electron/React renderer.
- Preserve the source design’s major shell regions: top status strip, left-to-right workflow rail, current action area, artifact workspace, context/evidence region, subordinate navigation/manual fallback, and bottom evidence/activity area.
- Use WC02 current required action IPC/preload wiring as live data input after the visual shell is imported.
- Preserve existing application screens as subordinate/manual fallback navigation.
- Ensure stale validation-target references do not crash the shell.
- Ensure superseded Phase 03 artifacts appear only as warning/context, not active authority.
- Update or confirm `AGENTS.md` includes the feature-branch review rule below.
- Create the required WC03 Implementer Report.

## Out of Scope

- Do not implement WC04-WC15 route-specific behavior except narrow live-state wiring needed to prevent static/demo authority.
- Do not create a prose-based UI approximation.
- Do not proceed if the source package is unavailable.
- Do not create Operator validation records.
- Do not close Phase 03.
- Do not merge the feature branch into `dev`.
- Do not push to `master`.
- Do not add provider SDKs, cloud services, browser automation, auth, database, or LLM API calls.

## Branch and Review Rule

Base branch: `dev`

Implementation branch: `feature/phase-03-wc03-router-ui-shell`

The Implementer must create the feature branch from `dev`, commit WC03 work to that feature branch, and push the feature branch to origin. The Implementer must not push WC03 directly to `dev` or `master`, and must not merge the feature branch into `dev`. Architect review happens after the pushed feature branch and Implementer Report are available.

If the Implementer Report is committed in the same commit as the work, it must say `Commit hash: pending until commit is created`. The final Implementer response must provide the actual commit hash and pushed branch.

## Acceptance Criteria

- The source package was opened and inspected before implementation.
- The implementation imports/adapts the source UI rather than reconstructing the design from prose.
- The app displays a workflow-router shell visually faithful to the provided source design.
- Major shell areas from the source design are preserved.
- WC02 current required action data appears in the shell where needed to avoid demo/static authority.
- Existing screens remain reachable through subordinate/manual fallback navigation.
- Renderer filesystem access is not broadened.
- Stale validation-target warnings do not crash the shell.
- Superseded Phase 03 artifacts remain warning/context only.
- Work is committed and pushed only to `feature/phase-03-wc03-router-ui-shell`.
- WC03 Implementer Report exists.
- Validation results, skipped checks, safety scan results, and visual deviations are documented.

## Validation Expectations

- Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before editing.
- Run the appropriate normal Windows validation lane.
- Run TypeScript/type validation and build validation.
- Run tests relevant to renderer/current-action wiring if available.
- Run local safety scans before staging.
- Confirm no duplicate design archive, secrets, environment files, build outputs, or unrelated files were staged.
- Do not perform Operator validation.

## Operator Validation Focus

Operator validation for WC03 should be visual and behavioral. Validate that the result visibly matches the provided source-code design closely enough to count as a source-code import/adaptation, not a prose-based approximation. Also validate that the app starts, existing screens remain reachable, current-action data appears, manual fallback navigation remains available, no demo/static labels act as workflow authority, and WC04-WC15 behavior was not prematurely implemented.

## Required Implementer Report

Create:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC03_figma_workflow_router_ui_shell_integration.md`

The report must include:

- feature branch name;
- confirmation the source package was available;
- exact source files inspected;
- source-code import/adaptation summary;
- files changed;
- how WC02 current-action data is loaded;
- mapping of imported styles, components, and assets;
- unavoidable visual or technical deviations from the source package;
- confirmation WC04-WC15 were not implemented;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action.

## Implementer Handoff

You are acting as Implementer for ChampCity A/I.

Work Card: WC03 — Figma Workflow Router UI Shell Integration
Revision: 2 — source-code-first rewrite

Base branch: `dev`
Target branch: `feature/phase-03-wc03-router-ui-shell`
Expected remote: `ChampCityChris/ChampCity_AI`

Use this Work Card as the source of truth:
`planning/phases/phase-03/Work_Cards/WC03_figma_workflow_router_ui_shell_integration.md`

Mandatory source package:
`planning/phases/phase-03/Figma_Source/Design Dark UI for ChampCity.zip`

This is a source-code-first 1:1 UI import task. Do not interpret the Figma design from words. Inspect the source package before editing. If the package is missing or unreadable, stop as blocked.

Implement only WC03. Do not implement WC04-WC15. Do not merge to `dev`. Do not push to `master`. Create and push the WC03 feature branch. Create the required Implementer Report when complete.
