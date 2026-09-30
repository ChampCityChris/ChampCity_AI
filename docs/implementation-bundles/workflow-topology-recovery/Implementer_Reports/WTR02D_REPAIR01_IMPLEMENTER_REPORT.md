# WTR02D Repair01 Implementer Report

## Repository and Git state

- Verified repository root: approved `ChampCity_AI` repository root; `git rev-parse --show-toplevel` matched the supplied repository.
- Repair Card starting checkpoint: `cd9383b9dd7949685e6d6fd20f52546695c9c89b`.
- Actual starting `HEAD`: `5da66c8512ee06c29b14d0532402045e9e12c594` (different from the card checkpoint).
- Branch/remote: `dev` tracking `origin/dev`, 81 commits ahead at start; no remote mutation.
- Git mutations: none. No staging, commit, push, reset, or cleanup performed.

## Implementation

- Added `register-repository-checkout` and `unregister-repository-checkout` operations to the worker and Service Host protocols, worker dispatch, controller, Service Host server, and application-facing Service Host client.
- Control payloads carry only Project workspace identity and semantic RepositoryCheckout data or checkout identity. Both request guards reject host-local root/common-directory/path fields. Summary guards validate public fields and reject path fields.
- Checkout descriptors are revalidated before list and resolve use. Invalid stored descriptors remain discoverable as unavailable; direct resolution returns `GIT_CAPABILITY_UNAVAILABLE` before deriving or probing a path.
- Checkout root proof now uses `runBoundedGit` for `rev-parse --show-toplevel`, retaining canonical exact-root validation and bounded, noninteractive Git execution.
- Central Git-tool schema injection caps `repositoryCheckoutId` at 128 characters. Top-level `workspaceId` bounds are unchanged.
- HTTP and utility-process tests now use a non-Git Project container with an existing `Dev` checkout. They exercise actual MCP Git status; HTTP proof also stages a Dev-only file. Service Host client proof registers through the new production control operation and calls MCP status.
- No checkout creation/materialization in production, SourceLine materialization, Project State changes, source naming changes, release-toolbox changes, renderer/UI registration, or WTR02E+ behavior was added.

## Changed files

- `src/main/agentHarness/runtime/agentHarnessController.ts`
- `src/main/agentHarness/runtime/agentHarnessProcessProtocol.ts`
- `src/main/agentHarness/runtime/agentHarnessServiceHostClient.ts`
- `src/main/agentHarness/runtime/agentHarnessServiceHostProtocol.ts`
- `src/main/agentHarness/runtime/agentHarnessServiceHostServer.ts`
- `src/main/agentHarness/runtime/agentHarnessWorker.ts`
- `src/main/agentHarness/tools/toolRegistry.ts`
- `src/main/agentHarness/workspace/registeredWorkspaceRegistry.ts`
- `test/agent-harness/agent-harness-process-boundary.test.cjs`
- `test/agent-harness/agent-harness-runtime.test.cjs`
- `test/agent-harness/fixtures/electron-agent-harness-process-boundary.cjs`
- `test/agent-harness/registered-workspace-registry.test.cjs`
- This report.

## Validation evidence

- `npm run build` — normal Windows lane passed. Vite reported its existing >500 kB chunk advisory. The initial restricted attempt failed once with documented `spawn EPERM` at Vite/esbuild; the equivalent normal-lane build passed.
- `node --test test/agent-harness/registered-workspace-registry.test.cjs` — normal Windows lane passed, 8/8, including descriptor drift fail-closed proof.
- `node --test test/agent-harness/agent-harness-runtime.test.cjs` — normal Windows lane passed, 19/19, including checkout-targeted status/staging and missing selector rejection.
- `node --test test/agent-harness/agent-harness-process-boundary.test.cjs` — normal Windows lane passed, 18/18 before the final fixture strengthening. After that change, the updated utility-process test passed with `--test-name-pattern="actual Electron utility-process boundary"` (1/1), and the updated production Service Host recovery/routing proof passed with `--test-name-pattern="desktop client recovers crashed hosts with durable multi-project registration state"` (1/1).
- `node --test test/agent-harness/agent-harness-service-host-protocol-compatibility.test.cjs` — passed, 2/2.
- `npm run validate:plan -- --profile repair --changes tmp/wtr02d-repair01-changes.json` — passed preview; exact changed-path manifest included this report.
- `npm run test:affected -- --changes tmp/wtr02d-repair01-changes.json` — passed; receipt run ID `6367c9ed-44c6-41b8-bc7d-79620a3b07cd`, no failure evidence.
- `git diff --check` — passed; Git printed only line-ending normalization warnings for modified CRLF files.

## Security, deviations, and follow-up

- No secrets or concrete machine paths were added to durable artifacts. Checkout roots are absent from control payloads and MCP summaries; Git errors remain mapped to bounded public errors.
- No required check was skipped. Restricted `spawn EPERM` attempts were treated as lane failures, not passes; required checks ran in the normal Windows lane.
- The card checkpoint differs from actual starting HEAD, recorded above. No other scope deviation or deferred-card failure was identified by the affected receipt.
- Operator manual validation remaining: none required by this repair’s deterministic acceptance criteria.
- Recommended next task: return to the WTR02D workflow for review/closure; keep WTR02E+ out of this repair.
