# RWS06I Implementer Report

## Scope and repository

- Card: RWS06I, Close / Advance / Integration Lifecycle Convergence.
- Verified `<PROJECT_REPO>/Dev` as the primary repository checkout, branch `dev`, configured GitHub origin. A–H checkpoint commits were present before opening I. J has not been opened.
- Preserved unrelated Operator changes and historical reports. No push, merge into release, dependency installation, or cleanup of unrelated files.

## Implementation

A typed Close / Advance shell and main-process adapter resolve exact SQL WorkItem, Phase and Workflow membership, record versions, current eligibility, blockers, explicit disposition/rationale and next destination. Renderer callbacks use bounded preload APIs. WorkItem and Phase close reuse the existing completion kernel; exact source-backed execution still enters the machine-owned integration service. The old inline execution-completion button has been replaced by the shared disposition surface.

Greenfield Project completion requires approved SQL Project Planning, an approved exact Phase Map, approved planning for each Phase, all current WorkItems/Repairs and Phases closed, fresh Phase Criteria and required Project Criteria. Explicit Project Operator Decisions bind current independent Tester identities. Source-neutral Project Creation closes both Workflow and Project lifecycle with StateChange/outbox history; source-backed Project Creation enters existing integration and closes its Project lifecycle with the exact integrated result. The serialized completion command rejects changes to its captured Project evidence before closure.

Closed Phases preserve accepted planning snapshots and synchronous SQL map visibility. Phase Repairs retain their exact Phase direction, candidate identity and accepted map membership, require their own approved detailed contract and independent proof, and do not erase the failing aggregate Criterion. A fresh Phase observation after Repair is required.

Registered legacy closeout writes and dispositions fail closed with a SQL routing message. Phase/Project close projections read SQL lifecycle, and historical close-return/Phase/Project/routed closeout documents no longer participate in first-non-approved routing. Unregistered historical flows retain their existing behavior. Closed Project identity is available through an explicit read option; normal active-project resolution retains its default guard.

## Files

- `src/main/currentWorkflow/currentWorkflowService.ts` (modified)
- `src/main/documents/firstNonApprovedResolver.ts` (modified)
- `src/main/phaseClose/phaseCloseService.ts` (modified)
- `src/main/phaseClose/routedExecutionAcceptance.ts` (modified)
- `src/main/phasePlanning/structuredPhaseLoopReadProjection.ts` (modified)
- `src/main/projectClose/projectCloseService.ts` (modified)
- `src/main/projectState/currentProjectRegistrationService.ts` (modified)
- `src/main/projectState/sqliteProjectStateStore.ts` (modified)
- `src/main/sourceControl/workflowIntegrationService.ts` (modified)
- `src/main/workCardLoop/workCardCloseReturnLifecycle.ts` (modified)
- `src/main/workflow/structuredCloseAdvanceService.ts` (created)
- `src/main/workflow/structuredCloseReadProjection.ts` (created)
- `src/main/workflow/workflowApplicationIpc.ts` (modified)
- `src/main/workflow/workflowExecutionApplicationService.ts` (modified)
- `src/preload/index.ts` (modified)
- `src/renderer/app/App.tsx` (modified)
- `src/renderer/app/CloseAdvanceShell.tsx` (created)
- `src/renderer/app/CloseAdvanceWorkspace.tsx` (created)
- `src/renderer/app/ExecutionShell.tsx` (modified)
- `src/renderer/app/WorkflowExecutionWorkspace.tsx` (modified)
- `src/shared/closeAdvanceContracts.ts` (created)
- `src/shared/projectState/projectStateService.ts` (modified)
- `src/shared/workspaceContracts.ts` (modified)
- `test/phase-planning/phase-planning-service.test.cjs` (modified)
- `test/renderer/workflow-hub-shell.test.cjs` (modified)
- `test/source-control/workflow-integration-service.test.cjs` (modified)
- `validation/capability-map.json` (modified)
- Created this report. No canonical closeout documents, JSON sidecars, generated builds, runtime receipts, or new product entities were committed.

