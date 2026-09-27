# WRB04 Architect Baseline — Shared Execution Kernel and Workspaces

**Date:** 2026-09-26  
**Starting checkpoint:** `495c9aca43bd6c90be4abfece01ed9e40fd4c82e`  
**Parent re-baseline:** `docs/implementation-bundles/workflow-runtime-rebaseline/REBASELINE_2026-09-24.md`

## Bundle purpose

WRB04 begins at the accepted WRB03 canonical Work Item Map and implements one post-plan execution runtime for Feature/Capability and Issue Resolution.

Workflow type remains useful context, but it no longer selects a private execution engine.

The reusable lifecycle is:

```text
Work Item Map
→ Work Item planning/decomposition
→ Implementer
→ source checkpoint when source changed
→ Tester regression-design determination
→ Validator / Criterion validation
→ Repair when required
→ Work Item close / next
→ optional Phase validation / close
→ Workflow completion
→ integration candidate
→ Integration Repair when required
→ final Dev integration
```

Feature and Issue must use the same post-plan contracts, application service, source lifecycle, completion semantics, and reusable Workspace family.

## 1. Governing identity and authority

- Project ID identifies the Project.
- exact Workflow ID identifies the execution owner.
- exact canonical WorkItem ID identifies the unit of execution.
- exact canonical Phase ID identifies a milestone when present.
- SourceBaseline/SourceBinding belong to the Workflow.
- WorkIntake ID and route Decision ID are never execution identity.
- Issue display aliases/Fix Card aliases are never execution identity.
- Markdown Work Card/Implementer Report documents may be handoff/evidence projections, not canonical work state.
- Structured Project State remains execution authority.

WRB04 must use `getWorkflowExecutionPlan(projectId, workflowId)`. New Current Project execution code must not use the transitional Project-wide `getExecutionPlan(projectId)`.

## 2. Shared execution state

The shared execution application must derive one exact Workflow execution projection from SPS:

- Workflow;
- BoundedSolution;
- Phase topology;
- WorkItems;
- dependencies;
- Criteria and validation policy;
- implementation attempts;
- current validations;
- Repairs/Fixes;
- completion eligibility;
- SourceBaseline/SourceBinding/checkpoints;
- Tester regression obligations/results where applicable;
- IntegrationRecord when integration begins.

The read model must expose the next eligible WorkItem(s) deterministically.

Eligibility is dependency/phase/state based, not a human approval queue.

Concurrent Workflows remain independent.

## 3. Lazy source materialization at the mutation boundary

Planning does not materialize source.

Before the first source-mutating WorkItem execution in a source-backed Workflow, the shared kernel calls the existing exact-Workflow lazy materialization service.

Required:
- exact immutable SourceBaseline remains unchanged;
- work source is `workflow/<workflow-id>`;
- exact RepositoryCheckout is registered;
- SourceBinding becomes ready;
- repeated execution/reopen reuses the exact ready binding;
- no WorkIntake owns source;
- checkout capacity may block execution but never retroactively invalidates Workflow admission/planning.

A non-source Workflow remains valid. A WorkItem that can be satisfied without repository mutation may execute without fabricated Git state. A source-mutating action in a non-source Project must fail with a bounded source-capability result, not create a fake Repository.

## 4. Work Item planning and Work Card projection

The accepted WRB03 WorkItem already owns objective, dependencies, and Criteria.

Work Card planning is a bounded execution-contract elaboration for one exact WorkItem, not a second Plan engine.

The Architect may:
- clarify implementation boundaries;
- identify affected files/services/contracts and focused proof intent;
- decompose an oversized **pre-execution** WorkItem into bounded replacement WorkItems when evidence requires it;
- surface a material scope/architecture conflict to the Operator.

### Decomposition semantics

WorkItem decomposition is **not** `supersedes`.

`supersedes` retains its one-current-record-per-lineage semantic versioning contract.

Accepted decomposition uses immutable:

```text
original WorkItem -> decomposed_into -> replacement WorkItem[]
```

The original becomes non-executable historical state with `lifecycleState = voided` and `workState = cancelled`. Each replacement receives a new lineage, remains owned by the same exact Workflow/Phase, and implements the accepted BoundedSolution.

Decomposition is allowed only before implementation/validation/checkpoint/Repair evidence exists for the source WorkItem.

Criteria must be explicitly transferred, elevated to an existing aggregate owner, or split into explicit replacement Criteria. Dependencies touching the source must be explicitly remapped. The complete resulting graph is preflighted and committed atomically.

