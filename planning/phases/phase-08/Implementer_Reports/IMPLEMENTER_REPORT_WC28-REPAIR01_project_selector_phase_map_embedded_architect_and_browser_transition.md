# Implementer Report: WC28-REPAIR01 Project Selector, Phase Map Embedded Architect, and Browser Transition

Pass type: numbered repair Work Card  
Work Card: `planning/phases/phase-08/Work_Cards/WC28-REPAIR01_project_selector_phase_map_embedded_architect_and_browser_transition.md`  
Repository path inspected: verified approved repo root (`<PROJECT_REPO>`)  
Git branch inspected: `feature/phase-04-wc01-repair01-evidence-derived-workflow`  
Remote status inspected: `origin` configured for the approved public repository; branch was ahead of origin by one commit before this pass  
Git mutation authorization: prohibited

## Implementation Summary

- Removed the visible full repository path from the sidebar project selector and made the clear-project action visibly read `Clear Project`.
- Added Phase Map to the embedded Architect dual-pane surface with Phase Map-specific `Prepare Phase Map Handoff` and `Copy Phase Map Handoff` controls.
- Added a narrow `phaseMap:copyHandoff` IPC/preload/API path that copies the generated Phase Map instruction without adding or modifying an MCP persistence action.
- Updated the Phase Map handoff/instruction text to name the current Approved Project Profile, current Approved Project Roadmap, generated Phase Map handoff, and exact Phase Map output target.
- Moved browser attachment authority to a globally monotonic renderer generation and made detach/zero/hide completions stale-rejectable across coordinator instances.
- Tightened retry visibility so retry appears only for current attachment failure state or current attachment error feedback.