## Validation

Normal Windows lane (`require_escalated`), following the repository validation-lane contract after the restricted spawn limitation established in A:

- `npm run build`: exit 0; TypeScript and Vite passed. Existing large-bundle advisory remains.
- `node --test --test-name-pattern="SQL Close Advance|Close Advance shell" test/phase-planning/phase-planning-service.test.cjs test/renderer/workflow-hub-shell.test.cjs`: focused shell and SQL closure passed. The expanded Phase Repair scenario also passed independently.
- `node --test test/phase-planning/phase-planning-service.test.cjs test/renderer/workflow-hub-shell.test.cjs test/workflow/workflow-execution-application-service.test.cjs test/phase-close/phase-close-service.test.cjs test/project-close/project-close-service.test.cjs test/workflow/workflow-planning-ipc.test.cjs`: initial final-focused run 87/87 passed, exit 0; final combined rerun passed 87/87, exit 0, 21312.9231 ms, after correcting explicit Phase Criterion ownership.
- `node --test test/source-control/workflow-integration-service.test.cjs`: all six families passed, 6/6, exit 0, 195322.6364 ms. Actual synthetic Git repositories verify exact baseline/work source, attributed idempotent integration validation and final SQL Workflow closure. Existing Feature/Issue tests and four added family verticals use the same production path.
- `node scripts/validation/cli.cjs preview --profile work-item --changes tmp/rws06i-changes.json`: explicit attributable source/test/catalog manifest; selection 134 test files.
- `node scripts/validation/cli.cjs run --profile work-item --changes tmp/rws06i-changes.json`: exit 1; source stable; receipt `96fd0532-1d98-4b54-ad2c-4fed9c80ec9a`; 134 files, 1130 tests, 1098 passed, 31 failed, 1 skipped, 1024204 ms. Status `failed`. Early runs were intentionally interrupted after route/evidence review and before staging was frozen; they are not qualification evidence.

Early implementation checks exposed and corrected Project member projection shape, a nested completion transaction, closed Project registration/history resolution, Phase Criterion dual ownership, fixture API signatures and registry entry-workspace selection. No failing early check is described as a pass.

## Git and safety

Required card-local commit pending: `RWS06I converge close advance and integration lifecycle`. Report actual hash after committing; do not amend solely to add its own hash. Exact staged diff reviewed: 28 attributable paths. Whitespace check passed; added-line credential/private-key/concrete-local-path scan and generated/secret-file staged path scan each found zero matches. Final report restaging will repeat the checks.

## Review and limitations

Architect and Operator review is deferred until the whole A–J implementation, as directed. Automated renderer and service checks are not visual acceptance. Real-provider execution and experiential approval were not substituted with fixture evidence. Existing unrelated affected-profile failures will be recorded explicitly in the final receipt section; this report makes no broad pass claim. Next card: RWS06J only after I's checkpoint.

## Final affected receipt

The full affected profile is not described as a pass when unrelated failures remain. Exact file results follow.

