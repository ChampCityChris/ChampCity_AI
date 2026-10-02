# RWS06C Implementer Report

Status: implemented; focused proof passes; composed profile retains unrelated failures.

Approved primary Dev repository verified as `<PROJECT_REPO>`, branch `dev`, configured `origin`. Prior checkpoint RWS06B: `4da5a0142da3ed719ee57446f0316521244e382b`. Unrelated working-tree changes preserved; no push.

## Implementation

Added bounded ProjectPlanningReviewCycle identity/version/source/member/digest anchor. Verified project facts use Finding records, governing planning direction uses BoundedSolution, acceptance direction uses Criterion, and accepted choices use exact Operator Decisions and Relationships. Semantic bodies are not duplicated in the anchor. Profile and Roadmap Markdown are generated SQL projections.

Current approved RWS05 Architect Interview semantics and exact Project Creation Workflow are required. Saving revised semantics retains cycle identity and advances its version, invalidating earlier review. Stale sources or members fail closed. Generic mutation/disposition cannot create review authority. The synchronous legacy completion/rail bridge reads SQL, and registered Project Planning Markdown bundle disposition rejects.

Free-form historical Profile/Roadmap documents are preserved, without broad parsing or invented identity. Existing legacy artifacts supply no trustworthy complete typed semantic block for adoption, so current planning requires a fresh structured cycle. Project Planning, Phase Map and Phase Planning remain separate stages. No Phase/WorkItem creation or execution graph acceptance occurs in this card.

Extracted semantic-neutral PlanReviewShell over ArchitectWorkspaceShell. It owns generated review presentation, exact viewed-revision controls, bounded review notes, prepare/copy/refresh feedback and revision instructions, with embedded Architect companion. Greenfield and the six exact Workflow Planning adapters share it. App routes Greenfield Project Planning to the adapter and excludes legacy Markdown review composition/actions there. Browser host mechanics stay in App. Added direct Interview-to-Project-Planning navigation and a separate approved-Planning-to-Phase-Map destination.

## Files and exact scope

- `src/shared/projectState/projectPlanningReviewContracts.ts`
- `src/shared/projectState/domainContracts.ts`
- `src/shared/projectState/entityTypeRegistry.ts`
- `src/shared/projectState/relationshipRegistry.ts`
- `src/shared/projectState/projectStateService.ts`
- `src/main/projectPlanning/structuredProjectPlanningService.ts`
- `src/main/projectPlanning/structuredProjectPlanningReadProjection.ts`
- `src/main/projectPlanning/projectPlanningService.ts`
- `src/main/projectState/sqliteProjectStateStore.ts`
- `src/main/currentWorkflow/currentWorkflowService.ts`
- `src/main/workflow/workflowApplicationIpc.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/PlanReviewShell.tsx`
- `src/renderer/app/StructuredProjectPlanningWorkspace.tsx`
- `src/renderer/app/ExactWorkflowPlanningWorkspace.tsx`
- `test/project-state/domain-contracts.test.cjs`
- `test/workflow/workflow-application-service.test.cjs`
- `test/workflow/workflow-planning-ipc.test.cjs`
- `validation/capability-map.json`
- `src/renderer/app/StructuredArchitectWorkspace.tsx`

Created: shared Project Planning contracts, structured Project Planning service/read projection, PlanReviewShell, StructuredProjectPlanningWorkspace and this report. Other listed paths modified. Deleted: none. No dependencies, sidecars or generated output added. Existing permanent test owners extended; no new permanent test file.

## Validation

