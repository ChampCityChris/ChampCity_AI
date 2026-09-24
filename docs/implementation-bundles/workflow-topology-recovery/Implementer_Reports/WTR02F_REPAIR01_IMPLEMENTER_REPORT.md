# WTR02F Repair01 Implementer Report

## Scope and repository

- Card: `WTR02F_REPAIR01_block_ready_source_drift.md` (Repair Card).
- Approved repository root was verified from the active repository context before edits.
- Starting HEAD: `23f677975e611ac4f7c57a76179a33dfc480593f` on `dev`. The card's recorded checkpoint `a70de62181425e1548ce85dfc2afd8f41423365c` exists and is an ancestor of starting HEAD.
- Initial working tree was clean. `dev` was 87 commits ahead of `origin/dev`; no remote operation was performed.
- Exact files changed: `src/main/sourceControl/workflowSourceMaterializationService.ts`, `test/source-control/workflow-source-materialization.test.cjs`, and this report.
- Existing focused test file was extended with two durable ready-drift proofs; no new test file or capability-map semantic change was made. Existing test counts are derived from test receipts and are not separately maintained in the capability map.

## Implementation and evidence

- Ready SourceBinding identity conflicts now transition to `blocked` using the latest exact record version and `SOURCE_MATERIALIZATION_STATE_MISMATCH`, then surface the original error. The update changes only preparation state and failure code, preserving semantic references. If the state update races, the primary materialization error remains visible.
- A ready binding with a missing checkout now fails before checkout-directory creation or `git worktree add`; the existing physical-validation failure path blocks it with `REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED`. Incomplete `unprepared`, `preparing`, and `blocked` preparation retains its recovery behavior. Idempotent Agent Harness checkout registration confirmation remains allowed.
- The permanent missing-checkout test removes the synthetic ready worktree using Git worktree mechanics, verifies the path stays absent after retry, then reloads Project State and verifies `blocked` plus `REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED`.
- The permanent semantic-drift test changes only the synthetic Project State binding's checkout ID, verifies retry fails before another provider registration or alternate source creation, then reloads Project State and verifies `blocked` plus `SOURCE_MATERIALIZATION_STATE_MISMATCH`.
- The exact-baseline proof now records R1, captures the SourceBaseline, commits R2 directly on `dev`, asserts `R2 !== R1` and `dev === R2` before materialization, and verifies Workflow SourceLine and checkout remain at R1 while `dev` remains at R2 after materialization.
- No checkpoint/integration ownership, Source Graph, Work Intake capture, legacy WorkIntakeBranchService, or Project topology behavior was changed. No WTR02G/H behavior was introduced.

## Validation

- `npm run build` — first restricted-lane attempt returned the documented `spawn EPERM` while starting Vite/esbuild; one rerun in the normal Windows lane passed (TypeScript and Vite build). Existing renderer chunk-size advisory was emitted.
- `node --test test/source-control/workflow-source-materialization.test.cjs` — restricted worker spawn returned `spawn EPERM`; normal Windows rerun passed: 5 tests, 5 pass, 0 fail.
- `node --test test/project-state/source-semantic-references.test.cjs` — restricted worker spawn returned `spawn EPERM`; normal Windows rerun passed: 8 tests, 8 pass, 0 fail.
- `node --test test/agent-harness/source-control-service-boundary.test.cjs` — restricted worker spawn returned `spawn EPERM`; normal Windows rerun passed: 2 tests, 2 pass, 0 fail.
- `npm run validate:plan -- --profile work-item --changes tmp/repair01-changes.json` — passed preview for the exact three-path manifest; selected static/build, fast, and affected capability proof including the materialization suite and deferred transition suites.
- `npm run test:affected -- --changes tmp/repair01-changes.json` — normal Windows lane; run ID `29b374ec-ce47-4c20-af1a-9eb915c3b87f`; exit 1 after 243441 ms. Production build passed. The new WTR02F materialization suite passed. Three later-owned fixtures failed and are classified as deferred under the Repair Card:
  - `test/source-control/source-graph-projection.test.cjs` — transitional Source Graph Workflow identity, owned by WTR02H.
  - `test/source-control/source-lifecycle-package.test.cjs` and `test/source-control/structured-integration.test.cjs` — legacy readiness/integration fixture assumptions across the later checkpoint/integration and physical topology transition (WTR02G/WTR03C). Their failures are outside this repair's materialization behavior and no such fixtures or production areas were changed.
- `git diff --check` — passed before staging; passed against the staged diff before commit.

## Git, security, and remaining work

- Card-authorized Git scope: one attributable checkpoint commit on `dev`, subject `WTR02F Repair01 block ready source drift`. No push, merge, rebase, reset, cleanup, or release action is in scope.
- Temporary exact-path validation manifest: `tmp/repair01-changes.json`; it is caller input only and will not be committed.
- Security/local-path review: changes contain no secrets, credentials, concrete machine paths, generated output, or production imports from tests. Synthetic fixture paths remain runtime-temporary.
- Remaining Operator manual validation: none required by this repair's deterministic acceptance criteria. The affected-profile deferred failures should return to their WTR02G/H/WTR03C owners.
- Recommended next task: resume the workflow-topology recovery queue at its next explicitly authorized card; do not begin WTR02G under this Repair Card.
- Checkpoint hash: pending; this report will not be amended to add its own commit hash.
