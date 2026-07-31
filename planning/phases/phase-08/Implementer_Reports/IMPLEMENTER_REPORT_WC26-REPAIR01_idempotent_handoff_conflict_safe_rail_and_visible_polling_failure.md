# IMPLEMENTER REPORT WC26-REPAIR01 - Idempotent Handoff, Conflict-Safe Rail, and Visible Polling Failure

## Pass Type

Numbered repair Work Card implementation pass for `WC26-REPAIR01`.

## Repository And Git

- Repository path inspected: verified approved repo root.
- Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Remote: `origin` points to `https://github.com/ChampCityChris/ChampCity_AI.git`.
- HEAD at validation time: `a94e0720afb110ed7a0fc748b14cc9799d923099`.
- Git mutation authorized: No.
- Git actions performed: none. No stage, commit, push, merge, rebase, tag, reset, clean, restore, or stash was run.
- Commit created: No.
- Commit hash: not created because Git mutation is prohibited by the Work Card.

## Starting Dirty Tree Inventory

The implementation started on the expected feature branch with an existing dirty tree. Existing modified and untracked files were preserved and not reverted. The starting inventory included prior modifications under `src/main/`, `src/preload/`, `src/renderer/`, `src/shared/`, and `test/`, plus untracked Phase 08 planning artifacts and untracked source/test files already present in the workspace.

## Files Created

