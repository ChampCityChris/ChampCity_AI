# WRB03 Architect Baseline — Workflow Planning Normalization

**Date:** 2026-09-26  
**Starting checkpoint:** dff9951225c319591ffe41b73a99621eb43c257c  
**Parent re-baseline:** docs/implementation-bundles/workflow-runtime-rebaseline/REBASELINE_2026-09-24.md

## Bundle purpose

WRB03 replaces Current Project route/intake-owned planning with planning owned by an exact substantive Workflow instance.

The first qualified families are:
- feature-capability;
- issue-resolution.

A direct Feature and a WIR-routed Feature must converge on the same Feature planning service and the same canonical Structured Project State result. Issue Resolution must use the same Workflow-owned planning boundary while retaining its materially different intake/evidence/RCA front half.

WRB03 stops at the canonical execution boundary. It does not implement Work Cards, implementation execution, validation/repair loops, source checkpoints, integration candidates, or integration.

## Governing identity and ownership

1. The planning owner is exact Workflow ID.
2. Workflow type selects the front-half semantics; it is never the instance key.
3. WIR provenance is contextual history only after handoff. WorkIntake ID, RouteAssessment ID, and route Decision ID cannot become planning ownership keys.
4. Direct and routed instances of the same substantive Workflow type use the same planning application service.
5. Every canonical planning entity must be reachable from exactly one owning Workflow through explicit Structured Project State relationships.
6. Planning one Workflow must not mutate, hide, or gate another Workflow.
7. SourceBaseline/SourceBinding remain Workflow-owned. Planning reads their identity/context but does not create a writable SourceLine or RepositoryCheckout.
8. Git availability is not planning authority. A non-source Project remains valid.

## Canonical planning result

ChampCity still has no generic canonical Plan entity.

An accepted implementation-bearing plan is represented by canonical Structured Project State:
- BoundedSolution where applicable;
- Findings and RootCauses where the front half requires them;
- WorkItems;
- optional Phases;
- Criteria;
- WorkItem dependencies;
- WorkItem/Phase membership;
- WorkItem implements BoundedSolution relationships;
- applicable addresses/explains/supports relationships;
- Operator Decisions for planning dispositions that are actually reserved to the Operator.

Human-readable Architect assessment/plan documents may be generated or temporarily promoted through the Architect output runtime, but they are drafts/projections. They are not a second workflow state engine.

### Workflow membership

Current part_of semantics already make WorkItem/Phase membership structurally useful. WRB03 must make Workflow ownership complete enough that the canonical planning graph for one Workflow can be queried without collecting another Workflow's records.

At minimum:
- every top-level Phase is part_of the exact Workflow;
- every direct WorkItem is part_of the exact Workflow;
- every phased WorkItem is part_of its exact Phase;
- planning semantic records that otherwise have no owner path, such as BoundedSolution/Finding/RootCause, receive an explicit reviewed Workflow-membership relationship rather than relying on filename, title, route, or creation order;
- dependencies may not cross Workflow ownership.

Do not use relates_to as a substitute for an ownership invariant if a typed membership rule is required.

## Canonical plan application primitive

WRB03 must add one typed Project State/application primitive that accepts a reviewed planning graph and atomically normalizes it into canonical records.

The input may use bounded temporary candidate keys only to describe the graph before application assigns canonical UUIDs. Candidate keys are never persisted as entity identity.

The primitive must:
- require one exact active substantive Workflow;
- reject WIR and Project Creation as plan-application targets in this bundle;
- validate the Workflow type against the planning family;
- validate direct versus phased topology;
- validate bounded nonempty WorkItems;
- validate all dependency/member references before mutation;
- reject dependency or membership cycles;
- require explicit Criterion semantics: statement, criticality, verification intent, and validation policy;
- create all required entities/relationships in one Project State transaction;
- record the Operator's accepted planning disposition in Structured Project State;
- advance the Workflow currentWorkspace to work-item-map only after successful canonicalization;
- leave no partial graph if any validation or persistence step fails.

The command must not infer Criterion validation policy from prose after acceptance.

## Workflow-scoped execution projection

The current getExecutionPlan(projectId) read model is Project-wide. That is no longer safe now that WRB02 permits concurrent Workflow instances.

WRB03 must establish a Workflow-scoped canonical plan/execution projection keyed by projectId + workflowId and prove:
- phases/work items belong to the requested Workflow;
- direct WorkItems are those directly part_of that Workflow;
- phased WorkItems resolve through a Phase owned by that Workflow;
- dependency/repair relationships returned by the projection cannot import another Workflow's nodes;
- a malformed cross-Workflow dependency/membership is rejected or surfaced as invalid state, never silently merged.

