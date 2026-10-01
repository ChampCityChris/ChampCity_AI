# RWS04A Implementer Report

Status: implementation checkpoint with affected-validation blockers; Architect review required.

## Scope and repository

Operator requested execution of RWS04A, a Structured Project State domain foundation card. Verified the approved primary repository root as `<PROJECT_REPO>` using Git. Branch: `dev`; configured origin: `ChampCityChris/ChampCity_AI`. No upstream tracking information was reported by branch status. No fetch, push, merge, or release action performed. Pre-existing unrelated working-tree changes were preserved and excluded from staging.

## Implementation

- Registered SQL-backed `WorkflowIntake` with exact Workflow ID/type and bounded scalar-map values: ordinary objects, at most 32 keys, keys of 1–128 characters without controls, non-empty strings up to 4,096 UTF-8 bytes or booleans, and the existing 65,536-byte record cap. No nested JSON support.
- Added immutable same-Project `intake_for` ownership. Target must be current and active, match body ID/type, and exclude Work Intake Routing. Project Creation is allowed.
- Added transactional `saveWorkflowIntake`: creates or revises one exact linked Intake, fails closed on duplicate active Intakes or stale expected versions, retains identity, increments the record version once, and leaves Workflow/workspace unchanged. Generic create/revise/supersede and ownership-link commands cannot bypass this path.
- Added human Operator-only `recordWorkflowIntakeDecision`, bounded rationale/notes, mandatory nonblank notes for Revision Requested, exact-version validation, immutable Decisions and `governs` links. Rationale and notes are combined in the existing bounded Decision rationale field; no Decision schema extension.
- Added transactional `getWorkflowIntakeDisposition`, selecting only effective human Operator reviews with exact current `workflow-intake:<intakeId>@<recordVersion>` scope. Historical Decisions remain intact when Intake is revised. Generic Decision creation/correction cannot bypass the typed review path.
- Updated the two architecture documents narrowly to establish SQL authority, projection-only Markdown, and incremental family adoption before final project-wide authority cutover.

## Files

Modified:

- `src/shared/projectState/domainContracts.ts`
- `src/shared/projectState/entityTypeRegistry.ts`
- `src/shared/projectState/relationshipRegistry.ts`
- `src/shared/projectState/projectStateService.ts`
- `test/project-state/domain-contracts.test.cjs`
- `test/project-state/decision-disposition.test.cjs`
- `test/project-state/sqlite-store-conformance.test.cjs`
- `docs/architecture/CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md`
- `docs/architecture/CHAMPCITY_STRUCTURED_PROJECT_STATE_SQLITE_PERSISTENCE_ARCHITECTURE.md`

Created this report. No files deleted. Intentionally no new permanent test files, SQL migrations, dependencies, renderer/IPC/preload changes, legacy Markdown service changes, workflow routing changes, Git/source-control production changes, or production Intake caller switch. The legacy canonical writer fence is unchanged. Temporary change-set and receipts remain ignored under `tmp/`.

## Test ownership and compatibility

Extended existing domain/service/store owners. Domain proof covers scalar-map shape, unsupported values, key/count/string/record bounds and matching immutable ownership. Decision proof runs on both in-memory and SQLite stores, proving create/revise persistence, Greenfield support, routing and mismatched-owner rejection, duplicate fail-closed behavior, all three review outcomes, stale-version rejection, required notes, principal enforcement, generic bypass rejection, and unchanged Workflow state.

Existing-schema compatibility proof first persists a Project in the existing schema, closes and reopens the database, then stores and reads WorkflowIntake. It compares sqlite_master definitions, schema_migrations receipts and project_state_authority rows before and after, and verifies persistence on a further reopen. No schema migration was introduced.

The existing domain fixture lacked the currently required TesterResult sourceMode. Added `source-backed` to that fixture so the registry inventory and relationship tests can execute against current contracts. No production behavior was changed for that fixture. This is the only fixture-alignment deviation.

## Validation receipts

All commands ran from `<PROJECT_REPO>` using the installed Windows toolchain.

- `npm run validate:plan -- --profile work-item --changes tmp/rws04a-changes.json`: restricted Windows lane, exit 0; selected 44 test files plus production build.
- `npm run test:affected -- --changes tmp/rws04a-changes.json`: restricted Windows lane, exit 1, build launch `spawn EPERM`; no tests executed. Receipt `cbc53237-4844-480a-bf5c-964da9fea197`. Recorded once and rerun in normal Windows lane per repository guidance.
- Same affected command, normal Windows lane: exit 1; production build passed; 37 files passed and seven failed. Receipt `fac29482-3ed1-49e0-8f93-bf84cfa5ff79`, 159,798 ms. The outdated owned domain fixture was corrected.
- Same affected command after fixture alignment and typed correction guard, normal Windows lane: exit 1; production build passed; 38 files passed and six failed. Receipt `4758126f-4ed8-45f4-890d-5ddb3f55f3bf`, 153,431 ms. Source remained stable during validation.
- Final extended owners all passed: domain-contracts 8/8, decision-disposition 8/8, sqlite-store-conformance 9/9 (25 tests total). These are direct domain/service/store proofs, not a production Intake caller or UI acceptance claim.
- `node --test test/project-state/domain-contracts.test.cjs test/project-state/decision-disposition.test.cjs test/project-state/sqlite-store-conformance.test.cjs`: normal Windows lane, exit 0, 25/25 tests passed on the final successful build; restored the original precise unrelated source-reference assertion before this focused rerun.
- `git diff --check`: exit 0. Final staged equivalent and bounded safety scan performed before checkpoint.

Remaining affected failures:

| Test owner | Observed failure |
| --- | --- |
| `test/agent-harness/repository-io-hardening.test.cjs` | Registered-root toolbox status assertion fails. |
| `test/agent-harness/reserved-toolbox-namespace.test.cjs` | Existing toolbox namespace/placeholder assertions fail. |
| `test/project-intake/post-submit-review-state.test.cjs` | Renderer fixture accesses projectId on null. |
| `test/project-state/execution-completion.test.cjs` | Existing source-neutral planning scenarios request unavailable required deterministic catalog proof. |
| `test/source-control/managed-project-source.test.cjs` | Git candidate preparation failures in existing normalization scenarios. |
| `test/source-control/workflow-integration-service.test.cjs` | Existing integration vertical returns failed instead of integrated. |

These failures occur outside the new WorkflowIntake path; this pass does not establish their original baseline or repair their owners. Affected qualification is failed, not waived or reported as passing. Full/release qualification, desktop launch, external integration and visual acceptance were not run because they are outside this foundation card.

## Safety, checkpoint and remaining work

Exact attributable staging excludes unrelated edits, temporary receipts, generated output, dependencies and the untracked card bundle. Bounded staged scan checks secrets, concrete local paths and generated-artifact inclusion. No credentials were accessed or persisted.

Required checkpoint message: `RWS04A add structured workflow intake domain`. Commit hash pending at report creation; actual hash will be reported after commit, without amending this report solely to insert its own commit hash. No push.

Architect review remains required. Resolve or disposition the six affected-validation failures before claiming full qualification, then proceed to RWS04B/C only under their approved cards. No visual Operator acceptance is needed for this domain-only checkpoint. STOP after the required commit.
