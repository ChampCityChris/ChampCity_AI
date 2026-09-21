# Test Suite Recovery Final Report

Status: complete and ready for Architect review. The supported Windows permanent corpus is green, the serial audit meets the recovery target, and representative production ValidationProfiles meet their budgets with measured scheduler overlap.

## Scope and repository verification

- Card: Work Card TSR11, Rebaseline and Qualify the Recovered Suite.
- The working directory and Git top level were verified as the approved `<PROJECT_REPO>`.
- Branch: `dev`, tracking `origin/dev`; TSR10 starting point was `f377644`. At the start of TSR11 the branch was 11 commits ahead and 0 behind the locally known `origin/dev`. Remote freshness was not fetched and no push was requested.
- Card sequence: TSR01 through TSR10 were already committed individually; this report closes TSR11 only.
- No production behavior, dependency, migration, schema, compatibility path, or Session 2 Tester/Test Lifecycle implementation was added.

## Outcome

| Measure | September 21 baseline | TSR11 final | Change |
| --- | ---: | ---: | ---: |
| Permanent executable files | 142 | 147 | +5 after replacing one deleted Git aggregate with six focused owners |
| TAP tests | 1,159 | 1,180 | +21 current focused proofs |
| Passed / failed / skipped / cancelled | 1,134 / 25 / 0 / 0 | 1,180 / 0 / 0 / 0 | all current failures resolved; no skips introduced |
| Serial per-file wall time | 2,694.252 s (44m54.252s) | 869.925 s (14m29.925s) | -1,824.327 s (-67.71%); 3.10x faster |
| Top-5 concentration | 61.9% | 34.1% | -27.8 percentage points |
| Top-10 concentration | 78.7% | 51.3% | -27.4 percentage points |
| Top-20 concentration | 93.7% | 74.7% | -19.0 percentage points |

The local timing wrapper now captures the real child exit code after the process has fully exited. Its Stopwatch wall-clock methodology, serial file order, TAP parsing, per-file timeout, and output shape remain unchanged. Every final row reports `Status=Pass`, `ExitCode=0`, and no timeout.

The final per-file count and duration measurement for all 147 files is durable in `validation/capability-map.json`. The raw local audit output remains ignored generated evidence under `tmp/test-timing-audit/`; it is not source-controlled.

## Before and after top 20

### Baseline

| Rank | File | Seconds | TAP result |
| ---: | --- | ---: | --- |
| 1 | `test/project-planning/project-planning-service.test.cjs` | 476.253 | 28 pass |
| 2 | `test/characterization/desktop-development-lifecycle.test.cjs` | 427.805 | 4 pass, 2 fail |
| 3 | `test/work-card-planning/work-card-planning-service.test.cjs` | 337.333 | 17 pass |
| 4 | `test/characterization/routed-lifecycle-acceptance.test.cjs` | 218.861 | 2 fail |
| 5 | `test/phase-close/phase-validation-state.test.cjs` | 206.472 | 10 pass, 2 fail |
| 6 | `test/agent-harness/integration-candidate-semantics.test.cjs` | 117.929 | 6 pass, 2 fail |
| 7 | `test/work-card-intake/work-card-intake-service.test.cjs` | 116.584 | 9 pass |
| 8 | `test/performance/mcp-operational-soak.test.cjs` | 82.403 | 2 pass |
| 9 | `test/issue-resolution/issue-architect-planning-service.test.cjs` | 67.902 | 12 pass |
| 10 | `test/architect-outputs/architect-output-workspace-repair.test.cjs` | 67.814 | 27 pass |
| 11 | `test/agent-harness/agent-harness-process-boundary.test.cjs` | 62.142 | 18 pass |
| 12 | `test/characterization/routed-integration-focus.test.cjs` | 59.859 | 3 pass |
| 13 | `test/characterization/desktop-issue-lifecycle.test.cjs` | 56.150 | 5 pass |
| 14 | `test/project-intake/project-intake-service.test.cjs` | 42.481 | 5 pass |
| 15 | `test/architect-outputs/architect-output-prompt-contracts.test.cjs` | 40.838 | 10 pass |
| 16 | `test/architect-interview/architect-interview-workspace.test.cjs` | 34.139 | 13 pass |
| 17 | `test/architect-outputs/architect-draft-ingestion.test.cjs` | 31.996 | 9 pass |
| 18 | `test/agent-harness/integration-policy-semantics.test.cjs` | 27.741 | 10 pass |
| 19 | `test/work-card-building/codex-implementer-execution-service.test.cjs` | 24.679 | 29 pass |
| 20 | `test/agent-harness/integration-repair-source-semantics.test.cjs` | 24.234 | 4 pass |

