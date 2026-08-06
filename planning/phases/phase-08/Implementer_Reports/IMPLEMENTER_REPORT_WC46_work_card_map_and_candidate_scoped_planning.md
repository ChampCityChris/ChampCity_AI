# IMPLEMENTER REPORT - WC46 Work Card Map and Candidate-Scoped Planning

Pass type: Numbered Work Card implementation revision  
Work Card: WC46 - Work Card Map and Candidate-Scoped Planning  
Repository path inspected: verified approved repo root  
Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`  
Remote: `origin https://github.com/ChampCityChris/ChampCity_AI.git`  
Working status at report time: modified and untracked files present; no Git mutation performed

## Implementation Summary

Revised the Work Card Map implementation after Architect review requested candidate-scope correction and the Operator reported that the Work Card Map workspace did not match the supplied Figma design.

The Work Card Map now follows the supplied Figma React source more closely. A deeper inspection of `ScreenWCSelection()` in the Figma export showed the expected workspace is a dual-pane surface: an ordered Work Card candidate map on the left and a selected Work Card document viewer on the right. The production renderer now uses that structure with dedicated `figma-work-card-map-*` classes in `src/renderer/styles.css`, a workspace-owned header, selected-candidate highlighting, status badges, and the top-right `Begin Planning` action.

The app-level generic document header is suppressed only for Work Card Map so the workspace can own the Figma header row. The right pane is backed by the selected candidate's formal Work Card document when it exists, with a Markdown fallback for not-yet-created candidates. It no longer presents the generic document selector, empty document slot, or generic handoff action.

The backend now keeps candidate scope through active planning resolution. Approved, fresh `work-card-intake-handoff` evidence with an unresolved Formal Work Card target is projected through:

`src/main/workCardIntake/workCardIntakeService.ts` -> `resolveActiveWorkCardPlanningHandoff(workspaceRoot, phaseId?)`

`src/main/currentWorkflow/currentWorkflowService.ts` and `src/main/architectOutputs/architectOutputWorkspaceService.ts` now use that exact handoff evidence for Work Card Planning instead of recomputing the implicit next candidate through `selectNextWorkCardCandidate()`.

The Work Card Map still exposes only two user-facing candidate statuses:

- `Complete`
- `Eligible`

Candidates that are neither complete nor eligible render without a named status badge and without a planning action.

## Files Created

