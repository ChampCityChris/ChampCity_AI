# WRB03-01 — Establish Workflow-Owned Canonical Planning Graph and Workflow-Scoped Projection

**Bundle:** WRB03 — Workflow Planning Normalization  
**Starting checkpoint:** dff9951225c319591ffe41b73a99621eb43c257c  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Create the canonical planning boundary that later Feature and Issue front halves will use.

This card is domain/application infrastructure only. It does not build Feature/Issue UI and it does not start execution.

At completion, a reviewed plan can be applied atomically to one exact substantive Workflow and queried back as an isolated Workflow-owned graph.

## 1. Define shared Workflow planning contracts

Add a bounded shared contract for a reviewed planning graph.

Use application-issued canonical UUIDs only after persistence. The draft input may use bounded temporary keys solely to express candidate references before normalization.

Required graph concepts:
- exact workflowId;
- one bounded solution candidate when the family requires implementation;
- topology: direct or phased;
- optional phase candidates with temporary key, title, objective, sequence, criteria;
- work item candidates with temporary key, kind, title, objective, optional phase key, dependency keys, criteria;
- solution-level criteria;
- explicit Criterion fields:
  - statement;
  - criticality;
  - verificationIntent;
  - validationPolicy;
- bounded solution fields:
  - title;
  - objective;
  - scopeIn;
  - scopeOut;
  - constraints;
  - assumptions;
  - risks.

Do not accept execution state, canonical entity IDs supplied by the Architect, Git branch names, checkout paths, validation results, implementation reports, or integration state as draft plan content.

Keep temporary candidate identity distinct from canonical Project State identity.

## 2. Complete Workflow planning ownership semantics

Review Project State relationship semantics and add the smallest typed ownership rule needed so BoundedSolution, Finding, and RootCause records used by a Workflow front half can be unambiguously owned by one Workflow.

Prefer a reviewed membership semantic rather than generic relates_to.

Preserve existing:
- direct WorkItem part_of Workflow;
- Phase part_of Workflow;
- phased WorkItem part_of Phase.

Required ownership invariants:
- a current top-level planning semantic record belongs to one exact Workflow;
- a Phase belongs to exactly one Workflow;
- a WorkItem resolves to exactly one Workflow either directly or through its Phase;
- a planning graph cannot create membership across two Workflows;
- dependencies cannot cross Workflow ownership;
- WIR cannot own substantive planning entities.

Update the architecture/domain relationship documentation if the registry vocabulary changes.

Do not overload routes_to, initiates, baselines_source, binds_source, or source relationships for plan ownership.

## 3. Add a typed atomic plan-normalization command

Add a typed Project State command such as acceptWorkflowPlanningGraph, with internal naming left to implementation.

The command must execute in one Project State transaction.

Preflight before mutation:
- Project exists and matches all records;
- exact Workflow exists, is current/active, and is a substantive implementation-bearing type supported by the caller;
- Workflow is not work-intake-routing or project-creation;
- graph is bounded and structurally valid;
- direct topology contains no Phase membership;
- phased topology has nonempty Phases and every WorkItem belongs to exactly one declared Phase;
- all dependency keys resolve inside this graph;
- dependency graph is acyclic;
- every Criterion carries an explicit supported validation policy;
- no unsupported WorkItem kind is accepted for the requested planning family;
- no canonical planning graph has already been accepted for this Workflow unless an explicit supported correction/supersession path is invoked.

Atomic success:
- create the BoundedSolution;
- attach it to the exact Workflow with the reviewed membership rule;
- create solution criteria and defines_criterion links;
- create Phases and part_of Workflow links when phased;
- create WorkItems and exact part_of links;
- create WorkItem criteria and Phase criteria;
- link WorkItems implements BoundedSolution;
- create depends_on edges;
- record the Operator planning-acceptance Decision in SPS and govern the relevant Workflow/solution;
- advance Workflow currentWorkspace to work-item-map and retain active Workflow state;
- return canonical IDs and a Workflow-scoped projection.

