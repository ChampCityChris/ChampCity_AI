# WIR23-REPAIR03C-REPAIR02-REPAIR01 — Restore IntegrationCandidate Owner Under the Authoritative Runner

**Type:** Test Harness Repair Work Card  
**Parent:** WIR23-REPAIR03C-REPAIR02  
**Finding:** Direct Implementer run and authoritative validation runner disagree

## A. Objective

Make `integration-candidate-semantics.test.cjs` pass reliably under ChampCity's authoritative catalog execution command, not only under a direct `node --test` invocation.

No production IntegrationCandidate behavior change is expected unless the authoritative failure proves a real production defect.

## B. Verified Evidence

Implementer report:
- direct Node run: 8/8 passed.

Architect review, twice through `test_toolbox`:
- production build passed;
- authoritative command includes:
  `node --require scripts/validation/child-cleanup.cjs --test --test-concurrency=1 --test-reporter=tap ...`
- 8 tests discovered;
- 4 passed;
- 4 failed;
- outer integration scenario reports 3 failed subtests;
- source context stable.

The owner uses `registerIntegrationScenarios()` and per-subtest `installSemanticSourceFixture(t, { allowCheckpointChain: true })`.

The permanent catalog execution path, including `child-cleanup.cjs`, is authoritative.

## C. Exact Work

### 1. Reproduce only under the authoritative command

Use exactly:

`node --require scripts/validation/child-cleanup.cjs --test --test-concurrency=1 --test-reporter=tap test/agent-harness/integration-candidate-semantics.test.cjs`

Capture the full failing subtest names and first meaningful assertion/error for each.

Do not treat the direct command as acceptance evidence.

### 2. Inspect fixture/mock lifetime

Review these seams first:

- parent-level `measureExecution()` mocks;
- per-subtest `installSemanticSourceFixture()` mocks;
- module-captured `child_process` functions;
- cleanup of candidate worktrees/branches;
- source-module mock restoration between nested subtests;
- child-cleanup preloader interaction.

Each nested scenario must begin with isolated source-control fixture state and must not inherit a mocked function, candidate checkout, process handle, or repository state from a sibling.

### 3. Prefer test-support repair

If failures are caused by fixture/mock/runner isolation:
- fix only test/support ownership;
- preserve all seven scenario semantics;
- do not modify production source.

If an authoritative failing assertion identifies a real IntegrationCandidate defect:
- stop and report `CARD_REPOSITORY_MISMATCH` with the exact production defect before changing product code.

### 4. Make telemetry truthful

Ensure `measureExecution()` does not depend on patching a child-process function after another helper has already captured it by value.

Either:
- install instrumentation before fixture modules are loaded; or
- expose an explicit fixture-operation counter.

## D. Expected Change Boundary

Expected:
- `test/support/integration-scenarios.cjs`
- `test/support/integration-semantics.cjs`
- `test/support/execution-metrics.cjs` as needed
- `test/agent-harness/integration-candidate-semantics.test.cjs` only if ownership setup must change
- capability-map duration/count metadata only if measured values change

Production `src/**` is not expected.

## E. Test Contract

Required final proof:

1. authoritative full owner passes 8/8 on two consecutive runs;
2. candidate semantics file remains below 60 seconds test-process time;
3. source context stable;
4. no leaked worktrees/processes remain after each run;
5. direct command may also pass, but is secondary evidence.

## F. Forbidden Changes

Do not:
- skip failing scenarios;
- split them merely to hide shared-state leakage;
- remove child-cleanup from authoritative execution;
- weaken candidate assertions;
- alter production code without a reported mismatch.

## G. Completion Evidence

Report:
- exact three failing subtests originally reproduced;
- root cause;
- files changed;
- why the authoritative runner differed from direct execution;
- two consecutive authoritative 8/8 results;
- final runtime/telemetry.