## Files Created

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC28-REPAIR01_project_selector_phase_map_embedded_architect_and_browser_transition.md`

## Files Modified In This Pass

- `src/renderer/app/App.tsx`
- `src/renderer/styles.css`
- `src/shared/architectInterview/architectBrowserAttachmentCoordinator.ts`
- `src/shared/workspaces/projectRailPresentation.ts`
- `src/main/phaseMap/phaseMapService.ts`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `test/phase-map/phase-map-service.test.cjs`
- `test/renderer/architect-browser-attachment-coordinator.test.cjs`
- `test/renderer/document-review-surface-source.test.cjs`
- `test/renderer/project-rail-presentation.test.cjs`
- `test/repository/runtime-wiring-source.test.cjs`

## Files Intentionally Not Created

- No JSON sidecars for governed Work Cards or reports.
- No Phase Map MCP persistence action.
- No duplicate browser instance, timeout retry helper, recent-projects store, settings surface, database, provider SDK, or dependency.
- No commit, branch, tag, push, or PR because Git mutation was prohibited.

## Commands Run And Results

- `pwd` - passed; confirmed approved repo root.
- `Get-Content` for Work Card, repository boundary, and validation lane docs - passed.
- `Get-Content` for legacy protocol files named by old `AGENTS.md` - files absent; continued because the current repository boundary supersedes those deleted protocol references for Phase 07/08.
- `git status --short --branch` - read-only; worktree was already dirty with many modified/untracked Phase 08 files.
- `git remote -v` - read-only; confirmed `origin`.
- `rg`/`Get-Content` source inspection commands - passed.
- `node --check` for edited `.cjs` tests - passed.
- `npx tsc --noEmit` - Lane 1 direct validation, passed.
- `npx tsc` - Lane 1 direct validation, passed.
- `npx vite build` - sandbox attempt failed with documented `spawn EPERM`; approved normal Windows lane rerun passed.
- `node --test --test-concurrency=1` - sandbox attempt failed with documented `spawn EPERM`; approved normal Windows lane rerun passed, 133 tests passed.
- `npm run typecheck` - canonical package lane, passed.
- `npm run build` - sandbox attempt failed with documented `spawn EPERM`; approved normal Windows lane rerun passed.
- `npm test` - sandbox attempt failed with documented `spawn EPERM`; approved normal Windows lane rerun passed, 133 tests passed.
- `git diff --name-only`, `git diff --stat`, `git status --short --branch` - read-only final inspection.
- Safety scan for local paths and secret markers - scoped local-path scan over repair-touched files found no concrete machine paths; scoped secret-marker scan matched only this report's own safety-policy wording, not secret values.

## Validation Performed

- Static/build validation: passed in Lane 1 and canonical npm lane.
- Capability tests: passed through `npm test`, including Phase Map instruction proof and browser attachment coordinator generation tests.
- Production-path/source wiring tests: passed, including Phase Map copy IPC/preload/renderer wiring and no Phase Map MCP persistence wiring.
- Browser race proof: deterministic tests now cover stale attach completion, Strict Mode replay, detach generation, stale detach/hide completion rejection after a newer attachment, and retry visibility.

## Proof Matrix

1. Sidebar shows Revisionary without its full local repository path - Proven by renderer source change and source test; Operator running-app visual check remains item 14.
2. Choose Project and clear-project actions remain functional - Proven by preserving existing handlers and source tests; no handler path was replaced.
3. Phase Map shows the embedded ChatGPT pane and Phase Map controls in one usable screen - Proven by Phase Map entering the embedded dual-pane helper and Phase Map action-bar source tests; Operator running-app visual check remains item 14.
4. Empty Phase Map shows Prepare Handoff and no disposition control - Proven by Phase Map action-bar/source tests and existing selected-review-document gating.
5. Prepared Phase Map exposes a copied instruction containing both approved planning inputs, handoff path, and exact output target - Proven by `test/phase-map/phase-map-service.test.cjs`.
6. Pending Phase Map is selected and can be dispositioned only in Phase Map - Proven by preserving Phase Map save selection and specialized disposition gating tests.
7. Project Planning remains the sole Profile/Roadmap disposition authority - Proven by preserving `ProjectPlanningPreviewReview` bundle review path and not adding Profile/Roadmap disposition to Phase Map.
8. Direct Architect Interview to Project Planning browser transition reaches attached-visible without an intermediate rail step - Proven at attachment-coordinator level by globally monotonic cross-instance generation tests; Operator running-app transition check remains item 14.
9. Direct transitions involving Phase Map also reach attached-visible - Proven by adding Phase Map to browser-enabled dual-pane workspaces and cross-instance generation tests; Operator running-app transition check remains item 14.
10. A delayed stale detach/hide completion cannot override a newer attachment in deterministic tests - Proven by `stale detach and hide completions cannot override a newer browser attachment`.
11. Leaving all browser-enabled workflow steps detaches the browser - Proven by detach carrying a newer generation through zero bounds and hide.
12. WC28 startup, project selection, sidebar, top-rail navigation, and stale-document clearing do not regress - Proven by full test suite and existing navigation/source tests.
13. `npm run typecheck`, `npm run build`, and `npm test` pass in the approved lane - Proven; sandbox false failures were rerun in approved normal Windows lane.
14. Operator validates items 1, 3, 4, 8, and 9 in the running Electron application - OperatorValidationPending.

## Validation Skipped And Reason

- Running Electron manual acceptance was not performed because Operator validation and final running-product acceptance are Operator-owned under the project boundary.
- Playwright was not used because the validation lane says not to use Playwright unless the active Work Card explicitly authorizes it.

## Git Actions Performed

- Read-only Git inspection only: `git status`, `git remote -v`, `git diff --name-only`, and `git diff --stat`.
- No staging, commit, push, branch switch, rebase, merge, tag, reset, stash, or clean was performed.
- Commit hash: not applicable; Git mutation prohibited.

## Security And Secret-Safety Notes

- No secrets, credentials, API keys, tokens, passwords, cookies, session storage, `.env` contents, or private keys were read, printed, written, or persisted.
- No concrete local machine paths were written into this durable report.
- The copied Phase Map instruction uses `<PROJECT_REPO>` and repo-relative artifact targets.
- No provider SDK, authentication implementation, database, cloud integration, or new dependency was added.

## Blocking Questions

- None.

## Manual Validation Required

- Operator should open the running Electron application and verify the sidebar displays only the selected project name, `Choose Project`, and `Clear Project`.
- Operator should verify Phase Map displays the existing current-state evidence, the embedded ChatGPT pane, and Phase Map-specific handoff controls in one usable screen.
- Operator should verify an empty Phase Map state shows `Prepare Phase Map Handoff` and no Phase Map disposition control.
- Operator should directly navigate among Architect Interview, Project Planning, and Phase Map and confirm each destination browser reaches attached-visible without an intermediate non-browser rail step.

## Residual Risks

- Automated tests prove the generation and renderer routing behavior, but authenticated/live ChatGPT attachment and visual usability still require Operator running-product validation.
- The worktree contained pre-existing dirty and untracked files before this pass; unrelated changes were preserved and not reverted.

## Recommended Next Implementer Task

- After Operator manual validation, record the Operator result for WC28-REPAIR01 and decide whether any additional bounded repair is needed.
