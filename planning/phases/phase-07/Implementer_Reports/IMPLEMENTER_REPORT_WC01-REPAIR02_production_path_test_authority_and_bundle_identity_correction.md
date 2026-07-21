# Implementer Report - WC01-REPAIR02 Production-Path Test Authority and Bundle Identity Correction

Pass type: numbered Work Card repair implementation

Work Card: `planning/phases/phase-07/Work_Cards/WC01-REPAIR02_production_path_test_authority_and_bundle_identity_correction.md`

## Repository And Git

- Repository path inspected: verified approved repo root (`<PROJECT_REPO>`).
- Remote: `origin https://github.com/ChampCityChris/ChampCity_AI.git`.
- Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Starting HEAD: `33f3e18ae07ecd8d1052740da5952bfa14724b14`.
- Parent WC01 SHA-256: `36B8EF44E998F3C3121DD62379586C1600ACD6A71742B9D21EE8958DBE2198B5`.
- WC01-REPAIR01 SHA-256: `2613DD0A0A069144FA2303B2DE13507F356E1F0764DCF7A357D4CF5E65CDD534`.
- WC01-REPAIR02 SHA-256: `A91197C88E988C7138A589B1A6800CC4A13448AFFC46799FD76CA5BDC7BC8DE9`.
- Initial Git status: dirty branch with pre-existing changes in `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`, `package.json`, `planning/phases/phase-07/Work_Cards/WC01-REPAIR01_execution_authority_historical_bundle_validation_correction.md`, `scripts/codex-validate.ps1`, deleted `scripts/verify-governance-repair-approval-mounted.cjs`, `src/main/artifacts/governanceApprovalService.ts`, `src/renderer/app/App.tsx`, `src/shared/projects/projectWorkspace.ts`, untracked REPAIR01 report, untracked WC01-REPAIR02 Work Card, and untracked `test/`.
- Final Git status: not staged, not committed, not pushed. The same pre-existing dirty state remains, plus this report and REPAIR02 edits in authorized files.
- Git actions performed: none. No staging, commit, push, reset, clean, stash, restore, merge, rebase, tag, release, or history rewrite.
- Commit hash: not created; Git mutation prohibited by the Work Card.

## Files Changed By This Pass

Production:

- `src/shared/operatorDecisionContract.ts`
- `src/main/artifacts/governanceApprovalService.ts`

Permanent tests:

- `test/workflow/operator-decision-routing.test.cjs`
- `test/governance/operator-decision-contract.test.cjs`
- `test/governance/operator-decision-service.test.cjs`
- `test/execution-runs/execution-run-authority.test.cjs`
- `test/renderer/operator-approval-workspace.mounted.cjs`
- `test/repository/test-suite-integrity.test.cjs`

Report:

- `planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR02_production_path_test_authority_and_bundle_identity_correction.md`

Files intentionally not created: JSON report sidecar, Registry entry, approval artifact, release artifact, package, tag, commit, new test helper, new test file, Work-Card-named test path.

## Implementation Summary

- Added exported `operatorStageDecisionValues`, `operatorRecordDispositionValues`, and `computeOperatorDecisionTargetSetHash()` in `src/shared/operatorDecisionContract.ts`.
- Tightened `validateOperatorDecisionIntentShape()` to reject unsupported outcome kinds, unsupported decisions/dispositions, `merged` without `canonicalSurvivingArtifactId`, and `superseded` without `supersedingArtifactId`.
- Normalized stage outcomes before equality comparison so persisted JSON key order cannot turn an exact retry into a false conflict.
- Replaced local governance approval target hashing and outcome equality with the shared production functions.
- Refactored Phase Planning bundle resolution to return one `ResolvedPhasePlanningBundle` containing verified Phase Planning target, verified Work Card Plan target, and normalized bindings.
- Made both Phase Planning and Work Card Plan queue rows derive identity from the exact Phase Planning anchor, including historical approval ID and file stem.
- Changed direct lookup to use the same identity-anchor path and `findApprovalEntryForTarget()` so legacy-format evidence returns pending plus evidence instead of being reinterpreted as an exact new-system decision.
- Rewrote only `test/workflow/operator-decision-routing.test.cjs`; it now persists canonical artifacts, approves through `GovernanceApprovalService`, scans through `scanVerifiedArtifactGraph`, and resolves through `RelationshipDrivenWorkflowResolver`.
- Amended the mounted renderer file so Node discovery registers `mounted Operator approval workspace executes through Electron`, spawns Electron with the same file, and asserts child status `0`.
- Made the Execution Run test explicitly disclose the retained WC05 Architect Review compatibility dependency and assert exactly the three source authority entries before starting.

