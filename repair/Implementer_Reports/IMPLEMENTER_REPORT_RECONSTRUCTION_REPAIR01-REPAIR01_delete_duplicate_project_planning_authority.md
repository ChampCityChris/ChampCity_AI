# Implementer Report: RECONSTRUCTION_REPAIR01-REPAIR01 Delete Duplicate Project Planning Authority

## Pass Type

Repair pass for `RECONSTRUCTION_REPAIR01-REPAIR01_delete_duplicate_project_planning_authority`.

## Repository Path Inspected

Verified approved repo root: `<PROJECT_REPO>`.

## Git Branch And Remote Status

- Branch inspected: `feature/phase-04-wc01-repair01-evidence-derived-workflow`
- Remote inspected: `origin https://github.com/ChampCityChris/ChampCity_AI.git`
- Git mutation performed: none. The repair card forbids commit, stage, push, branch switch, merge, rebase, or reset.
- Worktree note: the repository already contained broad unrelated deletions/untracked planning artifacts and prior in-progress source changes. This pass did not revert unrelated work.

## Files Created

- `repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR01_delete_duplicate_project_planning_authority.md`

## Files Modified

- `src/shared/workspaces/projectLifecycleRailStatus.ts`
- `src/shared/workspaceContracts.ts`
- `src/preload/index.ts`
- `src/main/main.ts`
- `src/renderer/app/App.tsx`
- `test/renderer/project-rail-presentation.test.cjs`
- `test/reconstruction/reconstruction-repair01.test.cjs`

## Files Intentionally Not Created

- No replacement duplicate Project Planning rail helper.
- No compatibility fallback or legacy Project Planning rail reader.
- No Work-Card JSON sidecar.
- No migration utility.

## Implementation Summary

Deleted the duplicate Project Planning lifecycle authority from `src/shared/workspaces/projectLifecycleRailStatus.ts`.

Removed these superseded Project Planning helper paths from the shared top-rail service:

- `deriveProjectPlanningRailStatus`
- `projectPlanningContextFromSummaries`
- `projectPlanningTargets`
- `bundleState`
- `hasSourceRevision`
- `defaultInterviewTarget`
- `projectSlugFromInterview`
- `analyzeProjectIntakeCorpus` import

Changed `deriveProjectLifecycleRailStatuses()` so Project Planning status is an explicit input:

`projectPlanningStatus: ProjectLifecycleRailStatus`

The remaining shared top rail service now consumes Project Planning lifecycle state and only derives downstream status from that supplied state.

## Authority Path After Repair

Rail authority:

`src/main/projectPlanning/projectPlanningService.ts#getProjectPlanningWorkspaceModel()` -> `projectPlanning:getWorkspaceModel` main IPC handler -> preload `getProjectPlanningWorkspaceModel()` -> renderer `refreshProjectPlanningWorkspaceModel()` -> `projectPlanningModel.railStatus` -> `deriveProjectLifecycleRailStatuses(..., { projectPlanningStatus })`.

Active workspace and action-panel projection:

`getArchitectOutputWorkspaceModel(..., "project-planning-review")` still uses the Project Planning domain overlay backed by `getProjectPlanningWorkspaceModel()`. The generic Architect-output model remains a transparent projection for Project Planning controls, reason, required action, evidence paths, and handoff eligibility.

The old `App.tsx` active-workspace override can no longer write `project-planning-review` into the top rail. The remaining switch only applies active Architect-output projection to `architect-interview`, `project-phase-map`, and `phase-interview`.

## Commands Run And Results

- `rg` inspections over repair card authority paths and renderer rail override: passed.
- `npm run typecheck`: passed in sandbox lane.
- `npm run build`: sandbox lane failed with documented `spawn EPERM`; normal Windows lane passed.
- `node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs test/renderer/project-rail-presentation.test.cjs test/renderer/document-review-surface-source.test.cjs test/renderer/architect-output-workspace-source.test.cjs test/reconstruction/reconstruction-repair01.test.cjs`: sandbox lane failed with documented `spawn EPERM`; normal Windows lane passed, 60 tests passed.
- `git diff --check -- <repair changed files>`: passed, with line-ending warnings only.
- Local safety scan over repair-changed source/test/report surfaces: no concrete local machine paths found; environment variable names in pre-existing Agent Harness code were identified as non-sensitive configuration references.
- `git status --short`: inspected; no staging or commit performed.

## Validation Performed

- TypeScript typecheck.
- Production build.
- Targeted Project Planning, renderer source, document review, Architect-output source, and reconstruction repair tests.
- Source-level tests now assert:
  - direct Project Planning IPC route exists,
  - renderer top rail consumes `projectPlanningModel.railStatus`,
  - renderer active Architect-output switch does not include `project-planning-review`,
  - shared rail service no longer contains the deleted duplicate Project Planning helper names.
- Reconstruction test now asserts a true greenfield/source-evidence Project Planning blocker is identical across:
  - authoritative Project Planning model,
  - top rail supplied status,
  - generic Project Planning active workspace projection.

## Validation Skipped And Reason

- Full `npm test` was not run because the repair card specified the targeted Node test lane above and this pass did not make a release tag.
- Operator manual validation was not performed. Operator acceptance remains outside Implementer authority.

## Git Actions Performed

- No staging.
- No commit.
- No push.
- Commit hash: none, because the repair card forbids Git mutation.

## Sensitive-Material Notes

No sensitive material was added. No concrete local machine paths were written into this report.

## Blocking Questions

None.

## Manual Validation Required

Operator should review the app behavior with a repository where Project Planning is blocked by the existing-source/greenfield mismatch and confirm the Project Planning rail, action panel, and diagnostic message all show the same authoritative blocker.

## Residual Risks

- The repository has unrelated dirty and untracked files outside this repair. They were left untouched.
- The generic Project Planning active workspace projection is intentionally retained for UI controls, but it is backed by the same authoritative Project Planning model.

## Recommended Next Implementer Task

Independent verification should inspect `src/shared/workspaces/projectLifecycleRailStatus.ts`, `src/renderer/app/App.tsx`, and `src/main/architectOutputs/architectOutputWorkspaceService.ts` to confirm no second Project Planning lifecycle authority remains.
