# RMCP01 — Project-Independent Git Access and Session Isolation

**Status:** Implemented at commit e5f564b4. This card is retained as an as-built baseline, not authorization to reimplement.

## Scope

Expose Git repository discovery and management independently from ChampCity workflow registration. Preserve existing git_toolbox operations and localCheckoutHandle targeting.

- Discover/init and operate Git repositories under trusted roots.
- Authorized MCP agents can inspect and configure trusted roots through typed configuration operations using exact expected configuration digest and granted scope. No manual per-repository enrollment.
- Select repository context explicitly per MCP session. No silent switches; checkout handles must belong to selected repository; stale/revoked handles are rejected.
- Existing registered RepositoryCheckout operations remain compatible but are optional for independent Git operation.
- Git operations remain bounded and typed without arbitrary shell passthrough.
- Do not mix independent repository histories, root identities or session contexts.

## Follow-on

RMCP02–RMCP04 close remaining Git operations and provider gaps; RMCP05 uses only generic disposable repository fixtures.

Preserve accepted RMCP01 code and its security and session isolation regressions. No consumer-project acceptance or release system is part of this card.
