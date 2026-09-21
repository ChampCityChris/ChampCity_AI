# ChampCity A/I Foundational Architecture Principles

**Status:** Adopted V2 foundational architecture baseline — September 14, 2026

## Purpose

This document records the foundational architectural principles governing the ChampCity A/I product family as ChampCity A/I Desktop and ChampCity A/I Server develop in parallel.

The companion `CHAMPCITY_PRODUCT_CAPABILITY_MODEL.md` answers the product question, **What does ChampCity A/I provide?**

This document answers the architectural question, **What rules govern how those capabilities are built, shared, hosted, and evolved across Desktop and Server?**

These principles are intended to prevent current Desktop implementation details from becoming accidental permanent architecture and to prevent Desktop and Server from diverging into independently implemented products.

---

## 1. Shared ChampCity Product Core

ChampCity A/I Desktop and ChampCity A/I Server are two deployment models of one product family.

They should share the same core product semantics for capabilities such as:

- Workflows & Governance;
- project-state semantics;
- project identity, Operator Decisions, dispositions, scope, and eligibility;
- repository policy and source-control semantics;
- AI runtime contracts;
- AI tool and capability contracts;
- Skills contracts;
- model/context/usage contracts; and
- other portable business rules that define ChampCity behavior.

The architecture must reject both of these failure modes:

```text
Desktop
   -> copied and modified into Server
```

and:

```text
Desktop implementation
Server independent reimplementation
```

The intended direction is:

```text
                    ChampCity Product Core
                       /             \
                      /               \
             Desktop Host          Server Host
```

Desktop-specific and Server-specific infrastructure may differ, but shared ChampCity behavior should be extracted and consumed rather than duplicated.

### Extraction principle

The current Desktop implementation is both the proven reference implementation and a source donor for shared behavior.

Server development should use **extraction on contact**:

1. identify the proven Desktop behavior needed by Server;
2. separate portable ChampCity semantics from workstation-specific assumptions;
3. establish a shared contract or core implementation;
4. make Desktop consume the shared behavior where practical; and
5. implement Server-specific infrastructure behind the same semantic boundary.

A broad rewrite of Desktop solely for architectural cleanliness is not required before Server work begins.

---

## 2. Shared Client Application, Multiple Shells

ChampCity should have one shared client application experience rather than independently developed Desktop and Server user interfaces.

The client should not define itself as an Electron application. Electron is the native host for ChampCity A/I Desktop.

The intended model is:

```text
                Shared ChampCity Client
                        |
             +----------+----------+
             |                     |
       Desktop Shell            Web Shell
         Electron                Browser
             |                     |
     Local ChampCity         ChampCity Server
        Services             Service Interfaces

```

### Desktop

ChampCity A/I Desktop may operate in standalone mode using local ChampCity services.

Desktop standalone and Server deployment are alternative operating modes. A Project has one canonical writable Project State location at a time; Desktop is not a writable offline/online peer of Server and no live bidirectional Project State synchronization is required.

### Server

ChampCity A/I Server should support a browser-delivered client and must not require Electron merely to use server-backed ChampCity capabilities.

### Client-service boundary

The shared UI should consume ChampCity service contracts instead of directly owning product decisions, workflow transitions, or depending on Electron-specific mechanisms.

Conceptually:

```text
UI
  -> Project Service
  -> Workflow Service
  -> Repository Service
  -> Runtime Service
  -> Project State Service
```

A Desktop adapter satisfies those services through local IPC/local services. The Server browser client satisfies them through remote service interfaces. A future separately installed remote client is optional and must not create a second canonical writable Project State location for the Project.

Shell-specific functionality such as tray behavior, native file pickers, local notifications, clipboard integration, native context menus, or similar host capabilities should remain behind explicit client/host capability boundaries.

---

## 3. Structured Project State Is the Common State Architecture

ChampCity should move away from Markdown documents as the authoritative project-state model.

This is not a Server-only change. Desktop and Server should converge on the same structured project-state domain model during Server development.

The deployment difference is primarily where the state is stored:

```text
ChampCity A/I Desktop
    Structured Project State
        -> local durable database

ChampCity A/I Server
    Structured Project State
        -> server-owned durable database
```

The target relationship is:

```text
Today

Markdown Artifact
      -> parsed/interpreted as project state

Future

Structured Project State
      -> deterministic retrieval
      -> AI Memory/context construction
      -> rendered card / timeline / report / Markdown export when useful
```

### Why this is required

The artifact-centric model creates unnecessary context and token cost because models repeatedly parse large human-readable documents to recover relatively small amounts of structured state.

