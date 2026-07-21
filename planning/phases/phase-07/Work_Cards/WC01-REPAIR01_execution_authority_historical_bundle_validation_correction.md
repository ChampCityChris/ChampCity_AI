# Work Card — Phase 07 WC01-REPAIR01 Execution Authority, Historical Bundle, and Validation Integrity Correction

Status: pending Operator approval through ChatGPT
Revision: 2
Phase: Phase 07
Parent: `WC01_unified_operator_decision_and_disposition_contract`
Repair sequence: 1
Risk: high
Owner after approval: Implementer
Recommended model: GPT-5.6 Thinking, high reasoning
Implementation authorized: no — separate Operator approval required
Git mutation authorized: no

## Revision 2 Direction

Revision 1 is rejected.

The Operator deleted all 18 legacy files under `test/` because Work-Card-named test suites contained reusable test logic under temporary Work Card identities and could conceal shadow implementations or produce false confidence.

Those deletions are intentional and must be preserved. No deleted test file or `test/wc*` directory may be restored.

This repair must establish capability-oriented tests under stable subsystem names, remove assertion-bearing `scripts/verify-*` files from the supported automated test lane, and correct the validation wrapper so a failed child command cannot produce a successful wrapper result.

## Purpose

Correct only the defects found in the WC01 implementation review and establish trustworthy automated proof for the corrected capability.

WC01 remains unresolved. WC02 through WC13 remain unauthorized.

Source report:

`planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC01_unified_operator_decision_and_disposition_contract.md`

## Defect 1 — Legacy execution gate remains active

`src/main/artifacts/governanceApprovalService.ts` still requires both `requiresImplementer === true` and `codeChangesAuthorized === true` before an approved Work Card can route to execution.

### Required fix

1. Delete the current `canAuthorizeImplementation()` behavior.
2. Add a helper named `workCardRequiresImplementer()`.
3. The helper returns `true` only when the Work Card payload contains `requiresImplementer === true`.
4. The helper must not read:
   - `codeChangesAuthorized`;
   - `sourceCodeChangesAuthorized`;
   - `implementationAuthorized`;
   - `authorizationGranted`;
   - `executionPassesAuthorized`;
   - `pushAuthorized`;
   - any renamed equivalent.
5. Use `workCardRequiresImplementer()` for queue projection and the temporary in-memory execution projection after an exact `approved` Work Card decision.
6. Copy the Work Card’s declared Implementer Report expected output into the approval artifact only when `requiresImplementer === true` and the exact decision is `approved`.
7. Do not migrate or delete legacy fields from repository artifacts in this repair. Ignore them.

Required behavior:

- `requiresImplementer: true` with `codeChangesAuthorized` absent routes to execution after exact approval.
- `requiresImplementer: true` with `codeChangesAuthorized: false` behaves identically.
- `requiresImplementer: false` with `codeChangesAuthorized: true` does not route to execution.
- Changing only `codeChangesAuthorized` changes no target hash, queue result, decision result, approval artifact, or route result.

## Defect 2 — Historical records use a separate approval class and screen

The WC01 implementation added `historical_record` and `historical-operator-review`. Historical status must not create a separate decision class or workspace.

### Required fix

In `src/shared/projects/projectWorkspace.ts`:

- remove `historical_record` from `approvalClassification`;
- remove `historical-operator-review` from `decisionWorkspaceScreenId`.

In `src/main/artifacts/governanceApprovalService.ts`:

- derive classification from stage and artifact type, never from status;
- historical Work Cards use stage `work_card`, classification `work_card`, screen `operator-work-card-approval`, and label `Work Card Approval`;
- historical Phase Planning and Work Card Plan records use stage `phase_planning`, classification `phase_planning`, screen `operator-phase-approval`, and label `Operator Phase Approval`;
- historical status remains visible through the item `status` and legacy evidence;
- collision-safe decision artifact paths may remain, but must not change stage, class, screen, or decision semantics.

In `src/renderer/app/App.tsx`:

- delete the `historical-operator-review` screen ID;
- delete the Historical Review navigation item;
- delete the separate historical screen mapping;
- display historical status and legacy evidence inside the existing stage-owned approval workspace.

Update `src/renderer/global.d.ts` only if required by the type removal. Do not add an alias screen.

## Defect 3 — Historical Phase Planning does not form the exact stage bundle

