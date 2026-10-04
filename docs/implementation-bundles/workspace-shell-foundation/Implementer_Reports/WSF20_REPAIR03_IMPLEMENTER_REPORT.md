# WSF20-REPAIR03 Implementer Report

Status: implementation checkpoint; focused automated proof passed. **Mandatory live acceptance is outstanding; the composed repair profile failed. This card is not accepted/closed.**

## Repository and authority

- Verified `<PROJECT_REPO>/Dev` as the approved primary repository root using Git and its `AGENTS.md`.
- Repair Card: WSF20-REPAIR03; parent WSF20; defects WSF20-D12 and WSF20-D13.
- Starting HEAD exactly matches the card: `f238f3d44d66b09aa6dd482974c3bcbcbfa99757`.
- Branch: `dev`. Remote: `origin`, configured ChampCity_AI repository. Cached `origin/dev` comparison before checkpoint: 312 ahead, 0 behind; no fetch or push performed.
- Read the repository boundary and validation-lane contracts before implementation/validation. Preserved all pre-existing untracked recovery cards, bundle documents and work cards; they are not staged in this checkpoint.

## D12: OAuth defaults and scope preservation

`PRIMARY_MCP_RESOURCE_SCOPE` is the authoritative `files.read files.write` default for DCR registration, omitted-scope authorization, primary runtime capture, service capture and normal registry defaults. An omitted authorization scope uses this server default even when the reused registered client has `files.read` stored as its default. Explicit requests retain their exact validated permissions. The token response reports the scope actually granted.

This implements the server-default behavior for omitted scope; it does not reinterpret explicit `files.read`. Existing access tokens and refresh tokens retain their granted scope. No OAuth-store migration, token-file edits, secret inspection, or refresh-scope elevation was performed. Existing persisted-token and refresh preservation tests passed.

`workflow_toolbox.status` now reports `implemented`, `supportedStages`, `submissionAvailable`, `requiredWriteScope`, and the actions available for the caller's scope. Read-only callers receive the explicit reauthorization requirement. Submission remains protected by `files.write`; candidate schemas and SQL authority are unchanged.

### Public HTTP MCP capture and SQL proof

The extended public-contract owner uses DCR, PKCE authorization/code exchange, SDK HTTP MCP connection, `tools/list`, and `tools/call`. These are synthetic-workspace production-boundary proofs, not live ChatGPT evidence.

| DCR scope | Authorization scope | Actual token scope | Captured workflow actions |
| --- | --- | --- | --- |
| `files.read` | `files.read` | `files.read` | `status` |
| omitted | omitted | `files.read files.write` | `status`, `submit_stage_candidate` |
| `files.read` | omitted | `files.read files.write` | `status`, `submit_stage_candidate` |

Captured public contract fingerprints:

- Read-only: `378a6ebc0516bbdd6abb63f16e56b51e5f958dceba6504beee1ccbdee158ceca`.
- Full: `ed69e521e50072eb2dfe1c8bdf67e5a4a736dc9ee22321643b80480ec2ec06e8`.

Both full grants executed `workflow_toolbox.submit_stage_candidate` through the real HTTP MCP server boundary. The production Architect service then read the persisted SQL review, verified the returned review/cycle identity, and found its review document. Read-only status truthfulness and public schema filtering passed. Existing reserved-toolbox proof covers write-scope denial, every supported semantic stage, validation, and absence of Operator disposition side effects. Existing renderer proof establishes that Refresh exposes/selects the SQL Architect Review without JSON entry.

### Supported reauthorization recovery and live status

After running the repaired build, reconnect/re-authorize the configured ChampCity MCP connection in embedded ChatGPT. A fresh omitted-scope authorization receives `files.read files.write`, including a reused read-only DCR client; an explicit read-only authorization must be replaced by a full authorization request. Refreshing an old read-only token does not upgrade its scope.

Then inspect live `workflow_toolbox.status` and the public tool schema, repeat the Greenfield Architect handoff, observe ChatGPT calling submission, verify the SQL candidate, and Refresh ChampCity to reveal the review. No manual JSON transfer is part of this path.

**Actual live granted scope, live public fingerprint/actions, live ChatGPT submission and live SQL result: not observed.** Native app controls are disabled in this execution environment, so this agent cannot operate the actual embedded ChatGPT connection. No new live grant was minted. If the live schema still exposes only status, stop and capture the actual granted scope plus the public fingerprint/actions, without recording token secrets.

## D13: attachment generation and Reload