It also creates an undesirable foundation for AI Memory. Memory should retrieve bounded authoritative facts and relevant history rather than repeatedly re-ingesting the full document corpus.

### Documents remain useful

Markdown, reports, cards, timelines, and other documents may remain important human-readable representations, exports, evidence packages, or interoperability formats.

They should not be the storage format that defines the future ChampCity domain model.

### State and memory remain distinct

Structured Project State is authoritative.

AI Memory provides retrieval and recall over relevant project knowledge. Memory must not silently replace deterministic authoritative state when that state exists.

---

## 4. Deterministic Mechanics Belong to ChampCity

When a task can be performed deterministically and reliably through ordinary software, ChampCity should generally perform it in code rather than consume AI inference for the mechanical work.

AI workers should be used where reasoning, judgment, synthesis, design, investigation, implementation decisions, or review are required.

ChampCity should own mechanical operations such as:

- identifier generation;
- hashes and checksums;
- serialization;
- JSON or other structured-data generation where the structure is deterministic;
- schema validation;
- deterministic metadata maintenance;
- database relationships and lineage;
- dependency/state checks;
- repository inspection;
- Git staging, commits, branch operations, integration, and other deterministic source-control mechanics;
- changed-file calculation;
- token/context accounting;
- capability and permission enforcement; and
- other repeatable bookkeeping or validation that does not require model judgment.

The intended division is:

```text
AI
    reasoning
    investigation
    judgment
    architecture/design
    implementation decisions
    semantic review

ChampCity
    mechanics
    bookkeeping
    serialization
    deterministic validation
    state transitions
    source-control operations
    measurable accounting
```

This principle reduces token cost, lowers model-error exposure, improves repeatability, and makes behavior easier to test.

It also reinforces the purpose of **Repository & Source Control Management**: agents may request or reason about source-control actions, but ChampCity should execute the mechanical source-control work through controlled deterministic services whenever possible.

---

## 5. AI Runtime Independence

ChampCity must own the semantic contract for running AI workers rather than allowing one current external runtime to define the permanent architecture.

Codex/App Server is the current runtime implementation source for many capabilities. It should become one adapter to a ChampCity-owned Agent Runtime Interface.

Conceptually:

```text
             ChampCity Agent Runtime Interface
                          |
          +---------------+---------------+
          |               |               |
     Codex Adapter   Local Runtime    Future Runtime
                          |
                    Local LLMs / other
                    inference providers
```

The ChampCity workflow should express semantic intent such as:

> Run an Implementer with this bounded scope, these constraints and capabilities, this project context, and these completion requirements.

It should not permanently encode a provider-specific instruction such as:

> Start a Codex thread using these Codex-only semantics.

### Why this matters

Frontier hosted models may be required for current ChampCity workloads, but that should not become a permanent product assumption.

As local models, inference hardware, and agent runtimes improve, ChampCity should be able to use them where they satisfy the required capability, context, and quality contracts.

Runtime independence also enables different roles or tasks to use different models or runtimes without redefining the workflow architecture.

### Source-control provider independence

The same adapter principle applies to source control.

Git is the current and first source-control provider, but Git's command model must not define the ChampCity workflow model. RepositoryService owns semantic Repository, RepositoryCheckout, SourceLine, SourceRevision, ImplementationRevision, IntegrationTarget, and IntegrationCandidate behavior. A Git provider translates those semantics into Git refs, commits, worktrees, index/staging, merge operations, and remotes.

Conceptually:

```text
          ChampCity RepositoryService
                    |
          Source-Control Provider Contract
                    |
        +-----------+-----------+
        |                       |
   Git Provider            Future Provider
        |
 branches / commits /
 worktrees / index /
 fetch / push / merge
```

The Operator and normal AI workflow should reason about engineering work and durable revisions, not detached HEAD, stash, staging/index state, or worktree plumbing. Provider-specific terminology remains available for diagnostics and advanced tooling where useful.

The controlling contract is `CHAMPCITY_SOURCE_CONTROL_PROVIDER_ARCHITECTURE.md`; concurrent writable checkout mechanics are specialized by `CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md`.

---

## 6. Canonical Domain Vocabulary

ChampCity must distinguish several concepts that have historically been overloaded by terms such as `workspace` and `workstation`.

The following terminology is canonical for new architecture work.

