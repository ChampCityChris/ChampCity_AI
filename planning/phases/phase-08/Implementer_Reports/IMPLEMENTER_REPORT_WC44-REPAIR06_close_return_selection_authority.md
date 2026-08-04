# Implementer Report: WC44-REPAIR06 Close Return Selection Authority

Pass type: Numbered Work Card repair implementation

## Repository And Git Verification

- Repository path inspected: verified approved repo root (`<PROJECT_REPO>`).
- Branch observed: `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Remote observed: `origin https://github.com/ChampCityChris/ChampCity_AI.git`.
- Working status before implementation: existing dirty worktree with modified production/test files and untracked phase-08 planning artifacts.
- Git mutation performed: none.
- Commit created: no.
- Commit hash: not applicable; Git mutation is prohibited for this Work Card.

## Files Modified

- `src/main/currentWorkflow/currentWorkflowService.ts`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/App.tsx`
- `test/workflow/current-execution-context.test.cjs`
- `test/renderer/work-card-close-workspace.test.cjs`
- `test/repository/runtime-wiring-source.test.cjs`

## Files Created

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR06_close_return_selection_authority.md`

## Files Intentionally Not Created

- No Work Card closeout document.
- No hidden close-acknowledgement flag.
- No route token or session-persistent lifecycle state.
- No alternate candidate-selection state file.
- No JSON sidecar.
- No dependency or package addition.

## Implementation Summary

Added two scoped current-workflow actions for post-close continuation:

- Close-return selection projection API path: `currentWorkflow:getCloseReturnSelectionProjection` -> `getCloseReturnSelectionProjection()`.
- Close-return next-intake handoff API path: `currentWorkflow:generateCloseReturnNextIntakeHandoff` -> `generateCloseReturnNextIntakeHandoff()`.

Both actions first resolve the repository-derived current workflow model and require `activeWorkspaceId === "work-card-close"`. Both then call the existing close projection and require `closed === true` with `returnTarget === "phase-work-card-selection"` before using candidate selection.

The selection projection reuses `selectNextWorkCardCandidate()` and returns selected, all-complete, dependency-blocked, explicitly-resolved, or invalid-plan state to the renderer. For selected state it also includes the existing `WorkCardIntakeProjection` needed by the UI.

The next-intake action repeats close verification, requires a selected candidate, and calls the existing `generateWorkCardIntakeHandoff()`. It writes only the normal approved non-review Work Card Intake handoff.

The renderer close return now calls `window.champcity.getCloseReturnSelectionProjection()` before transitioning to `phase-work-card-selection`. The returned selection panel displays backend-selected, all-complete, blocked, resolved, or invalid-plan state. When selected, its button calls `window.champcity.generateCloseReturnNextIntakeHandoff()` instead of `window.champcity.generateCurrentHandoff()`.

## Required Proof

- `generateCurrentHandoff()` still rejects backend `work-card-close`; no `work-card-close` switch case was added.
- Post-close selection no longer uses generic handoff authority. Source tests assert the close-return function calls `getCloseReturnSelectionProjection()` and does not call `generateCurrentHandoff()`.
- Selected candidate handoff generation succeeds through the scoped close-return action and creates the normal `work-card-intake-handoff` for the next candidate.
- All-complete state displays from the backend projection and does not create a fake Work Card or fake handoff.
- Missing close authority blocks `getCloseReturnSelectionProjection()` with a visible error.
- `RevisionRequested` validation continues to resolve to `work-card-repair` and is rejected by the close-return scoped action.
- No closeout, hidden flag, route token, alternate candidate state, or disposition mutation was added.

## Tests Added Or Modified

- `test/workflow/current-execution-context.test.cjs`
  - Added close-return all-complete projection proof.
  - Added selected-next candidate proof using WC01 completion and WC02 intake handoff generation.
  - Added missing close authority and RevisionRequested repair-routing proof.
- `test/renderer/work-card-close-workspace.test.cjs`
  - Added source assertions for the scoped close-return APIs and no generic handoff in the return function.
