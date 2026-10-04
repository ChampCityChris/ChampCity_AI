# WSF20-REPAIR09 Implementer Report

Date: 2026-10-04

## Scope and repository

- Operator-approved Repair Card WSF20-REPAIR09, parent WSF20, defects D26 and D27.
- Verified Git root is the approved `Dev/` primary checkout on `dev`.
- Starting HEAD matches the card baseline: `29cd604156d9c7643bb4e53725d9c3d489e64224`.
- Configured remote is `origin` (ChampCityChris/ChampCity_AI). Local `dev` is 319 commits ahead and zero behind locally recorded `origin/dev`; no fetch or push.
- Pre-existing untracked bundle/card/audit documentation is preserved and excluded from this checkpoint.

## D26: single canonical return

The canonical branch of `GreenfieldWorkspace.open()` calls the same `resume()` function registered for the sidebar action. It awaits the existing `refresh()` path: one fresh `getGreenfieldNavigation(workflowId)` read, exact Workflow identity validation, `selectionFromSql(current)` replacement, and local error clearing. Replacement removes inspection and obsolete child identities. Historical navigation and explicit historical WorkItem selection remain presentation-only.

The existing Greenfield composition owner preserves R08/R08-R01 exact historical Phase, WorkItem, Repair, Project and map-selection scenarios while asserting one resolver call per canonical return and zero for inspection. The Phase Map regression now awaits canonical refresh.

The existing Phase Interview renderer owner composes actual Greenfield navigation, `PhaseInterviewWorkspace`, and `FigmaDocumentDispositionPanel`. It proves fresh SQL identities supersede cached identities, rail and Resume produce identical selection, Phase A receives `readOnly=false`, all three dispositions are selectable, revision still requires notes, duplicate Apply is blocked, exact interview/version persistence occurs before approval advances through the resolver. Preload APIs are mocked; this is renderer semantic evidence, not live-project acceptance.

## D27: canonical SQL sidebar context

The bounded renderer `WorkflowSidebarContext` presentation contract maps only the SQL navigation projection and registered workspace labels. Greenfield registers it when navigation changes and clears it on Workflow change/unmount. App forwards it only for the currently open Project Creation Workflow with matching identity. The sidebar performs no SQL queries and uses the existing scroll/field/ID styles.

| Canonical context | Sidebar proof |
| --- | --- |
| Project Planning | Registered Stage label/reason; No active Phase; No active Work Card |
| Phase Interview / Planning | SQL Phase title/ID/state; Phase N of M; loop step; no active Work Card |
| Work Card Planning / Implement / Review | SQL Work Card title/ID/state and loop step; active Phase context |
| Repair | Work Card context plus exact Repair and parent identities |
| Historical inspection | Canonical status retained alongside Resume |
| Other Workflow, hub, generic family, unmount | Context filtered or cleared |

Existing sidebar presentation and App composition owners cover this matrix. No Markdown state reconstruction, persisted current-stage field, or legacy CurrentWorkspaceModel authority was introduced.

## File inventory

Modified:
- `src/renderer/app/App.tsx`
- `src/renderer/app/GreenfieldWorkspace.tsx`
- `src/renderer/app/StructuredWorkflowWorkspace.tsx`
- `src/renderer/app/figma/FigmaSidebar.tsx`
- `test/renderer/greenfield-shell-composition.test.cjs`
- `test/renderer/phase-interview-workspace.test.cjs`
- `test/renderer/workflow-hub-shell.test.cjs`

Created:
- `src/renderer/app/workflowSidebarContext.ts`
- This report.

No deleted files, new test owners, dependencies, SQL/domain/schema changes, browser/MCP/prompt changes, or unrelated layout changes. Temporary validation input/logs and generated build output remain ignored.

## Validation

| Command | Execution lane | Result |
| --- | --- | --- |
| `node --test test/renderer/greenfield-shell-composition.test.cjs test/renderer/phase-interview-workspace.test.cjs test/renderer/workflow-hub-shell.test.cjs` | Restricted Windows | Failed with `spawn EPERM`; recorded once, then rerun in normal Windows. The initial shell wrapper returned 0 after printing its tail; this is not a test pass. |
| Same focused renderer command | Normal Windows | Exit 0; 48/48 passed. |
| `npm run test:repair -- --changes tmp/wsf20-r09-changes.json --preview` | Restricted Windows, plan only | Exit 0; all nine changed paths plus preserved `renderer-navigation-and-presentation`; 69 files selected. |
| `npm run test:repair -- --changes tmp/wsf20-r09-changes.json` | Normal Windows, composed repair profile | Exit 1; 469/483 passed, 14 failed across three files, zero skipped/cancelled/unavailable/blocked. |
| `node --test test/phase-planning/phase-planning-service.test.cjs` | Normal Windows, named owner after current build | Exit 0; 10/10 passed in 85,687 ms, including exact Phase Interview/Planning review, navigation, Repair and repeated full SQL lifecycle boundaries. |
| `git diff --check` | Restricted Windows | Exit 0. |

Authoritative composed receipt: `tmp/wsf20-r09-validation.log`, run ID `d948cfa9-1157-469b-80bb-4700047a5558`. Source stable throughout. Profile-owned `npm run build` passed exit 0 in 14,234 ms (TypeScript, Vite, assets); static owners passed. All three modified renderer owners passed: Greenfield composition 10/10, Phase Interview 2/2, sidebar/Workflow Hub 36/36. Total profile duration 200,073 ms exceeds its 60-second advisory budget; managed-source conversion (159,443 ms) and current-project entry (84,162 ms, concurrent duration) dominate.

Broader failures:
- `test/agent-harness/repository-io-hardening.test.cjs`: 1 failure; nested workspace registration reports `gitBacked=false` where the fixture expects true (line 290).
- `test/project-state/execution-completion.test.cjs`: 6 failures; source-neutral planning/decomposition fixtures require deterministic ValidationCatalog proof that is unavailable.
- `test/source-control/managed-project-source.test.cjs`: 7 failures; observed candidate Git preparation failures also prevent some later injected-failure assertions from reaching their expected branch.

Those tests and all `src/main`/`src/shared` files are unchanged from starting HEAD. These are observed failures outside the renderer repair surface; a separate baseline execution was not performed, so they are not represented as independently confirmed pre-existing failures. Do not interpret the focused passes as a green composed profile. Their correction requires separately scoped investigation.

Non-failing warnings include renderer-loader MaxListeners and Vite bundle size. No packaging, full/release suite, external integration, Electron launch smoke, or live-project disposition was performed. The card explicitly retains visual/experiential acceptance for Operator audit.

## Safety, checkpoint, and Operator audit

Checkpoint required: `WSF20-R09 unify canonical return and restore sidebar context`. Hash pending; deliver the actual hash after commit without amending this report solely for its own hash. Only the nine attributable files above are included; no push, merge, or release action.

Exact attributable diff reviewed; bounded credential, concrete local-path, generated-artifact, and whitespace scans passed before checkpoint. No secrets, concrete machine paths, or generated/dependency artifacts are included.

Stop after checkpoint for Operator audit. Remaining manual acceptance: continue the existing Greenfield test, inspect a prior stage, return through Phase Intake/Phases, confirm Resume disappears and the disposition dropdown works, then verify the sidebar retains canonical context while inspecting and updates as Phase/Work Card progress. Visual/experiential acceptance remains with the Operator. No known renderer implementation blocker; the composed profile remains red for the three failure owners above. Recommended next task: Operator audit of D26/D27, followed by separately scoped investigation of those broader failures.
