# RWS06G Implementer Report

Card: RWS06G, Execution Shell and All Workflow-Type Support. Approved repository root verified as the Dev Git repository; branch dev, configured GitHub origin unchanged. No push. Previous checkpoint: f03fc4d7c8f0b660be17c00812c5d6e61ccbc6d9.

## Implementation

ExecutionShell receives typed projections and adapter-bound actions, with separate Work Map, selected WorkItem, Implementer, Tester, bounded user/MCP, checkpoint and integration panels. It owns no persistence bridge or JSON parser. WorkflowExecutionWorkspace retains exact domain actions and independent Validator/Phase validation behavior. Selection refreshes clear prior runtime models and discard stale asynchronous responses. WorkItem review now blocks readiness until its current contract is approved.

The shared exact implementation Workflow registry covers Feature, Issue, Migration, Integration, Infrastructure and Research with an accepted implementation Plan. Kernel/application guards, attempt ownership, repair, detailed planning, decomposition and completion use that set while preserving existing family, dependency, source and failed-attempt guards. Research without a Plan cannot enter execution. Greenfield retains its adapter and the SQL contract introduced in F.

Focused proof completes direct and phased source-neutral execution for all six types, including dependency gating, canonical contract, implementation, Tester, WorkItem/Phase and Workflow closure. Migration rejects incompatible WorkItem kinds atomically. Source mutation is rejected without fabricating Git, SourceBinding, SourceCheckpoint or IntegrationRecord. Existing Research no-Plan closure proof now rejects execution both before and after closure. Renderer proof exercises exact source identities, phased readiness and bounded approval/checkpoint callbacks; unavailable recovery does not render an action.

F report classification corrected: its renderer failure was an obsolete assertion requiring removed inline Architect JSON parsing, rather than the older VM fixture. G updates that assertion to the structured adapter and extracted shell.

## Files

Created ExecutionShell and this report; modified existing kernel, adapter, registry, tests and capability catalog. No dependencies, generated runtime artifacts or permanent test file created. No deletion. Unrelated working-tree changes preserved.

- src/main/workCardPlanning/structuredWorkItemPlanningService.ts
- src/main/workflow/workflowExecutionApplicationService.ts
- src/renderer/app/ExecutionShell.tsx
- src/renderer/app/WorkflowExecutionWorkspace.tsx
- src/renderer/app/workflowPlanningDispatch.ts
- src/shared/projectState/projectStateService.ts
- src/shared/projectState/workflowTypeRegistry.ts
- test/renderer/workflow-hub-shell.test.cjs
- test/workflow/workflow-execution-application-service.test.cjs
- test/workflow/workflow-planning-ipc.test.cjs
- validation/capability-map.json
- docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06F_IMPLEMENTER_REPORT.md
- docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06G_IMPLEMENTER_REPORT.md

## Validation

- npm run build: passed, normal Windows lane; existing renderer chunk-size warning.
- node --test test/workflow/workflow-execution-application-service.test.cjs test/workflow/workflow-planning-ipc.test.cjs test/renderer/workflow-hub-shell.test.cjs: 74/74 passed, 10502 ms, normal Windows lane.
- node --test test/renderer/workflow-hub-shell.test.cjs: 31/31 passed, 1386 ms, after adding rendered readiness and exact callback proof. Restricted attempt failed spawn EPERM, then equivalent normal Windows run passed.
- Affected preview: 89 selected files from all 11 attributable source/test/catalog paths. Initial receipt 8a8c8f82-94bd-420f-bad8-98e19f7bd4cd: 730 tests, 711 pass, 19 fail, no skips, 395927 ms. Build passed. Report creation during the run changed the worktree fingerprint (sourceStable=false); no runtime code changed. Diagnostic evidence only; Stable rerun completed below. Failures: toolbox 3, intake renderer 1, legacy completion fixtures 6, managed source 7, integration 2; G focused owners passed.

## Git and review

Exact attributable staging and staged-diff inspection performed. Whitespace check and credential/private-key/concrete-local-path/generated-path scans found no attributable added-line matches. Required checkpoint commit pending at report creation; actual hash will be communicated after commit. Architect and Operator review the complete A–J implementation after J. No visual acceptance or external integration claimed. Next card H remains unread until G is committed.

## Final affected receipt

Command: node scripts/validation/cli.cjs run --profile work-item --changes tmp/rws06g-changes.json, normal Windows lane, exit 1. Receipt 0051a82b-32c8-4776-bbb9-d5a8645acaa5, sourceStable=true, 89 files, 730 tests, 711 passed, 19 failed, zero skipped/unavailable/blocked; 393210 ms. Production build passed. The same six existing failure owners remained; G execution, renderer, Research closure and catalog proofs passed. No broad pass claimed.

