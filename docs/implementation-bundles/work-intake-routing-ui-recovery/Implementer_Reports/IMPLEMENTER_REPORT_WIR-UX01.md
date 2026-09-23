# WIR-UX01 Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root; no concrete workstation path recorded.
- Card: Work Card `WIR-UX01`, Establish Routed Workspace Navigation and Architect Shell.
- Branch and remote: `dev`; `origin/dev` remained at the pre-work baseline. No push was directed.
- Prior baseline commit: `100ffdc` committed the requested recovery card package before implementation.

## Files

- Created: `src/shared/workIntakeNavigationContracts.ts`, `src/main/workIntake/workIntakeNavigationService.ts`, `src/renderer/app/DocumentChatWorkspaceShell.tsx`, `src/renderer/app/WorkIntakeRoutingRail.tsx`, `src/renderer/app/architectSurfaceEligibility.ts`, `test/renderer/work-intake-routed-workspaces.test.cjs`, this report.
- Modified: `src/main/main.ts`, `src/preload/index.ts`, `src/shared/workspaceContracts.ts`, `src/renderer/app/App.tsx`, `src/renderer/app/IssueDocumentChatWorkspaceShell.tsx`, `src/renderer/app/WorkIntakeWorkspace.tsx`, `src/renderer/app/WorkRoutingAssessmentPanel.tsx`, `src/renderer/app/WorkRouteDecisionPanel.tsx`, `src/renderer/app/WorkPlanningPanel.tsx`, `src/renderer/styles.css`, `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: a second Architect browser, persisted navigation document or sidecar, new route or planning authority, dependency, migration, or Git worktree.
- Earlier untracked `docs/implementation-bundles/work-intake-routing/` repair-package material was preserved without staging.

## Implementation

The read-only navigation service composes the existing Intake, selected route, route-specific assessment, approved Plan, and routed execution evidence. It exposes Intake, Routing, Architect Assessment, Plan, Execution, and Integration availability with reasons; Research completion advances directly to Integration. The Issue route marks assessment as owned by Issue Resolution pending the WIR-UX04B bridge. The renderer keeps the selected available stage and otherwise uses the service's required stage. Save opens Routing. The capture form no longer mounts later lifecycle panels.

The routed rail uses the established pipeline classes and shows the selected route as context. The existing Issue document/chat shell now wraps a neutral shared composition, preserving Issue props and styling. The Work Intake Architect predicate reuses the existing embedded browser host for available Architect stages and preserves the Development and Issue predicates. Existing routing/planning panels are bounded to their selected stage as transitional presentation; WIR-UX02 and WIR-UX03 own their dedicated UX.

The new permanent test owns previously uncovered routed stage availability, exact rail order, capture separation, and Architect attachment behavior. Existing Issue and Architect tests were reused unchanged. No tests were consolidated or retired in this card.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Restricted sandbox | `spawn EPERM` during Vite/esbuild after TypeScript; not a source failure or pass. |
| `npm run build` | Normal Windows | Passed; TypeScript, Vite, assets. |
| `node --test test/renderer/work-intake-routed-workspaces.test.cjs test/renderer/research-routed-integration.test.cjs test/architect-outputs/architect-output-workspace-repair.test.cjs` | Normal Windows, focused | Passed, 33 tests. |
| `node --test test/renderer/issue-architect-planning-workspace.test.cjs test/renderer/issue-planning-workspace.test.cjs test/renderer/issue-fix-card-workspaces.test.cjs test/renderer/issue-validation-workspace.test.cjs` | Normal Windows, focused | Passed, 27 tests. |
| `node -e "require('./scripts/validation/catalog.cjs').loadCatalog(); process.stdout.write('catalog valid\n')"` | Restricted static | Passed. |
| `npm run validate:plan -- --profile work-item --changes tmp/wir-ux01-changes.json` | Restricted preview | Passed after adding reviewed ownership patterns for the new source paths. |
| `npm run test:affected -- --changes tmp/wir-ux01-changes.json` | Normal Windows, work-item profile | Passed; receipt `354ae52b-361f-4565-b160-249ffee64e04`, one build plus selected static, fast, affected, and integration proof; 38.5 seconds, no failure evidence. |

No Electron launch or visual acceptance was performed for this foundation card; WIR-UX07 owns broad running UI qualification. No external integration evidence was claimed.

## Git and safety

The Operator directed a commit boundary after this card. The card commit hash is pending at report creation and will be reported after commit. The exact staged diff was inspected; `git diff --cached --check` found no patch errors. The staged added-line secret/local-path scan and generated-artifact path scan passed for 18 staged paths. No push, merge, rebase, reset, clean, restore, or stash was performed.

No credentials or concrete local-machine paths were written. All durable references use repository-relative paths. The implementation uses constrained preload IPC for the navigation query; renderer code gained no filesystem access.

## Remaining work

WIR-UX02 must replace the transitional routing assessment/decision presentation with the dedicated routed Workspace. Operator visual judgment remains for the final running UI qualification in WIR-UX07.
