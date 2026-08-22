<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "implementationEvidence",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC60-03",
    "parentWorkCardId": "WC60"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC60_agent_harness_core_ingestion_and_ai_owned_mcp_runtime.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC60-01_snapshot_bound_champcity_gpt_core_port.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC60-02_ai_authority_workspace_and_toolbox_adaptation.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC58-REPAIR01_app_server_lifecycle_approval_ownership_and_observability_completion.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "A/I-Owned MCP HTTP OAuth Runtime and Lifecycle",
    "status": "approved_for_implementation",
    "sequence": 3,
    "bundleReview": "WC60",
    "dependsOn": ["WC60-01", "WC60-02"],
    "donorCommit": "aaf72e00f6204325a9fd340dc5f53b62d0f8df1c",
    "gitMutationAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC60-03_ai_owned_mcp_http_oauth_runtime_and_lifecycle.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Host the WC60 Agent Harness as an A/I-owned ChatGPT-compatible MCP HTTP/OAuth runtime. Port and adapt the donor HTTP transport, OAuth/DCR/PKCE, tool exposure, and telemetry to A/I userData and Electron lifecycle. Do not port donor process.env mutation, standalone launcher/setup UI, CLI, or release architecture.",
    "reviewedAt": "2026-08-22"
  }
}
CHAMPCITY-METADATA -->

# WC60-03 — A/I-Owned MCP HTTP/OAuth Runtime and Lifecycle

Status: Approved for Implementer execution  
Parent bundle: `WC60`  
Sequence: 3 of 4  
Depends on: `WC60-01`, `WC60-02` complete  
Git mutation: prohibited

## Purpose

Make the ingested Agent Harness a real ChampCity A/I-owned MCP service suitable for ChatGPT tool discovery and calls.

Port the proven donor MCP HTTP/OAuth implementation into the A/I runtime while changing ownership of configuration, lifecycle, persistence, and selected-workspace authority.

This card establishes the service. WC60-04 performs the final standalone-independence and embedded-ChatGPT proof.

## Donor Runtime to Study

Use the exact donor snapshot as the behavioral reference for relevant implementation in:

```text
src/server/createMcpServer.ts
src/server/registerTools.ts
src/server/resultTelemetry.ts
src/server/resultDeliveryTrace.ts
src/server/toolCallTrace.ts
src/server/discoveryTrace.ts
src/transports/httpTransport.ts
src/oauth.ts
src/httpAuthConfig.ts
src/config.ts
src/server/serverLifecycle.ts
```

The donor HTTP transport is substantial and already implements ChatGPT-compatible Streamable HTTP, OAuth metadata, Dynamic Client Registration, PKCE/token handling, scopes, discovery, and tool telemetry. Port/adapt that proven behavior instead of replacing it with an unrelated custom protocol.

However, donor `serverLifecycle.ts` is **not** a copy target. It temporarily rewrites global `process.env` for `CHAMPCITY_GPT_*` lifecycle keys. ChampCity A/I must not adopt that behavior.

## A/I Runtime Identity

The production runtime must identify itself as the ChampCity A/I Agent Harness rather than pretending the standalone ChampCity_GPT application is running.

Use an A/I-owned server identity such as:

```text
name: champcity-ai-agent-harness
display: ChampCity Agent Harness
```

Exact display wording may follow target conventions. Do not break public toolbox names merely to rename the server.

## Runtime Configuration Ownership

Create an explicit A/I harness runtime configuration object/service.

It must receive required configuration through A/I-owned state rather than by mutating process-global environment variables.

Configuration concerns may include:

```text
enabled
host
port
publicBaseUrl
write mode / write capability policy
OAuth state/config location
log location
generated/runtime location
local unauthenticated-development allowance, if retained
nonlocal binding policy, if retained
```

Normal packaged runtime state must live under the A/I Electron `userData` root, for example conceptually:

```text
<ChampCity A/I userData>/agent-harness/
  config/
  oauth/
  logs/
  generated/
```

Exact filenames/subfolders are implementation choices.

Do not read or write ChampCity_GPT's standalone runtime directories.

Do not require `CHAMPCITY_GPT_*` environment variables for production operation.

Development-only environment overrides may remain possible if target conventions support them, but they must be input values to the harness config resolver and must not rewrite unrelated `process.env` state.

## MCP Server Construction

Create the MCP Server using the target repository's current `@modelcontextprotocol/sdk ^1.30.0` APIs.

Required capabilities:

- deterministic `tools/list` from WC60-02 composable providers;
- deterministic `tools/call` dispatch;
- ChatGPT-compatible JSON Schema sanitization where current ChatGPT rejects unsupported schema keywords;
- read/write scope filtering;
- bounded serialized tool responses and result-delivery metadata;
- no hidden fallback to donor source or standalone process.

Do not downgrade the target MCP SDK.

## HTTP Transport

Port/adapt the donor's Streamable HTTP behavior needed for ChatGPT-compatible MCP access.

Required baseline behavior:

```text
local bind default = 127.0.0.1
MCP endpoint = /mcp or target-equivalent stable endpoint
health/status endpoint
session/transport handling required by current MCP SDK
bounded request/body handling
controlled startup failure such as EADDRINUSE
clean connection/server shutdown
```

WC60 does not require the A/I application to implement a reverse tunnel provider.

A public ChatGPT.com connector may still require an externally reachable HTTPS route to the local A/I server. Public-route/tunnel establishment remains external infrastructure unless separately authorized. The important WC60 boundary is that the **local MCP/OAuth service is A/I-owned** and does not require the standalone ChampCity_GPT application.

## OAuth / ChatGPT Connector Behavior

