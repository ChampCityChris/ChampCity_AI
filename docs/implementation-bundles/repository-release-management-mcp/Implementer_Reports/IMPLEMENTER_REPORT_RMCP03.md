# RMCP03 Implementer Report

Date: 2026-10-12. Complete under controlled MCP qualification. Authorized by the Operator's bundle execution request and explicit continuation through RMCP03–RMCP05. Testing is limited to MCP as directed by the Operator.

## Repository and scope

Verified `<PROJECT_REPO>` is the primary `dev` checkout at `e5f564b4d001954e450abcbbd80d172acbe712cf`. Existing GitHub origin and absence of upstream remain. RMCP01 baseline, uncommitted RMCP02 implementation and unrelated planning changes are preserved. No staging, commit, branch switch, push, reset, cleanup or other source-checkout Git mutation occurred.

## Implementation

Added a GitHub hosting adapter to the existing provider-neutral hosting facade and MCP registry. Hosted coordinates are explicit and independent of local origin or workflow registration. The existing GithubProviderService owns the persistent official gateway, OAuth, exact discovery, generation checks, pinned runtime verification and last-known-good recovery. The pin remains `1.12.2`: its verified tool contracts cover the needed official reads and file/PR writes; a runtime update was unnecessary.

Published `connect_hosted_provider` and `disconnect_hosted_provider` let the MCP host explicitly connect its official provider session. Provider sessions are shut down when the MCP service stops, after client draining. Desktop Settings keeps its existing provider session; both hosts use the existing managed runtime implementation and native provider OAuth. No authentication is invented on restart.

Existing hosting actions now route GitHub repository search/list/inspection/empty creation; branch/tag lists; branch creation when an exact source branch is available; exact tag inspection; official UTF-8 file reads/writes with blob SHA; PR list/read/create/edit/merge with expected HEAD; and explicit-commit review creation/listing. Official embedded-resource file responses and textual review acknowledgments are handled using the pinned result contracts, followed by exact metadata/state verification. No arbitrary tool name or argument vector is published.

The pinned official source demonstrates gaps in repository settings, exact SHA ref creation/deletion and branch lookup, exact file metadata/absence, blob-guarded file deletion, release object writes and assets. Individually named compatibility methods fill these gaps using fixed GitHub CLI commands/routes. The CLI account must match the official provider's authenticated identity. Ambient GH/GITHUB credentials and host overrides are excluded. Release asset upload uses the exact release ID and bounded binary stdin to the fixed uploads host; no tag-based upload race, arbitrary URL, local-file selector or temporary asset file is exposed.

Added global `list_hosted_releases`, `inspect_hosted_release`, `create_hosted_release`, `update_hosted_release`, `delete_hosted_release`, `upload_hosted_release_asset`, and `delete_hosted_release_asset`. Release metadata is bounded and projected; update/delete/asset mutation requires the inspected state digest. Upload refuses replacement and accepts at most 512 KiB of binary content (699,052 base64 characters), within the existing 1,000,000-byte MCP request envelope. These are individual hosted-object operations, with no build, release pipeline or app-owned orchestration.

Private GitHub HTTPS authentication resolves an application-private CLI credential, verifies its user against the official authenticated provider, and passes it only to the existing central runner's exact destination-scoped child environment. Tokens never enter MCP inputs/results, Git argv or stored repository configuration. This internal route is not invoked when the official session is disconnected.

## Evidence and limitations

Official mapping requires exact tool names and all used schema fields/method values. Missing or incomplete schemas remain unavailable. Status distinguishes discovered official capabilities from named compatibility methods that require a matching CLI account. File and merge writes send server SHA guards. Settings, ref deletion, PR edits, release edits/deletion and assets have application expected-state guards and observable verification; no exclusion of external writers is claimed. Interrupted or session-changed outcomes fail visibly and require reinspection, without automatic write retries.

