# CRC-R01 — Isolate Managed Codex Connections and Add Bounded Connection Recovery

**Bundle:** Managed Codex Runtime / Connection Governance  
**Current Dev baseline:** `1952604bd24bd3407ff1d6e399d62474cd5f5da4`  
**Reproduced project:** Signal_Forge  
**Implementer:** GPT 6.1 Sol / Luna Medium acceptable  
**Status:** **ACTIVE — IMPLEMENTER EXECUTION BLOCKER**

## Objective

Prevent unrelated or stale user-level Codex MCP connections from breaking ChampCity-managed implementation runs.

The managed Codex executable is application-owned, but its connection/configuration boundary is not currently isolated. A Work Card implementation can therefore inherit user-level MCP configuration and stale OAuth state that ChampCity did not request.

The observed Signal Forge run reached the Codex App Server and started a turn, then failed inside MCP workers with authentication errors for external MCP endpoints.

Required outcome:

```text
ChampCity-managed Codex runtime
-> ChampCity-approved connection/config projection
-> only approved/enabled MCP connections are presented to the managed runtime
-> optional external MCP auth failure cannot kill an otherwise valid Work Card run
-> Settings exposes bounded Codex connection status/recovery
```

This is not an Agent Harness OAuth repair. ChampCity's public MCP server OAuth and Codex's outbound MCP client connections are separate systems.

---

# Confirmed RCA

## 1. Codex runtime/model authentication itself is working

The failed Signal Forge run successfully reached:

```text
app_server.thread.start requested
turn.started
```

Therefore the managed Codex runtime launched and the implementation turn began.

The failure occurs after turn startup.

## 2. External MCP workers fail authentication

Runtime stderr shows external MCP authentication failures including:

```text
mcp.cloudflare.com
AuthRequired
invalid_token
Token is not authorized
```

and an authenticated GitHub/Copilot MCP endpoint with the same class of OAuth failure.

The failing connections are outbound MCP clients used by the Codex runtime.

They are not the ChampCity Agent Harness MCP server shown in Settings.

## 3. Managed Codex launch does not currently establish an application-owned connection boundary

`src/main/workCardBuilding/codexRuntimeOperations.ts` launches the managed binary with:

```ts
spawn(runtime.executable, ["app-server", "--listen", "stdio://"], {
  cwd: root,
  env: {
    ...process.env,
    PATH: managedCodexPath + process.env.PATH
  }
})
```

No application-owned Codex configuration/home or explicit MCP allowlist is provided by this layer.

The App Server initialize response records `codexHome`, and the live run reports the user's normal Codex home rather than a ChampCity-owned runtime configuration root.

The result is a managed executable with ambient user connection state.

## 4. MCP worker failure is allowed to terminate the active implementation path

`JsonlCodexAppServerTransport` forwards child stderr into the active turn.

If the underlying runtime/worker terminates or the transport closes, pending requests and the active turn fail.

There is no current policy distinction between:

- a required connection failure;
- an optional/unrelated MCP connection failure;
- implementation/model failure.

## 5. Current Settings has no Codex connection owner

`AgentHarnessSettingsWorkspace` controls:

- ChampCity Agent Harness runtime;
- ChampCity public MCP OAuth mode/status;
- registered ChampCity MCP Projects;
- ChampCity GitHub provider.

It does not own or display the managed Codex runtime's outbound MCP client connections.

Do not add Codex connection controls to the Agent Harness OAuth panel as though they were the same credentials.

---

# 1. Establish a ChampCity-owned managed Codex configuration boundary

The managed Codex runtime must no longer blindly inherit arbitrary user-level MCP connection configuration.

Create one application-owned configuration seam for managed Codex execution.

The exact mechanism must be based on the pinned managed Codex runtime's supported configuration surface.

Allowed implementation strategies include:

- an isolated ChampCity-owned Codex home/config root;
- explicit supported runtime/config overrides;
- another pinned-runtime mechanism that demonstrably prevents ambient unapproved MCP inheritance.

Do not assume a configuration mechanism without proving it against the pinned runtime.

The application-owned configuration root belongs under ChampCity user-data, not the selected Project repository.

Do not copy the user's entire personal Codex configuration into it.

---

# 2. Default managed runtime connection policy

