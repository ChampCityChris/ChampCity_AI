# WRB04-04 — Validate, Repair, and Complete Exact WorkItems and Phases

**Depends on:** accepted WRB04-03R checkpoint `ff4c4a35a3d8b7196745e98062ad5ed0427b3355`  
**Implementer:** GPT 6.0 Luna Medium  
**Execution rule:** ONE card, ONE report, ONE commit. Do not split this card.

## Objective

Complete the shared per-WorkItem execution loop after Tester:

```text
validation_pending
→ exact TesterResult
→ independent Validator
→ canonical Repair when required
→ same shared Implementer/Tester/Validator loop
→ complete WorkItem
→ complete Phase when eligible
```

Feature and Issue use the same path.

This card does not complete the Workflow or perform integration.

## 1. Exact Validator application boundary

Create one Validator service keyed by:
- Current Project root;
- exact workflowId;
- exact workItemId.

The caller may supply model/reasoning selection only where a semantic Validator session is required.

The service derives all authority from SPS/runtime evidence:
- exact current Workflow;
- active `validation_pending` WorkItem;
- latest successful ImplementationRecord;
- exact TesterResult for that ImplementationRecord;
- final candidate source identity when source-backed;
- source-neutral attempt identity when not source-backed;
- current WorkItem/solution Criteria and their exact record versions;
- applicable existing validation evidence.

Reject cross-Workflow, stale, duplicate, incomplete, or mismatched evidence.

## 2. Validator independence

Validator is a distinct principal/role.

For semantic review:
- Validator principal must differ from Implementer and Tester principals;
- use the existing bounded App Server adapter/session mechanics;
- no production mutation;
- network disabled unless an existing declared validation capability specifically requires otherwise;
- no Git mutation authority.

Do not reuse TesterResult as Validator approval.

## 3. Criterion policy execution

Evaluate each current Criterion governed by the WorkItem and accepted BoundedSolution.

### deterministic

Use repository-owned ValidationCatalog/validation-profile machinery applicable to the exact affected behavior.

Do not invent a second test runner.

For source-backed work, deterministic validation runs against the exact post-Tester candidate revision/current Workflow checkout.

For source-neutral work, deterministic proof may use only source-neutral-capable evidence. Do not fabricate a source revision.

A deterministic pass requires successful applicable proof.

### semantic_ai

Run an independent Validator semantic review against:
- exact WorkItem/solution Criterion;
- implementation evidence;
- TesterResult;
- applicable deterministic receipts;
- exact candidate source context when source-backed.

Persist typed Validation with `validationMode = semantic_ai`.

### visual_human

Do not auto-pass. Return explicit pending-human/deferred state and surface the Criterion for Operator evidence.

### deferred_visual_phase

Do not block WorkItem completion solely at the WorkItem boundary if the existing completion policy explicitly defers it to Phase close. Preserve it for Phase validation.

### operator_decision

Do not synthesize approval. Require the existing explicit Operator Decision/evidence contract.

## 4. Typed Validation authority

Use existing `recordValidation` and its policy guards where sufficient.

Validation records must target:
- exact Criterion/target record version;
- exact source baseline/candidate revision when source-backed;
- exact performer;
- method;
- mode;
- pass/fail/blocked/inconclusive;
- bounded evidence summary.

Prior Validation remains immutable history.

A stale prior Validation cannot satisfy a newer target version or newer candidate revision.

## 5. Validator result projection

Expose one bounded exact WorkItem validation projection containing:
- Criterion;
- policy;
- current outcome;
- evidence/Validation IDs;
- pending/deferred reason;
- whether failure is repairable;
- whether human evidence is still required;
- whether WorkItem completion eligibility is satisfied.

Do not create a new generic “approval” entity.

## 6. Canonical Repair creation

When:
- Validator returns a production defect/failing completion-relevant Criterion; or
- TesterResult recommendation is `production-defect-suspected`;

create a canonical Repair/Fix WorkItem in the same exact Workflow.

Use one typed atomic Project State command.