## Test Preservation Table

| Test file | Change mode | Pre-existing assertions preserved | Assertions changed or added | Reason |
| --- | --- | --- | --- | --- |
| `test/workflow/operator-decision-routing.test.cjs` | Complete rewrite, explicitly authorized | None; the prior file manually fabricated workflow authority and approval projections | Added three production-path scenarios for `requiresImplementer` with absent, false, and true legacy `codeChangesAuthorized` cases | Work Card Correction 4 required complete replacement |
| `test/renderer/operator-approval-workspace.mounted.cjs` | Targeted startup amendment | Existing Electron fixture, production commits, UI navigation, assertions, timeout handling, cleanup, and failure exits | Replaced only non-Electron success bypass with Node `test()` plus `spawnSync(require("electron"), [__filename])` and `status === 0` | Work Card Correction 5 |
| `test/governance/operator-decision-contract.test.cjs` | Targeted amendment | Existing normalization, deterministic payload, target-change, stage, duplicate, reason, merged-valid assertions | Replaced local `targetHash()` and `node:crypto` import with `computeOperatorDecisionTargetSetHash()`; added unsupported kind/value, `superseded`, and stable outcome-equality assertions | Work Card Correction 6 and production equality regression proof |
| `test/governance/operator-decision-service.test.cjs` | Additive targeted amendment | Existing temporary repo, service usage, pending lookup non-mutation, persisted approval, stale revision, non-Implementer output, bundle, invalid bundle, legacy queue assertions | Added exact retry with normalized reason, changed-reason conflict, different-outcome conflict, stale/duplicate bundle rejection, direct legacy lookup pending evidence, historical bundle convergence | Work Card Correction 6 |
| `test/execution-runs/execution-run-authority.test.cjs` | Targeted fixture-disclosure amendment | Existing service setup, eligible list, start, exact repeat start, wrong-revision rejection, no Phase 07 assertion, cleanup | Test name discloses WC05 dependency; source paths centralized; pre-run Registry asserted exactly three source authority entries | Work Card Correction 7 |
| `test/repository/test-suite-integrity.test.cjs` | Additive guardrails | Existing test tree, package lane, no `src` imports, no Work-Card test island, no verify-script lane assertions | Added contract hash guard, routing fabrication guard, mounted launcher guard, and exact Execution Run fixture path guard | Work Card Correction 8 |
| `test/repository/validation-runner.test.cjs` | Unchanged | All existing wrapper failure-propagation assertions | None | No change authorized |

Only `test/workflow/operator-decision-routing.test.cjs` was completely rewritten.

## Evidence

| Criterion | Production evidence | Test evidence | Observed result |
| --- | --- | --- | --- |
| Phase Planning bundle identity converges on Phase Planning anchor | `src/main/artifacts/governanceApprovalService.ts` `ResolvedPhasePlanningBundle`, `resolvePhasePlanningBundle()`, `targetStateFor()` | `test/governance/operator-decision-service.test.cjs` historical bundle assertions | Before decision both rows share `approvalArtifactId`; after decision both rows are `exact`, share `existingApprovalArtifactId`, one event, and one approval Registry entry |
| Unsupported outcomes rejected at runtime | `validateOperatorDecisionIntentShape()` | `test/governance/operator-decision-contract.test.cjs` unsupported kind, stage value, disposition value, merged, superseded assertions | Rejections passed |
| Production owns target hashing | `computeOperatorDecisionTargetSetHash()` | Contract test imports shared function; integrity test forbids `node:crypto` and `createHash(` in contract test | Passed |
| Production owns outcome equality | `operatorDecisionOutcomeEquals()` imported by `governanceApprovalService.ts` | Contract stable key-order equality assertion; service exact retry assertion | Passed |
| Direct legacy evidence lookup pending | `lookupDecisionState()` uses `findApprovalEntryForTarget()` through identity anchor | `legacyPendingLookup` in governance service test | Pending plus one legacy evidence item |
| Changed reason and changed outcome conflict | `decide()` idempotency comparison | `changedReason`, `changedOutcome` service assertions | Both rejected with durable-decision conflict |
| Bundle rejection cases | `verifyDecisionTargetSet()` and `resolvePhasePlanningBundle()` | mixed foreign binding, mixed phase, stale, duplicate Phase Planning, duplicate Work Card Plan assertions | All rejected |
| Routing test production path | No direct kernel import in test; resolver used through `RelationshipDrivenWorkflowResolver` | `test/workflow/operator-decision-routing.test.cjs` commits canonical artifacts, scans graph, resolves projection | Implementer route appears only for `requiresImplementer: true`; false case has no assignment |
| Mounted Node discovery executes Electron | Dual-mode launcher in mounted file | Unit lane reported test `mounted Operator approval workspace executes through Electron`; JSON summary emitted by Electron child | Parent exit `0`, child status `0` |
| Execution Run fixture disclosure | No production execution-run file modified | Execution Run test asserts exactly three source authority entries | Passed; WC05 dependency retained and disclosed |

