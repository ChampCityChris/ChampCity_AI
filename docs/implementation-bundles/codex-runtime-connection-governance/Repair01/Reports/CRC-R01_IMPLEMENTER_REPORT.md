# CRC-R01 Implementer Report

## Scope and repository

Repair Card CRC-R01 was executed in the verified `Dev` primary repository checkout on `dev`. Remote: `https://github.com/ChampCityChris/ChampCity_AI.git`. Card baseline: `1952604bd24bd3407ff1d6e399d62474cd5f5da4`; observed pre-checkpoint HEAD: `0ca2fd61d8cf165486c7c2c508735976389f2d95`. Existing unrelated changes were preserved. No push, merge, branch creation, repository credential write, or Agent Harness authentication change was performed.

## Configuration isolation mechanism

The supported mechanism is explicit Codex CLI configuration overrides, rather than a copied personal configuration or a separate model-authentication home. `mcp list --json` inventories names without launching workers. Production launch passes a TOML inline-table override such as `-c 'mcp_servers={"cloudflare"={enabled=false},"github-copilot"={enabled=false}}'` before `app-server --listen stdio://`. Every inventoried unapproved entry is disabled. Model authentication retains the existing Codex credential boundary; no credentials are copied or rendered.

This mechanism was exercised against the installed bundled `codex-cli 0.146.0`, not assumed from documentation. An empty table alone was experimentally shown to merge with existing configuration and was rejected as an isolation mechanism. Quoted names in dotted CLI paths were also rejected after the pinned runtime interpreted them as literal names. The final inline-table mechanism disables the intended entries. The permanent real-runtime proof inventories synthetic personal Cloudflare/GitHub entries, verifies `enabled=false`, initializes the production launch, starts a local ephemeral thread with a trusted project's additional MCP entry, observes no initialized external servers, and verifies that the synthetic invalid-token workers never write their startup marker. No real model turn or third-party authentication is used in that proof.

Selected-project effective configuration is read before `thread/start`; the application supplies an equivalent `ThreadStartParams.config.mcp_servers` override that disables project-local additions too. Connection status is read before `turn/start`. The startup schema probe now requires `mcpServerStatus/list` support. Disabled servers may remain visible in the runtime's inventory, but cannot participate in the turn.

## Approved projection and policy

The application-owned projection is `<USER_DATA>/codex-runtime/connections.json`, containing a bounded array of `{name, enabled, requirement}` records. Missing projection means an empty approved set; a missing requirement defaults to `optional`. Names are validated and duplicate entries rejected. The constrained Settings IPC can toggle existing approved names only; it cannot approve arbitrary ambient servers or accept raw configuration/credentials. Future application execution contracts may provision approved records. This repair adds no connection-discovery/approval workflow.

Preflight uses a separate disposable App Server process. It reads paginated `mcpServerStatus/list` results and derives readiness from normalized authentication status plus initialized server metadata/tools. Unapproved initialized servers fail closed. Optional authentication failure, disconnection, status timeout, or preflight process death becomes a bounded warning. A fresh implementation process excludes all optional external MCP servers in this V1 recovery version, including otherwise healthy optional entries. This conservative policy prevents later optional worker failure from terminating implementation. Enabled required servers must be ready; disabled or unhealthy required servers produce a precise connection blocker with `Settings > Codex Connections` guidance before an implementation thread/turn is launched. Required connections are rechecked before the turn.

Runtime/model startup probing disables every external connection independently of the required projection, so connector readiness does not convert a healthy runtime into generic model/runtime unavailability. The real-runtime proof also exercises this model-probe separation with a required synthetic connector configured.

## Settings, recovery and diagnostics

Settings contains a distinct `Codex Connections` panel outside the Agent Harness public connector OAuth controls. It displays approved name, enabled state, required/optional classification, normalized readiness and bounded diagnostic. `Refresh Status` and `Enable / Disable` use typed constrained preload/main IPC. Busy runtime leases prevent connection changes. The model/execution controls expose required readiness, optional warning count and the precise blocker.

No outbound OAuth connect/reconnect implementation was added. Authentication-required connections remain excluded from managed implementation; dedicated connector-auth work is needed to support reconnect safely. The UI explains this limitation and the V1 exclusion of optional connectors. Agent Harness tokens, registrations and public OAuth state are neither read nor reused for outbound authentication.

Connection diagnostics contain normalized messages rather than raw OAuth failures. Runtime stderr is framed by complete lines, with bounded incomplete buffering, before redaction and tail projection. Bearer values, authorization and cookie headers, access/refresh tokens, client secrets, API/password fields, JWT values and URL query strings are redacted. Implementer tails and failure messages use the same redaction. A split-header transport fixture proves that chunk boundaries do not expose the synthetic bearer value. No raw credential-bearing inventory is persisted or rendered.

## Files

Created:

