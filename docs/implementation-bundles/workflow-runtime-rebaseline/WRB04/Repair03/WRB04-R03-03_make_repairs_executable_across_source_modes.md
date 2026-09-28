# WRB04-R03-03 — Make Canonical Repairs Executable Across Source Modes

**Parent:** WRB04 Repair03  
**Depends on:** WRB04-R03-02 passing checkpoint/report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Make every application-generated canonical Repair WorkItem executable through the normal shared WorkItem runtime in both source-backed and source-neutral Workflows.

Current defect:

- source-neutral WorkItem deterministic Validator intentionally refuses to fabricate repository proof;
- internally generated Repair WorkItems can still receive deterministic Repair Criteria;
- current tests bypass the product Validator by writing deterministic Validation directly through Project State.

Repair must use the product execution/Tester/Validator path. Do not weaken source-neutral proof rules.

## 1. Separate Repair internal proof from the original failed Criterion

The generated Repair WorkItem has one bounded internal Criterion whose purpose is:

> prove that the specific corrective objective represented by this Repair WorkItem was completed.

The original parent/Phase Criterion remains unchanged and must be revalidated after the Repair closes.

Do not copy the original human/Operator/deferred policy onto the generated Repair Criterion.

Do not treat Repair completion as automatic proof that the original failed Criterion now passes.

## 2. Select an executable Repair Criterion policy from exact source mode

At typed WorkItem Repair and Phase Repair creation, derive the exact Workflow source mode from SPS.

For application-generated Repair WorkItems:

### source-backed Workflow

Use:

`validationPolicy = deterministic`

The Repair changed repository source and can use the normal current candidate + ValidationCatalog proof.

If the deterministic profile is incomplete/blocked, the Repair remains validation-pending; do not auto-pass.

### source-neutral Workflow

Use:

`validationPolicy = semantic_ai`

There is no repository-backed deterministic provider.

The normal independent semantic Validator must review the exact Repair objective, ImplementationRecord, TesterResult, and source-neutral context.

Do not fabricate Git/source Validation.

This policy selection belongs in the typed Repair command, not the renderer/model.

## 3. Apply the same rule to WorkItem and Phase Repairs

Update both:

- `createWorkflowRepair()`;
- `createPhaseRepair()`.

Accepted failure evidence remains unchanged and bounded:

WorkItem:
- current failing Validation;
- current rejected Criterion-specific Operator Decision;
- current exact production-defect TesterResult.

Phase:
- current failing Phase Validation;
- current rejected Phase Criterion Operator Decision.

Do not broaden arbitrary evidence admission.

## 4. Preserve original failure provenance

Generated Repair records must retain:

- exact Workflow ownership;
- same Phase membership where appropriate;
- accepted BoundedSolution implementation relationship;
- exact failure identity;
- `derived_from` provenance to the triggering evidence.

Repair internal Criterion also derives from the exact failure evidence.

Do not encode source mode or authority in objective text as the only evidence.

## 5. Product-path source-neutral WorkItem Repair proof

Exercise through normal services:

```text
parent WorkItem
→ Implementer
→ Tester production-defect-suspected OR rejected human Criterion
→ canonical Repair
→ Architect WorkItem plan
→ Repair Implementer
→ source-neutral Tester
→ semantic Validator
→ Repair complete
→ parent becomes ready / exact failure remains pending revalidation
```

Do not call `ProjectStateService.recordValidation` directly to manufacture the Repair pass.

## 6. Product-path source-neutral Phase Repair proof

Exercise:

```text
Phase members closed
→ current Phase Criterion failure
→ Phase Repair
→ Architect WorkItem plan
→ Repair Implementer
→ source-neutral Tester
→ semantic Validator
→ Repair WorkItem closes
→ prior Phase Validation remains stale
→ original Phase Criterion revalidated
→ Phase may close
```

Again, no direct injected deterministic Validation.

## 7. Product-path source-backed Repair regression

Retain/prove at least one source-backed generated Repair:

- Repair criterion is deterministic;
- exact changed paths remain inside accepted Repair WorkItem plan;
- implementation/Test checkpoint chain advances normally;
- deterministic Validator consumes exact Repair candidate;
- Repair closes;
- original failed Criterion requires fresh revalidation.

Do not create a separate Repair integration mechanism.

## 8. Repair failure and retry

If the Repair's own semantic/deterministic Criterion fails:

- it remains the current Repair WorkItem;
- normal Validator/Repair semantics may create a subordinate Repair only where the existing canonical WorkItem Repair command permits it;
- no direct generic completion mutation;
- no Operator auto-approval.

Keep this bounded; do not add a separate “Repair of Repair” engine.

## Permanent proof

At minimum prove:

1. source-neutral WorkItem Repair generated from Tester production defect gets `semantic_ai`;
2. source-neutral WorkItem Repair generated from rejected Operator Criterion gets `semantic_ai`;
3. source-neutral Phase Repair gets `semantic_ai`;
4. source-backed WorkItem Repair gets deterministic;
5. source-backed Phase Repair gets deterministic;
6. source-neutral Repair completes through `validateSemanticWorkItemCriterion`;
7. no source-neutral Repair proof contains SourceBinding/SourceCheckpoint/revision;
8. source-backed Repair completes through the normal deterministic Validator;
9. closing WorkItem Repair resumes its parent only after Repair eligibility passes;
10. closing Phase Repair leaves original Phase Criterion requiring fresh evidence;
11. direct Project State Validation injection is not required by any product-path Repair qualification.

## Non-scope

Do not change:

- WorkItem planning/scope recovery;
- cumulative source lineage semantics;
- human Criterion authority;
- Phase failure-evidence admission;
- integration.

## Validation

Run:

- build;
- WorkItem Repair typed-command tests;
- Phase Repair typed-command tests;
- source-neutral WorkItem Repair product vertical;
- source-neutral Phase Repair product vertical;
- source-backed Repair deterministic regression;
- semantic Validator exact-identity tests;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair03/Reports/WRB04-R03-03_IMPLEMENTER_REPORT.md`

Commit:

`WRB04-R03-03 make canonical Repairs source-mode executable`

Then immediately proceed to R03-04.