The main-process freshness boundary resets the bounds-sequence baseline and clears prior-generation renderer bounds only when accepting a newer attachment generation. Same-generation ordering and older-generation rejection remain intact. Old-generation detach cannot zero or remove a newer attachment.

A mounted ApplicationBrowserHost registers its coordinator with a shared renderer recovery function. Every renderer Reload path calls that function. For non-visible attachment status it retries the current coordinator, requires a successful positive measurement/current-generation accepted bounds, and only then reloads ChatGPT. Superseded/failed recovery prevents page reload and surfaces an error. Healthy visible Reload performs ordinary page recovery without another attachment attempt.

No renderer-global bounds sequence was introduced. The native view/session is reused; no security, navigation allow-list, candidate-domain, SQL schema, or later workflow-semantic changes were made. Workspace adapter changes are confined to their browser recovery callbacks.

### Deterministic lifecycle proof

The existing main browser owner now uses renderer-style coordinators with local sequences starting at zero. It exercises generation A with sequence 20, generation B detach/zero, generation C sequence 1 acceptance, and an old delayed detach completion after C. It also performs **three completed physical detach/return cycles**, requiring detached state on leave, visible state and sequence 1 on return, one native view creation, and the same loaded ChatGPT URL/session. Older-generation and same-generation older bounds are rejected.

The renderer owner tests detached and zero-bounds Reload ordering (`retry` then `reload`), healthy Reload (`reload` only), and failed attachment recovery (no page reload). Existing browser security summary, preload/IPC independence, ACK fencing and coordinator stale-completion tests passed. The broader browser lifecycle/policy owners selected by the repair profile also passed.

**Live Electron repeated leave/return, positive native bounds, visible interactivity and Reload recovery: not observed.** Operator acceptance must open Architect Interview in the repaired Electron build, verify the loaded session, leave/return at least three times, verify positive bounds and the same interactive session after every return, then use Reload after a return and check for stale-generation/sequence diagnostics.

## Validation receipts

| Exact command | Lane | Exit / result |
| --- | --- | --- |
| `npm run build` | restricted Windows sandbox | 1; Vite/esbuild `spawn EPERM`, recorded once; not a source failure/pass |
| `npm run build` | normal Windows, escalated execution | 0; production TypeScript, Vite and asset build passed |
| `node --test test/agent-harness/oauth-offline-access.test.cjs test/agent-harness/mcp-tool-contract-generation.test.cjs test/agent-harness/reserved-toolbox-namespace.test.cjs test/browser/architect-browser-handoff.test.cjs test/renderer/architect-browser-attachment-coordinator.test.cjs` | normal Windows | 0; initial focused proof: 46 passed, 0 failed, 0 skipped; 16.768 s |
| `npm run test:repair -- --changes tmp/wsf20-r03-changes.json --preview` | restricted Windows, read-only planning | Initial exit 1 for unsorted source-pattern entries; corrected ordering. Final exit 0; 105 selected files |
| `npm run test:repair -- --changes tmp/wsf20-r03-changes.json` | normal Windows | 1; 98 files passed, 7 failed; 818 assertions passed, 23 failed; 0 skipped/unavailable/blocked; 614.806 s |
| `node --test test/agent-harness/oauth-offline-access.test.cjs test/agent-harness/mcp-tool-contract-generation.test.cjs test/agent-harness/reserved-toolbox-namespace.test.cjs test/browser/architect-browser-handoff.test.cjs test/renderer/architect-browser-attachment-coordinator.test.cjs` | normal Windows | 0; final proof after strengthening completed-detach cycles/fingerprint diagnostics: 46 passed, 0 failed, 0 skipped; 16.672 s |
| `git diff --check` | restricted Windows, static diff review | 0; no whitespace errors |

Composed receipt run ID: `8ad134a6-9bbf-4c2a-bacd-8c4cab966242`. Source remained stable for that run. Its owned production build passed in 13.488 s; static catalog checks passed. Final focused rerun used that current build; only test assertions/diagnostics changed after the composed run. The temporary change set explicitly included all implementation/test/map paths and preserved `agent-harness-security` and `architect-browser` capabilities.

Local-only machine receipts: `tmp/wsf20-r03-receipt.json`, `tmp/wsf20-r03-plan.json`, `tmp/wsf20-r03-focused-final.txt`. These generated artifacts are intentionally not committed. Vite reported its bundle-size advisory; focused renderer loading reported a MaxListeners advisory. Neither failed the focused proof.

### Broader failures requiring separate disposition

No passing aggregate is claimed. Baseline execution was not rerun wholesale, so the report does not claim every broader failure is proven pre-existing. The observed failure boundaries are outside D12/D13; no unrelated fixes were made.

