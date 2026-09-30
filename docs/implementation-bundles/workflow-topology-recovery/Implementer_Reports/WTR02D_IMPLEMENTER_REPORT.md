# WTR02D Implementer Report

## Identity and repository state

- Card: WTR02D — Route MCP Git Operations Through Explicit RepositoryCheckout Targets.
- Verified repository root from the active workspace context; working branch is `dev`.
- Starting SHA: `8cd12b8b7e129358b8b073aacac6d2edb55f2f89`.
- Starting remote status: `dev` was 79 commits ahead of `origin/dev`; no push was performed.
- Checkpoint commit: pending at report creation; the attributable staged diff and safety scan have since passed.

## Implementation

The local registered-workspace entry now optionally stores `repositoryCheckouts?: RepositoryCheckout[]`. Existing entries without this field remain valid. Checkout descriptors are validated by the WTR02C contract, contain only semantic identities and a canonical Project-relative path, are persisted sorted by `repositoryCheckoutId`, and reject duplicate IDs/path registrations. Checkout registration is rejected for legacy managed-worktree workspace entries. Exact semantic re-registration is idempotent; changed reuse of an ID returns `WORKSPACE_REGISTRY_CONFLICT`.

`AgentHarnessService.registerRepositoryCheckout(workspaceId, checkout)` and `unregisterRepositoryCheckout(workspaceId, repositoryCheckoutId)` delegate to the registry. Registration derives the root from the Project root and the role (`Main`, `Dev`, or the exact Workflow UUID location), verifies that the path exists without redirects, and requires `git rev-parse --show-toplevel` to equal that root. Registration performs no Git mutation. Unregistration only removes the routing record.

The public summary is `AgentHarnessRegisteredRepositoryCheckoutSummary`: checkout/repository/source-line IDs, role, Project-relative path, optional Workflow ID, availability, and bounded validation error. It contains no absolute root or Git metadata path. Missing/moved checkout registrations remain listable as unavailable.

Each actual Git action now receives an automatically required `params.repositoryCheckoutId` from the centralized `gitInspectionAction` and `gitMutationAction` helpers. The dispatcher validates action params, resolves the checkout beneath the Project workspace, and passes a context whose root is the validated checkout root to existing Git handlers. It does not use Project-root `gitBacked` as Git authorization or as a fallback. `list_repository_checkouts` is a read action exempt from target selection. `repo_toolbox` dispatch remains Project-root-relative.

Checkout resolution revalidates the Project registration, descriptor, role-derived path and redirect safety, directory existence, and exact Git working-tree root on each use. Unknown IDs return `WORKSPACE_ACCESS_DENIED`; unavailable/stale checkouts return `GIT_CAPABILITY_UNAVAILABLE` with no local path diagnostics. Missing checkout IDs fail schema/runtime validation as `INVALID_INPUT`.

The MCP workspace prompt now explains that `workspaceId` identifies the Project container, `repo_toolbox` operates there, and Git actions require an exact discovered `repositoryCheckoutId`.

## Evidence

- The non-Git Project proof reads/writes Project files while Git status and staging operate on the registered `Dev` checkout. The Project root remains non-Git, persisted/public checkout descriptors contain no absolute checkout path, and unregistering leaves the staged Git state and checkout files intact.
- The Git-backed Project proof fails without an explicit target, rejects an invented checkout ID, succeeds against an explicitly registered `Dev`, and fails closed when that registered checkout is moved. Discovery continues to report the stale registration as unavailable.
- Public contract tests cover checkout discovery, required IDs for inspection/mutation, path-argument rejection, top-level `workspaceId`, and read-only scope filtering.
- Git behavior fixtures now use a non-Git Project container with a real `Dev` checkout; the unrelated `createBoundWorkspace()` fixture remains unchanged.

## Files changed

