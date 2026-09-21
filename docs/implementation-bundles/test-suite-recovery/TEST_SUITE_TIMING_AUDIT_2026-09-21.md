# Test Suite Recovery Timing Audit — 2026-09-21

**Status:** Recovery baseline evidence  
**Repository:** ChampCity_AI  
**Branch at evidence capture:** `dev`  
**Observed HEAD during recovery planning:** `ff8acce6fcfc6b7077d90f148ce985b66d3f93c3`  
**Raw timing evidence:** `evidence/TEST_SUITE_TIMING_AUDIT_RAW_2026-09-21.csv`

## Purpose

This audit is the before-state for the immediate Test Suite Recovery initiative.

It is not the Session 2 Tester/Test Lifecycle architecture. It measures the current permanent suite so recovery work can target the pathological proof boundaries that are preventing normal development.

## Method

The PowerShell audit executed each discovered `test/**/*.test.cjs` file individually with Node's test runner and serial per-file execution.

The run discovered 142 executable test files in the working tree used for the audit.

Each file received an independent wall-clock measurement. The raw CSV was checkpointed after each file.

The audit script has one known reporting defect: its `ExitCode`/derived `Status` field was blank/incorrect for many files even when TAP counts showed all tests passing. Therefore:

- **wall-clock durations are valid evidence;**
- **TAP pass/fail counts are valid evidence;**
- the wrapper's textual `Status` column is not used as authoritative pass/fail evidence.

The currently deleted `test/agent-harness/git-mutation-boundary.test.cjs` was not part of this 142-file run. Earlier TVA evidence already established that monolithic file as pathological. Recovery must not silently restore the old aggregate without reviewing its unique durable obligations.

## Executive Findings

The suite is not uniformly slow. Runtime is dominated by a small number of large historical lifecycle/projection scenarios.

Observed serial runtime is approximately **45 minutes**.

The measured distribution is highly concentrated:

- top 5 files consume approximately **62%** of observed time;
- top 10 consume approximately **79%**;
- top 20 consume approximately **94%**;
- the overwhelming majority of files complete in under 30 seconds.

This supports targeted proof-boundary repair and retirement/consolidation rather than indiscriminate test deletion.

## Highest-Cost Files

| Rank | Test file | Observed time | TAP result |
| ---: | --- | ---: | --- |
| 1 | `test/project-planning/project-planning-service.test.cjs` | 476.3 s | 28/28 passed |
| 2 | `test/characterization/desktop-development-lifecycle.test.cjs` | 427.8 s | 4 passed / 2 failed |
| 3 | `test/work-card-planning/work-card-planning-service.test.cjs` | 337.3 s | 17/17 passed |
| 4 | `test/characterization/routed-lifecycle-acceptance.test.cjs` | 218.9 s | 0 passed / 2 failed |
| 5 | `test/phase-close/phase-validation-state.test.cjs` | 206.5 s | 10 passed / 2 failed |
| 6 | `test/agent-harness/integration-candidate-semantics.test.cjs` | 117.9 s | 6 passed / 2 failed |
| 7 | `test/work-card-intake/work-card-intake-service.test.cjs` | 116.6 s | 9/9 passed |
| 8 | `test/performance/mcp-operational-soak.test.cjs` | 82.4 s | 2/2 passed; intentional soak |
| 9 | `test/issue-resolution/issue-architect-planning-service.test.cjs` | 67.9 s | 12/12 passed |
| 10 | `test/architect-outputs/architect-output-workspace-repair.test.cjs` | 67.8 s | 27/27 passed |
| 11 | `test/agent-harness/agent-harness-process-boundary.test.cjs` | 62.1 s | 18/18 passed |
| 12 | `test/characterization/routed-integration-focus.test.cjs` | 59.9 s | 3/3 passed |
| 13 | `test/characterization/desktop-issue-lifecycle.test.cjs` | 56.2 s | 5/5 passed |
| 14 | `test/project-intake/project-intake-service.test.cjs` | 42.5 s | 5/5 passed |
| 15 | `test/architect-outputs/architect-output-prompt-contracts.test.cjs` | 40.8 s | 10/10 passed |
| 16 | `test/architect-interview/architect-interview-workspace.test.cjs` | 34.1 s | 13/13 passed |
| 17 | `test/architect-outputs/architect-draft-ingestion.test.cjs` | 32.0 s | 9/9 passed |

