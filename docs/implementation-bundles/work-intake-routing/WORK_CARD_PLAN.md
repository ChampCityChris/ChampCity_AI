# Work Intake Routing Feature — Implementation Work Card Plan

**Status:** Finalized implementation bundle — 2026-09-19

## Objective

Implement the Work Intake routing, route-specific planning, generic direct/phased Plan execution, and application-owned Git lifecycle in the current ChampCity application before the Electron → service/browser refactor is replanned.

The completed feature must allow ChampCity to:

- start one bounded body of work against a Project;
- create a dedicated Git branch for that Work Intake;
- route the Intake into the correct bespoke Architect/planning profile;
- let the Operator approve or revise the route and Plan topology;
- execute either a direct Work Item Plan or phased Plan through one generic executor;
- checkpoint Work Item source changes through machine-owned Git;
- integrate a completed Intake through an isolated integration candidate;
- route merge conflicts or post-merge validation failures into bounded Integration Repair while ChampCity retains Git ownership.

## Bundle Execution Model

The repository holds the full bundle, but the Implementer reads and executes only one Work Card at a time.

For each card:

1. read the current card from the repository;
2. implement its bounded scope;
3. run focused validation;
4. write its Implementer Report;
5. create one harness-managed checkpoint commit for that card;
6. only then read the next card.

Do not preload all remaining Work Cards into active context.

## Card Plan

### WIR01 — Establish Work Route Contracts and Registry
Create the shared route taxonomy, route traits, advisory recommendation contract, Operator route-decision contract, reroute semantics, and profile registry.

### WIR02 — Promote Deterministic Git Mechanics into Application Source-Control Service
Promote existing bounded Git mechanics behind an application-owned semantic service without yet binding Git to Work Intake lifecycle.

### WIR03 — Bind Every Work Intake to a Dedicated Git Branch
Create base branch/base commit/work-branch binding, collision-safe naming, verification, and failure recovery.

### WIR04 — Implement Universal Work Intake Capture and Canonical Persistence
Create concise Work Intake capture for existing/new Projects and persist branch binding; do not auto-create the generic Architect Interview prompt.

### WIR05 — Implement Architect Advisory Routing Assessment
Create bounded Architect route recommendation, traits, rationale, and repository-evidence review. AI remains advisory.

### WIR06 — Implement Operator Route Decision and General Reroute Semantics
Allow accept/override/revise routing and preserve Intake/branch identity across reroute.

### WIR07 — Build Shared Planned-Work Planning Kernel and PlanTopology Contract
Create common route-specific planning mechanics plus `PlanTopology = direct | phased`.

### WIR08 — Implement Greenfield / New Product Planning Profile
Move valid current greenfield planning into the new profile model.

### WIR09 — Implement Feature / Capability Change Planning Profile
Create existing-product delta planning rather than whole-product replanning.

### WIR10 — Implement Refactor / Migration / Platform Transition Planning Profile
Create current→target transformation planning with preservation, seams, cutover, rollback, and retirement.

### WIR11 — Implement Integration / Composition Planning Profile
Create build-versus-integrate planning for component/service composition.

### WIR12 — Implement Infrastructure / Platform Change Planning Profile
Create operational planning for deployment, hosts, environments, networking, packaging, rollback, and recovery.

### WIR13 — Implement Research / Prototype Planning Profile
Create bounded research planning that may close in evidence/decision without production implementation.

### WIR14 — Integrate Issue Resolution with Universal Work Intake Routing
Make Issue Resolution a routed RCA path and allow direct or phased correction planning.

### WIR15 — Add Formal Work Card Decomposition and Topology Correction Safety Valve
Allow oversized candidates to become sibling Work Items or genuine Phases after detailed inspection.

### WIR16 — Establish Generic Direct/Phased Plan Execution
Create one route-independent Plan executor with optional Phase membership.

### WIR17 — Adapt Current Development Execution to Generic Plan Topology
Move current Development Work Card/Phase progression behind the generic executor.

### WIR18 — Adapt Issue Correction Execution to Generic Plan Topology
Keep Issue RCA bespoke while moving correction execution onto the shared executor.

### WIR19 — Add Machine-Owned Work Item Git Checkpoints
Have ChampCity checkpoint completed Work Items through deterministic product-owned Git.

### WIR20 — Implement Machine-Owned Integration Candidate Lifecycle
Create isolated integration candidates, mechanically merge, validate, and advance target only after pass.

### WIR21 — Implement Agent-Assisted Integration Repair with Machine-Owned Git
Give the agent semantic source-repair responsibility while ChampCity retains all Git state transitions.

### WIR22 — Make Start Work the Canonical Workflow Hub Entry
Replace premature workflow selection with Start Work → Work Intake while preserving compatibility/recovery.

### WIR23 — End-to-End Routing, Execution, Git, and Integration Acceptance
Prove all representative routes, topologies, Git checkpoints, integration outcomes, Integration Repair, and existing-project compatibility.

## Linear Execution Order

`WIR01 → WIR02 → WIR03 → WIR04 → WIR05 → WIR06 → WIR07 → WIR08 → WIR09 → WIR10 → WIR11 → WIR12 → WIR13 → WIR14 → WIR15 → WIR16 → WIR17 → WIR18 → WIR19 → WIR20 → WIR21 → WIR22 → WIR23`

## Source-Control Checkpoint Rule

For this bootstrap bundle, every passing Work Card ends in exactly one checkpoint commit created through the execution harness source-control capability.

Commit message:

`<CARD_ID>: <exact card title>`

Do not merge, tag, release, or publish during individual cards.

## Scope Guard

This bundle must not:

- begin the Electron → service/browser refactor itself;
- implement Structured Project State;
- execute or broaden the current WC02 capability-map work;
- delegate future application-owned Git mechanics to model inference;
- invent a ChampCity-specific alternative to Git branches/merge;
- implement a new multi-user authority system;
- automatically choose a semantic winner when conflicting accepted changes require an Operator decision;
- add unrelated product features.

## After WIR23

Use the completed Start Work flow to create a new Refactor/Migration Work Intake for the Electron-owned application → service-owned application + browser-client cutover. Later governance refactors and feature work remain separate Work Intakes unless the Operator explicitly combines them.