Do not turn the source into a generic container WorkItem and do not expand one lineage into multiple current successors.

See `WRB04-02B_ARCHITECT_CLARIFICATION_2026-09-26.md`.

Any accepted decomposition must be canonical SPS:
- exact WorkItem ownership retained through replacement records;
- dependencies/membership updated through typed commands;
- no cross-Workflow records;
- accepted plan intent and every required Criterion obligation preserved;
- no Markdown-only candidate becomes execution authority.

Human-readable Work Cards may remain generated handoff artifacts.

## 5. Implementer

The Implementer executes one exact eligible WorkItem/Repair against its exact source context.

Use the existing Codex/App Server execution adapter where reusable, but re-key it on exact Workflow/WorkItem contracts instead of legacy WorkIntake/Phase/WorkCard Markdown identity.

Implementer responsibilities:
- production implementation inside bounded scope;
- implementation-local proof as useful;
- Implementer Report;
- explicit summary/deviations/blockers/residual risk;
- no permanent-test retention judgment;
- no target-branch integration.

On successful source-backed implementation:
- record canonical ImplementationRecord;
- create the machine-owned implementation source checkpoint;
- advance SourceBinding current revision exactly.

The source checkpoint is machine mechanics, not an Operator approval gate.

## 6. Tester and Test Lifecycle Determination

WRB04 implements the adopted Tester architecture in the normal shared WorkItem loop.

The Tester is a distinct post-Implementer engineering role.

Before Tester judgment, a bounded Determination Engine produces evidence from the affected validation/catalog surface. For the current WorkItem it should consider, where available:
- capability/behavior ownership;
- changed paths;
- existing permanent proof;
- validation lane/resource metadata;
- measured duration;
- existing RegressionObligations/permanent-test references;
- deterministic production reachability evidence;
- prior lifecycle assessments.

It emits typed assessment evidence; it does not autonomously delete/retire tests.

Tester outcomes include:
- reuse existing durable proof;
- add/extend durable regression proof;
- rewrite/consolidate/migrate/retire/quarantine candidate;
- `NO_PERMANENT_TEST_REQUIRED`;
- production defect found → return to Repair.

Implementer-local tests do not enter the permanent corpus automatically.

When Tester modifies permanent test/catalog surfaces:
- mutation is restricted to test-owned surfaces;
- it starts from the exact Implementer checkpoint revision;
- a test-only source checkpoint produces the exact candidate revision for Validator;
- production source changes by Tester are prohibited.

Full periodic repository-wide lifecycle review is not required for every WorkItem. WRB04 implements the bounded WorkItem-triggered path. Broader release/maintenance lifecycle review may remain later work.

## 7. Validator and completion

Validator is independent from Implementer and Tester.

Validator consumes:
- exact post-Tester source revision;
- WorkItem Criteria/policies;
- Implementer semantic result;
- Tester regression-design result;
- deterministic validation-plan/execution receipts;
- other Evidence required by Criteria.

Validation records target exact record versions/source revisions.

Completion follows existing SPS policy:
- deterministic Criteria close mechanically when proven;
- `semantic_ai` requires independent semantic review;
- visual/human Criteria request the Operator only where declared;
- `operator_decision` remains explicitly human-reserved;
- no universal Operator approval gate.

Failed validation creates/activates a canonical Repair/Fix WorkItem owned by the same exact Workflow and linked to the affected WorkItem. Repair re-enters the same shared Implementer → Tester → Validator loop.

Repairs do not create a separate execution architecture.

## 8. Phase and Workflow completion

Use typed SPS completion semantics.

Phase close requires:
- member WorkItems closed;
- dependencies/Repairs resolved;
- Phase Criteria satisfied;
- no blocking Decision/Finding state.

The Workflow becomes execution-complete when:
- every planned WorkItem/Phase is closed;
- no active Repair remains;
- all required Workflow/solution Criteria applicable to completion are satisfied;
- source checkpoint chain is current when source-backed.

Add a typed Workflow completion command/read model if absent. Do not close the Workflow by generic record mutation.

Workflow execution completion precedes integration. Final Workflow lifecycle closure occurs only after successful integration for source-backed implementation Workflows, or after execution completion for valid non-source/source-neutral Workflows.

## 9. Integration — exact Workflow, not Work Intake

