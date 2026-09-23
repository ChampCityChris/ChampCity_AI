# WIR23-REPAIR03C-REPAIR05 Implementer Report

## Outcome and repository evidence

Test Architecture Repair Work Card `WIR23-REPAIR03C-REPAIR05` is complete.

- Verified the approved repository root and Git top-level as `<PROJECT_REPO>`.
- Branch: `dev`; `origin` is configured. No fetch or remote-freshness claim was made.
- The starting worktree contained unrelated and predecessor-card changes. They were preserved.
- No production `src/**` change is attributable to this card. Production changes present in the final worktree belong to the preceding ordered REPAIR04 pass.

## Semantic owner and retained assertions

`test/characterization/routed-research-integration-focus.test.cjs` now installs `installSemanticSourceFixture(t, { allowCheckpointChain: true })`, the same semantic SourceControl seam used by the Plan sentinel. Telemetry is installed before loading the Research fixture, SourceControl seam, routed integration service, or child-process-capturing helper modules.

The owner retains explicit proof that:

- approved no-Plan Research projects `completionKind: research`;
- query is read-only before integration and does not advance either Work Intake or target refs;
- an incorrect completion fingerprint is rejected before checkpoint or candidate creation;
- the Research lifecycle checkpoint is committed before the first candidate is constructed;
- no Plan, Work Item/Phase tree, or routed-development binding exists;
- changed completion sees the active retained candidate;
- newer terminal history does not hide that active candidate;
- explicit abort restores eligibility and preserves the target;
- successful shared integration reaches `integration-complete` for the exact current Assessment revision/fingerprint;
- stale aborted history does not block changed completion;
- stale integrated history does not block later changed completion.

Generic assertions for repository top-level identity, full SourceControl receipt-stack population, worktree common-directory ownership, generic merge-base computation, branch-ref advancement implementation, and per-commit message retrieval are not repeated here. Their dedicated generic owners remain unchanged.

The scenario uses three real candidate checkouts: exact validation-failure/abort, active retained state, and final successful integration. The newer terminal-history state uses one schema-valid deterministic aborted candidate receipt with a later ordering timestamp, avoiding a fourth mechanically identical SourceControl candidate journey.

The semantic fixture performs the real bounded Research lifecycle checkpoint staging, diff, commit, branch-head refresh, candidate checkout/merge/abort/advance mechanics needed by orchestration. Windows long-path behavior is enabled on its Git seam. Final telemetry observed 0 production `runBoundedGit()` calls, 106 fixture-shell Git calls, 3 candidate checkouts, and no npm processes; unlike the predecessor report, fixture Git is observable rather than incorrectly reported as zero.

## Attributable files

Modified:

- `test/characterization/routed-research-integration-focus.test.cjs`
- `test/support/research-integration-scenarios.cjs`
- `test/support/integration-semantics.cjs`
- `validation/capability-map.json`

Created:

- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR03C-REPAIR05_IMPLEMENTER_REPORT.md`

Deleted: none. Intentionally not changed: production behavior, dependencies, migrations, validation budgets, generic integration owners, performance/soak classification, or archive material.

## Validation record

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0. |
| `node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=1 --test-reporter=tap test/characterization/routed-integration-focus.test.cjs` | Approved normal Windows | Exit 0; 3/3 passed in 17.738 seconds; 2 candidate checkouts. Plan `<60s` acceptance passed. |
| `node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=1 --test-reporter=tap test/characterization/routed-research-integration-focus.test.cjs` | Approved normal Windows | Two fixture-correction diagnostics first exposed missing checkpoint SourceControl methods and Windows long-path handling. Final exit 0; 1/1 passed in 7.823 seconds; 106 fixture Git calls and 3 checkouts. Research `<60s` target passed. |
| `node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=1 --test-reporter=tap test/project-planning/project-planning-service.test.cjs` | Approved normal Windows | Exit 0; 28/28 passed in 51.745 seconds, including durable no-Plan Research closure. |
| `node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=1 --test-reporter=tap test/agent-harness/source-checkpoint-boundary.test.cjs` | Approved normal Windows | Exit 0; 2/2 passed in 63.532 seconds, including the focused Research lifecycle checkpoint owner. |
| `node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=1 --test-reporter=tap test/validation/capability-map.test.cjs` | Approved normal Windows | Final exit 0; 5/5 passed in 0.109 seconds. |

The capability map retains the existing primary Research behavior ownership and records the measured 7.823-second Research owner, 17.738-second Plan owner, and 63.532-second checkpoint owner. The former 560.985-second ordinary-owner blocker and its raised-runtime wording were removed; no budget was raised.

## Git, security, and remaining validation

No product-repository Git mutation was authorized or performed. Git mutations exercised by tests were confined to disposable repositories. No secrets, credentials, concrete local-machine paths, generated output, dependency state, or unrestricted filesystem access were introduced. The actual commit hash is not applicable because no commit was directed.

No Operator manual validation remains for this non-visual test-architecture repair. Full release qualification, packaging, Desktop launch, and external integration validation were outside scope.