- `src/shared/codexConnectionContracts.ts`
- `src/main/workCardBuilding/codexConnectionPolicy.ts`
- `src/renderer/app/CodexConnectionsPanel.tsx`
- `test/work-card-building/codex-managed-connections.test.cjs`
- this report

Modified:

- `src/main/main.ts`
- `src/main/workCardBuilding/codexAppServerProtocol.ts`
- `src/main/workCardBuilding/codexAppServerTransport.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/workCardBuilding/codexRuntimeManager.ts`
- `src/main/workCardBuilding/codexRuntimeOperations.ts`
- `src/preload/index.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/CodexModelSelectionControls.tsx`
- `src/shared/codexRuntimeContracts.ts`
- `src/shared/workspaceContracts.ts`
- `test/renderer/agent-harness-settings-workspace.test.cjs`
- `test/work-card-building/codex-app-server-transport.test.cjs`
- `test/work-card-building/codex-runtime-manager.test.cjs`
- `validation/capability-map.json`

No files were deleted. No project credential/configuration files, dependency changes, OAuth flows or Agent Harness changes were created. Temporary preview/scope files and generated build/schema output remain uncommitted.

The new permanent test owner covers the previously missing production launch/configuration boundary, pinned-runtime exclusion, optional worker-process failure isolation, required pre-turn blocker, policy containment and auth-redaction regression. Existing runtime, transport and Settings owners were extended rather than duplicated. Capability-map ownership and proof metadata were updated.

## Focused validation

All commands ran from the verified `Dev` repository root. Normal Windows lane means the approved unrestricted execution lane; restricted spawn failures are environment failures, not passes.

| Command | Lane | Final result |
| --- | --- | --- |
| `npm run build` | Restricted | Exit 1, Vite/esbuild `spawn EPERM`; recorded once and rerun in normal Windows lane. |
| `npm run build` | Normal Windows | Exit 0, final production TypeScript, Vite renderer and asset build. Existing large-chunk advisory remains. |
| `node --test test/work-card-building/codex-managed-connections.test.cjs test/work-card-building/codex-runtime-manager.test.cjs test/work-card-building/codex-app-server-transport.test.cjs test/renderer/agent-harness-settings-workspace.test.cjs test/validation/capability-map.test.cjs` | Normal Windows | Exit 0, 54/54 passed against final build. |
| `node --test test/work-card-building/codex-implementer-execution-service.test.cjs test/validation/capability-map.test.cjs` | Normal Windows | Exit 0, 43/43 passed; 38 execution-owner checks plus the five catalog checks also included above. |
| `node --test test/validation/capability-map.test.cjs` | Restricted | Exit 1, runner `spawn EPERM`; normal Windows rerun passed. |
| `node scripts/validation/cli.cjs preview --profile repair --changes tmp/crc-changes.json` | Restricted, read-only preview | Exit 0; repair plan resolves, selects 95 tests and requires a build. Preview is planning evidence only. |
| `git diff --check` | Restricted | Exit 0. |

There are 92 distinct passing focused checks across the two final owner groups. Earlier diagnostic runs found and corrected the quoted-key override error, optional undefined status-field shape, updated launch-fixture expectations, catalog scheduling/sort metadata, and transient Windows fixture cleanup locking. The real-runtime test uses bounded cleanup retries after child handles close, and its schema output stays inside the temporary fixture. A final additional `node --test test/work-card-building/codex-managed-connections.test.cjs` normal Windows run passed 6/6 after that fixture-path adjustment.

The staged safety helper initially encountered restricted `spawnSync git EPERM`; it was changed to scan the already captured diff/name files without spawning a child, and passed in the restricted lane. The complete repair profile was previewed but not executed because this card explicitly requires focused owners only. No broad/full regression, packaging, Electron visual acceptance or live third-party OAuth integration was run. The execution-owner checks used the known build before the final startup-probe-only adjustment; final runtime/transport/Settings proofs and production build cover that adjustment. No implementation/execution-service source changed after its successful final run.

## Safety, checkpoint and review

The exact card-local staged diff was inspected. The bounded staged safety scan passed for all 20 expected paths, with no unexpected paths, concrete machine paths, detected real secrets or generated artifacts. Staged whitespace validation passed after removing an extra trailing blank line in the new test. All credential-shaped test strings are explicitly synthetic. Durable report paths are repository-relative or placeholders. Unrelated dirty files remain outside the checkpoint.

Required checkpoint message: `CRC-R01 isolate managed Codex connections from ambient user MCP`. Commit hash is pending at report creation and will be supplied in the chat after commit; this report will not be amended solely to insert its own commit hash. Stop after the checkpoint for Architect review.

Residual limits: optional connectors are intentionally unavailable to implementation in this V1 recovery; reconnect/approval provisioning remains future dedicated work. Real third-party auth was not exercised. Architect review should assess the supported override boundary and conservative optional policy. Operator visual review of Settings presentation remains outstanding; automated render/preload evidence is complete.