## Confirmed Pathological Scenario Concentration

### desktop-development-lifecycle

Total: **427.8 s**

Two routed historical lifecycle scenarios consume essentially the whole file:

- direct Work Item sequential Repair lifecycle: **215.4 s**;
- phased Work Item Repair/report/close lifecycle: **211.6 s**.

The other four tests combined complete in well under one second.

### routed-lifecycle-acceptance

Total: **218.9 s**

The conflicted-target end-to-end lifecycle consumes **218.4 s** and records approximately **3,916 bounded Git operations** before failing at a late repository-cleanliness assertion.

### phase-validation-state

Total: **206.5 s**

Most tests complete in milliseconds. Two routed acceptance scenarios dominate:

- routed direct Plan acceptance: **122.7 s**;
- routed genuine Phase acceptance: **83.0 s**.

### project-planning-service

Total: **476.3 s**

The dominant scenarios are broad route/profile/composition journeys rather than the ordinary Project Planning tests:

- routed Development binding direct/phased behavior: roughly **127 s**;
- phased subcase: roughly **128 s**;
- shared direct/phased planning kernel review: roughly **77 s**;
- composition planning: roughly **44 s**;
- Research closure: roughly **41 s**;
- Infrastructure planning: roughly **40 s**;
- Issue route incompatibility: roughly **19 s**.

The ordinary Project Planning tests are generally tens of milliseconds.

### work-card-planning-service

Total: **337.3 s**

Three lifecycle/composition scenarios dominate:

- routed Work Items reuse Formal planning/report review: **160.3 s**;
- Work Item decomposition/topology correction: **94.0 s**;
- routed phased eligibility/lineage barriers: **76.5 s**.

The explicit large-inventory projection test is approximately 4.9 s; most remaining tests are sub-second.

### work-card-intake-service

Total: **116.6 s**

The routed artifact-scope direct/phased scenarios consume approximately 56–60 seconds each. Ordinary Work Card Intake tests are sub-second.

### issue / architect route scenarios

Two files show the same pattern:

- `issue-architect-planning-service.test.cjs`: one routed defect/RCA/reroute scenario consumes **67.5 s** of a 67.9 s file;
- `architect-output-workspace-repair.test.cjs`: one Operator route/reroute lineage scenario consumes **63.2 s** of a 67.8 s file.

## Current Failure Evidence

The audit surfaced failures in at least these current owners:

- `desktop-development-lifecycle.test.cjs`;
- `routed-lifecycle-acceptance.test.cjs`;
- `phase-validation-state.test.cjs`;
- `integration-candidate-semantics.test.cjs`;
- `release-toolbox-boundary.test.cjs`;
- `issue-fix-card-service.test.cjs`;
- `integration-profile-gate.test.cjs`;
- `reserved-toolbox-namespace.test.cjs`;
- `validation-runner.test.cjs`;
- `capability-map.test.cjs`.

Some failures are stale expectations caused by newly implemented toolbox/validation behavior. Others may represent real product/source-control defects. Recovery cards must classify them before repair rather than treating every red test as a production regression.

## Parallelism Finding

TVA04 initially classified the suite conservatively:

- 117 `exclusive-process`;
- 10 `exclusive-desktop`;
- 10 `parallel-safe`;
- 2 `exclusive-packaging`;
- 3 `exclusive-performance`.

The scheduler defaults to parallelism 2 only for `parallel-safe` and serializes all other cohorts.

This was a safe migration default, not an acceptable permanent throughput model.

Process use alone is not sufficient reason for global exclusivity. Temp-isolated Git fixtures, isolated Node child processes, dynamically allocated loopback resources, and other independently owned resources can often execute concurrently with bounded resource pools.

## Recovery Direction

The immediate recovery initiative must:

1. remove or rewrite historical lifecycle acceptance replays that no longer provide unique permanent proof;
2. preserve durable invariants at the narrowest trustworthy boundary;
3. keep a deliberately small set of true end-to-end sentinels where composition itself is the regression risk;
4. repair current legitimate failures and update stale expectations;
5. reclassify execution safety from coarse `exclusive-process` defaults to explicit resource ownership;
6. implement bounded resource-aware parallel execution;
7. rerun the timing audit and profile measurements to establish the recovered baseline.

The future Tester/Test Lifecycle architecture is intentionally separate and must not be implemented as part of this recovery bundle.
