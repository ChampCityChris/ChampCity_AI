# RMCP source-backed capability matrix

Date: 2026-10-12. Source-backed RMCP02–RMCP04 implementation inventory; RMCP05 focused qualification results are recorded in its implementer report. Live provider or release acceptance is not implied.

## Published contracts and target policy

`src/main/agentHarness/tools/toolRegistry.ts` owns JSON Schema, Zod, scope filtering and dispatch for every action below. Git inspection requires `files.read`; mutation requires `files.write`. Ordinary actions accept an explicit selected-session `localCheckoutHandle` or the existing registered `repositoryCheckoutId`. Setup/access/context actions have their own global local-Git contracts. No raw Git argument vector or shell is published. Managed-only actions retain their existing restrictions; the new exact untracked-file operation is available to local targets.

In the proof column, “Local extension” refers to `test/agent-harness/git-toolbox-extended-operations.test.cjs`. It owns the distinct new lifecycle without duplicating RMCP01's preserved `git-toolbox-local-operations.test.cjs` suite. The separate process boundary keeps both below the executor's fixed per-file deadline; no assertions were removed.

## Local Git

| Family | Existing published actions preserved | RMCP02 additions | Implementation path under `src/main/` | Primary focused proof |
| --- | --- | --- | --- | --- |
| Access/context/setup | inspect/configure local access, discover/init local repository, select/inspect repository context | None; preserve RMCP01 | `agentHarness/workspace/localGitRepositoryAccessService.ts` | `git-toolbox-local-operations`: RMCP context isolation and LOCALGIT trust/bootstrap |
| Clone | provider-owned clone primitive; now `integration_toolbox.clone_hosted_repository` | Completed global hosting route | Local access service + `externalProviders/repositoryHostingFacade.ts` | `forgejo-hosting`: global hosting/private HTTP Git |
| Inspection | status, diff, changed_files, inspect_commit, compare_refs, inspect_history, inspect_reflog | inspect_git_state, inspect_git_file, blame, grep, diagnose_repository | `repository/gitMutations.ts`, `repository/repositoryOperations.ts`, `repository/gitExtendedOperations.ts` | Local operations extension and preserved inspection cases |
| File/index | stage_changes, unstage_changes, restore_files | write_git_file_cas, remove_file, move_file, delete_untracked_file | Existing mutations reused + extended operations | Local operations extension: exact file/index fingerprints and stale writes |
| Commits | commit, amend_commit, revert_commit, cherry_pick_commit | Direct conflict-preserving transforms below | `repository/gitMutations.ts` + extended operations | Local operations + remote/tag suites |
| Branch/ref/checkout | prepare/switch branch, create/advance/replace branch ref, rename/delete branch, set/unset upstream | checkout_ref (clean detached checkout), reset_ref (soft/mixed, inspected state) | Existing mutations + extended operations | Local extension and existing branch/ref cases |
| Worktrees | list/inspect, create/remove local worktree; existing managed lifecycle | None; reuse | Local access service, `repository/managedWorktrees.ts` | LOCALGIT bootstrap, trust and session/sibling cases |
| Merge/rebase/transforms | merge_branch; isolated begin/inspect/continue/abort/skip/advance; direct clean commit transforms with rollback | begin_git_operation, recover_git_operation (direct requested action and observed state) | `repository/isolatedGitOperations.ts`, mutations, extended operations | Local extension: conflicted merge, resolution, continue, abort; existing isolated merge/rebase fixture |
| Conflict files | staged resolution possible through existing Git primitives | inspect_conflicts, resolve_conflict_file (exact file/index identities, stages resolution) | Extended operations + existing conflict inspection | Local extension rejects unresolved continuation and verifies resolved commit |
| Stash | None | stash_list/create/apply/pop/drop; explicit tracked/untracked paths, exact stash commit | Extended operations | Local extension: stale checkout/stash, apply, pop, drop, untracked stash |
| Recovery | inspect_reflog, replace_branch_ref, isolated abort | reset_ref (soft/mixed), direct operation recovery | Existing mutations + extended operations | Local extension retains files/prior commit; existing recovery fixtures |
| Tags/notes | list_tags, create/verify/push/delete_tag | inspect_notes, write_note, remove_note | Existing mutations + extended operations | Local extension note ref guards; existing tag operations suite |
| Remotes | inspect_remotes, fetch_remote, push, push_with_lease, delete_remote_branch, upstream; exact remote/CAS primitives | inspect_remote, inspect_remote_refs, pull_branch; provider bind/remove/clone/verify routes | `repository/gitRemoteManagement.ts`, `repository/pullGitBranch.ts`, hosting facade, existing mutations | Existing RMCP exact pull/ref/remote cases; private HTTP and global MCP hosting |
| Tracking/housekeeping | existing exact nonignored untracked deletion primitive (managed-only legacy action) | inspect_prune, prune_remote, diagnose_repository, delete_untracked_file | Extended operations reuse bounded runner and deletion primitive | Private HTTP fixture verifies authenticated prune; local extension verifies exact deletion |

