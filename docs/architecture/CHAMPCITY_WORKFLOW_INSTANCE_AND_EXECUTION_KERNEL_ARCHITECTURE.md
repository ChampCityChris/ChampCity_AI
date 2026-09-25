# ChampCity Workflow Instance and Shared Execution Kernel Architecture

**Status:** Adopted recovery architecture — Operator decisions incorporated 2026-09-23  
**Purpose:** Govern the Workflow Topology Recovery package and correct the WIR/SCL topology drift.

## 1. Governing model

ChampCity is not one pipeline.

A Project owns many independent Workflow instances. A Workflow Definition describes one reusable lifecycle. A Workflow instance is one specific body of work moving through that lifecycle.

The initial canonical Workflow type set is:

| Workflow type | Canonical ID | Repeatable |
| --- | --- | --- |
| Project Creation / Greenfield | `project-creation` | No |
| Feature / Capability | `feature-capability` | Yes |
| Refactor / Migration | `refactor-migration` | Yes |
| Integration / Composition | `integration-composition` | Yes |
| Infrastructure / Platform | `infrastructure-platform` | Yes |
| Research / Prototype | `research-prototype` | Yes |
| Issue Resolution | `issue-resolution` | Yes |
| Work Intake Routing | `work-intake-routing` | Yes |

Future Workflow Definitions such as UI Builder, Art Asset Creation, or Sound Studio may be added without changing the Project/Workflow/Workspace/execution-kernel model.

A Project may therefore contain, at the same time:

```text
Project: ChampCity A/I

Issue Resolution
  ISSUE A — OAuth refresh bug
  ISSUE B — renderer regression
  ISSUE C — installer failure

Feature / Capability
  FEATURE A — Source graph
  FEATURE B — Tester role

Refactor / Migration
  MIGRATION A — Electron → web client

Research / Prototype
  RESEARCH A — local model execution

Work Intake Routing
  WIR A — classify an ambiguous request
```

No Workflow must finish merely so another Workflow can be created, assessed, planned, or represented in source control.

## 2. Canonical concepts

### Project

The durable product/software project.

Current Project registration and selection are Project runtime state, not Repository identity. A ProjectResource with `resourceType: current-project-registration` identifies the selected Current Project. A separate `source-repository` ProjectResource is optional infrastructure and exists only when a Git Repository is present. Non-Git Current Projects are valid. Workflows use source baselines, SourceBindings, or materialized SourceLines only when their Project has a source Repository and the Workflow semantics require source.

### Workflow Definition

The reusable lifecycle definition for a kind of work.

A Workflow Definition owns:

- canonical Workflow type;
- display/entry identity;
- repeatability rule;
- Workflow-specific intake contract;
- Workflow-specific assessment/discovery contract;
- Workflow-specific planning profile;
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
- exact source baseline when source-backed;
- optional materialized SourceLine / RepositoryCheckout;
- timestamps and lineage.

Multiple active Workflows of the same repeatable type are normal.

### Workspace

A task-oriented UI station through which a Workflow task is performed.

Workspace identity is not Workflow identity. A Workspace can be reused by many Workflow types and instances when the user task is materially the same.

### Work Item / Phase / Criterion

Canonical execution semantics emitted after Workflow-specific planning.

### SourceBaseline

The exact immutable SourceRevision against which a substantive Workflow was created and understood.

Capturing a SourceBaseline does not require creating a branch or writable checkout.

### SourceLine

Provider-neutral source isolation for a substantive Workflow once repository mutation is required.

### RepositoryCheckout

A concrete readable/writable working copy of a Repository. Checkout identity is execution infrastructure and is separate from Project, Workflow, and SourceLine identity.

## 3. Work Intake Routing is an optional Workflow

WIR exists when the Operator has work but does not already know which substantive Workflow fits it.

Its lifecycle is:

