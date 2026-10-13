# RMCP — Complete Project-Independent Git and Hosting MCP

**Status:** Executed under the Operator's bundle request. RMCP01 is preserved; RMCP02–RMCP05 implementation and controlled MCP qualification are complete. See [qualification evidence](Implementer_Reports/IMPLEMENTER_REPORT_RMCP05.md). This document does not independently grant implementation authority.

## Objective

Make ChampCity A/I MCP a comprehensive, project-agnostic Git and repository-hosting interface for external agents. The agent, not ChampCity, makes decisions about branch strategy, integration, releases, versioning and task sequence. This scope contains **no product-specific acceptance project, release pipeline, build system or update-feed implementation**.

## Required scope

1. **Local Git**: expose all normal Git repository operations through bounded, typed MCP actions, including discovery/init/clone, checkout, worktree, status, diff, log, blame, show, staging/index, commit/amend, branch, merge, rebase, cherry-pick, revert, reset/reflog recovery, stash, tags, fetch, pull, push, remote add/change/remove, upstream, inspection and conflict resolution. Include clean/prune and advanced remote/ref operations as safe, individually named actions where useful. Review the actual Git command set against existing tools: reuse implementations, add only gaps. Do not promise unsupported arbitrary Git subcommand passthrough.
2. **Forgejo**: configured Forgejo API host connections, auth/status, repository list/inspect/create/configure, branches/tags/files, pull requests and other normal repository-host operations supported by the target Forgejo API. Reuse Git tools for Git operations instead of duplicating them. Typed, provider-owned remote binding and remote verification.
3. **GitHub bridge**: update the existing official GitHub MCP integration to support its available read/write repo/branch/file/PR/release capabilities. Use official MCP tools wherever available, with narrow compatibility adapters only for proven gaps. Maintain exact capability discovery.
4. **Trusted roots and context**: preserve completed RMCP01 authorization and explicit session repository-context binding. Authorized agents may inspect/configure approved trusted roots via typed MCP operations and discover repositories without registering a ChampCity Project. Local Git actions require validated opaque checkout handles; session selection restricts targeting. No per-repository workflow enrollment.

## Control model

- Operator's delegated MCP permissions and trusted-root/provider configuration are the security boundary. No additional per-action approval gates.
- Agent owns operational decisions; ChampCity executes only the requested typed action and returns state/evidence/errors.
- No arbitrary shell, raw Git argument vector, uncontrolled path, URL, token or HTTP endpoint input.
- Favor exact expected ref/SHA/config-state preconditions for destructive operations, not approval tokens.
- Preserve existing repositories, worktrees, history, authenticated connections and published MCP contracts.

## Implementation card disposition

- RMCP01: completed Git access and session context; preserve and verify, do not reimplement.
- RMCP02: complete missing local Git + Forgejo service operations and integration_toolbox bridge; reconcile ongoing work with new scope.
- RMCP03: expand/update the existing GitHub official-MCP bridge.
- RMCP04: **replace** prior release/build/task card with targeted Git coverage gap closure and MCP contract qualification. No build or release orchestration.
- RMCP05: **replace** prior named-project qualification with generic disposable-fixture and provider-contract acceptance across at least two unrelated repositories. No named product or release publication.

## Done when

An authorized external agent can discover/select two unrelated Git repos under trusted roots, perform ordinary Git lifecycle tasks and conflict recovery using the exact selected repository handle, configure/reconcile hosted repository connections, use Forgejo repository/PR operations, and use GitHub bridge capabilities, all through published MCP actions and without workflow Project registration, manual CLI, or app-managed decisions.

Do not start implementation without Operator authorization.