The legacy Project-wide projection may remain only where old unreachable code still needs it temporarily; no new Current Project path may depend on it. WRB04 will consume the Workflow-scoped projection.

## Feature / Capability front half

Feature/Capability planning follows:

Feature Intake
→ exact Workflow SourceBaseline/current product evidence
→ requested capability delta
→ preservation and affected-contract assessment
→ bounded Feature solution/planning
→ canonical Workflow-owned planning graph.

Required semantics:
- do not recreate Project Intake;
- do not route again;
- do not broaden the request into unrelated roadmap work;
- preserve accepted architecture and behavior unless explicitly superseded;
- criteria must describe observable proof and a validation policy;
- direct and WIR-routed Feature instances converge after exact Workflow opening.

WIR data may be shown as provenance/context for a routed Feature, but changing or deleting WIR planning artifacts cannot change the target Feature's canonical plan.

## Issue Resolution front half

Issue Resolution planning follows:

Issue Intake
→ evidence/reproduction
→ Findings
→ RCA / RootCause
→ bounded correction solution
→ correction planning
→ canonical Workflow-owned planning graph.

Required semantics:
- exact Issue Workflow ID owns the lifecycle;
- screenshots/evidence become Evidence with explicit support relationships where retained;
- accepted RCA is canonical Finding/RootCause state, not Markdown authority;
- correction WorkItems use WorkItem kind fix unless evidence specifically establishes a different canonical kind;
- RootCause explains Findings;
- BoundedSolution addresses RootCause/Findings;
- correction WorkItems implement the BoundedSolution;
- Issue-specific investigation remains bespoke, but the output boundary is the same canonical WorkItem/Phase/Criterion graph used by Feature.

## Architect output and Operator review

Reuse the existing embedded Architect / draft-promotion UX where it fits, but re-key ownership on exact Workflow ID.

The supported pattern is:
1. save Workflow-specific current context in Structured Project State;
2. prepare a deterministic Architect handoff from exact Workflow context and authoritative SPS records;
3. Architect draft is promoted as a bounded draft/projection;
4. Operator may accept, request revision, or reject at the planning decision point;
5. only accepted content is normalized into canonical planning records;
6. revision requests keep the Workflow in its current front-half workspace and do not partially rewrite the canonical plan graph.

Do not create a permanent Markdown approval engine.

## Current repository debt to retire/fence

The existing workPlanningKernel is keyed by WorkIntake ID and route Decision ID, writes under planning/work-intake/planning, and treats Markdown plan disposition as planning state. That is transitional legacy for the Current Project.

The old Issue Resolution stack likewise contains route/intake/Markdown assumptions and a private execution handoff.

WRB03 may salvage:
- route-specific discovery language;
- bounded plan topology validation;
- useful Issue evidence/RCA UI patterns;
- Architect output runtime mechanics;
- DocumentChat workspace composition.

WRB03 must not salvage:
- WorkIntake/route Decision as target planning identity;
- Work Intake branch ownership;
- Markdown disposition as canonical planning authority;
- Issue-specific post-plan execution engine;
- implicit Project-wide WorkItem pool.

## Workspace boundary

For supported WRB03 families, Current Project exact-instance navigation becomes:
- feature-intake / feature-assessment / feature-planning / work-item-map;
- issue-intake / issue-rca / issue-planning / work-item-map.

work-item-map in WRB03 is the canonical planning boundary view. It may display the normalized graph and its readiness, but it must not expose Implement/Run/Validate/Repair/Integrate actions. WRB04 owns those actions.

Unsupported substantive Workflow types remain on the exact generic Workflow shell until later bundles.

## Acceptance conditions

WRB03 is complete only when all of the following are true:
1. two concurrent Features can be planned independently by exact Workflow ID;
2. direct Feature and WIR-routed Feature use the same planning services/contracts and produce the same canonical graph shape;
3. routed provenance is context, not ownership;
4. Issue Intake/RCA/correction planning is owned by exact Issue Workflow ID;
5. accepted Issue RCA exists as SPS Finding/RootCause/Decision state;
6. accepted Feature/Issue plans produce Workflow-owned BoundedSolution/WorkItem/Phase/Criterion graphs;
7. every plan Criterion has explicit validation policy;
8. Workflow-scoped plan projection excludes peer Workflow records;
9. planning does not materialize source or create integration state;
10. non-source Projects can plan valid Workflows;
11. current Feature/Issue planning can be recovered from Structured Project State without parsing legacy Markdown;
12. WorkIntake/route-owned planning is unreachable from Current Project Feature/Issue exact-instance navigation;
13. work-item-map is a read-only boundary in WRB03;
14. no WRB04 shared execution/integration implementation is started.