```text
WIR instance
→ capture ambiguous request
→ Architect route assessment
→ Operator route selection
→ instantiate selected independent Workflow
→ seed target Workflow intake/context from WIR evidence
→ link WIR → selected Workflow
→ close WIR
```

WIR stops at handoff.

WIR does not own:

- the target Workflow's SourceBaseline or SourceLine;
- target assessment;
- target planning;
- Phase/Work Item execution;
- implementation;
- validation;
- repair;
- integration.

WIR does not receive an implementation SourceLine.

Direct workflow start bypasses WIR:

```text
+ Start Feature
→ create Feature Workflow
→ Feature Intake
```

A Feature created directly and a Feature created by WIR must converge on the same target Workflow contract.

## 4. Project Creation / Greenfield is one-time

Project Creation is the one-time lifecycle that establishes a new Project.

```text
Start New Project
→ Project Intake
→ Architect product understanding
→ Greenfield planning
→ Project/source baseline establishment
→ shared execution when implementation is required
→ Workflow Hub
```

A Project cannot start a second Project Creation Workflow.

Subsequent large changes use repeatable workflows such as Feature / Capability or Refactor / Migration.

WIR is never required merely to create a Project.

## 5. Existing Project registration

Opening an established repository that has no current ChampCity Structured Project State uses a one-time registration Workspace rather than Greenfield or WIR.

```text
Open Existing Project
→ current Structured Project State exists?
    yes → Workflow Hub
    no  → Existing Project Registration
          - Project name
          - purpose / description
          - repository binding
          - whether existing planning/architecture is relevant evidence
        → create fresh Project State
        → Workflow Hub
```

Existing Project Registration is Project bootstrap, not a ninth Workflow type.

Old Issues, Development phases, Work Cards, WIR records, or other Markdown workflow artifacts are not imported as current Workflow state.

Historical repository artifacts may later be cited as Evidence.

## 6. Workflow-specific front half

The bespoke portion of a Workflow is primarily before the canonical execution boundary.

### Feature / Capability

```text
Feature Intake
→ current baseline / requested delta
→ preservation and affected-contract assessment
→ Feature planning
→ canonical execution semantics
```

### Issue Resolution

```text
Issue Intake
→ evidence / reproduction
→ RCA
→ bounded correction planning
→ canonical execution semantics
```

### Refactor / Migration

```text
Migration Intake
→ current state / target state
→ transformation / compatibility / cutover / retirement planning
→ canonical execution semantics
```

### Integration / Composition

```text
Integration Intake
→ characterization / ownership / contracts / access / data-flow assessment
→ build-versus-integrate planning
→ canonical execution semantics
```

### Infrastructure / Platform

```text
Infrastructure Intake
→ current/target operational topology
→ provisioning / rollout / failure / recovery planning
→ canonical execution semantics
```

### Research / Prototype

Research may terminate in accepted Evidence/Decision without implementation.

If bounded research Work Items are required, they normalize into the same execution semantics.

## 7. Canonical execution boundary

Workflow-specific planning ends by producing canonical Structured Project State:

- BoundedSolution where applicable;
- Work Items;
- optional Phases;
- Criteria;
- dependencies;
- sequencing;
- relevant Decisions;
- source/integration context.

ChampCity does not require a generic canonical Plan entity. Human-readable plans are projections over these records.

After this boundary, Workflow type is context, not justification for a private implementation engine.

## 8. Shared execution kernel

All implementation-bearing Workflows use one execution kernel unless a materially different user task is demonstrated.

The target reusable loop is:

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

Shared responsibilities include:

- Work Item dependency eligibility;
- Phase eligibility;
- Work Card decomposition;
- Implementer runtime execution;
- ImplementationRecord capture;
- Evidence and Validation;
- Repair creation/re-entry;
- Work Item completion;
- Phase completion;
- source checkpoints;
- integration candidate / Integration Repair;
- final SourceLine integration.

### Reuse rule

