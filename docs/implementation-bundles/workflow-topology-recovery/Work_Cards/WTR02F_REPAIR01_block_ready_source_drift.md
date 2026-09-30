# WTR02F Repair01 — Enforce Ready-State Drift Blocking and Correct Advanced-Dev Proof

**Parent card:** WTR02F — Lazily Materialize Workflow SourceLine and RepositoryCheckout from the Exact SourceBaseline  
**Implementer:** GPT 6.0 Luna Medium  
**Starting implementation checkpoint:** a70de62181425e1548ce85dfc2afd8f41423365c  
**Architect finding:** fresh/retry materialization is structurally correct, but ready-state drift can recreate missing physical checkout state instead of blocking, semantic ready-state mismatches can remain falsely ready, and the claimed Dev-R2 proof never actually advanced dev  
**Report:** docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02F_REPAIR01_IMPLEMENTER_REPORT.md

## 1. Objective

Keep WTR02F's architecture unchanged.

Repair only:

1. ready SourceBinding drift semantics;
2. the permanent exact-baseline proof where Dev must genuinely advance past the recorded baseline.

No new source lifecycle surface belongs in this repair.

## 2. Finding A — ready SourceBinding may recreate a missing checkout

Current materialization logic does:

~~~
if checkout path is missing
→ git worktree add ...
~~~

for both preparing/blocked recovery and an already-ready SourceBinding.

That is correct for incomplete preparation, but incorrect for durable ready state.

WTR02F requires:

> once SourceBinding is ready, physical source drift is evidence of inconsistency, not permission to reconstruct execution state automatically.

If a ready binding's expected Workflow checkout is missing, materialize() must:

- not recreate the checkout;
- not create another checkout path;
- not reset or alter the SourceLine;
- transition the SourceBinding from ready to blocked;
- persist failureCode = REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED;
- fail visibly for inspection.

## 3. Finding B — semantic ready-state mismatch can remain falsely ready

Current code checks ready-state semantic identity before the later failure-handling block:

- workSourceLineId;
- repositoryCheckoutId;
- currentRevisionId presence.

On mismatch it throws immediately, leaving SourceBinding preparationState = ready.

Required behavior:

If a ready SourceBinding conflicts with deterministic identity derived from its immutable SourceBaseline:

~~~
expected SourceLine = workflow/<baseline.workflowId>
expected checkout ID = workflow-<baseline.workflowId>
currentRevisionId required
~~~

then materialize() must:

1. transition ready → blocked using the current exact recordVersion;
2. use failureCode = SOURCE_MATERIALIZATION_STATE_MISMATCH;
3. make no Git mutation;
4. fail visibly.

Do not silently rewrite the mismatched semantic identity back to the expected value.

## 4. Ready-state physical mismatch rule

For a binding that begins materialize() in ready state, all validation is inspection-only except idempotent checkout registration.

It may:

- inspect Dev/repository prerequisites;
- inspect deterministic Workflow SourceLine;
- inspect Workflow checkout;
- inspect HEAD/branch/common repository/cleanliness;
- idempotently confirm the WTR02D RepositoryCheckout registration.

It may not:

- create the Workflow SourceLine;
- create the Workflow checkout;
- move/update/reset the SourceLine;
- clean/reset the checkout;
- generate an alternate identity.

Any missing or conflicting ready physical state transitions the binding to blocked using the most specific existing WTR02F failure code.

Preserve the existing rule that idempotent Agent Harness registration confirmation is allowed.

## 5. Keep incomplete preparation recovery unchanged

For bindings that begin in:

- unprepared;
- preparing;
- blocked;

retain the WTR02F recovery behavior:

- exact existing SourceLine at immutable baseline may be reused;
- exact clean Workflow checkout may be reused;
- missing Workflow checkout may be created;
- checkout registration may be retried;
- no destructive overwrite is allowed.

Do not turn this repair into a general retry redesign.

## 6. Correct the advanced-Dev proof

The current test sequence:

~~~
git switch -c temporary-dev-advance
commit R2
git switch dev
r2 = rev-parse dev
~~~

does not advance dev. It leaves dev at R1.

Repair:

test/source-control/workflow-source-materialization.test.cjs

so the permanent proof genuinely establishes:

~~~
Dev R1
→ SourceBaseline records R1
→ dev advances to R2
→ dev HEAD = R2 and R2 != R1
→ materialize Workflow
→ Workflow SourceLine HEAD = R1
→ Workflow checkout HEAD = R1
→ dev remains at R2
~~~

Preferred fixture sequence:

- remain on dev;
- modify and commit R2 directly on dev after SourceBaseline capture.

Do not use a temporary side branch as a substitute.

Add explicit assertions:

