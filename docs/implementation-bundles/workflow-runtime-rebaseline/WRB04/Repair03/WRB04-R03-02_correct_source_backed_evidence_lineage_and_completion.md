# WRB04-R03-02 — Correct Source-Backed Evidence Lineage and Completion

**Parent:** WRB04 Repair03  
**Depends on:** WRB04-R03-01 passing checkpoint/report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Correct cumulative source-backed evidence semantics so sequential WorkItems/Phases remain valid across the exact Workflow checkpoint chain without weakening final-candidate freshness.

This card owns:

- canonical Workflow source revision lineage;
- cumulative solution-level Operator Decision evidence;
- aggregate Phase evidence over sequential source revisions;
- WorkItem/Phase historical-close semantics at Workflow completion.

Do not redesign source lifecycle or integration.

## 1. Add one canonical exact Workflow source revision-chain helper

Create/reuse one bounded helper owned by Project State/source application logic that derives the exact current Workflow revision chain from:

- immutable SourceBaseline base revision;
- committed Workflow SourceCheckpoints;
- active SourceBinding current revision.

Required invariants:

- exactly one current SourceBinding for the exact Workflow when source-backed;
- every committed checkpoint has exact expected/result revision;
- no duplicate expected revision;
- no fork;
- no gap from baseline to current binding revision;
- current SourceBinding revision is the terminal chain revision;
- checkpoint belongs to the exact Workflow lineage.

Return a bounded ordered chain/set sufficient to prove whether a historical WorkItem/Tester candidate revision is on the current exact Workflow lineage.

Do not infer ancestry from arbitrary Git history when canonical SourceCheckpoint evidence exists.

## 2. Define one shared current-Tester evidence resolver

For each exact current WorkItem requested:

1. resolve latest successful ImplementationRecord;
2. resolve exactly one completed TesterResult for that ImplementationRecord;
3. source-neutral:
   - TesterResult sourceMode = source-neutral;
   - no candidate revision/checkpoint fabrication;
4. source-backed:
   - TesterResult sourceMode = source-backed;
   - candidateRevisionId must be a revision on the canonical exact Workflow checkpoint chain;
   - if Tester checkpointState = committed, its SourceCheckpoint must resolve to that candidate revision and link to the TesterResult;
   - if checkpointState = not-required, candidate revision must equal its implementation revision and that implementation revision must be represented by the canonical implementation checkpoint chain.

Expose only current latest-attempt evidence.

Use this resolver for cumulative solution and Phase evidence. Do not maintain separate incompatible rules in renderer/application/Project State.

## 3. Fix cumulative solution-level Operator Decision recording

For a solution-owned `operator_decision` Criterion at a selected WorkItem boundary:

- require current Tester evidence for the selected exact WorkItem;
- build the cumulative evidence set from all Workflow WorkItems that currently have successful latest implementation + current Tester evidence;
- do **not** require future/unimplemented WorkItems;
- Decision governs the exact Criterion;
- Decision derives from the sorted cumulative TesterResult set.

As later WorkItems become implemented/tested:

- cumulative evidence set expands;
- earlier Decision becomes stale;
- Operator may correct/reaffirm the same Criterion Decision with the expanded current evidence.

Do not create one independent Decision per WorkItem for the same solution Criterion.

## 4. Use the same cumulative evidence set everywhere

The following must agree exactly for solution-owned Operator Criteria:

- WorkItem validation projection;
- WorkItem completion eligibility;
- Criterion Decision write preflight;
- final Workflow completion projection.

At WorkItem A boundary, Decision [A] may allow A to close.

At WorkItem B boundary, Decision [A] is stale and Decision [A,B] is required.

At final Workflow completion, the Decision must match the complete current tester set for every current implementation WorkItem that implements the accepted solution.

Prove a dependency chain does not deadlock.

## 5. Fix aggregate Phase evidence across sequential source revisions

For a source-backed Phase with WorkItems A and B:

```text
A TesterResult candidate = R1
B TesterResult candidate = R2
current Workflow revision = R2
```