- `npm run typecheck`: restricted Windows lane, passed.
- `npm run build`: normal Windows lane, passed after initial source and again after the synchronous-reader correction. Ordinary renderer chunk warning remains. The recorded bundle restricted-lane spawn EPERM justified the normal Windows lane.
- Initial focused Greenfield/schema run: 1/2 passed; new synchronous reader omitted ProjectPlanningReviewCycle. Corrected the explicit SQL snapshot type selection; no semantic fallback introduced.
- `node --test test/workflow/workflow-application-service.test.cjs test/workflow/workflow-planning-ipc.test.cjs test/project-state/domain-contracts.test.cjs`: normal Windows lane, 49/49 passed, 55372 ms. Includes Greenfield generated Profile/Roadmap, exact revision rejection/invalidation, fresh prerequisite requirements, historical preservation/manual Markdown isolation, real IPC arity/identity checks, shared shell rendering and all six unchanged exact Workflow adapters.
- `npm run test:affected -- --changes tmp/rws06c-changes.json --preview`: restricted planner-only lane, final pass. Corrected catalog count field and explicitly classified all five new source files.
- `npm run test:affected -- --changes tmp/rws06c-changes.json`: normal Windows lane, exit 1, receipt `5671182a-be62-48a3-ba86-db79bd4479be`, source stable, 649631 ms, 106 files, 912 tests / 888 pass / 23 fail / 1 skip. Production build passed. Scope-budget advisory exceeded. Local detailed receipt: `tmp/rws06c-receipt.json`.

Broad failures retain B's 22: toolbox (3), intake renderer (1), project-planning missing workPlanning:status fixture (1), unchanged source-neutral execution fixtures (6), pre-existing agentHarness preload wiring expectation (1), managed source fixtures (8), workflow integration (2). Additional broad failure: existing bounded Tester lifecycle expected completed but observed running under composed scheduling. `node --test --test-name-pattern "exact source-backed and source-neutral WorkItems use the bounded Tester lifecycle" test/work-card-building/codex-implementer-execution-service.test.cjs` passed 1/1 in the normal Windows lane (24111 ms), confirming the observed timing failure did not reproduce in isolation. No broad pass or release acceptance claimed.

