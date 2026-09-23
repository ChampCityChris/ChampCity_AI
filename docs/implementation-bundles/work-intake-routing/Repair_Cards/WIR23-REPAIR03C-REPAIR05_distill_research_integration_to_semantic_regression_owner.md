# WIR23-REPAIR03C-REPAIR05 — Distill Research Integration to a Semantic Regression Owner

**Type:** Test Architecture Repair Work Card  
**Parent:** WIR23-REPAIR03C  
**Finding:** Research owner is over-proving generic Git mechanics

## A. Objective

Replace the 560-second permanent Research integration characterization with a bounded Research-specific regression owner that proves route/completion/orchestration semantics while reusing the already-established semantic SourceControl fixture for generic Git mechanics.

The existing 560-second test is qualification evidence. Its unique Research assertions must remain, but its repeated proof of generic source-control internals must not remain in the normal suite.

## B. Verified Repository Preconditions

`routed-integration-focus.test.cjs` already uses `installSemanticSourceFixture()` and independently proves generic routed integration with real candidate bytes/checkouts while avoiding repeated SourceControlService receipt-stack proof.

Current Plan owner:
- Architect independent: 14.396 seconds, 3/3 passed.

Current Research owner:
- 560.985 seconds;
- 9,766 bounded production Git calls;
- 4 candidate checkouts;
- one top-level Research scenario.

Dedicated owners already prove:
- Research planning/outcome semantics;
- Research lifecycle checkpoint receipt validity;
- SourceControlService safety/receipts;
- IntegrationCandidate semantics;
- integration Git worktree/merge/advance behavior.

## C. Exact Implementation Delta

### 1. Keep the Research test file but change its source-control seam

Retain:

`test/characterization/routed-research-integration-focus.test.cjs`

Install the same semantic SourceControl fixture used by the Plan routed integration sentinel:

`installSemanticSourceFixture(t, { allowCheckpointChain: true })`

The fixture may execute real disposable Git operations to provide candidate bytes/checkouts, but the test must not traverse the full production SourceControlService receipt/branch-inventory stack.

### 2. Preserve only Research-specific assertions

Permanent Research owner must retain proof that:

- approved no-Plan Research projects `completionKind: research`;
- no Plan/Work Item/Phase/routed-development binding exists;
- query is read-only before integration;
- integration requires current completion fingerprint;
- Research checkpoint is established before candidate construction;
- changed completion sees active retained candidate state;
- terminal history does not hide active state;
- explicit abort restores eligibility;
- successful shared integration reaches `integration-complete`;
- stale integrated/aborted history does not incorrectly block changed Research completion.

### 3. Do not re-prove generic source-control mechanics

Remove assertions whose only purpose is to re-prove:
- repository top-level identity;
- SourceControlService receipt before/after population;
- worktree common-dir ownership;
- generic merge-base calculation;
- generic branch-ref advancement implementation;
- generic commit-message retrieval mechanics.

Those remain owned by their generic tests.

### 4. Reduce real candidate scenarios when semantically equivalent

The retained-candidate state-machine proof may use deterministic candidate records/checkouts supplied through the semantic fixture.

Do not create four full production SourceControlService candidate journeys merely to represent four candidate statuses.

Use the smallest number of actual candidate checkouts that preserves distinct Research orchestration transitions.

### 5. Correct execution telemetry

Ensure telemetry is installed before any helper captures direct Git process functions.

If fixture-shell Git count is retained as evidence:
- lazy-load fixture modules after `measureExecution()`, or
- otherwise instrument the helper's actual Git seam.

Do not report `fixtureGit: 0` when the instrumentation cannot observe module-captured `execFileSync`.

## D. Expected Change Boundary

Expected:
- `test/characterization/routed-research-integration-focus.test.cjs`
- `test/support/research-integration-scenarios.cjs`
- `test/support/execution-metrics.cjs` only if needed to correct instrumentation
- `validation/capability-map.json`
- Implementer Report

No `src/**` production change is expected in this card.

## E. Architectural Decisions Already Made

1. Permanent tests prove contracts, not every implementation layer repeatedly.
2. Research owns Research-to-integration orchestration.
3. Generic Git/source-control mechanics have generic owners.
4. Full production-Git Research qualification may be retained outside the ordinary suite only if there is a specific release/diagnostic need; it is not a routine regression owner.
5. No unique Research behavior assertion is deleted.

## F. Test and Validation Contract

Run:

1. `npm run typecheck`
2. `routed-integration-focus.test.cjs`
3. `routed-research-integration-focus.test.cjs`
4. Research planning owner
5. Research checkpoint owner
6. `capability-map.test.cjs`

Acceptance:
- Plan integration owner <60 seconds;
- Research semantic integration owner <60 seconds target, <90 seconds absolute ceiling;
- all unique Research assertions listed above remain;
- capability ownership remains complete;
- no production source changes.

Do not run or keep the former 560-second full SourceControlService replay as an ordinary catalog owner.

## G. Forbidden Changes

Do not:
- delete Research integration regression entirely;
- mock away Research completion/checkpoint state semantics;
- remove retained-candidate behavior assertions;
- weaken generic integration owners;
- reclassify the slow test as performance/soak to avoid fixing ownership;
- raise budgets.

## H. Completion Evidence

Report:
- exact assertions retained;
- generic Git assertions removed as duplicate ownership;
- source-control seam used;
- actual candidate checkout count;
- corrected telemetry coverage;
- Plan and Research owner durations;
- capability-map changes.
