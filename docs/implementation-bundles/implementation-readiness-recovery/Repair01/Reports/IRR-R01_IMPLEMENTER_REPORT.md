# IRR-R01 Implementer Report

## Scope and checkout

- Repair Card: IRR-R01, Implementation Readiness Recovery / Repair01.
- Approved source root verified: primary `<PROJECT_REPO>/Dev` checkout containing the active card and contributor contract.
- Branch: `dev`. Starting HEAD: `fd52612` (Release IRR Repair01 implementation readiness recovery). The card names an earlier Dev baseline; no reset or topology change was performed.
- Remote: `origin` configured; `dev` has no upstream. No fetch, push, release, or merge performed.
- Pre-existing changes in Agent Harness, Tester, source-control tests, and other reports were preserved and excluded from this checkpoint. Validation used the current working checkout, including those pre-existing changes.

## Result

Foregrounding a normal Work Card or Issue Fix Card now starts deterministic environment preflight automatically. Core Codex health and model enumeration use a configuration isolated from ambient MCP, apps, and plugins. Connection failures retain core runtime/catalog readiness and project their own blockers. An unavailable runtime can be retried through a fresh initializer without restarting the desktop.

## Automatic environment readiness

`CodexImplementerExecutionService.getStatus()` starts `obtainEnvironmentPreflight()` on an exact-key cache miss. It stores Checking before the asynchronous call, preventing React refreshes and status polling from launching another check. The existing key includes owner identity, Work Card path, revision, and SHA. Completed results remain process-local; an exact contract change triggers a fresh check.

The shared application-owned `DevelopmentEnvironmentPreflightService` coalesces automatic and explicit requests by canonical formal path plus content SHA, and serializes changed contracts within one workspace. `DevelopmentEnvironmentRepairService` verifies the contract again before returning an explicit repair result. No Project State or SQL readiness persistence was added.

The default neutral provisioner disables optional WinGet MCP discovery and uses deterministic direct WinGet provisioning when discovery is needed. This path does not acquire Codex, App Server, Agent Harness, MCP transport, or model inference. Existing provider consumers retain their configured discovery behavior.

The renderer presents Checking while the initial result is absent, and offers Retry Environment Setup only for retryable failure evidence. The routine Prepare Environment button was removed. Automatic checks never expose an enabled retry action while Checking.

## Core runtime and connection separation

Core probing owns executable/version verification, required App Server schema verification, connection-neutral initialization, and model enumeration. It performs no `mcp list` or connection-policy read.

The isolated transport uses a fresh temporary `CODEX_HOME`, borrows only file-based model authentication, and sets `features.apps=false` and `features.plugins=false`. User configuration is not copied. The authentication copy is scoped to the transport lifetime, removed on disposal/failure, and tracked for cleanup during interrupted initialization and shutdown. Windows cleanup is bounded and retried for transient file locks. Credentials are not included in persisted runtime metadata or committed artifacts.

Connection inventory, approval projection, required/optional readiness, and pre-turn enforcement remain separate. Inventory and projection failures produce bounded Connection inventory / Connection policy diagnostics. The manager adopts the verified core result before evaluating connection health; connection errors cannot clear its catalog. Connections are omitted while runtime health is unavailable or uninitialized, so the UI cannot claim required connections ready in that state.

Implementation with no required approved external connections uses the same isolated transport. Optional connection warnings cannot introduce workers into that implementation process. Required connections retain the governed preflight and pre-turn readiness blockers; this repair does not introduce connector OAuth.

Project isolation includes disabled configuration layers before `thread/start`, because they can become active when the thread establishes its cwd. The disable projection preserves transport definitions and excludes absent ambient entries instead of creating invalid enabled-only definitions. Unapproved initialized connections and missing/authentication-required required connections remain pre-turn blockers.

## Root failure observed before repair

The actual managed current pointer selected **0.159.3**. The pre-repair production probe was executed from committed source with bounded stage instrumentation. Executable/version, schema generation/verification, and connection inventory succeeded. App Server initialization with ambient disable overrides exited with code 1; the diagnostic category was **invalid MCP transport**. Raw stderr and credential-bearing inventory were withheld. The ambient inventory contained seven entries, including GitHub.

