# RMCP-REPAIR02 Implementer Report

Status: implementation and automated verification complete; repair-only checkpoint prepared for Architect review. Live connector qualification is blocked by a cached connector input schema. Return for Architect review after the repair checkpoint; no unrelated RMCP work is included.

## Repository and Git disposition

Verified `<PROJECT_REPO>` is the primary `Dev` checkout on `dev`, sharing its common repository with the release checkout. Starting HEAD: `1be0c785a47d3083df9fc687334bbe17d777b1c9`. The starting worktree was clean. `origin` is configured; `dev` has no upstream. No fetch, push, branch movement, release publication, or real provider mutation was performed. The active RMCP-REPAIR02 Repair Card authorizes one repair-only checkpoint. Checkpoint hash is pending creation with this report and will be returned separately without amending solely to insert the hash.

## Root cause and ownership

`createAgentHarnessMcpServer` minted an empty transport-owned session object. The local Git service retained checkout/repository handles at host-service lifetime, but stored the repository selection in a `WeakMap` keyed by that session object. Server closure explicitly released that selection. The ChampCityAI app connector's later tool invocation used another MCP server/session, so its still-valid checkout handle could not find a selection and failed with `REPOSITORY_CONTEXT_REQUIRED`.

The existing `LocalGitRepositoryAccessService`, retained by `AgentHarnessService`, now owns a bounded map of independent portable selections. Each selection receives 24 cryptographically random bytes in an opaque `local_context_` handle. The token encodes no repository information or filesystem path. Its record retains the repository and selected checkout identity/fingerprint, initial trust configuration digest and relevant configured roots, authenticated OAuth client principal, stale state and selected checkout expiry. Records expire with their selected checkout (at most 30 minutes), do not renew on inspection, and disappear when the host service/worker is reconstructed. Expired/stale entries are pruned on selection and capacity is bounded to 1,000 records.

Transport selection remains a compatibility alias to its own record. Closing or switching that transport never deletes or retargets an existing portable context. Explicit context resolution precedes the session fallback. Unknown, expired, foreign-principal, revoked, unavailable or replaced contexts return bounded `REPOSITORY_CONTEXT_STALE` and require rediscovery/reselection. Missing both forms returns `REPOSITORY_CONTEXT_REQUIRED`; a checkout from another repository returns `REPOSITORY_CONTEXT_MISMATCH` before the requested operation executes.

## Central contract and target resolution

`localVariant` and `localGitAction` centrally add the optional bounded `repositoryContextHandle` to checkout-consuming Git actions and context inspection. The same contract produces JSON Schema, Zod and published SDK tool inventory. Registered `workspaceId + repositoryCheckoutId` variants retain their existing contract. `RepositoryTargetResolver` resolves every local target through `inContext` and `withContext`; it no longer provides a checkout-only bypass when a transport is absent.

The HTTP runtime passes its authenticated principal internally into the MCP server and registry; it is not a model argument. Reusing an existing transport session with another principal is rejected. Existing per-action/current-request OAuth scope checks remain authoritative. Contexts never grant missing scopes.

The existing trust, canonical path, worktree inventory, common-directory fingerprint and Git execution guards remain in force. Execution also rechecks selected-context expiry/revocation before bounded Git commands. Successful root removal revokes affected contexts for both typed MCP configuration and Settings changes, including restoration before another tool call. Successful selection creates another record; it does not mutate any earlier record. Common repository execution locks continue protecting concurrent contexts.

The checkout-consumer audit found the local-file `integration_toolbox.upload_hosted_release_asset` source form and repository-target hosting operations. The upload source form now accepts an explicit portable context and resolves through the same validator before ordinary-file containment, size/hash validation, private snapshot and provider mutation. Inline assets and provider identity/expected-state semantics are unchanged. No weaker path rule, raw filesystem capability, Project, synthetic registered checkout, dependency, approval gate or release orchestration was introduced.

## Focused proof

Extended the existing qualification suite rather than creating a parallel suite. Its new regression closes and terminates each MCP SDK/client transport after discover/select/read/mutation invocations against one running host runtime. It verifies two unrelated disposable repositories; context inspection, status/history, staging and commit after disconnect; explicit precedence over a different active session selection; same-session fallback preservation; wrong repository without commit execution; independent contexts; unknown/expired handles; principal mismatch and missing write scope; root removal/readdition; common-directory replacement; and linked-worktree pointer replacement. Every context response is checked for filesystem-path disclosure.

Extended the existing real Settings/service persistence test to remove and restore roots before inspecting the old context. Extended the existing GitHub SDK/provider test to close the selecting client and upload a verified local asset from another SDK client using the captured context; its existing invalid-source/provider contract checks remain. Existing MCP contract proof checks portable JSON variants and successful Zod parsing while continuing registered-checkout routing regression. Capability ownership records the previously uncovered disconnected-transport capability boundary in the existing suite.

## Commands and observed results

