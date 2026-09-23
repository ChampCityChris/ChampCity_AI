# WIR23-REPAIR03C-REPAIR01 — Retain Candidate Until Abort When Completion Changes

**Type:** Repair Work Card  
**Parent:** WIR23-REPAIR03B / WIR23-REPAIR03C  
**Finding:** AR-WIR-R2  
**Experiment:** Implementer Reasoning Reduction

## A. Objective

Restore fail-closed retained-candidate behavior after the IntegrationCandidate migration to generic completion evidence.

When an IntegrationCandidate exists for a logical completion and that same completion later changes revision/fingerprint, routed integration must surface the retained candidate and require abort before constructing another candidate.

It must not hide the old candidate merely because the exact completion tuple changed.

## B. Verified Repository Preconditions

`IntegrationCandidateService.current(record)` already performs exact field-by-field completion comparison and rejects a stale record.

The candidate core is therefore correct once a record is selected.

The defect is in:

`src/main/planExecution/routedIntegrationService.ts::query()`

Current discovery does:

```ts
const records = candidate.list(intakeId)
  .filter((entry) => sameCompletion(entry.completion, state.completion));
let record = records.at(0);
```

`sameCompletion()` includes:
- kind;
- routeDecisionId;
- completionId;
- revision;
- fingerprint;
- sourcePath.

Therefore a retained candidate disappears from routed discovery as soon as revision/fingerprint changes.

Before generic completion migration, Plan candidates were first located by stable Plan identity and then revision/fingerprint mismatch produced a `not-ready` projection requiring abort.

### Logical completion identity

For routed candidate discovery, the stable logical identity is exactly:

- `completion.kind`;
- `completion.routeDecisionId`;
- `completion.completionId`.

Revision, fingerprint and sourcePath are current-state fields that must be checked after the logical candidate has been located.

A real new route decision/completion ID remains a distinct completion, matching prior Plan behavior.

## C. Exact Implementation Delta

Modify:

`src/main/planExecution/routedIntegrationService.ts`.

### 1. Add logical identity comparison

Add an internal helper that returns true only when both completions have the same:

- `kind`;
- `routeDecisionId`;
- `completionId`.

Keep existing `sameCompletion()` as the exact six-field comparison.

### 2. Discover retained candidates by logical identity

In `query()`:

- obtain candidate records for the Intake;
- filter by logical completion identity, not exact completion equality;
- preserve existing candidate ordering;
- select the current retained record using existing ordering.

### 3. Preserve aborted-candidate semantics

Keep the existing aborted-candidate behavior:

- if the retained record is `aborted` and exact completion + source/target baseline are unchanged, return `not-ready` for that exact aborted candidate until completion/source baseline changes;
- if an aborted candidate belongs to an older completion revision/fingerprint or changed source/target baseline, it does not block construction for the new state.

### 4. Block non-aborted stale completion candidates

After aborted handling, when a retained non-aborted record exists and `sameCompletion(record.completion, state.completion)` is false:

return a `not-ready` projection containing:

- the **current** `completionKind`;
- the **current** `completionFingerprint`;
- current checkpoint evidence;
- the retained stale `candidate`;
- one bounded reason equivalent to:
  `Retained candidate belongs to changed completion evidence; abort it before constructing a fresh candidate.`

Do not call `candidate.current(record)` merely to produce this projection; it is expected to reject stale completion and query must remain read-only.

### 5. Existing abort path becomes the recovery

Do not create a new action.

`integrationSummary()` already exposes `abort-integration` whenever a non-integrated/non-aborted candidate is present.

`runRoutedWorkflow()` already routes abort directly to the integration service.

After abort:
- query may expose the current changed completion as ready;
- Research may checkpoint the new completion on the subsequent integrate action;
- a new candidate may then be constructed.

## D. Expected Change Boundary

Expected modified production:
- `src/main/planExecution/routedIntegrationService.ts`

Expected modified test:
- `test/characterization/routed-integration-focus.test.cjs`

Expected additional artifact:
- Implementer Report

No candidate contract, candidate service, repair provider/service, renderer, Work Planning, lifecycle checkpoint, or source-control mutation changes are expected.

## E. Architectural Decisions Already Made

1. Candidate records are immutable evidence for the completion/source/target state that created them.
2. A changed completion does not mutate/reuse an old candidate.
3. A retained candidate must remain visible until explicitly aborted.
4. Logical candidate discovery is stable identity first; exact completion freshness is checked second.
5. A real new routeDecisionId/completionId is distinct work and follows existing behavior.
6. Query remains read-only.

## F. Test and Validation Contract

Extend:

`test/characterization/routed-integration-focus.test.cjs`

Add a focused Research retained-candidate scenario because Research completion can change revision/fingerprint without requiring a fake Plan.

Production-path proof:

1. seed and approve a no-Plan Research completion;
2. configure candidate validation to fail deterministically so first `integrate()` retains a `validation-failed` / `repair-required` candidate and target remains unchanged;
3. record that candidate ID;
4. revise the same canonical Research Assessment:
   - preserve Intake;
   - preserve routeDecisionId;
   - preserve assessmentId;
   - keep it Approved;
   - keep `no-implementation-plan-required`;
   - increment artifact revision and produce changed canonical bytes/fingerprint;
5. query integration;
6. prove:
   - current `completionFingerprint` differs from the retained candidate;
   - projection is `not-ready`;
   - projection exposes the same retained candidate ID;
   - reason requires abort before a fresh candidate;
7. prove `integrate({ expectedFingerprint: currentFingerprint })` rejects while the retained candidate exists;
8. abort the retained candidate;
9. query again and prove the changed Research completion can become eligible for its normal checkpoint/new-candidate path.

The test must also preserve the existing successful Research integration and existing clean/conflicted Plan integration cases.

If mutating the canonical Assessment requires a helper, reuse canonical parse/serialize utilities in the existing test file. Do not add a new permanent test file.

Required validation:

1. `npm run typecheck`
2. `node --test --test-reporter=tap --test-concurrency=1 test/characterization/routed-integration-focus.test.cjs`
3. `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/integration-candidate-semantics.test.cjs`

Do not run the full suite.

## G. Forbidden Changes

Do not:
- mutate an old candidate to the new completion;
- delete/abort candidates automatically;
- create a second candidate while a non-aborted candidate for the same logical completion is retained;
- weaken exact candidate `current(record)` checks;
- change candidate identity hashing;
- change Integration Repair policy;
- change target advancement rules;
- add renderer recovery controls.

## H. Mismatch Policy

Implementer-local:
- helper naming;
- precise retained-candidate reason text;
- canonical test mutation syntax.

Stop with `CARD_REPOSITORY_MISMATCH` if:
- candidate ordering cannot deterministically identify the retained record;
- existing abort cannot recover a stale completion candidate;
- fixing discovery requires candidate record/schema changes;
- current Research Assessment cannot be revised while retaining its stable Assessment identity.

## I. Completion Evidence

Report:
- files changed;
- logical versus exact completion comparison;
- retained candidate state used by proof;
- old and new completion revision/fingerprint;
- proof target remained unchanged;
- proof stale candidate remained visible and blocked new integration;
- proof abort restores eligibility;
- exact three validation command results;
- deviations/mismatch.
