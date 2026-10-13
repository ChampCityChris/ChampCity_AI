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

Connectors may also request `offline_access` with `files.read` or `files.write`. This scope supports long-lived connector sessions and grants no additional repository or tool access. Access tokens last one hour; refresh tokens last 30 days and rotate on use while retaining the granted scopes. Existing clients still receive working refresh tokens without requesting `offline_access`; no registration or stored-record migration is required. Requests for `offline_access` alone are rejected.

A Public Base URL is connector metadata and must be HTTPS. It does not make the current loopback-only listener publicly reachable by itself. Do not change these settings unless the connector topology and authorization consequences are understood.

The embedded ChatGPT session and MCP OAuth are separate:

- signing into ChatGPT authorizes the website session in its persistent embedded-browser partition;
- MCP OAuth authorizes a registered client and scopes its tool calls.

One does not prove the other is ready.

## Stable public toolbox names

Public ChampCity MCP top-level toolbox names are stable compatibility boundaries. Add new capabilities as actions to an existing toolbox whenever a reasonable domain owner exists. Creating another top-level toolbox requires explicit Operator direction because downstream clients may require plugin recreation, contract rescanning, or security re-evaluation to discover it.

Use `git_toolbox` for local Git operations; use `integration_toolbox` for project-independent Forgejo/GitHub hosted repository, pull-request, release and asset operations. `release_toolbox` is the legacy ChampCity Desktop product release compatibility surface and requires a registered ChampCity RepositoryCheckout. Project-independent provider operations require no workflow Project, workspace registration or synthetic `repositoryCheckoutId`. Hosted identity always comes from explicit `providerId`, `owner` and `repository`, even when the local source repository has a different provider or origin.

Local discovery supports ordinary repositories, separate Git directories, and linked worktrees sharing a trusted common directory with any ordinary directory name. A bare common directory is metadata, never a working checkout. Every checkout, pointer, common directory and backlink must remain canonical inside Trusted Local Git Roots and agree with Git's resolved topology. Redirects, hardlinked metadata, alternate object stores, external configuration includes and unsafe merge/transport helpers remain rejected.

`git_toolbox` accepts either a registered `workspaceId` plus `repositoryCheckoutId`, or a `localCheckoutHandle` discovered beneath application-owned local access roots. External repositories require no workflow registration. These target forms are mutually exclusive.

For local repositories, first discover repositories, then call `select_repository_context` with the discovered `repositoryHandle`. Optional `localCheckoutHandle` or `branchName` selects an available checkout; selection does not change branches. The result identifies the repository, available worktrees, selected checkout, active branch and HEAD. Selection also returns an opaque `repositoryContextHandle`, owned by the running Agent Harness host and authenticated client principal. Pass this handle explicitly to `inspect_repository_context` and every local checkout operation (alongside `localCheckoutHandle`) across reconnects or separate tool invocations. Contexts are independent and expire with their selected checkout handle after at most 30 minutes; restarting the host requires rediscovery and reselection. An explicit context takes precedence over the current transport selection. Omitting it retains independent same-session selection behavior. Every call still requires the action's current OAuth scope. Removing a relevant trusted root invalidates its contexts, including after that root is added again. Routine Git actions still require an explicit checkout handle belonging to that repository; another worktree of the same repository is permitted. Results identify both selected and targeted checkout. Use `inspect_repository_context({repositoryContextHandle})` to verify context, or `select_repository_context` to switch repositories. A failed switch clears the previous selection. Moved, inaccessible, replaced, expired or removed selected checkouts produce `REPOSITORY_CONTEXT_STALE` and require rediscovery and reselection. Context never creates a Project or workflow record.

The LLM can manage local access setup through `inspect_local_git_access` and `configure_local_git_access`. Inspection returns an opaque configuration digest and root count. Configuration requires `files.write`, the expected digest, an `add` or `remove` operation, and at most 32 explicit directories. Additions require existing canonical directories without redirects; stale writes fail before changing settings. The app persists this policy outside repositories, and removing a root revokes its handles on subsequent use. No local paths or credentials appear in configuration results, and no manual Settings step or per-repository approval is required.

Remote inspection includes `inspect_remote` (sanitized destination identities, fetch/push consistency, mirror state and opaque binding digest) and `inspect_remote_refs` (at most 1,000 exact branch/tag object IDs, including annotated-tag peeled commits). Credentials in remote destinations are rejected. Local transport identities contain no filesystem paths.

