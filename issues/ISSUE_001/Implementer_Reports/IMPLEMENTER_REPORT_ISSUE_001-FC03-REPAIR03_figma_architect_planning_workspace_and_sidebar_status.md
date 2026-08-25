# IMPLEMENTER REPORT: ISSUE_001-FC03-REPAIR03 Figma Architect Planning Workspace and Sidebar Status

## Pass Type

Repair pass for `ISSUE_001-FC03-REPAIR03`.

## Repository Path Inspected

Verified approved repo root.

## Git Branch And Remote Status

- Branch inspected: `feature/phase-04-wc01-repair01-evidence-derived-workflow`
- Remote inspected: `origin/feature/phase-04-wc01-repair01-evidence-derived-workflow`
- Git mutation: not performed; this repair explicitly forbids Git mutation.
- Commit created: no
- Commit hash: not applicable

## Root Cause

`IssueArchitectPlanningWorkspace` used a bespoke stacked Issue status/dashboard layout instead of the retained Figma Architect document/chat composition. Issue Architect controls were presented in the left status stack, no Issue-specific Figma-style disposition panel was available for awaiting-review investigations, and the selected Issue sidebar lacked the REPAIR02 service-projected stage/state.

## Files Modified

- `src/renderer/app/IssueArchitectPlanningWorkspace.tsx`
- `src/renderer/app/App.tsx`
- `src/renderer/styles.css`
- `test/renderer/issue-architect-planning-workspace.test.cjs`

## Files Created

- `issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC03-REPAIR03_figma_architect_planning_workspace_and_sidebar_status.md`

## Files Intentionally Not Created

- No Work Card JSON sidecars.
- No new migration utilities.
- No new FC04+ lifecycle artifacts.
- No new package or dependency files.

## Implementation Summary

Recomposed Issue Architect Planning into the retained Figma workspace grammar:

- The main workspace now uses `figma-doc-chat-workspace`, `figma-doc-review-column`, `figma-document-card`, `figma-browser-column`, and `figma-browser-actions-panel`.
- The left pane presents Issue evidence as a scrollable document surface rather than a status dashboard.
- Before a final investigation exists, the active document is `ISSUE_RECORD.md`.
- After a final investigation exists, `ARCHITECT_INVESTIGATION.md` is selected by default while an `Issue Record` tab remains available.
- The old primary body fact grid/status-card pattern is removed from the Issue Architect workspace.
- A compact non-authoritative status line remains, sourced from the service projection.

Added Issue Architect review UI wiring:

- Awaiting-review state renders a `figma-disposition-panel` below the document pane.
- The panel exposes disposition selection, review notes, `Apply Review`, workflow step, effective disposition, recommendation, investigation path, review path, and Issue Planning eligibility.
- Review submission calls the REPAIR02 Issue Architect review action through `window.champcity.applyIssueArchitectReview`.
- No Development Architect disposition authority is reused.

Moved operational actions to the right Architect action area:

- `Reload ChatGPT`, `Prepare Handoff`, `Copy Handoff`, `Promote Draft`, and `Refresh` are rendered in the browser action panel when relevant to the current projection.
- Handoff actions are hidden during pure awaiting-review state instead of duplicated in the left document pane.

Preserved sidebar projection behavior:

- `App.tsx` continues passing the selected Issue workflow status projection into `FigmaSidebar`.
- `FigmaSidebar` consumes the REPAIR02-projected selected Issue stage/state rather than deriving it from the clicked rail button.

Preserved REPAIR01 browser sizing:

- The Issue Architect browser column keeps the post-collapse override for substantial browser height.
- Responsive layout stacks the two major columns at narrow widths without reducing the browser host to the earlier shallow strip.

## Validation Performed

- `npm run typecheck`
  - Result: passed
  - Lane: sandbox lane

- `npm run build`
  - Initial sandbox result: failed with known child-process `spawn EPERM` mode
  - Rerun result: passed
  - Lane: normal Windows validation lane after sandbox false-failure mode

- `node --test test/renderer/issue-architect-planning-workspace.test.cjs`
  - Result: passed, 4/4 tests
  - Lane: normal Windows validation lane

- `node --test test/renderer/issue-resolution-shell.test.cjs`
  - Result: passed, 4/4 tests
  - Lane: normal Windows validation lane

- `node --test test/renderer/figma-redesign-shell.test.cjs`
  - Result: passed, 8/8 tests
  - Lane: normal Windows validation lane

- `node --test test/browser/architect-browser-handoff.test.cjs`
  - Result: passed, 1/1 test
  - Lane: normal Windows validation lane

## Validation Skipped And Reason

- Full `npm test` was not rerun for this repair after the targeted required lane passed. A previous broad run in this repair sequence still had unrelated residual failures outside REPAIR03 scope:
  - `test/renderer/work-card-building-review-workspace.test.cjs`: `App Implement workspace navigation effect polls status without auto-starting Codex`
  - `test/repository/runtime-wiring-source.test.cjs`: `one generic Architect-output IPC and preload contract serves all catalog workspaces`
- Operator visual/live validation was not performed by the Implementer. Per project rules, final visual acceptance and live workflow acceptance remain Operator-owned.

## Commands Run And Results

- `git status --short --branch`
  - Result: inspected current branch and dirty worktree; existing unrelated modified/untracked files remain present.

- `git diff --stat`
  - Result: inspected changed-file summary.

- Local path and credential-pattern safety scan
  - Result: no credentials or concrete local machine paths found in touched implementation/test files; one existing CSS comment matched a broad theme-word pattern and was reviewed as non-sensitive.

- `npm run typecheck`
  - Result: passed.

- `npm run build`
  - Result: passed on normal Windows validation lane after sandbox `spawn EPERM`.

- Required focused Node test commands listed under Validation Performed
  - Result: passed.

## Security And Credential-Safety Notes

- No credentials, API keys, private authentication material, or environment files were added.
- No new filesystem authority was introduced.
- No renderer-local persistence or MCP/provider integration was added.
- Durable report content uses `<PROJECT_REPO>`/repo-relative language and does not record concrete local machine paths.

## Deviations

- None from the repair scope.
- Git staging, commit, and push were intentionally not performed because the repair forbids Git mutation.

## Manual Validation Required

Operator should rerun FC03 visual/live validation and confirm:

- Normal desktop layout shows the Issue Architect document/review column and right embedded ChatGPT/action column.
- Narrow layout stacks the two major columns while preserving a usable browser host.
- Switching between multiple Issues updates the sidebar `Current Issue` stage/state from the selected Issue projection.
- Awaiting-review investigations expose the Issue-specific disposition panel and service-owned review behavior.
- Development Figma Architect workspaces remain visually and behaviorally unchanged.

## Residual Risks

- Automated renderer SSR tests verify markup/classes and action placement, but they do not replace live Electron/browser visual acceptance.
- Broad repository validation still has known residual failures outside this repair scope, listed under skipped validation.
- Existing unrelated dirty worktree files were not reviewed or altered unless they intersected this repair.

## Recommended Next Implementer Task

Return to parent FC03 review and rerun the remaining FC03 Operator validation before proceeding to FC04.
