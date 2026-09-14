# Troubleshooting ChampCity A/I Desktop

Use **Settings → Agent Harness → Refresh** first. The Settings page reports Background Agent state, Service Host and worker process IDs, worker recovery, runtime build, startup registration, local endpoints, registered MCP projects, OAuth counts, exposed tools, recent activity, and the most recent bounded error.

Do not delete application state, edit startup registry entries, or force-kill processes as a first response.

## Background Agent is unavailable

Symptoms include **Unavailable**, missing process IDs, a handoff message that status could not be confirmed, or an absent tray icon.

1. Select **Refresh**.
2. If **Start Background Agent** is available, select it. This is also the recovery for **Background Agent is stopped by user request**.
3. If a Service Host PID exists but the worker is degraded, select **Restart Background Agent** and refresh after replacement completes.
4. Read the displayed error and recent Diagnostics. A startup-target, endpoint-ownership, or installation-scope error should not be bypassed with manual state deletion.
5. If the installed target cannot be launched, close the foreground window and reinstall the same trusted release and install scope.

Normal foreground launch explicitly requests the Background Agent. If it remains unavailable after reopening ChampCity, retain the exact bounded diagnostic text for support or Architect review.

## MCP Runtime is stopped or unavailable

The Background Agent can be healthy while MCP is stopped.

1. Confirm that **Background Agent State** is ready or healthy.
2. Select **Start MCP Runtime**.
3. If the status remains stopped, confirm **Start MCP Runtime when Background Agent starts** and select **Save Settings** if that is the desired behavior.
4. Check **Host**, **Configured Port**, **Active Port**, **MCP Endpoint**, and the last error. Use host `127.0.0.1` or `localhost`; other bind hosts are rejected.
5. If an automatic port cannot be acquired, select **Restart MCP Runtime**. If the worker itself is degraded, use **Restart Background Agent**.

Stopping MCP does not exit the Background Agent. Exiting the Background Agent removes the process that can start MCP.

## Background Agent update required

This state means the running Service Host belongs to a different ChampCity build generation than the foreground application.

1. Save any workflow notes.
2. Select **Restart Background Agent** in the remediation panel.
3. Wait for **Background Agent State** to return to Ready and select **Refresh**.
4. Retry the MCP-dependent handoff.

Do not continue a handoff through the stale generation; ChampCity blocks this because it may use obsolete runtime state or tools.

## Tray is missing or stale after force-kill

A forced kill can leave Windows displaying a stale notification icon until the tray refreshes, or it can remove the Service Host while an old descriptor remains.

1. Move the pointer over the stale icon or reopen the notification area so Windows removes dead icons.
2. Open **ChampCity A/I** normally. The foreground client probes the authenticated endpoint, removes a descriptor only after endpoint absence is established, and starts a replacement when safe.
3. In Settings, select **Refresh**. If the state is stopped by user, select **Start Background Agent**; otherwise select **Restart Background Agent** only when a live admitted host is shown.

Do not delete the descriptor or launch repeated background processes manually. Endpoint ownership failures are designed to stop rather than take over an uncertain process.

## Agent intentionally stopped

After **Exit Background Agent**, Settings reports a stopped-by-user state and MCP-dependent handoffs remain blocked.

Select **Start Background Agent**. Opening the foreground application also explicitly requests the agent and clears valid user-stop intent. Re-enable **Start Background Agent for my Windows user at sign-in** separately if automatic startup is desired.

## Windows sign-in startup is not working

1. Open Settings and compare **Startup Trigger Scope**, **Login Registration**, **Executable Will Launch**, and **Windows Registration Supported**.
2. Confirm **Start Background Agent for my Windows user at sign-in** is selected.
3. For a Current User install, toggle the preference off, save/allow reconciliation, toggle it on, and verify **Exact trigger detected**.
4. For an Everyone install, the machine trigger is installer-owned. If it is absent or does not match the installed executable, run the trusted installer again with elevation or repair the installation; do not create a competing per-user trigger.
5. If the preference is intentionally off, a sign-in-origin process exits without starting the agent. Open ChampCity when the service is needed.

