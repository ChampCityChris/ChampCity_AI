# RWS06A — Structured Plan Review and Deterministic Topology Resolver

**Status:** IMPLEMENTER_READY  
**Bundle:** RWS06  
**Objective:** establish the common SQL review boundary for Plan candidates and make direct/phased topology mechanically deterministic from typed planning semantics.

## Verified starting point

- `WorkflowPlanningGraph` already represents BoundedSolution, Criteria, optional Phases, WorkItems, dependencies and topology.
- `acceptWorkflowPlanningGraph()` already validates accepted topology and persists the canonical execution graph.
- Current planning prompts let the Architect choose `direct` or `phased`; application code validates the result but does not independently derive topology.
- Existing profiles already say route identity must not determine topology.

## Required architecture

Add a typed pre-acceptance Plan review model. It may use a first-class review-cycle/version anchor analogous to RWS05, but must not duplicate canonical semantic bodies.

A Plan candidate must contain:
- exact Workflow identity/type;
- BoundedSolution candidate;
- WorkItem candidates and dependencies;
- Criteria candidates;
- typed topology-boundary semantics;
- source/evidence references needed to prove currentness.

### Deterministic topology resolver

AI supplies semantic decomposition and boundary evidence. Application code derives the topology.

**Direct is the default.**

Resolve **phased** only when the candidate declares a complete valid phase grouping with:
- at least **2** non-empty Phase groups;
- every WorkItem assigned exactly once;
- acyclic Phase dependencies;
- no WorkItem dependency that contradicts Phase order;
- at least one Phase-level acceptance criterion per Phase;
- an allowed meaningful boundary reason for every boundary, such as:
  - `independent_acceptance_boundary`
  - `cutover_transition`
  - `rollback_recovery_boundary`
  - `environment_transition`
  - `separately_deliverable_outcome`
  - `material_dependency_gate`
- bounded rationale/evidence references for each boundary.

If no phase grouping is supplied, resolve **direct**.

If a phase grouping is supplied but is incomplete/invalid, fail closed for revision. Do not silently downgrade to direct.

A route label, WorkItem count, file count, estimated effort, or model preference must never by itself force Phases.

A single Phase is invalid; it must be represented as direct WorkItems.

### Operator authority

The Operator reviews/approves the Plan as a whole. If the Operator rejects the derived topology, the Plan candidate is revised; do not mutate topology behind an accepted Plan.

## SQL/review behavior

Before Operator disposition, the candidate must exist in bounded structured state and have an exact review revision. Generated Markdown is derived from that candidate for human review.

Approval materializes/activates the accepted `WorkflowPlanningGraph` and records the SQL Decision. Revision/rejection must not create an accepted execution graph.

Do not accept raw textarea or temporary Markdown as the review authority.

## Preserve

- existing accepted Feature/Issue graph behavior;
- exact Workflow ownership;
- SourceBaseline constraints and deterministic validation-policy rules;
- RWS05 Architect review semantics;
- optional WIR/direct-start equivalence.

## Forbidden

No topology based on arbitrary thresholds. No LLM-owned final topology switch. No canonical Markdown Plan authority. No Project Creation redesign in this card.

## Focused proof

Prove direct default, valid phased derivation, one-Phase rejection, incomplete assignment rejection, cycle rejection, contradictory dependency rejection, boundary-reason enforcement, exact-version review invalidation, and unchanged accepted graph materialization.

## Report / checkpoint

Report: `docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06A_IMPLEMENTER_REPORT.md`

Commit: `RWS06A add structured plan review and topology resolver`

Continue to RWS06B unless a bundle stop condition is met.