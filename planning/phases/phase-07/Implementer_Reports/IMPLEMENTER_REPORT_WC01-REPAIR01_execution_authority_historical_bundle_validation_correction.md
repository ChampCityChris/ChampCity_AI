# Implementer Report: WC01-REPAIR01 Execution Authority, Historical Bundle, and Validation Integrity Correction

## Pass Type

Repair implementation pass for Phase 07 WC01-REPAIR01.

## Repository And Authority

- Repository path inspected: verified approved repo root.
- Remote inspected: `https://github.com/ChampCityChris/ChampCity_AI.git`.
- Branch inspected: `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Starting HEAD: `33f3e18ae07ecd8d1052740da5952bfa14724b14`.
- Parent WC01 Work Card hash: `36B8EF44E998F3C3121DD62379586C1600ACD6A71742B9D21EE8958DBE2198B5`.
- Repair Work Card hash: `2613DD0A0A069144FA2303B2DE13507F356E1F0764DCF7A357D4CF5E65CDD534`.
- Initial status: dirty worktree with the repair Work Card already modified.
- Final status: dirty worktree containing only this repair's intended source, policy, package, script, report, deletion, and test changes plus the pre-existing modified repair Work Card.
- Git mutation: none. No branch switch, pull, rebase, stage, commit, tag, push, or merge was performed.

## Files Changed

Created:

- `test/governance/operator-decision-contract.test.cjs`
- `test/governance/operator-decision-service.test.cjs`
- `test/workflow/operator-decision-routing.test.cjs`
- `test/execution-runs/execution-run-authority.test.cjs`
- `test/renderer/operator-approval-workspace.mounted.cjs`
- `test/repository/test-suite-integrity.test.cjs`
- `test/repository/validation-runner.test.cjs`
- `planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_execution_authority_historical_bundle_validation_correction.md`

Modified:

- `src/main/artifacts/governanceApprovalService.ts`
- `src/shared/projects/projectWorkspace.ts`
- `src/renderer/app/App.tsx`
- `package.json`
- `scripts/codex-validate.ps1`
- `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`

Deleted:

- `scripts/verify-governance-repair-approval-mounted.cjs`

Intentionally not created:

- No JSON report sidecar.
- No Registry entry, application approval artifact, release, package, tag, commit, feature branch, or later Work Card implementation.
- No Work-Card-named test directory, test filename, fixture module, shared test helper, snapshot, or test command.

## Implementation Summary

- Replaced the legacy implementation gate with `workCardRequiresImplementer()`, which returns true only for `requiresImplementer === true`.
- Removed `historical_record` and `historical-operator-review` from production queue types, service classification, routing labels, and renderer navigation.
- Historical Work Cards now use stage `work_card`, classification `work_card`, screen `operator-work-card-approval`, and label `Work Card Approval`.
- Historical Phase Planning and Work Card Plan records now use stage `phase_planning`, classification `phase_planning`, screen `operator-phase-approval`, and label `Operator Phase Approval`.
- Added `resolvePhasePlanningBundle()` to require exactly one visible, registered, non-archived Phase Planning record and exactly one matching Work Card Plan for the same project, phase, and historical mode.
- Added `verifyDecisionTargetSet()` and call sites in both `decide()` and `lookupDecisionState()` before decision lookup or persistence.
- Phase Planning approval identity now anchors by artifact type to the exact `phase_planning` target, not input order or path text.
- Approval artifacts remain `operator_approval` records using `operator-decision-record.v1`; prohibited legacy authority fields are not persisted.
- The renderer displays exact target members and legacy evidence inside the existing stage-owned approval workspace.
- `scripts/codex-validate.ps1` now exits nonzero when a child npm script exits nonzero.
- `package.json` now uses automatic Node test discovery for `test:unit:built`, the required repository lane, the required mounted Electron lane, and the required full lane.
- Added the required permanent test-organization policy section.

## Permanent Test Ownership

- `test/governance/operator-decision-contract.test.cjs`: shared Operator decision contract validation, target normalization, target hash invariance, reason requirements, duplicate rejection, and conflict input behavior.
- `test/governance/operator-decision-service.test.cjs`: production approval service decisions, bundles, invalid bundles, finality, idempotency, pending lookup non-mutation, legacy evidence behavior, persisted approval schema, and prohibited field absence.
- `test/workflow/operator-decision-routing.test.cjs`: execution routing from exact approved Work Cards through `requiresImplementer`, legacy field contradiction cases, and historical screen/class absence in public queue results.
- `test/execution-runs/execution-run-authority.test.cjs`: isolated temporary repository execution-run authority using Phase 06 WC06 Work Card and Operator Approval committed through `ArtifactPairService`.
- `test/renderer/operator-approval-workspace.mounted.cjs`: mounted Electron proof through the actual entry point, public preload API, rendered UI navigation, historical Work Card approval, historical Phase Planning approval, exact members, and legacy evidence.
- `test/repository/test-suite-integrity.test.cjs`: repository-boundary enforcement for stable capability test layout, no `test/wc*`, no `src/` production imports in tests, no production imports from `test/`, and package script integrity.
- `test/repository/validation-runner.test.cjs`: behavioral proof that the Windows validation wrapper returns nonzero for child npm failure and zero for child npm success.

## Evidence Table

| Criterion | Production symbol | Test file and test name | Command | Observed result |
|---|---|---|---|---|
| 1-3 | `workCardRequiresImplementer`, `buildDecisionRequest` | `test/workflow/operator-decision-routing.test.cjs`, `Operator decision routing uses requiresImplementer...` | `npm run test:unit` | `requiresImplementer: true` routes to `implementer_execution_required`; `codeChangesAuthorized: false` behaves the same; `requiresImplementer: false` with a legacy flag does not route. |
| 4-6 | `targetIdentity`, `decisionWorkspaceScreenIdFor`, `decisionWorkspaceLabelFor` | `test/workflow/operator-decision-routing.test.cjs`; `test/renderer/operator-approval-workspace.mounted.cjs` | `npm run test:renderer:built` | No `historical_record` or `historical-operator-review` appears in queue results; historical Work Cards and Phase Planning use normal stage screens. |
| 7-9 | `resolvePhasePlanningBundle`, `verifyDecisionTargetSet`, `identityAnchorForStage` | `test/governance/operator-decision-service.test.cjs`, `GovernanceApprovalService persists exact decisions...` | `npm run test:unit` | Current and historical bundles require one Phase Planning and one Work Card Plan; incomplete, extra, duplicate, mixed-stage, mixed-phase, and mixed historical/current inputs fail; reversed order still anchors to Phase Planning. |
| 10 | `lookupDecisionState` | `test/governance/operator-decision-service.test.cjs` | `npm run test:unit` | Pending lookup returns `pending_operator_disposition`, creates no approval artifact or event, changes no Registry revision, and changes no repository file count. |
| 11 | `recordForEvent`, `buildDecisionRequest` | `test/governance/operator-decision-service.test.cjs` | `npm run test:unit` | Persisted decision artifact type is `operator_approval`, schema is `operator-decision-record.v1`, and prohibited authority fields are absent. |
| 12 | `ExecutionRunPersistenceService`, `ExecutionRunAuthorityService` | `test/execution-runs/execution-run-authority.test.cjs`, `Execution Run authority starts...` | `npm run test:unit` | Temporary repo proves eligible listing, start, idempotent repeat start, wrong-revision rejection, and no Phase 07 file in the temp Registry. |
| 13-16 | package/test tree | `test/repository/test-suite-integrity.test.cjs` | `npm run test:repository` | Exactly seven approved test files exist; no `test/wc*`; no Work-Card-named permanent test file; no production behavior import from `src/` in tests. |
| 17-18 | `package.json` scripts | `test/repository/test-suite-integrity.test.cjs` | `npm run test:repository` | `test:unit:built` is automatic discovery; no npm test script invokes `scripts/verify-*`. |
| 19 | `Invoke-NpmScript` | `test/repository/validation-runner.test.cjs`, `codex validation wrapper propagates...` | `npm run test:repository` | Child exit code 7 returns nonzero; child exit code 0 returns zero. |
| 20 | mounted renderer replacement | `test/renderer/operator-approval-workspace.mounted.cjs` | `npm run test:renderer:built` | Mounted capability test passed, then obsolete script was deleted. |
| 21 | scope absence | repository safety scan | `rg --files test`; `rg historical-operator-review...`; `git status -sb` | No obsolete ChampCity_GPT pair restored; no deleted Work-Card-named test restored. |
| 22-24 | validation and scope | all files listed above | all required commands | All required commands passed in normal Windows lane; no Git mutation and no later Work Card implementation. |

## Validation Results

All required validation used the documented normal Windows execution lane when child-process-heavy tooling was involved. One sandbox attempt of `npm run build` and one sandbox attempt of `npm run test:repository` hit the documented `spawn EPERM` false-failure mode and were rerun in the approved lane.

- `npm run typecheck`: passed. Tests discovered/executed: 0.
- `npm run build`: sandbox attempt failed with `spawn EPERM`; normal Windows rerun passed. Tests discovered/executed: 0.
- `npm run test:unit`: passed. Node test runner reported 7 tests, 7 passed, 0 failed, 0 skipped.
- `npm run test:repository`: sandbox attempt failed with `spawn EPERM`; normal Windows rerun passed. Node test runner reported 2 tests, 2 passed, 0 failed, 0 skipped.
- `npm run test:renderer:built`: passed. Mounted Electron script reported `operatorApprovalWorkspaceMounted: passed`, 3 pending items, historical Work Card screen `operator-work-card-approval`, historical Phase screen `operator-phase-approval`, legacy evidence visible, historical review destination absent.
- `npm run test:full`: passed. Node test runner reported 7 tests, 7 passed, 0 failed, 0 skipped; mounted Electron script passed.
- `npm run validate:codex:unit`: passed. Wrapper lane reported 7 tests, 7 passed, 0 failed, 0 skipped.
- `npm run validate:codex:build`: passed. Tests discovered/executed: 0.
- `npm run validate:codex`: passed. Wrapper full lane reported 7 tests, 7 passed, 0 failed, 0 skipped; mounted Electron script passed.

Validation skipped:

- None.

## Safety And Scope Notes

- Confirmed all 18 Operator-deleted legacy tests remain deleted. `rg --files test` lists only the seven approved permanent capability test files.
- Confirmed no Work-Card-named directory or file exists under `test/`.
- Confirmed production approval authority files do not contain `codeChangesAuthorized`, `sourceCodeChangesAuthorized`, `implementationAuthorized`, `authorizationGranted`, `executionPassesAuthorized`, or `pushAuthorized`; these names appear only in contradiction tests.
- Confirmed `historical_record` and `historical-operator-review` appear only in negative assertions in tests, not production source.
- Confirmed no obsolete ChampCity_GPT pair was restored.
- Confirmed no `scripts/verify-*` harness was counted as acceptance evidence.
- Confirmed no npm test script invokes `scripts/verify-*`.
- Confirmed no concrete local machine paths were written into this report.
- Confirmed no secrets, credentials, API keys, tokens, `.env` files, provider SDKs, cloud services, databases, authentication, deployment automation, MCP, or connector integration were added.
- Retained in-memory compatibility projections: stage projections owned for later deletion by WC05 through WC08; execution projection owned for later deletion by WC12.

## Manual Validation Required

Operator should confirm after Architect review:

- A historical Work Card opens Work Card Approval and is visibly marked historical.
- A historical Phase Planning bundle opens Operator Phase Approval and shows both exact members.
- No Historical Review destination remains.
- An approved implementation Work Card displays no separate code-change or implementation-authorization control.
- Legacy evidence remains visible but does not resolve the new exact pending target.

## Residual Risks

- The repository remains dirty because this Work Card prohibits Git mutation and the repair card file was already modified before implementation.
- Vite continues to emit the existing chunk-size warning during build; it did not fail validation.
- Electron emits nonfatal GPU cleanup messages after mounted validation; the mounted script completed successfully with exit code 0.

## Blocking Questions

- None.

## Recommended Next Implementer Task

Submit this repair for Architect review and independent validation. WC01 remains unresolved until reviewed and accepted; WC02 through WC13 remain unauthorized.