No Workflow-specific post-plan execution Workspace may exist unless that Workflow demonstrates a materially different task that cannot be represented by the shared execution contracts.

Adapters may translate Workflow-specific planning semantics into shared execution semantics. Adapters do not justify duplicate Workspaces.

## 9. Source baseline and lazy source materialization

Every substantive source-backed Workflow captures an exact SourceBaseline when the Workflow instance is created.

For an established Project, the default baseline is the exact current `dev` SourceRevision at creation time.

Example:

```text
FEATURE-17 created
→ SourceBaseline = exact dev revision abc123
→ no SourceLine yet
→ Feature Intake / planning
→ executable source mutation required
→ materialize feature/<workflow-id> from abc123
→ attach Workflow RepositoryCheckout
→ implementation
```

This prevents planning against one baseline and silently implementing against another.

A Workflow that closes without repository mutation never needs a SourceLine. Research is the primary expected example.

Once materialized, the SourceLine belongs to that Workflow for its lifetime.

WIR is excluded: it owns neither an implementation SourceBaseline binding nor SourceLine.

Greenfield is special because no established `dev` baseline exists yet.

## 10. Project container and physical repository layout

The Project root is not required to be a Git working tree.

The preferred layout is:

```text
ChampCity_AI/
├── .champcity/
│   ├── project-state.sqlite
│   ├── repository.git/              # shared Git repository metadata
│   └── checkouts/
│       ├── <workflow-id>/            # on-demand Workflow checkouts
│       └── ...
├── Main/                             # permanent checkout of main
└── Dev/                              # permanent checkout of dev
```

`Main/` and `Dev/` are sibling working trees of the same Git repository.

The parent Project directory is a neutral Project container.

The semantic mapping is:

```text
Project
└── Repository
    ├── SourceLine: main
    │   └── RepositoryCheckout: Main/
    ├── SourceLine: dev
    │   └── RepositoryCheckout: Dev/
    └── Workflow SourceLines
        └── RepositoryCheckout: .champcity/checkouts/<workflow-id>/
```

Workflow checkouts are application-managed execution infrastructure and may be created/destroyed mechanically.

Main and Dev are durable Project-level checkouts.

This layout must not be implemented as a fake Git repository in the Project container.

## 11. MCP workspace boundary

ChampCity MCP workspace access is filesystem/Project access, not synonymous with a Git repository root.

A Project container may therefore be registered with MCP even when the container itself is not Git-backed.

The intended separation is:

```text
repo_toolbox
→ workspace-relative filesystem operations
→ Git backing not required

git_toolbox
→ explicit Repository / RepositoryCheckout target
→ Git required only for that selected target
```

Conceptually:

```text
MCP workspace: champcity_ai
root: <Project container>
gitBacked: false

RepositoryCheckouts:
  Main → <Project>/Main
  Dev  → <Project>/Dev
  Workflow → <Project>/.champcity/checkouts/<workflow-id>
```

MCP support for non-Git-backed Project roots is an early prerequisite of the recovery package.

## 12. Git ignore policy

Normal mechanical Git staging must continue to honor ordinary Git ignore semantics.

Greenfield bootstrap must also establish a repository `.gitignore` before the initial source baseline is committed.

The bootstrap rule is:

- preserve an existing `.gitignore`; never overwrite it;
- for a new repository, create a baseline ignore file before the first commit;
- include only safe common generated/local noise plus stack-specific additions when the stack is known;
- do not require the Project container's `.champcity/` directory to be ignored by the source repository because it is outside the Main/Dev checkout roots;
- normal staging must not force-add ignored paths unless a narrowly explicit operation requests it.

The current mechanical Git staging already respects `.gitignore` by default. The recovery work changes bootstrap behavior, not ordinary Git semantics.

## 13. Source ownership

Canonical SourceBinding, SourceCheckpoint, and IntegrationRecord semantics belong to the substantive Workflow instance.

They must not be structurally keyed to WorkIntake.

