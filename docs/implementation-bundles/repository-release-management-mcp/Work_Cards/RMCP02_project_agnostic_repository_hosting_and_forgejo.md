# RMCP02 — Complete Git and Forgejo MCP Tools

**Status:** Complete under focused MCP qualification; [implementation report](../Implementer_Reports/IMPLEMENTER_REPORT_RMCP02.md). Existing RMCP01 and prior changes preserved.

## Objective

Provide comprehensive, typed Git and Forgejo operations to external agents without requiring any repository to be registered in the ChampCity workflow application.

## Work

1. Audit the existing published git_toolbox action matrix, Git primitives and in-progress RMCP02 work. Preserve existing actions and avoid duplicates.
2. Complete missing repository/remote operations: inspect exact destinations and refs, add/change/remove provider-owned remotes with expected-current-state protection, clone under trusted roots, pull/reconcile, and conflict-state recovery. Include normal Git operations missing from the existing toolbox—stash, blame, reset, notes, file/index manipulation, maintenance/cleanup, ref/branch/worktree lifecycle—using individually typed bounded actions. Do not treat this list as evidence all are missing; compare against actual source first.
3. Expose configured Forgejo hosting through integration_toolbox with independent provider identity and no workspaceId requirement: status/auth, list/inspect/create repositories, repository settings, branches/tags, repository contents, pull requests and reviews where available, remote binding/clone, and verify host state.
4. Credentials remain application-owned, never in Git remote URLs or MCP output. Explicitly bounded instance/owner/repo identities; no arbitrary API route or Git command.
5. Retain trusted-root configuration and explicit session context behavior from RMCP01. All local operations use an authorized checkout handle matching selected session context. No automatic Project registration, layout conversion, additional approval layer, or automatic cross-repo switch.

## Example contracts

git_toolbox: inspect_remote; inspect_remote_refs; add_or_bind_remote; replace_remote; remove_remote; clone_provider_repository; pull_branch; inspect_conflicts; resolve_conflict_file; stash_list/create/apply/pop/drop; blame; reset_ref; prune_remote; plus other genuinely missing bounded actions.

integration_toolbox: provider_status; list_hosted_repositories; inspect_hosted_repository; create_hosted_repository; update_hosted_repository_settings; inspect_hosted_branch/tag/file; write_hosted_file_cas; list/inspect/create/update/merge_pull_request; remote_binding_status; bind_repository_remote.

Avoid redundant provider-side implementations of Git operations already available through git_toolbox.

## Acceptance

- All documented Git operations are callable through published typed MCP contracts with clear permission classes, not merely internal functions.
- Real external repo access works without workflow registration.
- Forgejo repository and PR/file management works against a configured test instance or controlled API fixture.
- Same-client wrong-repo handles and stale sessions are rejected; separate MCP sessions remain isolated.
- Remote mutation/checkout/reset/stash/conflict actions have bounded preconditions and deterministic status/error responses.
- Invalid paths/URLs/config keys, credentials and unsupported actions are rejected.
- Focused contract/provider/Git-fixture tests and inventory pass.

Do not implement release orchestration, build tooling or product-specific flows. Report precise completed vs remaining coverage; stop at card boundary.
