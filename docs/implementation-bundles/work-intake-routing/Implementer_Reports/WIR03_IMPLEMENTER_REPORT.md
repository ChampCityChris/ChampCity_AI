# WIR03 Implementer Report

## Outcome and baseline

Work Card **WIR03 — Bind Every Work Intake to a Dedicated Git Branch** passes focused acceptance. Checkpoint hash is pending the single harness commit containing this report; the execution response records it without amending history.

- Verified the working directory and Git top-level as approved repository `ChampCity_AI` (`<PROJECT_REPO>`).
- Branch: `codex/work-intake-routing`, no upstream; `origin` configured, no bundle remote synchronization.
- Starting head: `fde8c493e641dc8dce358b990a2c01a0da6fbce7`, the verified single WIR02 checkpoint with its exact four-file set. Working tree/index were clean.
- Verified WIR01 checkpoint `361774c6e4c1d8aaf83f902a69c02ac04b5f54a3` and both dependency reports. Required routing and source-control contracts exist and prior focused checks passed.
- Revisited the governing branch-isolation architecture; its SHA-256 remains `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`. No material contradiction or dependency mismatch.
- Inspected current Project Intake writes, shared Workspace/Project Intake contracts, WIR02 source control, relevant tests, and their capability-map coverage. Pre-existing baseline and WC02 material were preserved.

## Files and implementation

Created:

- `src/shared/workIntakeBranchContracts.ts`
- `src/main/workIntake/workIntakeBranchService.ts`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR03_IMPLEMENTER_REPORT.md`

Modified: `test/agent-harness/git-mutation-boundary.test.cjs`.

Deleted: none.

The shared binding records Intake/repository identity, exact base branch/commit, dedicated work branch/current head, and optional configured remote/sync state. Branch names combine a bounded readable Intake identifier with an identity digest, independent of route selection. An existing name is rejected without reuse or overwrite.

The application service uses WIR02 to require a clean committed Git baseline, validate the explicitly selected base commit, select that base, establish the dedicated branch, and verify its identity before calling the supplied main-process persistence operation. Verification also checks after persistence. The entry point serializes Intake establishment within one canonical checkout and has no Project-global current-branch record.

Later lifecycle verification rejects another repository identity, wrong branch, stale recorded head, or a head not descended from the exact base. No hard-coded integration branch is used. Persistence receives a copy of the binding.

Failed persistence restores the previous branch and removes the newly created branch only when source remains clean and unchanged and bounded Git permits deletion. Partial artifacts or unexpected source changes are retained with `inspection-required`, preserving prior branch/source evidence instead of discarding changes. No success is returned after branch or persistence failure.

Intentionally not created/changed: canonical Work Intake persistence/UI (WIR04), route selection, Project Intake runtime behavior, automatic commit/push, worktrees, provider integration, migrations, dependencies, capability-map metadata, or the service/browser refactor.

## Validation and acceptance

| Exact command | Lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0 |
| `npm run build` | Approved normal Windows | Exit 0 |
| `node --test --test-concurrency=1 test/project-intake/project-intake-service.test.cjs test/agent-harness/git-mutation-boundary.test.cjs` | Approved normal Windows | Exit 0; 24 passed, 0 failed, 0 skipped |
| `git diff --check` | Read-only restricted Windows | Exit 0 |

The normal process-heavy lane follows the WIR01 sandbox `spawn EPERM` evidence. No repeated restricted failure was attempted.

The new lifecycle proof uses a disposable repository with a selected integration branch different from the initial checkout and proves exact-commit creation before persistence, route-independent names, collision rejection, dirty/non-Git rejection without persistence, stale base/head and wrong branch/repository rejection, clean failure restoration, and partial-write preservation. Existing source-control/MCP and Project Intake proof remains green. No real remote, launch smoke, or visual acceptance is claimed. Full regression belongs to WIR23; packaging was skipped as out of scope.

Test categories: existing Project Intake and Git behavior reused unchanged; one new permanent case added to the existing Git suite, `Work Intake branch binding selects an exact base and fails closed before persistence`. Its distinct coverage gap is the Intake branch-before-persistence boundary, binding freshness, and failure recovery, which WIR02's transport/service tests cannot prove. No tests consolidated or retired; no unrelated coverage-map work.

## Checkpoint and safety

Intended message: `WIR03: Bind Every Work Intake to a Dedicated Git Branch`.

Attributable checkpoint set: exactly the four files listed above. Harness `git_toolbox` owns staging/commit; shell Git is read-only. No merge, push, tag, release, publication, history rewrite, or integration of this bundle.

The bounded authored-source secret/local-path scan passed with no findings. It read only the three code/test paths listed above and checked private-key headers, credential-shaped literals, and concrete user-home path patterns; no matching content was printed. Durable artifact paths remain relative or use `<PROJECT_REPO>`. Generated output/dependencies remain ignored. The exact staged diff was inspected and `git diff --cached --check` passed. The successful harness scan reported only eight existing branding PNGs, all unchanged and unstaged. No finding applies to this checkpoint; the final report is re-inspected after staging.

## Remaining work

No WIR03 blocker or Operator manual validation remains. External processes can still change a checkout; unexpected state is rejected or retained for inspection, never silently repaired by discarding source. The persistence callback is a main-process boundary for WIR04, not a new renderer filesystem interface.

After verifying the single WIR03 checkpoint and clean state, read WIR04 and required dependency reports. No service/browser refactor work is authorized by this completion.
