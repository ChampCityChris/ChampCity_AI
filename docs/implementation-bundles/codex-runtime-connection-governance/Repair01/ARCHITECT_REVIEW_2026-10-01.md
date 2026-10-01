# CRC-R01 Architect Review — 2026-10-01

**Implementation checkpoint:** `b5f7619532b07ce074b897bc301b8decf3a4b23e`  
**Disposition:** **ACCEPTED — SIGNAL FORGE IMPLEMENTER RETEST AUTHORIZED**

## Review result

CRC-R01 fixes the reproduced failure class without conflating ChampCity Agent Harness OAuth with Codex outbound MCP authentication.

The managed Codex runtime now has an application-owned connection boundary. Ambient user/project MCP servers are inventoried and explicitly disabled unless they are present in the ChampCity-approved connection projection.

The observed Cloudflare/GitHub invalid-token workers can therefore no longer automatically participate in a ChampCity-managed Work Card turn.

## Managed runtime boundary accepted

The implementation uses a mechanism proven against the pinned managed Codex runtime rather than assuming configuration semantics.

Production launch builds explicit `mcp_servers` enable/disable overrides before starting `app-server`.

The permanent pinned-runtime proof demonstrates that:

- ambient user MCP entries remain present in the user's standalone configuration;
- ChampCity launch overrides mark them disabled;
- their worker processes do not start;
- project-local MCP additions are also disabled at `thread/start`;
- the user's standalone Codex configuration file is not modified.

This is sufficient isolation for the V1 recovery objective while preserving the existing Codex model-authentication boundary.

## Connection policy accepted

ChampCity owns a bounded projection under application user data:

```text
codex-runtime/connections.json
```

with:

```text
name
enabled
required | optional
```

Missing projection means no approved external MCP connections.

Ambient presence is not approval.

Optional connections are conservatively excluded from the actual implementation process in this recovery version, even if their preflight is healthy. This prevents an optional worker from failing later and taking down the implementation transport.

Required connections must preflight ready before implementation can proceed.

## Pre-turn connection checks accepted

The runtime:

1. inventories connection names without starting workers;
2. launches a disposable preflight App Server with only approved candidates enabled;
3. reads `mcpServerStatus/list`;
4. projects required/optional readiness;
5. blocks on a nonready required connection;
6. launches the implementation App Server with only ready required connections enabled;
7. rechecks the managed boundary before the implementation turn.

Unapproved initialized connections fail closed.

The original invalid-token failure class is therefore prevented before `turn/start`.

## Settings boundary accepted

Settings now includes a separate **Codex Connections** panel.

It is distinct from:

- Agent Harness public OAuth;
- Agent Harness registered clients/tokens;
- the ChampCity GitHub provider.

The panel exposes bounded status plus Refresh and Enable/Disable actions for already-approved connections.

No bearer tokens, refresh tokens, secrets, or raw configuration are accepted through this UI.

## Authentication scope

A generic third-party Connect/Reconnect flow is intentionally **not** implemented in CRC-R01.

That is acceptable under the controlling card because the pinned runtime does not yet have a ChampCity-owned, provider-neutral authentication workflow in this implementation.

For now:

```text
optional unauthenticated connection
-> warning
-> excluded from implementation

required unauthenticated connection
-> explicit blocker
-> Settings > Codex Connections
```

A later dedicated connector-authentication card is required before ChampCity can safely authenticate arbitrary third-party MCP connections from this panel.

This limitation does not block the Signal Forge repair because Signal Forge does not require the failing ambient Cloudflare/GitHub MCP connections.

## Authentication diagnostics accepted

Runtime stderr is line-buffered before projection and passed through shared redaction.

The implementation redacts bounded classes including:

- bearer values;
- authorization/cookie headers;
- access/refresh tokens;
- client secrets;
- API keys/passwords;
- JWT-shaped values;
- URL query strings.

The permanent split-field fixture covers chunk-boundary leakage.

## Model/runtime readiness remains separate

Managed Codex model probing disables all external MCP connections.

A required connector problem therefore does not turn a healthy Codex runtime/model catalog into generic runtime unavailability.

Implementation controls additionally expose required-connection readiness and optional warning count.

## Validation disposition

The Implementer report records:

- production build: pass on normal Windows;
- runtime/transport/Settings/capability owners: 54/54 pass;
- execution owner + capability checks: 43/43 pass;
- final managed-connection owner rerun: 6/6 pass;
- repair validation-plan preview: pass;
- `git diff --check`: pass.

Architect review inspected the production connection policy, launch overrides, project-local thread override, required-connection checks, Settings surface, diagnostic redaction, and pinned-runtime proof.

## Non-blocking architectural limit

Approval is currently keyed by connection name. No current ordinary Work Card requires an approved external MCP connection, so this does not affect Signal Forge. Before ChampCity introduces required managed third-party MCP connections broadly, the connection identity model should be revisited to decide whether approval must also bind provider/transport identity rather than name alone.

This is not required to resolve the current ambient invalid-token defect.

## Next step

Operator retest the Signal Forge Implement action.

Expected behavior:

```text
environment ready
-> managed Codex starts
-> ambient Cloudflare/GitHub MCP entries disabled
-> no invalid-token worker fatal
-> implementation turn proceeds
```

Then open Settings and confirm **Codex Connections** is visible separately from Agent Harness OAuth. With the current empty/default approved set it should report that no approved external connections are configured.
