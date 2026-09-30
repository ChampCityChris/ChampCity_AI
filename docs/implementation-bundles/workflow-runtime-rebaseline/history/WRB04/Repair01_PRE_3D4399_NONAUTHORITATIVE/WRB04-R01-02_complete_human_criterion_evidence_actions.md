# WRB04-R01-02 — Complete Human Criterion Evidence Actions

**Parent:** WRB04 Repair01  
**Depends on:** WRB04-R01-01 passing checkpoint/report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Complete the exact Current Project action path for human-reserved Criterion policies on WorkItem execution.

This card owns:

- `visual_human` evidence for WorkItem/accepted-solution Criteria;
- `operator_decision` evidence for WorkItem/accepted-solution Criteria;
- exact Criterion-level Operator disposition semantics;
- product controls/projection for those actions.

Phase validation is not implemented in this card. R01-03 reuses these human-evidence primitives at the Phase boundary.

## 1. Make Operator Criterion decisions exact to the Criterion

Current completion logic checks the effective disposition of the WorkItem or Phase when it encounters an `operator_decision` Criterion.

That makes the Decision owner-wide rather than Criterion-specific.

Repair the semantic boundary.

Add a typed command equivalent to:

`recordCriterionOperatorDecision(projectId, criterionId, input)`

Requirements:

- trusted principal must be human Operator;
- exact active Criterion required;
- Criterion policy must be `operator_decision`;
- Decision type is one stable exact value such as `criterion-operator-decision`;
- Decision governs the exact Criterion through `governs`;
- current disposition is resolved from the exact Criterion ID;
- prior Decision history remains immutable;
- a later current Decision may supersede/revise disposition using the existing Decision lineage semantics;
- no outcome is encoded in rationale text.

Update WorkItem and Phase completion policy so each `operator_decision` Criterion is satisfied only by its own current accepted/approved Criterion Decision.

Do not let one WorkItem-level or Phase-level Decision implicitly satisfy all Operator Criteria.

## 2. Add exact WorkItem/solution human visual Validation

Add one application action equivalent to:

`recordHumanWorkItemCriterionValidation(projectRoot, workflowId, workItemId, criterionId, input)`

Input may contain only bounded human evidence fields such as:

- outcome: `pass|fail|inconclusive`;
- summary.

The renderer must not provide:

- performer identity;
- target record version;
- source revision;
- implementation record ID;
- Workflow ownership.

Main/application derives all of those.

Preflight:

- exact current Feature/Issue Workflow;
- exact current WorkItem in that Workflow;
- current Criterion owned either by:
  - the WorkItem; or
  - its one accepted BoundedSolution;
- Criterion policy is exactly `visual_human`;
- WorkItem is in the validation stage with latest successful ImplementationRecord;
- exact completed TesterResult belongs to that implementation;
- source-backed candidate is exact/current, or source-neutral state is exact.

Persist through the normal typed `recordValidation` path:

- `validationMode = visual_human`;
- target Criterion/version;
- latest ImplementationRecord ID;
- current source revision when source-backed;
- human Operator performer.

Stale WorkItem/implementation/Tester/source/Criterion state must reject.

## 3. Add exact WorkItem/solution Operator Decision action

Add one application action equivalent to:

`recordWorkItemCriterionOperatorDecision(projectRoot, workflowId, workItemId, criterionId, input)`

Input:

- bounded outcome supported by existing disposition semantics;
- bounded rationale.

Preflight derives:

- exact Workflow;
- exact WorkItem;
- exact current Criterion;
- WorkItem or accepted-solution Criterion ownership;
- latest implementation/Tester/source context where needed for user presentation.

Persistence uses the typed Criterion Decision command from section 1.

Do not create a Validation for `operator_decision`.

The action does not become a generic WorkItem approval. It exists only because the Criterion explicitly declares Operator decision as its validation policy.

## 4. Projection

Extend the exact WorkItem validation projection so each Criterion can show the evidence type that actually satisfies it.

For `visual_human`:

- current Validation ID/outcome;
- human performer;
- stale/current status.

For `operator_decision`:

- current Decision ID;
- current disposition;
- rationale summary where safe.

The renderer must not infer satisfaction from label text.

Completion eligibility remains canonical SPS authority.

## 5. Shared Workspace UX

For a pending `visual_human` Criterion:

- show that human visual evidence is required;
- provide bounded pass/fail/inconclusive action and evidence summary input;
- save through the exact action;
- refresh exact projection.

For a pending `operator_decision` Criterion:

- show the Criterion statement and why a decision is required;
- provide bounded Operator disposition/rationale controls;
- save a real Decision;
- refresh exact projection.

Do not show these controls for deterministic or semantic AI Criteria.

Do not add a universal Operator acceptance step to every WorkItem.

## 6. Accepted-solution ownership

WorkItem/solution Criteria must use the same exact human action service.

Prove a solution-owned visual/Operator Criterion is tied to the exact WorkItem implementing that accepted solution and cannot be satisfied from a peer WorkItem or peer Workflow.

## 7. Freshness

For WorkItem/solution visual evidence:

- newer ImplementationRecord invalidates older implementation-bound Validation;
- newer source candidate invalidates source-backed Validation;
- Criterion revision invalidates older Validation.

For Operator Decision:

- Decision is exact to Criterion identity;
- superseded/voided Criterion cannot be newly decided;
- current Decision history remains auditable.

## Permanent proof

At minimum prove:

1. agent principal cannot create `visual_human` Validation;
2. human Operator can create exact current visual Validation through application API;
3. renderer cannot choose performer/source revision/implementation ID;
4. stale implementation/source/Criterion visual evidence rejects;
5. source-neutral visual evidence contains no fabricated source revision;
6. accepted-solution visual Criterion works for its exact implementing WorkItem;
7. peer Workflow/WorkItem Criterion rejects;
8. `operator_decision` cannot be satisfied by Validation;
9. exact Criterion Decision satisfies only that Criterion;
10. two Operator Criteria on one WorkItem require two Criterion dispositions;
11. later Decision history changes only the intended Criterion disposition;
12. WorkItem completion becomes eligible only after all required exact human policies are satisfied;
13. shared Workspace exposes the correct human control only for the declared policy.

## Non-scope

Do not implement:

- Phase deterministic/semantic validation;
- deferred visual Phase handling;
- Implementer/Tester pending interaction controls;
- WorkItem decomposition;
- integration changes.

## Validation

Run:

- build;
- Project State Decision/Validation freshness tests;
- WorkItem completion eligibility tests;
- exact Workflow application/IPC tests;
- shared renderer human-policy tests;
- accepted-solution ownership regression;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair01/Reports/WRB04-R01-02_IMPLEMENTER_REPORT.md`

Commit:

`WRB04-R01-02 complete human Criterion actions`

Then read WRB04-R01-03 only.
