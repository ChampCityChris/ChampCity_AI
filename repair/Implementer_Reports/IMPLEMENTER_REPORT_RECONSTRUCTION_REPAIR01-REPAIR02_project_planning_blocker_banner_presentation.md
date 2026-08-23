# Implementer Report: RECONSTRUCTION_REPAIR01-REPAIR02 Project Planning Blocker Banner Presentation

## Pass Type

Repair pass for `RECONSTRUCTION_REPAIR01-REPAIR02_project_planning_blocker_banner_presentation`.

## Repository Path Inspected

Verified approved repo root: `<PROJECT_REPO>`.

## Git Branch And Remote Status

- Branch inspected: `feature/phase-04-wc01-repair01-evidence-derived-workflow`
- Remote inspected: `origin https://github.com/ChampCityChris/ChampCity_AI.git`
- Git mutation performed: none. The repair card forbids commit, stage, push, branch switch, merge, rebase, or reset.
- Worktree note: the repository already contained broad unrelated deletions, untracked planning/repair artifacts, and prior in-progress source changes before this pass. This pass did not revert unrelated work.

## Files Created

- `test/renderer/project-planning-blocker-banner.test.cjs`
- `repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR02_project_planning_blocker_banner_presentation.md`

## Files Modified

- `src/renderer/app/App.tsx`
- `src/renderer/styles.css`

## Files Intentionally Not Created

- No generic governance, policy, approval, or validation banner framework.
- No new Project Planning state resolver.
- No migration or compatibility utility.
- No Work-Card JSON sidecar.
- No main-process Project Planning authority file.

## Implementation Summary

Added `ProjectPlanningBlockerBanner` as a dedicated renderer presentation component in `src/renderer/app/App.tsx`.

The banner renders only when:

`activeWorkspaceId === "project-planning-review"` and `projectPlanningModel.state` is `not-ready` or `needs-attention`.

The component consumes these authoritative fields directly from `projectPlanningModel`:

- `state`
- `reason`
- `requiredAction`
- `evidencePaths`

It does not call a lifecycle resolver, inspect documents, inspect `selectedDocument`, infer from disabled controls, or consume `architectOutputModel` as an independent Project Planning authority.

## Exact Banner Location

The live render order in `src/renderer/app/App.tsx` is:

`workspace-surface` -> `workspace-header` -> `ProjectPlanningBlockerBanner` -> `figma-doc-chat-workspace`.

This places the banner directly under the `Project Plan and Roadmap Review` header and directly above the Project Profile/Roadmap plus embedded ChatGPT split-pane.

## Presentation Behavior

- Heading is exactly `Project Planning Needs Attention`.
- The exact authoritative `projectPlanningModel.reason` is rendered without summarizing or replacing it.
- A distinct `projectPlanningModel.requiredAction` renders as `Required action: <requiredAction>`.
- If `requiredAction.trim()` equals `reason.trim()`, the reason is rendered once and no duplicate required-action line appears.
- Evidence paths are filtered to non-empty entries, displayed as secondary monospaced text, and capped at three before disclosure.
- When more than three evidence paths exist, the banner renders `Show N more`; activating it reveals the remaining paths and can show `Show less`.
- Disclosure state is local presentation state only and does not affect lifecycle state or handoff eligibility.
- For non-blocked states and other workspaces, the component returns `null` and consumes no layout space.

## REPAIR01 Authority Preservation

REPAIR01 single-authority behavior remains intact:

- `getProjectPlanningWorkspaceModel()` remains the sole Project Planning lifecycle authority.
- The direct `projectPlanning:getWorkspaceModel` IPC/preload path remains unchanged.
- The renderer top rail still consumes `projectPlanningModel.railStatus`.
- `deriveProjectLifecycleRailStatuses()` still receives `projectPlanningStatus` instead of deriving Project Planning independently.
- The deleted duplicate Project Planning rail helpers remain absent.
- The existing Project Planning handoff button remains controlled by the current Architect-output projection backed by the authoritative Project Planning model.

## Commands Run And Results

