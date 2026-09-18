# ChampCity A/I Desktop Architecture

## Scope

This document describes the current workstation-resident ChampCity A/I Desktop architecture. It does not describe or imply the future ChampCity A/I Server deployment model.

## Process and trust diagram

```text
Windows user and selected project repository
              |
              v
+------------------------------------------------------------+
| Foreground Electron process                                |
|                                                            |
|  React renderer --typed IPC--> preload --IPC--> main       |
|       no Node/fs                    |       |               |
|                                    |       +-> workflow and|
|                                    |           repository  |
|                                    |           services    |
|                                    |                       |
|                                    +-----------> embedded  |
|                                                 ChatGPT    |
|  managed Codex runtime <------ stdio App Server <---------+|
+----------------------------|-------------------------------+
                             | authenticated local control
                             v
+------------------------------------------------------------+
| Detached Background Agent Service Host                     |
|  tray | build/lifecycle control | suspend/resume recovery  |
|                             | Electron utilityProcess       |
|                             v                               |
|  Agent Harness worker: MCP HTTP, OAuth, workspace registry,|
|  constrained repository tools                              |
+-----------------------------|------------------------------+
                              v
                     loopback MCP clients
```

All durable project writes remain inside the user-selected or explicitly registered project boundary. Per-user service state remains in ChampCity's Windows application-data directory.

## Bootstrap modes

`src/main/bootstrap.ts` is the packaged entry point. It applies the `ChampCity A/I` product identity and normalizes the per-user `champcity-ai` application-data root before dispatching one of three modes:

1. foreground Desktop startup in `src/main/main.ts`;
2. detached Background Agent Service Host startup with `--agent-harness-service-host`;
3. headless installer/uninstaller maintenance for startup registration and graceful service cleanup.

This makes installer maintenance and the Background Agent explicit application modes rather than renderer-owned scripts.

## Foreground Electron process

The foreground process obtains a single-instance lock plus a per-user desktop lifecycle lease, initializes the managed Codex runtime, reconciles Background Agent startup registration, connects to or launches the detached Service Host, and creates the main window.

The main process owns:

- native project selection and selected-workspace state;
- planning-document discovery, parsing, validation, promotion, and bounded writes;
- Development, phase, Work Card, validation, repair, and close services;
- Issue, Fix Card, aggregate validation, and Issue Close services;
- the embedded Architect browser lifecycle;
- Codex runtime management and App Server execution;
- all IPC handlers exposed to the renderer.

Closing the final Windows foreground window quits this process. Before quit, active Codex executions and transports are shut down. The client disconnect operation deliberately does not stop a healthy Background Agent.

## Renderer and preload boundary

The main BrowserWindow uses context isolation with Node integration disabled. `src/preload/index.ts` exposes a named, typed `window.champcity` API through Electron's context bridge. Renderer components call only those methods; they do not receive general Node, shell, or filesystem access.

Repository selection, path containment, native dialogs, local service operations, and persistent writes remain in main-process services. A renderer-supplied path or `workspaceId` is untrusted input to validation, not permission by itself.

## Background Agent Service Host

The foreground process launches a detached sibling ChampCity executable in Service Host mode. The Service Host:

- admits only one owner of the user's canonical local control endpoint;
- writes an instance descriptor containing bounded process/build identity;
- owns the Windows notification-area tray;
- starts and supervises the utility worker;
- performs heartbeat recovery and bounded controlled restart;
- responds to Windows suspend and resume;
- persists explicit user-stop intent and sign-in preference;
- exposes authenticated local control operations to the foreground app.

The control endpoint uses per-user local ownership and request identity. When endpoint ownership is absent, live, stale, or indeterminate, the client follows fail-closed reconciliation instead of killing an unknown process.

## Utility worker and MCP HTTP boundary

The Agent Harness worker is an Electron `utilityProcess` child of the Service Host. It initializes `AgentHarnessService` with the user's application-data root. The worker handles service status, MCP start/stop/restart, configuration, OAuth import, registered-project changes, power recovery, and shutdown over a versioned process protocol.

The MCP HTTP runtime:

- binds only to `127.0.0.1` or `localhost`;
- defaults to an automatically selected port;
- exposes health and MCP endpoints while running;
- defaults to OAuth-required authentication;
- supports public OAuth clients with Authorization Code, PKCE S256, `files.read`/`files.write` resource permissions, and the `offline_access` session scope;
- permits local unauthenticated mode only when no public base URL is configured.

The Service Host can remain healthy while MCP is stopped. This is why **Stop MCP Runtime** and **Exit Background Agent** are separate controls.

OAuth protected-resource metadata advertises only `files.read` and `files.write`; authorization-server metadata also advertises `offline_access`. Registration and legacy client import accept all three scopes. Authorization requires at least one resource permission and canonicalizes scopes in that order, removing duplicates and rejecting unsupported values. Authorization-code exchange issues access and refresh tokens with the complete authorization scope, including `offline_access` when requested. Refresh rotates the token pair and preserves that scope. Access tokens retain their one-hour lifetime and refresh tokens their 30-day lifetime; clients without `offline_access` continue receiving refresh tokens, and existing stored records need no migration.