| File | Result | Pass / Fail / Skip | ms |
| --- | --- | --- | --- |
| test/agent-harness/agent-harness-core.test.cjs | passed | 15 / 0 / 0 | 1308 |
| test/agent-harness/registered-workspace-registry.test.cjs | passed | 17 / 0 / 0 | 14857 |
| test/agent-harness/repository-enumeration-semantics.test.cjs | passed | 6 / 0 / 0 | 1962 |
| test/agent-harness/repository-file-operations.test.cjs | passed | 17 / 0 / 0 | 820 |
| test/agent-harness/repository-io-hardening.test.cjs | failed | 10 / 1 / 0 | 4936 |
| test/agent-harness/reserved-toolbox-namespace.test.cjs | failed | 0 / 2 / 0 | 918 |
| test/app-shell/app-shell.test.cjs | passed | 12 / 0 / 0 | 1284 |
| test/app-shell/clipboard-handoff.test.cjs | passed | 17 / 0 / 0 | 563 |
| test/app-shell/native-dialog.test.cjs | passed | 1 / 0 / 0 | 469 |
| test/app-shell/native-product-identity.test.cjs | passed | 4 / 0 / 0 | 511 |
| test/architect-outputs/architect-draft-ingestion.test.cjs | passed | 8 / 0 / 0 | 395 |
| test/architect-outputs/architect-output-prompt-contracts.test.cjs | passed | 10 / 0 / 0 | 110699 |
| test/architect-outputs/architect-output-workspace-repair.test.cjs | passed | 26 / 0 / 0 | 28008 |
| test/characterization/desktop-development-lifecycle.test.cjs | passed | 6 / 0 / 0 | 281584 |
| test/characterization/desktop-project-repository-binding.test.cjs | passed | 4 / 0 / 0 | 1315 |
| test/context-menu/local-renderer-context-menu.test.cjs | passed | 6 / 0 / 0 | 311 |
| test/documents/artifact-source-revision.test.cjs | passed | 1 / 0 / 0 | 557 |
| test/documents/artifact-transaction.test.cjs | passed | 2 / 0 / 0 | 211 |
| test/documents/canonical-markdown-document.test.cjs | passed | 7 / 0 / 0 | 396 |
| test/documents/planning-document-service.test.cjs | passed | 8 / 0 / 0 | 687 |
| test/documents/planning-repository-snapshot.test.cjs | passed | 9 / 0 / 0 | 1033 |
| test/documents/repository-binding-compatibility.test.cjs | passed | 1 / 0 / 0 | 197 |
| test/documents/single-file-workflow.test.cjs | passed | 1 / 0 / 0 | 540 |
| test/lifecycle/evidence-lifecycle-resolver.test.cjs | passed | 1 / 0 / 0 | 268 |
| test/lifecycle/nested-lifecycle.test.cjs | passed | 5 / 0 / 0 | 204 |
| test/phase-planning/phase-planning-service.test.cjs | passed | 6 / 0 / 0 | 12711 |
| test/project-intake/post-submit-review-state.test.cjs | failed | 4 / 1 / 0 | 303 |
| test/project-intake/project-intake-corpus-status.test.cjs | passed | 7 / 0 / 0 | 200 |
| test/project-state/authoritative-context-event-feed.test.cjs | passed | 4 / 0 / 0 | 407 |
| test/project-state/current-project-entry.test.cjs | passed | 22 / 0 / 0 | 90884 |
| test/project-state/current-project-registration.test.cjs | passed | 7 / 0 / 0 | 668 |
| test/project-state/current-state-queries.test.cjs | passed | 4 / 0 / 0 | 541 |
| test/project-state/decision-disposition.test.cjs | passed | 8 / 0 / 0 | 440 |
| test/project-state/domain-contracts.test.cjs | passed | 8 / 0 / 0 | 382 |
| test/project-state/evidence-validation-freshness.test.cjs | passed | 6 / 0 / 0 | 385 |
| test/project-state/execution-completion.test.cjs | failed | 19 / 6 / 0 | 1190 |
| test/project-state/projection-export.test.cjs | passed | 4 / 0 / 0 | 426 |
| test/project-state/revision-history-lineage.test.cjs | passed | 3 / 0 / 0 | 396 |
| test/project-state/service-boundary.test.cjs | passed | 3 / 0 / 0 | 234 |
| test/project-state/source-semantic-references.test.cjs | passed | 8 / 0 / 0 | 665 |
| test/project-state/sqlite-schema-migrations.test.cjs | passed | 6 / 0 / 0 | 451 |
| test/project-state/sqlite-store-conformance.test.cjs | passed | 10 / 0 / 0 | 1848 |
| test/project-state/state-change-outbox.test.cjs | passed | 7 / 0 / 0 | 405 |
| test/project-state/store-conformance.test.cjs | passed | 4 / 0 / 0 | 247 |
| test/project-state/tester-state-mapping.test.cjs | passed | 8 / 0 / 0 | 913 |
| test/project-state/work-intake-routing.test.cjs | passed | 8 / 0 / 0 | 494 |
| test/project-state/workflow-type-registry.test.cjs | passed | 5 / 0 / 0 | 227 |
| test/renderer/architect-interview-refresh-state.test.cjs | passed | 2 / 0 / 0 | 184 |
| test/renderer/architect-output-viewed-revisions.test.cjs | passed | 5 / 0 / 0 | 379 |
| test/renderer/architect-output-workspace-source.test.cjs | passed | 4 / 0 / 0 | 515 |
| test/renderer/document-review-surface-source.test.cjs | passed | 4 / 0 / 0 | 686 |
| test/renderer/evidence-driven-refresh-coordinator.test.cjs | passed | 8 / 0 / 0 | 461 |
| test/renderer/execution-context-dashboard.test.cjs | passed | 3 / 0 / 0 | 309 |
| test/renderer/figma-redesign-shell.test.cjs | passed | 12 / 0 / 0 | 545 |
| test/renderer/issue-architect-planning-workspace.test.cjs | passed | 2 / 0 / 0 | 379 |
| test/renderer/project-rail-presentation.test.cjs | passed | 16 / 0 / 0 | 650 |
| test/renderer/source-control-graph-layout.test.cjs | passed | 4 / 0 / 0 | 581 |
| test/renderer/work-card-building-review-workspace.test.cjs | passed | 7 / 0 / 0 | 844 |
| test/renderer/work-card-close-workspace.test.cjs | passed | 8 / 0 / 0 | 434 |
| test/renderer/work-card-intake-workspace.test.cjs | passed | 3 / 0 / 0 | 311 |
| test/renderer/work-card-map-workspace.test.cjs | passed | 6 / 0 / 0 | 593 |
| test/renderer/work-card-plan-presentation.test.cjs | passed | 4 / 0 / 0 | 318 |
| test/renderer/work-card-repair-workspace.test.cjs | passed | 2 / 0 / 0 | 445 |
| test/renderer/work-card-report-review-workspace.test.cjs | passed | 4 / 0 / 0 | 437 |
| test/renderer/work-intake-routed-workspaces.test.cjs | passed | 12 / 0 / 0 | 769 |
| test/renderer/workflow-hub-shell.test.cjs | passed | 31 / 0 / 0 | 1797 |
| test/resolver/first-non-approved-resolver.test.cjs | passed | 1 / 0 / 0 | 309 |
| test/resolver/single-file-resolver.test.cjs | passed | 3 / 0 / 0 | 409 |
| test/source-control/managed-project-source.test.cjs | failed | 16 / 7 / 0 | 148860 |
| test/source-control/workflow-integration-service.test.cjs | failed | 0 / 2 / 0 | 29343 |
| test/validation/capability-map.test.cjs | passed | 5 / 0 / 0 | 293 |
| test/validation/test-lifecycle-determination.test.cjs | passed | 3 / 0 / 0 | 388 |
| test/work-card-building/codex-app-server-transport.test.cjs | passed | 15 / 0 / 0 | 1060 |
| test/work-card-intake/work-card-intake-service.test.cjs | passed | 9 / 0 / 0 | 64912 |
| test/work-card-loop/work-card-loop-state-service.test.cjs | passed | 14 / 0 / 0 | 17117 |
| test/work-card-planning/development-environment-contract.test.cjs | passed | 7 / 0 / 0 | 215 |
| test/work-card-planning/work-card-planning-service.test.cjs | passed | 15 / 0 / 0 | 22905 |
| test/work-card-repair/work-card-repair-service.test.cjs | passed | 7 / 0 / 0 | 1179 |
| test/work-card-validation/work-card-validation-service.test.cjs | passed | 7 / 0 / 0 | 1722 |
| test/work-intake/greenfield-source-bootstrap.test.cjs | passed | 1 / 0 / 0 | 4545 |
| test/work-intake/structured-work-intake-capture.test.cjs | passed | 6 / 0 / 0 | 2825 |
| test/workflow/current-close-planning-context.test.cjs | passed | 10 / 0 / 0 | 5024 |
| test/workflow/current-execution-context.test.cjs | passed | 24 / 0 / 0 | 81287 |
| test/workflow/deterministic-work-item-validator.test.cjs | passed | 1 / 0 / 0 | 551 |
| test/workflow/semantic-work-item-validator.test.cjs | passed | 2 / 0 / 0 | 222 |
| test/workflow/workflow-application-service.test.cjs | passed | 28 / 0 / 0 | 41318 |
| test/workflow/workflow-execution-application-service.test.cjs | passed | 30 / 0 / 0 | 13498 |
| test/workflow/workflow-planning-ipc.test.cjs | passed | 14 / 0 / 0 | 2976 |
| test/workspaces/workspace-document-review.test.cjs | passed | 1 / 0 / 0 | 262 |