- `node --check test/renderer/project-planning-blocker-banner.test.cjs`: passed in sandbox lane.
- `node --test --test-concurrency=1 test/renderer/project-planning-blocker-banner.test.cjs`: sandbox lane failed with documented `spawn EPERM`; normal Windows lane passed, 9 tests passed.
- `npm run typecheck`: passed in sandbox lane.
- `npm run build`: sandbox lane failed with documented Vite/esbuild `spawn EPERM`; normal Windows lane passed.
- `node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs test/renderer/project-rail-presentation.test.cjs test/renderer/document-review-surface-source.test.cjs test/renderer/architect-output-workspace-source.test.cjs test/reconstruction/reconstruction-repair01.test.cjs test/renderer/project-planning-blocker-banner.test.cjs`: normal Windows lane passed, 69 tests passed.
- `git diff --check -- src/renderer/app/App.tsx src/renderer/styles.css test/renderer/project-planning-blocker-banner.test.cjs repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR02_project_planning_blocker_banner_presentation.md`: passed, with line-ending warnings only for pre-existing LF/CRLF handling in modified renderer files.
- Targeted local path and sensitive-material scan over changed source/test/report files: no concrete local machine paths or secret values found. Matches were false positives from this report's safety wording, source-test regular expressions, color literals, and an existing CSS comment.
- `git status --short -- <repair changed files>`: inspected; expected modified renderer files and untracked new test/report files only.

## Validation Performed

- TypeScript typecheck.
- Production build.
- Focused Project Planning service, project rail, document review source, Architect-output source, reconstruction, and blocker-banner renderer tests.
- Whitespace and targeted sensitive-material/local-path scan on repair-touched files.
- New regression verifies:
  - dedicated `ProjectPlanningBlockerBanner` exists,
  - direct `projectPlanningModel.reason` consumption,
  - header -> banner -> `figma-doc-chat-workspace` source order,
  - active Project Planning plus `not-ready` / `needs-attention` condition,
  - no banner for `ready-for-handoff` or non-Project Planning workspaces,
  - exact reason rendering,
  - duplicate reason/required-action suppression,
  - initial evidence cap at three paths,
  - disclosure control source path,
  - no implementation in Browser Actions or lower split-pane placement,
  - deleted duplicate Project Planning rail helpers remain absent.

## Validation Skipped And Reason

- Full `npm test` was not run because the repair card specified the focused validation lane and this pass did not expand beyond authorized renderer scope.
- Electron launch smoke was not run because the repair card reserves the live visual confirmation for Operator validation after Architect review.
- Operator manual validation was not performed. Operator acceptance remains outside Implementer authority.

## Git Actions Performed

- No staging.
- No commit.
- No push.
- Commit hash: none, because the repair card forbids Git mutation.

## Sensitive-Material Notes

No secrets, tokens, credentials, `.env` content, or concrete local machine paths were added. Durable paths in this report are repo-relative or use `<PROJECT_REPO>`.

## Deviations Or Blockers

- No functional deviations from the repair card.
- Validation required normal Windows lane reruns for documented `spawn EPERM` sandbox failures in Node test runner and Vite/esbuild build execution.

## Manual Validation Required

After Architect review passes, Operator should:

- Confirm clean reconstruction Project Planning remains `Ready`, shows no blocker banner, leaves no empty banner gap, and keeps `Prepare Project Planning Handoff` enabled.
- Confirm a genuine blocked Project Planning state shows one amber banner directly under `Project Plan and Roadmap Review` and above the Project Profile/Roadmap plus ChatGPT split-pane.
- Confirm the banner displays the exact blocker reason, shows distinct required action only when different, and discloses additional evidence paths correctly.
- Confirm `Prepare Project Planning Handoff` remains disabled from the existing authority when blocked.

## Residual Risks

- The repository has unrelated dirty and untracked files outside this repair. They were left untouched.
- The new banner regression includes source-order assertions plus direct component rendering, but final visual placement remains subject to Operator live validation.

## Recommended Next Implementer Task

Return this repair for Architect code review, then Operator live validation.
