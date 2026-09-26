# WRB04-03 — Implement Tester/Determination, Validator, Repair Loop, and Typed Work Item Completion

**Depends on:** WRB04-02 checkpoint  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Complete the shared WorkItem loop after Implementer output:

Implementer checkpoint
→ Tester regression-design judgment
→ exact candidate revision
→ independent Validator
→ Repair when required
→ deterministic WorkItem close.

This card implements the adopted Tester architecture for bounded WorkItem execution.

## 1. Regression-design result

Define a bounded durable/runtime contract for the Tester's result.

Required outcomes equivalent to:
- reuse permanent proof;
- add/extend permanent proof;
- rewrite/consolidate/migrate/retire/quarantine candidate;
- `NO_PERMANENT_TEST_REQUIRED`;
- production defect found.

Record exact:
- workflowId/workItemId;
- Implementer source revision;
- affected capabilities/behaviors;
- determination evidence;
- permanent files/catalog entries changed, if any;
- resulting candidate revision;
- rationale.

Tester result is not Operator approval.

## 2. Bounded Determination Engine

Implement deterministic repository analysis sufficient for the current WorkItem.

Use existing ValidationCatalog/capability map/test metadata where available.

Inputs should include:
- WorkItem/Criteria;
- changed paths;
- capability/behavior ownership;
- selected permanent proof;
- known duration/lane/resource metadata when available;
- RegressionObligations/permanent test references;
- prior lifecycle assessments.

Output typed TestLifecycleAssessment evidence and an actionable Tester context.

Do not auto-delete tests from a score.

Do not perform a repository-wide lifecycle audit for every WorkItem.

## 3. Tester runtime

Create a distinct Tester execution role/workspace.

Tester receives exact Implementer revision and may edit only test-owned surfaces:
- permanent tests;
- test fixtures/support;
- validation catalog/capability metadata;
- test-only runner/config required by proof.

Tester must not modify production behavior.

If permanent proof changes:
- checkpoint a test-only revision descending from Implementer revision;
- Validator uses this exact resulting revision.

If no permanent test change is required:
- candidate revision remains Implementer revision.

If Tester finds a production defect:
- record Finding/Evidence as appropriate;
- return to a canonical Repair WorkItem;
- do not repair production code as Tester.

## 4. Validator

Create one independent shared Validator path keyed by exact Workflow/WorkItem.

Validator consumes:
- exact final candidate revision;
- WorkItem Criteria and validationPolicy;
- ImplementationRecord;
- Tester result;
- deterministic validation planner/runner receipts;
- visual/operator evidence only when Criterion policy requires it.

Record canonical Validation records targeting exact entity versions and source revision.

`semantic_ai` review performer must be independent from the implementation attempt principal.

Do not rerun Tester suite-design judgment inside Validator.

## 5. Canonical Repair loop

On failed/inconclusive completion-relevant validation or Tester production defect:
- create one canonical Repair/Fix WorkItem under the same exact Workflow;
- link `repairs` to the affected WorkItem;
- define bounded repair Criteria;
- inherit only relevant source/context;
- re-enter the same shared WorkItem planning → Implementer → Tester → Validator loop.

Nested Repairs use the same mechanism.

No special Repair document engine may become canonical authority.

## 6. Typed WorkItem completion

When all required completion conditions are satisfied, call typed SPS `completeWorkItem`.

Do not add a universal Operator gate.

Completion must respect:
- current implemented attempt;
- Criteria validations;
- independent semantic review;
- dependencies;
- open child/repair WorkItems;
- blocking Decisions/records;
- source baseline freshness where required.

Update shared execution projection immediately after close and select next eligible WorkItem(s).

## 7. Permanent proof

Prove:
- Tester is distinct from Implementer;
- Determination is bounded to affected capability/work;
- `NO_PERMANENT_TEST_REQUIRED` is successful;
- implementation-local proof is not cataloged permanently by default;
- Tester cannot write production surfaces;
- test-only changes create a distinct exact revision;
- Validator uses exact post-Tester revision;
- semantic Validator is independent from Implementer;
- failed validation creates same-Workflow Repair;
- Repair re-enters same kernel;
- parent cannot close while Repair open;
- parent closes after repaired current validations satisfy criteria;
- no Operator disposition is required absent declared policy;
- visual/operator criteria still require human evidence exactly where declared.

## Non-scope

Phase/Workflow completion, integration candidate/common-directory repair, Integration Repair, and final shared UI convergence are later cards.

## Validation

Run build; Determination/Tester focused tests; validation planner/executor tests; Project State validation/repair/completion tests; source checkpoint tests for Tester test-only revision; shared kernel regression; capability map integrity; validation-plan preview; `git diff --check`.

Do not run a full permanent-suite lifecycle audit.

## Report/checkpoint

Write `docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-03_IMPLEMENTER_REPORT.md`.

Suggested commit: `WRB04-03 establish Tester Validator and Repair loop`.

Then proceed directly to WRB04-04.
