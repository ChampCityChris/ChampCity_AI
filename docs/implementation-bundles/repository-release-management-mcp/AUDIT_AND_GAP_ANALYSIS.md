# RMCP — Scope-Corrected Audit and Gap Analysis

**Scope boundary:** ChampCity A/I MCP service only. This document intentionally names no consumer project, release target, build system, artifact pipeline, or update feed.

## Verified baseline

- LOCALGIT01 implemented local Git discovery and repository/checkout handles independent of workflow Project registration.
- RMCP01 is committed, including repository context isolation and typed trusted-root access configuration. Preserve the implemented behavior.
- Current git_toolbox has broad inspection/mutation coverage, including commits, worktrees, branches, tags, merging, fetch/push, some reflog and recovery.
- The old repo_toolbox remains workspace-centric; it must not become a prerequisite for Git.
- Existing official GitHub MCP runtime/provider/gateway with OAuth and read discovery exists. Its write routing is incomplete.
- integration_toolbox was status-only before RMCP provider work. Forgejo adapter work was in progress when implementation stopped.

## Capability gaps to inventory and close

### Git
Diff actual published tool schemas and existing implementation against an exhaustive ordinary Git capability matrix: init, clone, status, log/show, diff, blame, grep/search, index/staging, add/remove/move, commit/amend/fixup, worktrees, branches, switch/restore, merge/rebase/cherry-pick/revert with resolve/continue/abort/skip, stash, reset/ref recovery, tags/notes, remote management, fetch/pull/push, tracking/prune, remote refs, worktree cleanup and safe diagnosis. Implement missing typed operations; do not clone existing implementations. Make unsupported esoteric operations explicit rather than exposing arbitrary shell.

### Forgejo
Provider configuration/credential handling; repository listing, lookup, create and settings; branch/tag/file operations; pull request lifecycle and reviews where supported; provider-owned remotes and exact remote inspection. Git fetching/pushing remains Git-owned.

### GitHub
Refresh verified official server/toolset capability inventory; route real application writes through the existing provider gateway; handle unavailable official operations with narrow application-owned compatibility adapters where necessary; keep connection/auth/recovery consistent.

### Access/context
Trusted root inspect/configure/discover and per-MCP-session selected repository scope. Correctly reject wrong or stale handles. No workflow application registration.

## Not in scope

Release engine, release transaction state, build or validation task execution, project-native scripts, channel promotion, update-feed management, product-specific qualification, UI modernization, workflow Project redesign, custom arbitrary Git shell passthrough.

Provider-hosted GitHub/Forgejo release object operations are acceptable as normal hosting APIs, but **no application-level release workflow** is authorized.

## Scope control

RMCP02/03/04/05 are revised in place. Existing RMCP01 implementation remains. The next Implementer must report precisely which Git/Forgejo/GitHub capabilities already existed and which tool operations were added, with contract-focused tests. No unrelated features.
