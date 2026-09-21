# TVA03 Implementer Report

## Scope and repository

Work Card TVA03. Verified the approved repository's isolated worktree via Git root. Branch `codex/test-execution-architecture`, based on local `dev` at `05eef38`; origin/dev was 45 commits behind at initialization. No fetch/push. Operator-authorized branch/worktree creation only to date; no staging, commit, or merge yet. Commit hash pending final staged review. Original checkout preserved.

## Implementation and command graph

Created `scripts/validation/build.cjs`, `scripts/validation/process.cjs`, and `test/support/validation-fixture.cjs`. Modified planner/executor, validation-runner tests, capability map, `docs/dev/VALIDATION_COMMAND_LANES.md`, and `docs/development/DEVELOPMENT_GUIDE.md`. Created this report. No deleted files, dependencies, package/build-output/tsconfig changes, integration policy change, migration, or persistent freshness cache.

Previous caller graph could run typecheck -> build(tsc + Vite + assets) -> legacy test(build again). The plan now declares either one production-build step, one optional standalone typecheck for a source-only profile, or neither. A production build subsumes equivalent TypeScript checking. The executor owns the step, records its exit and timing, assigns a new run UUID, and attaches that UUID to every dependent built result. It never reuses a prior run's receipt. No repository-wide source hashing is added; source must remain stable during a run. Trusted injected build functions exist only as a direct infrastructure-test seam, not CLI arguments.

Build failure returns failed step evidence and blocked downstream entries without launching tests. The executor rechecks catalog build requirements, rejecting a forged built-only plan even if stale dist already exists. The existing `test:unit:built` remains explicitly advanced/internal with no freshness guarantee; docs prohibit presenting its result as canonical work-item/integration evidence. TVA07 owns public command migration, and TVA06 owns removal of the old integration-policy graph.

## Validation

Normal Windows execution lane, installed dependencies, no aggregate run:

- `node --test --test-concurrency=1 test/validation/capability-map.test.cjs test/validation/validation-runner.test.cjs`: exit 0, 9/9, 2559.83 ms. New primary contract uses two lanes, a real synthetic npm build, preexisting stale output, a build counter, and a failing build. Exactly one build produced the generation consumed by both tests; failure exit 9 left downstream side-effect markers unchanged. Forged no-build selection rejected.
- A Node stdin driver called `executePlan(planValidation({testPaths:['test/lifecycle/nested-lifecycle.test.cjs','test/validation/capability-map.test.cjs']}))` using the default registered build step, no injected callback. Exit 0, one `npm run build` (15715 ms), no standalone typecheck, 10/10 selected tests passed, total 16084 ms. Built fast results carry the observed same-run identity; source-only static results have no fabricated build requirement. Raw receipt is ignored under tmp.
- `node --check scripts/validation/process.cjs`, `executor.cjs`, and `build.cjs`: exit 0, static syntax lane.
- `git diff --check`: exit 0, read-only static review.

No packaging invocation because outputs/configuration are unchanged; the actual production TypeScript, Vite and branding build passed. No UI launch, external integration, whole-repository qualification or acceptance claim.

## Safety and outcome

Bounded subprocess output redacts the repository root and credential-shaped values. No secrets/local machine paths or generated outputs added to durable artifacts. Synthetic fixtures are disposable. No Git mutations since branch/worktree initialization. No Operator visual judgment required. Advanced raw built invocation remains deliberately outside canonical freshness guarantees until command migration. TVA03 is complete; next TVA04.
