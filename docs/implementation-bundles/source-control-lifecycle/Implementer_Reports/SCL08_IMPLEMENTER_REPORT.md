# SCL08 Implementer Report

## Identity and scope

- Approved repository root: verified with `git rev-parse --show-toplevel` as the primary `ChampCity_AI` checkout; no workstation path is recorded here.
- Card: Work Card `SCL08`, Implement Provider-Neutral Source Graph Projection.
- Predecessor: SCL07 checkpoint `0783645139d2edac9c77ac65da91bdb1cb80e985`.
- Branch and remote: `dev`, ahead of `origin/dev` by 49 commits before this card commit. No push was directed.

## Files

- Created: `src/main/sourceControl/sourceGraphService.ts`, `test/source-control/source-graph-projection.test.cjs`, and this report.
- Modified: `src/main/projectState/sqliteProjectStateStore.ts`, `src/main/sourceControl/sourceControlService.ts`, `src/shared/sourceControlContracts.ts`, `src/shared/sourceLifecycleContracts.ts`, `test/project-planning/project-planning-service.test.cjs`, and `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: a branch mutation API for the graph, a renderer Git parser, a persisted graph document, a migration, a dependency, or a worktree requirement.

## Implementation and evidence

The main-process SourceControlService now exposes a receipt-bearing, read-only `getSourceGraph(options?)` query for its bound repository identity. The graph supplies deterministic opaque line IDs, branch heads, exact revision IDs, all parent links including merge parents, integration targets, Work Intake bindings, and optional Git branch diagnostics. Options cap revisions and lines; the result reports revision, line, work-binding, and parent-link truncation. Invalid bounds return the existing typed source-control failure receipt.

Structured Project State metadata is read through a new SQLite read-only port that does not initialize or migrate the store. The graph joins SourceBindings to Work Intake titles, current Operator route decisions, workflow type/state, checkpoint kinds, and IntegrationRecord state. It annotates exact checkpoint and integration revisions. If workflow state is absent or unreadable, mechanical Git topology remains available with an explicit metadata diagnostic. Legacy Work Intake documents supply bounded title and source binding context while that authority remains supported; unavailable legacy workflow details remain null rather than being invented.

The synthetic fixture exercises `main`, `dev`, one feature line, two hotfix lines, two non-fast-forward merges, structured semantic records, source stability, missing metadata, invalid options, and explicit result bounds. The first direct fixture run exposed a missing `--parents` Git flag; it was corrected and the direct fixture passed. The first affected profile exposed an existing planner fixture that initialized `dev` but later switched to nonexistent `main`; the one-line test correction switches back to its actual base branch. No production behavior was changed for that fixture.

## Validation

| Command | Execution lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows static/build | Passed on final production source. |
| `node --test test/source-control/source-graph-projection.test.cjs` | Normal Windows focused service fixture | First run failed 2/2 due to missing merge parents; after correction passed 2/2. |
| `npm run test:affected -- --changes tmp/scl08-changes.json --preview` | Normal Windows work-item planner | Passed; all changed production and test paths classified. |
| `npm run test:affected -- --changes tmp/scl08-changes.json` | Normal Windows work-item profile | First receipt `c5349e5f-232b-4cee-a357-d59e5d94b9c6` failed on the planner fixture's nonexistent `main`; final receipt `0bcb9369-1c11-43eb-8b7e-ff24434da044` passed 474/474 tests in 75 files, sourceStable true. The advisory duration budget requested review; no test was skipped or unavailable. |
| `git diff --check` and `git diff --cached --check` | Read-only source/staged checks | Passed before commit. |

The temporary change-set and validation logs under ignored `tmp/` are not committed. No Electron launch, visual acceptance, external remote integration, or release acceptance was claimed; none is required for this backend projection card.

## Git and safety

The Operator directed one commit for this card. Its hash is pending at report creation and will be reported after commit. The exact staged diff and staged safety scan were inspected before commit: nine card files, no generated output, no concrete local paths, and no added credential assignments. No push, merge, rebase, reset, clean, restore, stash, source-repository branch creation, or source-repository worktree creation was performed.

## Remaining validation and next task

The backend graph is ready for the SCL09 read-only Source Control workspace. No Operator manual validation is required for this deterministic service card. Continue to SCL09 after this card's checkpoint commit.
