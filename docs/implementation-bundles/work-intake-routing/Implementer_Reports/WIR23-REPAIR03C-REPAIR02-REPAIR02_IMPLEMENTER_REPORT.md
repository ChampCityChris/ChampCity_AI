# WIR23-REPAIR03C-REPAIR02-REPAIR02 Implementer Report

## Outcome and repository evidence

Test Harness Repair Work Card `WIR23-REPAIR03C-REPAIR02-REPAIR02` implemented the exact shared-fixture path and Git portability delta, but qualification stopped with `CARD_REPOSITORY_MISMATCH` when the integration-profile owner reached a substantive profile-evidence assertion failure.

- Verified the approved repository root and Git top-level as `<PROJECT_REPO>`.
- Card type: Test Harness Repair Work Card — V2 calibration card #1.
- Branch: `dev`, 15 commits ahead of configured `origin/dev` at the start of the pass. No fetch or remote-freshness claim was made.
- The starting worktree contained unrelated and predecessor-card changes, including the predecessor telemetry change in `test/support/integration-scenarios.cjs`. They were preserved.
- Source revision observed by authoritative validation: `77228741e44b8062780af87910fa39e41fef2f5b` with stable dirty source context for every completed normal-Windows run.

## Files and implementation

Modified:

- `test/support/integration-scenarios.cjs`

Created:

- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR03C-REPAIR02-REPAIR02_IMPLEMENTER_REPORT.md`

Deleted: none.

Intentionally not created or changed by this pass:

- no production `src/**` change;
- no new test owner or assertion change;
- no validation runner, executor, child-cleanup, catalog, or duration-metadata change;
- no dependency, migration, compatibility path, generated artifact, or archive change.

The shared fixture now has one `fixtureGit(root, args, options)` seam. It resolves `childProcess.execFileSync` at call time for telemetry and prepends `-c core.longpaths=true` to every fixture-owned Git invocation. `createBoundWorkspace()`, `configureGitIdentity()`, `commitAllFixtureState()`, and `git()` all route through that helper. Existing `encoding` and `stdio` options are preserved by option spreading; the helper also preserves any caller-supplied `input` or `windowsHide` option. The non-Git `execFileSync(process.execPath, ...)` validation check remains unchanged.

Immediately after repository initialization, the disposable repository is configured locally with `core.longpaths=true` through `fixtureGit()`. No global Git configuration is changed.

The old scenario-specific temporary prefix was `champcity-integration-{scenario}-`. The repaired fixed prefix is `cc-int-`; scenario identity remains in TAP subtest names.

## Validation record

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `node --check test/support/integration-scenarios.cjs` | Restricted Windows static syntax check | Exit 0. |
| `git diff --check -- test/support/integration-scenarios.cjs` | Read-only diff hygiene | Exit 0. |
| `$request = '{"action":"run_test_file","params":{"testPath":"test/agent-harness/integration-candidate-semantics.test.cjs"}}'; $request \| node --require ./scripts/validation/child-cleanup.cjs ./scripts/validation/toolbox-runner.cjs` | Restricted Windows authoritative-runner attempt | Runner stopped before discovery with `Cannot establish bound Git source context`; the sandbox could not establish the runner's spawned Git provenance context. Not counted as a source failure or pass. |
| Same candidate-owner command | Approved normal Windows authoritative runner, consecutive pass 1 | Exit 0; 8/8 passed, zero skipped/cancelled; test process 17.098 seconds; build 10.626 seconds; total 27.983 seconds; source stable. Telemetry: 12 `boundedGit`, 367 `fixtureGit`, 0 npm, 7 checkouts. |
| Same candidate-owner command | Approved normal Windows authoritative runner, consecutive pass 2 | Exit 0; 8/8 passed, zero skipped/cancelled; test process 23.262 seconds; build 10.538 seconds; total 34.081 seconds; source stable. Telemetry: 12 `boundedGit`, 367 `fixtureGit`, 0 npm, 7 checkouts. |
| `$request = '{"action":"run_test_file","params":{"testPath":"test/agent-harness/integration-policy-semantics.test.cjs"}}'; $request \| node --require ./scripts/validation/child-cleanup.cjs ./scripts/validation/toolbox-runner.cjs` | Approved normal Windows authoritative runner | Exit 0; 10/10 passed, zero skipped/cancelled; test process 22.153 seconds; build 10.453 seconds; total 32.930 seconds; source stable. Telemetry: 168 `boundedGit`, 354 `fixtureGit`, 0 npm, 8 checkouts. |
| `$request = '{"action":"run_test_file","params":{"testPath":"test/agent-harness/integration-profile-gate.test.cjs"}}'; $request \| node --require ./scripts/validation/child-cleanup.cjs ./scripts/validation/toolbox-runner.cjs` | Approved normal Windows authoritative runner | Exit 1; 7 discovered, 3 passed / 4 failed, zero skipped/cancelled; test process 15.577 seconds; build 10.723 seconds; total 26.568 seconds; source stable. The two profile scenarios failed and their parent subtest accounting produced four failures. |

`test/agent-harness/integration-repair-source-semantics.test.cjs` was not run. The card requires the Implementer to stop when an affected owner reaches a substantive candidate/repair/policy assertion after the shared fixture repair. `test/validation/capability-map.test.cjs` was not required because `validation/capability-map.json` did not change.

## Cleanup and safety evidence

Both candidate-owner passes completed every scenario's existing cleanup assertions: candidate checkouts were removed, candidate branches were absent, disposable repositories were clean, target and incoming references were preserved, and canonical receipts survived where required. The policy owner also completed all shared-scenario cleanup. Node test after-hooks and the authoritative executor removed disposable fixture roots for the failed profile run, but the profile scenarios failed before their candidate-level cleanup assertions, so no stronger semantic cleanup claim is made for those scenarios.

No product-repository Git mutation was authorized or performed: no branch, stage, commit, push, merge, rebase, tag, reset, clean, restore, stash, or worktree action occurred outside disposable test repositories. No secret, credential, concrete local-machine path, generated output, or dependency state was introduced. The actual commit hash is not applicable because no commit was directed.

## CARD_REPOSITORY_MISMATCH

Owner: `test/agent-harness/integration-profile-gate.test.cjs`.

Scenarios: `unchanged` and `validation-profile-fails` under `actual candidate profile receipts control target eligibility`.

First meaningful failure: `candidate.validation[0].profileEvidence` is absent, so the owner throws a `TypeError` at line 66 when evaluating `proof.profileId`. The authoritative receipt reports 3 passes and 4 failures; this is a substantive profile-evidence contract failure, not fixture Git setup or path handling.

Observed call path:

1. `test/support/integration-scenarios.cjs::registerIntegrationScenarios()` prepares the profile fixture and calls `createIntegrationCandidateService(serviceHooks)`.
2. Production `integrationCandidateService` resolves and runs the validation check and conditionally persists `proof.profileEvidence` into `record.validation`.
3. The created candidate returns to `integration-scenarios.cjs`, which invokes `options.assertProfile(candidate, scenario)`.
4. `test/agent-harness/integration-profile-gate.test.cjs::assertProfile()` finds no `profileEvidence` and fails before candidate cleanup assertions.

Changing production validation semantics, weakening the profile assertion, or expanding this fixture repair into a separate profile-contract diagnosis is outside this card. No Operator manual validation can close the card in this state. The recommended next task is a bounded Architect/Repair Card investigation of why the target-owned validation-profile adapter returns no persistable `profileEvidence` for these two scenarios in the current combined repository state; after that repair, rerun the profile owner, the repair-source owner, and the full card qualification sequence.