Add a private `resolvePhasePlanningBundle()` method to `GovernanceApprovalService`.

Given a Phase Planning or Work Card Plan target, it must:

1. require a non-empty project ID and phase ID;
2. set `historicalMode = target.status === "historical"`;
3. select visible, registered, non-archived entries with:
   - the same project ID;
   - the same phase ID;
   - artifact type `phase_planning` or `work_card_plan`;
   - the same historical mode;
4. require exactly one `phase_planning` entry;
5. require exactly one `work_card_plan` entry;
6. reject a missing or duplicate member;
7. read and verify both exact artifact pairs through `ArtifactPairService`;
8. return exactly those two normalized target bindings.

Use this method for current and historical Phase Planning queue items. Remove the condition that excludes historical targets.

The Phase Planning item and Work Card Plan item representing the same bundle must expose identical target bindings and the same `targetSetHash`.

## Defect 4 — Multi-target decisions trust invalid membership

Add a private `verifyDecisionTargetSet()` method to `GovernanceApprovalService`.

Call it from both `decide()` and `lookupDecisionState()` after exact target reads and before lookup or persistence.

For every target set:

- all targets must belong to the configured project;
- every artifact type must map to the supplied decision stage;
- all targets must be visible, registered, and non-archived;
- select the identity anchor by artifact type, never by input position, filename, path, title, or lexical artifact-ID order.

For `phase_planning`:

- require exactly two targets;
- require exactly one `phase_planning` target;
- require exactly one `work_card_plan` target;
- require the same non-empty project ID;
- require the same non-empty phase ID;
- require both records to be historical or both records to be non-historical;
- resolve the canonical bundle through `resolvePhasePlanningBundle()`;
- require the normalized submitted bindings to exactly equal the resolved bindings;
- reject incomplete, extra, duplicate-type, mixed-project, mixed-phase, mixed-stage, mixed historical/current, or stale bundles.

For `work_card`, `operator_validation`, and `phase_closeout`, require exactly one target in this repair.

For `phase_planning`, anchor approval identity and location to the exact `phase_planning` artifact. Permit multiple targets because the stage is `phase_planning`, not because of a classification field.

Do not implement the Project Planning bundle. WC04 owns that work.

## Defect 5 — Pending lookup lacks direct proof

Directly test `lookupDecisionState()` through the production service.

Prove:

- no new-system decision returns `pending_operator_disposition`;
- pending lookup creates no approval artifact or event;
- pending lookup does not change Registry revision;
- pending lookup does not change repository file count;
- legacy evidence does not resolve a new exact target;
- after a decision, lookup returns `decided` with the durable event;
- a later target revision is pending while the prior exact decision remains durable for the prior target hash.

## Defect 6 — Test organization and false-green validation are invalid

The `test/` directory is intentionally empty after the Operator deleted these legacy suites:

- `test/wc01-repair01/`
- `test/wc02-repair02/`
- `test/wc02-repair03/`
- `test/wc02/`
- `test/wc04/`
- `test/wc05/`
- `test/wc06/`
- `test/wc09/`

Do not restore any deleted path or file.

### Required permanent test tree

Create exactly these test files:

```text
test/governance/operator-decision-contract.test.cjs
test/governance/operator-decision-service.test.cjs
test/workflow/operator-decision-routing.test.cjs
test/execution-runs/execution-run-authority.test.cjs
test/renderer/operator-approval-workspace.mounted.cjs
test/repository/test-suite-integrity.test.cjs
test/repository/validation-runner.test.cjs
```

Do not create a Work-Card-named test directory, test filename, fixture directory, helper module, or test command.

### Test implementation rules

All seven files are permanent capability tests.

They must:

- test stable product capabilities rather than WC01 or any other Work Card identity;
- import compiled production modules from `dist/` for product behavior;
- exercise the actual production contract, services, artifact writer, Registry, resolver, and renderer boundary;
- create isolated temporary repositories through `mkdtemp`;
- create governed test artifacts through production `ArtifactPairService.commitArtifact()`;
- delete temporary repositories after each test;
- inspect actual persisted decision artifacts, Registry state, lookup results, and routed results;
- use the public preload/main boundary for mounted renderer behavior.

They must not:

- import production behavior from `src/` as a substitute for running compiled code;
- copy, reimplement, or locally simulate target hashing, decision persistence, bundle resolution, route selection, Registry behavior, or execution authority;
- define a fake `GovernanceApprovalService`, fake resolver, fake Registry, fake artifact writer, or equivalent shadow implementation;
- monkey-patch production methods to force a pass;
- replace actual services with stubs for acceptance behavior;
- pass based only on source-text searches, string presence, or regex inspection of production files;
- write test artifacts into the live repository planning corpus;
- silently skip a test when a required production capability is missing;
- convert a failed assertion into a warning;
- catch an unexpected failure and return success.

Local functions inside a test file may perform only mechanical setup such as creating a temporary directory, constructing plain input objects, listing files, or removing the temporary directory. They must not calculate the expected production result.

### Exact test ownership

`test/governance/operator-decision-contract.test.cjs` must test:

- supported stage and outcome validation;
- required reasons;
- merged and superseded related-ID requirements;
- duplicate target rejection;
- target-order normalization;
- target-hash invariance when order changes;
- target-hash change when revision, payload hash, membership, or stage changes;
- normalized reason equality and changed-reason conflict inputs.

`test/governance/operator-decision-service.test.cjs` must test:

- single-record decisions;
- current and historical Phase Planning bundles;
- exact bundle membership validation;
- all invalid bundle combinations named in Defect 4;
- finality and true idempotency;
- pending lookup non-mutation;
- legacy evidence behavior;
- persisted `operator_approval` artifact type;
- absence of every prohibited authority field;
- no effect from `codeChangesAuthorized` or equivalent legacy fields.

`test/workflow/operator-decision-routing.test.cjs` must test:

- exact approved Work Card plus `requiresImplementer: true` routes to execution without `codeChangesAuthorized`;
- `codeChangesAuthorized: false` produces the same result;
- `requiresImplementer: false` cannot route through a legacy authorization field;
- historical Work Cards route through normal Work Card approval;
- historical Phase Planning routes through normal Phase Planning approval;
- no historical-only screen or class is produced by public queue or routing results.

`test/execution-runs/execution-run-authority.test.cjs` must replace the deleted WC06 test with a capability test that:

1. reads:
   - `planning/phases/phase-06/Work_Cards/WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.json`;
   - `planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.json`;
2. creates a temporary repository;
3. commits the Work Card first and approval second through `ArtifactPairService.commitArtifact()`;
4. preserves ID, type, status, project, phase, Work Card ID, parent, relationships, payload, and canonical relative location;
5. constructs `ExecutionRunPersistenceService` and `ExecutionRunAuthorityService` against that temporary root;
6. proves eligible listing, start, idempotent repeat start, and wrong-revision rejection;
7. deletes the temporary repository;
8. does not read or copy the live Registry;
9. does not restore or depend on any Phase 07 ChampCity_GPT file.

`test/renderer/operator-approval-workspace.mounted.cjs` must be written as a new mounted Electron test under `test/renderer/`. It must not copy the old script implementation.

It must:

- launch the built application through the actual Electron entry point;
- use an isolated temporary repository created through production artifact commits;
- interact through the public preload API and rendered UI;
- prove a historical Work Card opens `Work Card Approval`;
- prove a historical Phase Planning bundle opens `Operator Phase Approval` and displays both exact members;
- prove no Historical Review destination exists;
- prove legacy evidence is visible but does not resolve the exact pending target;
- close Electron and remove the temporary repository;
- return a nonzero process exit on any failed assertion.

`test/repository/test-suite-integrity.test.cjs` must enforce:

- no directory directly under `test/` begins with `wc`, case-insensitive;
- no permanent test filename contains a Work Card or repair identifier;
- no test file imports from `src/` for production behavior;
- no production file imports from `test/`;
- no `package.json` test script references `test/wc`;
- no `package.json` test script references an assertion-bearing `scripts/verify-*` harness;
- `test:unit:built` uses Node test discovery rather than an explicit file whitelist;
- every `.test.cjs` under `test/` is discoverable by the default Node test runner;
- the mounted Electron test is located under `test/renderer/` and is invoked by `test:renderer:built`.

Source scanning is permitted only in this repository-boundary suite and only to enforce file placement, imports, and test-command integrity. It must not be used as proof of product behavior.

`test/repository/validation-runner.test.cjs` must behaviorally test the Windows validation wrapper:

