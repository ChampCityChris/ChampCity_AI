# ChampCity A/I Repository and Product Source Layout Decision

**Status:** Adopted architecture decision — September 14, 2026  
**Date:** 2026-09-13  
**Scope:** ChampCity A/I Product Core, Desktop, Server, Web client, shared client application, and extraction source layout

This is the V2 production-source layout decision. The [corpus index](CHAMPCITY_V2_ARCHITECTURE_CORPUS_INDEX.md) records precedence and source/identity/version-compatibility dependencies. In package dependency diagrams, arrows mean **importer -> dependency**. Deployment/composition illustrations are labeled separately and do not reverse that import convention.

## 1. Decision Summary

ChampCity A/I should evolve toward a **single product-source monorepo** in the existing `ChampCity_AI` Git repository.

Desktop, Server, and Web should be independently buildable and independently releasable applications inside that repository. Shared Product Core, the shared client application, Project State, runtime contracts, repository management, and service contracts should be private workspace packages consumed by those applications.

The recommended target is therefore conceptually:

```text
ChampCity_AI/
├── apps/
│   ├── desktop/
│   ├── server/
│   └── web/
├── packages/
│   ├── product-core/
│   ├── client/
│   ├── service-contracts/
│   ├── runtime-contracts/
│   ├── project-state/
│   └── repository-management/
├── tools/
├── test/
├── docs/
├── package.json
├── package-lock.json
└── tsconfig.json
```

This is a **source-control and dependency-layout decision**, not a requirement to move all current files immediately.

The key rule is:

> One Git repository should contain the ChampCity product family while package and application boundaries enforce architecture. Git repository boundaries should not be used as a substitute for Product Core boundaries.

Separate product versions do **not** require separate Git repositories. Desktop and Server may have independent release/version lifecycles while consuming the same source revision of private shared packages.

Brain_Dump remains a separate architecture/design repository. This decision concerns the production product source in `ChampCity_AI`.

---

## 2. Why This Decision Fits the Existing Architecture

This decision follows directly from the architecture already established in Brain_Dump.

### 2.1 The Foundational Architecture already defines one product family

`CHAMPCITY_FOUNDATIONAL_ARCHITECTURE_PRINCIPLES.md` defines the deployment composition:

```text
                    ChampCity Product Core
                       /             \
                      /               \
             Desktop Host          Server Host
```

It also defines one shared client application with multiple shells:

```text
                Shared ChampCity Client
                        |
             +----------+----------+
             |                     |
       Desktop Shell            Web Shell
         Electron                Browser
```

A source layout should reinforce those decisions. A repository-per-product layout would make the shared Core and shared client cross-repository dependencies exactly while they are undergoing the most rapid extraction and change.

### 2.2 The Source Extraction Map requires extraction, not duplication

`SOURCE_EXTRACTION_MAP.md` explicitly establishes:

- extract shared behavior on contact;
- do not copy Desktop services into Server;
- classify behavior by product semantics rather than current Electron process location;
- Desktop and Server must share domain/application behavior;
- platform-specific implementations belong behind adapters;
- Server must not inherit the Desktop repository artifact tree as its database.

The map also identifies the first extraction units as identity/resource boundaries, workflow state, work-product/evidence state, provider-neutral execution contracts, tool/access-policy core, and repository/source-control ports.

Those are high-churn boundaries during the migration. Keeping them in the same Git repository allows a single change to extract a behavior, update Desktop to consume it, add conformance tests, and later add Server consumption without package publication or cross-repository synchronization.

### 2.3 The Client-Service Contract requires the same client API in two hosts

`CHAMPCITY_CLIENT_SERVICE_CONTRACT.md` and `CHAMPCITY_CLIENT_SERVICE_DESKTOP_SOURCE_MAPPING.md` define a deployment-neutral service surface used by both local Desktop and Server-backed clients.

The shared client therefore needs to compile against a stable ChampCity service contract, not against Electron IPC and not directly against Server HTTP endpoints.

That relationship is easiest to enforce with this import direction:

```text
packages/client       -> packages/service-contracts
packages/product-core -> packages/service-contracts
```

The host composition supplies the concrete transport/implementation.

### 2.4 Structured Project State is explicitly shared

`CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md` defines one logical state model for both products:

- Desktop persists Project State locally;
- Server persists Project State centrally;
- both consume the same logical domain contracts.

That argues for one `project-state` package containing the canonical domain model and persistence ports, with local/server persistence adapters kept outside the package.

### 2.5 Runtime abstraction is explicitly provider-neutral

`CHAMPCITY_AGENT_RUNTIME_INTERFACE_CONTRACT.md` defines a portable Agent Runtime Interface consumed by ChampCity orchestration and implemented by Codex or future runtimes.

That contract should therefore be its own environment-neutral package rather than remain under the Desktop Electron source tree.

### 2.6 Deterministic mechanics favor one product source graph

`CHAMPCITY_DETERMINISTIC_AUTOMATION_BOUNDARIES.md` requires Git operations, IDs, hashes, serialization, state calculations, token accounting, and other mechanical work to be owned by ChampCity code.

Creating several product repositories during extraction would add mechanical version coordination, package publication, dependency bumps, cross-repository branch management, and compatibility bookkeeping before those boundaries are stable.

That is the opposite of the stated direction. The architecture should reduce repository mechanics, not manufacture more of them.

---

## 3. Current Repository Evidence

The recorded `ChampCity_AI` source audit describes a single Desktop-oriented npm package:

- root package is private;
- one `package-lock.json` is authoritative;
- Electron, React, MCP, and Codex dependencies live in one package;
- one root `tsconfig.json` compiles all `src/**/*.ts` and `src/**/*.tsx`;
- that TypeScript configuration exposes both `ES2022`/Node and DOM types across the entire source tree;
- Vite treats `src/renderer` as the renderer application root;
- production code is organized under `src/main`, `src/preload`, `src/renderer`, and `src/shared`.

The Source Extraction Map inventories 177 source files and demonstrates that the current folders are process boundaries, not future product-domain boundaries.

This is an appropriate starting point for a workspace conversion. It is not evidence that the Electron topology should survive as the architecture.

The current root configuration also illustrates why package boundaries are valuable: a single compiler environment makes Node, DOM, and Electron assumptions easier to leak into code that is supposed to become portable. Separate workspace packages can use separate TypeScript configurations and make those dependencies explicit.

These are prior audit statements, not a new production-source inspection performed during document reconciliation. A reproducible source snapshot, dirty-file manifest, and criterion-to-characterization-test/report trace remain F21 dependencies. Document hashes alone do not prove source or test coverage.

---

## 4. Options Considered

### Option A — Separate repositories for Desktop, Server, Core, and Client

Example:

```text
ChampCity_Desktop
ChampCity_Server
ChampCity_Core
ChampCity_Client
```

#### Benefits

- strong source-control isolation;
- independent repository permissions;
- independent CI and release histories;
- useful if different organizations eventually own the products.

#### Costs in the current migration

- extraction of one Desktop behavior would commonly require coordinated changes in two or more repositories;
- shared packages would need publishing, artifact feeds, Git dependencies, or another cross-repository dependency mechanism;
- contract evolution would require version coordination before contracts are stable;
- shared client changes could require synchronized Desktop and Server dependency upgrades;
- characterization tests would be split across repositories;
- repository/tooling/agent context would be fragmented;
- the migration would spend more effort maintaining package versions and compatibility than proving the architectural boundaries.

#### Assessment

Not recommended for the current phase.

This would turn a source-extraction problem into a distributed version-management problem.

---

### Option B — Keep the current single-package repository

Example:

```text
src/main
src/preload
src/renderer
src/shared
```

#### Benefits

- lowest immediate change;
- current build continues unchanged;
- no workspace tooling required.

#### Costs

- Electron process topology continues to masquerade as product architecture;
- Product Core has no mechanically enforceable boundary;
- Node/Electron/DOM dependency leakage remains easy;
- shared client and host shell remain mixed;
- Server additions would either enter `src/main` or create ad hoc parallel folders;
- the Source Extraction Map would not have a clear destination for extracted behavior.

