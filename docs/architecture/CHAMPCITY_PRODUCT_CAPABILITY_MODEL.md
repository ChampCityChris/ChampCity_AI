# ChampCity A/I Product Capability Model

**Status:** Adopted V2 product-capability baseline — September 14, 2026

## Purpose

This document defines ChampCity A/I from the perspective of the capabilities the product provides rather than the technologies used to implement those capabilities.

The purpose of this model is to establish the top-level product outline before dividing responsibility between ChampCity A/I Desktop and ChampCity A/I Server.

Technologies and implementation mechanisms such as Electron, MCP, Codex, SQLite, Git, OAuth, Docker, or specific model providers belong beneath these capability domains. They should not define the product taxonomy themselves.

Implementation and deployment boundaries for these capabilities are governed by `CHAMPCITY_FOUNDATIONAL_ARCHITECTURE_PRINCIPLES.md`.

## Product Definition

ChampCity A/I is a governed AI software-development platform.

It coordinates Operator-directed product decisions, AI workers, development workflows, project state, tools, repositories, development environments, reusable skills, model/runtime behavior, and durable project knowledge.

Desktop and Server should be treated as two deployment models for this shared product capability set rather than as unrelated products.

## Top-Level Capabilities

### 1. Workflows & Governance

Owns the structured development methodology and the rules governing how work advances.

Current and expected responsibilities include:

- Development workflows;
- Feature workflows;
- Issue, Fix, and Repair workflows;
- Architect, Implementer, Reviewer, Validator, and Operator role transitions;
- lifecycle and state transitions;
- planning, implementation, review, validation, and closeout;
- genuine Operator decision boundaries and human-acceptance requirements;
- task-oriented Workspaces through which workflow activities are performed;
- Guided Mode;
- future Power Workbench behavior; and
- future bounded autonomous workflows.

The product capability is broader than orchestration. ChampCity does not merely sequence agents; it preserves Operator direction, assigns bounded responsibility, computes legal state transitions, and defines what proof is required before work can advance. No service, workflow, or agent becomes an independent discretionary decision principal.

A **Workspace** is a task-oriented ChampCity working surface or station where a particular type of work occurs. Examples include Project Intake, Project Planning, Architect, Work Implementation, Validation, Issue Resolution, and Repair Workspaces. A Workspace is not synonymous with a Project, Repository, Host, or Execution Environment.

### 2. AI Runtime & Execution

Owns the execution environment and lifecycle through which AI workers operate.

Current and expected responsibilities include:

- worker execution;
- agent and thread lifecycle;
- runtime discovery and selection;
- runtime abstraction;
- streaming execution events;
- interruption and steering;
- approval and permission flows;
- sandboxing and execution policy;
- tool-call execution;
- MCP connectivity;
- Background Agent and service-host execution where applicable; and
- compatibility with multiple agent runtimes.

Codex/App Server is the current implementation source for many runtime capabilities, but it should remain a selectable runtime rather than define ChampCity's permanent architecture.

The long-term direction is a ChampCity-owned Agent Runtime Interface describing the semantic capabilities a compatible runtime must provide.

### 3. AI Tools

Owns controlled capabilities that AI workers can invoke to inspect, modify, validate, or interact with a project and its environment.

Current and expected tool families include:

- repository inspection and mutation;
- Git/source-control operations;
- file and patch operations;
- browser access;
- screenshot and evidence access;
- diagnostics;
- test and execution capabilities;
- external integrations; and
- future service-specific tools.

MCP is one delivery mechanism for these tools, not the capability itself.

Future ChampCity architecture should support capability packs that resolve the minimum legal tool set from role, task scope/constraints, workflow state, access/policy, and runtime capability rather than exposing every available tool to every worker.

### 4. Project State & History

Owns the canonical durable record of the project: both what is currently true and what happened previously.

Current and expected responsibilities include:

