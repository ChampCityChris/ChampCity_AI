# WIR23-REPAIR03C-REPAIR02 — Select Active Candidate Across Terminal History

**Type:** Repair Work Card  
**Parent:** WIR23-REPAIR03C / WIR23-REPAIR03C-REPAIR01  
**Finding:** AR-WIR-R3

## A. Objective

Make routed IntegrationCandidate discovery fail closed across all retained records for one logical completion, including repository state that may have been created before REPAIR01 fixed exact-completion hiding.

A newer terminal record must not hide an older active retained candidate.

Terminal history must not itself become an impossible abort blocker when the current completion changes.

## B. Verified Repository Preconditions

`IntegrationCandidateService.list(intakeId)` returns candidate records newest-first.

`routedIntegrationService.ts` now has:
- `sameLogicalCompletion()`: kind + routeDecisionId + completionId;
- `sameCompletion()`: all six completion fields.

Current query filters by logical identity but selects only `records.at(0)`.

Current candidate statuses are:

- `constructing`
- `conflicted`
- `validation-failed`
- `validated`
- `integrated`
- `failed`
- `aborted`
- `operator-decision`

For routed discovery, treat these as:

### Active retained states

- constructing
- conflicted
- validation-failed
- validated
- failed
- operator-decision

These represent candidate state that has not reached a terminal discard/integration disposition.

### Terminal history

- aborted
- integrated

The existing exact-aborted rule remains special: an exact aborted candidate with unchanged source/target baseline blocks recreation of that exact candidate until completion or source baseline changes.

The existing exact integrated candidate remains the evidence for `integration-complete`.

## C. Exact Implementation Delta

Modify only:

`src/main/planExecution/routedIntegrationService.ts`

and its existing characterization proof.

### 1. Select active retained state before terminal history

After filtering `candidate.list(intakeId)` by logical completion identity:

- preserve newest-first ordering;
- find the first active retained record;
- independently find the first terminal record whose completion exactly matches the current completion.

Selection precedence:

1. newest active retained record, if any;
2. otherwise newest exact current terminal record, if any;
3. otherwise no record.

Do not select a stale aborted or stale integrated record merely because it is newest.

### 2. Active retained record behavior

If the selected active record is not an exact completion match:

return read-only `not-ready` with:
- current completionKind;
- current completionFingerprint;
- current checkpoint evidence;
- the selected active retained candidate;
- abort-required reason.

If the active record exactly matches current completion, preserve existing status projection:
- validated -> ready for advance;
- conflicted/validation-failed -> repair-required;
- failed -> failed;
- operator-decision -> operator-decision-required;
- constructing -> candidate-validating.

No active record may be automatically aborted, mutated, or skipped.

If multiple active records exist from pre-fix history, expose the newest active one. After the Operator aborts it, a subsequent query must expose the next active record until all active retained state is explicitly resolved.

### 3. Terminal behavior

If there is no active record:

#### Exact integrated record

Return `integration-complete` exactly as current completed integration behavior.

#### Exact aborted record

Preserve the existing source/target baseline check:
- unchanged exact candidate -> not-ready retained-aborted message;
- changed source/target baseline -> ignore the terminal record and allow current state to proceed.

#### Stale terminal records

An aborted or integrated record whose exact completion does not match the current completion does not block the current completion.

Do not emit an abort-required reason for an integrated record.

## D. Expected Change Boundary

Expected modified production:
- `src/main/planExecution/routedIntegrationService.ts`

Expected modified test:
- `test/characterization/routed-integration-focus.test.cjs`

Expected additional artifact:
- Implementer Report

Do not modify:
- IntegrationCandidate contracts/service;
- candidate hashing;
- Integration Repair;
- target advancement;
- renderer;
- Work Planning;
- lifecycle checkpoint code.

## E. Architectural Decisions Already Made

1. Candidate records are immutable history.
2. Active retained candidate state is fail-closed until explicitly resolved.
3. Terminal history is not active work.
4. Multiple active records can exist as legacy residue from the prior hiding defect; cleanup must be deterministic and explicit.
5. Newest active candidate is surfaced first.
6. Exact current integrated evidence remains terminal success.
7. Exact current aborted evidence keeps the existing no-recreate rule.
8. Stale terminal history does not block changed completion evidence.

## F. Test and Validation Contract

Extend the existing Research candidate characterization.

Do not add a permanent test file in this card; REPAIR03 will reorganize test ownership afterward.

### Required legacy-residue scenario

Construct, using real IntegrationCandidateService state in the temporary repository:

1. Research completion revision 1 creates Candidate A and deterministically reaches `validation-failed`.
2. Advance Research completion to revision 2.
3. Directly create Candidate B for revision 2 through the IntegrationCandidate service's trusted hook path, demonstrating the kind of second record the pre-fix routed bug could have allowed.
4. Abort Candidate B.
5. Advance the same Research completion to revision 3.
6. Query through `createRoutedIntegrationService()`.

Prove:
- B is newer and aborted;
- A is older and still validation-failed;
- query surfaces A, not B;
- query is not-ready;
- reason requires abort of retained candidate;
- current completion fingerprint is revision 3;
- target has never advanced.

Abort A through routed integration.

Then prove:
- no active retained candidate remains;
- stale terminal A/B history does not block the revision-3 Research completion;
- query returns normal ready/checkpoint eligibility.

### Exact terminal controls

Preserve or add bounded assertions that:
- exact integrated current candidate still produces integration-complete;
- exact aborted current candidate with unchanged source/target remains not-ready;
- stale integrated history does not produce an abort-required dead end for a changed completion.

### Required validation

1. `npm run typecheck`
2. `node --test --test-reporter=tap --test-concurrency=1 test/characterization/routed-integration-focus.test.cjs`
3. `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/integration-candidate-semantics.test.cjs`

The timing of command 2 is evidence for REPAIR03; do not attempt to solve its runtime in this card.

## G. Forbidden Changes

Do not:
- delete historical candidate receipts;
- automatically abort active candidates;
- mutate old candidate completion identity;
- treat integrated candidates as active;
- weaken candidate core current(record);
- change candidate ordering;
- add a second candidate inventory;
- change renderer actions.

## H. Mismatch Policy

Implementer-local:
- helper names;
- exact active-status set representation;
- fixture mechanics needed to create legacy multi-record state.

Stop with `CARD_REPOSITORY_MISMATCH` if:
- direct IntegrationCandidateService cannot create the required synthetic legacy residue without changing production candidate semantics;
- candidate inventory order is not deterministic;
- routed abort cannot expose the next older active record;
- terminal integrated/aborted semantics differ materially from the verified code.

## I. Completion Evidence

Report:
- files changed;
- exact active/terminal status classification;
- selection precedence;
- Candidate A/B/current completion IDs, revisions, statuses;
- proof newer terminal B does not hide older active A;
- proof cleanup exposes active records sequentially;
- proof stale terminal history stops blocking changed completion;
- exact validation results;
- routed-integration runtime observation for REPAIR03.
