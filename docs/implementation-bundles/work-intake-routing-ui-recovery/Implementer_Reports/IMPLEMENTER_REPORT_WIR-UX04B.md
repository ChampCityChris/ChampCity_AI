# WIR-UX04B Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root without recording a concrete workstation path.
- Card: Work Card `WIR-UX04B`, Route Issue Work into Existing Issue Resolution Workspaces.
- Branch and remote: `dev`, ahead of `origin/dev`; no push directed.
- Predecessor: `WIR-UX04A` committed as `012d673` before this card began.

## Files

- Created: `src/main/workPlanning/routedIssueLineageService.ts`, `src/shared/routedIssueLineageContracts.ts`, `src/renderer/app/RoutedIssueBridge.tsx`, `src/renderer/app/RoutedIssueReturnNav.tsx`, `src/renderer/app/routedIssueNavigation.ts`, this report.
- Modified: `src/main/main.ts`, `src/preload/index.ts`, `src/shared/workspaceContracts.ts`, `src/renderer/app/App.tsx`, `src/renderer/app/IssueCloseWorkspace.tsx`, `src/renderer/styles.css`, `test/renderer/work-intake-routed-workspaces.test.cjs`, `test/renderer/issue-close-workspace.test.cjs`, `validation/capability-map.json`.
- Deleted: `src/renderer/app/WorkIssuePanel.tsx`.
- Intentionally not created: a duplicate Issue rail, RCA/planning/execution UI, persistence schema, migration, dependency, or new test file. Earlier untracked repair-package documentation was preserved without staging.

## Implementation

An Operator-selected Issue route now displays a minimal Work Intake bridge. It queries `runWorkIssueAction(..., "status")`; Open Issue Resolution calls the existing `open` action once and enters the existing Issue Resolution Architect Planning workspace, while Continue reuses its Issue identity. The duplicate `WorkIssuePanel` and its nested planning, execution, and acceptance controls were removed. Issue RCA, planning, Fix Cards, validation, and close remain in the existing Issue workspaces.

A constrained main-process read API finds the Issue's canonical routed handoff and returns its Intake and route-decision lineage after renderer state resets, including when the handoff later becomes historical. Existing Issue Architect review refreshes the routed adapter's assessment/reframe evidence without changing the selected route automatically. A reframe recommendation offers return to Work Intake Routing. A closed routed Issue offers Return to Work Intake Integration; the App checks service-derived Integration availability before navigating. Non-routed Issue Close keeps its existing Workflow Hub return behavior.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows | Passed; TypeScript, Vite, assets. Vite reported a chunk-size advisory. |
| `node --test test/renderer/work-intake-routed-workspaces.test.cjs test/renderer/issue-close-workspace.test.cjs test/renderer/issue-architect-planning-workspace.test.cjs test/renderer/issue-resolution-shell.test.cjs` | Normal Windows, focused | Passed, 25 tests. Node emitted a MaxListeners advisory from accumulated fixture listeners; no test failure. |
| `npm run validate:plan -- --profile work-item --changes tmp/wir-ux04b-changes.json` | Normal Windows, preview | Initial unclassified-lineage-path failure corrected by reviewed capability source patterns; final preview passed. |
| `npm run test:affected -- --changes tmp/wir-ux04b-changes.json` | Normal Windows, work-item profile | Passed after final lineage race fix; receipt `6bd3f404-8302-4b93-90b7-1a7e54877690`, 48 selected results, zero failure evidence. Earlier pass receipt: `c54d8e2c-b890-44ff-8884-2e5a5bbfcaf1`. |

No running-app visual session was available; WIR-UX07 owns visual qualification. No external integration evidence was claimed.

## Git and safety

The Operator directed a dev commit boundary after this card. The commit hash is pending at report creation and will be reported after commit. The exact staged diff, whitespace check, and staged added-line secret, local-path, and generated-artifact scans are required before commit. No push, merge, rebase, reset, clean, restore, or stash was performed.

No credentials, concrete workstation paths, generated output, or unrestricted renderer filesystem access were introduced. Durable references are repository-relative.

## Remaining work and risk

WIR-UX05A owns Work Item Map integration. WIR-UX06 owns the Integration workspace. The return action is shown at Issue Close, and its navigation requires existing routed integration eligibility. This card did not alter the backend rule that derives that eligibility from current routed planning and Issue correction evidence; a complete routed Issue journey through the existing Issue Planning surface remains to be exercised in WIR-UX07. If that journey produces no routed integration projection, the return action reports the blocker instead of claiming Integration is ready.