| Term | Canonical ChampCity meaning |
|---|---|
| **Project** | The durable thing being created, maintained, or developed through ChampCity. |
| **Workspace** | A task-oriented ChampCity working surface or station where a particular type of work is performed. |
| **Repository** | A source/content repository associated with a Project and managed through Repository & Source Control Management. |
| **RepositoryCheckout** | A concrete readable/writable working copy of a Repository used by an Execution Environment or local Operator context. |
| **SourceLine** | A provider-neutral movable line of development, such as a Work Item source line or integration target. |
| **SourceRevision** | An immutable source-control-provider-backed state of a Repository. |
| **ImplementationRevision** | The durable SourceRevision produced as the completed source result of a bounded Work Item implementation. |
| **Host** | A physical or virtual machine running one or more ChampCity components or services. |
| **Execution Environment** | The bounded environment in which implementation commands, builds, tests, tools, or related engineering execution occur. |
| **Client** | A user-facing ChampCity application that presents the product and communicates with ChampCity services. |
| **Runtime** | The agent execution system used to run an AI worker. |

### Workspace is a working station

A Workspace should be understood using the workshop/station model:

```text
Project
   -> Project Intake Workspace
   -> Project Planning Workspace
   -> Architect Workspace
   -> Work Implementation Workspace
   -> Validation Workspace
   -> Issue / Repair Workspace
   -> other task-oriented Workspaces
```

The Project is the thing moving through the process. A Workspace is the station at which a particular type of work is performed.

A Workspace is therefore not synonymous with:

- a Project;
- a Repository;
- a filesystem root;
- a Host; or
- an Execution Environment.

### Legacy `workspaceId` terminology

The current Desktop/MCP harness uses `workspaceId` for a concept that is effectively a registered repository identity and authorization boundary.

For example:

```text
workspaceId = champcity_ai
repository = ChampCity_AI
```

This legacy name must not establish the future semantic meaning of Workspace.

Existing Desktop APIs may retain the legacy identifier temporarily for compatibility during migration, but new shared architecture should move toward explicit identities such as:

```text
projectId
repositoryId
workspaceType / workspaceInstanceId
hostId
executionEnvironmentId
```

Compatibility adapters may translate legacy `workspaceId` behavior while Desktop is migrated.

---

## 7. Control Plane and Execution Plane Are Separate Concepts

ChampCity should distinguish the system that governs development from the environments that actually perform engineering execution.

### Control Plane

The Control Plane owns or coordinates concerns such as:

- Projects;
- Workflows & Governance;
- structured Project State & History;
- AI Memory;
- Operator Decisions, scope, eligibility, and policy;
- model/runtime selection and routing;
- scheduling/orchestration; and
- durable coordination state.

### Execution Plane

The Execution Plane provides the places and workers that perform actions such as:

- repository checkout/worktree operations;
- shell execution;
- builds;
- tests;
- package/tool execution;
- Implementer execution;
- other AI worker execution requiring engineering resources; and
- future isolated or disposable development environments.

Desktop may colocate the Control Plane and Execution Plane on one local Host.

Server architecture must not require them to be colocated.

This preserves a future topology such as:

```text
ChampCity Server / Control Plane
            |
      +-----+------+------------+
      |            |            |
Execution      Execution      Local or
Worker A       Worker B       remote worker
      |            |
Container      GPU Host / VM
```

The immediate architecture does not need to implement distributed workers. It only needs to avoid making the canonical Project State location and execution placement inseparable by design.

---

## Architectural Consequences

These principles imply several constraints for ongoing Desktop and Server development.

### Shared behavior should not be duplicated

When Server requires a behavior already proven in Desktop, portable domain logic should be extracted or shared rather than copied.

### Desktop remains a first-class product

Desktop should migrate toward the same structured project-state and shared-core architecture rather than remain indefinitely on a legacy Markdown-authoritative path.

### Server should not inherit workstation assumptions by default

Local filesystem paths, Windows-specific lifecycle behavior, Electron process topology, local `userData`, tray behavior, or other Desktop infrastructure must not be promoted into shared product semantics merely because the current implementation uses them.

### The client should not own product decisions or workflow transitions

The shared user interface should present state and request actions through ChampCity services. Workflow eligibility, durable state transitions, Operator Decision records, and other business rules belong in the shared core/control plane rather than renderer-specific logic.

### Repository mechanics should be automated

Repository and source-control operations should continue moving toward deterministic ChampCity-owned services so AI inference is reserved for work requiring actual model reasoning.

---

## Relationship to Product Capability Model

`CHAMPCITY_PRODUCT_CAPABILITY_MODEL.md` remains the canonical high-level definition of what ChampCity provides.

This document governs the architectural interpretation of those capabilities across Desktop and Server.

Future detailed architecture documents may define individual capabilities, service contracts, persistence models, runtime adapters, client interfaces, execution environments, or migration plans, but they should remain consistent with these foundational principles unless an explicit architecture decision supersedes one of them.
