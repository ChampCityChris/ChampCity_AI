# ChampCity A/I Repository and Product Source Layout Decision

**Status:** Adopted V2 production-source layout — revised September 22, 2026  
**Scope:** Product Core, Service Host, Web Client, shared packages, V1 extraction, and deployment-neutral backend composition  
**Supersedes:** the former `apps/desktop + apps/server + apps/web` V2 layout

## 1. Decision Summary

ChampCity A/I V2 remains in the existing `ChampCity_AI` repository as a product monorepo.

The V2 target contains:

- one browser-delivered web client;
- one deployable ChampCity Service Host that may run on a workstation or on a server;
- private shared packages for Product Core, client code, service contracts, runtime contracts, Project State, and repository management.

Electron is not part of the V2 target layout.

The preferred target shape is:

```text
apps/
    web/
    service-host/

packages/
    product-core/
    client/
    service-contracts/
    runtime-contracts/
    project-state/
    repository-management/
```

The exact package boundaries may be introduced incrementally as extraction requires them. This document does not require a mass source move before behavior extraction begins.

The critical rule is:

> Hosting location is a deployment property of the backend, not a reason to create another client or another Product Core.

## 2. Why This Fits the V2 Architecture

### 2.1 One product architecture

`CHAMPCITY_WEB_CLIENT_AND_SERVICE_HOST_ARCHITECTURE.md` establishes the controlling V2 topology:

```text
ChampCity Web Client
        |
        v
ChampCity Service Host
        |
        v
Shared Product Core / Services
```

The Service Host can be workstation-hosted or server-hosted.

There is no permanent V2 Desktop/Electron application.

### 2.2 Extraction, not duplication

The V1 Electron application remains the source and behavior baseline.

V2 extracts:

- workflow semantics;
- Project State;
- repository/source-control mechanics;
- runtime/model abstractions;
- tool/access policy;
- reusable UI behavior.

Electron process topology, preload IPC, native window/tray mechanics, and other V1 shell details are not automatically migrated.

### 2.3 One client contract

The web client consumes the semantic Client-Service Contract.

It must not import backend implementation or vary its product behavior because the endpoint is local versus remote.

Transport may be configured differently, but client semantics remain one.

### 2.4 One backend implementation

The Service Host composes the same Product Core and service implementations for both local and server deployment.

Deployment-specific adapters may differ for:

- persistence;
- filesystem/repository resources;
- execution-environment placement;
- authentication/security;
- process supervision;
- secret/configuration storage;
- network exposure.

Those adapters do not fork workflow logic.

## 3. Current Repository Evidence

The current repository is a V1 single-package Electron application.

It contains:

- Electron foreground/main/preload code;
- renderer React UI;
- main-process workflow/domain services;
- Background Agent/service-host mechanics;
- Agent Harness/MCP;
- deterministic repository/Git operations;
- Codex runtime integration;
- V1 Markdown-backed workflow state.

That is the extraction baseline, not the permanent target topology.

The current layout should be treated as a source map to decompose rather than a package structure to preserve.

## 4. Target Layout

```text
ChampCity_AI/
├── apps/
│   ├── web/
│   │   └── browser bootstrap, web transport, client delivery
│   └── service-host/
│       └── backend composition, deployment/bootstrap, host adapters
│
├── packages/
│   ├── product-core/
│   ├── client/
│   ├── service-contracts/
│   ├── runtime-contracts/
│   ├── project-state/
│   └── repository-management/
│
├── docs/
├── test/
└── validation/
```

Do not create a generic `packages/shared` package.

Do not create `apps/desktop`.

Do not create separate local and server workflow applications.

## 5. Package Responsibilities

### 5.1 `packages/product-core`

Owns deployment-neutral product semantics:

- workflows and governance;
- eligibility and transition rules;
- Operator Decision semantics;
- repair/validation/close behavior;
- application orchestration;
- capability/access policy where it is product-semantic.

It must not import:

- Electron;
- browser UI;
- Node filesystem implementation;
- Codex implementation;
- HTTP/WebSocket frameworks;
- Windows-specific host implementation.

### 5.2 `packages/client`

Owns reusable web-client application code:

- React/UI state and presentation;
- client-side navigation;
- presentation models;
- semantic service invocation;
- browser-compatible interaction behavior.

It may import service contracts and client-facing shared types.