- `test/renderer/project-planning-polling-source.test.cjs`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC26-REPAIR01_idempotent_handoff_conflict_safe_rail_and_visible_polling_failure.md`

## Files Modified

- `src/main/projectPlanning/projectPlanningService.ts`
- `src/main/projectPlanning/projectPlanningContext.ts`
- `src/shared/workspaces/projectLifecycleRailStatus.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/App.tsx`
- `test/project-planning/project-planning-service.test.cjs`
- `test/renderer/project-rail-presentation.test.cjs`

## Files Intentionally Not Created

- No JSON sidecars.
- No migration utility.
- No MCP save action.
- No manual Project Planning output-import fallback.
- No WC27 or ChampCity_GPT artifacts.
- No package, dependency, release, or browser security changes.

## Implementation Summary

Project Planning handoff generation now builds the expected canonical metadata and body before writing. If the existing handoff already matches the current Intake, Prompt, Interview, targets, identity, role, disposition, workflow data, source revisions, and body, the service returns without changing repository bytes or incrementing `artifactRevision`. When a genuine upstream source revision changes, the stale prior handoff becomes replaceable prior evidence and exactly one new handoff revision is created.

`canPrepareHandoff` is now limited to the evidence-derived `ready-for-handoff` state with no invalid context. A valid current handoff keeps Copy available while Prepare is disabled.

The shared top project rail now uses zero/one/conflict resolution for later-stage authority families instead of selecting by `find()` or `.at(-1)`. Duplicate current Project Planning handoffs, duplicate Phase Maps, duplicate closeouts for one phase identity, and duplicate Project Closeouts all resolve to `Needs Attention`; distinct closeouts for distinct mapped phases remain valid.

Project Planning polling now maintains visible polling error state, passes it into `ProjectPlanningActionBar`, clears it after later successful refresh, prevents overlapping quiet interval refreshes, uses request IDs to ignore stale completions, invalidates pending polling when the workspace/repository changes or the component unmounts, and uses a request-bound preview loader so older polls cannot replace newer model/document state.

## Handoff Idempotency Rules

- Existing handoff bytes are left unchanged when all current source revisions, targets, metadata authority fields, disposition, workflow data, and body match.
- Existing handoff revision is reused in that idempotent case.
- A current source revision change permits one new handoff revision.
- Repeated preparation after that new evidence is again idempotent.

## Final Handoff UI State Mapping

- `canPrepareHandoff=true`: `ready-for-handoff` with valid current prerequisites and no invalid Project Planning evidence.
- `canPrepareHandoff=false`: valid current handoff exists; waiting, partial, reviewable, revision requested, rejected, completed, or Needs Attention states.
- `canCopyHandoff=true`: a valid current Approved Project Planning handoff exists.
- `canCopyHandoff=false`: no current valid handoff, invalid handoff evidence, or unavailable context.

## Rail Conflict Rules

- Project Planning handoff: zero/one/conflict resolution for active Approved `generated-handoff` documents with `handoffKind=project-planning`.
- Project Profile/Roadmap: exact current target resolution, with bundle validation preserved.
- Phase Map handoff: zero/one/conflict resolution for active Approved `generated-handoff` documents with `handoffKind=phase-map`.
- Phase Map: zero/one/conflict resolution for active `phase-map` documents.
- Phase closeouts: duplicate active closeouts for one `phaseId` are conflicts; closeouts for distinct mapped phase identities are valid.
- Project Closeout: zero/one/conflict resolution for active `project-closeout` documents.

## Polling Behavior

- Background Project Planning polling records errors in `projectPlanningPollingError`.
- `ProjectPlanningActionBar` receives and displays the polling error through the existing action-message error surface.
- The last readable model and preview remain displayed after polling failure.
- Later successful refresh clears the polling error.
- Quiet interval refreshes do not overlap.
- Manual refresh can supersede an older background refresh and surfaces failure immediately.
- Request IDs guard model, inventory, resolver, current model, and preview updates.
- Cleanup increments the request generation and clears in-flight state when leaving Project Planning or changing repositories.
- Background polling does not clear unrelated Operator action feedback.

## Controlled External Output Validation Method

The Project Planning service test creates a valid canonical Pending Project Profile and Project Roadmap pair directly at the handoff targets after handoff generation. `getProjectPlanningWorkspaceModel()` then detects the externally created pair as `ready-for-review` with bundle disposition available, without using a manual import fallback.

## Required Evidence

1. Proven - First preparation creates one Approved current Project Planning handoff.
2. Proven - Repeating Prepare with unchanged evidence does not change bytes or artifact revision.
3. Proven - A genuine upstream source revision permits exactly one new handoff revision.
4. Proven - Prepare is disabled when a valid handoff exists or the workspace is waiting, reviewing, completed, or Needs Attention.
5. Proven - Copy remains available when the current handoff is valid.
6. Proven - Duplicate current Project Planning handoff evidence produces `Needs Attention`.
7. Proven - Duplicate current Phase Map evidence produces `Needs Attention`.
8. Proven - Duplicate active closeouts for one phase identity produce `Needs Attention`; distinct phase closeouts remain valid.
9. Proven - Duplicate current Project Closeout evidence produces `Needs Attention`.
10. Proven - Project Intake and Architect Interview rail mappings remain unchanged.
11. Proven - All seven top project cards receive one title-cased status and no lower static `Open` line.
12. Proven - Background Project Planning poll failure is visibly reported while the last readable model and preview remain displayed.
13. Proven - A later successful Project Planning poll clears the polling error.
14. Proven - An older delayed Project Planning poll cannot replace a newer successful model.
15. Proven - Project Planning polling stops and invalidates pending work when leaving Project Planning or changing repositories.
16. Proven - Manual Refresh Planning Outputs reports failure immediately and remains usable after recovery.
17. Proven - Controlled external canonical Profile/Roadmap creation is detected by the workspace model without manual import.
18. Proven - Project Planning bundle review behavior remains intact.
19. Proven - Architect Interview browser attachment and review behavior do not regress.
20. Proven - `npm run typecheck`, `npm run build`, and `npm test` pass in the approved Windows lane.

## Commands Run And Results

- `pwd` - pass; verified approved repo root.
- `git status --short --branch` - pass; read-only starting inventory.
- `git remote -v` - pass; read-only remote check.
- `npx tsc --noEmit` - pass; direct clean-room lane.
- `npx tsc` - pass; direct clean-room lane.
- `npx vite build` - sandbox failed with documented `spawn EPERM`.
- `npx vite build` - pass in normal Windows lane.
- `node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs test/renderer/project-rail-presentation.test.cjs test/renderer/project-planning-polling-source.test.cjs` - sandbox failed with documented `spawn EPERM`.
- Same focused `node --test` command - pass in normal Windows lane, 24 tests passed.
- `npm run typecheck` - pass.
- `npm run build` - pass in normal Windows lane.
- `npm test` - pass in normal Windows lane, 120 tests passed.
- Safety scan for secrets, tokens, credentials, and concrete local paths in scoped changed files - pass; no matches.
- Safety scan for large/generated artifact indicators in scoped changed files - informational matches only for test imports from `dist`, archive fixture paths, and existing archive-exclusion logic.
- `git status --short` - pass; final read-only dirty-tree inventory.
- `git rev-parse --abbrev-ref HEAD` - pass; read-only branch check.
- `git rev-parse HEAD` - pass; read-only HEAD check.

## Validation Performed

- Static/build validation: `npm run typecheck`, `npm run build`.
- Focused Project Planning service tests: idempotent handoff, one new revision after source change, external output detection, bundle review.
- Focused rail tests: duplicate Project Planning handoff, duplicate Phase Map, duplicate same-phase closeout, distinct phase closeouts, duplicate Project Closeout, preserved title-cased statuses.
- Focused renderer polling source tests: visible polling error prop, request sequencing, in-flight guard, stale preview protection.
- Full serialized Node test suite: 120 tests passed.

## Validation Skipped And Reason

- Operator manual acceptance was not performed; Implementer authority is limited to automated validation and code-level verification.
- Live Electron visual validation was not performed; the Work Card did not grant Operator acceptance authority to the Implementer.
- Live MCP save behavior was not performed or claimed; WC27/ChampCity_GPT save action remains out of scope.

## Manual Validation Required

Operator should run the Electron app and observe that Project Planning automatic refresh errors are visible, that a valid external Profile/Roadmap pair appears without manual import, and that the existing embedded Architect browser workflow remains usable. This is remaining Operator validation, not Implementer acceptance.

## Security And Secret Safety

- No secrets, credentials, tokens, API keys, `.env` data, or concrete local machine paths were introduced in scoped changed files.
- Renderer filesystem authority was not broadened.
- No dependencies were added.
- No generated archive, screenshot, large binary, or build artifact was intentionally added.

## Final Dirty Tree Inventory

Final `git status --short` still shows the pre-existing dirty tree plus the scoped WC26-REPAIR01 changes and this report. Git mutation was prohibited, so nothing was staged or committed.

## Residual Risks

- Polling behavior is covered by source-level renderer tests and shared product-path tests, but final live visual acceptance remains with the Operator.
- The dirty tree includes substantial pre-existing WC25/WC26 work outside this repair; those files were preserved rather than isolated through Git because the Work Card prohibits Git mutation.

## Blocking Questions

None.

## Recommended Next Implementer Task

After Operator manual validation, continue with the next approved Phase 08 Work Card or any Architect-requested review corrections. WC27 and the future `artifact_toolbox.save_project_planning_outputs` action remain separate scope.
