# TSR10 Work Card Implementer Report

Status: complete; validation now admits tests continuously through bounded owned-resource pools, preserves exclusive barriers and deterministic receipts, and rejects caller attempts to override capacity.

## Scope and repository verification

- Card: Work Card TSR10, Implement Resource-Aware Parallel Scheduler.
- The working directory and Git top level were verified as the approved `<PROJECT_REPO>`.
- Branch: `dev`, tracking `origin/dev`; TSR09 starting point was commit `5fd51bf`. Remote freshness was not fetched.
- No dependency, migration, test lifecycle, Session 2/Tester engine, or compatibility path was introduced.

## Files changed

Modified:

- `scripts/validation/scheduler.cjs`
- `scripts/validation/planner.cjs`
- `scripts/validation/executor.cjs`
- `scripts/validation/telemetry.cjs`
- `scripts/validation/cli.cjs`
- `scripts/validation/toolbox-runner.cjs`
- `src/main/planExecution/integrationValidationProfileRunner.ts`
- `src/shared/integrationCandidateContracts.ts`
- `test/validation/validation-runner.test.cjs`
- `validation/capability-map.json`
- `docs/architecture/CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`

Created: this report.

Deleted: none.

Intentionally not created: caller-controlled pool options, an unbounded corpus `Promise.all`, machine-wide cleanup, a test lifecycle/Tester engine, dependencies, branches, worktrees, JSON sidecars, or generated output.

## Scheduler result

Repository-owned configuration in `scheduler.cjs` fixes these capacities:

| Resource pool | Limit |
| --- | ---: |
| General workers | 4 |
| Bounded child processes | 2 |
| Isolated Git fixtures | 2 |
| Dynamic loopback/network endpoints | 2 |
| Pure/stateless | 4 |
| Repository-readonly | 4 |
| Isolated temporary filesystem | 4 |
| Desktop/Electron | 1 |
| Packaging | 1 |
| Performance/soak | 1 |
| Shared global state | 1 |

Desktop/Electron, packaging, performance/soak, and shared-global resources are queue barriers. Work before the first queued barrier may fill any compatible pools; work after it cannot leapfrog. The barrier starts only after every active job quiesces and then runs alone. This prevents barrier starvation without forcing unrelated safe resources through a single serial queue.

Each job reserves the general worker and every declared TSR09 resource atomically. Completion releases all reservations and immediately considers pending compatible work. A thrown runner result is converted to bounded `execution-failed` evidence, and other admitted or pending work continues. The returned map and final receipt are rebuilt in original selection order, independent of completion order.

The planner now emits schema-2 resource schedules. The executor mechanically reconstructs and compares the schedule to prevent tampering. CLI `--concurrency`, direct planner concurrency, mutated plan limits, and the former toolbox corpus override are rejected or removed; callers cannot bypass repository capacity. Telemetry now reports `resourcePoolCount` instead of the obsolete `cohortCount`, and the target-owned IntegrationCandidate validator consumes that contract.

## Scheduling trace and benchmark

The synthetic trace selected temporary-filesystem, three Git, child-process, network, global-exclusive, and trailing stateless jobs in that order:

1. `temp-a`, `git-a`, `git-b`, and `process-a` filled the four general workers.
2. `git-c` waited at the two-Fixture Git ceiling while unrelated work remained eligible; `network-a` entered as capacity became available.
3. Maximum Git concurrency was exactly 2 and maximum general concurrency was exactly 4.
4. The failing `process-a` produced `execution-failed`; `network-a`, `git-c`, the barrier, and trailing work still completed.
5. `global` started only after all six preceding safe jobs finished and ran with active count 1.
6. `after` started only after `global` finished.
7. Results were returned in the eight-file selection order.

On the same synthetic eight-file, 80 ms-per-file workload:

| Scheduler | Wall clock |
| --- | ---: |
| Resource-aware, four general workers with independent pools | 172 ms |
| Legacy two-worker cohort baseline | 371 ms |

The resource scheduler was 199 ms faster, a 53.6% wall-clock reduction, with identical eight-job completion. The focused contract requires the resource result to remain below 75% of the legacy baseline.

## Validation and observed repair

| Exact command | Lane | Result |
| --- | --- | --- |
| `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="bounded resource scheduler" test/validation/validation-runner.test.cjs` | Normal Windows focused scheduler/cleanup/benchmark | Exit 0; 1/1 passed in 2,282.9541 ms. Benchmark: 172 ms resource-aware versus 371 ms legacy. |
| `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="validation plans|validation planning rejects|bounded validation execution" test/validation/validation-runner.test.cjs` | Normal Windows focused planner/executor | Exit 0; 3/3 passed in 1,599.8099 ms. |
| `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="public validation commands|changed source runs" test/validation/validation-runner.test.cjs` | Normal Windows focused CLI/telemetry | Exit 0; 2/2 passed in 3,727.3759 ms. |
| `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/integration-profile-gate.test.cjs` before telemetry-consumer migration | Normal Windows focused provider | Exit 1; 3/7 passed. The target-owned profile produced the new receipt, while production validation still required `cohortCount`, so structured evidence was rejected. |
| `pnpm build` | Normal Windows build attempt | Exit 1 immediately; pnpm correctly reported that the repository is npm-managed. Not counted as a source failure. |
| `npm run build` | Normal Windows production build | Exit 0; TypeScript and Vite production build passed, 1,659 modules transformed. |
| Same IntegrationCandidate profile-gate command after migrating telemetry to `resourcePoolCount` and rebuilding | Normal Windows focused provider | Exit 0; 7/7 passed in 39,596.3758 ms. |
| `node --test --test-reporter=tap --test-concurrency=1 test/validation/capability-map.test.cjs` | Normal Windows focused catalog/schema | Exit 0; 5/5 passed in 122.8375 ms. |
| `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/reserved-toolbox-namespace.test.cjs` | Normal Windows focused toolbox contract | Exit 0; 2/2 passed in 465.9696 ms. |
| Integration-gate renderer-change preview through `scripts/validation/cli.cjs` | Restricted planner preview | Exit 0; schema 2, 26 entries, 11 fixed pools, and four barrier resources. No tests executed. |
| `node --check` for the seven changed CJS implementation/test files | Restricted syntax lane | Exit 0 for every file. |
| Direct schema-4 ValidationCatalog load | Restricted catalog/schema lane | Exit 0; exact coverage and ownership validated for 147 tests. |

The initial provider failure was a real compatibility defect discovered by focused validation, not flake. The production telemetry type and bounded validator were migrated to the new scheduler receipt, then proven through immutable target-toolkit execution. Process-tree and exact temporary-root cleanup remained in the existing executor path and passed both failure and timeout descendant cases.

No full test corpus, full supported-platform profile, packaging run, Desktop launch, or performance/soak run was performed; TSR11 owns full-regression acceptance.

## Git, security, and residual risk

- The Operator authorized a completion commit. Its hash is pending in this artifact and is reported after commit without amending solely for its own hash.
- No push, merge, rebase, tag, reset, clean, restore, stash, new branch, or worktree was performed. Test-owned Git activity stayed inside temporary fixture repositories.
- The staged safety review found no credentials, concrete local-machine paths, or generated artifacts; the sole keyword match was this report's description of that review.
- Operator manual validation: none; acceptance is deterministic and non-visual.
- Residual risk: the conservative pool sizes are supported by synthetic focused evidence, not a full-corpus concurrency run. TSR11 must measure the real full profile and can propose a separate evidence-backed capacity adjustment if resource contention appears.
- Recommended next task: TSR11.