Port/adapt the donor's existing OAuth behavior required for public ChatGPT-compatible connectors, including where applicable:

- protected-resource metadata;
- authorization-server metadata;
- Dynamic Client Registration;
- authorization endpoint;
- PKCE;
- access-token issuance/validation;
- refresh-token rotation;
- `files.read` and `files.write` scope handling;
- client/token persistence;
- redacted diagnostics.

Do not log bearer tokens, refresh tokens, admin secrets, cookies, authorization codes, or PKCE verifier secrets.

OAuth persistence must be under A/I-owned runtime state.

Do not silently copy the donor OAuth store into A/I. If configuration migration is ever desired, it requires an explicit migration path; WC60 is a clean ownership break.

## Scope Mapping

Preserve the donor's useful high-level scope distinction:

```text
files.read
files.write
```

At minimum:

- tool discovery and read-only toolbox actions operate with `files.read`;
- write/patch/attachment and any A/I-authorized Git mutation action require `files.write`;
- local A/I workflow authority still applies after OAuth scope authorization.

OAuth scope is transport authorization, not a replacement for A/I workflow authority.

## Electron Lifecycle

The A/I main process owns harness lifecycle.

Required behavior:

```text
app/runtime ready
→ create/start Agent Harness MCP service when configured/enabled
→ expose status to A/I
→ serve requests
→ stop gracefully on disable/restart/application shutdown
→ force-close only after bounded graceful timeout when needed
```

Add deterministic shutdown wiring through the A/I application lifecycle.

Do not create a separate standalone Electron process for the harness.

Do not shell out to the ChampCity_GPT executable.

Do not use donor lifecycle code that temporarily rewrites `process.env`.

### Startup failure

Port useful controlled failures such as:

```text
port already in use
invalid configured public URL
OAuth config unavailable
bind failure
```

A startup failure must be visible as harness runtime state and must not crash unrelated A/I workflow state where recovery is possible.

## Minimal A/I Runtime Status Contract

Expose enough main/shared/preload state for WC60-04 to display/validate:

```text
state: stopped | starting | running | stopping | failed
enabled
host
port
health endpoint
MCP endpoint
public base URL presence/redacted host
OAuth enabled/configured state
public tool count/names or exposure summary
active selected workspaceId
active selected project root summary
last startup/shutdown error, if any
```

Do not expose secret values.

This is a runtime/status contract, not a new large settings UI.

## No Global Environment Mutation

This is a hard acceptance boundary.

Starting/stopping the Agent Harness must not temporarily rewrite or restore global environment keys in the manner used by donor `serverLifecycle.ts`.

Test this explicitly with sentinel environment variables:

```text
before start
→ sentinel values captured
→ start/stop harness
→ unrelated process.env values unchanged
```

Harness config is passed as values/objects to the runtime.

This is especially important because WC57 owns refreshed parent-process development environment state and WC58 spawns Codex App Server from that state.

## No Donor Runtime Dependency

Production/runtime source must not:

- import files from the ChampCity_GPT checkout;
- invoke its CLI;
- invoke its packaged executable;
- inspect its runtime directories;
- read its local config as authoritative input;
- require its server to already be running.

## Required Proof

1. MCP server unit/protocol tests prove `initialize`/session behavior required by the target SDK, `tools/list`, and `tools/call` through the A/I-owned runtime.
2. Tool exposure tests prove public action/schema output is ChatGPT-compatible and scope-filtered.
3. HTTP integration test starts the actual A/I harness on loopback/ephemeral port and calls health plus MCP endpoints.
4. OAuth tests cover metadata, Dynamic Client Registration, PKCE/token issuance, access-token scope enforcement, and refresh behavior retained from donor where applicable.
5. Read-only token/scope cannot execute write action; `files.write` passes transport authorization and then reaches A/I action authority.
6. Runtime-state tests prove A/I start/running/stop/failure transitions.
7. Shutdown test proves all HTTP listeners/transports close on application/service disposal.
8. Environment regression proves start/stop does not mutate unrelated A/I `process.env` values.
9. Runtime-path tests prove A/I `userData` paths are used and donor runtime/config paths are not required.
10. Selected-workspace context passed into tool calls matches WC60-02 authority.
11. Static dependency scan proves no target production code imports/invokes the donor checkout/application.
12. Typecheck/build/focused MCP/OAuth tests/full suite pass.
13. Donor repository remains unchanged and clean.

## Acceptance Criteria

1. ChampCity A/I hosts its own MCP HTTP server from A/I production source.
2. MCP tool discovery/calls use WC60-02 composable A/I-owned providers.
3. The target current MCP SDK remains authoritative; no downgrade is performed.
4. OAuth/DCR/PKCE behavior required for ChatGPT-compatible public connectors is A/I-owned.
5. Runtime/OAuth/log/generated state is stored under A/I-owned runtime paths, not ChampCity_GPT paths.
6. `files.read`/`files.write` scope distinction is preserved without replacing A/I workflow authority.
7. The harness lifecycle is owned by the A/I Electron main process.
8. Application/service shutdown closes the A/I-owned MCP runtime deterministically.
9. Starting/stopping the harness does not rewrite global A/I process environment state.
10. A local A/I MCP service can start and pass protocol tests with the standalone ChampCity_GPT application stopped.
11. Public HTTPS tunnel automation and general Browser-role orchestration are not introduced.
12. No donor repository dependency/modification is introduced.
13. No Git mutation is performed.

## Implementer Report

Required path:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC60-03_ai_owned_mcp_http_oauth_runtime_and_lifecycle.md`

Leave `Document.Status=Pending`.

If complete and automated acceptance passes, proceed to WC60-04 without an individual Architect disposition.
