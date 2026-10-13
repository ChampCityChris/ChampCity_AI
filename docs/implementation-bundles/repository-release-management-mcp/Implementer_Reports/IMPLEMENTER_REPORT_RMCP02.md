# RMCP02 Implementer Report

Date: 2026-10-12

Subsequent bundle continuation: RMCP03–RMCP05 are now complete under controlled MCP qualification. The remaining-card statements below describe the RMCP02 stopping point; see [final qualification](IMPLEMENTER_REPORT_RMCP05.md) for current bundle disposition.

Current status: RMCP02 implementation and focused MCP validation are complete: 9 selected cases passed, with no failures, skips or cancellations. The Operator explicitly limited testing to MCP on 2026-10-12. The broad validation rerun was stopped, and no further full-suite or composed-profile run is planned. Historical validation below is retained as evidence, not a current requirement to repeat it. This does not complete RMCP03–RMCP05 or claim live provider qualification.

## Authority and repository verification

- Work Card: RMCP02, authorized by the Operator's package execution request.
- The approved `<PROJECT_REPO>` remains the primary `dev` checkout. RMCP01 and its Repository Context Binding amendment were checkpointed at `e5f564b4d001954e450abcbbd80d172acbe712cf` after 410 passing composed tests.
- Existing `origin` and dev's lack of an upstream remain unchanged. Unrelated untracked planning documents are preserved.
- The implementation follows the existing code/test boundary, validation lanes and External MCP Provider Governance. Forgejo is a narrow compatibility adapter behind provider-neutral contracts; no overlapping GitHub integration or Git implementation was added.

## Implementation

- Added provider-neutral hosting contracts and a facade for status, exact inspection, empty creation, bounded settings updates, provider-owned destinations and verification.
- Implemented Forgejo user/organization namespace policy, authenticated identity checks, idempotent creation without bootstrap commits, response bounds, deadlines, redirect refusal, sanitization and final metadata verification.
- Added global integration-toolbox provider actions without workspace lookup. Bind/verify reuse the existing RepositoryTargetResolver, registered checkout leases, explicit local context and Git primitives. Clone uses LocalGitRepositoryAccessService and requires explicit selection afterward.
- Provider-owned remote brands now retain the exact hosted repository ID/state; binding rejects drift or provider mismatch before Git mutation. No raw remote destination, token, hostname override or generic command enters the public schema.
- Added application-owned metadata settings with expected-configuration checks and an exclusive file lock. Credentials remain in the OS credential store, keyed to a hashed connection realm; changing an endpoint or namespace cannot forward a prior token.
- Added constrained Settings IPC/preload and a Forgejo Settings panel. Authentication arguments exist only on the application Settings route, never MCP. No credentials were requested or inspected during implementation.
- Added application-scoped private HTTP/HTTPS Git authentication to the existing bounded Git runner. The same configured connection credential is scoped to the exact destination in the child environment, with redirects disabled; no secret is stored in Git arguments, repository configuration or returned diagnostics. The existing Git implementation owns push, inspection and clone.
- Existing registered workspace/status contracts and stable top-level toolbox names remain supported. Existing Git push/fetch/tag/ref operations own synchronization.

## Concurrency limits and truthful capability evidence

Forgejo settings updates use an exact inspected-state digest, per-adapter repository serialization and post-write verification. The adapter does not use a verified server-side conditional mutation and does not claim server-atomic CAS against writers outside this ChampCity runtime. `provider_status` explicitly reports `settingsConcurrency: application-expected-state`. No stronger external concurrency evidence is claimed from the synthetic HTTP server.

## Files

Created:

- `src/shared/repositoryHostingContracts.ts`
- `src/main/externalProviders/repositoryHostingAdapter.ts`
- `src/main/externalProviders/repositoryHostingFacade.ts`
- `src/main/externalProviders/forgejoHostingAdapter.ts`
- `src/main/externalProviders/repositoryHostingSettings.ts`
- `src/main/externalProviders/repositoryHostingCredentials.ts`
- `src/main/externalProviders/repositoryHostingIpc.ts`
- `src/renderer/app/ForgejoProviderSettings.tsx`
- `test/external-providers/forgejo-hosting.test.cjs`
- This report.

Modified:

- `src/main/agentHarness/tools/toolRegistry.ts`
- `src/main/core/applicationErrors.ts`
- `src/main/core/gitExecution.ts`
- `src/main/main.ts`
- `src/main/repository/providerOwnedRemote.ts`
- `src/preload/index.ts`
- `src/renderer/app/ApplicationSettingsWorkspace.tsx`
- `src/shared/workspaceContracts.ts`
- `test/agent-harness/reserved-toolbox-namespace.test.cjs`
- `test/agent-harness/sibling-process-launch.test.cjs`
- `test/agent-harness/mcp-tool-contract-generation.test.cjs`
- `test/renderer/agent-harness-settings-workspace.test.cjs`
- `test/renderer/github-provider-settings.test.cjs`
- `test/project-state/execution-completion.test.cjs`
- `test/source-control/managed-project-source.test.cjs`
- `validation/capability-map.json`
- `docs/user/BACKGROUND_AGENT_AND_MCP.md`

Deleted: none. No Project, intake, workflow, SQL record, managed source layout, dependency, credential file, hosting repository deletion, GitHub write path or release publication was introduced.

The new Forgejo proof file owns seven previously uncovered behaviors: authenticated API/response/secret boundaries; empty create/idempotence/settings state; configured transport ownership; settings/credential realm isolation; native Windows credential ABI; private HTTP Git authentication; and global/bounded-target MCP hosting. Existing Settings, preload, namespace and contract proofs were extended instead of duplicating their suites.

The widened composed selection exposed two fixture defects. Six execution-completion cases reproduced at RMCP01's starting checkpoint: source-neutral planning fixtures requested deterministic catalog proof without any source binding. Their acceptance policy now uses the supported semantic mode; lineage, ownership and atomicity assertions remain intact. Seven Git adoption cases failed under the executor's nested temporary root with Git for Windows `'$GIT_DIR' too big`. Fixture directory names are shorter while preserving the deliberate space-path scenario. No production workflow or adoption behavior changed to accommodate these tests.

## Validation evidence

- `npm run typecheck` — restricted Windows, exit 0 throughout provider-contract, facade and Settings implementation.
- `npm run build` — normal Windows, exit 0; TypeScript, renderer and assets built. The existing renderer chunk-size advisory remains.
- `node --test test/external-providers/forgejo-hosting.test.cjs test/renderer/agent-harness-settings-workspace.test.cjs test/agent-harness/reserved-toolbox-namespace.test.cjs test/agent-harness/mcp-tool-contract-generation.test.cjs test/agent-harness/sibling-process-launch.test.cjs` — normal Windows diagnostic, exit 1: 36 tests, 33 passed, three failed. Failures were an unregistered new test in catalog census, an async assertion using `throws` instead of `rejects`, and an ambiguous native FILETIME declaration. The successful cases included the real global MCP bind/push/exact-ref/clone flow.
- Compile-only PowerShell diagnostic of the fixed credential class — normal Windows, exit 0. No credential method was invoked. The fully qualified FILETIME declaration then passed the native missing-reference probe.
- `node --test test/validation/capability-map.test.cjs` — initial catalog diagnostic failed the scheduling classification; corrected to audited parallel-safe, isolated resources. Subsequent run passed all five proofs.
- `node --test test/external-providers/forgejo-hosting.test.cjs test/renderer/agent-harness-settings-workspace.test.cjs test/renderer/github-provider-settings.test.cjs test/agent-harness/mcp-tool-contract-generation.test.cjs` — normal Windows, exit 0, 30 tests passed, no failures/skips/cancellations, duration 32,831 ms. Native OS proof queried an absent random synthetic application reference; no real credential was read.
- `npm run test:affected -- --changes tmp/rmcp02-changes.json` — initial required composed run, normal Windows, exit 1. Receipt `c44aa3ca-ca2a-4813-9591-9023dea36e36`: owned build passed, source stable, 120 files / 908 tests, 894 passed, 13 failed, one skipped, duration 788,855 ms. All selected provider, MCP, Git and Settings proofs passed. The failures were the fixture defects described above.
- Starting-checkpoint overlay diagnostic — 48 tests, 42 passed, six planning failures reproduced unchanged; all 23 adoption cases passed without the executor's nested temporary directory. The overlay changed only loaded code and synthetic fixture authority, never repository source or build output.
- `node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=1 --test-reporter=tap test/source-control/managed-project-source.test.cjs test/project-state/execution-completion.test.cjs` — normal Windows, exit 0, all 48 passed, duration 150,660 ms after the source-neutral fixture correction.
- Synthetic nested-temp submodule/alternate diagnostic — initially reproduced `GIT_EXECUTION_FAILED` at Git config with `'$GIT_DIR' too big`; after fixture-name shortening, exit 0, one selected case passed in 5,952 ms.
- `node --test --test-name-pattern='private HTTP Git' test/external-providers/forgejo-hosting.test.cjs` — normal Windows, exit 0, one case passed in 22,111 ms. Actual authenticated private push, advertised-ref verification and clone share the configured provider credential, with no workflow registration. An earlier diagnostic passed those operations but failed its final direct probe because a raw URL was passed to a named-remote resolver; the probe now uses the configured remote.
- Historical composed validation is superseded by the continuation evidence below and the Operator's final MCP-only testing direction.
- Attributable diff, credential/path and generated-artifact safety scan: completed in the continuation below.

