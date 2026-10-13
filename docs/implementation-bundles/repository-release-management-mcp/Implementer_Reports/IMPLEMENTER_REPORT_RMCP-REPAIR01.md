# RMCP-REPAIR01 Implementer Report

Status: implementation and focused verification complete; Operator authorized one combined checkpoint of all current changes. Return for Architect code review. No unrelated RMCP implementation was continued.

## Starting source and Git disposition

- Card: Repair Card RMCP-REPAIR01, external repository compatibility and provider release tooling.
- Starting commit: `e5f564b4d001954e450abcbbd80d172acbe712cf`.
- Verified `<PROJECT_REPO>` is the `Dev` working checkout on `dev`, sharing the managed common repository with `Main`. Development remained in that checkout.
- Remote `origin` exists; `dev` has no configured upstream. No network Git operation, push, release publication, or real provider mutation was performed. Staging and one combined commit are authorized by the Operator follow-up.
- The starting working tree already contained extensive RMCP and unrelated changes. In particular, `githubHostingAdapter.ts`, `githubHostingCompatibility.ts`, `repositoryHostingFacade.ts` and Git qualification tests existed as untracked prerequisite files. Their starting bytes were preserved in an ignored temporary baseline before editing.
- Checkpoint commit: pending creation with this report. The Operator explicitly superseded separate prerequisite/repair checkpoints and authorized committing all current changes together. The combined commit includes existing RMCP prerequisites and other pre-existing working-tree changes. Its actual hash will be reported after commit; no amendment solely to insert that hash is planned.
- `tmp/RMCP-REPAIR01.patch` is the repair-only diff against the starting working tree, rather than against HEAD. Do not apply it to a checkout missing the RMCP prerequisites. The patch and baseline are local ignored review aids, not substitute source commits.

## Exact root causes

1. `LocalGitRepositoryAccessService.filesystemIdentity` required the common directory basename to equal `.git`. Its `records` method also rejected every bare inventory entry and assumed inventory entry zero was a working primary checkout. A valid bare common directory plus managed linked checkouts therefore failed both filesystem and Git-inventory validation. Default selection also required a primary working checkout even when all usable checkouts were linked.
2. The public `release_toolbox` description advertised general GitHub release-provider behavior, although its actions require registered RepositoryCheckouts. `integration_toolbox` inherited a generic compatibility description that did not identify its project-independent hosting actions.
3. `githubReleaseActions` required `contentBase64` with maximum length 699,052. `GithubHostingAdapter.mutateAsset` accepted only inline upload or asset deletion, and the fixed compatibility uploader decoded at most 524,288 bytes into a Buffer. There was no binary asset download action or private streamed destination. Release inspection already projected asset digests; that projection was reused and its size validation strengthened.

## Reused behavior and identity rules

Trusted-root configuration, opaque repository/checkout handles, MCP session selection, expiry/invalidation, per-repository locking, bounded Git execution and provider separation remain with their existing owners. No Project, synthetic RepositoryCheckout, shell entrypoint, credential input, raw Git/gh arguments, API passthrough, or release engine was added.

Repository identity now requires ordinary trusted directories with Git metadata, consistent `.git` pointers, linked `commondir` relationships, and exact backlinks. The common directory may have any ordinary name. Git's worktree inventory, resolved top-level directory, absolute Git directory and common directory must agree for every working checkout. Separate-directory primary inventory anchors are resolved against the explicitly requested checkout and then verified with Git. A bare inventory entry is allowed only as the first entry identifying the same trusted common directory; it never issues a working-checkout handle. Missing, prunable, duplicate, unrelated, redirected or out-of-scope checkouts remain rejected. Selection falls back to an available linked checkout when no working primary exists.

Recursive metadata validation still rejects symlinks/redirects, nonordinary files, hardlinked metadata, alternates/http-alternates/grafts and configuration includes. Bounded control-file reads additionally reject hardlinked pointer files. Existing unsafe merge/transport-helper rejection and suppression of hooks, credential helpers, filters and other unsafe Git execution remain intact. There is no product-path special case. Windows metadata casing is accepted when Git verifies the same identity; casing alone is not an escape or redirect.

Read-only qualification of the actual managed topology returned one repository, two checkouts (`dev`, `main`), a shared repository handle, and successful MCP-service session selection of `dev`. This was service evidence using the built production code, not a claim that the running desktop MCP host had already adopted the new build.

## Final MCP descriptions and contracts

`release_toolbox` now describes itself as:

> ChampCity Desktop legacy release compatibility operations. Requires a registered ChampCity RepositoryCheckout. For project-independent Forgejo/GitHub repository, pull-request, release, and asset operations use integration_toolbox.

`integration_toolbox` now describes itself as:

> Project-independent Forgejo and GitHub hosting operations, including repositories, settings, branches, tags, files, pull requests, releases, and release assets. No workflow Project registration is required.