For V1, the default managed Implementer connection set is:

```text
built-in Codex capabilities required by ChampCity
+ explicitly ChampCity-approved managed connections
- arbitrary ambient user MCP servers
```

A user-level MCP configured outside ChampCity must not automatically appear inside a ChampCity-managed Work Card run.

This includes unrelated personal Cloudflare/GitHub/etc. MCP servers unless ChampCity explicitly enables them.

Do not break the user's normal standalone Codex configuration.

ChampCity isolation applies only to the managed runtime launched by ChampCity.

---

# 3. Required versus optional connections

Add a bounded connection classification owned by ChampCity.

Equivalent:

```ts
type ManagedCodexConnectionRequirement =
  | "required"
  | "optional";
```

For this repair, default external MCP connections to `optional` unless a ChampCity execution contract explicitly requires them.

Do not infer "required" merely because a server exists in user configuration.

If there are currently no ChampCity-required external MCP servers for ordinary Work Card implementation, the valid required set may be empty.

---

# 4. Preflight approved Codex connections before the implementation turn

Before `turn/start` for a Work Card implementation:

1. launch/initialize the managed runtime;
2. read the runtime's MCP server status through the existing App Server capability/status seam;
3. compare observed servers with the ChampCity-approved connection projection;
4. classify required/optional readiness;
5. start implementation only when required connections are ready.

An optional failed/disconnected/unauthed server must not block the turn.

A required connection that needs authentication must produce an explicit connection blocker before implementation begins.

Do not discover authentication problems only after the model has started implementing.

---

# 5. Unapproved ambient server proof

Add permanent proof that a simulated/user-level MCP entry not present in the ChampCity-approved connection projection:

- is not enabled for the managed ChampCity runtime; or
- is otherwise prevented from participating in the managed Work Card turn by the pinned supported mechanism.

The test must not merely hide its error after it launches.

The server should not be able to terminate the implementation transport.

---

# 6. Optional connection failure isolation

For an explicitly approved but optional connection:

```text
connection auth = failed / token expired
-> connection status = needs-attention
-> implementation may continue without that connection
-> bounded warning/status is surfaced
```

Do not treat the entire Codex App Server as failed solely because an optional external MCP cannot authenticate.

If the pinned runtime itself exits on an optional MCP worker failure, adjust managed configuration so that the failing optional server is disabled before the implementation turn rather than attempting to recover after process death.

---

# 7. Required connection blocker

If a future/explicit execution contract marks a connection required:

```text
required connection not authenticated
-> implementation does not start
-> no Work Card mutation occurs
-> UI says which connection needs attention
-> user can open Codex Connections
```

Do not convert this into generic "Codex unavailable."

Do not expose raw OAuth tokens, headers, or credential bodies.

---

# 8. Add a Codex Connections settings section

Settings needs a separate bounded panel titled equivalent to:

```text
Codex Connections
```

Do not place these controls under Agent Harness Public Connector OAuth.

For each ChampCity-approved managed Codex connection show bounded status:

- connection name;
- enabled/disabled;
- required/optional;
- ready / disconnected / authentication-required / failed;
- last bounded diagnostic.

Do not show bearer tokens, refresh tokens, authorization headers, client secrets, or raw config files.

---

# 9. Connection actions

Provide only actions the pinned runtime/application can actually support.

At minimum:

```text
Refresh Status
Enable / Disable
```

If the pinned runtime exposes a supported OAuth/connect/reconnect flow:

```text
Connect / Reconnect
```

may be added.

Do not invent a generic OAuth implementation that scrapes stderr or asks the Operator to paste tokens.

If reconnect cannot be implemented safely through the pinned runtime in this repair, show:

```text
Authentication required
```

and keep the connection disabled for managed implementation until a later dedicated connector-auth card.

The immediate acceptance criterion is that stale optional connections can no longer break implementation.

---

# 10. Do not use Agent Harness OAuth credentials for Codex outbound MCP

ChampCity Agent Harness OAuth state protects/authorizes inbound clients to ChampCity's own MCP runtime.

Codex outbound MCP connection credentials belong to a different trust boundary.

Do not:

- reuse Agent Harness bearer tokens;
- copy Agent Harness OAuth client registrations;
- map the Agent Harness Public Connector panel to Codex outbound MCP authentication.