- `src/renderer/app/WorkCardMapWorkspace.tsx`
- `test/renderer/work-card-map-workspace.test.cjs`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46_work_card_map_and_candidate_scoped_planning.md`

## Files Modified

- `src/main/architectOutputs/architectOutputWorkspaceService.ts`
- `src/main/currentWorkflow/currentWorkflowService.ts`
- `src/main/main.ts`
- `src/main/workCardIntake/workCardIntakeService.ts`
- `src/preload/index.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/NestedWorkflowRail.tsx`
- `src/renderer/app/WorkCardCloseWorkspace.tsx`
- `src/renderer/app/WorkCardMapWorkspace.tsx`
- `src/renderer/styles.css`
- `src/shared/workspaceContracts.ts`
- `test/app-shell/app-shell.test.cjs`
- `test/lifecycle/nested-lifecycle.test.cjs`
- `test/renderer/figma-redesign-shell.test.cjs`
- `test/renderer/project-rail-presentation.test.cjs`
- `test/renderer/work-card-close-workspace.test.cjs`
- `test/renderer/work-card-map-workspace.test.cjs`
- `test/repository/runtime-wiring-source.test.cjs`
- `test/work-card-intake/work-card-intake-service.test.cjs`
- `test/workflow/current-execution-context.test.cjs`

## Files Deleted

- `src/renderer/app/WorkCardSelectionWorkspace.tsx`
- `test/renderer/work-card-selection-workspace.test.cjs`

## Files Intentionally Not Created

- No JSON sidecar.
- No hidden selected-candidate state file.
- No route token.
- No close acknowledgement file.
- No closeout document.
- No alternate map persistence.
- No validation record or disposition mutation.
- No dependency, database, cloud service, provider SDK, or authentication integration.

## Proof Notes

- Work Card Map projection path: `getWorkCardMapProjection(workspaceRoot, phaseId)` in `src/main/workCardIntake/workCardIntakeService.ts`.
- Candidate-scoped Begin Planning API path: `beginWorkCardPlanning(phaseId, candidateId)` in `src/shared/workspaceContracts.ts`, `src/preload/index.ts`, `src/main/main.ts`, `src/main/currentWorkflow/currentWorkflowService.ts`, and `beginWorkCardPlanningForCandidate()` in `src/main/workCardIntake/workCardIntakeService.ts`.
- Active planning resolver path: `resolveActiveWorkCardPlanningHandoff(workspaceRoot, phaseId?)` in `src/main/workCardIntake/workCardIntakeService.ts`.
- Figma source alignment path: `src/renderer/app/WorkCardMapWorkspace.tsx` now mirrors the Figma `ScreenWCSelection()` dual-pane structure, including the candidate map and selected Work Card document viewer.
- Selected document projection path: `formalWorkCardDocument` in `src/shared/workspaceContracts.ts` and `formalWorkCardDocumentForTarget()` in `src/main/workCardIntake/workCardIntakeService.ts` provide the right-hand viewer with the current Formal Work Card body when available.
- Workspace header path: `src/renderer/app/App.tsx` suppresses the generic header for `phase-work-card-selection`, leaving the Work Card Map screen to render the Figma-style title and action row.
- Architect-output Work Card Planning target path: `exactWorkCardPlanningHandoff()` in `src/main/architectOutputs/architectOutputWorkspaceService.ts` now uses active handoff evidence, not implicit next-candidate selection.
- Multiple simultaneous Eligible candidates are covered by `candidate-scoped Begin Planning keeps a later simultaneously eligible candidate active`.
- That regression proves WC02 can be selected while WC01 is also Eligible, and that `getCurrentWorkspaceModel()` and `getArchitectOutputWorkspaceModel("work-card-planning")` both target WC02.
- Open Work Card Build/Review/Repair lifecycle is preserved by `phaseHasOpenWorkCardLifecycle()`, which prevents the map from preempting an already-created Formal Work Card that still lacks Approved validation evidence.
- All-complete routes toward Phase Validation through the map projection's `phaseValidationWorkspaceId`.
- `RevisionRequested` repair routing is preserved by the focused and full workflow tests.
- No hidden state or alternate persistence was created; the only Begin Planning artifact is the normal `work-card-intake-handoff`.

## Commands Run And Results

- `pwd` - passed; verified approved repo root.
- `git status --short --branch` - passed; read-only status check.
- `git remote -v` - passed; remote verified as `origin`.
- `Get-Content docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` - passed; governing boundary read.
- `Get-Content docs/dev/VALIDATION_COMMAND_LANES.md` - passed; validation lane read.
- `Get-Content planning/phases/phase-08/Work_Cards/WC46_work_card_map_and_candidate_scoped_planning.md` - passed; Work Card read.
- `Get-Content planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46_work_card_map_and_candidate_scoped_planning.md` - passed; revision request read.
- `tar -tf planning/"Redesign UI for Electron App.zip"` - passed; supplied Figma export inspected.
- `tar -xOf planning/"Redesign UI for Electron App.zip" src/app/App.tsx` - passed; supplied Figma React source inspected.
- `npx tsc --noEmit` - passed in direct clean-room lane.
- `npx tsc` - passed in direct clean-room lane.
- Focused `node --test --test-concurrency=1 test/work-card-intake/work-card-intake-service.test.cjs test/workflow/current-execution-context.test.cjs test/renderer/work-card-map-workspace.test.cjs` - sandbox lane failed with documented `spawn EPERM`; normal Windows lane passed 17 tests.
- Final focused `node --test --test-concurrency=1 test/renderer/work-card-map-workspace.test.cjs` - normal Windows lane passed 3 tests after the dual-pane correction.
- `npx vite build` - sandbox lane failed with documented esbuild `spawn EPERM`; normal Windows lane passed, 1620 modules transformed.
- Full `node --test --test-concurrency=1` - normal Windows lane passed 270 tests.
- Scoped safety scan over changed files for concrete local paths and secret-like markers - passed; matches were expected prose markers and a pre-existing WC45 CSS comment, not secrets or local paths.

## Validation Performed

- Static typecheck: passed.
- TypeScript compile to `dist/`: passed.
- Renderer production bundle: passed in normal Windows lane after sandbox `spawn EPERM`.
- Focused WC46 tests: passed, 17 tests.
- Final Work Card Map renderer test: passed, 3 tests.
- Full Node test lane: passed, 270 tests.
- Source and safety checks: passed for scoped changed files.

## Validation Skipped

- Operator manual validation was not performed by the Implementer. Manual acceptance remains Operator-owned.
- Electron launch smoke was not performed because WC46 prohibits Git mutation but does not explicitly authorize Implementer launch smoke, and the requested repair was validated through automated product-path tests and production renderer build.

## Git Actions

No Git mutation occurred. No checkout, branch creation, pull, rebase, stage, commit, push, reset, clean, stash, merge, or tag was performed.

Commit hash: not applicable; commit was not created and Git mutation is prohibited by WC46.

## Security And Secret-Safety Notes

No secrets, credentials, API keys, password values, token values, `.env` contents, cookies, private keys, or concrete local machine paths were added. Durable report paths are repo-relative. Renderer filesystem authority remains absent; candidate-scoped writes are mediated through main/preload IPC and repository services.

## Manual Validation Required

Operator must validate in the running application:

1. Confirm the Work Card Map visually matches the supplied Figma design: dual-pane layout, left candidate map, right selected Work Card document viewer, compact cards, no generic document selector.
2. Complete WC01 with `Validate Passed`.
3. Click `Return to Phase Building / Next Work Card`.
4. Confirm the app opens Work Card Map.
5. Confirm WC01 shows `Complete`.
6. Confirm WC02 shows `Eligible`.
7. Select WC02 and click the top-right `Begin Planning` action.
8. Confirm Work Card Planning opens for WC02 and does not display WC01 as the current planning document.
9. Complete all Work Cards in a test phase or fixture and confirm Work Card Map routes toward Phase Validation, not Phase Intake.
10. Confirm `Request Repair` still routes to Work Card Repair.

## Residual Risks

- If multiple unresolved approved intake handoffs exist, active planning resolution is deterministic from current repository handoff evidence and Work Card Plan order. Automated coverage proves the Architect-requested later-candidate case.
- Automated tests and production build prove structure and bindings, but final visual equivalence to the Figma design remains Operator manual validation.

## Blocking Questions

None.

## Recommended Next Implementer Task

Architect review of this revised Implementer Report, followed by Operator manual validation of the running Work Card Map flow.

Document.Status=Pending
