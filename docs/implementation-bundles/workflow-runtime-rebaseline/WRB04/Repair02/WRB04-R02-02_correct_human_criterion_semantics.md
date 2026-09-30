# WRB04-R02-02 — Correct Human Criterion Decision and Visual Evidence Semantics

**Parent:** WRB04 Repair02  
**Depends on:** WRB04-R02-01 passing checkpoint/report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Correct human-reserved Criterion authority so WorkItem, accepted-solution, and Phase completion cannot be satisfied by unrelated owner-level Decisions or pass-only visual evidence.

This card establishes one Criterion-specific human evidence model.

Phase aggregate validation/failure routing remains R02-03.

## 1. Make Operator Decision authority Criterion-specific

Add a typed Project State command equivalent to:

`recordCriterionOperatorDecision(projectId, criterionId, input, evidenceContext)`

Requirements:

- trusted principal must be human Operator;
- target must be an exact active required Criterion;
- Criterion policy must be `operator_decision`;
- Decision `governs` the exact Criterion, not its WorkItem/solution/Phase owner;
- stable Decision type, e.g. `criterion-operator-decision`;
- bounded rationale;
- explicit disposition outcome;
- prior Criterion Decision history remains auditable.

Do not infer Criterion decision authority from:
- WorkItem disposition;
- BoundedSolution disposition;
- Phase disposition;
- planning-acceptance Decision.

Update:

- WorkItem completion;
- Phase completion;
- Workflow completion where applicable;
- validation projections;
- `getRequiredOperatorDecisions()`;

to query the exact Criterion disposition.

## 2. Bind WorkItem/solution Operator Decision to current execution evidence

A WorkItem/accepted-solution Criterion Decision must be current for the implementation being reviewed.

The typed command must derive in Product Core:

- exact Workflow;
- exact WorkItem;
- exact Criterion;
- latest successful ImplementationRecord;
- exact current completed TesterResult;
- exact current source candidate when source-backed.

Persist typed provenance from the Decision to the current execution evidence using reviewed SPS relationships.

At minimum:

- Decision governs Criterion;
- Decision is derived from the current TesterResult;
- current TesterResult already anchors the ImplementationRecord and source candidate.

Completion must reject a Criterion Decision whose provenance does not match the current exact TesterResult.

Do not encode freshness IDs in rationale text.

## 3. Bind Phase Operator Decision to current aggregate evidence

Phase Criterion Decision must:

- govern the exact Phase Criterion;
- derive from the complete set of current member TesterResults required for the Phase;
- be stale if the current Phase member evidence set changes.

Source-backed current candidate must also remain current through the Phase validation projection.

Do not let one Phase Decision satisfy multiple Operator Criteria.

## 4. Visual human evidence must support real outcomes

Change WorkItem/solution and Phase visual actions to accept bounded:

- `pass`;
- `fail`;
- `inconclusive`.

Do not hard-code pass.

For WorkItem/solution visual evidence:

- persist normal `visual_human` Validation;
- Product Core derives current implementation/Tester/source;
- fail becomes canonical Repair evidence through the existing WorkItem Repair path;
- inconclusive remains unsatisfied and does not fabricate Repair unless the Operator explicitly requests a correction based on later failure evidence.

For Phase visual/deferred evidence:

- persist exact Phase-boundary visual Validation;
- fail remains visible for R02-03 Phase Repair routing;
- inconclusive remains unsatisfied.

## 5. Remove derived authority from renderer inputs

Renderer may provide:

- exact Workflow ID;
- exact WorkItem/Phase ID;
- exact Criterion ID;
- expected record versions as optimistic-concurrency tokens;
- visual outcome/summary;
- Operator disposition/rationale.

Renderer must not provide:

- ImplementationRecord ID;
- TesterResult ID;
- source revision;
- performer principal;
- completion eligibility.

Main/application derives them.

## 6. Correct solution-level false pass

Add explicit permanent proof that:

1. an accepted planning Decision governing the BoundedSolution does **not** satisfy a solution-owned `operator_decision` Criterion;
2. the Criterion remains pending until its own Decision is recorded.

This is a mandatory regression.

## 7. Correct multi-Criterion behavior

Prove two `operator_decision` Criteria on the same owner are independent.

Decision A cannot satisfy Criterion B.

A later correction to Criterion A must not alter Criterion B.

Use the existing Decision supersession/correction semantics rather than timestamp races between unrelated owner Decisions.

## 8. WorkItem Repair from rejected human evidence

Extend canonical WorkItem Repair failure evidence only as needed so a current human failure can re-enter execution.

Accepted failure evidence:

- failing `visual_human` Validation;
- current rejected Criterion-specific Operator Decision.

The Repair remains:

- same exact Workflow;
- same Phase when phased;
- linked to the affected parent WorkItem;
- derived from the exact human failure evidence.

Do not allow arbitrary Decision records to create Repairs.

## 9. Shared Workspace

For visual human Criteria:

- show pass/fail/inconclusive selector;
- bounded evidence summary;
- refresh exact projection after save;
- show Create Repair when current visual outcome is fail.

For Operator Criteria:

- show the exact Criterion's current Decision, not owner disposition;
- allow bounded approved/rejected correction through the typed Criterion command;
- show Repair action on rejected current WorkItem/solution Criterion when repairable;
- allow the Operator to supersede/correct a prior rejection.

No universal Operator approval gate.

## Permanent proof

At minimum prove:

1. solution planning acceptance does not satisfy solution Operator Criterion;
2. two Operator Criteria on one owner remain independent;
3. WorkItem Criterion Decision is stale after a new TesterResult;
4. Phase Criterion Decision is stale when aggregate member evidence changes;
5. renderer cannot author principal/source/implementation identity;
6. WorkItem visual pass satisfies;
7. WorkItem visual fail remains failed and can create Repair;
8. WorkItem visual inconclusive remains unsatisfied;
9. Phase visual fail/inconclusive are persisted truthfully;
10. agent principal cannot create visual human Validation;
11. rejected unrelated Decision cannot create Repair;
12. corrected Criterion Decision supersedes only that Criterion's prior disposition.

## Non-scope

Do not change:

- Architect WorkItem planning from R02-01;
- aggregate Phase deterministic/semantic validation;
- Phase Repair mechanics;
- runtime interaction/concurrency UI;
- integration.

## Validation

Run:

- build;
- Project State Decision disposition/freshness tests;
- WorkItem completion tests;
- exact human action application/IPC tests;
- renderer human-policy tests;
- Repair failure-evidence tests;
- accepted-solution Criterion regression;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair02/Reports/WRB04-R02-02_IMPLEMENTER_REPORT.md`

Commit:

`WRB04-R02-02 correct human Criterion authority`

Then read WRB04-R02-03 only.
