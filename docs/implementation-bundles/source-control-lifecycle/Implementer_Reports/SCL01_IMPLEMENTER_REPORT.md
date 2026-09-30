# SCL01 Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root without recording a workstation path.
- Card: Work Card `SCL01`, Establish Semantic Source-Control Lifecycle Contracts.
- Baseline: `b977afc7a4911bbf82a7030ee2622afc4ca42f9c` on `dev`.
- Branch and remote: `dev`, ahead of `origin/dev` by 16 commits at card start; no push directed.

## Files

- Created: `src/shared/sourceLifecycleContracts.ts`, `src/main/sourceControl/workSourceNaming.ts`, and this report.
- Modified: `src/shared/sourceControlContracts.ts`, `src/main/sourceControl/sourceControlService.ts`, `src/main/workIntake/workIntakeBranchService.ts`, `test/agent-harness/source-control-service-boundary.test.cjs`, `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: dependencies, schema changes, migrations, renderer controls, approval layers, and worktree orchestration.

## Implementation and evidence

Defined semantic source revisions, lines, integration targets, Work Intake source bindings and readiness, checkpoint requests and states, integration requests, and read-only graph projections. The main-process SourceControlService now resolves exact revisions and creates a deterministic Work Intake source line from an exact revision through the existing ref-level Git primitive. The response retains the established bounded receipt/error format. Branch naming moved into a shared main-process utility while the old Work Intake API continues to re-export it. The legacy Work Intake flow and provider-shaped compatibility APIs remain available.

Extended the existing source-control boundary test rather than adding a redundant test file. It proves exact resolution, dirty-checkout source creation without checkout switching or file loss, collision refusal, foreign repository refusal, and attributable receipts. The validation map now owns the new shared contracts.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run validate:plan -- --profile work-item --changes tmp/scl01-changes.json` | Restricted Windows, preview | First run failed because the new shared contracts lacked capability-map ownership; corrected the map. A second run failed its sorted-pattern rule; corrected ordering. Final preview passed, selecting 32 test files and one build. |
| `npm run test:affected -- --changes tmp/scl01-changes.json` | Restricted Windows, work-item | Incomplete: production build returned `spawn EPERM` before tests. Not counted as source failure or pass. |
| `npm run test:affected -- --changes tmp/scl01-changes.json` | Normal Windows, work-item | Passed, receipt `9309d575-4509-484d-8a60-759d9b72bcf9`; production build passed, 32 selected test files passed, zero failure evidence. |
| `git diff --check` | Read-only source check | Passed. |

The work-item profile provided static/build, fast, affected capability, and applicable integration proof. No separate launch smoke, external integration, packaging, or full-suite run was in this card's scope.

## Git and safety

The Operator directed one checkpoint commit for this card. The commit hash is pending at report creation and will be reported after commit. The exact eight-file staged diff was inspected; `git diff --cached --check` passed. The staged added-line scan found zero secret and concrete local-path hits, and the staged path scan found zero generated-artifact hits. No push, merge, rebase, reset, clean, restore, or stash was performed.

## Remaining validation and next task

No Operator experiential judgment is required for this backend contract card. SCL01A is the next hard dependency; later cards will implement persisted readiness, checkpoints, integration, and the graph query behind these contracts.