| Test file | Status | Pass / fail / skip | Milliseconds |
|---|---|---|---|
| test/agent-harness/agent-harness-core.test.cjs | passed | 15 / 0 / 0 | 1242 |
| test/agent-harness/git-toolbox-local-operations.test.cjs | passed | 6 / 0 / 0 | 28703 |
| test/agent-harness/git-toolbox-remote-operations.test.cjs | passed | 4 / 0 / 0 | 62112 |
| test/agent-harness/git-toolbox-tag-operations.test.cjs | passed | 10 / 0 / 0 | 54847 |
| test/agent-harness/integration-candidate-semantics.test.cjs | passed | 9 / 0 / 0 | 74669 |
| test/agent-harness/integration-npm-adapter.test.cjs | passed | 1 / 0 / 0 | 5193 |
| test/agent-harness/integration-policy-semantics.test.cjs | passed | 11 / 0 / 0 | 73848 |
| test/agent-harness/integration-profile-gate.test.cjs | passed | 7 / 0 / 0 | 66783 |
| test/agent-harness/integration-repair-controller.test.cjs | passed | 2 / 0 / 0 | 1561 |
| test/agent-harness/integration-repair-implementer.test.cjs | passed | 4 / 0 / 0 | 425 |
| test/agent-harness/integration-repair-provider.test.cjs | passed | 1 / 0 / 0 | 18110 |
| test/agent-harness/integration-repair-source-semantics.test.cjs | passed | 4 / 0 / 0 | 62093 |
| test/agent-harness/issue-completion-checkpoint.test.cjs | passed | 1 / 0 / 0 | 30591 |
| test/agent-harness/registered-workspace-registry.test.cjs | passed | 17 / 0 / 0 | 15660 |
| test/agent-harness/release-toolbox-boundary.test.cjs | failed | 48 / 2 / 0 | 27005 |
| test/agent-harness/repository-enumeration-semantics.test.cjs | passed | 6 / 0 / 0 | 1482 |
| test/agent-harness/repository-file-operations.test.cjs | passed | 17 / 0 / 0 | 836 |
| test/agent-harness/repository-io-hardening.test.cjs | failed | 10 / 1 / 0 | 4700 |
| test/agent-harness/reserved-toolbox-namespace.test.cjs | failed | 0 / 2 / 0 | 855 |
| test/agent-harness/source-checkpoint-boundary.test.cjs | passed | 2 / 0 / 0 | 147873 |
| test/agent-harness/source-control-service-boundary.test.cjs | passed | 2 / 0 / 0 | 28202 |
| test/app-shell/app-shell.test.cjs | passed | 12 / 0 / 0 | 948 |
| test/app-shell/clipboard-handoff.test.cjs | passed | 17 / 0 / 0 | 561 |
| test/app-shell/native-dialog.test.cjs | passed | 1 / 0 / 0 | 687 |
| test/app-shell/native-product-identity.test.cjs | passed | 4 / 0 / 0 | 722 |
| test/architect-interview/architect-interview-workspace.test.cjs | passed | 14 / 0 / 0 | 3743 |
| test/architect-outputs/architect-draft-ingestion.test.cjs | passed | 8 / 0 / 0 | 356 |
| test/architect-outputs/architect-output-prompt-contracts.test.cjs | passed | 10 / 0 / 0 | 111862 |
| test/architect-outputs/architect-output-workspace-repair.test.cjs | passed | 26 / 0 / 0 | 24911 |
| test/characterization/desktop-development-lifecycle.test.cjs | passed | 6 / 0 / 0 | 253864 |
| test/characterization/desktop-project-repository-binding.test.cjs | passed | 4 / 0 / 0 | 1881 |
| test/characterization/desktop-runtime-model-selection.test.cjs | passed | 7 / 0 / 0 | 219 |
| test/context-menu/local-renderer-context-menu.test.cjs | passed | 6 / 0 / 0 | 244 |
| test/development-environment/development-environment-preflight-service.test.cjs | passed | 3 / 0 / 0 | 456 |
| test/development-environment/repository-environment-hydration.test.cjs | passed | 6 / 0 / 0 | 3009 |
| test/documents/artifact-source-revision.test.cjs | passed | 1 / 0 / 0 | 399 |
| test/documents/artifact-transaction.test.cjs | passed | 2 / 0 / 0 | 335 |
| test/documents/canonical-markdown-document.test.cjs | passed | 7 / 0 / 0 | 462 |
| test/documents/disposition-transaction.test.cjs | passed | 18 / 0 / 0 | 2977 |
| test/documents/planning-document-service.test.cjs | passed | 8 / 0 / 0 | 701 |
| test/documents/planning-repository-snapshot.test.cjs | passed | 9 / 0 / 0 | 1117 |
| test/documents/repository-binding-compatibility.test.cjs | passed | 1 / 0 / 0 | 608 |
| test/documents/single-file-workflow.test.cjs | passed | 1 / 0 / 0 | 499 |
| test/lifecycle/evidence-lifecycle-resolver.test.cjs | passed | 1 / 0 / 0 | 277 |
| test/lifecycle/nested-lifecycle.test.cjs | passed | 5 / 0 / 0 | 268 |
| test/phase-close/phase-close-service.test.cjs | passed | 1 / 0 / 0 | 451 |
| test/phase-close/phase-validation-state.test.cjs | passed | 12 / 0 / 0 | 150228 |
| test/phase-interview/phase-interview-service.test.cjs | passed | 7 / 0 / 0 | 6138 |
| test/phase-map/phase-map-service.test.cjs | passed | 16 / 0 / 0 | 4472 |
| test/phase-planning/phase-planning-service.test.cjs | passed | 8 / 0 / 0 | 23673 |
| test/project-close/project-close-service.test.cjs | passed | 1 / 0 / 0 | 580 |
| test/project-intake/post-submit-review-state.test.cjs | failed | 4 / 1 / 0 | 871 |
| test/project-intake/project-intake-corpus-status.test.cjs | passed | 7 / 0 / 0 | 213 |
| test/project-intake/project-intake-service.test.cjs | passed | 3 / 0 / 0 | 667 |
| test/project-planning/project-planning-service.test.cjs | failed | 27 / 1 / 0 | 273936 |
| test/project-state/authoritative-context-event-feed.test.cjs | passed | 4 / 0 / 0 | 440 |
| test/project-state/current-project-entry.test.cjs | passed | 22 / 0 / 0 | 79015 |
| test/project-state/current-project-registration.test.cjs | passed | 7 / 0 / 0 | 889 |
| test/project-state/current-state-queries.test.cjs | passed | 4 / 0 / 0 | 455 |
| test/project-state/decision-disposition.test.cjs | passed | 8 / 0 / 0 | 453 |
| test/project-state/domain-contracts.test.cjs | passed | 8 / 0 / 0 | 302 |
| test/project-state/evidence-validation-freshness.test.cjs | passed | 6 / 0 / 0 | 457 |
| test/project-state/execution-completion.test.cjs | failed | 19 / 6 / 0 | 1522 |
| test/project-state/projection-export.test.cjs | passed | 4 / 0 / 0 | 427 |
| test/project-state/revision-history-lineage.test.cjs | passed | 3 / 0 / 0 | 517 |
| test/project-state/service-boundary.test.cjs | passed | 3 / 0 / 0 | 442 |
| test/project-state/source-semantic-references.test.cjs | passed | 8 / 0 / 0 | 617 |
| test/project-state/sqlite-schema-migrations.test.cjs | passed | 6 / 0 / 0 | 451 |
| test/project-state/sqlite-store-conformance.test.cjs | passed | 10 / 0 / 0 | 1896 |
| test/project-state/state-change-outbox.test.cjs | passed | 7 / 0 / 0 | 362 |
| test/project-state/store-conformance.test.cjs | passed | 4 / 0 / 0 | 232 |
| test/project-state/tester-state-mapping.test.cjs | passed | 8 / 0 / 0 | 552 |
| test/project-state/work-intake-routing.test.cjs | passed | 8 / 0 / 0 | 486 |
| test/project-state/workflow-type-registry.test.cjs | passed | 5 / 0 / 0 | 216 |
| test/reconstruction/reconstruction-repair01.test.cjs | passed | 2 / 0 / 0 | 667 |
| test/renderer/architect-interview-refresh-state.test.cjs | passed | 2 / 0 / 0 | 354 |
| test/renderer/architect-output-viewed-revisions.test.cjs | passed | 5 / 0 / 0 | 564 |
| test/renderer/architect-output-workspace-source.test.cjs | passed | 4 / 0 / 0 | 516 |
| test/renderer/codex-execution-presentation-ownership.test.cjs | passed | 3 / 0 / 0 | 310 |
| test/renderer/document-review-surface-source.test.cjs | passed | 4 / 0 / 0 | 831 |
| test/renderer/evidence-driven-refresh-coordinator.test.cjs | passed | 8 / 0 / 0 | 517 |
| test/renderer/execution-context-dashboard.test.cjs | passed | 3 / 0 / 0 | 318 |
| test/renderer/figma-redesign-shell.test.cjs | passed | 12 / 0 / 0 | 612 |
| test/renderer/issue-architect-planning-workspace.test.cjs | passed | 2 / 0 / 0 | 420 |
| test/renderer/phase-map-presentation.test.cjs | passed | 7 / 0 / 0 | 551 |
| test/renderer/phase-validation-renderer-sequencing.test.cjs | passed | 11 / 0 / 0 | 1026 |
| test/renderer/project-planning-blocker-banner.test.cjs | passed | 6 / 0 / 0 | 617 |
| test/renderer/project-rail-presentation.test.cjs | passed | 16 / 0 / 0 | 567 |
| test/renderer/source-control-graph-layout.test.cjs | passed | 4 / 0 / 0 | 399 |
| test/renderer/work-card-building-review-workspace.test.cjs | passed | 7 / 0 / 0 | 857 |
| test/renderer/work-card-close-workspace.test.cjs | passed | 8 / 0 / 0 | 542 |
| test/renderer/work-card-intake-workspace.test.cjs | passed | 3 / 0 / 0 | 494 |
| test/renderer/work-card-map-workspace.test.cjs | passed | 6 / 0 / 0 | 639 |
| test/renderer/work-card-plan-presentation.test.cjs | passed | 4 / 0 / 0 | 326 |
| test/renderer/work-card-repair-workspace.test.cjs | passed | 2 / 0 / 0 | 487 |
| test/renderer/work-card-report-review-workspace.test.cjs | passed | 4 / 0 / 0 | 520 |
| test/renderer/work-intake-routed-workspaces.test.cjs | passed | 12 / 0 / 0 | 709 |
| test/renderer/workflow-hub-shell.test.cjs | passed | 33 / 0 / 0 | 2176 |
| test/repository/phase-validation-wiring.test.cjs | passed | 3 / 0 / 0 | 17595 |
| test/repository/runtime-wiring-source.test.cjs | failed | 27 / 1 / 0 | 1431 |
| test/resolver/first-non-approved-resolver.test.cjs | passed | 1 / 0 / 0 | 489 |
| test/resolver/single-file-resolver.test.cjs | passed | 3 / 0 / 0 | 334 |
| test/source-control/managed-project-source.test.cjs | failed | 15 / 8 / 0 | 149784 |
| test/source-control/source-graph-projection.test.cjs | passed | 4 / 0 / 0 | 28702 |
| test/source-control/source-lifecycle-package.test.cjs | failed | 0 / 1 / 0 | 1173 |
| test/source-control/source-topology-path-contracts.test.cjs | passed | 7 / 0 / 0 | 298 |
| test/source-control/workflow-integration-service.test.cjs | failed | 0 / 6 / 0 | 82502 |
| test/source-control/workflow-source-materialization.test.cjs | passed | 6 / 0 / 0 | 29714 |
| test/validation/capability-map.test.cjs | passed | 5 / 0 / 0 | 231 |
| test/validation/test-lifecycle-determination.test.cjs | passed | 3 / 0 / 0 | 192 |
| test/work-card-building/codex-app-server-transport.test.cjs | passed | 15 / 0 / 0 | 899 |
| test/work-card-building/codex-implementer-execution-service.test.cjs | failed | 38 / 1 / 0 | 166138 |
| test/work-card-building/codex-managed-connections.test.cjs | passed | 7 / 0 / 0 | 2479 |
| test/work-card-building/codex-runtime-initializer-client.test.cjs | passed | 4 / 0 / 0 | 168 |
| test/work-card-building/codex-runtime-manager.test.cjs | passed | 16 / 0 / 1 | 210 |
| test/work-card-building/work-card-building-review-service.test.cjs | passed | 7 / 0 / 0 | 1119 |
| test/work-card-intake/work-card-intake-service.test.cjs | passed | 9 / 0 / 0 | 69258 |
| test/work-card-loop/work-card-loop-state-service.test.cjs | passed | 14 / 0 / 0 | 18069 |
| test/work-card-planning/development-environment-contract.test.cjs | passed | 7 / 0 / 0 | 218 |
| test/work-card-planning/work-card-planning-service.test.cjs | passed | 15 / 0 / 0 | 28182 |
| test/work-card-repair/work-card-repair-service.test.cjs | passed | 7 / 0 / 0 | 1175 |
| test/work-card-validation/work-card-validation-service.test.cjs | passed | 7 / 0 / 0 | 1270 |
| test/work-intake/greenfield-source-bootstrap.test.cjs | passed | 1 / 0 / 0 | 5319 |
| test/work-intake/structured-work-intake-capture.test.cjs | passed | 6 / 0 / 0 | 3391 |
| test/workflow/current-close-planning-context.test.cjs | passed | 10 / 0 / 0 | 5377 |
| test/workflow/current-execution-context.test.cjs | passed | 24 / 0 / 0 | 83500 |
| test/workflow/deterministic-work-item-validator.test.cjs | passed | 1 / 0 / 0 | 208 |
| test/workflow/phase-validation-production-boundary.test.cjs | failed | 7 / 1 / 0 | 33662 |
| test/workflow/production-service-proof.test.cjs | passed | 2 / 0 / 0 | 1390 |
| test/workflow/semantic-work-item-validator.test.cjs | passed | 2 / 0 / 0 | 235 |
| test/workflow/workflow-application-service.test.cjs | passed | 28 / 0 / 0 | 40247 |
| test/workflow/workflow-execution-application-service.test.cjs | passed | 30 / 0 / 0 | 13267 |
| test/workflow/workflow-planning-ipc.test.cjs | passed | 14 / 0 / 0 | 2584 |
| test/workspaces/workspace-document-review.test.cjs | passed | 1 / 0 / 0 | 248 |

