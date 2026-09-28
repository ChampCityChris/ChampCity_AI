# WRB04-04 — Validate, Repair, and Complete Exact WorkItems and Phases

**Status:** IN PROGRESS — continue the existing uncommitted implementation. Do not restart this card.  
**Depends on:** accepted WRB04-03R checkpoint `ff4c4a35a3d8b7196745e98062ad5ed0427b3355`  
**Repository baseline before this card:** `78bdfa7b6c373d318e73428e2d7d28152ba46271`  
**Implementer:** GPT 6.0 Luna Medium  
**Execution rule:** ONE card, ONE final report, ONE commit. Do not split this card.

## Current continuation instruction

A partial WRB04-04 implementation already exists in the working tree. Preserve it.

The partial progress note is:

`Reports/WRB04-04_PROGRESS_2026-09-27.md`

That file is not a completion report.

Architect review of the partial implementation found three required corrections that are now part of this card:

1. **Exact Phase eligibility/completion**
   - Current Project Phase completion must not depend on the transitional project-wide `getExecutionPlan(projectId)`.
   - Make the WRB04 exact path derive Phase membership/Criteria from the selected exact Workflow, using `getWorkflowExecutionPlan(projectId, workflowId)` or an equivalent exact typed command.
   - Concurrent peer Workflow Phases/WorkItems must be incapable of affecting this Phase's eligibility.

2. **Complete Criterion projection**
   - Validator/projection must include every completion-relevant current Criterion owned by the exact WorkItem **and its accepted BoundedSolution**.
   - Phase-owned Criteria remain Phase-boundary concerns.
   - The validation projection must not disagree with canonical completion eligibility by omitting solution Criteria.

3. **Correct actor attribution**
   - Exact Implementer attempts must persist the actual Implementer agent principal, not `local-operator`.
   - Validator independence must be provable from persisted Implementer and Tester principals.
   - Mechanical application-owned completion may use an explicit system/application principal.
   - Do not impersonate the human Operator for routine Implementer, Validator, checkpoint, or mechanical completion records.
   - Operator principal remains reserved for actual Operator decisions/actions.

Do not create another repair/clarification card for these corrections. Fix them inside this card.

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
- current WorkItem and accepted BoundedSolution Criteria and their exact record versions;
- applicable existing validation evidence.

Reject cross-Workflow, stale, duplicate, incomplete, or mismatched evidence.

## 2. Validator independence

Validator is a distinct principal/role.

For semantic review:
- Validator principal must differ from the persisted Implementer principal;
- Validator principal must differ from the persisted Tester principal;
- use the existing bounded App Server adapter/session mechanics;
- no production mutation;
- network disabled unless an existing declared validation capability specifically requires otherwise;
- no Git mutation authority.

Do not reuse TesterResult as Validator approval.

## 3. Criterion policy execution

Evaluate each current completion-relevant Criterion governed by the WorkItem and accepted BoundedSolution.

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
- every completion-relevant WorkItem/solution Criterion;
- owner identity;
- policy;
- current outcome;
- evidence/Validation IDs;
- pending/deferred reason;
- whether failure is repairable;
- whether human evidence is still required;
- whether WorkItem completion eligibility is satisfied.

Do not create a new generic approval entity.

The projection is explanatory/read-model state. Canonical completion authority remains typed SPS completion eligibility.

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

Routine mechanical completion is application/system action, not an Operator-authored decision.

## 9. Phase completion

For phased plans:
- derive Phase membership and Criteria from the exact selected Workflow;
- close a Phase only after all exact current member WorkItems are closed;
- all required non-deferred Phase Criteria are satisfied;
- deferred visual Phase Criteria have required human evidence;
- dependencies/Repairs/blockers are resolved.

Use typed exact-Workflow Phase completion.

Do not use the transitional project-wide execution-plan query for WRB04 Current Project completion.

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
3. persisted ImplementationRecord actor is the actual Implementer principal.
4. Validator principal is distinct from persisted Implementer and Tester principals.
5. source-backed Validator uses the post-Tester candidate revision.
6. source-neutral Validator completes without fake Git identity.
7. deterministic pass requires applicable exact proof.
8. visual/operator policies cannot be auto-passed.
9. deferred visual policy remains for Phase boundary.
10. WorkItem and accepted-solution Criteria both appear in exact Validator/completion projection.
11. failed required Criterion creates one same-Workflow canonical Repair.
12. Tester production-defect result creates/routes one Repair.
13. duplicate unresolved Repair creation rejects.
14. Repair re-enters the exact shared Implementer/Tester/Validator runtime.
15. parent completion rejects while Repair is open.
16. Repair completion permits parent reevaluation.
17. WorkItem closes only through typed completion eligibility.
18. next eligible WorkItem updates after close.
19. direct topology has no artificial Phase gate.
20. phased topology closes only the exact owning Workflow Phase when eligible.
21. a peer Workflow Phase/WorkItem cannot affect Phase completion.
22. no Current Project path invokes legacy Repair Work Card or Issue Fix Card authority.
23. routine completion records do not impersonate the Operator.

## Validation

Run:
- build;
- focused Validator tests;
- Project State Validation/completion tests;
- exact Repair/shared-runtime tests;
- Tester no-regression tests;
- validation catalog/profile tests touched by Validator execution;
- Workflow execution projection tests;
- concurrent Workflow Phase-isolation proof;
- principal-attribution/independence proof;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

Do not run the historical full work-item profile as a card-completion gate.

## Final report

When every requirement is complete, write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-04_IMPLEMENTER_REPORT.md`

Do not rename the progress note back into the final report. Create the final report only when the card is actually complete.

The final report must identify:
- Validator service/runtime;
- actor attribution and Validator independence;
- deterministic vs semantic vs human policy behavior;
- exact source-backed/source-neutral evidence;
- WorkItem + solution Criterion coverage;
- Repair creation/re-entry;
- exact WorkItem/Phase completion;
- peer-Workflow Phase isolation;
- focused validation evidence;
- confirmation Workflow completion/integration/UI were not started.

## Checkpoint

Commit only when complete:

`WRB04-04 complete shared validation and Repair loop`

Then proceed directly to WRB04-05 unless a genuine architecture contradiction prevents this card from completing.