- `npm run test:repair -- --changes tmp/rmcp-repair02-changes.json --preview`: normal repository lane, exit 0; bounded repair plan with preserved security, Git/release and external-provider capabilities.
- `npm run test:repair -- --changes tmp/rmcp-repair02-changes.json`: restricted lane, exit 1; owned build could not spawn (`EPERM`). This is an execution-lane failure, not a source failure or pass.
- The equivalent normal-Windows run was deliberately interrupted before completion to apply the final Settings revocation and explicit-priority refinements. It is not claimed as acceptance evidence.
- `node --test --test-name-pattern='RMCP portable context' test/agent-harness/git-toolbox-qualification.test.cjs`: normal Windows lane, exit 0; final-source focused regression, 1 passed, no failures/skips, approximately 71 seconds.
- `node --test test/agent-harness/mcp-tool-contract-generation.test.cjs test/external-providers/github-provider.test.cjs`: normal Windows lane, exit 0; 26 passed, no failures/skips, approximately 34 seconds, before the final policy refinement. The composed final run repeats applicable proofs.
- `node --test test/agent-harness/mcp-tool-contract-generation.test.cjs test/external-providers/github-provider.test.cjs test/external-providers/forgejo-hosting.test.cjs`: normal Windows lane, exit 0; final-source contract/provider regression, 34 passed, no failures/skips, approximately 120 seconds.
- `node tmp/rmcp-repair02-run.cjs`: normal Windows lane; temporary ignored observer invokes the unchanged repository-owned CLI repair profile with the same change-set arguments and records per-file progress. Exit 0; final receipt `27af6af7-82f2-4bf7-bc19-de56e91bff26`, source stable throughout, production build passed (approximately 15 seconds), all 55 files and 448 cases passed, zero failures/skips/cancellations, approximately 1,070 seconds total. Preserved local Git proof already passed all 11 cases (approximately 635 seconds); extended Git lifecycle proof passed both cases (approximately 716 seconds). These file durations exceed the advisory integration budget and the composed repair receipt is `review-required` for its advisory duration budget; no proof was dropped or weakened.
- `node tmp/rmcp-repair02-reload.cjs`: normal Windows lane, exit 0; final live host matched the validated build and reported readiness.
- `git diff --check` and `git diff --cached --check`: exit 0. Inspected the exact staged repair diff; bounded private-key/API-key/local-path checks found zero matches, no generated artifact was staged, and all 13 final files decode as UTF-8. A documentation encoding defect found during this check was corrected; executable source remained unchanged after its passing receipt.

Generated build output, temporary scripts, receipts, progress logs and disposable fixtures remain outside the committed source baseline. No packaging, full release qualification or visual acceptance is claimed or required by this bounded transport repair.

## Actual ChampCityAI connector qualification

Observed the defect through the connected app: selection succeeded, then a separate inspection failed with `REPOSITORY_CONTEXT_REQUIRED`. Reloaded the live harness using its controlled build-generation replacement through the existing service-host client, verified the expected build and readiness, then discovered and selected the managed repository through the actual connector. Selection returned an opaque portable context.

Repeated the live discovery/selection against the final validated host build; selection again returned its context handle. The separate connector `inspect_repository_context`, `status` and `inspect_history` requests were each rejected by the connector's cached input schema with: `params.repositoryContextHandle [additionalProperties]: Additional property 'repositoryContextHandle' is not allowed`. Each rejection occurred before harness dispatch. The final validated runtime contract accepts that field and the real SDK reconnect tests prove it, but this is not a live app-connector sequence pass. Requested a ChampCityAI connector refresh/reconnection; no schema-refresh tool is available in the installed plugin-management tools. Remaining acceptance criterion 18 requires separate actual connector inspection, status and history calls after its schema refresh. No real hosted-release upload was performed; asset portability is verified with the SDK and curated provider fixture.

## Files and checkpoint

Modified production: `src/main/agentHarness/runtime/agentHarnessService.ts`, `httpRuntime.ts`, `mcpServer.ts`; `src/main/agentHarness/tools/toolRegistry.ts`; `src/main/agentHarness/workspace/localGitRepositoryAccessService.ts`, `repositoryTargetResolver.ts`.

Modified proof/documentation: `test/agent-harness/agent-harness-runtime.test.cjs`, `git-toolbox-qualification.test.cjs`, `mcp-tool-contract-generation.test.cjs`; `test/external-providers/github-provider.test.cjs`; `validation/capability-map.json`; `docs/user/BACKGROUND_AGENT_AND_MCP.md`.

Created only this report under the existing workflow-owned Implementer_Reports directory. No tracked file is deleted. No new standalone test suite, schema sidecar, runtime dependency or unrelated RMCP artifact was created. Repair-only checkpoint pending; report the actual hash in the handoff.

Residual qualification and review: the full receipt reports an advisory validation-duration budget overrun. Refresh the connector schema and complete its separate inspection/status/history sequence. Return this repair for Architect review; do not continue unrelated RMCP changes.
