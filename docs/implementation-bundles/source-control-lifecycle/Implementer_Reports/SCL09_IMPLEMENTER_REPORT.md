# SCL09 Implementer Report

## Identity and scope

- Approved repository root: verified with `git rev-parse --show-toplevel` as the primary `ChampCity_AI` checkout; no workstation path is recorded here.
- Card: Work Card `SCL09`, Build Read-Only Source Control Graph Workspace.
- Predecessor: SCL08 checkpoint `9751794e9f46296e2e9b8949a6d2f521439a583a`.
- Branch and remote: `dev`, ahead of `origin/dev` by 50 commits before this card commit. No push was directed.

## Files

- Created: `src/renderer/app/SourceControlWorkspace.tsx`, `src/renderer/app/sourceGraphLayout.ts`, `test/renderer/source-control-graph-layout.test.cjs`, and this report.
- Modified: `src/main/main.ts`, `src/main/sourceControl/sourceControlService.ts`, `src/main/sourceControl/sourceGraphService.ts`, `src/main/workIntake/workIntakeService.ts`, `src/preload/index.ts`, `src/renderer/app/App.tsx`, `src/renderer/app/WorkflowHubWorkspace.tsx`, `src/renderer/app/figma/FigmaSidebar.tsx`, `src/renderer/styles.css`, `src/shared/sourceControlContracts.ts`, `src/shared/sourceLifecycleContracts.ts`, `src/shared/workspaceContracts.ts`, `test/renderer/workflow-hub-shell.test.cjs`, `test/source-control/source-graph-projection.test.cjs`, and `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: renderer Git parsing, Git mutation controls, a repository migration, a dependency, a worktree, or a WIR workflow-screen redesign. The temporary synthetic preview and validation logs were kept out of source control.

## Design and implementation

The selected-project Workflows hub now opens a first-class Source Control workspace with a return path in the existing sidebar and header. The primary task is to inspect local source chronology: `main` and `dev` target lanes, Work Intake lines, revision ancestry, and merge links. The graph uses semantic Work Intake titles, routes, and explicit Active, Integrated, Completed, and Target labels. Revision and provider identifiers remain in the details inspector. Selection is by native buttons; the graph scrolls horizontally within its own region and the workspace owns vertical scrolling.

The main process supplies both queries through constrained preload methods bound to the selected repository. It resolves the existing project repository identity from structured or legacy state, reuses the SCL08 graph service, and returns receipt-bearing exact revision detail with at most 24 changed-file paths. Work Intake bindings now expose their recorded base/current revisions for the inspector. The renderer consumes typed graph data and performs only layout geometry; it does not parse Git output or mutate repository state. Loading, empty, metadata-unavailable, truncation, detail-failure, and refresh-failure states are explicit.

UI contract review used CCAI-UI-001 hierarchy, state clarity, keyboard, reflow, and local scroll requirements. A running Vite preview mounted the production workspace component against a synthetic `main`/`dev`, one-feature/two-hotfix fixture with two non-fast-forward merges. The in-app Chromium browser on Windows showed the target chronology, both integration curves, Work Intake status text, and a two-file merge inspector. At 1280 × 720 and 1440 × 900 CSS pixels, the graph and inspector fit side by side; the narrower desktop graph scrolls within its region. At 320 × 256 CSS pixels, the workspace reflows to a single column, retains local vertical and horizontal scroll ownership, and has no page-wide horizontal overflow. A Tab then Return keyboard interaction selected the next source line and updated its details. These were synthetic preview observations, not Operator dogfooding or a packaged Electron acceptance run.

## Validation

| Command | Execution lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows static/build | Passed on SCL09 source; TypeScript, Vite renderer, and assets. Vite reported its existing bundle-size advisory. |
| `node --test test/renderer/source-control-graph-layout.test.cjs test/renderer/workflow-hub-shell.test.cjs test/source-control/source-graph-projection.test.cjs test/validation/capability-map.test.cjs` | Normal Windows focused component/service/catalog | First run failed two harness assertions: the loading state correctly hid Refresh, and the new catalog path was out of alphabetical order. The SCL09 production service fixture passed. Both harness issues were corrected. |
| `node --test test/renderer/source-control-graph-layout.test.cjs test/validation/capability-map.test.cjs` | Normal Windows focused correction | Passed 8/8. The remaining focused suites had passed in the prior run and passed again in the composed profile. |
| `npm run validate:plan -- --profile work-item --changes tmp/scl09-changes.json` | Normal Windows planner preview | Passed; changed production, test, and catalog paths classified. |
| `npm run test:affected -- --changes tmp/scl09-changes.json` | Normal Windows composed work-item | Passed 528/528 tests in 78 files, no failures or skips, receipt `72c9d646-e575-407b-8d9e-77e0e88028e0`, `sourceStable: true`. Duration 276663 ms; advisory budget exceeded without reducing proof. |
| `git diff --check` and `git diff --cached --check` | Read-only source/staged checks | Passed before commit. |

The focused service test verifies exact revision input, changed-file summaries, the 24-file output cap, and repository read-only behavior. The renderer tests verify lane assignment, two merge-parent links, native read-only shell controls, and hub navigation. No external integration, push, or release acceptance was run; none is required by SCL09.

## Git and safety

The Operator directed one commit for this card. Its hash is pending at report creation and will be reported after commit. The exact staged diff and staged secret, local-path, and generated-artifact scan were inspected before commit. No generated output, concrete workstation path, or credential content was staged. No push, merge, rebase, reset, clean, restore, stash, source-repository branch creation, or source-repository worktree creation was performed.

## Remaining validation and next task

Operator dogfooding of the graph in a real selected project may occur after the package; it is not a prerequisite for SCL10. The running preview used dark theme and synthetic repository history, so packaged Electron and real-project visual judgment remain unclaimed. Continue to SCL10 after this card's checkpoint commit.