### TSR11 final

| Rank | File | Seconds | TAP result | Cost class |
| ---: | --- | ---: | --- | --- |
| 1 | `test/performance/mcp-operational-soak.test.cjs` | 80.960 | 2 pass | intentional performance/soak |
| 2 | `test/agent-harness/agent-harness-process-boundary.test.cjs` | 70.347 | 18 pass | Windows desktop/process platform sentinel |
| 3 | `test/agent-harness/source-checkpoint-boundary.test.cjs` | 57.331 | 1 pass | wider Git integration sentinel |
| 4 | `test/project-intake/project-intake-service.test.cjs` | 44.637 | 5 pass | ordinary functional |
| 5 | `test/characterization/desktop-issue-lifecycle.test.cjs` | 43.467 | 5 pass | ordinary functional |
| 6 | `test/agent-harness/integration-profile-gate.test.cjs` | 32.924 | 7 pass | integration contract |
| 7 | `test/architect-outputs/architect-draft-ingestion.test.cjs` | 30.667 | 9 pass | ordinary functional |
| 8 | `test/agent-harness/integration-policy-semantics.test.cjs` | 29.740 | 10 pass | integration contract |
| 9 | `test/agent-harness/work-intake-branch-boundary.test.cjs` | 29.165 | 1 pass | Git integration |
| 10 | `test/agent-harness/integration-repair-source-semantics.test.cjs` | 27.392 | 4 pass | integration contract |
| 11 | `test/work-card-building/codex-implementer-execution-service.test.cjs` | 26.154 | 29 pass | ordinary functional |
| 12 | `test/agent-harness/git-toolbox-remote-operations.test.cjs` | 25.966 | 4 pass | Git integration |
| 13 | `test/architect-outputs/architect-output-prompt-contracts.test.cjs` | 24.523 | 10 pass | ordinary functional |
| 14 | `test/agent-harness/git-toolbox-tag-operations.test.cjs` | 23.314 | 10 pass | Git integration |
| 15 | `test/agent-harness/integration-candidate-semantics.test.cjs` | 21.794 | 8 pass | integration contract |
| 16 | `test/agent-harness/source-control-service-boundary.test.cjs` | 20.178 | 1 pass | Git integration |
| 17 | `test/architect-interview/architect-interview-workspace.test.cjs` | 16.259 | 13 pass | ordinary functional |
| 18 | `test/characterization/routed-integration-focus.test.cjs` | 15.545 | 3 pass | wider integration sentinel |
| 19 | `test/agent-harness/integration-repair-provider.test.cjs` | 14.975 | 1 pass | integration contract |
| 20 | `test/performance/mcp-session-volume.test.cjs` | 14.749 | 1 pass | intentional performance/soak |

## Duration distribution

| File duration bucket | Baseline files | Final files |
| --- | ---: | ---: |
| `<1 s` | 95 | 96 |
| `1–<10 s` | 23 | 24 |
| `10–<30 s` | 7 | 20 |
| `30–<60 s` | 6 | 5 |
| `60–<120 s` | 6 | 2 |
| `>=120 s` | 5 | 0 |

All ordinary functional owners are below 60 seconds. The two retained files above 60 seconds are intentionally separate evidence: the MCP operational soak and the Windows desktop/process-boundary sentinel. The wider source-checkpoint integration sentinel is below 60 seconds in the final audit and comfortably below the 180-second integration budget.

## Failures before and after

