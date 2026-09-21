# TVA06 Implementer Report

## Scope and repository

Work Card TVA06. Approved repository/worktree root verified. Branch codex/test-execution-architecture from dev at 05eef38; origin/dev was 45 commits behind at initialization. No fetch, push, original-checkout edits, staging or commit/merge yet. Operator-authorized final commit/merge remains pending staged diff and safety review.

## Implementation and file disposition

Modified .champcity/integration-policy.json, shared integrationPolicyContracts/integrationCandidateContracts, main integrationCandidateService/integrationPolicyProvider/integrationPolicyRunners, and integrationGit. Created src/main/planExecution/integrationValidationProfileRunner.ts. Modified validation catalog/planner/executor/process/build tooling and profile rules; created authority.cjs, profile-runner.cjs and environment.cjs under scripts/validation. Modified integration-scenarios support and capability map; created integration-profile-gate.test.cjs. Updated PROJECT_INTEGRATION_VALIDATION_POLICY.md and created this report. No files deleted. No dependency, migration, production import from tests/metadata, generated committed runtime, JSON workflow sidecar or unrestricted IPC added.

Old required composition: typecheck + build (including TypeScript again) + every built test serially. New composition: one registered validation-profile check selecting integration-gate. One target-owned build serves the selected tests; no equivalent no-emit check is repeated. The policy exposes only registered profile identity and bounded timeout, never command/test paths. Existing npm-script checks remain supported and keep their exact target script trust.

The candidate service supplies frozen repository, target branch/commit, incoming commit, candidate ID/current committed revision and platform. The application-owned Git adapter calculates the exact target-to-candidate diff without rename collapsing. The profile adapter reads the fixed toolkit and catalog/profiles from the immutable target commit, hashes the authority, executes its temporary snapshot with metadata/context over stdin, and removes the snapshot. Incoming toolkit/profile edits do not replace their judge. No runtime code is imported from repository tests or validation metadata into the application.

Candidate metadata must validate. Existing target capabilities/behaviors/test proof cannot disappear; target ownership, lanes and execution requirements remain authoritative while additional proof may broaden the set. Unknown paths under target ownership block even when incoming metadata attempts to classify them. Proposed future profiles must retain the complete supported schema. The same authority is used when a repaired candidate receives a new commit. Candidate cleanliness, exact commit and stale-ref checks remain independent pre/post/advance guards.

Profile evidence is bounded and embedded in the existing canonical candidate Markdown receipt, including authority hash, exact revisions, selected files, excluded lanes, run identity and elapsed/status data. Failed or incomplete evidence cannot advance. Local Git/npm prerequisites are mechanically probed; remote provider access is not inferred or attempted. Profile rules can add migration or packaging/Desktop lanes for affected owning capabilities, and registered full-supported/release profiles remain explicit wider choices.

## Focused validation and measurements

All child-process work ran in normal Windows using existing dependencies. No aggregate/full-supported profile or complete legacy git boundary file ran.

- npm run build: exit 0; production TypeScript/Vite/assets output passed after the contract changes.
- Before policy replacement, node --test test/agent-harness/integration-profile-gate.test.cjs: exit 0, 3/3, 13904.29 ms. Synthetic actual Git/npm profile run: first gate 474 ms, repaired gate 448 ms. Proved exact revisions, pinned target toolkit, target metadata overriding weaker incoming configuration, failing source, stale candidate context, repair revalidation and unknown-path rejection. The policy was switched only after this result.
- node --test --test-concurrency=1 test/validation/capability-map.test.cjs test/validation/validation-runner.test.cjs test/agent-harness/integration-profile-gate.test.cjs test/agent-harness/integration-policy-semantics.test.cjs test/agent-harness/integration-repair-source-semantics.test.cjs: exit 0, 28/28, 86471.70 ms. Target-policy semantics 34.54 s; repair-source 32.41 s. These retain policy identity/transition, stale target, required script identity, validation retries, Operator decisions, source/index guards and immutable application context.
- After adding the environment probe to the immutable toolkit, node --test test/agent-harness/integration-profile-gate.test.cjs: exit 0, 3/3, 13789.99 ms; gate 462 ms and repair 445 ms.
- Added candidate source-mutation focus: node --test --test-name-pattern='candidate orchestration supplies frozen exact runner context' test/agent-harness/integration-profile-gate.test.cjs: exit 0, 3/3, 6881.26 ms. Validated unchanged source and rejection when a check mutates the candidate. Final file now contains four runtime tests across the two separately observed focused invocations.
- Strict profile/affected selection subset: node --test --test-name-pattern='affected proof selection|validation plans deterministically' test/validation/validation-runner.test.cjs: exit 0, 2/2, 698.40 ms.
- Real MCP-selected plan: Node stdin driver invoked executePlan(planValidation({profile:'integration-gate',changedPaths:['src/main/agentHarness/runtime/httpRuntime.ts']})). First run exit 1/incomplete, 34034 ms, 110 passing tests and three explicit unavailable Git-prerequisite files. This exposed missing environment probing, not a source pass. After adding bounded Git/npm probes, same command exit 0, all 145 tests across 19 files passed, one build 10889 ms, total 44205 ms. Observed git-cli availability. This is below the three-minute target and five-minute review threshold; no Desktop/soak/package lane ran.
- git diff --check and plan previews: exit 0, static/read-only.

The small synthetic profile is adapter conformance, not a substitute for the real 19-file MCP measurement. Raw receipts remain ignored under tmp. The source-control policy preview is materially broader and exceeds the five-minute review estimate; its complete legacy file is quarantined in this bundle. This is an explicit scope/cost review item for TVA09, not permission to drop required proof. Full-platform acceptance remains post-bundle.

