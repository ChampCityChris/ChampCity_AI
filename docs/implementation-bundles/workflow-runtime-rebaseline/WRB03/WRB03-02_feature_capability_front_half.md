# WRB03-02 — Implement Feature/Capability Exact-Workflow Intake, Architect Planning, and Canonicalization

**Depends on:** WRB03-01 checkpoint  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Replace the generic shell for feature-capability with a usable Feature front half owned by exact Workflow ID.

Direct Feature and WIR-routed Feature must converge on this same service/workspace. WIR provenance may be displayed as context but cannot drive planning state.

The card ends when an accepted Feature plan becomes the canonical Workflow-owned planning graph and the Workflow reaches the read-only work-item-map boundary.

## 1. Feature planning application model

Create a Feature planning service/contracts keyed by exact workflowId.

Required projection includes:
- exact Workflow identity/title/state/currentWorkspace;
- source-backed vs non-source planning context;
- exact SourceBaseline identity/revision when present;
- optional routed provenance for display;
- current Feature intake/assessment state from SPS;
- active Architect draft submission state when applicable;
- accepted canonical plan projection when present;
- bounded error/revision state.

Do not require WorkIntake ID, Route Decision ID, route ID, legacy branch binding, or Markdown path as ownership input.

## 2. Feature Intake

Provide a durable Feature Intake workspace for the selected exact Workflow.

The task is to capture the capability delta against the current Project, not recreate Project Intake.

Collect enough bounded context to support:
- requested capability/outcome;
- relevant current behavior/baseline;
- scope in/out;
- constraints and preservation rules;
- known affected surfaces/evidence;
- known compatibility/rollout concerns.

Persist semantic context in canonical SPS records owned by the exact Workflow. Use the existing canonical vocabulary where it fits; do not make Markdown the only durable copy.

Do not create a new WorkIntake merely because the Feature was direct-started.

A routed Feature may prefill/display the original WIR request as provenance/context, but the Feature owns all target-specific planning state after handoff.

## 3. Architect Feature assessment

Reuse the existing embedded Architect browser + prepare/copy/refresh pattern.

Architect handoff must identify:
- exact Project;
- exact Feature Workflow ID;
- Workflow type;
- exact SourceBaseline revision when source-backed;
- authoritative Feature planning context from SPS;
- routed provenance only as historical context;
- current accepted architecture and preservation rules available to the Project.

The Architect assessment should cover the useful semantics already present in the old Feature profile:
- Current Product Baseline;
- Requested Capability Delta;
- Behavior and Contracts to Preserve;
- Affected Architecture and Integration Points;
- Compatibility and Rollout;
- Regression Boundary;
- Excluded Future Work.

Do not ask the Architect to choose a route. The route/type already exists.

Do not write assessment authority under planning/work-intake or key Architect output ownership by route Decision.

## 4. Feature planning draft

After the assessment is accepted/current, allow preparation of the bounded Feature implementation plan.

The draft must produce the WRB03-01 reviewed planning graph contract, including:
- BoundedSolution fields;
- direct or phased topology with rationale;
- WorkItem candidates;
- dependencies;
- explicit criteria with verification intent and validation policy;
- Phase criteria where appropriate.

Feature WorkItems default to canonical kind feature.

Do not let the Architect put implementation/session/Git mechanics into the canonical graph.

Keep the useful topology rules:
- direct plan for bounded ordered work with no real Phase boundary;
- phases only for genuine dependency/rollout/acceptance boundaries;
- every candidate traces to the requested capability or evidenced hard dependency;
- unrelated roadmap work stays outside this Workflow.

## 5. Operator disposition and canonicalization

The Feature planning UI supports:
- Accept;
- Request Revision;
- Reject where the current review surface already supports it.

Request Revision keeps the Workflow in Feature planning and prepares a fresh Architect cycle. It must not create partial WorkItems/Phases/Criteria.

Accept calls the shared WRB03-01 atomic plan-normalization primitive. Only then:
- canonical plan records exist;
- Operator planning Decision exists in SPS;
- currentWorkspace becomes work-item-map.

A planning Markdown/projection may remain for review history, but deleting it must not delete the accepted canonical graph.

## 6. Direct and WIR-routed convergence

Prove both entry paths:

Direct:
Hub Start Feature
→ exact feature-capability Workflow
→ Feature Intake
→ Architect assessment/planning
→ canonical graph.

Routed:
WIR target handoff
→ exact feature-capability Workflow
→ same Feature Intake/assessment/planning service
→ same canonical graph shape.

The routed path must not call the old workPlanningKernel, readWorkIntake planning kernel, workRouteDecisionService, or routed branch ownership to determine Feature planning state.

The only route-specific difference after handoff is provenance/context.

## 7. Read-only Work Item Map boundary

After acceptance, render the exact Workflow's canonical projection:
- Bounded Solution;
- Phases if any;
- WorkItems/dependencies;
- Criteria and validation policy.

This boundary is informational in WRB03.

Do not expose Implement, execute agent, create Work Card, validate, repair, checkpoint, integrate, or close actions yet.

## 8. Permanent proof

Add focused service/renderer proof for:
- direct Feature exact-ID lifecycle;
- two concurrent Feature instances maintain separate intake/draft/accepted graphs;
- same title does not collide;
- WIR-routed Feature opens the same workspace/service as direct Feature;
- routed provenance is visible but does not own the plan;
- source-backed context exposes exact SourceBaseline while SourceBinding remains unprepared;
- non-source Feature planning works;
- revision request creates no canonical graph;
- acceptance creates canonical graph once and transitions to work-item-map;
- work-item-map reads canonical SPS rather than parsing plan Markdown;
- no Current Project Feature path invokes route/intake-owned workPlanningKernel.

## Non-scope

Do not implement Issue Resolution, other Workflow front halves, shared execution, Work Cards, source materialization, validation/repair, or integration.

## Validation

Run build; new Feature planning service and renderer tests; WRB03-01 planning graph tests; Workflow Hub/exact navigation regression; structured WIR handoff tests needed to prove routed convergence; validation-plan preview; git diff --check.

Do not run the old broad routed development lifecycle solely for compatibility.

## Report/checkpoint

Write docs/implementation-bundles/workflow-runtime-rebaseline/WRB03/Reports/WRB03-02_IMPLEMENTER_REPORT.md.

Suggested commit: WRB03-02 normalize Feature Workflow planning.

Then proceed directly to WRB03-03.