The original wrapper left `ExitCode` blank and therefore labeled every baseline row `Fail`; that wrapper label is not valid failure evidence. The comparable baseline failure count is derived from TAP: 10 files contained 25 failed tests.

| Baseline failing owner | Failed tests | Final disposition |
| --- | ---: | --- |
| `desktop-development-lifecycle.test.cjs` | 2 | repaired and decomposed; 6/6 pass |
| `routed-lifecycle-acceptance.test.cjs` | 2 | redundant supporting replay retired; unique composition retained by focused primary owners |
| `phase-validation-state.test.cjs` | 2 | expectation drift repaired; 12/12 pass |
| `integration-candidate-semantics.test.cjs` | 2 | stale ref/receipt expectation repaired; 8/8 pass |
| `release-toolbox-boundary.test.cjs` | 1 | current receipt semantics repaired; 50/50 pass |
| `issue-fix-card-service.test.cjs` | 1 | current validation-guidance expectation repaired; 21/21 pass |
| `integration-profile-gate.test.cjs` | 4 | current profile contract restored; 7/7 pass |
| `reserved-toolbox-namespace.test.cjs` | 2 | toolbox expectation drift repaired; 2/2 pass |
| `validation-runner.test.cjs` | 8 | production planner/executor contract restored; 8/8 pass |
| `capability-map.test.cjs` | 1 | exact executable inventory restored; 5/5 pass |

Final result: 147/147 file processes exited 0; 1,180/1,180 tests passed; no failures, skips, cancellations, or timeouts.

## Retired, consolidated, and rewritten proof

- Retired `test/characterization/routed-lifecycle-acceptance.test.cjs`. Its unique checkpoint/integration composition remains covered by focused primary owners; the file was supporting overlap that replayed several complete lifecycles.
- Kept the already-deleted `test/agent-harness/git-mutation-boundary.test.cjs` retired. Eighteen current behaviors moved to six focused Git/source-control/checkpoint owners. One obsolete Work Card prose-authorization behavior was retired because current Git authority is Operator/repository policy, not parsed card wording.
- Rewrote repeated upstream setup in Project Planning, Work Card Planning, Work Card Intake, routed desktop/phase lifecycle, Issue planning, Architect output repair, routed integration, Desktop Issue lifecycle, Architect Interview, and Architect output prompt owners to begin at the nearest production-shaped prepared boundary.
- Consolidated repeated immutable reads and stable observations inside the routed integration primary sentinel while retaining real candidate creation, conflict, repair, validation, and target advancement.
- Repaired stale assertions in the validation runner/catalog/toolbox, integration candidate/release, and Fix Card guidance owners without adding production fallbacks or weakening fail-closed behavior.
- Preserved every current behavior with exactly one primary proof and mechanically resolved supporting/preferred proofs. No failure was converted to a skip.

## Lane wall-clock metrics

Durations are sums of final serial per-file process wall time, so they are comparable with the baseline and intentionally do not imply parallel profile wall time.

| Validation lane | Files | Serial file-process time |
| --- | ---: | ---: |
| integration | 85 | 605.019 s |
| performance-soak | 3 | 108.940 s |
| desktop-platform | 10 | 85.163 s |
| affected-capability | 34 | 65.321 s |
| static | 5 | 3.147 s |
| fast | 7 | 1.699 s |
| packaging | 2 | 0.475 s |
| migration | 1 | 0.161 s |

## Resource-class and scheduler metrics

Resource counts overlap because one test may own more than one bounded resource.

| Owned resource | Files | Serial time represented |
| --- | ---: | ---: |
| temp-filesystem-isolated | 94 | 839.807 s |
| isolated-git-fixture | 27 | 481.537 s |
| bounded-child-process | 26 | 450.927 s |
| loopback-dynamic-endpoint | 13 | 199.770 s |
| performance-soak | 3 | 108.940 s |
| electron-desktop | 10 | 85.163 s |
| repository-readonly | 47 | 60.200 s |
| pure-stateless | 9 | 1.947 s |
| packaging | 2 | 0.475 s |