| Failed owner | Failed assertions | Observed failure |
| --- | ---: | --- |
| `test/agent-harness/agent-harness-runtime.test.cjs` | 1 | Discovery expects no repository checkouts but receives the conventional registered checkout; OAuth/public transport tests in this owner passed (18/19 total) |
| `test/agent-harness/repository-io-hardening.test.cjs` | 1 | Workspace-only Git status expectation fails at line 290 |
| `test/agent-harness/sibling-process-launch.test.cjs` | 1 | Bootstrap VM mock lacks `createProjectSourceOperationCoordinator`; unchanged bootstrap dependency |
| `test/project-state/execution-completion.test.cjs` | 6 | Source-neutral planning fixtures request unavailable deterministic ValidationCatalog proof |
| `test/renderer/project-rail-presentation.test.cjs` | 1 | Source regex expects `expectedRecordVersion: model!.review!.recordVersion`; both baseline and current source pass the version through JSX instead |
| `test/source-control/managed-project-source.test.cjs` | 7 | Candidate Git repository preparation failures and associated assertions |
| `test/source-control/workflow-integration-service.test.cjs` | 6 | Exact workflow integration returns `failed` where fixtures expect `integrated` |

Budget outcome: review required (60 s repair budget versus 614.806 s actual). Slowest files were desktop development lifecycle (281.990 s), project planning service (279.088 s), managed project source (165.714 s), workflow integration service (111.131 s), and Architect prompt contracts (108.887 s). No proof was dropped to meet the budget.

## File disposition

Created:

- `src/renderer/app/architectBrowserRecovery.ts`
- `docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR03_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/agentHarness/runtime/agentHarnessService.ts`
- `src/main/agentHarness/runtime/httpRuntime.ts`
- `src/main/agentHarness/runtime/oauthStore.ts`
- `src/main/agentHarness/tools/toolRegistry.ts`
- `src/main/browser/architectBrowserService.ts`
- `src/renderer/app/ApplicationBrowserHost.tsx`
- `src/renderer/app/GreenfieldArchitectWorkspace.tsx`
- `src/renderer/app/OptionalWorkIntakeWorkspace.tsx`
- `src/renderer/app/PhaseInterviewWorkspace.tsx`
- `src/renderer/app/PhasePlanningWorkspace.tsx`
- `src/renderer/app/StructuredArchitectWorkspace.tsx`
- `src/renderer/app/StructuredPhaseMapWorkspace.tsx`
- `src/renderer/app/StructuredProjectPlanningWorkspace.tsx`
- `src/renderer/app/WorkCardPlanningWorkspace.tsx`
- `src/renderer/app/WorkCardRepairWorkspace.tsx`
- `test/agent-harness/mcp-tool-contract-generation.test.cjs`
- `test/agent-harness/oauth-offline-access.test.cjs`
- `test/browser/architect-browser-handoff.test.cjs`
- `test/renderer/architect-browser-attachment-coordinator.test.cjs`
- `validation/capability-map.json`

Deleted: none.

Intentionally not created: OAuth-store/token migration, manual candidate JSON transfer, JSON workflow sidecars, SQL migrations, browser session replacements, dependencies, unrelated D05-D08 repairs, screenshot/launch artifacts, and additional permanent test files. Existing capability owners were extended for the previously missing public omitted-scope contract/SQL ingress and renderer-remount/recovery regressions. Capability-map ownership includes the shared recovery boundary and ApplicationBrowserHost.

## Security, Git and remaining work

Bounded secret, concrete local-path and generated-artifact scan passed for all 22 attributable paths; exact staged manifest/diff review, staged scans and `git diff --cached --check` also passed before checkpoint. No credentials, cookies, `.env` files or token values were printed/persisted. Contract fingerprints contain no secrets. Durable report paths are repository-relative or `<PROJECT_REPO>`. Production writes and candidate schemas remain governed by existing services. Browser isolation, partition and navigation policies remain unchanged.

Git scope: stage only the implementation, extended tests, capability-map entries and this report; create the required checkpoint `WSF20-R03 restore MCP candidate ingress and browser reattachment`. Commit hash: pending at report creation; actual hash will be supplied after commit, without amending solely to embed its own hash. No push, merge, tag, release or branch/worktree mutation.

Remaining blockers/residual risk: mandatory embedded ChatGPT and Electron acceptance unavailable here; broader composed validation failed as recorded. Recommended next task: Operator audit of this checkpoint, perform the card's live acceptance and record live scope/actions/fingerprint/SQL/reattachment results, and separately scope the broader test failures. Stop after checkpoint for Operator audit.
