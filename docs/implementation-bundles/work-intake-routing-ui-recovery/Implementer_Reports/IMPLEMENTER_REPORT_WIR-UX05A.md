# WIR-UX05A Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root without recording a concrete workstation path.
- Card: Work Card `WIR-UX05A`, Rebuild Routed Work Item Map, Planning, and Implement Workspaces.
- Branch and remote: `dev`, ahead of `origin/dev`; no push directed.
- Predecessor: `WIR-UX04B` committed as `a181f5a` before this card began.

## Files

- Created: `src/renderer/app/RoutedExecutionWorkspace.tsx`, `src/renderer/app/RoutedWorkItemMapWorkspace.tsx`, `src/renderer/app/RoutedWorkItemPlanningWorkspace.tsx`, `src/renderer/app/RoutedImplementWorkspace.tsx`, this report.
- Modified: `src/main/planExecution/routedWorkflowService.ts`, `src/shared/routedWorkflowContracts.ts`, `src/renderer/app/App.tsx`, `src/renderer/app/RoutedExecutionPanel.tsx`, `src/renderer/app/RoutedPlanningWorkspace.tsx`, `src/renderer/app/architectSurfaceEligibility.ts`, `src/renderer/styles.css`, `test/renderer/work-intake-routed-workspaces.test.cjs`, `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: a second Architect runtime, duplicate Work Card document model, migration, dependency, or direct renderer filesystem access. Unrelated untracked architecture and repair-package documents were preserved without staging.

## Implementation

Execution now opens a Work Item Map with seven task destinations. The map presents approved Plan candidates, eligibility, active item, Begin/Continue, and contextual decomposition. The Plan-level decomposition shortcut was removed. After a proposal is accepted, its replacement/resume Work Item is selected on return to the map.

Work Item Planning uses the document and embedded Architect shell. The routed service prepares a handoff without copying it, exposes a separate Copy action only for the current prepared submission, and projects the current Work Card target. The same service path supplies the existing routed repair draft owner with the Prepare/Copy separation. Contract dispositions appear only for a current draft. Implement projects the report target and reuses the existing Codex environment, action, and console components, including running-session responses and status polling. Map, Planning, and Implement controls were removed from the temporary `RoutedExecutionPanel`.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows | Passed; TypeScript, Vite, and asset copy. Vite reported a chunk-size advisory. |
| `node --test test/renderer/work-intake-routed-workspaces.test.cjs test/renderer/work-card-building-review-workspace.test.cjs test/renderer/codex-execution-presentation-ownership.test.cjs` | Normal Windows, focused | Passed, 26 tests before the final service fixture addition. |
| `node --test --test-name-pattern "routed Work Card Prepare and Copy" test/renderer/work-intake-routed-workspaces.test.cjs` | Normal Windows, focused | Passed after correcting the fixture's Plan acceptance criteria. |
| `node --test test/renderer/research-routed-integration.test.cjs` | Normal Windows, focused | Passed, 2 tests. |
| `node --test test/validation/capability-map.test.cjs` | Normal Windows, focused | Passed, 5 tests. |
| `npm run validate:plan -- --profile work-item --changes tmp/wir-ux05a-changes.json` | Normal Windows, preview | Passed after sorting behavior identities and classifying the shared contract. |
| `npm run test:affected -- --changes tmp/wir-ux05a-changes.json` | Normal Windows, work-item profile | Passed; receipt `69dc686b-e5dd-4cbc-a568-ac2520b5622b`, 55 selected results, zero failure evidence, stable source snapshot. Two earlier runs had all selected results pass but failed source-stability provenance while repository files changed during execution. |

No running-app visual session was available; WIR-UX07 owns visual qualification. No external integration evidence was claimed.

## Git and safety

The Operator directed a dev commit boundary after this card. The commit hash is pending at report creation and will be reported after commit. The exact staged diff, whitespace check, and staged added-line secret, local-path, and generated-artifact scans are required before commit. No push, merge, rebase, reset, clean, restore, or stash was performed.

No credentials, concrete workstation paths, generated output, or unrestricted renderer filesystem access were introduced. Durable references are repository-relative.

## Remaining work and risk

WIR-UX05B owns Review & Validation, Repair, Close/Next, and Acceptance; those destinations still use the temporary remaining execution panel. WIR-UX06 owns Integration and Integration Repair. Native visual layout and interaction remain unqualified until WIR-UX07.
