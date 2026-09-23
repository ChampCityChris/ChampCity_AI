# RCA — Validation Profile Gate Fixture Drift

**Date:** 2026-09-22  
**Scope:** Remaining validation-profile failures after WIR product repairs  
**Disposition:** TEST FIXTURE DEFECT — REPAIR ONCE; do not reopen WIR production behavior

## Executive conclusion

The remaining failures do not currently indicate a Work Intake Routing or IntegrationCandidate product defect.

The failing validation-profile owners construct synthetic ValidationCatalog records using metadata that predates the current dedicated-lane contract. The production catalog validator is correctly rejecting those synthetic records.

The affected test should **not be retired yet** because `integration-profile-gate.test.cjs` still owns unique integration-profile behavior that is not fully covered by the generic validation-runner or integration-policy owners.

A single bounded test-fixture repair is justified.

If that exact repair is completed and the authoritative profile owner still fails, do not start another repair chain. Per Operator direction, retire the owner rather than continuing to modify product behavior to satisfy it.

## 1. What is actually failing

### Authoritative profile owner

`test/agent-harness/integration-profile-gate.test.cjs`

Current authoritative result:
- 7 discovered;
- 3 passed;
- 4 failed.

Isolation shows:

1. `candidate orchestration supplies frozen exact runner context`
   - 3/3 passed.
   - Shared IntegrationCandidate fixture behavior is working.

2. `candidate profile uses immutable target toolkit ownership and revisions through repair revalidation`
   - fails before the shared `integration-scenarios.cjs` profile scenario;
   - `runValidationProfile()` returns `exitCode: null`;
   - summary: `Validation profile planning or execution failed.`

3. `actual candidate profile receipts control target eligibility`
   - downstream profile evidence is absent because profile execution already failed.

### Generic validation-runner owner

`test/validation/validation-runner.test.cjs`

Current authoritative result:
- 8 discovered;
- 6 passed;
- 2 failed.

The two isolated failures are explicit catalog-schema errors:

- `test/performance.test.cjs performance-soak lane requires performance-soak`
- `test/packaging.test.cjs packaging lane requires packaging`

This proves the defect is not specific to WIR or IntegrationCandidate.

## 2. Current production contract

`scripts/validation/catalog-schema.cjs` now enforces dedicated validation-lane consistency.

The current contracts are:

| Lane | Required owned resource | Required scheduling | Platform |
| --- | --- | --- | --- |
| `desktop-platform` | `electron-desktop` | `exclusive-desktop` | Windows |
| `packaging` | `packaging` | `exclusive-packaging` | Any |
| `performance-soak` | `performance-soak` | `exclusive-performance` | Any |

Dedicated resources/modes are bidirectional: they may not be hidden under ordinary lanes, and dedicated lanes may not use ordinary parallel scheduling.

This contract is already independently covered by `test/validation/capability-map.test.cjs`.

The contract should not be weakened.

## 3. Root cause

### A. Shared synthetic validation fixture is stale

`test/support/validation-fixture.cjs` creates a synthetic test record by cloning the permanent capability-map validator record and changing only the lane.

It then unconditionally sets:

- `ownedResources = ["temp-filesystem-isolated"]`
- `scheduling = "parallel-safe"`

for **every** lane.

That was valid before the dedicated-lane contract became strict.

It is now invalid for:
- desktop-platform;
- packaging;
- performance-soak.

This directly explains both current `validation-runner.test.cjs` failures.

### B. The integration-profile synthetic catalog repeats the same stale metadata

`integration-profile-gate.test.cjs::prepareProfile()` builds four synthetic records:

- integration;
- desktop-platform;
- packaging;
- performance-soak.

It clones the same generic template and explicitly assigns:

- `ownedResources = ["temp-filesystem-isolated"]`

while leaving generic scheduling in place.

The target-owned profile runner calls `loadCatalog(input.root)` against this synthetic candidate repository. The current schema correctly rejects the catalog before profile evidence can be produced.

### C. The "weakened future catalog" proof also became invalid

The direct profile-authority test deliberately changes the candidate's test record from:

`integration`

to:

`performance-soak`

to prove incoming metadata cannot replace target authority.

It changes:

- `proposedValidationLane`
- `requiresBuild`

but does not change:
- owned resources;
- scheduling.

The candidate catalog is therefore malformed under the current schema.

That means the test is no longer proving "valid but weaker incoming metadata cannot replace the target judge."

