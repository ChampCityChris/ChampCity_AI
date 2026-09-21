# Development Repository Consolidation — 2026-09-21

## Operator direction and outcome

The Operator redirected the TVA10 task to consolidate all branches and worktrees into `dev`, keep only `dev` and `main`, and perform subsequent development directly on `dev`. The Operator also confirmed pushing the consolidated branch and removing other branches on `origin`. This explicit handoff authorized the Git operations below; no additional Work Card was inferred.

The approved primary repository root was verified with `Get-Location` and `git rev-parse --show-toplevel` as `<PROJECT_REPO>` before changes. The primary checkout is now on `dev`. Only that checkout remains registered. Only `dev` and `main` remain locally and on `origin`.

`main` was preserved at `37c60f11f03ef1664b08348166c4fc369e7f61c1`. No release, tag, rebase, reset, clean, or stash operation occurred.

## Preservation and commits

At inspection, every existing local branch tip was already an ancestor of local `dev` (`6bb206fbc798a280b6fcdae910899a5183b79af3`). The primary checkout alone had uncommitted work. The four additional worktrees had no tracked or ordinary untracked changes.

- `40c7e8a`: checkpointed the inspected pending WIR23 repair code, extended proof, repair documents, TVA10 card/initial report, and the Operator's dev-only policy in `AGENTS.md` on the previously active branch.
- `3f261bc9811084e72d7effeb7bef3c744f64d739`: merged that checkpoint into `dev`, resolved conflicts, and updated the TVA10 report to record the redirected task. Pushed successfully to `origin/dev` before branch retirement.
- Final documentation commit: pending when this report is committed; its hash is reported separately rather than inserted into its own commit.

The exact staged diffs were inspected before both commits, with bounded credential, concrete local-path, generated-artifact, and dependency-path scans. Both scans found zero findings across 23 staged files. Five whitespace findings in the supplied new Markdown cards were intentional two-space line breaks; code/test whitespace checks passed. No secret-bearing files or environment contents were read or committed.

Retired local branch tips, all verified as ancestors of consolidated `dev` before deletion:

| Branch | Preserved tip |
| --- | --- |
| `architect/hotfix21-review` | `401eb5d` |
| `codex/test-execution-architecture` | `31afc16` |
| `codex/work-intake-routing` | `cd6bc62` |
| `codex/work-intake-routing-finish` | `40c7e8a` |
| `hotfix/git-mcp-capability-completeness` | `e3b24fd` |
| `hotfix/mcp-session-admission-stream-liveness` | `d7a6de9` |
| `hotfix/planning-contracts-and-git-mcp` | `c17e97a` |
| `hotfix/project-planning-revision-flow` | `974aa1a` |
| `hotfix/release-tooling-mcp` | `fb120bf` |
| `hotfix/test-suite-governance-repair` | `835fbf8` |
| `hotfix/work-card-planning-revision-flow` | `e6d713c` |
| `repair/work-intake-routing-wir22` | `50f5059` |

Removed remote branches: `codex/test-execution-architecture`, `hotfix/git-mcp-capability-completeness`, `hotfix/planning-contracts-and-git-mcp`, and `hotfix/release-tooling-mcp`. Their fetched tips were also verified as ancestors of `dev`; remote deletion used one atomic push with an exact expected-tip lease for each branch. `origin/hotfix/release-tooling-mcp` pointed to `52f338e`, also preserved in `dev`.

## Merge resolutions and changed surfaces

The merge preserved existing validation catalog/profile/planner/executor infrastructure, current Git toolbox capabilities, and pending WIR route/lifecycle repairs.

- `src/main/planExecution/routedDevelopmentExecutionService.ts`: retained shared planning-context reuse and incorporated lifecycle checkpoints. Awaited asynchronous acceptance work inside its existing lock so the new checkpoint operation completes before lock release.
- `src/main/sourceControl/sourceControlService.ts`: retained current Git operations and expected-head commit checks while incorporating exact-path staging of eligible ignored lifecycle evidence.
- `test/characterization/desktop-development-lifecycle.test.cjs`: retained the current split test organization and incorporated pending direct/Phase lifecycle assertions.
- `test/characterization/routed-lifecycle-acceptance.test.cjs`: placed the incoming full-lifecycle assertions in the existing relocated acceptance test, retaining its metrics and current scenario selection. Did not restore the duplicate retired test to the old file.
- `src/main/planExecution/routedWorkflowService.ts`: retained the current `dev` prepare-then-read flow. The older pending change expected `preparedInstruction` on the preparation result, while the current API provides it on the runtime status. The current `dev` overloads already resolve the old union typing problem.
- `AGENTS.md`: recorded the Operator's primary-checkout, dev-only development policy and restriction to `dev`/`main` locally and on `origin`.
- `docs/implementation-bundles/test-execution-architecture/Implementer_Reports/TVA10_IMPLEMENTER_REPORT.md`: retained the initial inspection record and documented deferral under the new Operator direction.
- Created this consolidation report. Other pending source/test/document files were preserved by the checkpoint and merge; the exact inventory is available in `git show --stat 40c7e8a` and `git show --stat --first-parent 3f261bc`.