#### Assessment

Not acceptable as the target architecture.

It is suitable only as the migration source.

---

### Option C — One product monorepo with independently buildable apps and private shared packages

Example:

```text
apps/
packages/
```

#### Benefits

- atomic extraction changes across donor Desktop code and new shared packages;
- one source revision proves Desktop/Core/Server compatibility;
- shared client and service contracts can evolve together;
- package boundaries still enforce platform separation;
- independent app builds and release versions remain possible;
- shared package publication is unnecessary while packages remain internal;
- characterization and conformance tests can cover multiple implementations in one repository;
- future repository separation remains possible because package boundaries already define extraction seams.

#### Costs

- root build/test tooling must become workspace-aware;
- package dependency direction must be governed explicitly;
- CI should eventually become path/workspace aware;
- careless package creation can produce a fragmented pseudo-microservice architecture inside one repository.

#### Assessment

**Recommended.**

It best matches the architecture and minimizes migration coordination cost without sacrificing deployment or release independence.

---

## 5. Recommended Target Layout

The target should begin with a small number of meaningful boundaries rather than one package per Product Capability.

```text
ChampCity_AI/
│
├── apps/
│   ├── desktop/
│   │   ├── src/
│   │   │   ├── main/
│   │   │   ├── preload/
│   │   │   ├── renderer/
│   │   │   ├── adapters/
│   │   │   └── composition/
│   │   ├── assets/
│   │   ├── packaging/
│   │   └── package.json
│   │
│   ├── server/
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── adapters/
│   │   │   ├── composition/
│   │   │   └── host/
│   │   └── package.json
│   │
│   └── web/
│       ├── src/
│       │   ├── bootstrap/
│       │   └── adapters/
│       └── package.json
│
├── packages/
│   ├── product-core/
│   ├── client/
│   ├── service-contracts/
│   ├── runtime-contracts/
│   ├── project-state/
│   └── repository-management/
│
├── tools/
│   └── migration/
│
├── test/
│   ├── contract/
│   ├── integration/
│   └── migration/
│
├── docs/
├── scripts/
├── package.json
├── package-lock.json
└── tsconfig.json
```

This is a target ownership model. Exact subordinate folders may change as implementation proves the boundaries.

---

## 6. Package Responsibilities

### 6.1 `packages/product-core`

Owns portable ChampCity product behavior.

Expected contents include:

- Workflows & Governance state machines and application services;
- Project and Project Management semantics;
- Operator Decision/disposition policy;
- AI Memory orchestration/policy;
- Skills orchestration/policy;
- model/context/usage policy;
- AI tool authorization semantics;
- environment capability/preflight policy;
- cross-capability orchestration;
- application commands/queries that implement the semantic service contract.

It MUST NOT import:

- Electron;
- React;
- browser globals;
- direct `node:fs`;
- Windows APIs;
- Codex-specific protocols;
- HTTP/server framework APIs;
- SQLite/Postgres/ORM implementations.

`product-core` should be internally organized by capability, but ChampCity should **not** immediately create a package for every capability. A package boundary is justified when it enforces a real dependency/runtime boundary, not merely because a heading exists in the Product Capability Model.

### 6.2 `packages/client`

Owns the shared ChampCity React application experience.

Expected contents include:

- common Workspaces;
- navigation and workflow presentation;
- project/phase/work-item/issue views;
- design system and reusable UI components;
- shared view-state logic;
- service-driven query/command interaction;
- semantic event handling.

It MUST NOT:

- import Electron;
- import Node filesystem/process APIs;
- import `product-core` directly;
- know whether a request is satisfied through Electron IPC or HTTP/WebSocket;
- own authoritative workflow transitions.

The client consumes `service-contracts` through an injected client/service gateway.

### 6.3 `packages/service-contracts`

Owns the deployment-neutral application service surface defined by `CHAMPCITY_CLIENT_SERVICE_CONTRACT.md`.