| Test | Result | Pass/tests |
| --- | --- | --- |
| `test/agent-harness/agent-harness-core.test.cjs` | passed | 15/15 |
| `test/agent-harness/registered-workspace-registry.test.cjs` | passed | 17/17 |
| `test/agent-harness/repository-enumeration-semantics.test.cjs` | passed | 6/6 |
| `test/agent-harness/repository-file-operations.test.cjs` | passed | 17/17 |
| `test/agent-harness/repository-io-hardening.test.cjs` | failed | 10/11 |
| `test/agent-harness/reserved-toolbox-namespace.test.cjs` | failed | 0/2 |
| `test/app-shell/app-shell.test.cjs` | passed | 12/12 |
| `test/app-shell/clipboard-handoff.test.cjs` | passed | 17/17 |
| `test/app-shell/native-dialog.test.cjs` | passed | 1/1 |
| `test/app-shell/native-product-identity.test.cjs` | passed | 4/4 |
| `test/architect-interview/architect-interview-workspace.test.cjs` | passed | 14/14 |
| `test/architect-outputs/architect-draft-ingestion.test.cjs` | passed | 8/8 |
| `test/architect-outputs/architect-output-prompt-contracts.test.cjs` | passed | 10/10 |
| `test/architect-outputs/architect-output-workspace-repair.test.cjs` | passed | 26/26 |
| `test/characterization/desktop-development-lifecycle.test.cjs` | passed | 6/6 |
| `test/characterization/desktop-project-repository-binding.test.cjs` | passed | 4/4 |
| `test/characterization/desktop-runtime-model-selection.test.cjs` | passed | 7/7 |
| `test/context-menu/local-renderer-context-menu.test.cjs` | passed | 6/6 |
| `test/development-environment/development-environment-preflight-service.test.cjs` | passed | 3/3 |
| `test/development-environment/repository-environment-hydration.test.cjs` | passed | 6/6 |
| `test/documents/artifact-source-revision.test.cjs` | passed | 1/1 |
| `test/documents/artifact-transaction.test.cjs` | passed | 2/2 |
| `test/documents/canonical-markdown-document.test.cjs` | passed | 7/7 |
| `test/documents/disposition-transaction.test.cjs` | passed | 18/18 |
| `test/documents/planning-document-service.test.cjs` | passed | 8/8 |
| `test/documents/planning-repository-snapshot.test.cjs` | passed | 9/9 |
| `test/documents/repository-binding-compatibility.test.cjs` | passed | 1/1 |
| `test/documents/single-file-workflow.test.cjs` | passed | 1/1 |
| `test/lifecycle/evidence-lifecycle-resolver.test.cjs` | passed | 1/1 |
| `test/lifecycle/nested-lifecycle.test.cjs` | passed | 5/5 |
| `test/project-close/project-close-service.test.cjs` | passed | 1/1 |
| `test/project-intake/post-submit-review-state.test.cjs` | failed | 4/5 |
| `test/project-intake/project-intake-corpus-status.test.cjs` | passed | 7/7 |
| `test/project-intake/project-intake-service.test.cjs` | passed | 3/3 |
| `test/project-planning/project-planning-service.test.cjs` | failed | 27/28 |
| `test/project-state/authoritative-context-event-feed.test.cjs` | passed | 4/4 |
| `test/project-state/current-project-entry.test.cjs` | passed | 22/22 |
| `test/project-state/current-project-registration.test.cjs` | passed | 7/7 |
| `test/project-state/current-state-queries.test.cjs` | passed | 4/4 |
| `test/project-state/decision-disposition.test.cjs` | passed | 8/8 |
| `test/project-state/domain-contracts.test.cjs` | passed | 8/8 |
| `test/project-state/evidence-validation-freshness.test.cjs` | passed | 6/6 |
| `test/project-state/execution-completion.test.cjs` | failed | 19/25 |
| `test/project-state/projection-export.test.cjs` | passed | 4/4 |
| `test/project-state/revision-history-lineage.test.cjs` | passed | 3/3 |
| `test/project-state/service-boundary.test.cjs` | passed | 3/3 |
| `test/project-state/source-semantic-references.test.cjs` | passed | 8/8 |
| `test/project-state/sqlite-schema-migrations.test.cjs` | passed | 6/6 |
| `test/project-state/sqlite-store-conformance.test.cjs` | passed | 10/10 |
| `test/project-state/state-change-outbox.test.cjs` | passed | 7/7 |
| `test/project-state/store-conformance.test.cjs` | passed | 4/4 |
| `test/project-state/tester-state-mapping.test.cjs` | passed | 8/8 |
| `test/project-state/work-intake-routing.test.cjs` | passed | 8/8 |
| `test/project-state/workflow-type-registry.test.cjs` | passed | 5/5 |
| `test/reconstruction/reconstruction-repair01.test.cjs` | passed | 2/2 |
| `test/renderer/architect-interview-refresh-state.test.cjs` | passed | 2/2 |
| `test/renderer/architect-output-viewed-revisions.test.cjs` | passed | 5/5 |
| `test/renderer/architect-output-workspace-source.test.cjs` | passed | 4/4 |
| `test/renderer/codex-execution-presentation-ownership.test.cjs` | passed | 3/3 |
| `test/renderer/document-review-surface-source.test.cjs` | passed | 4/4 |
| `test/renderer/evidence-driven-refresh-coordinator.test.cjs` | passed | 8/8 |
| `test/renderer/execution-context-dashboard.test.cjs` | passed | 3/3 |
| `test/renderer/figma-redesign-shell.test.cjs` | passed | 12/12 |
| `test/renderer/issue-architect-planning-workspace.test.cjs` | passed | 2/2 |
| `test/renderer/project-planning-blocker-banner.test.cjs` | passed | 6/6 |
| `test/renderer/project-rail-presentation.test.cjs` | passed | 16/16 |
| `test/renderer/source-control-graph-layout.test.cjs` | passed | 4/4 |
| `test/renderer/work-card-building-review-workspace.test.cjs` | passed | 7/7 |
| `test/renderer/work-card-close-workspace.test.cjs` | passed | 8/8 |
| `test/renderer/work-card-intake-workspace.test.cjs` | passed | 3/3 |
| `test/renderer/work-card-map-workspace.test.cjs` | passed | 5/5 |
| `test/renderer/work-card-plan-presentation.test.cjs` | passed | 4/4 |
| `test/renderer/work-card-repair-workspace.test.cjs` | passed | 2/2 |
| `test/renderer/work-card-report-review-workspace.test.cjs` | passed | 4/4 |
| `test/renderer/work-intake-routed-workspaces.test.cjs` | passed | 12/12 |
| `test/renderer/workflow-hub-shell.test.cjs` | passed | 30/30 |
| `test/repository/runtime-wiring-source.test.cjs` | failed | 27/28 |
| `test/resolver/first-non-approved-resolver.test.cjs` | passed | 1/1 |
| `test/resolver/single-file-resolver.test.cjs` | passed | 3/3 |
| `test/source-control/managed-project-source.test.cjs` | failed | 15/23 |
| `test/source-control/workflow-integration-service.test.cjs` | failed | 0/2 |
| `test/validation/capability-map.test.cjs` | passed | 5/5 |
| `test/validation/test-lifecycle-determination.test.cjs` | passed | 3/3 |
| `test/work-card-building/codex-app-server-transport.test.cjs` | passed | 15/15 |
| `test/work-card-building/codex-implementer-execution-service.test.cjs` | failed | 38/39 |
| `test/work-card-building/codex-managed-connections.test.cjs` | passed | 7/7 |
| `test/work-card-building/codex-runtime-initializer-client.test.cjs` | passed | 4/4 |
| `test/work-card-building/codex-runtime-manager.test.cjs` | passed | 16/17 |
| `test/work-card-building/work-card-building-review-service.test.cjs` | passed | 7/7 |
| `test/work-card-intake/work-card-intake-service.test.cjs` | passed | 9/9 |
| `test/work-card-loop/work-card-loop-state-service.test.cjs` | passed | 14/14 |
| `test/work-card-planning/development-environment-contract.test.cjs` | passed | 7/7 |
| `test/work-card-planning/work-card-planning-service.test.cjs` | passed | 14/14 |
| `test/work-card-repair/work-card-repair-service.test.cjs` | passed | 7/7 |
| `test/work-card-validation/work-card-validation-service.test.cjs` | passed | 7/7 |
| `test/work-intake/greenfield-source-bootstrap.test.cjs` | passed | 1/1 |
| `test/work-intake/structured-work-intake-capture.test.cjs` | passed | 6/6 |
| `test/workflow/current-close-planning-context.test.cjs` | passed | 10/10 |
| `test/workflow/current-execution-context.test.cjs` | passed | 24/24 |
| `test/workflow/deterministic-work-item-validator.test.cjs` | passed | 1/1 |
| `test/workflow/production-service-proof.test.cjs` | passed | 2/2 |
| `test/workflow/semantic-work-item-validator.test.cjs` | passed | 2/2 |
| `test/workflow/workflow-application-service.test.cjs` | passed | 28/28 |
| `test/workflow/workflow-execution-application-service.test.cjs` | passed | 27/27 |
| `test/workflow/workflow-planning-ipc.test.cjs` | passed | 13/13 |
| `test/workspaces/workspace-document-review.test.cjs` | passed | 1/1 |

## Safety and checkpoint

Attributable diff inspected; whitespace, added-line secret/concrete local-path and generated-output path scans passed with zero matches. Required commit: `RWS06C migrate greenfield project planning and extract plan shell`; hash pending checkpoint and reported after commit. No push.

Remaining Operator work: visual and full-bundle acceptance after RWS06J. No card-local visual acceptance or wider pass claimed. No bundle stop condition identified. Next card RWS06D remains unopened until checkpoint.
