# RMCP05 — Generic MCP Git, Forgejo, GitHub Qualification

**Status:** Complete for controlled MCP qualification; [qualification report](../Implementer_Reports/IMPLEMENTER_REPORT_RMCP05.md). This replaces the former product-specific acceptance card; no live-provider or consumer release acceptance is claimed.
**Depends on:** RMCP01–RMCP04.

## Objective

Qualify the ChampCity A/I MCP service in isolation against disposable Git repositories and controlled Forgejo/GitHub provider fixtures. **No named consumer project is involved.**

## Scenarios

1. Create two unrelated disposable repositories under a trusted root. Discover both without registration. Select one per MCP session and verify access isolation, explicit switch, stale-handle denial and cross-repository mismatch behavior.
2. Exercise ordinary Git tools: init, clone, status, file/index operations, history, branch/worktree, commit/amend, diff/blame/show/grep, stash, merge/rebase/cherry-pick/revert conflict handling, reset/ref/reflog recovery, tags/notes, remote add/replace/remove, fetch/pull/push, tracking/prune and remote-ref inspection.
3. Verify appropriate destructive safeguards, path containment, expected commits, error reporting and no arbitrary shell capability.
4. With controlled Forgejo API fixture or an expressly configured test instance, exercise repository list/inspect/create/settings, branch/tag/content operations, PR lifecycle, provider-owned remote binding, clone and remote verification.
5. With official GitHub MCP schema/auth fixtures (and an expressly configured test repository when available), exercise available read/write repository/branch/file/PR and release-object operations, official-vs-compatibility routing and truthful unavailable status.
6. Check connection/auth failures, token redaction, interrupted operation outcomes and independent session behavior.
7. Verify exact published toolbox JSON/Zod schemas, OAuth read/write scopes and registry inventory against implemented actions.

## Acceptance

All normal Git capability families are represented by typed MCP tools; Forgejo and GitHub provider toolsets are usable through the service; repository use does not require ChampCity workflow registration; multiple repositories never share selected context; actions return bounded observable results. No consumer-project naming, release publishing, build pipeline, update-feed, or ChampCity-managed orchestration.

Stop after qualification evidence for Operator review.
