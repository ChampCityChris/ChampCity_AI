# WSF20-REPAIR20 Implementer Report

Status: implementation complete; all affected/preserved owners have passing final evidence. Stop for Architect review. Live Operator acceptance remains outstanding.

## Scope and repository

Architectural Repair Card WSF20-REPAIR20. Verified the primary `Dev` repository with `git rev-parse --show-toplevel`, branch `dev`, and starting HEAD `46b6e13897f582f56899e8f70aaa4f9eeded7428`, matching the card. Remote `origin` is the GitHub ChampCityChris/ChampCity_AI repository; no upstream is configured for `dev`, and remote freshness is unqualified. Unrelated untracked documentation is preserved. The superseded renderer-only card was not used as the solution.

## RCA and implementation

R13 conflated authorization and obligation: nonempty `affectedPaths` became `sourceMutation=required`, the prompt demanded an attributable edit, finalization blocked an otherwise successful zero-change result, and R03 recovered that same false requirement from historical path-list length. This overrode an Operator-approved instruction to preserve an already-conforming file.

The shared execution contract now uses `sourceMutation: "allowed" | "forbidden"`. Nonempty approved paths grant bounded permission; empty paths forbid source mutation. Caller/model inputs cannot replace the approved path list or impose a mutation obligation. Source-neutral execution remains source-neutral. No checkbox, approval gate, SQL schema, SourceBinding schema, source topology, Git authority or dependency change was introduced.

Updated consumers:

- Contract creation and planning handoff describe maximum mutation scope and optional edits.
- Implementer sandbox and file-change policy retain writable approved work versus read-only source; the prompt explicitly permits already-satisfied zero-change completion and forbids fabricated edits/no-op commits.
- Finalization reconciles the exact managed checkout, repository, branch, HEAD, source binding and observed paths before classifying the outcome. Clean zero delta produces checkpoint `not-required`; authorized actual changes use the existing structured commit owner. Unauthorized/unprovable changes retain rejection and bounded restoration. Unsuccessful semantic results remain unsuccessful.
- Existing attempt packets now retain empty attributed-path inventories and attribution failures as well as changed paths. Historical packets/results are never rewritten.
- Project State proves historical SQL ownership and contract/source provenance without inferring obligation from path-list length. The application additionally verifies bounded nonredirected packet identity/result/delta, absence of ambiguous implementation checkpoints and the exact clean checkout. Historical reservations made before materialization retain their revision authority while current verified checkout IDs supply previously absent mechanical identity. R13/R03 packet shapes remain readable; missing or incompatible evidence requires inspection.
- Durable status classifies no-change versus committed results using execution/checkpoint evidence. Exact downstream Tester checkpoint chains may advance the candidate; arbitrary drift remains rejected.
- Tester requires exact no-change recovery proof or the committed implementation checkpoint, receives actual changed paths (empty for no-change), and independently determines proof. Its bounded test-package permission is explicitly distinguished from Implementer source permission.
- The renderer offers Implement alongside Request Work Card Revision when each existing service owner establishes eligibility.

Blocked retry reuses the existing provenance guard and adds a read-only application readiness check. It requires approved unchanged contract/version, exact completed blocked attempt/result ownership, no successful or competing history, no downstream Tester/Validation/checkpoint/disposition, satisfied dependency/Phase ownership and exact clean ready source. Start creates a fresh reservation under the current unchanged contract and performs the normal blocked-to-in-progress lifecycle; reads never set the WorkItem to ready. Prior attempt/result/packet bytes remain immutable. The existing optional governed revision path remains intact.

## Attributable files

Modified production: `src/shared/workflowApplicationContracts.ts`; `src/shared/projectState/projectStateService.ts`; `src/main/workflow/workflowExecutionApplicationService.ts`; `src/main/workCardBuilding/codexImplementerExecutionService.ts`; `src/main/workCardBuilding/codexTesterExecutionService.ts`; `src/main/workCardPlanning/structuredWorkItemPlanningService.ts`; `src/main/sourceControl/structuredWorkflowCheckpointService.ts` (permission terminology); `src/renderer/app/WorkCardImplementWorkspace.tsx`.

