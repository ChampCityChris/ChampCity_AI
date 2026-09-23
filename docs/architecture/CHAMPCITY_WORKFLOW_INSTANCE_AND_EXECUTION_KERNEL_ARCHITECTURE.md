# ChampCity Workflow Instance and Shared Execution Kernel Architecture

**Status:** PROPOSED CORRECTION — Operator review required  
**Date:** 2026-09-23  
**Purpose:** Correct workflow topology drift discovered during SCL closeout review.

## 1. Governing correction

ChampCity is not one pipeline.

A Project owns many independent Workflow instances. A Workflow type defines a reusable lifecycle. A Workflow instance is one specific body of work moving through that lifecycle.

Work Intake Routing (WIR) is one optional Workflow type. It is not the parent lifecycle for all work.

The governing topology is:

```text
Project
├── Greenfield / Project Creation workflow
├── Feature / Capability workflow instances [0..N]
├── Refactor / Migration workflow instances [0..N]
├── Integration / Composition workflow instances [0..N]
├── Infrastructure / Platform workflow instances [0..N]
├── Research / Prototype workflow instances [0..N]
├── Issue Resolution workflow instances [0..N]
└── Work Intake Routing workflow instances [0..N]
```

Except for the naturally one-time Project-creation/Greenfield lifecycle, every workflow type must support multiple concurrent instances in one Project.

Examples:

```text
Project: ChampCity A/I

Issues
  ISSUE A — OAuth refresh bug
  ISSUE B — renderer regression
  ISSUE C — installer failure

Features
  FEATURE A — Source graph
  FEATURE B — Tester role

Migrations
  MIGRATION A — Electron → web client

Research
  RESEARCH A — local model execution
```

These instances may all exist and progress independently.

## 2. Canonical vocabulary

### Project

The durable product/software project.

### Workflow Definition

The reusable lifecycle definition for a kind of work.

A Workflow Definition owns, at minimum:

- workflow type;
- display/entry identity;
- workflow-specific intake contract;
- workflow-specific assessment/discovery contract;
- workflow-specific planning profile;
- normalization rules that produce canonical execution semantics;
- shared execution policy selection;
- completion policy.

### Workflow

One durable instance of a Workflow Definition.

A Workflow has:

- opaque Workflow identity;
- owning Project;
- Workflow type;
- title/display identity;
- lifecycle state;
- current Workspace/task;
- governing semantic records;
- optional source binding;
- timestamps and lineage.

Multiple active Workflows of the same type are normal.

### Workspace

A reusable task-oriented screen/station. Workspace identity is not Workflow identity.

The same Workspace may be used by many Workflow types and instances when the task is materially the same.

### Work Item / Phase / Criterion

Canonical execution semantics produced after workflow-specific planning.

### SourceLine

Source-control isolation for one substantive Workflow instance.

SourceLine identity is not Workflow identity. It is an infrastructure binding owned by the Workflow.

## 3. Work Intake Routing is an optional router

WIR exists for work whose correct workflow is not already known.

Its lifecycle is:

```text
WIR instance
→ capture ambiguous request
→ Architect route assessment
→ Operator route selection
→ instantiate selected independent Workflow
→ seed selected Workflow intake/context from WIR evidence
→ link WIR → selected Workflow
→ close WIR
```

WIR stops there.

WIR does not own:

- selected Workflow assessment;
- selected Workflow planning;
- Phase/Work Item execution;
- implementation;
- validation;
- repair;
- integration.

The relationship is durable provenance, not parent/child runtime ownership.

A direct workflow start bypasses WIR entirely:

```text
+ Start Feature
→ create Feature Workflow instance
→ Feature Intake
```

WIR and direct entry must produce equivalent target Workflow semantics after target creation.

## 4. Workflow-specific front half

The principal bespoke portion of a Workflow is before the canonical execution boundary.

Examples:

### Feature / Capability

```text
Feature Intake
→ current-baseline / requested-delta assessment
→ preservation / affected-contract planning
→ executable plan semantics
```

### Issue Resolution

```text
Issue Intake
→ evidence / reproduction
→ RCA
→ bounded correction planning
→ executable plan semantics
```

### Refactor / Migration

```text
Migration Intake
→ current-state / target-state assessment
→ transformation / compatibility / cutover / retirement planning
→ executable plan semantics
```

### Integration / Composition

```text
Integration Intake
→ characterization / ownership / contracts / access / data-flow assessment
→ build-vs-integrate planning
→ executable plan semantics
```

### Infrastructure / Platform

```text
Infrastructure Intake
→ current/target operational topology
→ provisioning / rollout / failure / recovery planning
→ executable plan semantics
```

### Research / Prototype

Research may terminate in accepted evidence/Decision without implementation.

If implementation/research Work Items are required, they normalize into the same execution semantics.

### Greenfield / Project Creation

Project creation is distinct from WIR.

```text
Start New Project
→ Project Intake
→ Architect product understanding
→ Project/Greenfield planning
→ Project baseline
→ shared execution when implementation begins
→ Workflow Hub
```

WIR must never be required merely to create a Project.

## 5. Normalization boundary

Workflow-specific planning ends by producing canonical execution semantics in Structured Project State:

- BoundedSolution where applicable;
- Work Items;
- optional Phases;
- Criteria;
- dependencies;
- sequencing;
- relevant Decisions;
- source/integration context.

A generic canonical Plan entity remains unnecessary. Human-readable Plan documents are projections over these records.

After this boundary, workflow identity is context, not a reason to fork implementation.

## 6. Shared execution kernel

All implementation-bearing workflows use the same execution kernel unless a materially different task is proven.

Target reusable workspaces/services:

```text
Work Item Map
→ Work Card Planning / decomposition
→ Implement
→ Review & Validation
→ Repair when required
→ Close / Next
→ optional Phase Validation / Close
→ Workflow completion
→ Integration
```

Shared kernel responsibilities include:

- dependency eligibility;
- Work Item and Phase progression;
- Work Card decomposition;
- Implementer runtime execution;
- ImplementationRecord capture;
- Evidence and Validation;
- Repair creation and re-entry;
- Work Item completion;
- Phase completion;
- source checkpoints;
- integration candidate / Integration Repair;
- final SourceLine integration.

### Governing reuse rule

No workflow-specific execution Workspace may exist after the canonical execution boundary unless that workflow demonstrates a materially different user task that cannot be expressed through the shared execution contracts.

Adapters may translate workflow-specific planning state into shared execution state. Adapters do not justify duplicate Workspaces.

## 7. Source control and multiplicity

Source control exists to support independent Workflow instances.

Each substantive Workflow instance receives its own SourceLine from the appropriate integration target.

Example:

```text
dev
├── feature/<workflow>
├── feature/<workflow>
├── issue/<workflow>
├── issue/<workflow>
├── migration/<workflow>
└── infrastructure/<workflow>
```

Workflow creation must not be serialized behind completion of another Workflow.

The current transitional implementation may still attach only one normal writable RepositoryCheckout at a time. That is an execution-capacity limitation, not a semantic restriction:

```text
many Workflow instances
many SourceLines
one attached writable checkout today
many checkouts/worktrees later
```

Moving to multiple concurrent checkouts/agents later must not require changing Workflow semantics.

WIR itself normally needs no implementation SourceLine. Its selected target Workflow owns the SourceLine.

Greenfield source bootstrap remains special because the Project does not yet have an established `main → dev` topology.

## 8. Source binding ownership

Canonical SourceBinding, SourceCheckpoint, and IntegrationRecord semantics belong to the substantive Workflow instance.

They must not be structurally keyed to WorkIntake.

Work Intake may be provenance for a Workflow created by WIR, but SourceLine ownership follows the Workflow that performs the work.

## 9. Workflow Hub

The Workflow Hub is a workflow-instance dashboard, not a list of singleton pipelines.

Conceptually:

```text
Feature / Capability
  + Start Feature
  FEATURE A — Planning
  FEATURE B — Implementing

Issue Resolution
  + New Issue
  ISSUE A — RCA
  ISSUE B — Repair
  ISSUE C — Validation

Refactor / Migration
  + Start Migration
  MIGRATION A — Planning

Integration / Composition
  + Start Integration

Infrastructure / Platform
  + Start Infrastructure Work

Research / Prototype
  + Start Research

Work Intake Routing
  + Help Me Route New Work

Source Control
  View all Workflow SourceLines and integration topology
```

Opening one Workflow never changes the existence or lifecycle of another.

## 10. Structured Project State is the only current workflow authority

Structured Project State is the canonical runtime state model.

There is no permanent legacy/structured provider choice.

Repository Markdown may remain as:

- architecture/governance documentation;
- historical evidence;
- generated projection/export;
- explicit imported evidence.

It is not an alternate live workflow engine.

## 11. Legacy abandonment policy

There is no legacy-workflow migration requirement.

Pre-existing in-progress Markdown workflow instances are abandoned.

If the work still matters, start a new current Workflow instance and use old artifacts only as evidence/context where useful.

Do not implement:

- staged semantic migration of old workflow instances;
- legacy/structured equivalence gating;
- provider-generation switching between two workflow engines;
- rollback from current Structured Project State to the legacy workflow engine;
- permanent legacy workflow entry points.

Transient coexistence inside a repair branch while code is replaced is implementation sequencing only. It is not product architecture.

## 12. Existing Project bootstrap

Opening an existing repository that does not yet have current Structured Project State establishes a fresh Project identity/resource binding from the selected repository.

It does not import old workflow instances.

Historical repository artifacts may be available as evidence, but no old workflow state becomes current automatically.

This is Project registration/bootstrap, not legacy workflow migration.

## 13. Salvage rule

The repair should preserve proven mechanics where ownership is correct.

Strong salvage candidates include:

- SQLite ProjectStateStore and recovery mechanics;
- ProjectStateService record/relationship/history semantics;
- workflow-specific planning profile content;
- `planExecutor` dependency/topology logic;
- Codex/App Server execution runtime;
- Evidence/Validation/Decision semantics;
- source-control provider mechanics;
- integration candidate and Integration Repair mechanics;
- reusable renderer presentations such as Codex execution console/actions, OperatorValidationPresentation, WorkCardRepairPresentation, WorkCardClosePresentation, DocumentChatWorkspaceShell.

The repair should move these behind correct Workflow ownership rather than rewrite them merely because surrounding topology was wrong.

## 14. Acceptance invariants

The corrected product is not complete until all are true:

1. WIR is optional and routing-only.
2. Every substantive workflow is independently startable.
3. Multiple instances of each repeatable Workflow type can coexist.
4. Workflow instances, not WIR, own their SourceLines.
5. New Project creation uses Project/Greenfield Intake, not WIR.
6. Workflow-specific intake/assessment/planning remains bespoke.
7. Post-plan execution uses one shared kernel and reusable Workspace family.
8. Issue Resolution retains multi-instance behavior while using the shared post-plan kernel.
9. No production workflow depends on legacy Markdown authority.
10. No legacy-to-current workflow migration or provider coexistence path remains.
11. Source Control displays simultaneous Workflow-owned source topology.
12. Creating/planning a second Workflow does not require finishing the first.
13. The one-checkout transitional limitation does not become a workflow admission gate.