This includes service interfaces, command/query DTOs, semantic events, revision expectations, error/result shapes, and stable identifiers required at the client/service boundary.

It exists so both of these can conform to the same semantic API:

```text
Desktop renderer -> local Desktop transport -> local ChampCity services
Web client       -> Server transport        -> Server ChampCity services
```

The contract is semantic. It is not an Electron IPC contract and not an HTTP route definition. The diagram above depicts request flow, not package imports.

### 6.4 `packages/project-state`

Owns the canonical Structured Project State domain model and storage-facing ports.

Expected contents include:

- Project;
- Project Resource;
- Finding;
- Root Cause;
- Bounded Solution;
- Work Item;
- Validation;
- Evidence metadata;
- Decision;
- Relationship;
- lineage/supersession/revision semantics;
- domain validation/invariants;
- persistence repository interfaces;
- transaction/unit-of-work contracts where appropriate.

It MUST NOT contain SQLite- or Server-database-specific persistence.

Desktop and Server persistence implementations remain adapters.

### 6.5 `packages/runtime-contracts`

Owns the ChampCity Agent Runtime Interface.

Expected contents include:

- runtime discovery/capability contracts;
- worker/thread/turn lifecycle;
- normalized events;
- interruption/steering;
- approvals/user-input suspension;
- tool-call interaction contracts;
- sandbox/capability declarations;
- usage telemetry contracts;
- normalized runtime failures;
- conformance types.

It MUST NOT contain Codex App Server transport, process launch, Electron service-host lifecycle, tray behavior, or Server process-host implementation.

### 6.6 `packages/repository-management`

Owns semantic Repository & Source Control Management behavior and the ports through which deterministic mechanics execute.

Expected contents include:

- repository identity/resource semantics;
- bounded task-scope/access/policy enforcement;
- path/containment policy independent of concrete filesystem APIs;
- change-set/patch semantics;
- source-control operation policy;
- readiness/pre-commit semantics;
- diff/history/status models;
- deterministic operation receipts;
- interfaces implemented by local Git/filesystem or future remote repository adapters.

It MUST NOT become the new home for Markdown Project State.

The future rule remains:

> Repository state is not Project State.

---

## 7. Application Responsibilities

“Desktop host” and “Server host” below name application composition responsibilities. Canonical `Host` identity still means a physical or virtual machine under the Foundational Architecture Principles; a process or service composition module is not a new machine identity. Detailed service-instance/Host identity mapping remains open.

### 7.1 `apps/desktop`

`apps/desktop` is the ChampCity A/I Desktop host, not the shared product implementation.

It owns:

- Electron `main` process;
- preload/context bridge;
- Electron IPC transport implementation;
- tray and background-agent presentation;
- Windows login/startup/install behavior;
- native menus, dialogs, clipboard, notifications, and browser-window behavior;
- local composition root;
- local Project State persistence adapter;
- local repository/filesystem adapter wiring;
- local secrets/configuration adapter;
- Windows environment adapters;
- Desktop packaging and branding integration;
- thin renderer bootstrap that loads `packages/client`.

Desktop standalone mode is achieved by composing the shared Product Core with local adapters. It does not require a duplicate Desktop-only Core.

### 7.2 `apps/server`

`apps/server` is the ChampCity A/I Server host.

It owns:

- Server process composition;
- authentication/principal establishment;
- authorization enforcement at the host/trust boundary;
- remote API/event transports;
- server-owned durable persistence adapters;
- server configuration/secrets;
- server lifecycle/health;
- worker/resource coordination specific to server deployment;
- server-grade security, isolation, and multi-user concerns.

It imports the same Product Core and semantic contracts used by Desktop.

It MUST NOT copy Desktop workflow services or reuse Desktop Electron/Windows assumptions.

### 7.3 `apps/web`

`apps/web` is the browser shell for `packages/client`.

It should remain thin:

- browser bootstrap;
- Server transport adapter;
- browser-only host capabilities;
- browser build/deployment configuration.

The Web app should not become a second independently implemented ChampCity UI.

Server may serve the resulting Web assets, but the Web source remains a distinct application entry point from the Server process.