## Exact representative selections

### MCP

Changed paths: `src/main/agentHarness/runtime/httpRuntime.ts`. Estimated serial file cost 27337 ms (not measured gate time).

- `test/agent-harness/agent-harness-build-identity.test.cjs` (integration)
- `test/agent-harness/agent-harness-core.test.cjs` (integration)
- `test/agent-harness/agent-harness-process-contract.test.cjs` (integration)
- `test/agent-harness/agent-harness-runtime.test.cjs` (integration)
- `test/agent-harness/agent-harness-service-host-lifecycle.test.cjs` (integration)
- `test/agent-harness/agent-harness-service-host-protocol-compatibility.test.cjs` (integration)
- `test/agent-harness/mcp-operational-diagnostics.test.cjs` (integration)
- `test/agent-harness/mcp-session-lifecycle.test.cjs` (integration)
- `test/agent-harness/mcp-tool-contract-generation.test.cjs` (integration)
- `test/agent-harness/oauth-offline-access.test.cjs` (integration)
- `test/agent-harness/registered-workspace-registry.test.cjs` (integration)
- `test/agent-harness/repository-enumeration-semantics.test.cjs` (integration)
- `test/agent-harness/repository-file-operations.test.cjs` (integration)
- `test/agent-harness/repository-io-hardening.test.cjs` (integration)
- `test/agent-harness/reserved-toolbox-namespace.test.cjs` (integration)
- `test/agent-harness/sibling-process-launch.test.cjs` (integration)
- `test/characterization/desktop-project-repository-binding.test.cjs` (affected-capability)
- `test/renderer/agent-harness-settings-workspace.test.cjs` (affected-capability)
- `test/validation/capability-map.test.cjs` (static)

### renderer

Changed paths: `src/renderer/app/WorkflowHubWorkspace.tsx`. Estimated serial file cost 16161 ms (not measured gate time).

- `test/app-shell/app-shell.test.cjs` (integration)
- `test/app-shell/clipboard-handoff.test.cjs` (integration)
- `test/app-shell/native-dialog.test.cjs` (integration)
- `test/app-shell/native-product-identity.test.cjs` (static)
- `test/context-menu/local-renderer-context-menu.test.cjs` (fast)
- `test/documents/artifact-source-revision.test.cjs` (integration)
- `test/documents/artifact-transaction.test.cjs` (integration)
- `test/documents/canonical-markdown-document.test.cjs` (integration)
- `test/documents/planning-document-service.test.cjs` (integration)
- `test/documents/planning-repository-snapshot.test.cjs` (integration)
- `test/documents/repository-binding-compatibility.test.cjs` (fast)
- `test/documents/single-file-workflow.test.cjs` (integration)
- `test/lifecycle/evidence-lifecycle-resolver.test.cjs` (integration)
- `test/lifecycle/nested-lifecycle.test.cjs` (fast)
- `test/renderer/document-review-surface-source.test.cjs` (affected-capability)
- `test/renderer/evidence-driven-refresh-coordinator.test.cjs` (affected-capability)
- `test/renderer/execution-context-dashboard.test.cjs` (affected-capability)
- `test/renderer/figma-redesign-shell.test.cjs` (affected-capability)
- `test/renderer/project-rail-presentation.test.cjs` (affected-capability)
- `test/renderer/workflow-hub-shell.test.cjs` (affected-capability)
- `test/resolver/first-non-approved-resolver.test.cjs` (integration)
- `test/resolver/single-file-resolver.test.cjs` (integration)
- `test/validation/capability-map.test.cjs` (static)
- `test/workflow/current-close-planning-context.test.cjs` (integration)
- `test/workflow/current-execution-context.test.cjs` (integration)
- `test/workspaces/workspace-document-review.test.cjs` (integration)

### policy

Changed paths: `.champcity/integration-policy.json`. Estimated serial file cost 481556 ms (not measured gate time).

- `test/agent-harness/agent-harness-core.test.cjs` (integration)
- `test/agent-harness/git-mutation-boundary.test.cjs` (integration)
- `test/agent-harness/integration-candidate-semantics.test.cjs` (integration)
- `test/agent-harness/integration-npm-adapter.test.cjs` (integration)
- `test/agent-harness/integration-policy-semantics.test.cjs` (integration)
- `test/agent-harness/integration-profile-gate.test.cjs` (integration)
- `test/agent-harness/integration-repair-controller.test.cjs` (integration)
- `test/agent-harness/integration-repair-provider.test.cjs` (integration)
- `test/agent-harness/integration-repair-source-semantics.test.cjs` (integration)
- `test/agent-harness/registered-workspace-registry.test.cjs` (integration)
- `test/agent-harness/release-toolbox-boundary.test.cjs` (integration)
- `test/agent-harness/repository-enumeration-semantics.test.cjs` (integration)
- `test/agent-harness/repository-file-operations.test.cjs` (integration)
- `test/agent-harness/repository-io-hardening.test.cjs` (integration)
- `test/agent-harness/reserved-toolbox-namespace.test.cjs` (integration)
- `test/characterization/desktop-project-repository-binding.test.cjs` (affected-capability)
- `test/characterization/routed-integration-focus.test.cjs` (integration)
- `test/validation/capability-map.test.cjs` (static)

## Safety and outcome

No credential or concrete machine paths in durable artifacts. Context root paths are transient stdin only; profile receipts retain repository-relative test paths. Temporary toolkit writes/cleanup stay in the candidate-owned repository boundary. No external provider/network acceptance, UI judgment or packaging success is claimed. No commit hash yet; final Operator-directed merge pending. TVA06 is complete; next TVA07.