It must not import Product Core implementation, repository mechanics, runtime implementations, or server/host adapters.

### 5.3 `packages/service-contracts`

Owns deployment-neutral semantic client/service types:

- request/response DTOs;
- query/command semantics;
- event contracts;
- RequestContext/resource-scope types;
- typed service errors and revision/operation identities.

It is not an HTTP route definition and not an Electron IPC contract.

### 5.4 `packages/project-state`

Owns Structured Project State domain types, invariants, revisions, lineage, relationships, Decisions, Validation/Evidence relationships, and persistence ports.

Persistence engines remain adapters.

### 5.5 `packages/runtime-contracts`

Owns portable AI/worker runtime contracts:

- execution requests;
- runtime/model capability description;
- context envelopes;
- events/continuation;
- usage/accounting contracts.

Codex and future runtimes are adapters.

### 5.6 `packages/repository-management`

Owns provider-neutral repository/source-control semantics and contracts:

- Repository;
- RepositoryCheckout;
- SourceLine;
- SourceRevision;
- integration/checkout semantics;
- bounded repository operations.

Git is the first provider/adapter, not the product vocabulary.

## 6. Application Responsibilities

### 6.1 `apps/web`

`apps/web` is the only V2 client host.

It owns:

- browser bootstrap;
- delivery of `packages/client`;
- service endpoint/transport wiring;
- browser-specific host integration where required.

It must not:

- own workflow transitions;
- directly read/write repositories;
- launch agent runtimes;
- import Node/Electron infrastructure;
- contain a local-only alternative product flow.

### 6.2 `apps/service-host`

`apps/service-host` is the backend composition root.

It owns:

- service bootstrap;
- Product Core composition;
- Project State persistence adapter selection;
- RepositoryService adapter selection;
- Runtime/Model adapter selection;
- Environment/tool adapters;
- service transport;
- process lifecycle;
- deployment configuration.

The same Service Host application is deployable on:

- a user's workstation; or
- a server.

Deployment profiles may configure different adapters and exposure/security policy.

The Service Host must not fork into separate local and server workflow implementations.

## 7. Dependency Direction

Conceptual import direction:

```text
apps/web
    -> packages/client
    -> packages/service-contracts

apps/service-host
    -> packages/product-core
    -> packages/service-contracts
    -> packages/project-state
    -> packages/runtime-contracts
    -> packages/repository-management
```

Additional public-type dependencies must remain acyclic.

Rules:

1. shared packages never import from `apps/**`;
2. `packages/client` never imports Product Core implementation;
3. Product Core never imports browser or deployment framework implementations;
4. Project State never imports a concrete persistence engine;
5. runtime contracts never import Codex/provider implementations;
6. repository management never imports legacy Markdown workflow persistence;
7. host adapters point inward toward contracts;
8. V1 Electron source is migration input, not an allowed V2 dependency.

## 8. Adapter Placement Rule

Do not create a generic adapter dumping ground.

An adapter belongs initially with the Service Host when it is deployment-specific.

Promote it to a shared package only when:

- multiple backend compositions genuinely reuse it; or
- independent conformance/testing materially benefits from the boundary.

Examples:

- local Git/filesystem implementation -> Service Host adapter initially;
- server/remote repository provider -> Service Host adapter;
- Codex runtime -> Service Host adapter or later shared runtime adapter if justified;
- SQLite/other Project State persistence -> host adapter/shared persistence package only when reuse warrants it;
- HTTP/WebSocket transport -> Service Host;
- browser transport -> Web app.

Electron IPC and preload are V1-only migration surfaces and are not adapter targets.

## 9. Current Source to Target Ownership

| Current V1 source | V2 target |
| --- | --- |
| `src/main/currentWorkflow`, Project/Phase/Work/Issue lifecycle services | `packages/product-core` after filesystem/Markdown state ownership is removed |
| renderer helpers containing eligibility/transition decisions | decisions -> Product Core; presentation -> `packages/client` |
| reusable renderer UI | `packages/client` / `apps/web` |
| `src/shared` | split by actual ownership; do not move wholesale |
| document disposition/transaction semantics | Product Core / Project State as appropriate |
| canonical Markdown workflow writers and snapshots | migration/export/projection; not steady-state Core |
| `src/main/agentHarness/repository` bounded repository/Git semantics | repository-management + backend adapter |
| tool registry semantic authorization/dispatch | Product Core/service/tool policy; MCP remains an external transport adapter |
| Codex-specific execution source | runtime-contracts + Codex backend adapter |
| reusable Agent Harness service behavior | Service Host/backend services |
| Windows/Electron tray/startup/window lifecycle | V1-only unless a distinct backend host requirement survives Electron removal |
| `src/main/main.ts`, Electron bootstrap/context menus | V1 shell; extract reusable behavior only, then retire |
| `src/preload/index.ts` | retire after web/service cutover |
| Electron bridge declarations | retire |
| embedded Electron Architect browser | V1 presentation implementation; replace with web-compatible V2 capability if retained |
| browser-compatible presentation/client behavior | `packages/client` / `apps/web` |