- project decisions;
- findings and root causes;
- bounded solutions;
- plans;
- Work, Fix, and Repair state;
- implementation results;
- validation records;
- evidence;
- Decisions and disposition records;
- relationships and lineage;
- supersession semantics;
- historical state; and
- human-readable views and exports.

The future direction is to invert the current artifact-centric model:

```text
Today
Markdown Artifact
    -> interpreted as project state

Future
Structured Project State
    -> deterministic retrieval
    -> AI Memory/context construction
    -> rendered as Markdown, cards, timelines, reports, or task packets when needed
```

Structured Project State is the common target architecture for both ChampCity A/I Desktop and ChampCity A/I Server. Desktop should keep its durable project-state database locally; Server should provide server-owned durable project state.

Documents should become views or exports of structured project state rather than the storage format defining the domain model.

### 5. AI Memory

Owns intelligent recall and context retrieval over project knowledge.

Expected responsibilities include:

- demand-loaded context;
- deterministic retrieval of canonical current project knowledge;
- semantic historical recall;
- relevant prior-decision retrieval;
- project context packets;
- memory-backed role transitions;
- bounded worker checkpoints; and
- later cross-session or broader user/project memory where appropriate.

Project State & History and AI Memory must remain conceptually distinct:

> Project State & History determines what is true and what happened. AI Memory determines what knowledge should be recalled for the work occurring now.

Memory should not become an alternative canonical state source when deterministic Project State exists.

### 6. AI Skills

Owns reusable ChampCity-governed expertise for performing specialized classes of work.

Expected responsibilities include:

- a canonical skill registry;
- skill discovery;
- skill assignment;
- explicit skill versioning;
- standards and policy binding;
- declarative runtime capability requirements;
- role and lifecycle awareness;
- Design, Implement, Audit, or other operating modes where applicable; and
- portability across model providers and agent runtimes.

UI Engineering is intended as an early proving skill, but the Skills Engine should be general-purpose.

A ChampCity skill describes how specialized work should be performed. It should not be permanently tied to one external runtime or model provider.

### 7. Model, Context & Usage Management

Owns model/provider choice and the resource economics surrounding AI execution.

Current and expected responsibilities include:

- model discovery;
- model selection;
- reasoning-effort selection;
- provider selection;
- runtime/model compatibility;
- context-window awareness;
- explicit context budgeting;
- context compaction;
- token estimation and accounting;
- prompt-cache accounting;
- usage telemetry;
- cost estimation and accounting; and
- future model routing or model recommendations.

A Token Estimator is therefore a feature of this broader capability rather than a separate top-level product domain.

### 8. Repository & Source Control Management

Owns repositories as managed ChampCity resources and the deterministic source-control operations performed against them.

Current and expected responsibilities include:

- repository registration and binding;
- repository identity;
- repository inspection;
- repository access and containment boundaries;
- controlled repository mutation;
- repository ecosystem awareness;
- RepositoryCheckout identity and lifecycle;
- provider-neutral SourceLine and SourceRevision identity;
- pending change-set and durable implementation-revision capture;
- diffs;
- source-control history;
- source-line management;
- source synchronization;
- integration-candidate and integration-target mechanics;
- readiness and pre-commit checks;
- deterministic hashes, changed-file calculations, and source-control bookkeeping where required;
- future remote repository management; and
- future multi-repository project relationships.

Git Management is a major current implementation of this domain but is too narrow to name or define the capability. Git is the first source-control provider; ChampCity owns the semantic source-control model and RepositoryService contract above it. Provider-specific concepts such as branches, worktrees, staging/index state, commits, fetch/push, and merge mechanics remain adapter/diagnostic details except where an advanced provider-specific surface intentionally exposes them.

The controlling provider-neutral architecture is `CHAMPCITY_SOURCE_CONTROL_PROVIDER_ARCHITECTURE.md`. The concurrent writable-checkout specialization is `CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md`.

Repository Management and AI Tools also have different responsibilities:

> Repository & Source Control Management owns and understands repositories and performs deterministic repository mechanics. AI Tools provides controlled interfaces through which AI workers request or interact with those capabilities.

Mechanical source-control work should normally be executed by ChampCity code rather than delegated to AI inference when no model judgment is required.

### 9. Project Management

Owns the durable product-level identity and configuration of the thing being created, maintained, or developed through ChampCity.

Current and expected responsibilities include:

- project creation and selection;
- active-project identity;
- project configuration;
- project boundaries;
- associations between a Project and its repositories, project state, development environments, integrations, and other resources;
- project-level Operator Decisions, access rules, and policy;
- future multi-repository project relationships; and
- future Server concerns such as ownership, access, isolation, and shared projects.

A Project is distinct from both a Repository and a Workspace.

> A Project is the durable thing being developed. A Repository contains source/content associated with that Project. A Workspace is the task-oriented station where a particular kind of ChampCity work is performed.

The current Desktop/MCP use of `workspaceId` as a registered repository identity is legacy terminology and should not define the future product meaning of Workspace.

### 10. Development Environments

Owns the environment in which development work is performed.

Current and expected responsibilities include:

- environment discovery;
- development capability detection;
- preflight checks;
- repository ecosystem detection;
- package and tooling availability;
- environment provisioning;
- environment refresh;
- local workstation execution; and
- future containerized, VM-based, remote, disposable, or server-hosted development environments.

This capability is separate from AI Runtime & Execution:

> AI Runtime & Execution determines how an AI worker runs. Development Environments determines where the engineering work and its tools execute.

## Supporting Concerns That Do Not Currently Require Separate Top-Level Capabilities

### Validation & Evidence

Validation and evidence are substantial but span two existing capabilities rather than requiring a separate top-level domain.

- Workflows & Governance determines what must be proven and when validation is required.
- Project State & History stores the evidence, validation results, lineage, and final disposition.

### Power Workbench

Power Workbench is an interaction and operating mode over Workflows, Runtime, Memory, and Project State rather than an independent platform capability.

Guided Mode and Power Workbench should share the same underlying project semantics and durable state.

### Autonomous Development

Autonomous development should emerge from Workflows & Governance, AI Runtime & Execution, and AI Memory.

The preferred model is bounded workers connected by durable checkpoints rather than one indefinitely growing autonomous context.

### Integrations

External integrations should remain within AI Tools until the integration ecosystem becomes large enough to justify a separate product capability.

### Product Infrastructure

Authentication, OAuth, installer behavior, service lifecycle, tray behavior, startup registration, diagnostics, process ownership, update behavior, and similar concerns are critical platform infrastructure but are not themselves answers to the product-level question, "What does ChampCity provide?"

## Product Capability Outline

```text
ChampCity A/I

1. Workflows & Governance
2. AI Runtime & Execution
3. AI Tools
4. Project State & History
5. AI Memory
6. AI Skills
7. Model, Context & Usage Management
8. Repository & Source Control Management
9. Project Management
10. Development Environments
```

## Desktop and Server Implication

This capability model should be defined before assigning entire features to Desktop or Server.

For each capability, later architecture work should separately determine:

- where presentation occurs;
- where genuine Operator Decision boundaries and canonical state/write ownership reside;
- where durable state resides; and
- where execution occurs.

A capability does not need to be wholly client-side or wholly server-side. For example, a Desktop client may present AI Memory while a Server owns its durable storage and retrieval services.

Desktop and Server should therefore implement or consume the same conceptual ChampCity capabilities while differing in deployment, canonical state location/ownership, access/security policy, and execution location.

The foundational rules for that shared implementation—including the Shared Product Core, shared client/multiple-shell model, structured project-state direction, deterministic-mechanics principle, runtime independence, canonical domain vocabulary, and Control Plane/Execution Plane separation—are defined in `CHAMPCITY_FOUNDATIONAL_ARCHITECTURE_PRINCIPLES.md`.