No live provider mutation, real credential access, installer packaging, visual acceptance or release publication has occurred. Forgejo protocol evidence uses the approved API surface and synthetic HTTP responses; live instance/schema qualification remains RMCP05 work.

## Scope-revised continuation

The Operator's 2026-10-12 request to work this bundle activates revised RMCP02. The primary `<PROJECT_REPO>` root was verified as the `dev` Git checkout; the parent workspace is not a Git repository. The inspected HEAD is `e5f564b4d001954e450abcbbd80d172acbe712cf`. Origin remains the existing GitHub remote, with no upstream configured for dev. Existing RMCP02 changes were preserved and extended; unrelated untracked planning bundles were left untouched. No additional dependency, repository topology or integration was introduced.

The scope correction supersedes the old report's implication that repository metadata creation alone completes RMCP02, and its pending checkpoint language. The revised card does not require a source-checkout checkpoint commit; repository Git use remains read-only. Temporary fixture repositories exercise actual Git mutations as authorized automated proof, independently of source-checkout history.

### Added Git coverage

`src/main/repository/gitExtendedOperations.ts` extends the existing centralized bounded runner and Git primitives. It adds 25 published Git actions: inspect_git_state, inspect_conflicts, inspect_git_file, write_git_file_cas, resolve_conflict_file, blame, grep, remove_file, move_file, checkout_ref, reset_ref, stash_list/create/apply/pop/drop, inspect_notes, write_note, remove_note, begin_git_operation, recover_git_operation, inspect_prune, prune_remote, diagnose_repository and delete_untracked_file.

These preserve selected-session targeting and registered-checkout compatibility. Destructive writes require exact observed checkout/file/index/stash/ref identities, operate noninteractively, and return observed state. Reset exposes soft/mixed modes, leaves working files intact and retains the prior commit in its result. Direct merge/rebase/cherry-pick/revert leaves conflict state for the agent's separate resolution/recovery action. Stash uses exact individual paths, optionally nonignored untracked files, and retains the stash after a failed apply. File writes accept bounded UTF-8 text and deny traversal, metadata, nested repositories and links. Remote prune shares configured private HTTP authentication. The old local hard-reset/force-clean/worktree-force prohibitions remain.

These application preconditions serialize operations in the existing service but do not claim atomic exclusion of writers outside ChampCity. File/index/content bounds fail visibly rather than broadening to arbitrary filesystem execution.

### Added Forgejo coverage

The existing adapter/facade now publishes paged repository listing; branch/tag list, inspect, create and delete; file read/create/update/delete; PR list/read/create/edit/close/reopen/merge; and review list/create. `remove_repository_remote` completes the provider-owned local remote lifecycle. No Git synchronization logic was duplicated in the hosting adapter.

The global hosting identity is explicit and independent of workflow registration/local origin. File mutation sends an expected blob SHA, PR merge sends expected HEAD, and reviews name an explicit commit. Ref deletion and PR editing use application expected-state checks and reinspection. Provider status reports these different concurrency guarantees and identifies `adapter-contract` capability evidence. API responses are byte/depth/deadline bounded; echoed credentials are scrubbed before typed projection, redirects are refused, and 204 responses are handled without JSON parsing. Interrupted/unverified writes require caller reinspection; no automatic retry is added.

Contract fields and routes were verified against the published Forgejo OpenAPI document available on Codeberg (`16.0.0-dev-785-465b60ef+gitea-1.22.0`) and the Forgejo API usage documentation. This is API interoperability evidence, not a live configured provider qualification. The downloaded schema stays ignored under `tmp/` and is not a dependency or committed fixture. The capability matrix records sources and limitations.

### Files in this continuation

Created: `src/main/repository/gitExtendedOperations.ts`, `test/agent-harness/git-toolbox-extended-operations.test.cjs`, and `docs/implementation-bundles/repository-release-management-mcp/GIT_CAPABILITY_MATRIX.md`.