## 10. Versioning and Release Model

V2 has one client implementation and one backend service-host implementation.

Release packaging may differ by deployment:

- workstation installer/package for the Service Host;
- server deployment/package for the Service Host;
- web client assets.

Compatibility between web client and Service Host must be explicit.

A deployment must not silently pair an incompatible client/service contract.

Separate release artifacts do not imply separate source architectures.

## 11. Migration Strategy

### Stage 0 — Preserve the V1 baseline

Keep reproducible V1 source/characterization evidence while extraction proceeds.

Do not interpret preservation as a requirement to preserve Electron in V2.

### Stage 1 — Establish workspace/build boundaries

Introduce monorepo/workspace structure only as the first extraction needs it.

Avoid a mass move with no semantic extraction.

### Stage 2 — Extract foundational contracts

Recommended dependency order:

1. identity/resource model;
2. Structured Project State;
3. provider-neutral runtime contracts;
4. repository/source-control ports;
5. service contracts.

### Stage 3 — Extract Product Core

Move lifecycle, Decisions/dispositions, eligibility, repair, validation, and close/next semantics behind Structured Project State and services.

### Stage 4 — Establish Service Host

Move reusable backend mechanics behind deployable services and adapters.

Make workstation-hosted execution a first-class Service Host deployment profile.

### Stage 5 — Extract the web client

Move reusable renderer presentation into `packages/client` / `apps/web`.

Remove authoritative workflow sequencing from UI code.

Connect the web client to the Service Host contract.

### Stage 6 — Workstation cutover

Reach functional parity for required workstation-hosted behavior using:

```text
browser -> web client -> local Service Host
```

Once required parity is demonstrated, retire Electron/preload/native shell dependencies.

### Stage 7 — Server deployment

Deploy the same Service Host architecture on server infrastructure with server-appropriate persistence, authentication, isolation, and resource adapters.

No client rewrite is required.

## 12. Boundary Enforcement Rules

The target layout must enforce:

1. no Product Core imports from `apps/**`;
2. no Client imports from Product Core implementation;
3. no Electron imports anywhere in V2 packages/apps;
4. no browser imports in backend packages;
5. no concrete filesystem/Git/runtime implementation in Product Core;
6. no duplicated local/server workflow service implementations;
7. no legacy Markdown state dependency from Product Core;
8. package/import boundaries validated by automation.

## 13. Rejected Layout Smells

### Permanent `apps/desktop`

Rejected. It recreates a second V2 client/host architecture after the decision to use one web client.

### Separate local and server Product Core implementations

Rejected. Hosting location does not justify duplicated workflow semantics.

### Electron wrapper around the web client as a required V2 product

Rejected as a target architecture. A temporary migration wrapper does not become the permanent product.

### `packages/shared`

Rejected. Ownership must be explicit.

### Product Core importing host frameworks

Rejected. Product Core is deployment-neutral.

### Client importing Product Core directly

Rejected. The web client operates through semantic services.

## 14. Final Recommendation

ChampCity A/I V2 will use the existing `ChampCity_AI` repository as a monorepo with:

```text
apps/
    web/
    service-host/

packages/
    product-core/
    client/
    service-contracts/
    runtime-contracts/
    project-state/
    repository-management/
```

The Service Host is installed wherever ChampCity backend services should run.

The Web Client is the one user-facing V2 application.

Do not mass-migrate the tree. Extract behavior in dependency order, prove workstation-hosted web/service parity, then remove Electron.

This decision is governed by `CHAMPCITY_WEB_CLIENT_AND_SERVICE_HOST_ARCHITECTURE.md` and supersedes the September 14 multiple-host/multiple-shell V2 layout.
