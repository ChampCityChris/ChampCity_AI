# RWS06B Implementer Report

Status: implemented; focused proof passes; broader profile retains unrelated failures.

Verified primary Dev repository, branch `dev`, configured `origin`. RWS06A checkpoint: `58cefd993930771cc4c372019206390d7e3bfb87`. No push. Unrelated working-tree changes preserved.

## Implementation

Converged Feature, Issue, Migration, Integration, Infrastructure and Research on a shared exact-Workflow SQL Planning adapter and renderer. Planning requires current approved Intake and Architect review, matching SourceBaseline ownership and current semantic source revisions. Profiles guide questions and evidence; they do not prescribe topology. Approval uses RWS06A's exact-revision transaction and activates the same candidate identities. Issue plans retain accepted RCA references. Stale candidates can be replaced against their exact current revision after prerequisites are renewed.

Added typed ResearchOutcome as an Architect review member. Research can close through an exact Operator disposition only when its approved typed outcome says no implementation plan is required. Candidate prototypes require new Work Intake follow-up. Historical prose-only Research assessments require a fresh typed review. No-plan closure creates no Plan, WorkItems or Git work.

Existing accepted SQL execution graphs reopen in place. Legacy Markdown is historical; ambiguous prose is never used to invent Workflow identity or semantic bodies. Legacy Feature/Issue raw plan disposition now rejects with the typed-review instruction. Added bounded Planning IPC and preload methods and routed six substantive workspace families through the shared component. WIR routing does not become planning authority. Candidate criteria are persisted/read sequentially to preserve activation ordering in asynchronous stores.

No dependencies or generated assets added. No files deleted. Three new production files are the exact planning service, shared contracts and renderer workspace. Permanent tests extend existing ownership files; no new permanent test file.

## Files and exact scope

- `src/main/architectOutputs/structuredArchitectWorkspaceService.ts`
- `src/main/featurePlanning/featurePlanningService.ts`
- `src/main/issuePlanning/issuePlanningService.ts`
- `src/main/workflow/workflowApplicationIpc.ts`
- `src/preload/index.ts`
- `src/renderer/app/App.tsx`
- `src/shared/architectWorkspaceContracts.ts`
- `src/shared/projectState/domainContracts.ts`
- `src/shared/projectState/entityTypeRegistry.ts`
- `src/shared/projectState/projectStateService.ts`
- `src/shared/projectState/relationshipRegistry.ts`
- `src/shared/workspaceContracts.ts`
- `test/project-state/domain-contracts.test.cjs`
- `test/workflow/workflow-planning-ipc.test.cjs`
- `src/main/workPlanning/exactWorkflowPlanningService.ts`
- `src/shared/exactWorkflowPlanningContracts.ts`
- `src/renderer/app/ExactWorkflowPlanningWorkspace.tsx`
- `validation/capability-map.json`
- `test/workflow/workflow-application-service.test.cjs`

Created this report at the required Implementer_Reports path.

## Validation

- `npm run typecheck`: passed in restricted Windows lane.
- `npm run build`: passed in normal Windows lane; ordinary renderer chunk warning remains. Restricted build/test spawning produced EPERM, so qualified checks used the normal Windows lane.
- `npm run test:affected -- --changes tmp/rws06b-changes.json --preview`: passed after explicitly classifying the three new source paths and maintaining catalog sort order.
- `node --test test/workflow/workflow-application-service.test.cjs test/workflow/workflow-planning-ipc.test.cjs test/project-state/domain-contracts.test.cjs`: 48/48 passed in normal lane.
- After extending all six workflow scenarios through actual registered IPC listeners, `node --test test/workflow/workflow-planning-ipc.test.cjs`: 12/12 passed, including bounded arity and exact-cycle decisions.
- Initial composed receipts `35eacb7e-bc0b-439c-ae61-ecae3cca4109` and `0d10797d-c581-44e5-8ca1-cdd6fea3c83b` exposed an obsolete prompt assertion and eight raw-planning fixtures. Those attributable fixtures were migrated and rerun; no wider pass was claimed.
- Final `npm run test:affected -- --changes tmp/rws06b-changes.json`: normal Windows lane, exit 1, receipt `078f1baa-5860-40f0-ac51-e32e638e1ea5`, source stable, 509386 ms, 105 test files, 893 tests / 870 pass / 22 fail / 1 skipped. Production build passed. Advisory profile budget exceeded. Local detailed receipt: `tmp/rws06b-qualified-receipt.json`.

Remaining failures: toolbox (3), intake renderer (1), project-planning missing workPlanning:status fixture (1), unchanged source-neutral execution fixtures (6), pre-existing agentHarness preload wiring expectation (1), managed source fixtures (8), workflow integration (2). None exercise the new exact Plan approval/Research closure path. Bundle stop conditions are not met.

Focused proof covers all six exact workflow families, currentness and identity rejection, candidate/review/accept/reopen, historical ambiguity rejection, direct versus WIR-linked target equivalence, single-phase rejection/direct default, Issue RCA traceability, stale candidate replacement, and typed no-plan Research closure.

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
| `test/work-card-building/codex-implementer-execution-service.test.cjs` | passed | 39/39 |
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
| `test/workflow/workflow-planning-ipc.test.cjs` | passed | 12/12 |
| `test/workspaces/workspace-document-review.test.cjs` | passed | 1/1 |

## Safety and checkpoint

Attributable diff and staged paths inspected; diff whitespace, added-line secret/concrete local-path and generated-output path scans passed with zero matches. Commit: `RWS06B converge exact workflow planning adapters`; hash pending checkpoint, reported after commit without an amendment solely for the hash. No push.

Operator visual/full-bundle acceptance remains after RWS06J. Next card: RWS06C, not loaded before this checkpoint.
