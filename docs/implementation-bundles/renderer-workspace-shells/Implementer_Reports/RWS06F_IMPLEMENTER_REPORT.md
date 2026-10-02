# RWS06F Implementer Report

Status: implemented; focused proof passes; final affected-profile qualification recorded below.

Work Card RWS06F. Approved primary Dev repository verified as `<PROJECT_REPO>`, branch `dev`, configured GitHub `origin`. Prior RWS06E checkpoint: `d81af3acb3d333c47f179fcf90163d8e53c0467c`. Unrelated working-tree changes preserved. No push.

## Implementation and evidence

One bounded WorkItemPlanningContract addresses exact Workflow/WorkItem IDs and expected SQL revision, implementation boundaries, repository-relative affected paths, proof intent, optional detailed Criteria and optional typed decomposition. Main application service constructs the Architect handoff and parses/validates JSON. Both Greenfield Formal Work Card and exact Workflow execution planning use WorkItemPlanningWorkspace and the existing RWS05 ArchitectWorkspaceShell through PlanReviewShell. Renderer owns presentation and sends raw bounded text through preload; it does not construct Architect prompts, parse Architect planning JSON, synthesize replacement outcomes, or decide persistence rules.

SQL WorkItem owns execution fields once. Dedicated contractRevision and contractReviewRequired separate semantic review from mechanical lifecycle updates. Operator Decisions govern the exact current contract revision. Stale saves/reviews fail; revised contracts invalidate prior approval; generic semantic and relationship mutations cannot bypass typed planning. Detailed Criteria live in ordinary Criterion entities and retain inherited accepted obligations. Source-backed work requires accepted affected paths; source-neutral work requires empty paths and cannot introduce required deterministic ValidationCatalog obligations. Existing Feature/Issue failed-attempt and source-restoration safety checks remain in the application service. Existing explicit legacy accept command records the same typed Operator approval for compatibility. Implementer attempt creation enforces required current contract approval.

Greenfield uses the same WorkItem fields/Criteria and exact accepted Phase Planning ownership. Generated Formal Markdown is readability only: editing, rejecting, deleting, or failing to create it cannot change SQL eligibility. Building eligibility and registered loop projection read current SQL contract disposition. Legacy Formal disposition/revision commands reject in registered Projects, and historical Formal documents no longer override structured routing. Later cards own runtime and close convergence; this checkpoint does not claim final bundle end-to-end acceptance.

Typed sibling decomposition retains the existing atomic Criterion transfer/elevation/splitting, incoming/outgoing dependency mapping, DAG checks, history gates and immutable WorkItem provenance. It supports approved Greenfield Phase members without invalidating the original accepted review. Live map/preparation query explicit replacement descendants and preserve original review semantics. Direct-to-phased correction requires explicit Phase assignments for every unchanged/replacement WorkItem, required Phase acceptance Criteria, allowed boundary reasons/rationale/evidence and deterministic RWS06A topology validation. Invalid correction writes nothing. Phase dependencies and boundary audit provenance persist; no size/effort inference creates Phases. The retained unregistered legacy correction path also invokes the resolver.

Legacy migration accepts fresh readable explicit canonical workItemContract metadata only with exact Workflow, WorkItem and expected SQL revision, no decomposition and no ambiguity. It records metadata-digest provenance, adopts prior exact Operator approval when present, refreshes the SQL projection, and is idempotent. Free-form Markdown remains untouched as historical evidence; it is never parsed into execution, completion or review authority. Tests prove historical-file deletion after adoption does not change SQL state.

## Scope

Created shared WorkItem planning contract, main structured WorkItem planning service, bounded renderer adapter, and this report. Extended existing schema/service/IPC, registered Formal/loop read bridges, decomposition and established test owners. No new dependencies, sidecars, generated outputs or permanent test file. Exact attributable paths follow. Runtime fixture now updates lifecycle state alone instead of resubmitting semantic fields under a reviewed contract.

## Validation