---

## 8. Dependency Direction

Package arrows mean **importer -> dependency**:

```text
client       -> service-contracts
product-core -> service-contracts
product-core -> project-state
product-core -> runtime-contracts
product-core -> repository-management
```

Applications compose those pieces:

```text
Desktop = product-core + client + local/Desktop adapters + Electron host
Server  = product-core + server adapters + server host/transports
Web     = client + Server transport + browser host
```

The exact import graph may require `service-contracts` to reference public types from lower-level domain packages. That public-type ownership and the complete acyclic allowed-import matrix remain design work; this diagram does not authorize a reverse import from a domain package into its application orchestrator or a new package split.

The critical architectural rules are:

1. `client` never imports `product-core` implementation;
2. shared packages never import Desktop or Server apps;
3. Product Core never imports Electron/React/Windows/server framework implementations;
4. provider/storage/OS implementations point inward toward contracts;
5. hosts compose dependencies; hosts do not define shared product semantics.

---

## 9. Adapter Placement Rule

Do not create a giant `packages/adapters` dumping ground on day one.

Use this rule:

> An adapter remains inside its owning app while it is host-specific. Promote it to a shared package only when at least two hosts need the same implementation or when independent conformance/testing materially benefits from the package boundary.

Examples:

- Electron IPC adapter -> `apps/desktop`;
- Windows startup/tray adapter -> `apps/desktop`;
- Server HTTP/WebSocket transport -> `apps/server`;
- browser transport adapter -> `apps/web`;
- Codex runtime adapter -> likely future shared package if both Desktop and Server use it;
- local Git/filesystem repository adapter -> likely future shared package if both Desktop and Server/local workers use it;
- SQLite Project State adapter -> shared only if both deployment models genuinely use the same persistence implementation.

These arrows denote placement, not dependency direction. This prevents package proliferation while preserving a clean promotion path.

---

## 10. Current Source to Target Ownership

The Source Extraction Map already provides the semantic classification. The repository layout should realize it as follows.

| Current source | Target ownership |
| --- | --- |
| `src/main/currentWorkflow`, Project/Phase/Work Card/Issue lifecycle services | `packages/product-core` after filesystem/Markdown workflow-state ownership is removed |
| correctness-sensitive workflow transition/eligibility logic currently in renderer orchestration helpers | move decision logic to `packages/product-core`; leave presentation coordination in `packages/client` |
| `src/shared` | **do not move wholesale**; split each type/contract by ownership into service contracts, Project State, runtime contracts, repository management, client presentation, or legacy migration |
| `src/main/documents` domain disposition/transaction semantics | Product Core / Project State as appropriate |
| canonical Markdown writers, repository snapshots/projections, old document compatibility | migration/import/export tooling, not steady-state Core |
| `src/main/agentHarness/repository` bounded repository/Git semantics | `packages/repository-management` plus concrete local adapter |
| controlled Markdown/text projection inside Agent Harness repository code | legacy migration/export adapter |
| `src/main/agentHarness/tools/toolRegistry.ts` | shared tool/access/scope/policy semantics in Product Core; MCP publication remains transport/host adapter |
| `src/main/workCardBuilding/codex*` | provider-neutral semantics to `runtime-contracts`; Codex implementation becomes runtime adapter |
| Agent Harness service/controller/process-host/tray/Windows lifecycle | `apps/desktop` where Desktop-specific; reusable runtime semantics extracted first |
| future durable Server runtime host | `apps/server` |
| `src/main/developmentEnvironment` capability/preflight rules | `packages/product-core`; Windows provisioning stays Desktop adapter; future container/VM/remote implementations stay deployment adapters |
| `src/main/browser/architectBrowserService.ts` | Desktop adapter; future server/browser implementations satisfy a shared semantic port |
| `src/main/main.ts`, `bootstrap.ts`, `contextMenu` | `apps/desktop` composition/shell |
| `src/preload/index.ts` | `apps/desktop` transport adapter |
| most `src/renderer/app/*.tsx` | `packages/client` after correctness-sensitive workflow sequencing is extracted |
| renderer Electron bridge declarations/bootstrap/assets specific to native delivery | `apps/desktop` |
| browser bootstrap and remote service transport | `apps/web` |

