# RMCP04 — Full Git Capability Audit and Gap Closure

**Status:** Complete under focused MCP/Git qualification; [implementation report](../Implementer_Reports/IMPLEMENTER_REPORT_RMCP04.md). This replaces the former release-management card; no release orchestrator/build/task/update-feed work is authorized.
**Depends on:** RMCP01, RMCP02, RMCP03.

## Objective

Finish the MCP coverage gap audit so an external agent has a comprehensive typed interface for **ordinary Git** operations. Do not mistake this for a mandate to reproduce every internal/plumbing command in git(1) or expose unrestricted shell execution.

## Required work

1. Produce a source-backed matrix: existing action, published MCP schema, implementation path, missing behavior, action proposed, permission, focused test.
2. Cover the Git families: repository setup/clone; inspect/status/log/show/blame/grep; file/index add/rm/mv/restore/stage; commits/amend; branch/ref/checkout/worktree; merge/rebase/cherry-pick/revert/conflict resolution; stash; reset/reflog/undo; tag/notes; remote config/ref inspect/fetch/pull/push/prune/tracking; diagnostics and housekeeping.
3. Implement only action gaps confirmed in step 1, building on existing git_toolbox and centralized bounded Git execution.
4. Specify destructive operations with exact checkout/ref/file scope, expected ref/value preconditions, noninteractive behavior and comprehensible recovery. Return observed state rather than operating an app-owned recovery workflow.
5. Preserve RMCP01 trusted-root and session context policy. Local file paths must be contained, validated and never reinterpreted as different repositories.
6. Add focused fixture and MCP schema tests, including independent repositories, detached HEAD, divergent refs, merge conflicts, stale expected commits, worktree states, remotes and auth failures.

## Acceptance

A normal full Git development lifecycle can be conducted with ChampCity MCP alone; capability inventory says explicitly what is supported and what is intentionally not exposed. Neither manual CLI nor ChampCity workflow Project enrollment is required. No duplicate Git stack, release orchestration, project task catalog, build engine or application-level versioning.

Produce coverage matrix and implementer report, then stop.