| Scheduler class | Files | Serial time represented |
| --- | ---: | ---: |
| parallel-safe | 132 | 675.347 s |
| exclusive-performance | 3 | 108.940 s |
| exclusive-desktop | 10 | 85.163 s |
| exclusive-packaging | 2 | 0.475 s |

No permanent file owns shared mutable global state. The scheduler still fails closed for unknown resources and enforces the declared pool limits and barriers.

## Capability wall-clock metrics

Capability time overlaps when a file protects more than one capability.

| Capability | Files | Serial time represented |
| --- | ---: | ---: |
| release-and-git-operations | 16 | 333.565 s |
| agent-harness-mcp-runtime | 7 | 116.375 s |
| background-agent-lifecycle | 10 | 76.529 s |
| project-planning-workflow | 9 | 75.717 s |
| architect-output-lifecycle | 7 | 69.558 s |
| issue-resolution-workflow | 15 | 60.551 s |
| work-card-workflow | 15 | 60.525 s |
| codex-implementation-runtime | 8 | 28.114 s |
| phase-execution-workflow | 9 | 14.444 s |
| workflow-performance | 2 | 14.101 s |
| visual-asset-handling | 2 | 10.758 s |
| validation-execution | 1 | 7.984 s |
| workflow-lifecycle-resolution | 6 | 6.522 s |
| agent-harness-repository-operations | 5 | 5.860 s |
| development-environment-provisioning | 5 | 4.966 s |
| workspace-registry | 2 | 2.658 s |
| canonical-document-storage | 9 | 2.458 s |
| agent-harness-security | 1 | 2.021 s |
| renderer-navigation-and-presentation | 5 | 1.782 s |
| desktop-application-shell | 5 | 1.630 s |
| external-provider-integration | 3 | 1.307 s |
| ipc-preload-contracts | 1 | 0.858 s |
| architect-browser | 2 | 0.750 s |
| windows-packaging | 2 | 0.475 s |
| workspace-evidence-notification | 1 | 0.165 s |
| canonical-document-migration | 1 | 0.161 s |
| validation-capability-map | 1 | 0.158 s |

## Production ValidationProfile qualification

Each profile ran through `scripts/validation/cli.cjs`, which invokes the production planner, build ownership, environment detection, bounded process runner, and resource-aware scheduler. The final executions used the rebaselined catalog weights.

| Profile and change set | Files / lanes | Build | Test wall | Sum of file processes | Total wall | Overlap evidence | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| `implementation-fast` | 12; 5 static, 7 fast | 11.036 s | 2.542 s | 7.232 s | 13.578 s | 2.85x file-sum/test-wall; max scheduler wait 1.282 s | passed |
| `work-item` + `renderer-change.json` | 30; 15 integration, 2 static, 7 fast, 6 affected | 10.804 s | 8.101 s | 17.255 s | 18.905 s | 2.13x; max wait 2.834 s | passed |
| `integration-gate` + `renderer-change.json` | 26; 15 integration, 2 static, 3 fast, 6 affected | 10.919 s | 7.752 s | 15.427 s | 18.671 s | 1.99x; max wait 2.256 s | passed |

`implementation-fast` is below the temporary 60-second fast ceiling. The representative affected-capability run is below 60 seconds. The representative integration gate is below 3 minutes and the 5-minute review threshold. In every run, summed child-process time materially exceeds scheduler test wall time, demonstrating real overlap rather than a sequential queue presented as parallel.

## Ownership and classification

The final `test/validation/capability-map.test.cjs` run passed 5/5. It confirms:

- exactly 147 catalog records for 147 executable tests;
- allowed lane, platform, dependency, disposition, resource, and scheduler values;
- deterministic capability, behavior, dependency, and test identity resolution;
- exactly one primary proof for every behavior;
- exact resolution for every supporting or preferred proof;
- mechanically valid primary, complementary, overlapping, and redundant protector relationships.

There is no unresolved permanent-test ownership or classification gap.

## Files changed in TSR11

Modified:

- `scripts/test-timing-audit.ps1`
- `test/architect-interview/architect-interview-workspace.test.cjs`
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`
- `test/characterization/desktop-issue-lifecycle.test.cjs`
- `validation/capability-map.json`

Created:

- `docs/implementation-bundles/test-suite-recovery/TEST_SUITE_RECOVERY_FINAL_REPORT.md`

Deleted: none.

Intentionally not created or committed: raw timing logs/CSV/JSON, generated build output, dependencies, branches, worktrees, JSON workflow sidecars, compatibility paths, or Session 2 Tester/Test Lifecycle artifacts.

## Validation record

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-timing-audit.ps1 -PerFileTimeoutSeconds 900 -Fresh` | Normal Windows broad qualification, serial per-file | Final exit 0; 147/147 files passed, 1,180/1,180 tests passed, 0 skipped/cancelled/timed out; 869.925 s summed wall time. Earlier TSR11 diagnostic passes were 925.019 s and 914.123 s before the final downstream-fixture corrections. |
| `node --test --test-reporter=tap --test-concurrency=1 test/characterization/desktop-issue-lifecycle.test.cjs` | Normal Windows focused affected-capability | Pre-correction diagnostic exit 0 in 75.214 s; prepared-boundary correction exit 0 in 52.514 s; final audit 43.467 s, 5/5 passed. |
| `node --test --test-reporter=tap --test-concurrency=1 test/architect-outputs/architect-output-prompt-contracts.test.cjs test/architect-interview/architect-interview-workspace.test.cjs` | Normal Windows focused integration | Exit 0; 23/23 passed in 55.452 s combined. Final separate audit times were 24.523 s and 16.259 s. |
| `node --test --test-reporter=tap --test-concurrency=1 test/validation/capability-map.test.cjs` | Normal Windows catalog ownership/classification | Exit 0; 5/5 passed in 120.089 ms after final rebaseline. |
| production CLI `run --profile implementation-fast` via compact receipt wrapper | Normal Windows production ValidationExecutor | Exit 0; passed 12/12 files in 13.578 s. |
| production CLI `run --profile work-item --changes test/fixtures/validation/renderer-change.json` via compact receipt wrapper | Normal Windows production ValidationExecutor | Exit 0; passed 30/30 files in 18.905 s. |
| production CLI `run --profile integration-gate --changes test/fixtures/validation/renderer-change.json` via compact receipt wrapper | Normal Windows production ValidationExecutor | Exit 0; passed 26/26 files in 18.671 s. |

The ValidationExecutor owned one fresh production build in each profile. No separate redundant typecheck was prepended. No visual, experiential, external-integration, packaging-production, or release-acceptance claim is made.

## Git, security, and local-path safety

- Git mutations before the final commit: none. The Operator-directed TSR11 commit is pending at report-write time; its actual hash must be reported after commit and must not be backfilled by amending that commit.
- Push, merge, rebase, tag, reset, clean, restore, stash, branch creation, and worktree creation: none.
- Staged-diff safety result: clean for secret/credential patterns and concrete local-machine/home paths; all six staged paths are non-ignored source artifacts, and no generated/dependency/archive/binary output is staged.
- The report and catalog use repository-relative paths or `<PROJECT_REPO>`; no concrete machine/home path is persisted.

## Remaining debt, blockers, and recommendation

- Remaining known cost is intentional and classified: the 80.960-second MCP operational soak and 70.347-second Windows desktop/process sentinel are outside ordinary functional budgets. They pass and remain governed by exclusive scheduler barriers.
- Git and release operations remain the largest overlapping capability cost at 333.565 seconds serial, but their focused owners are individually within the 180-second integration budget and production resource-aware profiles parallelize independently owned work.
- Per-file timing is environment-sensitive; the catalog now records the supported-Windows final audit and should be refreshed only from comparable successful receipts.
- There are no current-contract blockers, no ownership gaps, and no legacy quarantine reason remaining.

Normal V2 development can resume without the legacy test-suite quarantine. Stop here for Architect review. Session 2 Tester/Test Lifecycle implementation remains a separate future initiative.
