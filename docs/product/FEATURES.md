# ChampCity A/I Desktop Feature Reference

This reference describes capabilities implemented in the current Desktop source and tests. It is organized by product capability, not by historical Work Card chronology.

## Project entry and control

- **Open Existing Project** selects a validated project directory and opens its **Workflow Hub**.
- **Start New Project** selects a writable directory and begins at **Project Intake**.
- The Electron main process owns the selected path. The renderer receives a constrained projection rather than unrestricted filesystem access.
- Current workflow state is derived from canonical repository Markdown records and their application-owned metadata.

## Development workflow

The **Development** Workflow Hub entry leads to a nested project, phase, and Work Card workflow.

Project stages use the current labels:

```text
Project Intake -> Architect Interview -> Project Planning -> Phase Map
  -> Phases -> Project Validation -> Project Close
```

Within a phase, ChampCity provides **Phase Intake**, **Planning**, **Work Cards**, **Validation**, **Close**, and **Next Phase**. Project and phase planning services prepare evidence-bounded Architect handoffs, detect MCP-created temporary drafts, validate their expected structure, and promote approved documents into canonical project records.

The Work Card loop provides:

```text
Work Card Map -> Planning -> Implement -> Review & Validation -> Repair -> Close / Next
```

- **Work Card Map** derives candidate eligibility and the current required card from repository evidence.
- **Planning** prepares the exact Work Card context and supports review dispositions such as **Approved** and **Request Revision**.
- **Implement** reserves the required Implementer Report and runs Codex only against the selected approved contract.
- **Review & Validation** presents the current contract, Implementer Report, optional Architect advisory context, and validation evidence to the Operator.
- **Repair** creates a bounded evidence-derived correction loop without replacing the parent Work Card identity.
- **Close / Next** records close state and returns to the Work Card map or the next eligible item.

Phase and project validation/close services use repository-derived evidence and do not let the Implementer claim Operator acceptance.

## Issue and Fix Card workflow

The separate **Issue Resolution** workflow uses these parent stages:

```text
Intake -> Architect Planning -> Issue Planning -> Fix Cards -> Issue Validation -> Issue Close
```

- Issue Intake creates an Issue record from the Operator's title, problem, consequence, needed capability, and discovery context.
- Architect Planning and Issue Planning prepare and review the investigation, resolution plan, and Fix Card plan.
- The **Fix Card Loop** uses **Fix Card Map**, **Planning**, **Implement**, **Review & Validation**, **Repair**, and **Close / Next**.
- Aggregate **Issue Validation** determines whether the Issue is resolved or requires bounded corrective planning.
- **Issue Close** records the final Operator decision and returns to the Workflow Hub.

Development and Issue Resolution maintain separate repository-derived state; an Issue Fix Card does not silently rewrite the active Development lifecycle.

## Screenshot and evidence intake

Issue Intake accepts clipboard screenshot evidence through the current **Screenshot Evidence** panel. Users paste screenshots anywhere in the form; there is no arbitrary file-upload surface. Current limits are:

- PNG, JPEG, and WebP;
- at most four screenshots per Issue submission;
- at most 5,000,000 decoded bytes per image and 20,000,000 decoded bytes in aggregate;
- at most 4096 pixels in either dimension, with an additional pixel-area limit.

ChampCity validates the image in the renderer and main process, writes repository-contained evidence with deterministic names, and records only repository-relative evidence paths in the Issue record.

## Embedded Architect browser and handoff

Architect work uses an embedded, sandboxed ChatGPT surface with a persistent ChampCity-specific browser session. Node integration is disabled, context isolation is enabled, no ChampCity preload is attached to the remote page, and navigation is restricted by the browser service.

The normal handoff flow is explicit:

1. select **Prepare Handoff**;
2. select **Copy Handoff**;
3. paste and send it in embedded ChatGPT;
4. allow the authorized MCP flow to create the temporary draft;
5. use **Refresh** and review the draft before promotion.

Direct final Architect-output import is retired. Browser status, **Reload ChatGPT**, and **Retry Browser** surface recoverable loading or attachment failures. The embedded site's sign-in session is separate from MCP OAuth authorization.

## Codex Implementer

- A managed Codex runtime is bootstrapped from the packaged dependency and can stage a newer stable runtime after source and integrity checks.
- The UI reads the live model catalog and requires explicit **Model** and **Reasoning** choices; stale or unavailable selections block execution.
- Development Work Cards and Issue Fix Cards share the managed runtime while retaining separate execution identities and repository contexts.
- Codex App Server streams progress, tool calls, approval requests, command-impact explanations, failures, cancellation, and completion back to the UI.
- Environment-resolution execution is distinct from Work Card implementation and reports whether implementation is eligible to start afterward.

## Background Agent and tray

The independent Background Agent Service Host can outlive the foreground window. It supervises the utility worker, recovers it when bounded health checks require recovery, and responds to Windows suspend/resume events.

The Windows tray provides:

- **Open ChampCity A/I**;
- MCP state plus **Start MCP Runtime** or **Stop MCP Runtime**;
- **Restart Background Agent**;
- **Start Background Agent for my Windows user at sign-in** for the user's preference;
- **Exit Background Agent**.

An Everyone installation additionally identifies the Windows startup trigger as managed for everyone.

## MCP runtime and registered projects

- The MCP HTTP runtime binds only to `127.0.0.1` or `localhost`.
- Port `0` selects an available port automatically.
- Default authentication is OAuth with Authorization Code plus PKCE; scopes distinguish `files.read` and `files.write`.
- **Local unauthenticated** mode is permitted only without a public base URL.
- **Registered MCP Projects** stores exact canonical project roots per Windows user. Unknown or colliding `workspaceId` values fail closed.
- Registered projects may be Git-backed or ordinary writable directories. Availability is re-evaluated rather than silently changing registration.
- Repository tools apply containment, size, traversal, and mutation restrictions and do not expose concrete project roots in public tool results.

## Settings, status, and diagnostics

**Settings → Agent Harness** exposes:

- Background Agent state, Service Host and worker process IDs, recovery state, runtime build, sign-in registration, and restart-required status;
- MCP **Start**, **Stop**, and **Restart** controls;
- the sign-in startup preference;
- host, port, public base URL, authentication mode, and **Start MCP Runtime when Background Agent starts**;
- registered project management;
- local endpoints, public connector/OAuth counts, tool exposure, and recent diagnostic activity;
- an explicit legacy OAuth client import action for supported existing local registrations.

## Windows installation behavior

The interactive x64 NSIS installer supports Current User and Everyone scopes, optional elevation, destination selection, Start Menu and desktop shortcuts, and a Background Agent sign-in choice. Both scopes keep application data and credentials per Windows user. The uninstaller performs bounded graceful shutdown, removes only the applicable startup registration, never force-kills another user's process, and preserves user data.

See [Installation and Uninstall](../user/INSTALLATION_AND_UNINSTALL.md) for details.

## Current limitations

- Windows x64 is the documented distribution target; no cross-platform release is claimed.
- The installer is currently unsigned and no in-app automatic updater is configured.
- ChampCity A/I Server capabilities are not part of Desktop.
- Embedded ChatGPT and managed Codex capabilities depend on their respective services, network access, and user authorization.
- Architect handoff submission remains an explicit copy/paste action; ChampCity observes drafts submitted through the scoped MCP path rather than controlling the ChatGPT page as a privileged repository client.
- Project workflow documents and MCP registrations remain local to the workstation and Windows user; they are not synchronized by a ChampCity cloud service.