`pull_branch` requires the branch, remote, remote branch, exact expected local commit, optional expected remote commit, and `ff-only`, `merge` or `rebase` strategy. It fetches one exact branch without pruning or importing tags. Diverged merge/rebase candidates use the existing isolated-operation lifecycle. Conflict responses provide an operation ID and candidate local checkout handle; resolve and stage files there, then use `continue_isolated_operation` and `advance_isolated_operation`, or `abort_isolated_operation`. Local abort preserves unexpected/untracked content instead of force-discarding it. Rediscovery after restart restores access to durable operations.

Hosted remote add/replace/remove and clone use provider-owned primitives through `integration_toolbox`. Local repositories can also use `clone_local_repository` to clone the selected repository's exact expected branch commit into a missing trusted destination, and `bind_local_repository_remote` to add/replace a remote pointing to an independent authorized source checkout handle. `remove_remote`, `rename_remote` and `configure_remote_tracking` operate on an inspected configured remote with its exact binding digest, which includes fetch refspecs. Tracking configuration selects one named source/tracking branch, never a raw refspec. MCP does not accept raw remote URLs. Cloning requires explicit selection of the returned repository before subsequent operations.

`integration_toolbox` provides global provider status, paged repository listing, exact repository inspection, empty creation, settings changes, branches/tags, bounded UTF-8 contents, pull requests/reviews and cloning without a workspace. `bind_repository_remote`, `remove_repository_remote` and `verify_hosted_repository` require either an exact registered checkout or a checkout from the explicitly selected local repository. Every action names a configured provider and a bounded hosted repository; an owner defaults only from a Forgejo connection's namespace policy. GitHub requires an explicit owner and repository. Raw destinations, hostname overrides, tokens and shell/config commands are rejected.

For GitHub, use `providerId: github` and `connect_hosted_provider` to connect the MCP host's official provider session. `disconnect_hosted_provider` closes it. This session is independent of the foreground Settings session; the existing pinned runtime, native OAuth, exact discovery and last-known-good recovery are reused. Status lists only discovered official capabilities and separately identifies named compatibility methods that require a GitHub CLI account matching the official authenticated user. The app checks account identity before these fixed commands and excludes ambient token/host overrides. File reads resolve an exact commit and verify canonical metadata; file writes/deletes use blob SHA, and PR merge sends the expected HEAD. Private HTTPS Git resolves a matching account credential only inside the application and scopes it to the exact destination in the existing runner.

GitHub hosted release objects use `list_hosted_releases`, `inspect_hosted_release`, `create_hosted_release`, `update_hosted_release`, `delete_hosted_release`, `upload_hosted_release_asset`, `download_hosted_release_asset` and `delete_hosted_release_asset`. These global actions require explicit hosted coordinates. Updates, deletion and asset changes require the inspected release `stateId` as `expectedState`. Upload refuses replacement and addresses the exact release ID. Official tools are used where their contracts are verified; the current pin's release writes and binary asset transfer use named fixed GitHub CLI compatibility commands. No build or publication sequence is chosen by ChampCity.

Upload selects exactly one source: small inline `contentBase64` (at most 512 KiB decoded), or all of `repositoryContextHandle` (or an existing same-session selection), `localCheckoutHandle`, `relativePath`, `expectedSha256` (lowercase hex), and `expectedSize` (1 byte through 2 GiB). Local files require a verified portable repository context or the current session selection, ordinary checkout-contained paths, and size/hash verification before provider mutation. Git control metadata, symlinks, redirects, hardlinks, devices, directories, traversal and absolute paths are rejected. The application streams a verified private disk snapshot to the provider; source changes during snapshot creation fail before upload. The response retains the release state token and bounded asset ID, name, size and provider digest.

Download requires `providerId: github`, `owner`, `repository`, `releaseId`, `assetId` and the release `expectedState`. It streams up to 2 GiB into an application-owned temporary artifact and returns only an opaque `artifactHandle`, filename, size, calculated SHA-256, provider digest and retention interval. Provider SHA-256 digests are compared automatically; other digest forms remain observable for comparison. Release inspection exposes each asset's digest without downloading. Downloads reject changed release state before and after transfer. Temporary artifacts expire after 30 minutes and are removed on provider shutdown; at most two retained/in-flight artifacts (4 GiB aggregate reservation) are permitted. The opaque handle identifies verification evidence; this action does not persist to an arbitrary filesystem destination.

GitHub `configured` means the application has the official provider definition; `authentication-required` means it must be connected and authenticated using `connect_hosted_provider`. Named compatibility capabilities marked `requires-matching-cli-account` additionally require GitHub CLI authenticated to `github.com` as the same login reported by the official MCP provider, with repository Contents read/write access appropriate to the operation. Connecting official MCP alone does not prove CLI readiness. Fixed compatibility routes check account identity on each invocation and never expose raw commands or credential input. Forgejo `not-configured` requires deployment settings and an existing credential reference; the product does not choose or hardcode an instance.