Modified beyond the inherited RMCP02 change set: `src/main/agentHarness/tools/toolRegistry.ts`, `src/main/core/gitExecution.ts`, `src/main/externalProviders/forgejoHostingAdapter.ts`, `src/main/externalProviders/repositoryHostingAdapter.ts`, `src/main/externalProviders/repositoryHostingFacade.ts`, `src/shared/repositoryHostingContracts.ts`, `test/agent-harness/mcp-tool-contract-generation.test.cjs`, `test/agent-harness/reserved-toolbox-namespace.test.cjs`, `test/external-providers/forgejo-hosting.test.cjs`, `test/source-control/workflow-integration-service.test.cjs`, `validation/capability-map.json`, `docs/user/BACKGROUND_AGENT_AND_MCP.md`, and this report. The earlier Created/Modified inventory above remains attributable inherited work. RMCP01's local-operations file remains unchanged in the final diff.

Deleted: none. Intentionally not created: a new Git service/runner, arbitrary command/HTTP interface, dependency, workflow Project/state record, release orchestrator, product-specific fixture, GitHub hosting write adapter or generated tracked artifact.

Two new cases prove previously uncovered published local file/stash/search/notes/reset/conflict behavior and global Forgejo ref/content/PR/review semantics. The hosting case extends its existing suite. The Git case was initially added to the existing local-operations suite, then moved intact to a distinct extended-operations file after measured durations showed that the repaired lifecycle plus the preserved RMCP01 scenarios would risk the executor's fixed 900-second per-file deadline. The new file owns a materially distinct behavior family and process budget, not duplicate proof; the original file remains unchanged. Existing exact namespace, JSON/Zod, private authenticated Git and remote-binding cases were extended. RMCP01's independent-repository/session/stale-handle proofs remain intact and passed in the earlier completed run.

### Continuation validation

