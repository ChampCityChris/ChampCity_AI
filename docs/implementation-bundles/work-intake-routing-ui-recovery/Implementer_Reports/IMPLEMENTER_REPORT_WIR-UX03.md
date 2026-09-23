# WIR-UX03 Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root without recording a concrete workstation path.
- Card: Work Card `WIR-UX03`, Rebuild Route Architect Assessment and Plan Workspaces.
- Branch and remote: `dev`, ahead of `origin/dev`; no push directed.
- Predecessor: `WIR-UX02` committed as `2c97abe` before this card began.

## Files

- Created: `src/renderer/app/RoutedPlanningWorkspace.tsx`, `src/renderer/app/WorkArchitectAssessmentWorkspace.tsx`, `src/renderer/app/WorkPlanWorkspace.tsx`, this report.
- Modified: `src/renderer/app/App.tsx`, `src/renderer/app/WorkIssuePanel.tsx`, `src/renderer/styles.css`, `test/renderer/research-routed-integration.test.cjs`, `test/renderer/work-intake-routed-workspaces.test.cjs`, `validation/capability-map.json`.
- Deleted: `src/renderer/app/WorkPlanningPanel.tsx`.
- Intentionally not created: planning persistence, route grammar, dependency, migration, or new test file. Earlier untracked repair-package documentation was preserved without staging.

## Implementation

The App routes Assessment and Plan to separate workspaces. Both use the generic document/chat shell, the existing embedded Architect browser host, and the current work-planning IPC methods. The Assessment document includes readable Markdown, route context, review controls, and a structured Research outcome when applicable. Plan includes the approved Assessment as a supporting tab and shows its primary Work Plan with direct/phased topology and a readable Phase/Work Item hierarchy. Handoff preparation, copy, refresh, browser reload, and review actions are in their established locations.

`WorkPlanningPanel` and its stage selector were removed. Review still calls `reviewWorkPlanning`; approval refreshes authoritative navigation and advances, while revision and rejection stay on the current stage. A remaining renderer-local reference in `WorkIssuePanel` now points to the new Plan workspace pending the Issue boundary work in WIR-UX04B. The Research test now verifies direct Integration navigation instead of looking for a nested execution panel.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows | Passed; TypeScript, Vite, assets. |
| `node --test test/renderer/work-intake-routed-workspaces.test.cjs test/renderer/research-routed-integration.test.cjs` | Normal Windows, focused | First run: 9 passed, 2 failed due to test fixture/reference errors; corrected. Final run: 11 passed. |
| `npm run validate:plan -- --profile work-item --changes tmp/wir-ux03-changes.json` | Normal Windows, preview | Initial catalog sorting failure corrected; final preview passed. |
| `npm run test:affected -- --changes tmp/wir-ux03-changes.json` | Normal Windows, work-item profile | Passed; receipt `8dd451d3-6083-45cd-9a7f-7be5d02685a5`, one build and selected capability/production-path tests, no failure evidence. |

The available computer-use runtime did not expose native Windows control, so a live Electron screenshot and experiential 1280×720 layout judgment were not captured. Renderer output and CSS were inspected; WIR-UX07 remains the running-app visual qualification owner. No external integration evidence was claimed.

## Git and safety

The Operator directed a dev commit boundary after this card. The commit hash is pending at report creation and will be reported after commit. The exact staged diff, whitespace check, and staged added-line secret, local-path, and generated-artifact scans are required before commit. No push, merge, rebase, reset, clean, restore, or stash was performed.

No credentials, concrete workstation paths, generated output, or unbounded renderer filesystem access were introduced. Durable references are repository-relative.

## Remaining work

WIR-UX04A owns Execution decomposition presentation. WIR-UX04B owns the routed Issue boundary. WIR-UX07 owns running-app visual qualification.
