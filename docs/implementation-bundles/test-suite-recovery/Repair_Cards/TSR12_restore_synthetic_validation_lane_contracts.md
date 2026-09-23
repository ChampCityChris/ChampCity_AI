# TSR12 — Restore Synthetic Validation Lane Contracts

**Status:** IMPLEMENTER_READY  
**Type:** Final Test-Maintenance Repair  
**Parent:** Test Suite Recovery / Validation Architecture  
**Architect standard:** Implementer-Ready Work Card Standard V2.1  
**Relationship to WIR:** none; WIR product behavior is not under repair  
**Retirement rule:** this is the one final repair attempt for `integration-profile-gate.test.cjs`

## A. Objective

Repair stale synthetic ValidationCatalog fixtures so they model the current dedicated lane/resource/scheduling contract and allow the existing permanent validation owners to exercise their intended semantics.

Complete the repair rather than stopping at the first adjacent fixture assertion.

Do not change product behavior or validation architecture.

## B. Governing invariant

Synthetic validation metadata used by permanent tests must be a **valid current ValidationCatalog configuration** before the test intentionally mutates it into an invalid configuration.

A test that intends to prove target authority over a weaker incoming catalog must supply a weaker **but schema-valid** incoming catalog.

## C. Ownership map

### Change

- `test/support/validation-fixture.cjs`
  - shared synthetic ValidationCatalog builder;
  - currently applies ordinary parallel/temp-filesystem metadata to every lane.

- `test/agent-harness/integration-profile-gate.test.cjs`
  - contains two additional manual synthetic catalog constructions that repeat the stale metadata.

### Existing proof owner; change only if mechanically required by helper use

- `test/validation/validation-runner.test.cjs`
  - consumes `validationFixture()`;
  - current 6/8 result has two dedicated-lane fixture failures.

### Must remain unchanged

- `scripts/validation/catalog-schema.cjs`
- `scripts/validation/catalog.cjs`
- `scripts/validation/planner.cjs`
- `scripts/validation/executor.cjs`
- `scripts/validation/profile-runner.cjs`
- `src/main/planExecution/integrationValidationProfileRunner.ts`
- `src/main/planExecution/integrationCandidateService.ts`
- all WIR production code.

## D. Verified current failures

### validation-runner

Current authoritative file result: 6/8.

Isolated failures:

1. `public validation commands dispatch composed profiles...`
   - current error: `test/performance.test.cjs performance-soak lane requires performance-soak`

2. `changed source runs one build through scheduled proof...`
   - current error: `test/packaging.test.cjs packaging lane requires packaging`

### integration-profile-gate

Current authoritative file result: 3/7.

The direct profile adapter fails because candidate catalog validation returns:

`Validation profile planning or execution failed.`

The nested profile receipt scenarios then lack `profileEvidence`.

The shared frozen runner-context scenario passes 3/3.

## E. Exact repair

### 1. Add one shared lane-contract helper

In:

`test/support/validation-fixture.cjs`

add and export:

`applyValidationLaneFixtureContract(record, lane)`

Exact required behavior:

#### Ordinary lanes

For lanes other than `desktop-platform`, `packaging`, and `performance-soak`:

- set `record.proposedValidationLane = lane`;
- set `record.execution.ownedResources = ["temp-filesystem-isolated"]`;
- set `record.execution.scheduling = "parallel-safe"`;
- set a bounded fixture scheduling reason;
- set `record.platformDependency = "none"`;
- set `record.execution.platform = "any"`.

#### desktop-platform

- set lane to `desktop-platform`;
- set sorted owned resources to:
  - `electron-desktop`
  - `temp-filesystem-isolated`;
- set scheduling to `exclusive-desktop`;
- set platformDependency to `windows`;
- set execution.platform to `windows`.

#### packaging

- set lane to `packaging`;
- set sorted owned resources to:
  - `packaging`
  - `temp-filesystem-isolated`;
- set scheduling to `exclusive-packaging`;
- set platformDependency to `none`;
- set execution.platform to `any`.

#### performance-soak

- set lane to `performance-soak`;
- set sorted owned resources to:
  - `performance-soak`
  - `temp-filesystem-isolated`;
- set scheduling to `exclusive-performance`;
- set platformDependency to `none`;
- set execution.platform to `any`.

The helper mutates and returns the supplied record or returns a corrected clone; either implementation is acceptable. Use one behavior consistently.

### 2. Make validationFixture use the helper

In `validationFixture()`:

- stop directly assigning generic lane/resources/scheduling;
- build the cloned record;
- apply `applyValidationLaneFixtureContract(record, file.lane ?? "fast")`;
- then apply `requiresBuild` from the fixture input.

Do not change the fixture's capability/behavior construction or file writing.

