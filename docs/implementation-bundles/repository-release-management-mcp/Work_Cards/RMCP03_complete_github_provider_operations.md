# RMCP03 — Complete Official GitHub MCP Bridge

**Status:** Complete under controlled MCP provider qualification; [implementation report](../Implementer_Reports/IMPLEMENTER_REPORT_RMCP03.md). Executed under the Operator's bundle request after RMCP02.

## Objective

Make the existing ChampCity GitHub MCP bridge capable of normal GitHub repository administration through verified, exposed, bounded official GitHub MCP tools. The external agent chooses each operation.

## Work

- Inspect existing GithubProviderService, githubProviderAdapter, External Provider Gateway, OAuth, version pin and live published contracts. Determine exactly which read/write operations are currently available vs merely advertised.
- Update the pinned official GitHub MCP server and enabled toolsets only as needed, with version/digest validation and last-known-good recovery.
- Route existing official operations for repository list/inspect/create/settings, branch and tag inspection, file read/write/delete, PR create/read/update/review/merge, and GitHub-hosted releases/assets where official toolsets support them.
- For a necessary capability absent from the official server, add only a named bounded compatibility method; do not build a duplicate general GitHub client, issue raw endpoint passthrough, or use raw CLI supplied by the model.
- Publish operations through existing integration_toolbox provider semantics and return exact capability status, expected-SHA/ref staleness and useful bounded provider results.
- Provider repository identity is explicit; it does not come from a workflow Project or from a local origin.
- Preserve secrets, scopes, provider errors, retry visibility and authentication isolation.

## Acceptance

An external agent can execute actual GitHub hosted repository, settings, file, PR, and supported release-object operations via ChampCity MCP—not just inspect them—without workflow registration or manual GitHub UI. Exact discovery and unavailable-capability reporting match the pinned provider. Provider fixture tests and MCP JSON/Zod/publication contracts pass.

No generic release engine, build system, update-feed orchestrator or product-specific release workflow.
