# WIR22-REPAIR03 Implementer Report

## Baseline and bounded correction

Repair Card: **WIR22-REPAIR03 — Connect Routed Work Items to Formal Work Card Planning and Build Review** passes required focused validation. Its single checkpoint hash is pending the harness commit containing this report and will be reported after verification.

Reverified `<PROJECT_REPO>` as the selected repository and Git top-level, branch `repair/work-intake-routing-wir22`, clean initial index/worktree, and exact starting checkpoint `0716594eebe82fb888617168bc97561cb8fdfc63`. The REPAIR02 checkpoint has the expected REPAIR01 parent and twelve attributable files. Configured remote remains `origin`, with no upstream or remote operation. Read the current card and REPAIR02 report; reinspected the binding, artifact scope, generic executor, Development adapter, Intake, Formal planning, report services, focused tests, and relevant capability-map entries. Current source confirms the phase-only lifecycle entry defect. No later card was opened.

The new routed Development service loads the current approved execution binding and verified scope, translates existing handoff/Formal/report evidence into `PlanExecutionInput`, and uses the generic executor projection for active/next selection, dependencies, and genuine Phase barriers. It does not persist a second progression state. Actions re-resolve evidence, compare the presented fingerprint, require the executor-selected eligible Work Item, and hold a shared per-repository/Intake action lock. Artifact fingerprints include current bytes, and source/identity checks reject mismatched or stale evidence.

Routed Intake handoffs use the approved Plan, execution binding, and declared candidate directly. The Formal Work Card definition now accepts an owning context resolver while retaining its established validation, revision, draft promotion, and decomposition guidance. Report addressing, reservation, readiness, and review use the verified scope through the existing report service. Approval retains the existing atomic Formal/report writer. Direct artifacts have no Phase identity; phased artifacts retain only their declared Phase.

No routed validation, Repair, close, Hub cutover, renderer integration, automatic implementation, product Git action, or completion is claimed. No legacy Phase Planning or Work Card Plan is manufactured. Existing Issue ownership remains unchanged. The blocked WIR22 report remains unchanged.

## Attributable files

Created:

- `src/main/planExecution/routedDevelopmentExecutionService.ts`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR03_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/workCardIntake/workCardIntakeService.ts`
- `src/main/workCardPlanning/workCardPlanningService.ts`
- `src/main/workCardBuilding/workCardBuildingReviewService.ts`
- `test/work-card-planning/work-card-planning-service.test.cjs`

Deleted: none. Intentionally not created: legacy planning artifacts, schema migrations, JSON sidecars, dependencies, separate draft/promotion machinery, or later-card lifecycle features.

## Acceptance and validation

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0 |
| `npm run build` | Approved normal Windows | Exit 0, including final rebuild |
| `node --test --test-concurrency=1 test/work-card-intake/work-card-intake-service.test.cjs test/work-card-planning/work-card-planning-service.test.cjs test/work-card-building/work-card-building-review-service.test.cjs test/work-card-loop/work-card-loop-state-service.test.cjs` | Approved normal Windows | Initial and final runs exit 0; each 46 passed, none failed/skipped |
| `node --test --test-concurrency=1 test/issue-resolution/issue-fix-card-service.test.cjs test/characterization/desktop-issue-lifecycle.test.cjs` | Approved normal Windows | Exit 0, 26 passed, none failed/skipped |
| `git diff --check` | Read-only restricted Windows | Exit 0 |

The normal Windows lane follows the previously recorded restricted child-process limitation. No restricted retry was attempted. After the initial passing run, final exact source checks were added and the required focused command was repeated against the final build.

Test categories: reuse the existing Intake, Formal planning, Build Review, and loop suites; extend the Formal planning suite with two previously uncovered production-service contracts for routed direct and phased entry. The direct proof covers selection, concurrency, stale action fingerprints, promotion, exact Phase-less lineage, report reservation/readiness/review, conflicting active Work Items, stale Plan rejection, and no Git mutation. The phased proof covers genuine membership, phase prerequisites, and wrong-lineage rejection before promotion. Existing decomposition, legacy lifecycle, report failure/atomicity, and Issue lifecycle tests are reused. No new test file, retirement, consolidation, or capability-map edits.

No full regression, packaging, external integration, launch smoke, or visual acceptance is claimed. Manual validation: none for this Repair Card.

## Git, safety, and next action

The exact six-file staged diff was inspected. `git diff --cached --check` and bounded staged secret/local-path/generated-artifact scans passed without findings. Harness `pre_commit_scan` succeeded with only eight unchanged, unstaged baseline branding PNG notices. This final report edit is re-staged and checked before committing. Only supplied harness staging/commit is used; shell Git is read-only. Intended single message: `WIR22-REPAIR03: Connect Routed Work Items to Formal Work Card Planning and Build Review`. Record the actual hash after checkpoint verification without amending this report solely to insert it.

No merge, push, tag, release, publication, integration, history rewrite, or Electron-to-service/browser refactor. No material architecture/product deviation identified. Open only WIR22-REPAIR04 after this repair passes and its checkpoint is verified.