Extended existing tests: `test/work-card-building/codex-implementer-execution-service.test.cjs`; `test/phase-planning/phase-planning-service.test.cjs`; `test/workflow/workflow-execution-application-service.test.cjs`; `test/renderer/work-card-implement-workspace.test.cjs`; `test/source-control/structured-workflow-checkpoint.test.cjs` (contract vocabulary).

Created: this report. Deleted: none. Intentionally not created/modified: new workflow engines, governed sidecars, dependencies, schema/migrations, source topology, LOCALGIT01, Forgejo, unrelated UI/documentation and live project records. Temporary scope, diagnostic preloads, logs and receipts remain ignored under `tmp/`.

Existing owner tests were extended to cover the previously rejected nonempty-path/zero-change result, unchanged-contract blocked retry, durable packet corruption, optional revision parity and unauthorized transient edits. No parallel test workflow was created.

## Validation evidence

All commands ran from `<PROJECT_REPO>` with the installed toolchain. Normal Windows execution follows the documented spawn-EPERM fallback. Diagnostic preloads transpile current changed services only and are not production builds or final build proof.

| Command | Lane / result | Evidence |
| --- | --- | --- |
| `node --test --test-name-pattern='source-backed no-mutation WorkItems' test/work-card-building/codex-implementer-execution-service.test.cjs` | Restricted / 1 | `spawn EPERM`; not a source failure or pass. |
| Same command | Normal Windows / 1 | Red proof: actual contract `required`, expected `allowed`; baseline mandatory-mutation behavior reproduced. |
| Temporary change-list generation using Node `execFileSync('git', ...)` | Restricted / 1 | `spawnSync git EPERM`; replaced with direct PowerShell Git read. The initial profile invocation without its scope file exited 1 before build. |
| `npm run test:repair -- --changes tmp/wsf20-r20-changes.json --preview` | Restricted / 0 | Canonical exact-path/preserved-capability selection recorded. |
| `npm run test:repair -- --changes tmp/wsf20-r20-changes.json` | Normal Windows / interrupted | Initial 101-file selection was stopped before a final receipt; no pass claimed. Final execution uses the seven affected/preserved owners, as in the preceding repair. |
| `node --require ./scripts/validation/child-cleanup.cjs --require ./tmp/wsf20-r20-source-preload.cjs --test --test-concurrency=1 --test-name-pattern='source-backed no-mutation WorkItems\|through blocked-retry$\|failed Implement refresh' test/work-card-building/codex-implementer-execution-service.test.cjs test/phase-planning/phase-planning-service.test.cjs test/renderer/work-card-implement-workspace.test.cjs` | Normal Windows / 1, then 1 | First 1/3 pass: obsolete prompt assertion and pre-materialization identity mismatch. Second 2/3 pass: no-change execution/restart passed; remaining obsolete handoff assertion corrected. |
| `node --require ./scripts/validation/child-cleanup.cjs --require ./tmp/wsf20-r20-source-preload.cjs --test --test-concurrency=1 --test-name-pattern='through blocked-retry$\|semantic blocked contracts' test/phase-planning/phase-planning-service.test.cjs test/workflow/workflow-execution-application-service.test.cjs` | Normal Windows / 0 | 22/22 pass: Greenfield blocked retry, three generic workflow paths and negative provenance boundaries. |
| `node --require ./scripts/validation/child-cleanup.cjs --require ./tmp/wsf20-r20-source-preload.cjs --test --test-name-pattern='source-backed no-mutation WorkItems' test/work-card-building/codex-implementer-execution-service.test.cjs` | Normal Windows / 0 | 1/1 pass, 83.6 seconds: allowed zero delta, forbidden mutation, actual authorized changes, unauthorized and transient changes, retry, restart, Tester and corrupted packet rejection. |
| `node tmp/wsf20-r20-final.cjs` | Normal Windows / 1 | Canonical repair planner/executor, seven affected/preserved owners; receipt `4893dfb0-e53f-4e00-b49c-b2e8c82d6506`, sourceStable=true, 154/155 pass, zero skips/cancellations/unavailable/blocked files. Production build passed in 13.282 seconds; full run 566.389 seconds. The one failure exposed live source-restoration status becoming unavailable instead of failed. |
| `node --require ./scripts/validation/child-cleanup.cjs --test test/work-card-building/codex-implementer-execution-service.test.cjs` | Normal Windows / 1 | 7/8 pass; confirmed the same single restoration-status regression. |
| `node --require ./scripts/validation/child-cleanup.cjs --test --test-reporter=tap --test-name-pattern='exact source-backed and source-neutral WorkItems use' test/work-card-building/codex-implementer-execution-service.test.cjs` | Normal Windows / 1 | Exact diagnostic confirmed branch/dirty-checkout failure presentation; no source-scope acceptance failure. |
| `node tmp/wsf20-r20-followup.cjs` | Normal Windows / 0 | Canonical planner/executor rebuilt the corrected source and reran the full Implementer/Tester owner; receipt `e4a51839-ba03-411e-9880-aeea9402721e`, sourceStable=true, 8/8 pass, zero skips/cancellations/unavailable/blocked files, 113170 ms. Production build passed in 13745 ms. |
| `node --require ./scripts/validation/child-cleanup.cjs --test --test-name-pattern='through blocked-retry$' test/phase-planning/phase-planning-service.test.cjs` | Normal Windows / 0 | Final production build: 1/1 pass, 21.051 seconds. Clean semantic blocked retry remains available. |
| `git diff --check`; `node tmp/wsf20-r20-staged-safety.cjs` | Restricted / 0; normal Windows / 0 | Attributable whitespace and staged secret/local-path/generated-artifact safety. |

