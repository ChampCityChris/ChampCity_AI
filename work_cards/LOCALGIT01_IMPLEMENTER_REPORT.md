# LOCALGIT01 Implementer Report

Status: LOCALGIT01 Work Card implemented; final production build and targeted capability qualification passed. Broad work-item qualification has the separately documented failures below. Checkpoint hash pending in this self-committed report; actual hash is supplied in the Implementer handoff.

Approved repository: `<PROJECT_REPO>/Dev`, primary checkout on `dev`; starting HEAD matches the card's `6fe3d4aa821a33c2b9c3564531fc89d84ee24064`. `origin` is the existing ChampCity_AI GitHub repository; no remote configuration changed. Existing unrelated untracked documentation is preserved. No push, merge, tag or release is authorized or performed.

## Source RCA and implementation

The registered workspace resolver and required RepositoryCheckout selector conflated Git authorization with application enrollment. The Git toolbox now has a separate local target adapter. Registered workspace resolution, application source descriptors, managed-worktree ownership, Workflow authority and other toolboxes retain their existing route.

`LocalGitRepositoryAccessService` validates Operator-configured canonical trusted roots, ordinary checkout/control paths, exact Git roots, primary and linked `.git` relationships, common directories, backlinks and the NUL-separated worktree inventory. Session-memory opaque checkout and repository handles are selectors, expire after 30 minutes, and are revalidated under a common-directory lock. No repository enrollment is persisted. Root revocation applies on subsequent calls. Replacement metadata, external control links/hardlinks, alternate object stores, included repository configuration, dangling worktrees and out-of-scope worktrees fail closed.

The existing bounded Git executor has a local call-scoped execution policy. Registered execution is unchanged. Local calls suppress hooks, fsmonitor, signing, filters, external diff/textconv, editors, credentials, automatic maintenance, submodule recursion and unapproved transports. Custom merge/transport programs are refused. HTTPS/HTTP transport remains explicit; SSH, file and custom transports are unavailable in local mode. Force worktree removal, hard reset, clean and managed-only destructive/isolated operations are unavailable in local mode. Existing guarded mutation primitives remain responsible for operation preconditions. Ordinary local tag deletion has a separate primitive so it does not require or implicitly contact a remote.

Discovery is bounded to depth 6, 2,000 directory entries, 50 groups/checkouts and a 10-second deadline, with explicit partial reasons. Exact selected roots are inspected before nested traversal limits. Output groups share opaque common-directory identity; absolute paths are redacted. Metadata validation also has explicit resource bounds. Source staging refuses nested repository directories.

Trusted Local Git Roots is persisted with existing Agent Harness settings and exposed as one existing directory per line in Settings. Main-process canonicalization validates the selection; an empty list denies local mode. The controller and constrained preload already forward the typed configuration input, so no broader filesystem IPC was added.

## Public MCP contracts

All calls use `git_toolbox`. Read actions require `files.read`; mutations require `files.write`. Unknown fields remain rejected by JSON Schema, Zod and direct dispatcher validation.

| Action | Params | Scope |
| --- | --- | --- |
| `discover_local_repositories` | `directory: string`, `maxDepth?: integer (0..6)`, `maxRepositories?: integer (1..50)` | `files.read` |
| `init_local_repository` | `directory: string`, `initialBranch: string` | `files.write` |
| `create_local_worktree` | `localCheckoutHandle: string`, `destinationDirectory: string`, `branchName: string`, `sourceRef?: string` | `files.write` |
| `remove_local_worktree` | `localCheckoutHandle: string`, `expectedBranch: string` | `files.write` |

Ordinary existing checkout actions accept either the unchanged registered form `{workspaceId, action, params:{repositoryCheckoutId,...}}` or local form `{action, params:{localCheckoutHandle,...}}`. Mixed target forms are rejected. Local `inspect_worktree` inspects its checkout handle; local `list_worktrees` returns every verified primary/linked checkout. Managed lifecycle/isolated operations retain registered-only schemas and ownership guards.