Record any startup-registration error before reinstalling.

## Everyone uninstall is blocked by another Windows session

The uninstaller will not force-close ChampCity for another user. If it cannot prove that the exact installed executable is unused, it restores the machine startup trigger and leaves installed files in place.

1. Ask every other signed-in Windows user to close ChampCity and select **Exit Background Agent**, or have them sign out.
2. Close the invoking user's foreground ChampCity window.
3. Select **Retry** in the uninstaller.

If endpoint ownership cannot be verified, close only ChampCity processes you recognize and retry. Do not delete program files or the machine Run entry while uninstall is blocked.

## Registered project or workspace access issue

Symptoms include an unavailable registered project, `WORKSPACE_ACCESS_DENIED`, an unknown `workspaceId`, or an ID collision.

1. In **Registered MCP Projects**, find the project and its exact displayed `workspaceId`.
2. If the project moved or a drive is disconnected, restore the original canonical location and select **Refresh**.
3. If the registration is obsolete, select **Remove**, then **Add Project** and choose the intended root.
4. Configure the MCP client to use the exact returned ID. Do not infer an ID from the folder name or alter capitalization/normalization.
5. If two different roots would produce the same ID, leave the original registration unchanged and rename/select a project so registration can be unambiguous.

Selecting a foreground project and registering an MCP project are separate actions.

## Embedded ChatGPT does not load or sign in

1. Read the browser status shown above the embedded pane.
2. Select **Reload ChatGPT** for a page-load or website problem.
3. Select **Retry Browser** when the embedded surface failed to attach or has invalid bounds.
4. Complete ChatGPT sign-in inside the embedded page. Its persistent ChampCity browser session is isolated from the local renderer.
5. If a sign-in window or navigation is blocked, return to the allowed ChatGPT page and retry. ChampCity intentionally restricts navigation and does not inject its preload into remote content.
6. If the page is signed in but a draft does not arrive, troubleshoot MCP separately: confirm Background Agent generation, MCP state, OAuth authorization, registered project, and exact workspace ID.

Do not treat **loaded-auth-state-unknown** as proof of either success or failure; complete the visible sign-in flow and then retry the handoff.

## OAuth or public connector is not ready

- Keep **Authentication** set to **OAuth required** when **Public Base URL** is configured.
- The Public Base URL must be HTTPS and contain no embedded credentials, query, or fragment.
- Use **Import Legacy OAuth Clients** only for a supported local client registry you intentionally selected. Conflicting client metadata is rejected.
- Compare **Registered Clients**, **Active Tokens**, and read/write grant counts with the client's requested scope.
- Remember that a Public Base URL does not turn the loopback listener into a public server.

Never paste access tokens, refresh tokens, authorization codes, or client secrets into an Issue, Work Card, Implementer Report, or support transcript.

## Codex runtime or model is unavailable

The **Model** and **Reasoning** controls are blocked while the managed runtime is initializing/checking, when the model catalog is unavailable, or when a saved selection no longer exists.

1. Wait for the runtime check to complete.
2. Choose an available **Model**, then choose one of that model's **Reasoning** values.
3. If the state is degraded, ChampCity may use the last verified runtime while reporting that currency is unconfirmed.
4. If it is unavailable, restart ChampCity to retry initialization. Confirm network access if the stable runtime check is required.
5. Do not assume **Environment Resolution** ran the Work Card; start implementation only after post-resolution preflight reports eligibility.

## What to capture for review

When recovery does not work, record without secrets:

- the visible state and exact bounded error;
- Background Agent and worker state, not private local paths;
- runtime build/restart-required status;
- startup trigger scope and registration result;
- MCP state and whether endpoints are running, without OAuth tokens;
- registered project ID and availability, without the concrete machine root;
- the workflow step and action that failed.

Return that evidence to the Architect or maintainer. Do not claim Operator acceptance from a successful restart alone.
