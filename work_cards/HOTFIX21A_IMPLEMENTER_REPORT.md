# HOTFIX21A Implementer Report

## Scope and repository verification

- Type: Hotfix Work Card; identifier: HOTFIX21A (sequence 1 of 6).
- Verified the Operator-selected source repository and the isolated Git worktree's top-level identity before edits. Work runs in the approved `<PROJECT_REPO>` checkout on `hotfix/git-mcp-capability-completeness`.
- Starting commit: `2b07d4f` (local `dev`). Local `dev` was 35 commits ahead of the locally recorded `origin/dev`, with no remote-only commits. Remote metadata was inspected; no fetch, push, merge, tag, or release was performed.
- The original dirty WIR checkout was preserved. Existing installed dependencies were reused without changing manifests or the lockfile.
- Read the packet overview and HOTFIX21A only. Later cards remain unread pending this card's validation and commit.

## Implementation and public contracts

All actions use the registered workspace and existing `files.write` authorization. Exact schemas reject unknown parameters and missing required values.

| Action | Required parameters | Optional parameters |
| --- | --- | --- |
| `create_branch_from_ref` | `branchName`, `sourceRef` | None |
| `advance_branch_ref` | `branchName`, `sourceRef`, `expectedCurrentCommit` | None |
| `rename_branch` | `branchName`, `newBranchName` | None |
| `set_branch_upstream` | `branchName`, `remote`, `remoteBranch` | None |
| `unset_branch_upstream` | `branchName` | None |
| `delete_remote_branch` | `remote`, `remoteBranch`, `expectedRemoteCommit` | None |
| `push` | None | `remote`, `branch`, `expectedCommit`, `remoteBranch`, `setUpstream` |

All parameters are strings except the optional boolean `setUpstream`. Existing no-parameter and same-name push result shapes are retained. The previously internal `expectedCommit` safeguard is now reachable through the exact public push schema.

Shared implementation remains in `gitMutations.ts`, using `runBoundedGit`, and is exposed directly through `SourceControlService` with attributable receipts. No parallel application implementation was added.

- Create resolves a bounded commit-ish once and uses an all-zero expected old value with `update-ref --no-deref`, preventing overwrite atomically. It never switches, stages, cleans, or sets upstream.
- Advance resolves both commits, compares the expected exact current commit, verifies ancestry, refuses branches checked out in any worktree, and uses a compare-and-swap ref update.
- Rename rejects an existing destination, symbolic refs, and another worktree's checked-out branch. Git's non-force rename preserves dirty files and current-branch identity correctly.
- Upstream operations require an existing local branch; setting requires a configured remote and fetched remote-tracking branch.
- Push uses the resolved local commit and an explicit destination ref. Optional upstream binding follows successful publication. Ordinary pushes retain configured fetch/push destination separation.
- Remote deletion requires one matching fetch/push destination and a non-mirroring remote. Exact remote inspection is followed by an explicit expected-object lease and confirmed absence. Local branch refs and history are preserved.
- New remote process failures omit provider stderr and destination URLs from public results.

## Files and test ownership

Modified:

- `src/main/agentHarness/repository/gitMutations.ts`
- `src/main/agentHarness/tools/toolRegistry.ts`
- `src/main/sourceControl/sourceControlService.ts`
- `src/shared/sourceControlContracts.ts`
- `test/agent-harness/git-mutation-boundary.test.cjs`
- `test/agent-harness/reserved-toolbox-namespace.test.cjs`
- `test/agent-harness/agent-harness-core.test.cjs`
- `validation/capability-map.json`

Created: this report, `work_cards/HOTFIX21A_IMPLEMENTER_REPORT.md`.

Deleted: none. Intentionally not created: new permanent test files, dependencies, migrations, worktree API, arbitrary Git/shell API, release artifacts, or later-card implementations. Temporary editing helpers, validation output, and build products remain ignored and uncommitted.

Existing tests reused: branch switching, staging, commit, merge/integration, fast-forward, tag lifecycle, same-name push, workspace containment, and general OAuth/parameter gates.

Existing tests extended: exact namespace/schema publication, read-only denial of all six mutations, and application SourceControlService receipt coverage.

New cases within the existing Git boundary suite address two previously uncovered behaviors: independent ref mutation while preserving a dirty checkout and linked-worktree ownership; and mapped push/upstream/exact remote deletion, including a remote race and sanitized rejection evidence. Their ownership is added under `release-and-git-operations` in the locally inspected capability map. No tests were consolidated or retired. Historical inventory counts/durations were not represented as newly measured values.

## Validation

Execution lane: normal Windows, using installed Node 24.18.1 and npm 11.16.0. No restricted-lane `spawn EPERM` occurred.

| Command | Result |
| --- | --- |
| `npm run build` | Passed, exit 0; main/preload/shared compilation and renderer bundle |
| `node --test --test-concurrency=1 --test-name-pattern='independent branch refs\|mapped branch push\|application source control' test/agent-harness/git-mutation-boundary.test.cjs` | Passed initial targeted check, exit 0; 3 tests |
| `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs` | Passed, exit 0; 48 tests, zero failures |
| `node --test --test-concurrency=1 test/agent-harness/reserved-toolbox-namespace.test.cjs` | Passed, exit 0; 2 tests |
| `node --test --test-concurrency=1 test/agent-harness/agent-harness-core.test.cjs` | Passed, exit 0; 14 tests |
| `npm run typecheck` | Passed final check, exit 0 |
| `npm test` | Interrupted at the Operator's explicit direction to skip testing. No final exit/pass result; no failure was reported before interruption. Remaining full validation is skipped. |
| `git diff --check` | Passed, exit 0 |

Focused evidence uses the built production registry, real Git repositories, synthetic bare remotes, a linked-worktree fixture, and the application service. It proves byte preservation of the index alongside unchanged staged, unstaged, and untracked state. Remote race proof changes the remote after inspection from a pre-push fixture hook and requires the stale delete to fail.

Packaging, a separate manual Electron launch, and external hosted-provider validation are skipped because this card changes the deterministic Git API and names no packaging or visual acceptance. The full run exercised existing automated Electron checks before interruption. Synthetic remotes are local integration evidence, not a claim of live GitHub validation.

The Operator subsequently directed testing to be skipped. This instruction supersedes the remaining card validation commands and applies to subsequent cards. The partial full run is not claimed as a pass.

## Git, safety, and disposition

- Operator-directed Git actions: isolated checkout from local `dev`, dedicated packet branch, scoped staging and one HOTFIX21A commit after validation.
- Commit: pending at report write; the actual hash is reported after commit without amending this artifact solely to add that hash.
- Precommit exact staged-diff inspection and bounded secret/local-path/generated-artifact scan: passed with no findings. The report is included in the final scan before commit.
- No production schema migration, credential persistence, raw Git escape hatch, or unrelated checkout edits.
- External Git actors can still change checkout/configuration state between separate Git commands; ref compare-and-swap and remote leases reject stale object updates. No claim of global exclusion over external Git clients is made.
- No visual Operator acceptance is required for the bounded deterministic behavior. Packet Architect review and Operator disposition remain after all six cards.
- Next task: after this card is committed, read HOTFIX21B separately and execute its bounded scope.