```json
{"action":"init_local_repository","params":{"directory":"<TRUSTED_ROOT>/source","initialBranch":"dev"}}
{"action":"stage_changes","params":{"localCheckoutHandle":"<DISCOVERED_DEV_HANDLE>","paths":["source.txt"]}}
{"action":"commit","params":{"localCheckoutHandle":"<DISCOVERED_DEV_HANDLE>","message":"Initial source"}}
{"action":"create_branch_from_ref","params":{"localCheckoutHandle":"<DISCOVERED_DEV_HANDLE>","branchName":"main","sourceRef":"<INITIAL_COMMIT>"}}
{"action":"create_local_worktree","params":{"localCheckoutHandle":"<DISCOVERED_DEV_HANDLE>","destinationDirectory":"<TRUSTED_ROOT>/main","branchName":"main"}}
{"action":"merge_branch","params":{"localCheckoutHandle":"<DISCOVERED_MAIN_HANDLE>","sourceBranch":"dev","mode":"ff-only"}}
```

Initialization preserves existing source bytes, refuses existing/nested Git metadata, creates no identity/commit/remote/tracking, and returns unborn HEAD plus a usable handle. First commit uses existing Operator Git identity; test identity is fixture setup. Failed initialization/worktree creation preserves partial state for inspection and never force-cleans it.

## Exact owned changes

Created:

- `src/main/agentHarness/workspace/localGitRepositoryAccessService.ts`
- `work_cards/LOCALGIT01_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/agentHarness/runtime/agentHarnessService.ts`
- `src/main/agentHarness/runtime/agentHarnessSettings.ts`
- `src/main/agentHarness/tools/toolRegistry.ts`
- `src/main/agentHarness/workspace/workspaceAccess.ts`
- `src/main/core/gitExecution.ts`
- `src/main/repository/gitMutations.ts`
- `src/renderer/app/ApplicationSettingsWorkspace.tsx`
- `src/shared/workspaceContracts.ts`
- `test/agent-harness/agent-harness-runtime.test.cjs`
- `test/agent-harness/git-toolbox-local-operations.test.cjs`
- `test/agent-harness/mcp-tool-contract-generation.test.cjs`
- `test/agent-harness/reserved-toolbox-namespace.test.cjs`
- `test/renderer/agent-harness-settings-workspace.test.cjs`
- `validation/capability-map.json`

Deleted: none. Intentionally not created: additional permanent test file, dependency, SQL migration, project enrollment, source descriptor, general Git/shell endpoint, controller or unrestricted filesystem IPC. Existing typed controller/preload settings forwarding required no change. Temporary diagnostics, fixture state, receipts and generated build output remain ignored and are excluded from the checkpoint.

## Automated validation and receipts

All child-process tests/builds below ran in the approved normal Windows lane. A first restricted focused invocation produced `spawn EPERM`; recorded once, then equivalent tests ran normally. Temporary source-loader runs transpile current source for focused pre-build diagnostics; they are not production build evidence.

The exact 16-path manifest is retained in ignored `tmp/localgit-changes.json`; capability selection includes Agent Harness runtime, repository operations and security, release/Git operations, and workspace registry. Initial and final planner previews select the same 116 files. The reserved namespace expectation was added to the final manifest without broadening the selected test set.

