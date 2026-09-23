# ChampCity A/I V2 Web Client and Service Host Architecture

**Status:** Adopted V2 architecture decision — September 22, 2026  
**Scope:** V2 client, backend hosting, deployment topology, Electron retirement, and local/server equivalence  
**Supersedes:** the prior V2 "Desktop host + Server host + shared client/multiple shells" model wherever it appears in the active corpus

## Decision

ChampCity A/I V2 has **one client implementation: the web client**.

ChampCity backend capabilities run as ChampCity services behind the semantic Client-Service Contract. Those services may be hosted:

- on a user's local workstation; or
- on a dedicated/remote server.

The deployment location of the backend does not create a second client architecture.

In both cases, the Operator uses the same web client.

Electron is a V1 implementation technology and is **not** part of the V2 target architecture.

## Canonical topology

### Workstation-hosted V2

```text
Browser
  |
  v
ChampCity Web Client
  |
  v
ChampCity Service Host
  |
  +--> Product Core / Workflow Services
  +--> Structured Project State
  +--> Repository / Source Control Services
  +--> Agent Runtime / Model Services
  +--> Environment / Tool Services
  +--> Host-local adapters and resources
```

The Service Host runs on the user's workstation. The browser connects to that local service deployment.

### Server-hosted V2

```text
Browser
  |
  v
ChampCity Web Client
  |
  v
ChampCity Service Host
  |
  +--> Product Core / Workflow Services
  +--> Structured Project State
  +--> Repository / Source Control Services
  +--> Agent Runtime / Model Services
  +--> Environment / Tool Services
  +--> Server/remote adapters and resources
```

The same service architecture runs on a server. The browser reaches that deployment through its configured network boundary.

The client does not become a different product because the service endpoint is local or remote.

## One web client

The V2 UI is browser-delivered.

There is no V2 Electron shell, Electron renderer, preload bridge, native Desktop client, or independently developed workstation UI.

The web client:

- presents ChampCity state;
- sends commands through the semantic service contract;
- receives state/events from ChampCity services;
- does not own workflow eligibility or durable product transitions;
- does not directly own filesystem, Git, process, model-runtime, or Project State mechanics;
- must not contain local-only product behavior that requires a second workstation client implementation.

Transport details may differ between deployment environments, but the client contract and client implementation remain one.

## One backend architecture

Local workstation hosting and server hosting are deployment profiles of the same V2 backend architecture.

They must not become separate copies of workflow services.

Shared backend semantics include:

- Project and workflow lifecycle;
- Structured Project State;
- Operator Decisions and dispositions;
- validation and evidence semantics;
- RepositoryService and source-control semantics;
- RuntimeService / ModelService contracts;
- EnvironmentService;
- MemoryService;
- SkillsService;
- tool/access/scope policy.

Deployment-specific adapters may differ where the environment genuinely differs.

Examples include:

- filesystem/repository resource location;
- process hosting;
- secret/configuration storage;
- authentication and exposure policy;
- execution-environment placement;
- network transport.

Those differences remain outside Product Core.

## Workstation-hosted does not mean Desktop product

A user may install ChampCity services on a workstation and use ChampCity entirely on that machine.

That is a **local service deployment**, not a separate Desktop application architecture.

Terms such as "Desktop" may still appear in:

- V1 source;
- V1 implementation documentation;
- historical migration documents;
- characterization-test descriptions.

They must not be interpreted as V2 target topology.

## Electron retirement

Electron-specific V1 code is classified during migration into three groups.

### Extract

Portable behavior that currently happens to live under Electron-owned source is extracted into:

- Product Core;
- the web client;
- service contracts;
- Project State;
- runtime contracts;
- repository management;
- reusable backend adapters.

### Replace

Host mechanics that have a V2 equivalent are replaced by browser/service-host mechanisms.

Examples may include:

- renderer-to-main requests -> web client to service transport;
- local host lifecycle -> Service Host lifecycle;
- native shell presentation -> browser presentation.

The exact transport or hosting mechanism must implement the semantic contracts rather than redefine them.

### Retire

Electron-only mechanics with no V2 product requirement are removed rather than ported.

Examples include the Electron preload bridge, BrowserWindow/WebContentsView composition, Electron tray/window lifecycle, and Electron-specific process topology unless a product requirement is independently re-established outside Electron.

V1 behavior does not become a V2 requirement merely because Electron currently provides it.

## Canonical state ownership

A Project has one canonical writable Structured Project State deployment at a time.

A local deployment owns that state locally.

A server deployment owns that state at the server-backed service deployment.

Switching hosting location is not live multi-writer synchronization. Any future migration/transfer capability must remain an explicit bounded operation governed by Project State and repository transfer contracts.

## Source layout consequence

The target product monorepo needs one browser client and one deployment-neutral service host composition, plus shared packages.

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

`apps/service-host` is deployable on a workstation or server. Deployment profiles/adapters configure how it reaches local or remote resources.

Do not create:

- `apps/desktop`;
- a second local-only client;
- a server-specific copy of Product Core;
- separate local and server workflow implementations.

If future evidence requires additional deployment-specific host packaging, it must still compose the same Service Host semantics and must not create another client or product core.

## Migration rule

V2 migration is an extraction and cutover, not a permanent dual-client strategy.

During transition:

1. preserve V1 behavior evidence where behavior remains required;
2. extract backend semantics behind V2 service contracts;
3. extract reusable UI into the web client;
4. move local backend capabilities into the deployable Service Host;
5. replace Electron-specific transport with the web/service boundary;
6. validate browser parity for required product behavior;
7. retire Electron after the V2 web client + local Service Host can perform the required workstation-hosted product workflow.

The migration may be incremental, but the target is not "Electron plus Web."

## Documentation precedence

This decision supersedes prior active-corpus claims that:

- ChampCity A/I Desktop remains a permanent first-class V2 product;
- Electron is the native V2 host;
- the shared client has separate Desktop and Web shells;
- V2 requires separate `apps/desktop` and `apps/server` applications;
- Server is a separate backend implementation from a local Desktop backend.

V1 Desktop documentation remains valid only as current/historical implementation evidence until that source is retired.

## Governing principle

> ChampCity A/I V2 is one web client over one service architecture. The backend can run here or there; the product architecture does not fork because of where the services are hosted.