Any failure leaves no partial entities, relationships, Decision, or Workflow transition.

Do not create SourceLine, RepositoryCheckout, SourceCheckpoint, ImplementationRecord, Validation, repair WorkItem, IntegrationRecord, or Git mutation.

## 4. Preserve draft/revision semantics outside the canonical accepted graph

Request Revision and Reject before acceptance must not partially apply canonical WorkItems/Phases/Criteria.

If the Architect output runtime needs a temporary reviewed draft artifact, it remains non-authoritative until the typed acceptance command succeeds.

Once a canonical graph has been accepted, do not silently rewrite it through generic reviseRecord calls. If this card exposes plan correction, it must use explicit supersession semantics and must refuse replacement after execution evidence exists. It is acceptable for WRB03 to support only first acceptance and leave post-execution replanning to a later explicit architecture path.

Do not add a generic Plan entity.

## 5. Add a Workflow-scoped canonical plan projection

Add a Project State read operation such as getWorkflowExecutionPlan(projectId, workflowId).

It must return only current records belonging to the requested Workflow:
- exact Workflow identity;
- BoundedSolution ID(s) relevant to the accepted graph;
- ordered Phases;
- direct WorkItems or Phase member WorkItems;
- criteria by owner;
- WorkItem dependencies;
- WorkItem-to-solution implementation relationships;
- applicable accepted planning Decision metadata needed to prove the graph is accepted.

Required isolation:
- two Workflow instances may each have Phase sequence 1 without collision;
- direct WorkItems from Workflow A cannot appear in Workflow B;
- dependencies returned for Workflow A must have both endpoints owned by Workflow A;
- a malformed cross-Workflow dependency is rejected/surfaced as invalid state rather than imported;
- WIR planning query is rejected.

The existing Project-wide getExecutionPlan may remain temporarily for old code, but mark it transitional if retained. No WRB03 Current Project path may depend on it.

## 6. Workflow planning application service

Create a main-process service boundary keyed by Project root + exact Workflow ID.

Required initial operations:
- get planning context for exact Workflow;
- get accepted canonical graph/projection;
- accept one reviewed graph through the typed Project State command.

Planning context must expose:
- exact Workflow summary/type/state/currentWorkspace;
- direct vs routed provenance for display only;
- exact SourceBaseline/SourceBinding identity if present;
- non-source state when absent.

It must not require WorkIntake ID or Route Decision ID to operate.

## 7. Permanent proof

Add focused proof for:
- direct Feature graph normalization;
- phased Feature graph normalization;
- exact explicit Criterion policies;
- application-issued IDs distinct from temporary keys;
- atomic rollback on invalid dependency/member/policy;
- two simultaneous Workflow graphs remain isolated;
- same-type same-title Workflows remain isolated by exact ID;
- cross-Workflow dependency/membership is rejected;
- WIR/Project Creation targets are rejected;
- non-source Workflow planning works;
- source-backed planning leaves SourceBinding unprepared and creates no checkout/branch/checkpoint/integration;
- Workflow-scoped projection returns only the requested graph;
- accepted Workflow transitions to work-item-map only after graph commit.

Update existing Project State execution-plan tests where useful instead of duplicating every generic graph invariant.

## Non-scope

Do not build Feature UI, Issue UI/RCA, legacy planning retirement, Work Item execution, source materialization, test/validation execution, repair, phase close, or integration.

Do not repair integrationGit.

## Validation

Run build; focused Project State relationship/planning graph tests; current-state query regressions affected by membership changes; Workflow application/source semantic tests necessary to prove no source mutation; validation-plan preview; git diff --check.

Do not run broad legacy routed planning/execution suites unless a changed production contract genuinely requires them.

## Report/checkpoint

Write docs/implementation-bundles/workflow-runtime-rebaseline/WRB03/Reports/WRB03-01_IMPLEMENTER_REPORT.md.

Suggested commit: WRB03-01 establish Workflow-owned planning graph.

Then proceed directly to WRB03-02.