The Settings screen may contain both sections, but they must be explicitly distinct.

---

# 11. Runtime diagnostics

Extend bounded runtime projection so the Implement screen can distinguish:

```text
Codex runtime ready
Required Codex connections ready
Optional connection warnings: N
```

Do not make the Operator inspect raw stderr to understand authentication failure.

When a managed connection blocks implementation, project a human-readable blocker such as:

```text
Codex connection "X" requires authentication.
Open Settings > Codex Connections.
```

When only optional connections need attention, implementation remains eligible.

---

# 12. Sanitize auth failure evidence

Current raw stderr can contain authentication metadata.

Any persisted/rendered bounded diagnostic must redact:

- bearer values;
- OAuth access/refresh tokens;
- authorization headers;
- cookies;
- query-string secrets.

Server name/origin and a normalized error class such as `authentication-required` or `invalid-token` are sufficient.

Keep raw child stderr ephemeral and bounded according to the existing runtime-tail policy.

---

# 13. Regression proof for Signal Forge failure class

Create a test fixture equivalent to the observed failure:

```text
approved connections: none
ambient/user servers:
  - cloudflare: invalid_token
  - github-copilot: invalid_token
```

Expected:

- managed ChampCity runtime does not activate those ambient servers;
- Work Card implementation thread/turn can proceed;
- no transport fatal occurs from those servers.

Also prove an explicitly approved optional connection with invalid auth does not block implementation.

---

# 14. Required connection auth proof

Fixture:

```text
approved connection X
requirement = required
status = authentication-required
```

Expected:

- implementation blocked before turn start;
- App Server remains healthy;
- precise settings navigation/action offered;
- no Work Card implementation mutation;
- no raw credential data exposed.

---

# 15. Managed runtime isolation proof

Add a production-path test around `createCodexRuntimeOperations()` proving:

- the launched ChampCity managed Codex runtime receives the ChampCity-owned configuration boundary;
- a synthetic user-level configuration outside that boundary does not alter the managed MCP server list;
- standalone/user Codex files are not modified.

This is the architectural acceptance owner.

---

# 16. Non-scope

Do not:

- redesign Agent Harness OAuth;
- rewrite ChampCity GitHub provider authentication;
- authenticate arbitrary third-party MCP servers by scraping browser pages;
- ask users to paste bearer tokens;
- modify Project repositories to store Codex credentials;
- add Git orchestration to this repair;
- change Development Environment authority;
- change model selection semantics.

---

# Permanent acceptance proof

At minimum prove:

1. managed Codex no longer blindly inherits ambient user MCP servers;
2. ChampCity owns the managed connection projection;
3. user standalone Codex configuration remains untouched;
4. approved connection statuses are read before implementation turn start;
5. optional auth failure cannot terminate/block ordinary Work Card implementation;
6. required auth failure blocks before implementation mutation;
7. Settings has a separate Codex Connections section;
8. Agent Harness OAuth and Codex outbound auth remain separate;
9. auth diagnostics are sanitized;
10. the observed Cloudflare/GitHub invalid-token failure class cannot kill a Signal Forge implementation run;
11. production build passes;
12. `git diff --check` passes.

---

# Validation

Run focused validation only:

- managed Codex runtime operations owner;
- App Server transport owner;
- Work Card Codex execution owner;
- managed runtime/model status owner;
- Settings renderer owner;
- auth-redaction owner;
- capability-map integrity if touched;
- repair validation-plan preview;
- `git diff --check`.

Do not run the broad/full regression suite.

---

# Implementer report

Write:

`docs/implementation-bundles/codex-runtime-connection-governance/Repair01/Reports/CRC-R01_IMPLEMENTER_REPORT.md`

The report must state:

- exact managed configuration-isolation mechanism used by the pinned runtime;
- how ambient user MCP servers are excluded;
- approved connection projection format/location;
- required/optional policy;
- Settings connection UI behavior;
- authentication/reconnect support actually implemented;
- redaction behavior;
- Signal Forge failure-class proof;
- focused validation results.

---

# Checkpoint and STOP

Commit:

`CRC-R01 isolate managed Codex connections from ambient user MCP`

Then STOP for Architect review.
