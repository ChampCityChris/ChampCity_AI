# External MCP Provider Governance

Status: current architecture governance

## Purpose

ChampCity A/I must not continuously reimplement provider-specific APIs, CLIs, authentication models, resource state machines, or mutation semantics when a maintained provider MCP exists for that domain.

ChampCity owns orchestration, local repository mechanics, product workflow, deterministic safety boundaries, capability routing, and evidence. External providers own their own remote systems.

The governing rule is:

> Prefer a maintained provider MCP for provider-owned capabilities. Build ChampCity-specific provider mechanics only as an explicitly transitional compatibility path when the provider MCP does not expose a required capability.

This is an anti-sprawl rule. A missing provider capability may justify a narrow temporary adapter; it does not justify permanently cloning the provider into ChampCity.

## Ownership Boundary

### ChampCity-owned capabilities

ChampCity owns behavior that is inherently local to the selected Project, Repository, Host, Execution Environment, Client, or Runtime, including:

- registered Workspace identity and repository containment;
- local filesystem reads/writes governed by ChampCity contracts;
- local Git working-tree state, branch switching, merges, commits, tags, ancestry, and synchronization mechanics;
- build, test, package, validation, and local artifact hashing;
- release-candidate identity and proof;
- workflow orchestration and state derived from ChampCity repositories;
- provider capability discovery, routing, bounded receipts, and failure attribution;
- deterministic checks that bind a provider mutation to the exact Project/Repository/candidate intended by the Operator.

### Provider-owned capabilities

Provider-specific remote resources should be delegated to the provider MCP whenever that MCP exposes a suitable capability, including examples such as:

- GitHub Issues, Pull Requests, Actions, Discussions, repository metadata, rulesets, and other GitHub-hosted resources;
- package-manager/catalog operations owned by their provider;
- cloud, ticketing, communication, or infrastructure-provider resources exposed through maintained MCP servers.

ChampCity should not create a parallel provider-specific toolbox merely because an external API or CLI exists.

## External MCP Provider Gateway

V2 must provide one reusable External MCP Provider Gateway between ChampCity orchestration and provider MCP servers.

Conceptually:

```text
Architect / Implementer / Product Workflow
                 |
                 v
        ChampCity orchestration
                 |
      +----------+-----------+
      |                      |
      v                      v
Local execution        External MCP Gateway
Git / filesystem /          |
build / package             +-- GitHub MCP
                             +-- WinGet MCP
                             +-- future provider MCPs
```

The gateway is infrastructure, not a provider clone. It must provide common MCP client concerns once:

- provider registration and stable provider identity;
- transport/session lifecycle;
- authentication handoff appropriate to the provider;
- tool/resource discovery;
- normalized capability inventory;
- bounded invocation and response handling;
- timeout/cancellation classification;
- redaction and secret non-disclosure;
- provider health/readiness diagnostics;
- capability change detection;
- routing evidence sufficient to attribute which provider/tool executed an operation.

Provider-specific semantics remain behind provider MCP contracts rather than being copied into the gateway.

## Capability-First Routing

ChampCity must reason about required capabilities, not assume tool names or provider implementations.

A provider registration should expose normalized capability evidence such as:

```text
provider: github
capabilities:
  repository.read: available
  issue.read: available
  issue.write: available
  pull_request.read: available
  pull_request.write: available
  release.read: available
  release.create: unavailable
  release.update: unavailable
  release.delete: unavailable
  release.asset.upload: unavailable
```

The normalized capability map is evidence, not an access-control system. The Operator remains the only task authority. The gateway determines only whether the configured provider can mechanically perform the requested operation.

Do not invent a capability because a neighboring provider tool looks similar. If the provider does not expose the required operation, report it as unavailable.

## Discovery and Context Control

External MCPs may expose large tool inventories. ChampCity must not indiscriminately inject every provider tool into every model turn.

Use provider-native toolset/tool filtering when available and expose only the capabilities needed by the active role/workflow. Dynamic discovery may expand the visible surface only when the task actually requires it.

This is both a context-control and safety boundary: fewer irrelevant tools reduce token overhead, tool-selection ambiguity, and accidental provider mutation.

## Transitional Provider Adapters

A direct API/CLI adapter is permitted only when all of the following are true:

1. the required provider capability is absent from the maintained provider MCP;
2. the capability is necessary for a current Operator-directed product/release workflow;
3. the adapter is bounded to fixed operations and cannot become a general provider shell;
4. provider identity, credentials, paths, arguments, and mutation scope are application-derived rather than caller-selected where practical;
5. the adapter is explicitly documented as transitional;
6. an upstream capability trigger for retirement is identified.

A transitional adapter must not grow sideways into unrelated provider capabilities. New provider work should first ask whether the provider MCP now exposes the capability.

When the provider MCP gains equivalent capability, the preferred migration is:

```text
provider MCP capability proven
        -> gateway route added
        -> parity tests pass
        -> transitional adapter disabled
        -> transitional adapter removed
```