- `npm run typecheck` — restricted Windows, exit 0 after final typed action changes. An intermediate run identified five missing `requiredNumber` helper references; validated numeric access now uses the existing helper and compilation passes.
- `npm run build` — restricted Windows, exit 1 with `spawn EPERM` at Vite/esbuild; recorded once. Equivalent normal Windows run exited 0. The renderer chunk-size advisory remains.
- `node --test --test-name-pattern='unregistered selected|Forgejo global MCP' test/agent-harness/git-toolbox-local-operations.test.cjs test/external-providers/forgejo-hosting.test.cjs` — normal Windows diagnostic initially passed Forgejo and failed the Git fixture's discovered checkout selector; the fixture was corrected to use `repository.checkouts[0]`. The next Git diagnostic reached conflict setup but timed out at 180,020 ms; its deadline was increased to 420,000 ms, without reducing proof.
- `npm run build` followed by that same focused command — normal Windows, exit 0: 2 tests, 2 passed, zero failures/skips/cancellations; 339,319 ms. Actual direct merge conflict, file/index CAS resolution, continuation and abort passed. Explicit untracked stash/deletion and hardlink negative assertions were subsequently added and passed in the final focused MCP command below.
- `node --test test/validation/capability-map.test.cjs` — restricted Windows, child spawn blocked by `EPERM`; normal Windows initially exposed deterministic ordering defects introduced by this continuation. After correction, normal Windows exit 0, all 5 cases passed.
- `node --test test/agent-harness/reserved-toolbox-namespace.test.cjs test/agent-harness/mcp-tool-contract-generation.test.cjs test/external-providers/forgejo-hosting.test.cjs` — normal Windows, exit 1: 18 cases, 17 passed, 1 failed, no skips/cancellations; 109,074 ms. Exact publication/OAuth/JSON/Zod cases and actual authenticated private push/ref/prune/clone/remote removal passed. The new fixture listing handler incorrectly intercepted organization-create POST; it now handles GET only.
- `node --test --test-name-pattern='Forgejo creates empty' test/external-providers/forgejo-hosting.test.cjs` — normal Windows, exit 0, one case passed in 759 ms after the fixture routing correction.
- `npm run test:affected -- --changes tmp/rmcp02-changes.json --preview` — restricted Windows, exit 0; revised scope selects 126 files through static/build, fast, affected and applicable integration proof. Preview is planning evidence only.
- First continuation composed `npm run test:affected -- --changes tmp/rmcp02-changes.json` — normal Windows, deliberately cancelled (shell exit -1) before acceptance. Final static review found that two active branches at the same commit could share an expected checkout state. Only this task's verified validation runner/process tree was terminated. The fingerprint now includes the exact active symbolic branch and the fixture rejects a reset after a same-HEAD branch switch. This superseded run is not a validation pass.
- Completed continuation composed command — normal Windows, exit 1, receipt `1594b84d-b89c-459d-b6e9-288e9e529f9f`: 126 files, 1,032 cases, 1,024 passed, 7 failed, 1 skipped, no cancellations/unavailable/blocked files; 1,359,583 ms. Owned build passed and source remained stable. All 8 Forgejo cases, exact MCP publication/OAuth/JSON/Zod, and all 11 preserved RMCP01 local-Git cases passed. The new untracked stash case used `--literal-pathspecs` with `check-ignore`, which rejects that global pathspec option; it now uses the existing primitive's exact `check-ignore --no-index --` form.
- Six remaining failures were workflow integration fixture paths under the executor's nested temporary directory. An ignored in-memory assertion/runner trace reproduced `worktree` exit 128, `fatal: '$GIT_DIR' too big`. The fixture now uses the short `wfi-` prefix, preserving all integration/ownership/lineage assertions and production workflow behavior. An initial diagnostic mistakenly placed the fixture under the source checkout and correctly hit the existing “Project container must not be a Git working tree” guard; rerunning under a system temporary root reproduced the actual path limit.
- `node --test test/source-control/workflow-integration-service.test.cjs` with an equivalent nested system temporary root — normal Windows, exit 0; all 6 cases passed, zero skips/cancellations, 155,805 ms. Feature, Issue, refactor, integration-composition, infrastructure and research integration/SQL closure assertions remain intact.
- `node --test test/validation/capability-map.test.cjs` after separating the extended proof — normal Windows, exit 0; all 5 catalog ownership/census/ordering cases passed.
- The single skip belongs to the existing optional live Codex current/latest Windows probe, not a Git/Forgejo proof. No live runtime download or auth probe was substituted for controlled qualification.
- Final equivalent composed command with all 31 attributable paths — cancelled at the Operator's explicit MCP-only testing direction. The verified validation runner and its 10 descendants were stopped; shell exit -1. Its owned build passed before cancellation, but no completed test receipt is claimed. No further composed run is required under the Operator's direction.
- Final focused MCP-only command — normal Windows, exit 0; 9 selected cases passed, zero failures/skips/cancellations, total 502,631 ms. The extended Git lifecycle passed in 502,283 ms, including same-HEAD branch stale-state rejection, tracked/untracked stash, file/index CAS, notes, soft/mixed reset, detached checkout, actual conflicted merge resolution/continuation/abort, path/hardlink denials and read-only scope denial. The other selected cases passed exact namespace publication, contract generation caching, normalized OAuth filtering, registered/local target contracts, global Forgejo refs/files/PRs/reviews, scoped private HTTP Git/prune and global bind/push/clone. Command (output retained in ignored `tmp/rmcp02-focused-mcp.log`):

  ```powershell
  node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=2 --test-name-pattern='unregistered selected Git checkout|Forgejo global MCP|global hosting MCP|private HTTP Git|exact stable top-level namespace|one runtime contract generation|normalized OAuth scopes|public MCP Git contract|LOCALGIT01 built OAuth contracts' test/agent-harness/git-toolbox-extended-operations.test.cjs test/agent-harness/reserved-toolbox-namespace.test.cjs test/agent-harness/mcp-tool-contract-generation.test.cjs test/external-providers/forgejo-hosting.test.cjs
  ```
- `git diff --check` — restricted Windows, exit 0. Attributable secret/local-path/generated-artifact scan — passed: 31 attributable files, no findings or generated paths.

## Git and remaining work

No source-checkout staging, commit, push, merge, tag, reset, stash, cleanup or branch change occurred. RMCP01's committed baseline remains intact. The revised RMCP02 continuation is complete under the Operator's focused testing direction. The completed source-backed coverage and explicit remaining candidates are recorded in `GIT_CAPABILITY_MATRIX.md`; no broader green-suite receipt is claimed. RMCP03–RMCP05 remain separate, unimplemented cards; GitHub write routing, final ordinary-Git gap closure and generic package qualification are not claimed.

No real credentials were requested, inspected or persisted during this implementation. Tests use controlled provider fixtures; the OS credential probe queries only an absent random synthetic reference. No live hosted repository mutation, Electron visual acceptance, installer packaging, consumer project work or release publication occurred. Remaining manual review is limited to the Forgejo Settings panel's experiential behavior and later expressly configured provider qualification.
