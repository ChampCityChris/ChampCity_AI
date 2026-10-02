# RWS06J-B Implementer Report

**Card:** RWS06J-B — Remove Legacy App Workflow Ownership
**Repository root:** Verified as the approved ChampCity_AI Dev repository.
**Branch / remote:** `dev`; no push performed.
**Status:** B acceptance passed; checkpoint ready.
**Checkpoint commit:** Pending until staged commit completes.

## Implementation

- Replaced the 5,700-line mixed legacy/root controller with an application shell that owns Project selection and entry, Workflow inventory/open/start/routed handoff, Settings return context, optional Work Intake routing, Source Control, and global theme/sidebar chrome.
- Routed exact Workflow rendering through `StructuredWorkflowWorkspace`; Project Creation continues through its `GreenfieldWorkspace` dispatch. Optional Work Intake, Source Control, Settings, Landing, and the exact SQL Workflow stage rail remain reachable.
- Removed the Issue state machine, dormant Development/Greenfield callbacks and polling, legacy Markdown document/disposition controller, duplicated Phase/WorkItem/validation/repair/close presentation, and obsolete root browser eligibility wiring.
- Removed the Figma sidebar's Development lifecycle mode and its Current Phase/Work Card data props. Deleted the now-unreachable root-only Architect surface eligibility helper.
- Updated the existing renderer route/settings proofs for the app-shell state model and removed the obsolete root-only MCP handoff preflight test.

## Files

- `src/renderer/app/App.tsx` — replaced with app-shell ownership and structured routes.
- `src/renderer/app/figma/FigmaSidebar.tsx` — removed Development lifecycle display and model props.
- `src/renderer/app/architectSurfaceEligibility.ts` — deleted as unreachable after root workflow ownership removal.
- `test/renderer/workflow-hub-shell.test.cjs` — updated Workflow routing, shell stage rail, sidebar, and obsolete legacy proof.
- `test/renderer/work-intake-routed-workspaces.test.cjs` — updated exact routed Workflow handoff proof.
- `test/renderer/agent-harness-settings-workspace.test.cjs` — updated exact Settings return and stale-return proofs.
- `docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06J-B_IMPLEMENTER_REPORT.md` — this report.

## Proof and validation

- `npm run build` — normal Windows lane, passed; TypeScript, Vite, and asset copy completed. Renderer JS: 346.04 kB. The earlier sandboxed attempt returned `spawn EPERM`; the required normal-lane rerun passed.
- `node --test test/renderer/workflow-hub-shell.test.cjs test/renderer/work-intake-routed-workspaces.test.cjs test/renderer/agent-harness-settings-workspace.test.cjs` — normal Windows lane, passed **58/58**. The sandboxed attempt returned `spawn EPERM`; the normal-lane rerun passed.
- `git diff --check` — passed; Git printed line-ending conversion advisories only.
- Source search of production App/sidebar — no `activeIssueStageId`, Issue workspace, legacy Greenfield execution, direct Phase Map/Loop, WorkItem planning, execution, validation, close, or `NestedWorkflowRail` references remain.
- Settings return harness verified exact route/project preservation and stale-return cancellation. Routed Work Intake handoff verified exact target identity. Existing Hub/type/direct-start, Source Control, optional-WIR, structured Greenfield dispatch, and SQL stage-rail assertions passed.

## Git and safety

- No push, reset, clean, stash, restore, or historical Markdown edit was performed.
- The B changes contain no known secrets, concrete machine paths, or generated build output. The report uses repository-relative paths.
- Required checkpoint commit is `RWS06J-B remove legacy app workflow ownership`; commit hash will be reported after creation.

## Remaining work

- No B-specific blocker remains. C owns reachability-based deletion of obsolete workflow services/APIs/tests; D owns Project-wide structured authority activation; E owns final qualification.
- No visual acceptance claim is made for browser attach/resize/detach; those behaviors remain covered by the existing browser attachment suite and the active workspace browser host.