This was not a missing advertised model: the repaired connection-neutral probe enumerates eight models, including `gpt-6.1-sol`. A fresh authenticated 0.159.3 App Server also automatically exposes `codex_apps` unless apps are disabled; the production isolation configuration explicitly disables it. Bundled qualification additionally exposed the need to include disabled project layers before thread creation; permanent proof now covers that boundary.

## Last verified runtime/catalog and retry

Initialization atomically writes bounded `codex-runtime/verified.json` alongside `current.json`: selected runtime version, at most 128 bounded model entries, verification timestamp, and execution contract version. It contains neither credentials, paths, nor MCP status. Startup still performs a fresh core probe and refreshes the catalog; cached metadata never bypasses genuine core failure.

A candidate's catalog is not persisted as the selected runtime before promotion. Candidate connection-policy setup failure preserves the verified current pointer/catalog and reports degraded update health. Metadata-write failure also degrades the diagnostic without disabling the verified runtime for the current process.

Retry Codex Runtime is exposed through constrained main IPC and preload. The manager rejects retry during a run or selection save, retires the prior initializer, clears its own initialization promise, and constructs a new `CodexRuntimeInitializerClient` through the startup factory. A generation check gates result/failure adoption. The old client's memoized promise is never reused. A saved model/reasoning pair is restored if still advertised; retry does not write or silently replace the saved selection.

## Qualification and permanent proof

| Runtime | Core probe | Models | Connection preflight | Real thread isolation |
| --- | --- | --- | --- | --- |
| Bundled 0.146.0 | Passed | 4 | Passed | Passed |
| Actual managed current/latest 0.159.3 | Passed | 8 | Passed | Passed |

The dynamic qualification calls the production initializer with the actual current pointer and normal latest-version lookup. It uses synthetic Cloudflare/GitHub invalid-worker configurations and a project-local ambient entry. Core probing, connection preflight, and actual thread creation complete without starting those workers. It records the selected version, catalog count, isolation mechanism, and preflight result. No inference turn or implementation mutation was launched against the real Signal Forge project.

The combined Signal Forge startup fixture exercises the production main/preload status path, real neutral preflight service, and renderer controls with node/npm/ffmpeg/ffprobe satisfied evidence. A fresh cache reaches Ready without an Operator click, advertises the saved `gpt-6.1-sol`, enables Model and Reasoning, and enables Run. Provisioner and runtime seams are synthetic in this combined fixture; the separate real-runtime qualification proves bundled/dynamic isolation. This is deterministic production-path evidence, not a claim of Operator visual acceptance on the real project.

Existing capability owners were extended for automatic checks, SHA/revision invalidation, coalescing and workspace serialization, zero-MCP provider discovery, connection/core independence, candidate preservation, bounded failures, fresh-generation retry, picker recovery through IPC, unavailable connection messaging, disabled project layers, and interrupted-initializer cleanup. No new executable test file or dependency was created.

## Validation

All commands ran from the approved Dev checkout. The broad/full regression suite was not run.

- `npm run build`: final normal Windows lane exit 0. TypeScript, renderer, and asset build passed. Existing Vite chunk-size advisory remains.
- Restricted-lane `npm run build`: recorded once as `spawn EPERM`, exit 1; rerun successfully in the normal Windows lane.
- Restricted-lane `node --test test/validation/capability-map.test.cjs`: recorded once as `spawn EPERM`; normal Windows rerun passed.
- Final card-scoped focused tests: **exit 0, **168 passed, 0 failed, 0 skipped**, 112.74 seconds.**.
- After correcting two added status strings to UTF-8, `npm run build` passed again and the affected command below passed: **51 passed, 0 failed, 0 skipped**, 6.24 seconds, normal Windows lane. Both runtime versions were qualified again.
- `node --test test/work-card-building/codex-runtime-manager.test.cjs test/work-card-building/codex-managed-connections.test.cjs test/work-card-building/codex-app-server-transport.test.cjs test/renderer/work-card-building-review-workspace.test.cjs test/validation/capability-map.test.cjs` (with the same qualification environment variable).
- `node scripts/validation/cli.cjs preview --profile repair --changes tmp/irr-r01-changes.json`: exit 0; repair scope and preserved capabilities resolved. Preview only; no broad selected plan was executed.
- `git diff --check`: exit 0. Exact attributable diff reviewed; staged secret/local-path/generated-artifact scan is recorded below before checkpoint.