It is instead handing the runner an invalid catalog and failing during candidate-catalog validation.

## 4. Why this is a test defect rather than product defect

The production stack is doing exactly what current architecture requires:

1. target profile execution validates the candidate repository's proposed future catalog as a complete supported configuration;
2. catalog validation rejects internally inconsistent lane/resource/scheduling metadata;
3. invalid structured evidence does not become persisted `profileEvidence`;
4. a candidate without valid required evidence cannot advance.

Weakening any of those production behaviors to make the fixture pass would be incorrect.

## 5. Should the test be retired?

### Not yet

`integration-profile-gate.test.cjs` was originally created to prove behavior that remains materially distinct from the generic validation-runner:

- immutable target-owned validation toolkit;
- exact target/incoming/candidate revision binding;
- target metadata remains authoritative over a valid weaker incoming proposal;
- profile evidence is persisted into candidate validation receipts;
- failing candidate source prevents target eligibility;
- stale candidate context is rejected;
- repaired candidate is revalidated against the same target authority;
- unknown/unclassified changed source is rejected.

The generic `validation-runner.test.cjs` proves catalog/planner/executor/scheduler behavior.

`integration-policy-semantics.test.cjs` proves policy identity and policy transitions.

Neither fully replaces the candidate-specific validation-profile authority contract above.

Retiring the profile owner now would remove unique permanent coverage.

### Repair threshold

The repair is justified because:
- root cause is concrete;
- change is test-support only;
- one shared lane-contract helper can fix both failing owners;
- no production behavior needs to change;
- expected runtime remains well below the 60-second owner ceiling.

This merits one final attempt.

If the authoritative profile owner still fails after the exact synthetic lane-contract repair below, the Operator has directed retirement rather than another repair cycle.

## 6. Required repair architecture

Create one lane-aware synthetic-record helper in:

`test/support/validation-fixture.cjs`

The helper owns the current dedicated lane contract for synthetic validation records.

Conceptually:

`applyValidationLaneFixtureContract(record, lane)`

It must set:

### Ordinary lanes

- `proposedValidationLane = lane`
- `ownedResources = ["temp-filesystem-isolated"]`
- `scheduling = "parallel-safe"`
- `platformDependency = "none"`
- `execution.platform = "any"`

### desktop-platform

- include `electron-desktop` and `temp-filesystem-isolated` in sorted owned resources;
- `scheduling = "exclusive-desktop"`;
- `platformDependency = "windows"`;
- `execution.platform = "windows"`.

### packaging

- include `packaging` and `temp-filesystem-isolated`;
- `scheduling = "exclusive-packaging"`;
- platform remains none/any.

### performance-soak

- include `performance-soak` and `temp-filesystem-isolated`;
- `scheduling = "exclusive-performance"`;
- platform remains none/any.

Use one clear fixture scheduling reason describing that the synthetic record intentionally models the current lane/resource contract.

Then:

1. `validationFixture()` must use that helper for every generated record.
2. Export the helper.
3. `integration-profile-gate.test.cjs::prepareProfile()` must use the same helper for all four custom records.
4. The direct profile test's intentionally weakened candidate record must use the helper when moving the record to `performance-soak`, then set `requiresBuild=false` as the intended weaker-but-valid future metadata.

Do not alter the production catalog validator.

## 7. Simplification decision

No new permanent test is needed.

Do not add another test around the helper.

The existing failing owners are sufficient proof:
- `validation-runner.test.cjs` validates general synthetic lane behavior;
- `integration-profile-gate.test.cjs` validates candidate profile authority.

This is a fixture maintenance repair, not a new feature.

## 8. Exit rule for this final attempt

The Implementer is **not** permitted to stop on the first adjacent test-fixture assertion.

Within these files:

- `test/support/validation-fixture.cjs`
- `test/validation/validation-runner.test.cjs`
- `test/agent-harness/integration-profile-gate.test.cjs`

it must continue fixing stale synthetic fixture metadata that contradicts the current ValidationCatalog schema until the two named owners execute their intended semantics.

It must not modify production `src/**` or validation schema/runtime to make synthetic data acceptable.

Final acceptance is:

- validation-runner: 8/8 authoritative pass;
- integration-profile-gate: 7/7 authoritative pass;
- capability-map: 5/5 authoritative pass.

If the exact test-support repair is complete and `integration-profile-gate.test.cjs` still fails, report the final evidence. No further product/test repair card is warranted; the owner will be retired per Operator direction.