WIR provenance may explain why a Workflow exists, but the target Workflow owns its source lifecycle.

## 14. Workflow Hub

The Workflow Hub is a multi-instance dashboard.

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
  View Workflow SourceLines and integration topology
```

Opening one Workflow never mutates or invalidates another Workflow merely because both are active.

## 15. Structured Project State is the only current workflow authority

Structured Project State is the canonical runtime state model.

There is no permanent legacy/structured provider choice.

Repository Markdown may remain as:

- architecture/governance documentation;
- historical Evidence;
- generated projection/export;
- explicit imported Evidence.

It is not an alternate live workflow engine.

## 16. Legacy abandonment policy

There is no legacy-workflow migration requirement.

Pre-existing in-progress Markdown workflow instances are abandoned.

If that work still matters, the Operator starts a new current Workflow instance and may use old artifacts as Evidence/context.

Do not preserve or build:

- staged semantic migration of old Workflow instances;
- legacy/structured equivalence gating;
- provider-generation switching between two workflow engines;
- rollback from current Structured Project State to the legacy workflow engine;
- permanent legacy Workflow entry points.

Temporary coexistence inside a repair sequence is implementation staging only.

## 17. Per-card recovery governance

The Workflow Topology Recovery package is also the Phase 2 work-card calibration run.

GPT 6.0 Luna Medium implements one bounded card at a time.

After every card:

```text
Luna implementation
→ focused validation
→ Implementer Report
→ checkpoint commit
→ Architect code/evidence review
→ bounded repair if required
→ only then release the next card
```

There is no continuous multi-card authorization for this package.

This is deliberate: card quality and implementation drift are being measured independently.

## 18. Salvage rule

Preserve proven mechanics where ownership is correct.

Strong salvage candidates include:

- SQLite ProjectStateStore and backup/recovery;
- ProjectStateService history/revision/Decision/Evidence/Validation semantics;
- Workflow-specific planning profile content;
- `planExecutor` dependency/topology logic;
- Codex/App Server execution runtime;
- source-control provider mechanics;
- integration candidate and Integration Repair mechanics;
- reusable renderer presentations such as Codex execution controls, OperatorValidationPresentation, WorkCardRepairPresentation, WorkCardClosePresentation, and DocumentChatWorkspaceShell;
- Issue Resolution's multi-instance interaction model.

Move these behind the corrected Workflow ownership model rather than rewriting them solely because surrounding topology was wrong.

## 19. Acceptance invariants

The recovery is not complete until all are true:

1. the canonical initial Workflow type set is the eight types in §1;
2. Project Creation is one-time; all other types are repeatable;
3. WIR is optional and routing-only;
4. every substantive Workflow is directly startable;
5. multiple instances of the same repeatable type can coexist;
6. Workflow instances, not WIR, own source lifecycle state;
7. every substantive source-backed Workflow captures an exact baseline at creation;
8. SourceLines/checkouts materialize lazily only when source mutation is required;
9. New Project creation uses Project Creation / Greenfield, not WIR;
10. existing repositories without current state use Existing Project Registration, not Greenfield or WIR;
11. Workflow-specific intake/assessment/planning remains bespoke;
12. post-plan execution uses one shared kernel and reusable Workspace family;
13. Issue Resolution retains multi-instance behavior while using the shared post-plan kernel;
14. the Project container may be non-Git-backed;
15. Main and Dev are durable sibling RepositoryCheckouts;
16. MCP can expose the non-Git-backed Project container while Git tools target explicit checkouts;
17. greenfield source bootstrap establishes/preserves normal `.gitignore` behavior;
18. no production Workflow depends on legacy Markdown authority;
19. no legacy-to-current Workflow migration/provider coexistence path remains;
20. Source Control displays simultaneous Workflow-owned source topology;
21. creating/planning another Workflow does not require finishing the first;
22. checkout availability is execution capacity, not Workflow admission authority.