Exact focused test command (normal Windows lane):

```powershell
$env:CHAMPCITY_IRR_RUNTIME_QUALIFICATION = Join-Path $env:APPDATA 'champcity-ai'
node --test test/development-environment/development-environment-preflight-service.test.cjs test/development-environment/windows-development-environment-provisioner.test.cjs test/development-environment/windows-environment-refresh.test.cjs test/renderer/work-card-building-review-workspace.test.cjs test/renderer/issue-fix-card-workspaces.test.cjs test/work-card-building/codex-runtime-manager.test.cjs test/work-card-building/codex-runtime-initializer-client.test.cjs test/work-card-building/codex-runtime-initializer-process.test.cjs test/work-card-building/codex-managed-connections.test.cjs test/work-card-building/codex-app-server-transport.test.cjs test/work-card-building/codex-implementer-execution-service.test.cjs test/validation/capability-map.test.cjs
```

Intermediate focused failures identified obsolete manual-readiness assertions, project-layer isolation, automatic codex_apps loading, and transient Windows cleanup locks; all were corrected and covered by the final focused validation. The final suite includes a real Electron utility-worker shutdown boundary test. Logs, qualification data, diagnostics helpers, and change/preview inputs remain ignored temporary artifacts.

## Files and checkpoint

Created: this Implementer Report.

Modified:

- `src/main/developmentEnvironment/developmentEnvironmentPreflightService.ts`
- `src/main/main.ts`
- `src/main/workCardBuilding/codexConnectionPolicy.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/workCardBuilding/codexRuntimeInitialization.ts`
- `src/main/workCardBuilding/codexRuntimeManager.ts`
- `src/main/workCardBuilding/codexRuntimeOperations.ts`
- `src/preload/index.ts`
- `src/renderer/app/CodexModelSelectionControls.tsx`
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`
- `src/shared/workspaceContracts.ts`
- `test/development-environment/development-environment-preflight-service.test.cjs`
- `test/renderer/work-card-building-review-workspace.test.cjs`
- `test/support/codex-ipc-harness.cjs`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- `test/work-card-building/codex-managed-connections.test.cjs`
- `test/work-card-building/codex-runtime-manager.test.cjs`
- `validation/capability-map.json`
- `src/main/workCardBuilding/codexAppServerTransport.ts`
- `src/main/developmentEnvironment/developmentEnvironmentRepairService.ts`
- `src/main/developmentEnvironment/windowsPackageProviderResolver.ts`
- `test/development-environment/windows-development-environment-provisioner.test.cjs`

Deleted: none. Intentionally not created: readiness persistence, SQL migrations, credential stores, dependencies, new test files, and generic OAuth support. Source-control behavior and Signal Forge contracts were not changed.

Checkpoint message: `IRR-R01 restore automatic readiness and decouple Codex runtime health`.

Commit hash: pending checkpoint creation; the actual hash will be supplied in the final handoff, without amending solely to insert it here. Only attributable IRR-R01 files are to be staged. No push is authorized or performed.

## Security and artifact review

The attributable diff was reviewed before staging. A bounded scan of added lines found no credential values or concrete local home paths. The checkpoint allowlist contains only card-owned source, existing tests, capability metadata, and this report. All files are valid UTF-8. Generated output, dependency state, runtime/authentication data, diagnostic helpers, and pre-existing unrelated changes are excluded. Temporary validation inputs and logs are ignored. The exact staged path list and staged whitespace/safety checks are verified before commit.

## Remaining review

Architect review is the next step; stop after the required checkpoint. The automated evidence does not replace visual/experiential acceptance in the installed desktop on the real Signal Forge Work Card. File-based model authentication is the mechanism qualified on this machine; custom provider configuration and generic third-party OAuth are outside this repair. Required external connections continue to fail closed if governed transport isolation or authentication cannot be established. No release acceptance or real-project implementation run is claimed.
