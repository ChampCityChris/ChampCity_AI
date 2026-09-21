# TVA04 Implementer Report

## Scope and repository

Work Card TVA04. Verified the approved repository/worktree Git root. Branch codex/test-execution-architecture from local dev at 05eef38; origin/dev was 45 commits behind at initialization. No fetch/push or source-checkout mutation. Operator-authorized branch/worktree creation only; commit/merge pending final staged review and safety scan.

## Implementation and classifications

Catalog schema 3 requires execution.scheduling and schedulingReason on every record. Vocabulary: parallel-safe, exclusive-process, exclusive-desktop, exclusive-performance, exclusive-packaging. Classification totals: {"exclusive-process":117,"exclusive-desktop":10,"parallel-safe":10,"exclusive-packaging":2,"exclusive-performance":3}. Missing/unknown classification fails closed. Decisions use actual dependencies and reviewed process/global-state behavior, not directory names. Unreviewed safety is conservatively exclusive-process. Explicitly reviewed safe files:

- `test/agent-harness/agent-harness-process-contract.test.cjs`
- `test/agent-harness/integration-repair-controller.test.cjs`
- `test/context-menu/local-renderer-context-menu.test.cjs`
- `test/documents/disposition-transaction.test.cjs`
- `test/documents/repository-binding-compatibility.test.cjs`
- `test/lifecycle/nested-lifecycle.test.cjs`
- `test/project-intake/post-submit-review-state.test.cjs`
- `test/project-intake/project-intake-corpus-status.test.cjs`
- `test/validation/capability-map.test.cjs`
- `test/work-card-planning/development-environment-contract.test.cjs`

Created scripts/validation/scheduler.cjs and child-cleanup.cjs. Modified catalog/schema, planner/executor/process runner, capability map and schema tests, validation-runner contracts, and synthetic validation fixture schema. This report is new. No files deleted, dependencies added, integration-policy changes, default npm command migration, production behavior changes, or generated committed outputs.

Planner partitions exact files into deterministic safety cohorts. Safe cohort concurrency defaults to 2; caller may choose 1–4. Exclusive cohorts are serial and await the entire preceding cohort. Results return in original catalog order independent of completion order. Every selected file executes or has explicit unavailable/failed evidence; no parallel-ineligible file is silently omitted. Runner exceptions become execution-failed while other admitted files are awaited.

Timeout terminates the owned process tree (Windows taskkill /T /F; process group on POSIX). A preload tracks subprocesses started by each test process and cleans known children at exit, including assertion failures. Every file receives a fresh owned TMP/TEMP/TMPDIR; the executor removes exactly that owned directory after completion and reports cleanup failure instead of a pass. Tests remain responsible for explicit resources outside their temporary boundary; no machine-wide cleanup occurs. This is trusted repository test isolation, not a sandbox for malicious code.

## Validation and measurements

Normal Windows lane, existing toolchain, no aggregate:

- node --test --test-concurrency=1 test/validation/capability-map.test.cjs test/validation/validation-runner.test.cjs: exit 0, 10/10, 5621.97 ms.
- Scheduler contract repeats the safe/exclusive schedule twice and checks timestamp overlap, cohort barriers and exact receipt order. Missing safety and concurrency 20 reject. Real assertion failure and timeout fixtures spawn a child; both verify that its PID is gone. The failure fixture also abandons a file in its assigned temporary root and verifies the root is removed.
- After adding per-file temporary ownership: node --test --test-name-pattern='bounded scheduler' test/validation/validation-runner.test.cjs, exit 0, 1/1, 3223.55 ms.
- A Node stdin driver selected exactly the ten reviewed safe files via the catalog and ran executePlan(planValidation({testPaths,concurrency})) for concurrency 1,2,1,2. Each run owned one fresh production build. All four passed, 59 tests per run, no flake. Build/test times in milliseconds: (10664/2804), (10828/1375), (10643/2563), (10762/1338). Mean file-execution time fell from 2683.5 ms to 1356.5 ms, about 49%. This supports conservative default 2, not maximum CPU concurrency. Per-file temporary isolation was subsequently covered by the focused scheduler contract; benchmark source assertions were unchanged.

No Desktop suite, packaging, performance qualification, full-supported profile, or repository-wide aggregate was run for benchmarking. Repeated exclusive proof used synthetic process/Desktop-class fixtures to test scheduler barriers without claiming actual Desktop acceptance.

## Safety and outcome

No secret or concrete local path added to durable artifacts. Benchmark output stays ignored under tmp. No Git stage/commit/merge yet, actual hash pending. Catalog-wide conservative classifications can be relaxed only with additional proof; no unsupported platform was reported as passed. No visual decision required. TVA04 is complete; next TVA05.