Every new Git write has an exact checkout selector and a bounded state/file/index/ref precondition. File replacement uses a temporary sibling with cleanup and post-checks; it never creates parents. State inspection includes active branch identity, exact index entries, changed-file bytes and operation metadata, with bounded inventory/output. Switching branches at the same commit invalidates a prior state. No server-wide or filesystem-wide transactional guarantee against external processes is claimed. Hard reset, blanket Git clean and forced worktree removal remain denied by the existing local Git execution policy.

## Forgejo hosting

All hosting identities and routes are owned by `externalProviders/forgejoHostingAdapter.ts`, provider-neutral contracts by `src/shared/repositoryHostingContracts.ts`, routing by `repositoryHostingFacade.ts`, and publication by the existing integration toolbox. All actions are project-independent; bind/remove/verify additionally require the selected exact checkout. Credentials remain Settings/OS-store owned, and private Git uses the existing central runner's call-scoped authentication.

| Family | Published actions | Preconditions and result evidence | Focused proof |
| --- | --- | --- | --- |
| Status/list/metadata | provider_status, list_hosted_repositories, inspect_hosted_repository, create_hosted_repository, update_hosted_repository_settings | Configured namespace; paged list; empty create/idempotence; settings state and post-verification | Existing authentication/create/settings cases and new global MCP lifecycle |
| Branch/tag | list_hosted_branches/tags, inspect_hosted_branch/tag, create_hosted_branch/tag, delete_hosted_branch/tag | Exact source/expected commits; absent creation; protected branch denial; reinspection | Global MCP lifecycle |
| Contents | inspect_hosted_file, write_hosted_file_cas, delete_hosted_file_cas | Bounded UTF-8 individual paths; expected blob SHA or absent; server blob guard and post-verification | Global MCP lifecycle: create/update/delete/stale deny |
| PR/review | list/inspect/create/update/merge_pull_request, list_pull_request_reviews, create_pull_request_review | Application expected PR state; merge server head guard; explicit review commit; no automatic merge scheduling or source-branch deletion | Global MCP lifecycle: create/edit/close/reopen/review/merge/stale deny |
| Local remote/clone | bind_repository_remote, remove_repository_remote, clone_hosted_repository, verify_hosted_repository | Provider-owned branded destination, exact remote binding, trusted clone destination, exact advertised refs | Global MCP fixture and authenticated HTTP push/ref/prune/clone/removal |

The Forgejo HTTP request boundary bounds response size/depth/time, refuses redirects, sanitizes echoed credentials before projection, and never returns arbitrary provider objects. `capabilityEvidence: adapter-contract` identifies implemented adapter operations rather than live server tool discovery. `mutationConcurrency` distinguishes server blob/head checks from application expected-state guards. A timeout or unverifiable post-write result remains an error requiring reinspection; no automatic retry or assumed success is used.