Names and legacy release action contracts remain stable. Local Git uses `git_toolbox`; hosting uses explicit provider coordinates in `integration_toolbox`. Release asset actions currently target GitHub. Hosted identity is never inferred from selected local context, origin, workspace or registered checkout.

Upload retains `providerId`, `owner`, `repository`, `releaseId`, `expectedState`, and `name`, and selects exactly one complete source form:

- `contentBase64`: existing bounded small inline source, at most 512 KiB decoded.
- `localCheckoutHandle`, `relativePath`, `expectedSha256`, `expectedSize`: session-authorized checkout source, lowercase SHA-256, size 1 byte through **2,147,483,648 bytes (2 GiB)**.

JSON and Zod publish two strict source variants. Direct dispatch validates those same exclusive forms. The global provider dispatcher receives the transport-owned session identity internally; callers cannot supply it. No workspace registration is required for either source.

`download_hosted_release_asset` requires `providerId: github`, `owner`, `repository`, `releaseId`, `assetId` and release `expectedState`. It accepts no filesystem destination input and returns an opaque artifact handle, filename, size, calculated SHA-256, provider digest and retention interval. Download is a provider read and requires `files.read`; uploads require `files.write`. Tool inventory, generated schemas, contract fingerprints, capability ownership and user documentation were verified together.

## Asset transport and resource policy

Local uploads validate the checkout against the current MCP session and selected repository. The resolver rejects absolute paths, traversal, Windows devices/streams, directories, symlinks, redirects, hardlinks, nested repository controls, `.git` paths and the actual common/Git directories. It checks expected size before copying, opens an ordinary file descriptor, verifies file identity, streams into a private snapshot while calculating SHA-256, and checks the digest and final file state before any provider mutation. Selected context is checked again immediately before provider dispatch. Upload streams the snapshot into fixed GitHub CLI stdin, with exact content length. The local absolute path never enters a public request or response. Upload snapshots are deleted on completion or failure.

Downloads stream the fixed GitHub asset endpoint into an exclusively created application-owned temporary file through a bounded hashing transform. Short/oversized data and provider SHA-256 mismatches fail. The release expected state is checked before and after transfer. Asset metadata inspection exposes provider digests without downloading. Responses retain bounded asset ID/name/size/digest and the resulting release state token; the existing release response shape is preserved.

The per-application artifact store reserves at most two retained/in-flight artifacts, each at most 2 GiB (4 GiB aggregate reservation). Download artifacts expire after 30 minutes and are removed on provider shutdown. They serve verification through this action; no generic artifact export or arbitrary persistence interface was added. Abnormal process termination may leave private operating-system temporary files until normal OS cleanup; crash recovery was not added as a release subsystem.

The fixed CLI executor streams binary I/O, bounds metadata stdout to 256 KiB and diagnostics to 16 KiB, preserves UTF-8 across chunks, hides Windows process windows, supports cancellation and uses a five-minute binary transfer deadline. It exposes no caller-controlled executable, endpoint, argument vector or token.

## Official provider and compatibility routing

Existing discovered official GitHub MCP capabilities remain preferred for supported repository/branch/tag/file/PR/review operations and release listing. The configured official pin has no verified binary asset transport contract. Release-ID inspection, release writes/deletion and binary asset upload/download/deletion therefore reuse individually named fixed GitHub CLI compatibility routes. Account identity is checked against the official provider on every compatibility invocation. Existing official-write preference in the release adapter remains in place where a verified capability is available; the provider pin or dependency set was not changed.

The download endpoint and octet-stream request follow the provider's [release asset API documentation](https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28), which also documents server digest metadata.

Provider status now explains connecting/authenticating official MCP and the additional requirement that `gh` be authenticated to `github.com` as the same login, with applicable repository Contents access. Compatibility status continues to report `requires-matching-cli-account`, including download. Official connection does not assert CLI readiness. No second credential system was introduced. Forgejo `not-configured` remains a deployment setting, and no instance was hardcoded.

## Files attributable to this repair

Created:

- `src/main/externalProviders/releaseAssetTransport.ts`
- This Implementer Report.

Modified relative to the starting working tree:

- `src/main/agentHarness/workspace/localGitRepositoryAccessService.ts`
- `src/main/agentHarness/tools/toolRegistry.ts`
- `src/main/externalProviders/githubHostingCompatibility.ts`
- `src/main/externalProviders/githubHostingAdapter.ts`
- `src/main/externalProviders/repositoryHostingFacade.ts`
- `docs/user/BACKGROUND_AGENT_AND_MCP.md`
- `test/agent-harness/git-toolbox-qualification.test.cjs`
- `test/agent-harness/git-toolbox-local-operations.test.cjs`
- `test/external-providers/github-provider.test.cjs`
- `test/agent-harness/reserved-toolbox-namespace.test.cjs`
- `validation/capability-map.json`

Deleted: none. Intentionally not created: registration records, migrations, credentials, provider instances, dependency additions, release pipelines, build orchestration and UI changes. Unrelated starting changes were preserved and included in the combined checkpoint as explicitly directed.

## Validation commands and observed results

