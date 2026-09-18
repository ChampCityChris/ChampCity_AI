# GitHub MCP provider

REMOTE02 registers the official local stdio provider as `github` through the External MCP Provider Gateway. Settings owns Connect, Restart and Disconnect. Desktop restart restores the runtime identity but reports authentication required; the provider's OAuth token is in memory and is not restored by ChampCity.

## Runtime and authentication

The configured runtime is official stable `github/github-mcp-server` v1.12.2. Windows x64 and ARM64 archive SHA-256 values are pinned from the official release asset metadata. The application downloads only the pinned GitHub release asset, bounds redirects and bytes, verifies the archive, extracts only the expected executable, checks its version, and uses the gateway for initialize, discovery, and authenticated `get_me`. A second discovery must contain the minimum repository, Issue, Pull Request, release and tag read contracts before atomic runtime promotion.

Runtime versions and the current pointer live in application data outside selected repositories. Failed acquisition, probe, authentication or promotion keeps the prior verified pointer and, when available, the existing working session. On a cold update failure the prior runtime is re-probed and authenticated. Updating the application-owned version/digest configuration triggers candidate validation on the next Connect. No caller can choose a version, executable, environment, toolset or download URL. The configuration does not track latest or Insiders automatically.

The provider runs with `context,repos,issues,pull_requests,actions` and OAuth scopes `repo,read:org,workflow`. The `git` and `all` toolsets are absent. A minimal platform environment excludes ambient GitHub tokens and OAuth overrides. Official native browser login owns the entire exchange. Tool-list discovery alone never establishes authentication. Provider fallback messages, URLs, codes and stderr are not returned to Settings or evidence callers. Pending login can be cancelled with Disconnect; unsuccessful authentication expires after two minutes and remains unavailable.

## Read services and release boundary

The constrained main/preload API accepts current-user, repository, Issue, Pull Request, release-by-tag, release-list and tag reads. Repository identity comes from the selected repository's fixed `origin` lookup. Only github.com HTTPS and SSH bindings are accepted. Requests cannot supply paths, coordinates, tools, arguments or credentials. Receipts contain bounded metadata and provider/tool/generation attribution, excluding raw schemas and provider messages.

Capabilities reflect exact discovered tools and required schema fields/methods. Future equivalent write tool contracts can be reported as available, but this card installs no GitHub MCP mutation route. Discovery is evidence, not permission to mutate. Release-write availability is initially expected to be unavailable and must be confirmed by the configured authenticated provider.

Standalone release/tag evidence uses GitHub MCP through `GithubProviderService.read`. The separate background Agent Harness's existing release publication, abandonment and installer verification transactions retain their `gh` state inspections and download/hash checks with the bounded compatibility writes. Sharing the Desktop provider's in-memory authentication with that process is not introduced here. These coupled inspections must not be replaced with a weaker metadata-only check. Local Git and inbound MCP tools are unchanged.

Retirement trigger: when the configured official GitHub MCP exposes equivalent release create/update/delete/asset-upload capabilities with acceptable semantics, open a bounded migration/retirement card. Prove parity and recovery behavior, cut release writes to GitHub MCP, then remove the `gh` compatibility provider. Neither capability discovery nor a runtime update automatically switches mutation ownership.

## Evidence

Credential-free focused tests cover service lifecycle and IPC/preload/renderer projections with synthetic provider sessions. The optional `node test/external-providers/github-provider-live-read.cjs --live-read` command uses official acquisition and OAuth and performs only current-user, bound repository and release-list reads. Its helper runtime directory is application-owned and outside the source repository. No authentication material is printed. Browser authentication requires the Operator; test doubles are not live-provider acceptance evidence.

Sources: [official release](https://github.com/github/github-mcp-server/releases/tag/v1.12.2), [pinned OAuth documentation](https://github.com/github/github-mcp-server/blob/v1.12.2/docs/oauth-login.md), [provider configuration](https://github.com/github/github-mcp-server/blob/v1.12.2/docs/server-configuration.md).