No runtime source was intentionally deleted, no dependency or catalog/profile classification was changed during conflict resolution, and no new execution capability was added. No new worktree, branch, permanent test file, migration, or generated source artifact was created.

## Worktree and ignored-file preservation

Removed the redundant worktrees identified by `hotfix20-session-liveness`, `hotfix21-git-mcp`, `test-execution-architecture`, and `wir-dev-integration` after verifying their exact roots, clean state, and preserved commit ancestry. The previous `dev` checkout was detached before switching the primary checkout to `dev`.

Before each removal, all ignored entries were moved into the corresponding subdirectory under `tmp/worktree-consolidation-2026-09-21/` in the primary checkout. This preserved `dist/`, dependency junctions, temporary data, the ignored HOTFIX20 Implementer Report, and the ignored HOTFIX21A Work Card. Junctions were moved as junctions; their targets were not recursively deleted. No ignored file was force-added to source control. Final removal used `git worktree remove` without force after verifying there were no remaining ordinary untracked or ignored files. Absolute move/removal targets and backup destinations were checked against their exact intended boundaries.

The backup is local ignored preservation data, not a source artifact or another registered checkout. Existing primary-checkout ignored content was preserved.

## Commands and evidence

Read-only inspection and static checks used restricted PowerShell. Git metadata writes, remote operations, and worktree moves/removal used the approved normal Windows lane.

| Command/action | Result |
| --- | --- |
| `git worktree list --porcelain`, `git branch -vv`, `git status --porcelain=v1`, `git stash list`, `git for-each-ref` | Exit 0; five initial checkouts, 14 local branches, no stash entries. |
| Per-worktree `git status --porcelain=v1 --untracked-files=all` and ignored inventory | Exit 0; additional checkouts clean. One ignored temporary-directory long-path warning occurred; subsequent inventories used `-c core.longpaths=true`. |
| `git fetch origin --prune` and `git ls-remote --heads origin` | Exit 0; six remote branches observed before retirement. |
| `git add -- <exact inspected paths>` and `git commit -m 'Preserve pending WIR repairs and require development on dev'` | Exit 0; checkpoint `40c7e8a`. |
| `git switch --detach` in the prior dev checkout; `git switch dev` in the primary checkout | Exit 0. |
| `git merge --no-ff --no-commit codex/work-intake-routing-finish` | Reported three content conflicts; resolved as described above. No unresolved index entries remained. |
| `npm run typecheck` | Initial exit 1, TS2322 at the older pending `preparedInstruction` access. After retaining the current dev API flow, exit 0. No test execution. |
| `node --check test/characterization/desktop-development-lifecycle.test.cjs` | Exit 0; syntax only. |
| `node --check test/characterization/routed-lifecycle-acceptance.test.cjs` | Exit 0; syntax only. |
| `git diff --check -- src test AGENTS.md` and equivalent staged check | Exit 0. |
| `rg -n '^(<<<<<<<|=======|>>>>>>>)' src test` | Exit 1, no unresolved conflict markers found. |
| `git commit -m 'Consolidate pending WIR repairs into dev with validation architecture'` | Exit 0; merge `3f261bc`. |
| `git merge-base --is-ancestor <ref> dev` for every local and fetched remote branch | All exit 0 before retirement. |
| `git push origin dev` | Exit 0; remote advanced from `1705f36` to `3f261bc`. |
| Bounded `Move-Item -LiteralPath` preservation and `git -c core.longpaths=true worktree remove <verified-root>` | Exit 0 for all four worktrees. |
| `git branch -d -- <merged-branch>` | Exit 0 for all 12 retired local branches. |
| `git push --atomic --force-with-lease=<exact-ref>:<observed-tip> origin :<exact-ref> ...` | Exit 0; all four retired remote branches deleted together. |
| `git branch --list`, `git ls-remote --heads origin`, `git worktree list`, `git status --short --branch` | Only `dev`/`main`, one primary checkout on `dev`, and clean synchronized status after consolidation. |

No tests, validation profiles/lanes, corpus audit, build, packaging, Electron smoke, or release qualification ran. Existing earlier reports remain historical evidence, not validation performed during this consolidation.

## Remaining work

Consolidation is not behavioral acceptance of the accumulated changes. The WIR repair documents retain their outstanding review/validation limitations; no unrelated defect repair was attempted. TVA10 remains unimplemented because the Operator redirected the task. Its prerequisite infrastructure is now present in the primary `dev` checkout. Resume that card directly on `dev` when directed, with its no-test-execution constraint intact.