| Command / evidence | Result |
| --- | --- |
| `node scripts/validation/cli.cjs plan --profile work-item --changes tmp/localgit-changes.json` | Exact-path canonical plan; 116 files selected. |
| `node scripts/validation/cli.cjs run --profile work-item --changes tmp/localgit-changes.json` | Ran composed profile once. Receipt `74e83f6c-b19a-42c1-ac46-d14f0fd01d84`: failed, source stable, production build passed; 858 reported tests, 838 pass, 19 fail, 1 skipped, 1 unknown-count file; no unavailable/blocked files. Duration 1,061,788 ms. |
| `node tmp/localgit-final-validation.cjs` | Final canonical planner/executor for the eight exact owners below, including fresh `npm run build`. Receipt `13eeedc3-1f40-47ae-8cd6-d54330c5c464`: passed, source stable; 80 tests, 80 pass, 0 fail/skip/cancel/unavailable/blocked/unknown. Build 13,778 ms; total 115,481 ms. |
| `node --test --test-name-pattern='configuration persists' test/agent-harness/agent-harness-runtime.test.cjs` | Final built settings persistence: 1 pass, 0 fail. Invalid/missing roots, saved root reconstruction and continued registered access are covered. |
| Bounded final built `repository-io-hardening.test.cjs`, using canonical `runCommand`, absolute child-cleanup preload and 30-second limit | Completed in 3,637 ms: 11 tests, 10 pass, 1 fail; asynchronous Git timeout/cancellation/output bounds passed. The one registered workspace-only compatibility failure independently reproduces on baseline. |
| `git diff --check` and exact staged-diff safety review | Passed; final checkpoint excludes secrets, concrete host paths, generated output, temporary receipts and unrelated dirt. |

Final exact test owners (all passed):

- `test/agent-harness/agent-harness-core.test.cjs`
- `test/agent-harness/git-toolbox-local-operations.test.cjs`
- `test/agent-harness/git-toolbox-remote-operations.test.cjs`
- `test/agent-harness/git-toolbox-tag-operations.test.cjs`
- `test/agent-harness/mcp-tool-contract-generation.test.cjs`
- `test/agent-harness/registered-workspace-registry.test.cjs`
- `test/agent-harness/reserved-toolbox-namespace.test.cjs`
- `test/renderer/agent-harness-settings-workspace.test.cjs`

Earlier focused source diagnostics passed both LOCALGIT01 local-operation scenarios, the LOCALGIT01 OAuth scenario, all 15 renderer owner tests, and settings persistence. The first corrective targeted receipt `7e76fefa-173e-43b7-b8a2-9eb835a36ac6` had 79/80 pass: its Windows test incorrectly expected a renamed `.GiT` control directory to match Git's actual primary inventory. The corrected test accepts case-varied selected source paths and requires altered metadata naming to fail closed; final built qualification above passes.

The new MCP scenarios prove source-preserving unborn initialization, initial stage/commit, sibling worktree creation, common identity, independent targeting, remote-free dev-to-main fast-forward using the main handle, local tag create/delete, clean-only worktree removal preserving branch refs, and reopening/committing an unrelated repository with fresh service handles. Negative proof covers OAuth, mutually exclusive target schemas, default/revoked trust, expiry/replacement, traversal/junction/control redirects, alternates, included configuration (including Windows `CONFIG`), cross-repository pointer substitution, dangling worktrees, nested repositories, dirty/untracked removal, invalid branch/destination, checked-out branch advancement guards and repository hooks/filters/fsmonitor/textconv/transport-helper suppression. Other toolboxes reject local handles. Published JSON/Zod definitions and diagnostic inventory contain all four new actions.

### Broad-profile failures and bounded follow-up

| Owner | Initial result / qualification |
| --- | --- |
| `agent-harness-runtime.test.cjs` | 18/19 pass; existing HTTP checkout-list fixture expects an empty list but receives a conventional descriptor. Failure reproduced with exact baseline source loader. New persistence scenario passes separately on final build. |
| `release-toolbox-boundary.test.cjs` | 48/50 pass; host-versus-fixture Node adapter expectation and old release schema fixture mismatch both reproduced with exact baseline source loader. |
| `repository-io-hardening.test.cjs` | Composed run stalled after five passes and was stopped after 619,840 ms; exact owned test process subtree only was terminated. No completed count claimed. Isolated baseline timeout scenario passed; final complete owner finishes with 10/11 pass. Its remaining workspace-only call failure reproduces at the same assertion on baseline. The earlier stall is not claimed as baseline-confirmed. |
| `reserved-toolbox-namespace.test.cjs` | 2/3 pass before adding the four authorized public actions to its expected list; corrected and 3/3 pass in final receipt. |
| `sibling-process-launch.test.cjs` | 4/5 pass; untouched VM fixture lacks `createProjectSourceOperationCoordinator`. Outside-card qualification failure, not independently baseline-reproduced. |
| `project-state/execution-completion.test.cjs` | 19/25 pass; required ValidationCatalog proof absent in source-neutral Workflow qualification. Outside-card qualification failure, not independently baseline-reproduced. |
| `source-control/managed-project-source.test.cjs` | 16/23 pass; managed candidate Git preparation qualification errors. Outside-card qualification failures, not independently baseline-reproduced. |
| `source-control/source-lifecycle-package.test.cjs` | 0/1 pass; Work Intake form invalid. Outside-card qualification failure, not independently baseline-reproduced. |