- Typecheck and production build passed in the normal Windows validation lane. Ordinary renderer chunk warning remains; previously recorded restricted spawn EPERM justifies the lane.
- Initial focused run: 47/49; fixed a fixture's assumed pre-approval WorkItem version and a too-broad Repair edge guard. Three repaired contract/Repair/topology cases then passed.
- Focused final three suites: 50/50 passed, 22311 ms, including inherited Criterion preservation, exact legacy import and renderer authority proof.
- Targeted exact source-neutral fake App Server and bounded Tester lifecycle: 2/2 passed, 21388 ms.
- Initial affected run `d27d3bef-0376-4d05-9bb8-8933dafe0a2a`: 109 files, 920 tests, 894 passed, 25 failed, 1 skipped, 533773 ms. Source changed during the Criteria refinement; this is diagnostic evidence only, not final qualification. Its new fixture failure resubmitted the whole WorkItem body to set blocked; the fixture now changes only workState. Existing unrelated failures remain outside this card.
- Final affected profile `49f012e0-edcc-4479-91b2-33a73b7ad71d`: 109 files, 921 tests, 896 passed, 24 failed, 1 skipped; 539409 ms; production build passed; sourceStable=true. No unavailable or blocked test files. Failures match E: toolbox (3), intake renderer (1), unchanged source-neutral completion fixtures (6), project-planning VM fixture missing workPlanning:status (1), pre-existing agentHarness preload expectation (1), managed source fixtures (8), workflow integration (2), bounded Tester timing (1; isolated targeted run passed), unchanged Phase Validation VM closure fixture (1).

No broad pass, visual acceptance, external integration success or release acceptance claimed. Architect and Operator review follows completion of all A-J cards.

## Safety and checkpoint

Exact-path whitespace/staged-content scan: no whitespace errors; no credential values, private keys, concrete local paths or generated/runtime artifacts in attributable added lines.. Unrelated changes excluded. No secrets, concrete local paths, generated artifacts or dependency/runtime directories staged. Commit hash pending checkpoint creation; communicated after the commit without amending this report solely for the hash. No push.

## Attributable files

- `src/main/documents/firstNonApprovedResolver.ts`
- `src/main/phasePlanning/structuredPhaseLoopReadProjection.ts`
- `src/main/workCardLoop/workCardLoopStateService.ts`
- `src/main/workCardPlanning/workCardPlanningService.ts`
- `src/main/workCardPlanning/workItemDecomposition.ts`
- `src/main/workCardPlanning/structuredWorkItemPlanningService.ts`
- `src/main/workflow/workflowApplicationIpc.ts`
- `src/main/workflow/workflowExecutionApplicationService.ts`
- `src/preload/index.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/WorkflowExecutionWorkspace.tsx`
- `src/renderer/app/WorkItemPlanningWorkspace.tsx`
- `src/shared/projectState/domainContracts.ts`
- `src/shared/projectState/entityTypeRegistry.ts`
- `src/shared/projectState/projectStateService.ts`
- `src/shared/projectState/workItemPlanningContracts.ts`
- `src/shared/workItemDecompositionContracts.ts`
- `src/shared/workspaceContracts.ts`
- `test/phase-planning/phase-planning-service.test.cjs`
- `test/work-card-planning/work-card-planning-service.test.cjs`
- `test/workflow/workflow-execution-application-service.test.cjs`
- `validation/capability-map.json`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- `docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06F_IMPLEMENTER_REPORT.md`

## Final per-file receipt