Before MCP authentication reaches tool filtering, contract capture, fingerprints, session identity, or permission checks, the runtime projects OAuth scopes to resource permissions only. `offline_access` alone fails closed for MCP, adds no tools or contract generations, and contributes no read/write authorization counts.

## Per-user application state

The app sets Electron `userData` to a stable `champcity-ai` directory beneath the current Windows user's application-data root. That boundary stores settings and runtime state including:

- Agent Harness configuration and lifecycle intent;
- Service Host descriptor/control material;
- registered project records;
- local OAuth registrations, authorization state, and hashed token values;
- managed Codex versions, the current-version pointer, and model/reasoning selection.

Even under an Everyone installation, each Windows user receives separate state, credentials, registrations, endpoints, and background processes. Installed binaries may be shared; runtime state and security boundaries are not.

## Registered project execution boundary

`RegisteredWorkspaceRegistry` stores canonical roots and deterministic IDs per user. Registration checks the root and prevents one ID from being silently rebound to a different project. Availability is projected separately from registration state, so a temporarily missing project remains known but unavailable.

MCP operations require the exact registered `workspaceId`. The workspace boundary provider then resolves and contains file operations within that canonical root. Unknown IDs and invalid registry records fail closed. Git-backed and non-Git projects have explicit, tested enumeration/status semantics.

The foreground selected project and the MCP registry are intentionally separate execution contexts.

## Embedded Architect browser

The Architect surface is an Electron `WebContentsView` pointed at `https://chatgpt.com/` with a persistent `persist:champcity-architect` session partition. Remote content has Node integration disabled, context isolation enabled, sandbox enabled, and no ChampCity preload. Navigation and authentication windows are controlled by the browser service.

The browser itself does not receive project filesystem access. ChampCity prepares a bounded handoff for the Operator to copy and send; bounded MCP tools create temporary drafts in controlled project locations. Main-process workflow services validate source revisions and draft shape before any canonical promotion.

## Managed Codex/App Server integration

The Codex runtime manager stores immutable runtime versions and an atomic current pointer under per-user state. It can bootstrap from the packaged Codex dependency, query the official package registry for a stable version, stage an archive without running install scripts, verify registry integrity and archive paths, probe the executable/schema/model catalog, and promote only a verified candidate. If update fails, a last verified runtime may remain available in a degraded state.

Implementer execution launches Codex App Server over stdio, uses the exact model and reasoning selection from the live catalog, streams events to the UI, and maintains bounded approval and execution state. Development Work Cards and Issue Fix Cards use separate workflow identities even though they share the managed runtime.

## Planning and workflow services

Workflow scope and evidence are repository-derived. Main-process services read canonical Markdown plus application-owned metadata, build projections for the renderer, prepare Architect handoffs, constrain temporary draft locations, apply Operator dispositions, and write validation/repair/close records under the selected project's planning or Issue directories. These records describe instructions, constraints, state, and evidence; they cannot independently grant permission for work.

Production source does not treat source-repository transition `planning/` material or local ignored `archive/` history as a runtime schema. Tests use curated or synthetic projects. See [Repository Code, Test, and Migration Boundary](REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md).

## Packaging, startup, and uninstall boundaries

Electron Builder produces an interactive Windows x64 NSIS installer. Installer source selects Current User or Everyone scope, writes exact scope metadata, and establishes the matching startup registration:

- Current User registration is applied and verified through the packaged maintenance mode.
- Everyone registration is an installer-owned machine Run entry; per-user preference still controls whether startup continues for that user.

Uninstall verifies scope, gracefully shuts down the invoking user's admitted Service Host/worker, removes only the exact applicable startup entry, and preserves per-user application data. An Everyone uninstall also proves the installed executable is not in use by another session. It restores startup registration and stops without deleting installed files if safe quiescence cannot be proved.

## Operator authority and task scope

The human Operator is the only authority over whether work may be performed. Work Cards, Repair Cards, Issues, prompts, workflow state, metadata, agents, host services, and MCP can record decisions, carry bounded instructions, constrain execution, or provide evidence, but none can serve as a permission principal.

The executing agent follows the Operator's current direction and the current task's constraints, including an explicit `no Git this turn` prohibition. MCP does not interpret planning documents or workflow state to decide whether the Operator intended a Git action. For bounded Git mutation, the Agent Harness enforces exact registered workspace identity and containment, Git-backed state, `files.write` OAuth scope, published action schemas, and deterministic command preconditions.

## Local-first trust boundaries

- The Operator chooses project roots and acceptance decisions.
- Main/preload services mediate renderer access.
- The embedded website is sandboxed and receives no ChampCity preload.
- MCP callers need authentication when configured and an exact registered-project identity.
- The Background Agent and worker accept only their bounded local control/process protocols.
- Codex works within the selected execution policy and explicit approval boundary.
- Secrets and concrete local paths must not enter governed project artifacts or diagnostics intended for sharing.
- ChampCity A/I Server is outside this architecture; no server-owned control plane is implied.
