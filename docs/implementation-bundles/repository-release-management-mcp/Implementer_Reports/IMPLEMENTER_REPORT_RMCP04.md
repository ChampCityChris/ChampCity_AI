# RMCP04 Implementer Report

Date: 2026-10-12. Complete under controlled MCP qualification. Authorized bundle continuation. Operator-directed testing is limited to MCP contracts, provider boundaries and disposable Git fixtures.

## Repository and scope

Verified `<PROJECT_REPO>` is the primary `dev` checkout, HEAD `e5f564b4d001954e450abcbbd80d172acbe712cf`, with the existing GitHub origin and no upstream. Preserved RMCP01 and the RMCP02/03 working changes. Unrelated planning work remains untouched. No source-checkout Git mutation occurred.

## Audit and implementation

Updated `GIT_CAPABILITY_MATRIX.md` with source-backed ordinary-Git families, exact published schema owner, permissions, confirmed gaps, implementation paths, focused proof and intentional exclusions. The existing central runner, repository primitives, trusted-root authorization and per-session context remain the execution owners.

Added twelve actions:

- `inspect_git_identity` / `configure_git_identity`: effective identity inspection; only local user name/email mutation, expected bounded configuration digest and a Git config lock. Initialized repositories no longer need manual CLI identity setup before their first MCP commit.
- `clone_local_repository`: selected authorized repository, exact expected source branch commit, missing trusted destination, no local hardlinks and explicit selection of the returned checkout. Reuses the existing clone primitive.
- `bind_local_repository_remote`: add/replace a remote to an independent authorized opaque source checkout handle. No raw destination is accepted. `remove_remote` reuses the existing config-lock removal primitive with an exact current binding.
- `checkout_branch`: clean detached or attached checkout, exact observed checkout state and target branch commit.
- `restore_file_cas`: one ordinary bounded source file, exact checkout state, explicit source/index/worktree choices. Index-only restoration preserves working bytes; working restoration can use the current index.
- `inspect_tag_object` / `delete_tag_cas`: exact local tag object, including annotated tag objects; deletion uses native `update-ref` old-object CAS.
- `rename_remote` / `configure_remote_tracking`: bounded names and expected binding; tracking selects a named source/tracking branch instead of accepting a raw refspec.
- `set_local_worktree_lock`: linked checkout only, expected branch/HEAD/prior lock state, bounded reason, and observed lock state. Existing worktree inspection now projects lock state.

Extended `begin_git_operation` with optional validated mainline selection for direct cherry-pick/revert of a merge commit. Remote binding fingerprints now include fetch refspecs, so changes to tracking configuration invalidate prior mutation preconditions.

All mutations require `files.write`; inspections require `files.read`. JSON Schema, Zod, local/registered target variants and exact inventory are maintained by the existing registry. These changes introduce no Git stack, shell/config passthrough, approval token or workflow record.

Hard reset, blanket clean and forced worktree removal remain intentionally denied. Guarded soft/mixed reset, exact-file restoration, stash, reflog/ref recovery and clean linked-worktree removal provide bounded ordinary recovery. Worktree move/dangling-metadata prune are intentionally unexposed because the current authorization requires an existing verified checkout and refuses dangling metadata. No unrestricted plumbing, submodule/LFS orchestration, background maintenance, build engine or release pipeline was added.

## Files

Created: `test/agent-harness/git-toolbox-qualification.test.cjs` and this report. The new proof owns a distinct external-client, two-independent-repository bootstrap/clone/configuration boundary; the preserved RMCP02 lifecycle remains in its existing file.

Modified: `src/main/repository/gitExtendedOperations.ts`, `gitRemoteManagement.ts`; `src/main/agentHarness/workspace/localGitRepositoryAccessService.ts`; `src/main/agentHarness/tools/toolRegistry.ts`; existing `test/agent-harness/git-toolbox-extended-operations.test.cjs`, exact namespace proof, `validation/capability-map.json`, `docs/user/BACKGROUND_AGENT_AND_MCP.md`, and the capability matrix.

Deleted: none. No dependency, tracked generated artifact, consumer project, workflow integration or repository topology change was introduced.

## Validation

- `npm run typecheck` — restricted Windows, initially identified the missing optional `locked` property on LocalGitCheckoutSummary; the type now includes the observed state.
- `npm run build` — normal Windows, exit 0; production TypeScript/renderer/assets built. Existing renderer chunk-size advisory remains.
- Focused MCP command across Git qualification/transform, exact publication/OAuth, GitHub and Forgejo fixtures — normal Windows, exit 1: 12 selected cases, 11 passed, one failed, no skips/cancellations, 231,941 ms. Direct rebase/cherry-pick/revert conflict preservation, abort/continue and mainline bounds passed in 165,591 ms. All selected GitHub/Forgejo/contracts passed.
- The two-repository public-client fixture passed bootstrap, identity CAS, first commits, isolation, clone, detached checkout, index-only restoration, tag-object CAS and worktree lock/removal. Its next step attempted to reuse a stale selected context after deleting the linked checkout; the established policy correctly requires rediscovery. The fixture now rediscovers before reselection; no production authorization was weakened.
- `node --require ./scripts/validation/child-cleanup.cjs --test test/agent-harness/git-toolbox-qualification.test.cjs` — normal Windows, exit 0; corrected public-client case passed, zero failures/skips/cancellations, 142,976 ms. Remote add/tracking/rename/remove, explicit switch and expiry assertions also passed.
- Direct `loadCatalog()` metadata validation — initially detected coverage sorting across two owner identities. New proof now belongs to the existing release-and-git-operations capability and deterministic coverage ordering is corrected; subsequent static load exited 0. No test suite was selected by this metadata check.

No full/composed validation profile, live provider mutation, real credential lookup, packaging or visual acceptance was performed. Final attributable artifact safety and combined focused qualification are recorded at RMCP05 closure. Ordinary-Git gap closure is complete within the matrix's documented bounds; generic qualification continued as the final card of the authorized package.