| Test file | Status | Pass / Fail / Skip | Duration ms |
|---|---|---:|---:|
| `test/agent-harness/agent-harness-core.test.cjs` | passed | 15 / 0 / 0 | 1505 |
| `test/agent-harness/registered-workspace-registry.test.cjs` | passed | 17 / 0 / 0 | 14906 |
| `test/agent-harness/repository-enumeration-semantics.test.cjs` | passed | 6 / 0 / 0 | 1731 |
| `test/agent-harness/repository-file-operations.test.cjs` | passed | 17 / 0 / 0 | 1023 |
| `test/agent-harness/repository-io-hardening.test.cjs` | failed | 10 / 1 / 0 | 4903 |
| `test/agent-harness/reserved-toolbox-namespace.test.cjs` | failed | 0 / 2 / 0 | 1009 |
| `test/app-shell/app-shell.test.cjs` | passed | 12 / 0 / 0 | 944 |
| `test/app-shell/clipboard-handoff.test.cjs` | passed | 17 / 0 / 0 | 548 |
| `test/app-shell/native-dialog.test.cjs` | passed | 1 / 0 / 0 | 426 |
| `test/app-shell/native-product-identity.test.cjs` | passed | 4 / 0 / 0 | 646 |
| `test/architect-outputs/architect-draft-ingestion.test.cjs` | passed | 8 / 0 / 0 | 374 |
| `test/architect-outputs/architect-output-prompt-contracts.test.cjs` | passed | 10 / 0 / 0 | 107025 |
| `test/architect-outputs/architect-output-workspace-repair.test.cjs` | passed | 26 / 0 / 0 | 28399 |
| `test/characterization/desktop-development-lifecycle.test.cjs` | passed | 6 / 0 / 0 | 281779 |
| `test/characterization/desktop-project-repository-binding.test.cjs` | passed | 4 / 0 / 0 | 1262 |
| `test/characterization/desktop-runtime-model-selection.test.cjs` | passed | 7 / 0 / 0 | 225 |
| `test/context-menu/local-renderer-context-menu.test.cjs` | passed | 6 / 0 / 0 | 244 |
| `test/development-environment/development-environment-preflight-service.test.cjs` | passed | 3 / 0 / 0 | 509 |
| `test/development-environment/repository-environment-hydration.test.cjs` | passed | 6 / 0 / 0 | 3246 |
| `test/documents/artifact-source-revision.test.cjs` | passed | 1 / 0 / 0 | 324 |
| `test/documents/artifact-transaction.test.cjs` | passed | 2 / 0 / 0 | 219 |
| `test/documents/canonical-markdown-document.test.cjs` | passed | 7 / 0 / 0 | 394 |
| `test/documents/planning-document-service.test.cjs` | passed | 8 / 0 / 0 | 717 |
| `test/documents/planning-repository-snapshot.test.cjs` | passed | 9 / 0 / 0 | 1032 |
| `test/documents/repository-binding-compatibility.test.cjs` | passed | 1 / 0 / 0 | 183 |
| `test/documents/single-file-workflow.test.cjs` | passed | 1 / 0 / 0 | 618 |
| `test/lifecycle/evidence-lifecycle-resolver.test.cjs` | passed | 1 / 0 / 0 | 337 |
| `test/lifecycle/nested-lifecycle.test.cjs` | passed | 5 / 0 / 0 | 266 |
| `test/phase-close/phase-close-service.test.cjs` | passed | 1 / 0 / 0 | 681 |
| `test/phase-close/phase-validation-state.test.cjs` | passed | 12 / 0 / 0 | 167017 |
| `test/phase-interview/phase-interview-service.test.cjs` | passed | 7 / 0 / 0 | 5966 |
| `test/phase-map/phase-map-service.test.cjs` | passed | 16 / 0 / 0 | 4664 |
| `test/phase-planning/phase-planning-service.test.cjs` | passed | 6 / 0 / 0 | 12546 |
| `test/project-intake/post-submit-review-state.test.cjs` | failed | 4 / 1 / 0 | 548 |
| `test/project-intake/project-intake-corpus-status.test.cjs` | passed | 7 / 0 / 0 | 404 |
| `test/project-state/authoritative-context-event-feed.test.cjs` | passed | 4 / 0 / 0 | 407 |
| `test/project-state/current-project-entry.test.cjs` | passed | 22 / 0 / 0 | 82038 |
| `test/project-state/current-project-registration.test.cjs` | passed | 7 / 0 / 0 | 696 |
| `test/project-state/current-state-queries.test.cjs` | passed | 4 / 0 / 0 | 532 |
| `test/project-state/decision-disposition.test.cjs` | passed | 8 / 0 / 0 | 557 |
| `test/project-state/domain-contracts.test.cjs` | passed | 8 / 0 / 0 | 383 |
| `test/project-state/evidence-validation-freshness.test.cjs` | passed | 6 / 0 / 0 | 543 |
| `test/project-state/execution-completion.test.cjs` | failed | 19 / 6 / 0 | 1198 |
| `test/project-state/projection-export.test.cjs` | passed | 4 / 0 / 0 | 482 |
| `test/project-state/revision-history-lineage.test.cjs` | passed | 3 / 0 / 0 | 392 |
| `test/project-state/service-boundary.test.cjs` | passed | 3 / 0 / 0 | 298 |
| `test/project-state/source-semantic-references.test.cjs` | passed | 8 / 0 / 0 | 687 |
| `test/project-state/sqlite-schema-migrations.test.cjs` | passed | 6 / 0 / 0 | 658 |
| `test/project-state/sqlite-store-conformance.test.cjs` | passed | 10 / 0 / 0 | 1830 |
| `test/project-state/state-change-outbox.test.cjs` | passed | 7 / 0 / 0 | 604 |
| `test/project-state/store-conformance.test.cjs` | passed | 4 / 0 / 0 | 209 |
| `test/project-state/tester-state-mapping.test.cjs` | passed | 8 / 0 / 0 | 530 |
| `test/project-state/work-intake-routing.test.cjs` | passed | 8 / 0 / 0 | 545 |
| `test/project-state/workflow-type-registry.test.cjs` | passed | 5 / 0 / 0 | 281 |
| `test/renderer/architect-interview-refresh-state.test.cjs` | passed | 2 / 0 / 0 | 232 |
| `test/renderer/architect-output-viewed-revisions.test.cjs` | passed | 5 / 0 / 0 | 522 |
| `test/renderer/architect-output-workspace-source.test.cjs` | passed | 4 / 0 / 0 | 553 |
| `test/renderer/codex-execution-presentation-ownership.test.cjs` | passed | 3 / 0 / 0 | 316 |
| `test/renderer/document-review-surface-source.test.cjs` | passed | 4 / 0 / 0 | 846 |
| `test/renderer/evidence-driven-refresh-coordinator.test.cjs` | passed | 8 / 0 / 0 | 433 |
| `test/renderer/execution-context-dashboard.test.cjs` | passed | 3 / 0 / 0 | 323 |
| `test/renderer/figma-redesign-shell.test.cjs` | passed | 12 / 0 / 0 | 617 |
| `test/renderer/issue-architect-planning-workspace.test.cjs` | passed | 2 / 0 / 0 | 416 |
| `test/renderer/phase-map-presentation.test.cjs` | passed | 7 / 0 / 0 | 386 |
| `test/renderer/phase-validation-renderer-sequencing.test.cjs` | passed | 11 / 0 / 0 | 1281 |
| `test/renderer/project-rail-presentation.test.cjs` | passed | 16 / 0 / 0 | 616 |
| `test/renderer/source-control-graph-layout.test.cjs` | passed | 4 / 0 / 0 | 461 |
| `test/renderer/work-card-building-review-workspace.test.cjs` | passed | 7 / 0 / 0 | 879 |
| `test/renderer/work-card-close-workspace.test.cjs` | passed | 8 / 0 / 0 | 516 |
| `test/renderer/work-card-intake-workspace.test.cjs` | passed | 3 / 0 / 0 | 359 |
| `test/renderer/work-card-map-workspace.test.cjs` | passed | 6 / 0 / 0 | 431 |
| `test/renderer/work-card-plan-presentation.test.cjs` | passed | 4 / 0 / 0 | 365 |
| `test/renderer/work-card-repair-workspace.test.cjs` | passed | 2 / 0 / 0 | 783 |
| `test/renderer/work-card-report-review-workspace.test.cjs` | passed | 4 / 0 / 0 | 357 |
| `test/renderer/work-intake-routed-workspaces.test.cjs` | passed | 12 / 0 / 0 | 647 |
| `test/renderer/workflow-hub-shell.test.cjs` | failed | 29 / 1 / 0 | 1633 |
| `test/repository/phase-validation-wiring.test.cjs` | passed | 3 / 0 / 0 | 17375 |
| `test/repository/runtime-wiring-source.test.cjs` | failed | 27 / 1 / 0 | 1416 |
| `test/resolver/first-non-approved-resolver.test.cjs` | passed | 1 / 0 / 0 | 421 |
| `test/resolver/single-file-resolver.test.cjs` | passed | 3 / 0 / 0 | 306 |
| `test/source-control/managed-project-source.test.cjs` | failed | 15 / 8 / 0 | 144794 |
| `test/source-control/semantic-checkpoint-service.test.cjs` | passed | 6 / 0 / 0 | 61438 |
| `test/source-control/structured-workflow-checkpoint.test.cjs` | passed | 1 / 0 / 0 | 16802 |
| `test/source-control/workflow-integration-service.test.cjs` | failed | 0 / 2 / 0 | 31783 |
| `test/validation/capability-map.test.cjs` | passed | 5 / 0 / 0 | 309 |
| `test/validation/test-lifecycle-determination.test.cjs` | passed | 3 / 0 / 0 | 185 |
| `test/work-card-building/codex-app-server-transport.test.cjs` | passed | 15 / 0 / 0 | 832 |
| `test/work-card-building/codex-implementer-execution-service.test.cjs` | failed | 38 / 1 / 0 | 166289 |
| `test/work-card-building/codex-managed-connections.test.cjs` | passed | 7 / 0 / 0 | 2341 |
| `test/work-card-building/codex-runtime-initializer-client.test.cjs` | passed | 4 / 0 / 0 | 180 |
| `test/work-card-building/codex-runtime-manager.test.cjs` | passed | 16 / 0 / 1 | 426 |
| `test/work-card-building/work-card-building-review-service.test.cjs` | passed | 7 / 0 / 0 | 1096 |
| `test/work-card-intake/work-card-intake-service.test.cjs` | passed | 9 / 0 / 0 | 69021 |
| `test/work-card-loop/work-card-loop-state-service.test.cjs` | passed | 14 / 0 / 0 | 18084 |
| `test/work-card-planning/development-environment-contract.test.cjs` | passed | 7 / 0 / 0 | 203 |
| `test/work-card-planning/work-card-planning-service.test.cjs` | passed | 15 / 0 / 0 | 27881 |
| `test/work-card-repair/work-card-repair-service.test.cjs` | passed | 7 / 0 / 0 | 1131 |
| `test/work-card-validation/work-card-validation-service.test.cjs` | passed | 7 / 0 / 0 | 1534 |
| `test/work-intake/greenfield-source-bootstrap.test.cjs` | passed | 1 / 0 / 0 | 4875 |
| `test/work-intake/structured-work-intake-capture.test.cjs` | passed | 6 / 0 / 0 | 3314 |
| `test/workflow/current-close-planning-context.test.cjs` | passed | 10 / 0 / 0 | 5257 |
| `test/workflow/current-execution-context.test.cjs` | passed | 24 / 0 / 0 | 80581 |
| `test/workflow/deterministic-work-item-validator.test.cjs` | passed | 1 / 0 / 0 | 210 |
| `test/workflow/phase-validation-production-boundary.test.cjs` | failed | 7 / 1 / 0 | 33073 |
| `test/workflow/semantic-work-item-validator.test.cjs` | passed | 2 / 0 / 0 | 310 |
| `test/workflow/workflow-application-service.test.cjs` | passed | 28 / 0 / 0 | 39203 |
| `test/workflow/workflow-execution-application-service.test.cjs` | passed | 29 / 0 / 0 | 8094 |
| `test/workflow/workflow-planning-ipc.test.cjs` | passed | 14 / 0 / 0 | 2667 |
| `test/workspaces/workspace-document-review.test.cjs` | passed | 1 / 0 / 0 | 243 |
