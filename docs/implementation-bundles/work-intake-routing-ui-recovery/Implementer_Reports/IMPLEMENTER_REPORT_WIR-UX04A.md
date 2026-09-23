# WIR-UX04A Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root without recording a concrete workstation path.
- Card: Work Card `WIR-UX04A`, Rebuild Work Item Decomposition as an Architect Workspace.
- Branch and remote: `dev`, ahead of `origin/dev`; no push directed.
- Predecessor: `WIR-UX03` committed as `1f50469` before this card began.

## Files

- Created: `src/renderer/app/WorkItemDecompositionWorkspace.tsx`, this report.
- Modified: `src/renderer/app/App.tsx`, `src/renderer/app/RoutedPlanningWorkspace.tsx`, `src/renderer/styles.css`, `test/renderer/work-intake-routed-workspaces.test.cjs`, `validation/capability-map.json`.
- Deleted: `src/renderer/app/WorkItemDecompositionPanel.tsx`.
- Intentionally not created: top-level routed stage, workflow identity, persistence contract, dependency, migration, or new test file. Earlier untracked repair-package documentation was preserved without staging.

## Implementation

Decomposition now opens as a contextual `DocumentChatWorkspaceShell` for a selected Work Item. It keeps a readable proposal as the primary document, the approved Plan as a supporting tab, and the embedded Architect with Prepare Handoff, Copy Handoff, Refresh, and Reload ChatGPT actions. The existing proposal preview renders sibling/direct-to-phased changes, rationale, evidence, and resulting structure without raw JSON. Operator actions continue through `reviewWorkItemDecomposition` with expected proposal and Plan revisions.

An accepted proposal refreshes the approved Plan, returns the service-provided `resumeWorkItemId`, and displays feedback that the original candidate was superseded. Revision stays in the workspace with the proposal context available for a revised handoff. The Plan exposes a temporary selected-item entry point because WIR-UX05A has not yet created the Work Item Map; the return callback contract names `work-item-map` for WIR-UX05A. Until that map exists, App returns to the existing Execution view with the resume feedback. Opening decomposition does not review or mutate the Plan.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows | Passed; TypeScript, Vite, assets. Vite reported a chunk-size advisory. |
| `node --test test/renderer/work-intake-routed-workspaces.test.cjs test/renderer/work-card-plan-presentation.test.cjs` | Normal Windows, focused | First run: 15 passed, one test locator failed; corrected. Final run: 16 passed. |
| `npm run validate:plan -- --profile work-item --changes tmp/wir-ux04a-changes.json` | Normal Windows, preview | Passed. |
| `npm run test:affected -- --changes tmp/wir-ux04a-changes.json` | Normal Windows, work-item profile | Passed; receipt `fa500a13-e8c1-4157-899f-0c62b256a324`, no failure evidence observed. |

Running-app visual layout was not inspected because the available computer-use runtime did not expose native Windows control. WIR-UX07 owns that qualification. No external integration evidence was claimed.

## Git and safety

The Operator directed a dev commit boundary after this card. The commit hash is pending at report creation and will be reported after commit. The exact staged diff, whitespace check, and staged added-line secret, local-path, and generated-artifact scans are required before commit. No push, merge, rebase, reset, clean, restore, or stash was performed.

No credentials, concrete workstation paths, generated output, or unrestricted renderer filesystem access were introduced. Durable references are repository-relative.

## Remaining work

WIR-UX05A must connect the contextual entry and return callback to its Work Item Map, including selection of `resumeWorkItemId`. WIR-UX04B owns the routed Issue boundary. WIR-UX07 owns visual qualification.