The mixed-project bundle fixture cannot be committed as a mixed-project Registry through `ArtifactPairService`; the production writer rejects Registry project mixing before such a state can exist. The service-level adversarial case therefore uses a foreign target binding and proves the GovernanceApprovalService rejects it as not registered, not visible, or not configured for the project.

## Validation

Execution lane: normal Windows lane for final required commands. A sandboxed `npm run build` attempt failed with documented `spawn EPERM`; it was rerun successfully in the required lane. A targeted sandboxed Node test also hit `spawn EPERM` before execution and was rerun successfully in the required lane.

| Command | Lane | Parent exit | Child details | Result |
| --- | --- | ---: | --- | --- |
| `npm run typecheck` | normal Windows | 0 | `tsc --noEmit` exit 0 | Passed |
| `npm run build` | normal Windows | 0 | `tsc`, Vite build, asset copy exit 0; non-failing chunk-size warning | Passed |
| `npm run test:unit` | normal Windows | 0 | Build exit 0; Node tests 7, pass 7, fail 0, skipped 0, cancelled 0; Electron child count 1, child status 0 | Passed |
| `npm run test:repository` | normal Windows | 0 | Node tests 2, pass 2, fail 0, skipped 0, cancelled 0 | Passed |
| `npm run test:renderer:built` | normal Windows | 0 | Direct Electron execution count 1, exit 0; mounted JSON summary emitted | Passed |
| `npm run test:full` | normal Windows | 0 | Build exit 0; Node tests 7 pass; Electron child count 1; direct renderer count 1 | Passed |
| `npm run validate:codex:unit` | normal Windows wrapper | 0 | Wrapper ran `npm run test:unit`; child exit 0 | Passed |
| `npm run validate:codex:build` | normal Windows wrapper | 0 | Wrapper ran `npm run build`; child exit 0 | Passed |
| `npm run validate:codex` | normal Windows wrapper | 0 | Wrapper ran `npm run test:full`; child exit 0 | Passed |

Electron emitted GPU command-buffer messages during renderer runs, but all renderer assertions completed and all parent/child exits were `0`.

## Security And Scope Notes

- Secret scan over REPAIR02 production/test/report inputs found no secrets, keys, credentials, private tokens, or `.env` files. Matches were environment-variable references in the mounted renderer fixture, not secret material.
- Local path scan found no concrete local machine paths introduced in REPAIR02 files or this report.
- No unauthorized file was modified by this pass. Pre-existing dirty files outside the authorized REPAIR02 surface remain dirty and were not reverted or edited.
- No later Work Card was implemented. WC01 remains unresolved. WC02 through WC13 remain unauthorized.

## Manual Validation Required

No new Operator manual UI step is added by this repair. Remaining Operator validation is the WC01-REPAIR01 procedure:

1. Historical Work Card opens Work Card Approval and is visibly historical.
2. Historical Phase Planning opens Operator Phase Approval and shows both exact members.
3. No Historical Review destination exists.
4. Approved implementation Work Card shows no separate code-change authorization control.
5. Legacy evidence remains visible without resolving the exact pending target.

## Residual Risks

- The WC05 Architect Review compatibility dependency remains in Execution Run authority fixtures by Work Card instruction. Deletion is assigned to WC12.
- The working tree contains pre-existing dirty files outside this repair scope. They were preserved and not validated as REPAIR02 changes.
- Chunk-size warnings remain non-failing build warnings and were not in scope.

## Recommended Next Implementer Task

Submit this REPAIR02 implementation for independent verification against the Work Card acceptance criteria, especially the historical bundle identity convergence and production-path routing assertions.