The composed profile's one skip is in `test/work-card-building/codex-runtime-manager.test.cjs`. Its 60,000 ms advisory budget reports `review-required`; the I/O stall plus desktop lifecycle/source checkpoint owners dominate duration. No second large profile run was performed, as directed by this card. Broader failures remain for separate owner qualification; no unrelated production or fixture changes were made to hide them.

Baseline diagnostics use ignored `tmp/localgit-baseline-loader.cjs`: it resolves changed existing production modules from `git show 6fe3d4aa821a33c2b9c3564531fc89d84ee24064:<path>` and transpiles them for isolated tests without modifying the checkout. The prefix is `node --require ./tmp/localgit-baseline-loader.cjs --test`; isolated selections are the runtime scenario `Agent Harness HTTP runtime serves registered workspace tool discovery, read, write, diagnostics, and shutdown`, the first five release owner scenarios (including `production command adapter fixes executables, arguments, deadlines, and safe receipt paths` and `release_toolbox publishes exact read/write-scoped actions with no raw command surface`), and the I/O patterns `Git status and diff are asynchronous` and `workspace-only git_toolbox`. The last exact invocation is `node --require ./tmp/localgit-baseline-loader.cjs --test --test-name-pattern='workspace-only git_toolbox' test/agent-harness/repository-io-hardening.test.cjs` (exit 1, same baseline assertion). Diagnostic outputs remain under ignored `tmp/localgit-baseline-*`; these reproductions are separate from built-path passes.

## Built read-only physical discovery

`node tmp/localgit-live-discovery.cjs` starts the final built production `AgentHarnessService` with isolated temporary settings and a fresh SDK MCP connection, selects the actual Sosaria application parent as its trusted root, and calls only `discover_local_repositories` and `status`. Zero registered workspaces are present. It does not save or alter the desktop's real settings.

Observed one repository group: `dev` is primary and dirty from existing source/document additions; `main` is linked and clean. Both report full HEAD `24562e8b8e323580b50c5cee8e0d8d6646918c61`, the same opaque common identity, and `noRemote: true`. The final run explicitly reports `partial: true`, reasons `depth-limit` and `entry-limit`, and 2,000 visited entries; both expected checkouts were discovered before that cap. Earlier read-only qualification reported 48 entries without a cap. No live Sosaria initialization, staging, commit, merge, worktree lifecycle or cleanup occurred.

## Remaining acceptance and handoff

Production desktop deployment/connection refresh and Settings visual judgment remain Operator acceptance. Physical read-only discovery is observed above; ordinary local operations and dev-to-main promotion are qualified on disposable repositories. Local HTTP(S) remote operations require explicit calls and work without credential helpers; SSH/file/custom transports and custom merge drivers remain refused. Guarded operations cannot perform a hard-reset rollback in local mode; partial state remains available for inspection rather than destructive cleanup.

The exact staged diff is inspected before the attributable checkpoint. Bounded added-line secret/local-path checks and artifact-path checks are required and performed; synthetic test identities and dynamic fixture paths are intentional. Commit message: `LOCALGIT01 enable project-agnostic local Git MCP`. Hash pending until commit; no amend solely to record this report's own hash. Stop for Architect code review after checkpoint. Recommended next work is Architect review, desktop Settings/connection acceptance, and separate qualification of the broad-profile owner failures.