API verification source: the [published Forgejo OpenAPI document](https://codeberg.org/swagger.v1.json), inspected on 2026-10-12 (`16.0.0-dev-785-465b60ef+gitea-1.22.0`), and [Forgejo API documentation](https://forgejo.org/docs/latest/user/api/usage/). Verification covered list, ref, content, PR and review routes/request fields, including `sha`, `old_ref_name`, `head_commit_id`, and `commit_id`. The schema is an interoperability reference; controlled fixtures do not establish live instance acceptance. The ignored downloaded schema is not a production dependency or committed fixture.

## RMCP04 confirmed gaps and closure

Every schema below is owned by `src/main/agentHarness/tools/toolRegistry.ts`, both JSON Schema and Zod, under the preserved `git_toolbox`. Existing families/actions above remain intact. The new qualification proof is `test/agent-harness/git-toolbox-qualification.test.cjs`; direct-transform proof extends `git-toolbox-extended-operations.test.cjs`.

| Confirmed gap before RMCP04 | Published action and bound | Permission | Implementation under `src/main/` | Focused proof |
| --- | --- | --- | --- | --- |
| Init depended on external author configuration | inspect_git_identity; configure_git_identity, only name/email and expected local config digest | read; write | `repository/gitExtendedOperations.ts` identity/config lock | Public MCP init → identity → file/stage → first commit in two unrelated repos |
| Clone required a hosting provider | clone_local_repository, selected authorized source, exact branch commit and missing trusted destination | write | `agentHarness/workspace/localGitRepositoryAccessService.ts` reuses clone | Actual public MCP clone and explicit selection requirement |
| Independent local remotes required fixture-only branding | bind_local_repository_remote, authorized independent source handle, add or expected-binding replace | write | Local access service + existing `repository/gitRemoteManagement.ts` | Public MCP adds local peer without workflow registration |
| Existing configured remote removal required hosting identity | remove_remote, exact existing binding | write | Existing remote config lock primitive | Stale removal denied, exact removal observed |
| Detached HEAD could not use old switch_branch | checkout_branch, expected state and target branch commit; clean-only | write | Extended operations | Actual detached → branch transition, stale target denial |
| Source/index restoration lacked explicit file/state guard | restore_file_cas, one ordinary source file ≤256 KiB; explicit index/worktree flags and exact state | write | Extended operations, central runner | Index-only preserves working bytes, then exact index-to-working restore |
| Local tag deletion lacked annotated-object precondition | inspect_tag_object; delete_tag_cas, update-ref exact old object ID | read; write | Extended operations | Annotated object differs from peeled commit; wrong deletion denied |
| Missing named remote rename/tracking configuration | rename_remote; configure_remote_tracking with exact binding; fetch refspec now part of binding | write | Extended operations + remote inspection | Configuration drift invalidates rename; named mapping and removal |
| Direct merge-commit transforms lacked mainline selection | begin_git_operation optional validated mainline for cherry-pick/revert only | write | Extended operations | Merge-parent bounds, actual mainline revert; direct rebase/cherry-pick/revert conflicts and abort/continue |
| Linked-worktree lock state was not exposed/mutable | list/inspect_worktree observed locked; set_local_worktree_lock, exact linked branch/HEAD/prior lock | read; write | Existing local access service | Lock denies removal, unlock allows clean removal |

Arbitrary `git config`, raw refspecs, blanket clean, hard reset and force removal remain unavailable. Exact-file restore, guarded soft/mixed reset, reflog/ref recovery, stash, and clean linked-worktree removal provide the ordinary bounded recovery paths. Worktree move and dangling-metadata prune remain intentionally unexposed: current authorization requires an existing verified checkout and refuses dangling records. Supporting those requires a separate recovery/relocation policy; they are not promised as ordinary checkout actions.

## GitHub hosted operation coverage

`externalProviders/githubHostingAdapter.ts` reuses `GithubProviderService` and the existing official gateway. `githubProviderAdapter.ts` maps exact pinned names, all used fields, and method enum values; absent/incomplete schemas stay unavailable. Identity is explicit and never inferred from origin. The original version/digest pin and recovery behavior remain.

| Family | Published integration_toolbox actions | Official path and proven bounded compatibility gap | Preconditions/proof |
| --- | --- | --- | --- |
| Connection/discovery | provider_status, connect_hosted_provider, disconnect_hosted_provider | Existing official runtime/OAuth/gateway; MCP-host lifetime | Exact schema/auth/generation fixtures, provider unavailable after disconnect |
| Repositories/settings | list/inspect/create_hosted_repository, update_hosted_repository_settings | Official search/create; named settings patch absent from pin | Explicit coordinates, empty creation, expected settings state, matching CLI account |
| Branch/tag | Existing hosted ref list/inspect/create/delete actions | Official list/get-tag/create-branch where source branch matches exact commit; named exact ref read/create/delete gaps | Exact source/expected commit, bounded names, reinspection |
| Files | inspect/write/delete_hosted_file_cas | Official resource read/create_or_update_file; named canonical metadata/absence and blob-CAS delete gaps | One bounded UTF-8 file, exact metadata/commit, server blob SHA, stale write denial |
| PR/reviews | Existing list/inspect/create/update/merge PR and list/create review | Official pinned tools, server expectedHeadSha, explicit commitID; textual acknowledgment then review reinspection | Expected PR state/HEAD, official result shapes, stale merge denial |
| Release/assets | list/inspect/create/update/delete_hosted_release, upload/delete_hosted_release_asset | Official list; named exact-ID read/writes/assets absent from pin | Expected release digest, bounded content, exact-ID binary upload, no replacement, projected observed metadata |
| Git/remote | Existing bind/remove/clone/verify hosting routes and Git toolbox | Existing branded destination and central runner; internal matching GitHub credential route | Exact github.com destination; child-only authorization, no credential argv/config/result |

`provider_status` separates `discovered-official-tools` evidence from compatibility methods marked `requires-matching-cli-account`; it does not advertise a missing official release-write tool as available. Compatibility is a set of individually named fixed methods, not a general REST/CLI client. Application guards do not claim transactional exclusion of external GitHub writers. Controlled schema/auth/provider fixtures and actual external MCP clients supply deterministic acceptance; live configured-account acceptance remains unperformed.

Primary API/source references and exact validation are in the [RMCP03 report](Implementer_Reports/IMPLEMENTER_REPORT_RMCP03.md).

## Intentionally unexposed surface and qualification

- Arbitrary Git/config/shell passthrough, raw provider endpoints/credentials, interactive editors, destructive blanket cleanup, esoteric plumbing, submodule/LFS orchestration, history filtering, bisect automation, background GC/repack and application release/build orchestration are not exposed by these additions.
- RMCP05 combines the preserved RMCP01/02 evidence with the new public MCP two-repository/bootstrap/clone/gap fixture, direct transform conflict proof, exact JSON/Zod/OAuth inventory, and controlled Forgejo/GitHub hosted fixtures. Its report records the final focused results and distinguishes controlled acceptance from live provider evidence.

No new dependency, Git stack, workflow Project registration, release engine, task catalog, product consumer qualification or named release publication is introduced.