The final correction preserves the live failed terminal model and disables retry when an application safety failure produced the blocked result. It does not route that safety failure through ordinary semantic blocked retry. An explicit regression assertion verifies canRunAgain=false. No production changes followed the final follow-up build.

Final owner results across the composed and supplemental receipts: static catalog 5/5; renderer 8/8; Workflow execution 61/61; semantic checkpoints 6/6; structured Workflow checkpoints 36/36; Phase Planning 31/31; Implementer/Tester 8/8. All 155 unique tests have passing final owner evidence. The original composed receipt remains failed and is not relabeled as passed. The interrupted broad run establishes no qualification. The final follow-up owns one fresh production build; earlier builds were superseded by the source corrections above. Vite chunk-size warnings and the repair duration budget are advisory. Phase Planning (552.483 seconds) and structured checkpoints (320.758 seconds) dominate the review-required timing budget; no tests were dropped to claim a timing pass.

## Git, safety and acceptance

Required local checkpoint: `WSF20-R20 restore Operator authority over optional source mutation`. Hash pending creation; report the actual hash in the handoff without amending solely to insert it here. Only the fourteen attributable production/tests/report files are staged. The exact staged diff was reviewed; bounded secret/local-path/generated-artifact and whitespace scans passed.

No live `greenfield_test` execution, manual live SQL edit, fake source change, push, merge, release, branch switch or worktree creation occurred. Synthetic fixture repositories exercise real production services with controlled Codex streams; they do not establish external model behavior or visual acceptance.

Next: Architect review. After review/deployment, the Operator should restart the application, inspect the existing historical blocked Repair, explicitly choose Implement on its unchanged approved card, confirm a new zero-change implemented attempt with checkpoint not-required and Review & Validation, then run the independent Tester. Actual live execution and visual/experiential acceptance remain unqualified.