1. create a temporary directory;
2. copy `scripts/codex-validate.ps1` into it;
3. create a minimal `package.json` whose `test:unit` command exits with code `7`;
4. invoke the copied wrapper with `-Suite unit` through `powershell.exe`;
5. assert the wrapper exits nonzero;
6. replace the child command with one that exits `0`;
7. invoke the wrapper again and assert it exits `0`;
8. delete the temporary directory.

Do not prove wrapper behavior through source-text inspection alone.

## Required validation-wrapper correction

Modify `scripts/codex-validate.ps1` exactly at the npm invocation boundary.

`Invoke-NpmScript` must invoke:

```powershell
& npm.cmd run $Name
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
  Write-Error "npm run $Name failed with exit code $exitCode."
  exit $exitCode
}
```

Do not catch or replace that nonzero exit later in the script.

A failed child npm command must terminate the wrapper with a nonzero process exit.

## Required package.json test-lane correction

Modify `package.json` as follows:

1. Set `test:unit:built` exactly to:

```text
node --test --test-concurrency=1
```

2. Set `test:repository` exactly to:

```text
node --test --test-concurrency=1 test/repository/test-suite-integrity.test.cjs test/repository/validation-runner.test.cjs
```

3. Set `test:renderer:built` exactly to:

```text
electron test/renderer/operator-approval-workspace.mounted.cjs
```

4. Set `test:full` exactly to:

```text
npm run build && npm run test:unit:built && npm run test:renderer:built
```

5. Remove these stale Work-Card or deleted-suite scripts:

- `test:legacy-migration:wc09`;
- `test:wc04`;
- `test:wc05`;
- `test:wc06`;
- `test:governance-mounted`;
- `test:semantic-repair`.

6. Do not add another test script that lists individual Work-Card-named files.

7. Do not invoke any `scripts/verify-*` file from an npm test script.

The existing `validate:codex`, `validate:codex:unit`, and `validate:codex:build` wrapper entries remain.

## Required durable test-policy update

Update `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` by adding a section titled:

`## Permanent Test Organization And Integrity`

The section must state:

- permanent tests live under `test/<stable-capability>/`;
- permanent test paths and filenames do not use Work Card or repair IDs;
- Work-Card-specific temporary tests are not part of the default lane and must be removed or promoted before Work Card acceptance;
- promoted tests are rewritten under a stable capability identity rather than renamed without review;
- assertion-bearing automated tests live under `test/`, not `scripts/`;
- scripts may launch tools but may not contain reusable acceptance logic;
- tests exercise production modules and may not reproduce production authority;
- the default unit lane uses automatic discovery and may not whitelist selected files;
- a wrapper must propagate child-process failure codes;
- deletion of an invalid test does not authorize claiming its former coverage.

Do not duplicate these rules in `AGENTS.md`; it already requires this boundary document to be read.

## Obsolete test and script handling

Preserve the Operator’s 18 deleted test files as deleted.

Delete:

`scripts/verify-governance-repair-approval-mounted.cjs`

only after the new mounted renderer test passes, because the new capability test replaces its WC01-relevant role.

Do not restore, edit, or count any deleted `test/wc*` file.

Do not count any remaining `scripts/verify-*` harness as WC01-REPAIR01 acceptance evidence. They remain outside the supported automated test lane until a later approved Work Card rewrites or retires them.

The Implementer Report must not claim that deleted legacy coverage has been restored. It must list the exact seven supported test files created by this repair and the exact capability each proves.

## Authorized production files

- `src/main/artifacts/governanceApprovalService.ts`
- `src/shared/projects/projectWorkspace.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/global.d.ts` only if required
- `src/main/workflow/normalizedWorkflowDomainAdapter.ts` only if required to compile the existing in-memory projection; it must not read legacy authorization fields

## Authorized validation and policy files

- `package.json`
- `scripts/codex-validate.ps1`
- `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`
- deletion of `scripts/verify-governance-repair-approval-mounted.cjs` after replacement proof

## Authorized test files

Create only the seven files listed under Required permanent test tree.

Do not create shared test helpers, fixture modules, snapshots, generated expected outputs, Work-Card-specific tests, or another test command.

## Out of scope

Do not migrate the planning corpus, clean duplicates, assign pending state across repository records, build later stage workspaces, build the roadmap UI, redesign the workflow kernel, redesign the Registry, redesign Governance Repair, redesign IPC, redesign Execution Runs, restore ChampCity_GPT records, add fallback authority, or perform Git operations.

Do not reconstruct all deleted legacy test coverage in this repair. Only the seven expressly required permanent capability tests are authorized.