- `src/shared/workspaceContracts.ts`
- `src/main/agentHarness/workspace/workspaceAccess.ts`
- `src/main/agentHarness/workspace/registeredWorkspaceRegistry.ts`
- `src/main/agentHarness/runtime/agentHarnessService.ts`
- `src/main/agentHarness/tools/toolRegistry.ts`
- `src/main/integrations/mcpWorkspacePromptContract.ts`
- `test/agent-harness/registered-workspace-registry.test.cjs`
- `test/agent-harness/agent-harness-core.test.cjs`
- `test/agent-harness/repository-io-hardening.test.cjs`
- `test/agent-harness/reserved-toolbox-namespace.test.cjs`
- `test/agent-harness/git-toolbox-local-operations.test.cjs`
- `test/agent-harness/git-toolbox-remote-operations.test.cjs`
- `test/agent-harness/git-toolbox-tag-operations.test.cjs`
- `test/agent-harness/agent-harness-runtime.test.cjs`
- `test/agent-harness/agent-harness-process-boundary.test.cjs`
- `test/agent-harness/fixtures/electron-agent-harness-process-boundary.cjs`
- `test/support/git-mutation-fixtures.cjs`
- `validation/capability-map.json` (exact ownership patterns for the two newly classified changed paths)
- `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02D_IMPLEMENTER_REPORT.md`

No files were intentionally deleted. No arbitrary path-registration MCP action was added.

## Validation

- `npm run build` — normal Windows lane; passed. The first restricted attempt reached TypeScript and then Vite failed once with `spawn EPERM`; per lane guidance it was not retried in the restricted lane.
- `node --test test/agent-harness/registered-workspace-registry.test.cjs` — normal Windows lane; 7 passed, 0 failed, rerun after the final routing assertions.
- `node --test test/agent-harness/agent-harness-core.test.cjs test/agent-harness/reserved-toolbox-namespace.test.cjs` — normal Windows lane; 16 passed, 0 failed.
- `node --test test/agent-harness/git-toolbox-local-operations.test.cjs test/agent-harness/git-toolbox-remote-operations.test.cjs test/agent-harness/git-toolbox-tag-operations.test.cjs` — normal Windows lane; 20 passed, 0 failed using the corrected non-Git Project plus `Dev` fixture.
- `node --test test/agent-harness/agent-harness-runtime.test.cjs` — normal Windows lane; 18 passed, 0 failed.
- `node --test test/agent-harness/agent-harness-process-boundary.test.cjs` — normal Windows lane; 18 passed, 0 failed after changing the fixture to use checkout discovery (actual Git mutations are covered by the registry and Git behavior suites).
- `node --test test/agent-harness/repository-io-hardening.test.cjs` — normal Windows lane; 11 passed, 0 failed after removing obsolete Project-root Git fallback expectations.
- Validation planner preview — `npm run validate:plan -- --profile work-item --changes tmp/wtr02d-changes.json`; passed for the final manifest.
- `npm run test:affected -- --changes tmp/wtr02d-changes.json` — final exact-manifest run, Windows work-item lane, about 4.5 minutes; production build passed. Three affected tests failed outside WTR02D routing: `test/source-control/source-graph-projection.test.cjs` (WTR02H Workflow source graph ownership), `test/source-control/source-lifecycle-package.test.cjs` (WTR02E/F source naming/materialization), and `test/source-control/structured-integration.test.cjs` (WTR02G IntegrationRecord ownership). These selected dependency tests exercise deferred source lifecycle fixtures; no WTR02D-owned MCP/Git routing test failed. The earlier run also failed the obsolete repository I/O fallback test; after its correction, that test passed 11/11.
- `git diff --check` — passed.

## Scope, safety, and remaining work

No Git/check-out materialization, source naming, Project State persistence, release-toolbox migration, or WTR02E+ behavior was implemented. Test fixtures create Git repositories only under temporary test roots. No secrets or environment contents were read. The exact staged-diff safety scan passed: zero concrete local-path findings, zero credential-pattern findings, and zero generated/dependency artifacts. The single authorized WTR02D checkpoint commit remains pending; no push, merge, tag, release, reset, clean, or unrelated Git mutation is authorized or planned.