- r2 !== env.r1;
- git(dev, "rev-parse", "dev") === r2 before materialization;
- git(dev, "rev-parse", "dev") === r2 after materialization.

## 7. Permanent ready-drift proof

Extend the existing focused WTR02F test file rather than creating a new test family.

Required case A — missing checkout after ready:

1. materialize a Workflow successfully;
2. capture ready binding recordVersion and checkout path;
3. remove the worktree through deterministic test setup using Git worktree mechanics;
4. confirm expected checkout path is absent;
5. call materialize() again;
6. prove it rejects;
7. prove checkout path is still absent — it was not recreated;
8. reload SourceBinding;
9. prove preparationState = blocked;
10. prove failureCode = REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED.

Test cleanup may use Git worktree removal because it is synthetic fixture setup/perturbation. Production code must remain nondestructive.

Required case B — semantic ready identity mismatch:

1. materialize another Workflow successfully;
2. mutate only the synthetic Project State fixture using updateSourceBinding() so its ready workSourceLineId or repositoryCheckoutId no longer matches deterministic baseline identity while remaining structurally valid;
3. call materialize() again;
4. prove it rejects before provider mutation;
5. prove no alternate branch or checkout is created;
6. reload SourceBinding;
7. prove preparationState = blocked;
8. prove failureCode = SOURCE_MATERIALIZATION_STATE_MISMATCH.

Do not add a production corruption API.

## 8. SourceLine ready drift

Preserve current behavior where a missing ready Workflow SourceLine fails rather than being recreated.

Ensure that failure also leaves the SourceBinding blocked.

No new branch recovery behavior is required.

## 9. Failure transition helper

A small local helper inside workflowSourceMaterializationService.ts is acceptable to centralize:

~~~
current SourceBinding
→ if preparationState is ready/preparing
→ update to blocked with exact failureCode
→ preserve existing semantic source references
~~~

Do not build a generic error/state framework.

The helper must not swallow a successful blocked transition.

If the transition itself fails because Project State changed concurrently, preserve the primary error and do not mutate source physically.

## 10. Expected production scope

Expected production file:

- src/main/sourceControl/workflowSourceMaterializationService.ts

Expected test:

- test/source-control/workflow-source-materialization.test.cjs

Report:

- docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02F_REPAIR01_IMPLEMENTER_REPORT.md

No other production file should normally change.

validation/capability-map.json should not need a semantic change; update test count only if the permanent test count actually changes and the repository policy requires accurate count metadata.

## 11. Explicit non-scope

Do not:

- change SourceBaseline;
- change SourceBinding schema;
- change ready's checkout requirement;
- change deterministic source identities;
- change Workflow supersession semantics;
- create/adopt Main or Dev;
- change Agent Harness registration contract;
- change checkpoint/integration ownership;
- change Source Graph;
- modify Work Intake capture;
- modify WorkIntakeBranchService;
- implement WTR02G+.

## 12. Acceptance criteria

Repair01 is complete only when:

1. genuinely advanced Dev remains at R2 while materialized Workflow starts at recorded R1;
2. test explicitly proves R2 != R1;
3. ready binding with missing checkout becomes blocked;
4. missing ready checkout is not recreated;
5. ready semantic identity mismatch becomes blocked;
6. semantic mismatch creates no alternate source resources;
7. partial preparing/blocked recovery remains functional;
8. fresh materialization and concurrent-Workflow proof remain passing;
9. no WTR02G/H behavior is introduced.

## 13. Validation

Required:

1. npm run build;
2. node --test test/source-control/workflow-source-materialization.test.cjs;
3. node --test test/project-state/source-semantic-references.test.cjs;
4. node --test test/agent-harness/source-control-service-boundary.test.cjs;
5. validation planner preview for exact changed-path manifest;
6. npm run test:affected -- --changes <exact-changed-path manifest>;
7. git diff --check.

WTR02F-owned proof must pass.

Later-owned WTR02G/H/WTR03C failures may remain classified as deferred.

## 14. Implementer Report

Write:

docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02F_REPAIR01_IMPLEMENTER_REPORT.md

Include:

- starting SHA;
- exact files changed;
- ready-drift handling change;
- proof that missing ready checkout is not recreated;
- proof that semantic mismatch becomes blocked;
- exact R1/R2 test sequence and assertion that R2 != R1;
- focused validation results;
- affected failures classified by later owning card;
- confirmation that no checkpoint/integration/Source Graph/Project topology behavior changed.

Do not edit the committed report afterward solely to add its own checkpoint hash.

## 15. Git checkpoint and stop boundary

After implementation, validation, report, staged-diff inspection, and safety scan, create exactly one attributable checkpoint commit.

Suggested subject:

WTR02F Repair01 block ready source drift

No additional Operator Git approval is required.

Then STOP.

Do not begin WTR02G.