For an initialized local repository, `inspect_git_identity` returns effective author identity and an opaque local configuration digest; `configure_git_identity` sets only local author name/email with that expected digest. `checkout_branch` can leave detached HEAD with expected checkout and target-branch commits. `restore_file_cas` restores one ordinary file's index and/or working contents from an explicit commit or the current index. `inspect_tag_object` and `delete_tag_cas` inspect/delete the exact local tag object, including annotated tags. Direct cherry-pick/revert accepts an optional validated mainline parent. Linked worktrees expose observed lock state and `set_local_worktree_lock` checks expected branch, HEAD and prior lock state before locking/unlocking. Arbitrary configuration and destructive force cleanup remain unavailable.

Forgejo connections are configured in application Settings with an API base URL, user/organization namespace, preferred Git transport and optional expected SSH host/port. HTTP API and HTTP Git transports each require an explicit setting. Authentication lives in Windows Credential Manager under a connection-specific reference bound to the endpoint and namespace; changing an endpoint cannot reuse its prior token. Credential values have a Settings-only route and never enter MCP arguments, provider results or project files. Private HTTPS Git operations resolve that same connection credential inside the application, scope authorization to the exact configured destination and refuse redirects. Secrets never enter Git arguments or repository configuration. SSH uses the existing SSH authentication mechanism.

Hosted creation uses `auto_init=false`, verifies new repositories are empty, and reuses an existing matching repository without changing its source. Settings changes require the exact inspected `state` digest and are serialized within the ChampCity provider runtime. Provider status reports `settingsConcurrency: application-expected-state`; this adapter does not claim server-atomic compare-and-swap against other clients. After a provider-owned remote is bound, branch/tag synchronization remains with `git_toolbox`. Verification can compare exact advertised branch/tag IDs. Cloning returns a new local handle and requires explicit repository selection before routine operations.

Hosting lists accept explicit `page` and `limit` (at most 50); a full page returns a possible `nextPage`, so the next page may be empty. `write_hosted_file_cas` and `delete_hosted_file_cas` send the inspected blob SHA; creation uses `expectedSha: absent`. These guards concern file contents, not the entire branch head. Ref creation uses an exact source commit; ref deletion requires the inspected commit and rejects protected branches. PR edits require the inspected `stateId` as `expectedState`. PR merge requires `expectedHead` and a selected merge method; it never forces a merge, deletes the source branch or schedules a later merge. Reviews target an explicit expected commit. Status distinguishes adapter contract evidence from discovered official MCP tools, and reports which mutations have server SHA guards and which have application expected-state checks. Ref deletion and PR editing cannot exclude simultaneous writers outside this runtime. A failed or interrupted provider write requires reinspection before retrying.

Additional local Git actions use the same selected checkout and `files.read`/`files.write` scopes. `inspect_git_state` returns HEAD, the active branch ref (null when detached), conflicts, operation markers and an opaque `state` fingerprint of the branch, index, dirty bytes and operation metadata. Stash, reset, file move/removal, detached checkout, direct Git transforms and recovery require that fingerprint as `expectedState`; stale state fails before mutation, including switching to another branch at the same commit. `inspect_git_file` returns UTF-8 text with `fileState` and `indexState`. `write_git_file_cas` requires both identities and can stage the written file; `resolve_conflict_file` requires a currently conflicted file and stages its resolution. Paths select ordinary individual files without links, traversal, repository metadata or nested repositories. File text is bounded to 256 KiB and dirty mutation inventories to 256 files. These are application preconditions and do not lock out unrelated external processes.

`stash_create` requires exact paths and supports explicitly selected nonignored untracked files with `includeUntracked`. Stash apply/pop/drop require the inspected stash index and exact stash commit; a failed apply retains the stash and returns observed checkout state. `reset_ref` exposes soft and mixed modes, preserves working files, and returns the prior commit for reflog recovery. `checkout_ref` detaches HEAD only from a clean checkout. `begin_git_operation` and `recover_git_operation` expose direct merge/rebase/cherry-pick/revert execution and continue/abort/skip; they preserve Git conflict state for the agent to inspect and resolve. Merge skip is unavailable. Existing isolated-operation actions remain available. `blame`, literal `grep`, notes inspection/write/removal, connectivity diagnosis, authenticated remote prune and exact nonignored untracked-file deletion fill additional Git gaps. Notes writes require the inspected notes ref or `absent`. Prune requires the inspected remote binding and tracking-ref fingerprint. No arbitrary Git command, editor, endpoint or shell is exposed.

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
