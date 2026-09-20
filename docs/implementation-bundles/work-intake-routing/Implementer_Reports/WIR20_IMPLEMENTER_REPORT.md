# WIR20 Implementer Report

## Baseline and scope

Work Card **WIR20 — Implement Machine-Owned Integration Candidate Lifecycle** passes focused validation. Checkpoint hash is pending the single harness commit containing this report and will be reported after verification.

- Verified selected repository and Git root as `<PROJECT_REPO>`; branch `codex/work-intake-routing`, no upstream, configured `origin`. No remote operation against the implementation repository.
- Starting checkpoint `22fed38725ef753b005fc2dd98883d686eccc2f4` (WIR19), exact fourteen-file set, one commit after WIR18, clean tree/index. Read the WIR19 dependency report and current source.
- Re-read the complete governing architecture, manifest, repository code/test boundary, validation lanes, current source-control mechanics, generic Plan completion and relevant capability-map entry. Architecture SHA-256 remains `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`.
- No future Work Card loaded, unrelated changes, dependencies, schema migrations, external integrations or implementation-branch integration.

## Attributable files

Created:

- `src/shared/integrationCandidateContracts.ts`
- `src/main/agentHarness/repository/integrationGit.ts`
- `src/main/planExecution/integrationCandidateService.ts`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR20_IMPLEMENTER_REPORT.md`

Modified:

- `src/shared/sourceControlContracts.ts`
- `src/main/sourceControl/sourceControlService.ts`
- `src/main/agentHarness/repository/gitMutations.ts`
- `test/agent-harness/git-mutation-boundary.test.cjs`

Deleted: none. Intentionally not created: Integration Repair implementation, agent Git commands, JSON sidecars, new release policy, global validation commands for arbitrary selected projects, forced target updates, incoming-branch deletion or unrelated workflow/UI changes.

## Implementation and acceptance evidence

- The main-process integration service requires a current complete generic Plan, verified Intake binding and clean incoming checkout. Trusted application adapters supply current durable Plan evidence and a nonempty bounded set of required validation checks; renderer/model inputs do not select shell commands. Plan completion and integration completion remain separate.
- Target selection uses the Intake base branch, with no hard-coded `dev`. Configured remotes are fetched; local and remote target ancestry is inspected. A remote-ahead target supplies the candidate baseline without first advancing the local target. Diverged local/remote target policy fails closed. Exact Intake base, merge base, incoming, local target and candidate target commits are retained.
- Application Source-Control wraps bounded Git primitives with operation receipts. A deterministic candidate branch and separate Git worktree are created from the exact current target. The incoming checkout stays selected and unchanged. Noninteractive merge disables rerere; conflicts are preserved without resolution or target advancement.
- Required checks run against the isolated candidate. Each check retains its identity, observed exit result and controlled summary. Empty check policy is refused; exceptions, nonzero results and source changes during validation fail closed. The candidate commit and validation results persist independently from target advancement.
- Target advancement rechecks current Plan/Intake identity, source/target refs, candidate commit, clean state and preservation of both histories. A compare-and-swap ref update advances only the unoccupied target branch. Failed or uncertain advancement retains the receipt and reports failure for inspection. Optional push uses the exact validated commit and ordinary non-forcing Git push, so a later branch change cannot silently substitute unvalidated source. Push failure remains separate from successful local integration.
- One canonical Markdown candidate receipt is retained inside repository-owned Git administration storage. No tracked working-tree dirt or JSON sidecar is introduced. Candidate checkout ownership and common Git directory are verified. Abort removes only its owned temporary worktree/branch, preserves incoming/target branches, retains evidence and supports repeated cleanup.
- This implementation uses a primary repository checkout with an ordinary contained `.git` directory. Linked checkouts fail visibly and require selecting their primary repository for integration; no writes escape the selected repository boundary. Targets checked out in another worktree cannot advance until released. This is a bounded source-control implementation constraint, not a new workflow authority.
- Seven disposable scenarios cover unchanged target; advanced, cleanly mergeable target; mechanical conflict; failing validation; validation that changes source; target changes after proof; and a fetched remote-ahead target followed by successful exact-commit synchronization. Final fixtures use `product-target`, proving target generalization. Failed validation also has a configured disposable remote and verifies it remains unchanged. Checks execute a real Node subprocess against candidate source. Stale Plan evidence blocks creation/advance; abort is repeated and source/target identity is verified.

## Validation

| Exact command | Lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Final source exit 0 |
| `npm run build` | Approved normal Windows | Final source exit 0 |
| `node --test --test-concurrency=1 --test-name-pattern='isolated integration candidates' test/agent-harness/git-mutation-boundary.test.cjs` | Approved normal Windows | Initial run: one passed, seven failed including parent; receipt round-trip omitted an optional undefined remote property. Corrected |
| `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs` | Approved normal Windows | Final exit 0; 30 passed, none failed/skipped (209.52 seconds). Earlier required run also passed 30; rerun covered final checkout ownership/failure-state guards and non-dev/remote-failure fixture extensions |
| `git diff --check` | Read-only restricted Windows | Exit 0 |

Intermediate static failure: an unsupported error-code literal was replaced with the existing bounded Git execution code. No new restricted child-process attempt; normal execution follows the earlier observed restricted `spawn EPERM`.

Test categories: existing Git boundary proof reused; one new permanent scenario family in that suite covers the previously absent isolated candidate lifecycle and post-merge validation/target-advancement boundary. No test consolidation, retirement or capability-map edits. Full regression remains WIR23. No Electron launch, visual acceptance, packaging or external-hosting integration claimed; remotes are local disposable bare repositories.

## Checkpoint and safety

Intended message: `WIR20: Implement Machine-Owned Integration Candidate Lifecycle`. Exactly the eight files above are attributable. Staging and checkpoint commit use the supplied harness; shell Git in the implementation repository is read-only. Fixture Git operations are authorized validation. No implementation-branch push, merge, rebase, tag, release or publication.

Exact eight-file staged diff reviewed. `git diff --cached --check` and bounded staged secret/local-path scan passed (exit 0, no findings). Harness `pre_commit_scan` succeeded; its eight branding PNG notices concern unchanged, unstaged baseline assets. No unrelated files, generated output, dependency state, credentials or concrete machine paths are staged. Candidate records contain relative identities, exact commits and controlled validation summaries; absolute runtime checkout paths remain main-process values.

## Next action

After final focused validation, safety review and the verified single checkpoint, read WIR21 and required dependency evidence. Integration Repair and its semantic handoff remain future-card scope. No manual acceptance is required by WIR20; the disposable fixtures supply its acceptance evidence.