A remains valid aggregate member evidence when R1 is on the canonical checkpoint chain to R2.

Update:

- Phase tester-evidence resolver;
- Phase Validation provenance linking;
- Phase Validation freshness;
- Phase Operator Decision provenance/freshness;
- semantic Phase member collection.

Aggregate Phase Validation itself remains bound to the final current Phase source candidate R2.

If source advances after the Phase evidence is recorded and before Phase close, aggregate Validation/Decision becomes stale.

## 6. Preserve typed WorkItem close as historical authority

A WorkItem that passed its exact eligibility and was closed at candidate R1 remains closed when a later WorkItem advances source to R2.

At Workflow completion:

- do not call full WorkItem completion eligibility against R2 for already-closed WorkItems;
- verify each closed WorkItem has coherent latest implementation/Tester evidence on the canonical Workflow chain;
- verify no active Repair/child/dependency ownership contradiction remains;
- preserve typed closed state as the accepted historical boundary.

Do not reopen or silently revalidate closed WorkItems.

## 7. Preserve typed Phase close as historical authority

A Phase validated and closed at R1 remains closed when a later Phase advances source to R2.

Workflow completion must not rerun closed Phase Criteria against the final revision.

Verify:

- Phase is canonically closed;
- member WorkItems are closed;
- no active same-Phase Repair remains.

The Phase's typed close event is the historical acceptance boundary.

## 8. Final aggregate solution/Workflow obligations remain current

At final Workflow completion, evaluate current final-candidate obligations that are genuinely aggregate:

- accepted-solution required Criteria;
- explicit Workflow-level blocking Decision/Finding state;
- current source checkpoint chain.

For solution Criteria:

- deterministic/semantic/visual Validation must be current at final source revision when source-backed;
- solution Operator Decision must match the final complete cumulative TesterResult set.

Do not use historical WorkItem/Phase closure as a substitute for final solution obligations.

## 9. Source-neutral behavior

Source-neutral cumulative evidence uses latest successful ImplementationRecord + TesterResult identities without Git revision lineage.

The same solution-level cumulative Decision semantics apply.

Do not fabricate SourceCheckpoint/revision evidence.

## Permanent proof

At minimum prove:

1. exact source checkpoint helper rejects fork/gap/ambiguous chain;
2. source-backed WorkItem A TesterResult at R1 remains valid member evidence after B advances to R2;
3. source-backed Phase with 2+ sequential WorkItems can assemble complete aggregate evidence;
4. semantic Phase Validator receives both members despite different candidate revisions;
5. Phase Validation binds final current Phase revision;
6. Phase Validation becomes stale if source advances before Phase close;
7. solution Operator Decision [A] allows A to close without requiring future B;
8. after B TesterResult exists, Decision [A] is stale;
9. corrected Decision [A,B] allows B/final solution boundary;
10. dependency chain no longer deadlocks;
11. closed WorkItem at R1 remains valid at Workflow completion after R2;
12. closed Phase at R1 remains valid after later Phase R2;
13. final solution Criterion still requires proof current at final R2;
14. final Workflow source chain terminates at current SourceBinding revision;
15. source-neutral cumulative Decision behavior works without source identities.

## Non-scope

Do not change:

- WorkItem planning/scope recovery from R03-01;
- generated Repair Criterion source-mode policy;
- runtime interaction panels;
- integration candidate/Dev advancement mechanics.

## Validation

Run:

- build;
- exact source checkpoint-chain tests;
- multi-WorkItem source-backed WorkItem completion tests;
- multi-member source-backed Phase tests;
- cumulative solution Operator Decision dependency-chain tests;
- Workflow completion tests across 2+ source revisions and 2+ Phases;
- source-neutral cumulative Decision regression;
- direct exact Workflow integration regression;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair03/Reports/WRB04-R03-02_IMPLEMENTER_REPORT.md`

Commit:

`WRB04-R03-02 correct source evidence lineage`

Then immediately proceed to R03-03.