Required Repair semantics:
- exact current Workflow owner;
- `repairs` link to affected WorkItem;
- same owning Phase when the parent is phased unless evidence requires an explicit Phase-level repair;
- WorkItem kind `repair` or `fix` valid for Workflow family;
- bounded objective derived from concrete failed Criterion/Finding/Validation evidence;
- explicit Repair Criteria;
- accepted BoundedSolution link;
- no WorkIntake/Issue Fix Card/Markdown identity.

Prevent duplicate simultaneous Repair records for the same unresolved failure identity.

## 7. Repair re-entry

Repair WorkItems execute through the same exact shared runtime:

```text
Repair WorkItem
→ exact execution contract
→ Implementer
→ Tester
→ Validator
→ complete Repair
```

No private Repair runtime.

A parent WorkItem cannot complete while an active Repair remains.

If repaired source changes, normal exact Workflow checkpoints advance the same SourceBinding.

## 8. WorkItem completion

After required current Criteria are satisfied and no active Repair/child/dependency/blocker remains, call typed `completeWorkItem`.

Do not add an Operator gate.

Required:
- WorkItem remains active until typed completion;
- successful completion changes it to the canonical closed state;
- prior implementation/Test/Validation/Repair evidence remains historical;
- next eligible WorkItems recompute immediately from exact Workflow SPS.

## 9. Phase completion

For phased plans:
- close a Phase only after all current member WorkItems are closed;
- all required non-deferred Phase Criteria are satisfied;
- deferred visual Phase Criteria have required human evidence;
- dependencies/Repairs/blockers are resolved.

Use typed `completePhase`.

No Phase exists for direct topology merely to create a gate.

Do not complete the overall Workflow in this card.

## 10. Product-path API

Add bounded main/preload APIs required for the exact Validator/Repair/complete actions.

Inputs contain exact IDs and model selection where needed.

Renderer cannot provide:
- Validation outcome;
- source revision;
- filesystem path;
- principal identity;
- Repair ownership;
- completion eligibility.

The main-process service derives those.

Full UI composition waits for WRB04-06.

## 11. Required proof

Prove at minimum:

1. Feature and Issue use the same Validator service.
2. Validator binds the latest ImplementationRecord and exact TesterResult.
3. Source-backed Validator uses the post-Tester candidate revision.
4. Source-neutral Validator completes without fake Git identity.
5. deterministic pass requires applicable exact proof.
6. semantic Validator principal is distinct from Implementer and Tester.
7. visual/operator policies cannot be auto-passed.
8. deferred visual policy remains for Phase boundary.
9. failed required Criterion creates one same-Workflow canonical Repair.
10. Tester production-defect result creates/routes one Repair.
11. duplicate unresolved Repair creation rejects.
12. Repair re-enters the exact shared Implementer/Tester/Validator runtime.
13. parent completion rejects while Repair is open.
14. Repair completion permits parent reevaluation.
15. WorkItem closes only through typed completion eligibility.
16. next eligible WorkItem updates after close.
17. direct topology has no artificial Phase gate.
18. phased topology closes exact Phase only when eligible.
19. no Current Project path invokes legacy Repair Work Card or Issue Fix Card authority.

## Validation

Run:
- build;
- focused Validator tests;
- Project State Validation/completion tests;
- exact Repair/shared-runtime tests;
- Tester no-regression tests;
- validation catalog/profile tests touched by Validator execution;
- Workflow execution projection tests;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

Do not run the historical full work-item profile as a card-completion gate.

## Report

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-04_IMPLEMENTER_REPORT.md`

The report must identify:
- Validator service/runtime;
- deterministic vs semantic vs human policy behavior;
- exact source-backed/source-neutral evidence;
- Repair creation/re-entry;
- WorkItem/Phase completion;
- focused validation evidence;
- confirmation Workflow completion/integration/UI were not started.

## Checkpoint

Commit:

`WRB04-04 complete shared validation and Repair loop`

Then proceed directly to WRB04-05 unless a genuine architecture contradiction prevents this card from completing.