Non-passing owners: `test/agent-harness/release-toolbox-boundary.test.cjs`, `test/agent-harness/repository-io-hardening.test.cjs`, `test/agent-harness/reserved-toolbox-namespace.test.cjs`, `test/project-intake/post-submit-review-state.test.cjs`, `test/project-planning/project-planning-service.test.cjs`, `test/project-state/execution-completion.test.cjs`, `test/repository/runtime-wiring-source.test.cjs`, `test/source-control/managed-project-source.test.cjs`, `test/source-control/source-lifecycle-package.test.cjs`, `test/source-control/workflow-integration-service.test.cjs`, `test/work-card-building/codex-implementer-execution-service.test.cjs`, `test/workflow/phase-validation-production-boundary.test.cjs`.


Failure classification: the six source-neutral completion fixture failures, toolbox namespace/repository hardening failures, intake-null/preload wiring/Phase VM failures and bounded Tester timing failure were already present in H. Managed source fixtures now fail 8 rather than 7; they fail in unchanged candidate-repository preparation. The wider selection additionally exposes a Project Planning fixture expecting retired `workPlanning:status`, a source-lifecycle fixture using an invalid Work Intake form, and two release-toolbox failures outside I's changed runtime owners. These are not silently counted as passes or repaired outside card scope.

The affected runner reports all six integration candidates failed, while the standalone six-family run passed 6/6. An ignored diagnostic fixture copy reproduced failure with the runner's temp isolation and child-cleanup hook: the candidate failed before validation (empty validation array) and emitted the existing retained-checkout/source-control receipt message. The underlying runner/checkout failure remains unresolved; no Git safety check was weakened. Standalone production-path evidence is recorded separately from the failed affected profile.

Final focused owners also passed inside the stable affected receipt: Phase Planning 8/8, shared Workflow renderer 33/33, exact execution 30/30. No card-owned closure assertion failed in the final affected receipt. The broad result remains failed and requires review alongside the established baseline failures.
