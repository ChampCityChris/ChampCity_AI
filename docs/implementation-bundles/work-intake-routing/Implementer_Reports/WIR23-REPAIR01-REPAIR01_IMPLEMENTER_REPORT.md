# WIR23-REPAIR01-REPAIR01 Implementer Report

## Outcome and repository evidence

Repair Work Card **WIR23-REPAIR01-REPAIR01 — Preserve Downstream Freshness When the Effective Route Is Retained** is implemented. An already-promoted Assessment or Plan now remains fresh when only the retained route-decision document revision and digest change. The complete route source revision, digest, source handoff, and stable route identity remain persisted. In-flight draft preparation and promotion checks remain strict.

- Verified the approved repository and Git top-level as `<PROJECT_REPO>`.
- Branch: `dev`, tracking `origin/dev` and starting 12 commits ahead.
- Starting and current committed head: `66c46367ca06dad3de48ea7292476c74b801fa69`.
- `origin` is configured. No fetch or remote-freshness claim was made.
- The starting tree contained unrelated modified and untracked Work Intake Routing, validation, and test-suite-recovery artifacts. Those user changes were preserved and were not attributed to this repair.

## Implemented freshness rule

`PlanningContext` now names `provenanceOnlySourcePaths`, which contains exactly the current route-decision path for route-scoped planning. `readArtifact()` applies a semantic-source helper only when evaluating an already-promoted artifact:

1. It excludes only the context-declared route provenance path from persisted/current source-revision equality.
2. It excludes only that same path from persisted/current digest equality and digest currency checks.
3. It still requires every remaining source revision and digest to match and to be readable/current, failing closed on missing or unreadable semantic sources.
4. It still treats historical artifacts as stale.

Artifact writing was not weakened or rewritten: `sourceRevisions`, `workflowData.sourceDigests`, `sourceHandoff`, `routeDecisionId`, and `routeId` still contain the full route provenance. `sameContext()`, `resolvePromotionContext()`, and their strict `sourcesCurrent()` checks are unchanged, so a route-history change during preparation still requires a fresh draft. Real route changes continue to use the existing identity and supersession behavior.

## Attributable files

Created:

- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR01-REPAIR01_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/workPlanning/workPlanningKernel.ts`
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`
- `test/issue-resolution/issue-architect-planning-service.test.cjs`

Deleted: none.

Intentionally not created or changed: route-decision service semantics, Issue persistence/services, shared schemas/contracts, integrations, migrations, compatibility artifacts, dependencies, validation catalog/metadata, new permanent test files, Research behavior, sequential-Intake behavior, packaging, or committed generated output.

## Regression evidence

- The existing Feature planning owner now captures complete promoted Assessment and Plan bytes, recommends a distinct route from the current Plan, overrides back to `feature-change`, and proves the effective selection ID/route are retained, the route document revision advances, no supersession is added, both artifacts remain non-stale, and both files remain byte-identical.
- The existing routed Issue owner now captures the canonical handoff bytes, recommends a distinct route from that handoff, overrides back to `issue-resolution`, and proves the effective selection ID/route, Issue ID, handoff path, bytes, and non-historical participation remain intact.
- The existing real-route supersession owner passes unchanged, confirming that a genuine route change still supersedes explicit downstream lineage.

## Validation record

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0; TypeScript check passed. |
| `npm run build` | Restricted Windows setup | Exit 1 with the documented Vite/esbuild `spawn EPERM` after TypeScript emission; not counted as a source failure or pass. |
| `npm run build` | Approved normal Windows setup | Exit 0; TypeScript, Vite production bundle, and branding asset copy completed, refreshing the `dist` modules used by focused tests. |
| `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="Feature planning requires baseline delta" test/architect-outputs/architect-output-prompt-contracts.test.cjs` | Restricted Windows | Exit 1 with the documented Node test-runner `spawn EPERM`; rerun in the normal Windows lane. |
| Same exact Feature command | Approved normal Windows | Exit 0; 1 selected test passed, 0 failed/skipped. Retained-route Assessment and Plan remained current and byte-identical. |
| `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="Operator route decisions preserve authority" test/architect-outputs/architect-output-workspace-repair.test.cjs` | Restricted Windows | Exit 1 with the documented Node test-runner `spawn EPERM`; rerun in the normal Windows lane. |
| Same exact route-decision command | Approved normal Windows | Exit 0; 1 selected test passed, 0 failed/skipped. Real-route supersession remains intact. |
| `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="routed defect preserves Intake and branch" test/issue-resolution/issue-architect-planning-service.test.cjs` | Restricted Windows | Exit 1 with the documented Node test-runner `spawn EPERM`; rerun in the normal Windows lane. |
| Same exact routed Issue command | Approved normal Windows | Exit 0; 1 selected test passed, 0 failed/skipped. Retained-route Issue identity and handoff remained current. |

The four card-mandated commands all passed in their applicable final lanes. The extra build was test setup because the named Node tests load compiled `dist` modules while the mandated typecheck is no-emit. No full suite, full-supported-platform, packaging, performance/soak, Electron launch smoke, visual acceptance, or external-integration check was run.

## Git, safety, deviations, and residual risk

No Git mutation was authorized or performed: no stage, commit, push, merge, rebase, tag, reset, clean, restore, stash, branch, or worktree operation. A repair commit hash is therefore not applicable.

No secrets, credentials, concrete local-machine paths, generated output, dependency state, archive runtime imports, or unrestricted filesystem access were introduced. The final scoped diff and safety scan found no attributable issue. A repository-wide `git diff --check` also surfaced trailing whitespace only in pre-existing user-modified Repair Cards; those unrelated files were left untouched.

No card/repository mismatch or production-scope expansion occurred. No manual product validation remains for this deterministic freshness repair. Residual risk is limited to interactions outside the explicitly prohibited full-suite scope; all three card-owned behavioral surfaces and typechecking passed.

## Return path

Return WIR23-REPAIR01-REPAIR01 for Architect review.