All commands ran from `<PROJECT_REPO>`. Normal Windows means the approved execution lane outside restricted child-process sandboxing.

| Command | Lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted, no child-process requirement | Exit 0. |
| `npm run build` | Restricted | Exit 1: esbuild `spawn EPERM`; not a source failure or pass. |
| `node --test --test-name-pattern 'RMCP repair\|GitHub public MCP\|GitHub named compatibility' test/agent-harness/git-toolbox-qualification.test.cjs test/external-providers/github-provider.test.cjs` | Restricted | Exit 1: test child `spawn EPERM`; rerun in normal Windows. |
| `npm run build` | Normal Windows | Exit 0, including TypeScript, renderer and assets. |
| Same initial focused test command | Normal Windows | Two provider cases passed; topology fixture hit Windows hidden `.git` write semantics. Fixture corrected to update the pointer in place. Subsequent topology run exposed separate-directory inventory anchoring, which was repaired and verified. |
| `npm run test:repair -- --changes tmp/rmcp-repair01-changes.json --preview` | Restricted | Exit 0 after correcting catalog ordering/resource declarations. Selected 51 files and one owned production build. |
| `npm run test:repair -- --changes tmp/rmcp-repair01-changes.json` | Normal Windows | Exit 1: 427/428 cases passed across 51 files; production build passed; source stable. Sole failure was the old Windows `.GiT` rejection assertion, corrected to follow verified Git identity. Receipt run `2c169c8f-7dd1-4898-a79f-c1b7bbc7d27e`, duration 1,147,131 ms. |
| `npm run build` after final control-file/context/UTF-8 tightening | Normal Windows | Exit 0. This build owns the final focused verification below. |
| `node --test test/external-providers/github-provider.test.cjs test/agent-harness/mcp-tool-contract-generation.test.cjs test/agent-harness/reserved-toolbox-namespace.test.cjs test/validation/capability-map.test.cjs` | Normal Windows | Exit 0: **34/34** cases, 30,436 ms. |
| `node --test --test-name-pattern 'RMCP repair\|LOCALGIT01 trust' test/agent-harness/git-toolbox-qualification.test.cjs test/agent-harness/git-toolbox-local-operations.test.cjs` | Normal Windows | Exit 0: **2/2** cases, 64,473 ms; includes corrected trust/helper case and generic/managed topology case. |
| `node --test --test-name-pattern 'GitHub public MCP' test/external-providers/github-provider.test.cjs` after adding explicit device/alternate-stream inputs | Normal Windows | Exit 0: **1/1**, 29,614 ms; `NUL` and alternate-stream sources reject before provider mutation. |
| `node tmp/rmcp-repair01-patch.cjs` and `git apply --numstat tmp/RMCP-REPAIR01.patch` | Normal Windows | Isolated review patch generated and structurally parsed. Restricted Node-to-Git spawn was recorded once as EPERM before using this lane. |

The final focused checks include conventional and nonstandard metadata, generic and ChampCity-equivalent bare common layouts, separate Git directory, common-directory escape, symlink/junction, malformed backlinks/commondir, unrelated/dangling worktrees, hardlinked pointers, session selection, helper/config/alternate protections and expiry. Existing ordinary/linked Git workflows and legacy release operations passed in the composed run.

Provider proof exercises public MCP with disposable Git/provider fixtures: small inline upload, streamed 1 MiB upload through checkout identity, exact size/hash, mismatches before mutation, traversal/absolute/device-control boundaries, directory/symlink/hardlink/control sources, wrong selected repository, stale handles, authentication failure, stale expected state, asset inspection, binary download/hash verification, provider digest mismatch, missing digest, retention capacity, strict JSON/Zod alternatives, discovery descriptions, inventory and dynamic fingerprints. Named compatibility fixtures also consume actual Readable upload streams and Writable downloads through fixed route construction. No existing published release or live provider was mutated.

The initial composed receipt remains accurately marked failed; it was not relabeled or combined into a fabricated passing receipt. Its single scenario subsequently passed against the final build. The final focused run verifies the amended source; the entire 51-file profile was not repeated after that correction. There were no unrelated pre-existing assertion failures requiring quarantine. Long Git suites exceeded advisory budgets (extended operations 784,532 ms; local operations 679,356 ms); no proof was dropped or timeout increased.

## Safety and remaining disposition

The repair-only diff was inspected for credentials/private keys, concrete user paths and generated artifacts. It contains no such values or generated/dependency artifacts. Reports and committed-source candidates use repository-relative paths; temporary fixture paths are generated at runtime. The combined staged diff is inspected and scanned before committing under the Operator follow-up authorization.

Architect review should assess the identity generalization and binary transport boundaries. Live authenticated provider acceptance, a final desktop MCP-host generation restart, experiential acceptance and publication were not performed. Application expected-state checks retain the existing limitation that they cannot exclude concurrent external provider writers. The Operator authorized a combined source checkpoint; its actual hash is reported in the closing response. Architect review remains the next step.