The existing structured integration service remains WorkIntake-keyed and must not become the WRB04 Current Project integration authority.

Create/refactor an exact-Workflow integration service whose input is Project root + exact Workflow ID.

It must derive:
- exact Workflow SourceBaseline/SourceBinding;
- exact current incoming revision from the committed source checkpoint chain;
- target source line `dev`;
- Workflow completion state;
- exact validation evidence.

WIR-routed and direct Workflow instances use the same integration service. WIR history is provenance only.

## 10. Mandatory linked-worktree integration repair

Before integration qualification, repair the repository boundary in `integrationGit`.

Current defect:
- managed `Dev/` is a linked Git worktree;
- `root/.git` is therefore a file;
- integration candidate storage assumes `root/.git` is a physical directory;
- candidate ownership verification compares against that stale path.

Required architecture:
- operation root may be a conventional checkout or a verified linked checkout;
- resolve exact Git common directory using bounded Git inspection;
- validate that common directory belongs to the selected repository topology;
- store candidate machine state beneath repository-owned common-directory storage;
- verify candidate worktree belongs to that exact common repository;
- preserve conventional-checkout behavior;
- never move candidate state into the non-Git Project container merely to avoid Git semantics.

Prove managed Project `Dev/` → candidate → validation/repair → Dev advance.

## 11. Integration Repair

Mechanical conflict or candidate validation failure creates bounded Integration Repair.

ChampCity retains Git mechanics:
- candidate creation;
- merge state;
- patch application bounds;
- validation;
- commit/checkpoint;
- target advance.

The Integration Repair agent receives exact candidate/target/incoming evidence and may edit only policy-approved paths. It may not decide a material product/scope conflict; that returns to Operator decision.

Integration Repair completion/revalidation must update canonical IntegrationRecord evidence and preserve candidate lineage.

## 12. Legacy execution fence

Feature and Issue exact Workflow instances must not use:
- `workPlanningKernel`/route-owned execution identity;
- `routedDevelopmentExecutionBinding`;
- `routedDevelopmentExecutionService`;
- `issueExecutionPlan` private Issue execution;
- legacy Issue Fix Card ownership;
- Current Project `currentWorkflowService` as a Markdown pipeline authority.

Salvage reusable mechanics:
- Work Card Architect UX;
- Codex Implementer adapter;
- validation planner/executor;
- source checkpoint services;
- integration candidate/policy/repair engine;
- presentation components.

Adapters may translate exact SPS state into reusable mechanical helpers. They may not restore WorkIntake/Markdown authority.

## 13. Known stale repair fixture

The historical source-semantic-reference repair case attempts to attach Repair work to a superseded Workflow owner.

WRB04 must:
- prove Repair/Fix ownership through the unique current exact Workflow;
- prove repair membership against that current Workflow graph;
- modernize or retire the stale fixture;
- not weaken the current-owner invariant to make the old test green.

## 14. WRB04 acceptance conditions

WRB04 is complete only when:

1. Feature and Issue share one exact-Workflow post-plan execution service;
2. exact WorkItem IDs, not Work Card/Fix Card aliases, own execution;
3. dependency/Phase eligibility comes from Workflow-scoped SPS;
4. source-backed execution lazily materializes the exact Workflow checkout;
5. Implementer execution records canonical ImplementationRecord and source checkpoint;
6. Tester is a distinct role with bounded Determination evidence;
7. implementation-local proof is not automatically permanent;
8. Tester permanent-test changes are restricted to test-owned surfaces and checkpointed separately;
9. Validator consumes exact post-Tester revision and records Criteria-aware Validation;
10. failed validation creates a canonical same-Workflow Repair/Fix and re-enters the shared loop;
11. WorkItem and Phase closure obey typed deterministic eligibility;
12. Feature and Issue use the same shared execution Workspaces;
13. Workflow execution completion is canonical SPS state;
14. direct and WIR-routed Workflows integrate through the same exact-Workflow service;
15. integration candidate storage works from managed linked-worktree Dev using exact Git common-directory identity;
16. Integration Repair preserves Git/application ownership and target policy;
17. successful integration advances Dev and records exact IntegrationRecord result;
18. non-source/source-neutral execution does not fabricate Git state;
19. Current Project exact Feature/Issue execution no longer enters route-owned/private Issue execution engines;
20. no broad permanent-suite audit is inserted into every WorkItem;
21. the stale superseded-Workflow repair fixture is modernized/retired without weakening ownership.