- `test/repository/runtime-wiring-source.test.cjs`
  - Added main/preload/renderer wiring assertions for both scoped close-return IPC methods.

## Commands Run And Results

- `pwd`
  - Lane: read-only repository verification.
  - Result: passed; approved repo root verified.
- `git status --short --branch`
  - Lane: read-only Git verification.
  - Result: passed; existing dirty worktree observed.
- `git remote -v`
  - Lane: read-only Git verification.
  - Result: passed; `origin` remote verified.
- `Get-Content docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`
  - Lane: required governance read.
  - Result: passed.
- `Get-Content docs/dev/VALIDATION_COMMAND_LANES.md`
  - Lane: required validation-lane read.
  - Result: passed.
- `Get-Content planning/phases/phase-08/Work_Cards/WC44-REPAIR06_close_return_selection_authority.md`
  - Lane: Work Card source-of-truth read.
  - Result: passed.
- `npx tsc --noEmit`
  - Lane: Lane 1 direct clean-room automated validation.
  - Result: passed.
- `npx tsc`
  - Lane: Lane 1 direct clean-room automated validation.
  - Result: passed.
- `npx vite build`
  - Lane: initial sandbox run.
  - Result: failed with documented `spawn EPERM`.
- `npx vite build`
  - Lane: approved normal Windows validation lane.
  - Result: passed; 1619 modules transformed.
- `node --test --test-concurrency=1`
  - Lane: initial sandbox run.
  - Result: failed with documented `spawn EPERM` before tests executed.
- `node --test --test-concurrency=1`
  - Lane: approved normal Windows validation lane.
  - Result: passed; 262 tests passed, 0 failed.
- Focused reruns:
  - `node --test --test-concurrency=1 test/workflow/current-execution-context.test.cjs test/repository/runtime-wiring-source.test.cjs test/renderer/work-card-close-workspace.test.cjs`
  - Lane: approved normal Windows validation lane.
  - Result: passed; 17 tests passed, 0 failed.

## Validation Performed

- Static/type validation: passed.
- Electron main/preload/shared/renderer TypeScript compile: passed.
- Vite renderer build: passed in approved normal Windows lane after documented sandbox `spawn EPERM`.
- Focused production-path/service/source tests: passed.
- Full Node suite: passed in approved normal Windows lane.

## Validation Skipped

- Operator manual validation: skipped; Implementer is not authorized to perform Work Card acceptance or Human Validation approval.
- Electron launch smoke: skipped because the Work Card required automated tests and did not explicitly authorize Implementer manual acceptance; the changed path is covered by production-path/service/source tests.

## Manual Validation Required

Operator should validate in the running app:

1. Validate Passed on a Work Card.
2. Confirm Close / Next displays evidence.
3. Click Return to Phase Building / Next Work Card.
4. Confirm Work Card Selection displays selected, all-complete, blocked, resolved, or invalid-plan backend state.
5. If a next candidate exists, generate the next Work Card Intake handoff without a `work-card-close` generic handoff error.
6. Confirm the closed Work Card is not reselected.
7. Confirm no closeout or hidden completion artifact was created.
8. Confirm Request Repair still routes to Work Card Repair.

## Security And Secret Safety Notes

- No secrets, tokens, API keys, credentials, or `.env` values were read, printed, or written.
- No concrete local machine paths were written into this durable report.
- Renderer access remains constrained through typed preload methods and scoped IPC.
- No dependency was added.

## Residual Risks

- Repository-derived current workflow can still report `work-card-close` after the scoped next-intake handoff because no close/report disposition mutation is allowed. The renderer reaches Work Card Planning through the explicit close-return selection action and existing Architect-output workspace path.
- Operator visual validation is still required for the running Electron app.

## Blocking Questions

None.

## Recommended Next Implementer Task

Run Operator manual validation after Architect review of this report, then address any observed UI or workflow reachability issue as a separate bounded repair card.

Document.Status=Pending