Do not keep both implementations indefinitely without an explicit compatibility requirement.

## GitHub Boundary

As of September 17, 2026, GitHub's official `github/github-mcp-server` supports configurable toolsets/individual tools, scope filtering, remote/local deployment, and broad GitHub repository/Issue/PR/Actions/governance capabilities. Its current release surface includes release-read capabilities, while release creation/update/deletion and release-asset upload remain requested upstream rather than generally available release-write tools.

Therefore:

- GitHub MCP should become ChampCity's default provider for GitHub capabilities it actually exposes.
- ChampCity must not duplicate those exposed GitHub capabilities with new bespoke provider code.
- The current `gh`-based GitHub Release write adapter remains a temporary compatibility mechanism only for missing release-write capabilities.
- The External MCP Provider Gateway must represent missing GitHub release-write capabilities truthfully rather than manufacturing them.
- When the official GitHub MCP exposes equivalent release mutation and asset-upload capabilities, the `gh` release-write compatibility path should be retired after parity and recovery testing.

Current external references:

- GitHub MCP Server: `github/github-mcp-server`
- GitHub MCP server configuration/toolset documentation: `docs/server-configuration.md`
- GitHub MCP remote server documentation: `docs/remote-server.md`
- Upstream release-write request: GitHub MCP issue `#1909`
- Additional release-management request: GitHub MCP issue `#2853`

These external references describe provider capability at a point in time. Runtime capability discovery remains the source of truth for what a configured provider actually exposes.

## Release Responsibilities

Release orchestration remains a ChampCity responsibility because it binds local and remote evidence:

```text
validated local candidate
 -> exact source commit/tag
 -> local installer + SHA-256
 -> provider release mutation
 -> provider asset verification
```

The provider gateway performs the remote operation; ChampCity retains the invariants that prove the remote operation corresponds to the intended local candidate.

This distinction prevents two opposite failures:

- ChampCity becoming a permanent reimplementation of GitHub; or
- ChampCity blindly forwarding provider mutations without proving local candidate identity.

## Reversibility and Abandoned Releases

Release attempts are operational state, not immutable success merely because a commit/tag/provider record was created.

A release toolchain must support bounded abandonment of an unpublished candidate. For GitHub, an abandonment path may delete only a provider state that is mechanically proven to be the exact expected draft release. Tag cleanup remains a Git concern and belongs to `git_toolbox`.

Do not rewrite pushed `main` history merely to make an abandoned release attempt disappear. Preserve history and issue the next real release under a new version.

Published immutable releases are not equivalent to drafts and must not be silently treated as reversible release attempts.

## Authentication and Credentials

The gateway must prefer provider-supported authentication and must not create an unnecessary parallel secret store.

Credentials, bearer tokens, cookies, refresh tokens, private keys, and provider secrets must never be returned in model-facing receipts or committed to Project repositories.

Provider authentication scope must be no broader than required by the configured capability set where the provider supports scoped access.

## Failure Semantics

Provider failures must remain attributable. Distinguish at minimum:

- provider unavailable;
- capability unavailable;
- authentication/scope failure;
- provider timeout;
- provider nonzero/error response;
- malformed/truncated provider response;
- local invariant mismatch;
- remote state mismatch;
- ambiguous mutation result requiring re-inspection.

Do not turn a provider timeout into assumed success or assumed failure when the provider may have completed the operation. Re-inspect provider state before deciding the next mutation.

## No Provider Bureaucracy

The provider gateway is not an approval principal and must not introduce new workflow approval gates.

Operator direction supplies task scope. ChampCity enforces deterministic execution boundaries and exact state checks. Provider MCP scope/permission failures are mechanical access results, not workflow approval decisions.

## Implementation Rules

New work that touches an external service must answer, in order:

1. Is there a maintained MCP for the provider?
2. Does it expose the required capability now?
3. Can the capability be routed through the common External MCP Provider Gateway?
4. If not, is a narrow transitional adapter necessary?
5. What upstream capability would allow that adapter to be removed?

A Work Card that proposes new provider-specific production code without addressing those questions is incomplete.

## Validation Standard

Provider-gateway work must prove:

- capability discovery is truthful;
- provider tools can be filtered to a bounded active surface;
- unavailable capabilities fail visibly;
- provider response errors do not corrupt local state;
- no secrets appear in model-facing receipts;
- task context cannot escape the selected Project/Repository/provider binding;
- reconnect/restart preserves provider registration without inventing capabilities;
- transitional adapters and provider-MCP routes cannot both mutate the same resource accidentally;
- migration from a transitional adapter to provider MCP can be tested and reversed before legacy removal.

## Architectural Outcome

ChampCity's durable architecture should contain a small number of reusable execution boundaries rather than an expanding collection of provider-specific toolboxes.

The target is:

> ChampCity knows **what capability it needs**, **which configured provider owns it**, **whether that capability is currently available**, and **how to prove the result**. It should not need to know the provider's entire API surface or perpetually maintain a private copy of it.
