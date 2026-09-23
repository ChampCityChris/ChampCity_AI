# WIR23-REPAIR04 Implementer Report

## Outcome and repository evidence

Repair Card **WIR23-REPAIR04 — Preserve Sequential Intake Target Baseline** is implemented. A Work Intake projection now supplies an application-owned suggested base from current branch inventory, and the renderer uses that suggestion as its initial branch/commit selection. A checked-out Work Intake branch therefore no longer becomes the next Intake's default merely because it is current.

- Verified the approved repository root and Git top-level as `<PROJECT_REPO>`.
- Card type and identifier: Repair Work Card `WIR23-REPAIR04`.
- Branch: `dev`, 12 commits ahead of `origin/dev` at the start of the pass.
- `origin/dev` is the configured tracking reference shown by branch status. No fetch or remote-freshness claim was made.
- The starting worktree contained unrelated modified and untracked Work Intake Routing, test-suite recovery, validation, and planning files. Those changes were preserved. The active Repair Card itself already had an Operator-authored uncommitted edit and was not modified by this pass.

## Service and renderer behavior

`getWorkIntakeProjection()` now returns `suggestedBase` as follows:

1. When the current checkout is not a known Work Intake branch, the current branch is suggested only when that exact branch and its current commit exist in branch inventory.
2. When the current checkout is a known Work Intake branch, the recorded `branchBinding.baseBranch` is resolved against current branch inventory. The returned commit is the target branch's current commit, never the Intake's historical `baseCommit`.
3. When that recorded target is absent, the suggestion is `null` and the projection appends a bounded blocked reason. No other branch is selected as a fallback.

The renderer initializes `baseBranch` and `baseCommit` only from `projection.suggestedBase`. A null suggestion produces empty required-base fields. Branch options still come from `projection.branches`, and an explicit user selection still copies the selected branch's current commit. No branch-name policy was added to the renderer.

The existing branch-establishment service remains the final authority. It was not changed: it continues to re-read the selected branch/commit immediately before branch creation and rejects a moved target with `STALE_SOURCE`.

## Attributable files

Created:

- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR04_IMPLEMENTER_REPORT.md`

Modified:

- `src/shared/workIntakeContracts.ts`
- `src/main/workIntake/workIntakeService.ts`
- `src/renderer/app/WorkIntakeWorkspace.tsx`
- `test/project-intake/project-intake-service.test.cjs`
- `test/project-intake/post-submit-review-state.test.cjs`

Deleted: none.

Intentionally not created or changed: new permanent tests, `workIntakeBranchService.ts`, source-control provider mechanics, route/planning/integration behavior, dependencies, schemas, migrations, compatibility paths, JSON sidecars, Git policy/governance, packaging, and application-generated durable output. TypeScript refreshed ignored `dist/` output solely so the card's direct Node test could execute the current production service code; it is not an attributable source artifact.

## Regression evidence

The existing production API test now proves:

- before any active Work Intake, the suggested base is the current integration target at its current commit;
- after the first Intake creates and checks out its work branch, the suggested branch remains the recorded integration target rather than the work branch;
- advancing the integration target changes the projection suggestion to the target's new current commit rather than the historical first-Intake base commit;
- moving the target again after projection causes submission with the projected commit to fail with `STALE_SOURCE` through the unchanged branch service;
- refreshing and submitting a second Intake uses the integration target, not the prior Work Intake branch;
- explicitly supplying the prior Work Intake branch and its exact current commit remains legal; and
- deleting an active Intake's recorded target yields a null suggestion plus a blocked reason rather than fallback behavior.

The existing renderer test supplies a current Work Intake branch that differs from `suggestedBase` and proves the integration-target option is initially selected. Its existing negative route-selection evidence remains intact.

## Validation record

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0; TypeScript completed with no diagnostics. |
| `.\\node_modules\\.bin\\tsc.cmd` | Restricted Windows, direct-test prerequisite | Exit 0; refreshed ignored `dist/` modules so the direct Node service test exercised the current TypeScript implementation. This was not an additional acceptance lane. |
| `node --test --test-reporter=tap --test-concurrency=1 test/project-intake/project-intake-service.test.cjs` | Restricted Windows | Exit 1 with the documented test-runner `spawn EPERM`; not counted as a source failure or pass. |
| Same service-test command | Approved normal Windows | Exit 0; 5 tests passed, 0 failed, 0 skipped, including the expanded sequential-base production API scenario. |
| `node --test --test-reporter=tap --test-concurrency=1 test/project-intake/post-submit-review-state.test.cjs` | Restricted Windows | Exit 1 with the documented test-runner `spawn EPERM`; not counted as a source failure or pass. |
| Same renderer/state-test command | Approved normal Windows | Exit 0; 5 tests passed, 0 failed, 0 skipped, including suggestion-over-current initial selection and preserved no-route-capture evidence. |
| `git diff --check -- src/shared/workIntakeContracts.ts src/main/workIntake/workIntakeService.ts src/renderer/app/WorkIntakeWorkspace.tsx test/project-intake/project-intake-service.test.cjs test/project-intake/post-submit-review-state.test.cjs` | Restricted Windows, scoped safety check | Exit 0. |
| Bounded concrete-local-path and credential-pattern scan over all six attributable files | Restricted Windows, scoped safety check | Exit 1 from `rg` with no matches, meaning no finding. |
| `git diff --check` | Restricted Windows, whole dirty-worktree diagnostic | Exit 1 only for pre-existing trailing whitespace in three Operator-owned Repair Card edits, including the active card; no attributable file was reported and those unrelated edits were preserved. |

Per the card, no full suite, full-supported-platform run, packaging, Desktop launch, performance/soak, visual acceptance, or external-integration validation was run.

## Git, safety, deviations, and residual risk

No Git mutation was authorized or performed in the product repository: no stage, commit, push, merge, rebase, tag, reset, clean, restore, stash, branch, or worktree operation. Commit hash for this repair is therefore not applicable. Git commands executed inside synthetic temporary test repositories were fixture behavior only.

No secrets, credentials, concrete local-machine paths, generated output, dependency state, archive runtime imports, or unrestricted renderer filesystem access were introduced. Durable report paths are repository-relative and the repository root is represented as `<PROJECT_REPO>`.

There was no card/repository mismatch and no implementation deviation. The two required Node commands needed the repository-standard normal Windows rerun after restricted execution produced `spawn EPERM`; both reruns passed. No remaining manual visual or experiential validation is required for this deterministic service/renderer initialization repair. Residual risk is limited to interactions outside the card's explicitly bounded focused suites.

## Return path

Return WIR23-REPAIR04 for Architect review. The recommended next task is the next Operator-approved Work Intake Routing card or review action; no adjacent routing, planning, integration, or Git-policy work should be inferred from this repair.
