# WRB04-R01-03 — Complete Exact Phase Validation and Close

**Parent:** WRB04 Repair01  
**Depends on:** WRB04-R01-02 passing checkpoint/report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Make a phased exact Feature/Issue Workflow fully executable through the shared Current Project path.

The required boundary is:

```text
all Phase WorkItems closed
→ Phase Criteria projection
→ deterministic / semantic / human / Operator evidence
→ canonical Phase eligibility
→ typed Phase close
→ next Phase eligibility
```

Do not create a second Phase engine.

## 1. Enforce deferred-visual ownership

`deferred_visual_phase` is a Phase-boundary policy.

Enforce going forward that it may be owned only by a real Phase Criterion.

At minimum enforce this in:

- canonical Workflow planning graph acceptance;
- typed WorkItem decomposition split/elevation creation;
- any other typed command that creates a Criterion under WorkItem/solution ownership.

Reject:

- direct WorkItem `deferred_visual_phase`;
- accepted-solution `deferred_visual_phase`;
- direct topology with a deferred Phase policy but no Phase.

Do not rewrite historical records automatically.

If old invalid current state is encountered, surface a bounded invalid-policy blocker rather than silently treating it as satisfied.

## 2. Add exact Phase validation projection

Add one application projection equivalent to:

`getPhaseValidationProjection(projectRoot, workflowId, phaseId)`

It must derive:

- exact current Feature/Issue Workflow;
- exact current Phase owned by that Workflow;
- Phase record/version/state;
- exact member WorkItems;
- current Phase Criteria;
- current source mode/revision;
- current Validation/Decision evidence;
- canonical `getPhaseCompletionEligibility` result;
- previous/next Phase context as needed for UI.

Every Criterion entry identifies:

- Criterion ID/version;
- policy;
- current outcome/disposition;
- evidence IDs;
- reason/blocker;
- human evidence requirement.

Do not use Project-wide phase membership for this Current Project path.

## 3. Deterministic Phase validation

Add an exact application action equivalent to:

`validateDeterministicPhaseCriterion(projectRoot, workflowId, phaseId, criterionId)`

Preflight:

- exact current Workflow/Phase;
- all current member WorkItems closed;
- exact active required deterministic Phase Criterion;
- no stale source/evidence identity.

Reuse the existing ValidationCatalog/planner/runner machinery.

Do not create a second runner.

For source-backed Workflow:

- derive the exact current Workflow candidate revision;
- derive bounded affected paths/capabilities from the completed Phase's WorkItem execution plans, TesterResults, and current ValidationCatalog ownership;
- run only the applicable target-owned proof;
- persist Validation against the exact Phase Criterion/version and current source revision.

For source-neutral Workflow:

- only source-neutral-capable deterministic evidence may satisfy the Criterion;
- otherwise remain explicitly blocked/pending;
- do not fabricate Git identity.

## 4. Semantic Phase validation

Add an independent read-only semantic Phase Validator.

Input context is bounded to:

- exact Workflow/Phase;
- Phase objective;
- exact Phase Criterion;
- accepted BoundedSolution;
- completed member WorkItems;
- their latest ImplementationRecords;
- TesterResults;
- current deterministic receipts;
- source mode/current source revision.

Runtime:

- Validator agent principal;
- read-only;
- network disabled unless an existing declared validation capability explicitly requires otherwise;
- no production write roots;
- no Git mutation.

Persist through typed `recordValidation`:

- `validationMode = semantic_ai`;
- exact Criterion version;
- current source revision when source-backed;
- independent performer.

Do not reuse an Implementer or Tester principal.

## 5. Human and Operator Phase evidence

Reuse the Criterion-level semantics established by R01-02.

For Phase `visual_human` and `deferred_visual_phase`:

- exact Phase Criterion;
- human Operator Validation;
- `validationMode = visual_human`;
- bounded summary/outcome;
- current source revision when source-backed.

For Phase `operator_decision`:

- exact Criterion Decision;
- no substitute Validation;
- bounded Operator rationale;
- Criterion-specific current disposition.

Do not add an aggregate Phase approval gate beyond declared Criteria.

## 6. Shared Workspace Phase section

When the selected/current WorkItem belongs to a Phase, or when all Phase WorkItems are closed, show a dedicated Phase validation section.

Display:

- Phase title/objective/state;
- member WorkItems;
- every required Phase Criterion;
- current evidence/outcome;
- available policy-specific action;
- canonical Phase completion blockers.

The **Complete Phase** action must be disabled until the canonical Phase completion projection is eligible.

Do not show a misleading enabled button merely because member WorkItems are closed.

After close:

- refresh exact Workflow projection;
- next Phase WorkItems become eligible according to the existing execution kernel.

Direct topology shows no fake Phase section.

## 7. Restart/reopen at Phase boundary

Close/reopen after:

- all member WorkItems closed but Phase validation pending;
- deterministic/semantic Phase proof saved;
- human/deferred evidence saved;
- Operator Criterion Decision saved;
- Phase closed.

All state must recover from SPS/source evidence.

No renderer-only Phase validation state.

## Permanent proof

At minimum prove:

1. `deferred_visual_phase` rejects on WorkItem/solution planning;
2. valid Phase deferred visual policy remains accepted;
3. exact Phase projection excludes peer Workflow Phase/Criteria;
4. deterministic Phase validation uses exact current source revision;
5. source-neutral deterministic Phase Criterion does not fabricate source proof;
6. semantic Phase Validator is independent/read-only;
7. human Phase visual/deferred evidence uses human Operator principal;
8. Phase Operator Decision is exact to its Criterion;
9. stale Criterion/source evidence rejects;
10. Complete Phase disabled while required Criterion pending;
11. Complete Phase succeeds after all declared required policies are satisfied;
12. next Phase eligibility updates;
13. direct topology has no Phase gate;
14. SQLite reopen preserves pending/evidence/closed Phase state.

## Non-scope

Do not change:

- WorkItem Architect planning/decomposition from R01-01;
- WorkItem human semantics from R01-02 except shared helpers;
- Implementer/Tester pending interaction controls;
- integration;
- Workflow-family front halves.

## Validation

Run:

- build;
- Workflow planning policy validation tests;
- Project State Phase completion/freshness tests;
- exact Phase application/IPC tests;
- deterministic/semantic Phase Validator tests;
- renderer Phase validation/action tests;
- peer-Workflow isolation proof;
- reopen proof;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair01/Reports/WRB04-R01-03_IMPLEMENTER_REPORT.md`

Commit:

`WRB04-R01-03 complete exact Phase validation`

Then read WRB04-R01-04 only.