Primary interoperability sources: [pinned repository tools](https://github.com/github/github-mcp-server/blob/v1.12.2/pkg/github/repositories.go), [pinned PR tools](https://github.com/github/github-mcp-server/blob/v1.12.2/pkg/github/pullrequests.go), [pinned result types](https://github.com/github/github-mcp-server/blob/v1.12.2/pkg/github/minimal_types.go), [GitHub repository API](https://docs.github.com/en/rest/repos/repos), [Git refs API](https://docs.github.com/en/rest/git/refs), [release API](https://docs.github.com/en/rest/releases/releases), [assets API](https://docs.github.com/en/rest/releases/assets), and [CLI API implementation](https://github.com/cli/cli/blob/trunk/pkg/cmd/api/http.go). Downloaded references remain ignored under `tmp/` and are not dependencies or packaged fixtures.

## Files and validation

Created: `src/main/externalProviders/githubHostingAdapter.ts`, `src/main/externalProviders/githubHostingCompatibility.ts`, and this report.

Modified: `src/main/externalProviders/githubProviderAdapter.ts`, `githubProviderService.ts`, `repositoryHostingFacade.ts`, `externalProviderGateway.ts`, `externalProviderRegistry.ts`; `src/shared/repositoryHostingContracts.ts`; `src/main/agentHarness/tools/toolRegistry.ts`; `src/main/agentHarness/runtime/agentHarnessService.ts`; existing `test/external-providers/github-provider.test.cjs` and exact namespace proof; `validation/capability-map.json`, shared matrix and user documentation.

Deleted: none. Intentionally not created: new dependencies, general GitHub REST client, raw HTTP/CLI passthrough, workflow Project, consumer fixture, build system, release engine, tracked generated output or live provider mutation.

- `npm run typecheck` — restricted Windows, initially failed on a string constant in the existing boolean-only ParamSpec field. The provider restriction now uses the existing string enum mechanism.
- `npm run build` — normal Windows, exit 0, TypeScript/renderer/assets built; existing renderer chunk-size advisory remains.
- `node --test test/external-providers/github-provider.test.cjs` — normal Windows, exit 0; all 17 GitHub MCP provider cases passed, no failures/skips/cancellations, total 1,164 ms. New proof runs an actual external MCP HTTP client against controlled official-schema/auth and compatibility fixtures, including file, PR/review, release/assets, stale-state and no-registration behavior. Existing runtime integrity/OAuth/recovery cases remain intact.

Final refinements verify official create's minimal ID/URL result; distinguish rounded zero storage size from actual branch absence; allow an explicitly requested first file to initialize an empty hosted repository; verify resource owner/commit/blob bytes; and inspect exact source commits through the official `get_commit` `detail: none` contract before ref creation. The generic gateway retains its default 64,000-character result bound; only GitHub file reads receive an application-owned, validated 1,000,000-character budget for JSON-escaped 128 KiB resources. Depth/node bounds and redaction are preserved. Fixture content includes an 80 KiB escaped resource with a real Git blob hash. No model-controlled budget exists.

- Final `npm run build` — normal Windows, exit 0, including all source refinements.
- `node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=2 test/external-providers/github-provider.test.cjs test/external-providers/external-mcp-provider-gateway.test.cjs` — normal Windows, exit 0; 31 MCP provider/gateway cases passed, zero failures/skips/cancellations, 1,249 ms. This includes fixed-route binary upload, wrong CLI account rejection, missing metadata, path/size denial, token-user verification and existing gateway transport/error/redaction proofs.
- Final `node --test test/external-providers/github-provider.test.cjs` after the native creation/bootstrap correction — normal Windows, exit 0; all 19 cases passed, zero failures/skips/cancellations, 1,290 ms. Other gateway behavior was unchanged by that correction.
- Exact final publication/OAuth/checkout contract command — normal Windows, exit 0; 5 selected cases passed, 12,440 ms; exact command in RMCP05.

No full/composed profile was run after the Operator's MCP-only direction. No real credential, configured account, live hosted repository, runtime download, installer or visual acceptance was exercised. Controlled fixture qualification is complete; matching-account and live provider configuration remain explicit deployment conditions, not inferred acceptance evidence.

RMCP04 and RMCP05 were continued within the same authorized package. See their reports for ordinary-Git and final qualification evidence; the card boundary separates scope and does not end authorized bundle execution.