## Validation

Run through the documented normal Windows lanes:

```text
npm run typecheck
npm run build
npm run test:unit
npm run test:repository
npm run test:renderer:built
npm run test:full
npm run validate:codex:unit
npm run validate:codex:build
npm run validate:codex
```

Do not use Playwright.

A wrapper exit code is not a pass when child output contains a failed test. After the wrapper correction, every failed child command must also produce a nonzero wrapper exit.

No pre-existing-failure exception is granted. Every command above must pass.

The report must state the exact number of discovered test files, executed tests, passed tests, failed tests, and skipped tests. Skipped tests are not permitted unless the Operator explicitly authorizes one before implementation.

## Implementer Report

Create only:

`planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_execution_authority_historical_bundle_validation_correction.md`

The report must include:

- repository, remote, branch, starting HEAD, parent WC01 hash, repair Work Card hash, and initial/final status;
- exact files changed and deleted;
- confirmation that all 18 Operator-deleted legacy tests remain deleted;
- proof that no WC01 authority path reads `codeChangesAuthorized` or an equivalent legacy field;
- historical stage/workspace correction;
- exact bundle resolver and validator behavior;
- direct pending lookup proof;
- execution-run temporary-repository proof;
- mounted renderer proof;
- validation-wrapper failure-propagation proof;
- package test-discovery proof;
- exact seven permanent tests created and their capability ownership;
- exact test counts and all command results with execution lanes;
- a criterion-by-criterion evidence table citing production symbol, test file, test name, command, and observed result;
- every retained in-memory compatibility projection and deletion owner:
  - stage projections: WC05 through WC08;
  - execution projection: WC12;
- confirmation that no historical-only class or screen remains;
- confirmation that no obsolete ChampCity_GPT pair was restored;
- confirmation that no deleted Work-Card-named test was restored;
- confirmation that no `scripts/verify-*` harness was counted as acceptance evidence;
- confirmation that no Git mutation occurred and no later Work Card was implemented.

Do not create a JSON sidecar, Registry entry, application approval artifact, release, package, tag, or commit.

## Acceptance criteria

1. `codeChangesAuthorized` and equivalents have no effect on decision or execution routing.
2. `requiresImplementer: true` plus exact approval is sufficient for the temporary execution projection.
3. `requiresImplementer: false` cannot become execution work through a legacy flag.
4. `historical_record` and `historical-operator-review` are removed.
5. Historical Work Cards use the normal Work Card stage and workspace.
6. Historical Phase Planning uses the normal two-record Phase Planning bundle and workspace.
7. Bundle resolution requires exactly one Phase Planning and one Work Card Plan for one project, phase, and historical mode.
8. Submitted multi-target decisions must exactly equal the resolved bundle.
9. Anchoring uses artifact type, not target ordering or ID text.
10. Pending lookup is directly proven non-mutating.
11. Decisions remain `operator_approval` artifacts using the WC01 payload schema and no prohibited fields.
12. Execution Run authority is tested in an isolated temporary repository without Phase 07 files.
13. All 18 deleted legacy test files remain deleted.
14. No Work-Card-named directory or file exists under `test/`.
15. Exactly seven permanent capability test files are created at the approved paths.
16. Product behavior tests exercise compiled production modules and contain no shadow production implementation.
17. `package.json` uses automatic Node test discovery and contains no Work-Card test whitelist.
18. No npm test script invokes `scripts/verify-*`.
19. The Windows validation wrapper exits nonzero when a child npm command fails.
20. The obsolete governance approval mounted script is replaced by the capability test under `test/renderer/` and deleted.
21. The obsolete ChampCity_GPT WC01 pair remains absent.
22. Every required validation command passes with zero failed and zero skipped tests.
23. The Implementer Report provides complete, non-narrative evidence for every criterion.
24. Scope and Git restrictions are respected.

## Manual validation after Architect review

The Operator should confirm:

1. a historical Work Card opens Work Card Approval and is visibly marked historical;
2. a historical Phase Planning bundle opens Operator Phase Approval and shows both exact members;
3. no Historical Review destination remains;
4. an approved implementation Work Card displays no separate code-change or implementation-authorization control;
5. legacy evidence remains visible but does not resolve the new exact target.

WC01 remains unresolved until this repair is implemented, reviewed, and accepted. WC02 through WC13 remain unauthorized.