A generic future `packages/shared` folder should **not** be created. The existing `src/shared` name is an implementation-era convenience and already contains multiple kinds of ownership. The migration should resolve that ambiguity instead of preserving it.

---

## 11. Versioning and Release Model

Source repository boundaries and product version boundaries should remain separate concepts.

Recommended model:

- `ChampCity_AI` has one Git history;
- Desktop carries its own product version/release artifact;
- Server carries its own product version/release artifact;
- Web ships with Server while remaining a distinct build target/source entry point;
- internal shared packages remain private and are not published merely to simulate repository separation;
- compatibility is proved by build, type, contract, conformance, and integration tests against the same source revision.

Desktop and Server may release at different cadences because they are alternative deployment products rather than two halves of one concurrently installed client/host pair for the same Project.

If a future external SDK, plugin ecosystem, or independently distributed contract requires published packages, those packages can acquire explicit semantic versions then. Internal package publishing is not needed now.

For Server deployment, the browser client is built and deployed with the Server and MUST be updated atomically with the compatible service-contract implementation. The product updater must not leave an old web client paired with a newly incompatible Server service or vice versa.

Desktop standalone updates its local client/services as one coordinated product update for the same reason.

ChampCity does not need to support arbitrary client/server version skew between these normal deployment modes. If a future separately installed remote client is introduced, it MUST use coordinated auto-update/version negotiation that prevents operation against an incompatible host. An incompatible peer is blocked with an explicit required-update state rather than allowed to continue on best effort.

This makes update coordination, not a long-lived compatibility matrix, the normal solution to F20.

---

## 12. Tooling Recommendation

The current repository already uses npm and a root `package-lock.json`.

Therefore the lowest-risk workspace transition is:

1. retain npm;
2. make the root package a private workspace root;
3. use npm workspaces for `apps/*` and `packages/*`;
4. use separate TypeScript configurations/project references for apps and packages;
5. centralize shared compiler defaults in a base TypeScript configuration;
6. add a heavier monorepo task orchestrator only if build/test scale later creates a measurable need.

Do **not** switch package managers merely to obtain monorepo support.

Separate TypeScript projects are particularly valuable because they can enforce different runtime environments:

- Product Core/contracts: platform-neutral TypeScript;
- Client/Web: DOM/React;
- Desktop: Node + Electron + renderer boundary;
- Server: Node/server runtime;
- adapters: only the environment they actually require.

This directly addresses the current single `tsconfig` problem where Node and DOM capabilities are visible across the whole codebase.

---

## 13. Migration Strategy

Do not perform a mass folder move before semantic extraction.

The source layout should be introduced incrementally.

### Stage 0 — Preserve the Desktop baseline

Retain the current Desktop release/baseline history before structural migration. The prior product-line decision that Desktop must not be destructively transformed remains valid.

A monorepo conversion is acceptable because it preserves Desktop as a first-class application rather than replacing it with Server.

### Stage 1 — Establish workspace/build boundaries

Create the workspace root and TypeScript project boundaries when the first extraction Work Card requires them.

Do not create empty packages solely to make the tree look complete.

### Stage 2 — Extract foundational contracts first

Follow the Source Extraction Map order:

1. identity/resource model;
2. Structured Project State;
3. provider-neutral runtime contract;
4. repository/source-control semantic ports;
5. service contracts.

Make current Desktop consume each extracted package as it is introduced.

### Stage 3 — Extract workflow Product Core

Move lifecycle, effective Decisions/dispositions, eligibility, repair, validation, and close/next semantics behind structured state and shared application services.

Characterization tests must continue proving current Desktop behavior during extraction. Their mappings must distinguish preserved behavior from known defects and V2 changes explicitly directed by the Operator or adopted architecture; undocumented test assumptions do not create new product decisions or constraints.

### Stage 4 — Extract the shared client

Move reusable renderer UI into `packages/client` only after authoritative transitions have been removed from renderer helpers.

