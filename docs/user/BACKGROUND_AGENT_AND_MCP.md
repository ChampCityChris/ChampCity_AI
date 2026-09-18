# Background Agent and MCP Guide

ChampCity A/I Desktop separates the visible application from the services that may need to remain available after its window closes.

## The three local processes

```text
Foreground ChampCity window
  -> connects to the Background Agent Service Host
       -> supervises the Agent Harness utility worker
            -> owns MCP HTTP, OAuth, registered projects, and repository tools
```

### Foreground Desktop process

The foreground Electron process owns the ChampCity window, project selection, workflow services, the constrained preload bridge, the embedded Architect browser, and managed Codex presentation. On normal launch it explicitly starts or reconnects to the Background Agent. Closing the last foreground window shuts down foreground Codex sessions but deliberately disconnects without stopping a healthy Background Agent.

### Background Agent Service Host

The Service Host is a detached mode of the installed ChampCity executable. It owns the Windows tray, the authenticated local control endpoint, worker supervision, restart coordination, sign-in preference, and power suspend/resume recovery. Only one admitted Service Host instance owns a user's canonical endpoint.

### Agent Harness utility worker

The Electron utility worker contains the Agent Harness service. It owns MCP start/stop/restart, the loopback HTTP server, OAuth storage, registered-project resolution, and bounded repository tools. The Service Host monitors and can replace this worker without making the foreground window the lifetime owner.

## Tray controls

Open the ChampCity icon in the Windows notification area. The normal menu includes:

- **Open ChampCity A/I** — launches or focuses the foreground application.
- **MCP Runtime: _state_** — a read-only state line.
- **Start MCP Runtime** or **Stop MCP Runtime** — changes only the MCP runtime state.
- **Restart Background Agent** — gracefully replaces the Service Host and worker.
- **Start Background Agent for my Windows user at sign-in** — toggles the user's startup preference.
- **Exit Background Agent** — gracefully exits the Service Host and worker and removes the tray icon.

For an Everyone install, the menu also shows **Windows startup trigger: Managed for everyone**. The shared trigger belongs to the installer; the checkbox remains the current user's preference.

## Background Agent Exit versus MCP Stop

**Stop MCP Runtime** stops the HTTP/MCP runtime but leaves the Service Host, worker control channel, tray, diagnostics, and restart controls available. Use it when MCP should be temporarily unavailable but background management should remain running.

**Exit Background Agent** shuts down the entire Service Host/worker boundary and records an explicit user stop. The tray disappears and MCP-dependent handoffs are blocked. Use **Start Background Agent** in Settings, open the foreground application, or deliberately start from the tray/startup path to resume. Opening ChampCity explicitly requests the agent and clears the prior user-stop intent.

Do not use Task Manager as the normal stop control. Forced process termination can leave a stale tray display or descriptor until bounded recovery reconciles it.

## Start at Windows sign-in

The installer asks whether the Background Agent should start at sign-in; the recommended default is enabled.

- **Current User install:** ChampCity registers the exact Service Host command for the current user's Windows login. The Settings/tray checkbox updates and verifies that registration.
- **Everyone install:** the elevated installer owns one machine-wide Run entry. Each Windows user receives an independent initial preference and per-user state. A user who opts out exits early when the machine trigger launches for that user; changing the preference does not transfer ownership of the shared Run entry.

A startup-origin launch respects the saved preference. A normal foreground ChampCity launch is an explicit request to make the Background Agent available even if automatic sign-in startup was disabled.

## Registered MCP project access

MCP access is not derived from the last folder visible in the Desktop window. **Settings → Agent Harness → Registered MCP Projects** is the registered-access list.

When adding a project, ChampCity stores a canonical root and stable `workspaceId` in that Windows user's application data. MCP calls must provide the exact registered ID. Unknown IDs, ID collisions, invalid registry state, missing roots, and paths outside the registered root fail closed. Public tool results expose repository identity and relative content without disclosing concrete local root paths.

A registered project can remain listed as **unavailable** if its directory was moved or disconnected. Restore it at the same canonical location, or remove the stale registration and add the intended project.

## Local network and authentication defaults

The MCP HTTP server accepts only loopback hosts (`127.0.0.1` or `localhost`). The default port is `0`, which asks Windows to select an available local port. **Local Service** in Settings shows the active health and MCP endpoints.

Authentication defaults to **OAuth required**. Current OAuth support uses public clients, Authorization Code with PKCE, and separate `files.read` and `files.write` scopes. Stored access and refresh tokens are represented by hashes in the per-user OAuth store. **Local unauthenticated** mode is allowed only when **Public Base URL** is empty.

A Public Base URL is connector metadata and must be HTTPS. It does not make the current loopback-only listener publicly reachable by itself. Do not change these settings unless the connector topology and authorization consequences are understood.

The embedded ChatGPT session and MCP OAuth are separate:

- signing into ChatGPT authorizes the website session in its persistent embedded-browser partition;
- MCP OAuth authorizes a registered client and scopes its tool calls.

One does not prove the other is ready.

## Stable public toolbox names

Public ChampCity MCP top-level toolbox names are stable compatibility boundaries. Add new capabilities as actions to an existing toolbox whenever a reasonable domain owner exists. Creating another top-level toolbox requires explicit Operator direction because downstream clients may require plugin recreation, contract rescanning, or security re-evaluation to discover it.

## Restart-required and build generation

The foreground application calculates the build identity it expects and compares it with the running Service Host. If an older or different build is still running, Settings shows **Background Agent update required** and the lifecycle state becomes restart-required.

Select **Restart Background Agent**. The Service Host drains the worker, launches the exact current executable target, and exits only after bounded replacement coordination. MCP-dependent handoffs remain blocked until the matching generation is ready.

## What to terminate manually

Use the in-product controls:

- MCP only: **Stop MCP Runtime**.
- Entire background service: **Exit Background Agent**.
- Replace stale or mismatched background code: **Restart Background Agent**.
- Remove the application: use Windows uninstall after closing the foreground app.

Do not manually terminate individual utility workers, delete endpoint descriptors, edit OAuth stores, or alter the machine startup entry. Those actions can break ownership checks and recovery. If a process is unresponsive, follow [Troubleshooting](TROUBLESHOOTING.md) and use Task Manager only as a last-resort diagnostic action before reopening ChampCity.