### 3. Repair the direct profile-authority future-catalog mutation

In:

`test/agent-harness/integration-profile-gate.test.cjs`

import the lane helper beside `validationFixture`.

Current test changes the candidate record to `performance-soak` by modifying only the lane and requiresBuild.

Replace that with:

- apply the shared helper to the candidate record with `performance-soak`;
- then set `execution.requiresBuild = false`.

The resulting candidate future catalog must be schema-valid while remaining intentionally weaker than the target-owned integration record.

Preserve the existing assertion that target authority continues selecting the original accepted profile proof.

### 4. Repair prepareProfile custom records

Inside `prepareProfile(root, scenario)`:

for each synthetic record in:

- integration;
- desktop-platform;
- packaging;
- performance-soak

construct the cloned record as today, then apply the same shared helper for its lane.

After the helper:
- set `execution.requiresBuild = true` for these profile fixture records, preserving the current test intent;
- preserve behaviorCoverage and testPath.

Do not hand-author a second lane/resource mapping inside this test.

### 5. Bounded continuation — no easy-out branch

After the exact edits above, run the authoritative validation.

If either named owner still fails due a synthetic record violating:

- lane/resource consistency;
- scheduling/resource consistency;
- platform/lane consistency;
- another current `validateInventoryFields()` metadata contract;

continue correcting the **synthetic test metadata** inside the three allowed test/support files.

Do not stop and return a mismatch for stale fixture metadata.

The continuation envelope is:

- `test/support/validation-fixture.cjs`
- `test/validation/validation-runner.test.cjs`
- `test/agent-harness/integration-profile-gate.test.cjs`

The Implementer may make additional test-only fixture metadata corrections inside those files when the authoritative failure directly identifies a current ValidationCatalog contract.

### 6. Hard production boundary

Do not modify production or validation architecture.

If, after the synthetic catalog is demonstrably schema-valid, the profile test still fails because production behavior violates an existing assertion, finish the required authoritative reruns and report that final failure.

Do not attempt a second product/harness redesign.

Per Operator direction, that outcome ends this repair effort and the profile owner will be retired instead of generating another repair card.

## F. Why repair instead of retire now

Do not retire `integration-profile-gate.test.cjs` during this attempt.

It still uniquely proves:

- immutable target-owned validation toolkit authority;
- exact candidate/target/incoming revision binding;
- valid weaker incoming metadata cannot replace the target judge;
- candidate profile evidence persistence;
- failing profile proof blocks target eligibility;
- stale candidate context rejection;
- repair revalidation under the same target authority;
- unclassified changed source rejection.

Generic validation-runner and policy tests do not collectively reproduce all of those candidate-specific assertions.

## G. Permanent regression delta

No new permanent test.

No new test file.

No new capability behavior.

The existing owners remain:

- `test/validation/validation-runner.test.cjs`
- `test/agent-harness/integration-profile-gate.test.cjs`

## H. Authoritative validation

Use ChampCity `test_toolbox.run_test_file` when available.

Required final runs:

1. `test/validation/validation-runner.test.cjs`
   - required: 8/8 pass.

2. `test/agent-harness/integration-profile-gate.test.cjs`
   - required: 7/7 pass.

3. `test/validation/capability-map.test.cjs`
   - required: 5/5 pass.

Run the profile owner a second consecutive time if the first final run passes.

Direct `node --test` runs are diagnostic only.

Do not run the full suite.

## I. Runtime acceptance

- validation-runner: <60 seconds test-process time;
- integration-profile-gate: <60 seconds;
- capability-map: ordinary static budget.

Do not raise budgets.

## J. Forbidden changes

Do not:

- modify `src/**`;
- weaken `validateInventoryFields()`;
- remove dedicated lane/resource/scheduling consistency;
- remove profile evidence assertions;
- delete profile scenarios during this repair attempt;
- invent a second lane-contract mapping in `integration-profile-gate.test.cjs`;
- add new permanent tests;
- classify invalid fixture metadata as a product defect;
- stop on the first stale fixture metadata failure.

## K. Completion evidence

Report:

- exact files changed;
- exact lane -> resource/scheduling/platform mapping implemented by the shared helper;
- confirmation both fixture construction paths use the same helper;
- authoritative pre/post results for validation-runner;
- authoritative pre/post results for integration-profile-gate;
- capability-map result;
- second consecutive profile result if passing;
- runtime;
- any additional bounded-continuation test metadata correction;
- final disposition:
  - `REPAIR_PASSED`, or
  - `REPAIR_ATTEMPT_FAILED_RETIRE_OWNER`.

Do not return `CARD_REPOSITORY_MISMATCH` for stale synthetic ValidationCatalog metadata within the continuation envelope.