Desktop keeps a thin renderer bootstrap and Electron host-capability adapter.

### Stage 5 — Add Server and Web hosts

Build `apps/server` against the same Product Core and service contracts.

Build `apps/web` as a thin host for `packages/client` using Server transport.

### Stage 6 — Promote reusable adapters only when proven

If Desktop and Server both use Codex, local Git, SQLite, or another adapter implementation, promote that adapter from an app into a shared package then.

---

## 14. Boundary Enforcement Rules

The target layout is only useful if imports enforce it.

The following should become architecture rules:

1. `packages/product-core` may not import from `apps/**`.
2. `packages/client` may not import from `apps/**` or `packages/product-core`.
3. `packages/project-state` may not import persistence engines.
4. `packages/runtime-contracts` may not import Codex or process-host implementations.
5. `packages/repository-management` may not import Project State Markdown compatibility code.
6. `apps/desktop` may import shared packages and local adapters, but Desktop-specific code must not be imported by Server.
7. `apps/server` may import shared packages and server adapters, but Server-specific code must not be imported by Desktop/Core.
8. `apps/web` may import Client/service contracts but not Node/Electron infrastructure.
9. legacy Markdown migration code may depend on old artifact formats; Product Core must not depend on it.
10. package boundaries should be validated by compile/test automation rather than maintained by convention alone.

---

## 15. Why Separate Repositories May Still Make Sense Later

This decision should not be interpreted as “ChampCity must always be a monorepo.”

A later repository split becomes reasonable if one or more concrete pressures appear:

- different teams require independent repository ownership;
- security or customer-delivery rules require source isolation;
- a shared package becomes a separately distributed public SDK;
- technology stacks diverge enough that the common toolchain is harmful;
- repository/CI scale becomes materially problematic;
- release governance requires independently controlled source histories rather than merely independent app versions.

None of those conditions currently outweigh the extraction cost.

Importantly, good package boundaries make a later split easier. The monorepo should therefore be designed so shared packages **could** be published or moved later, while remaining private and source-local now.

---

## 16. Rejected Layout Smells

The following target shapes should be rejected:

### `apps/desktop` containing the Product Core

This would preserve Desktop as the architecture and make Server depend on Desktop implementation details.

### `apps/server` copying Desktop workflow services

This directly violates the Shared Product Core and Source Extraction Map decisions.

### `packages/shared`

A generic shared package would recreate the ambiguity already present in `src/shared` and become a dumping ground for unrelated contracts.

### `packages/core` importing `node:fs`, Electron, Codex, SQLite, or HTTP frameworks

That would make the package shared in name only.

### `packages/client` importing Product Core directly

That would prevent the same client from operating cleanly over local Desktop services and remote Server services.

### separate repositories merely to obtain independent version numbers

Versioning is a release concern. It does not justify cross-repository dependency management by itself.

---

## 17. Final Recommendation

Adopt the following architecture decision before extraction begins:

> **ChampCity A/I will use the existing `ChampCity_AI` repository as a product monorepo containing independently buildable Desktop, Server, and Web applications plus private shared packages. Shared Product Core and the shared client will not live in separate Git repositories. Desktop and Server may version and release independently.**

Use this initial permanent package set:

```text
packages/
    product-core
    client
    service-contracts
    runtime-contracts
    project-state
    repository-management

apps/
    desktop
    server
    web
```

Treat adapter packages as **promotions based on proven reuse**, not mandatory initial structure.

Do not mass-migrate the current tree. Introduce the workspace structure as the first extraction units move, and make Desktop consume the extracted packages immediately. This preserves the proven Desktop behavior while ensuring Server is built from shared ChampCity semantics instead of a copy of the Electron application.

This layout best satisfies the Product Capability Model, Foundational Architecture Principles, Client-Service Contract, Structured Project State model, Agent Runtime Interface, Deterministic Automation Boundaries, and Source Extraction Map while minimizing unnecessary repository/version-management work during the migration. This repository/source-layout decision was adopted for the V2 implementation baseline on September 14, 2026.
