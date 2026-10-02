# RWS06D Implementer Report

Status: implemented; focused proof passes; composed profile retains unrelated failures.

Work Card RWS06D. Approved primary Dev repository verified as `<PROJECT_REPO>`, branch `dev`, configured GitHub `origin`. Prior RWS06C checkpoint: `22832ee2fe7ec07226e5fd31dfed5bf0070a3b15`. Unrelated working-tree changes preserved. No push.

## Implementation

Added bounded PhaseMapReviewCycle anchor and typed Greenfield Phase Map candidate/review operations. Phase bodies own identity, title, purpose, order, provenance references and live lifecycle state; Criteria own supplied acceptance obligations. SQL relationships own dependencies. The review anchor stores member IDs, exact sources and a digest rather than duplicate semantic bodies. Approval records an exact Operator Decision and activates those same Phase IDs atomically.

Registered Greenfield Phase Map and completion queries now read SQL. Generated Markdown omits canonical completion state and rebuilds from accepted semantic versions; completion and next-Phase selection use live SQL Phase state. Generic approved-map semantic mutation and raw Markdown disposition reject. Exact substantive Workflows use their accepted graph and cannot enter the Greenfield Phase Map service or receive a second topology decision. Accepted phased plans now materialize their declared Phase dependency relationships as well as WorkItem dependencies.

Deterministic legacy adoption requires the known champcity-phase-map block and matching canonical typed metadata, exact SQL Intake project identity, one approved fresh artifact, and current approved structured Project Planning. Conflicting or ambiguous structure fails closed. Source provenance includes bounded repository evidence with content digest. Import preserves the historical file, is idempotent, and creates no prose-derived obligations. Stale legacy maps remain history and require fresh structured output. Editing or removing legacy Markdown after adoption cannot change SQL authority.

Extracted semantic-neutral WorkMapShell with direct and phased layouts, dependency edges, current/next scope and acceptance/readiness. Greenfield Phase Map, exact Workflow maps and Greenfield Work Card selection share it. Read-only maps render without selection buttons; adapters retain terminology and existing selection/begin/continue behavior. StructuredPhaseMapWorkspace reuses PlanReviewShell for candidate review and presents the accepted SQL map before the separate Phase Interview destination. Parent Project Planning identity survives mechanical active Workflow routing changes while semantic source revisions remain checked.

## Scope

Created shared Greenfield Phase Map contracts, structured Phase Map service/read projection, WorkMapShell, StructuredPhaseMapWorkspace and this report. Existing service, registry, IPC/preload, renderer, test owners and capability catalog modified as listed below. Deleted: none. No dependencies, JSON sidecars, generated output or new permanent test file added.

## Validation

- `npm run typecheck`: restricted Windows lane, passed.
- `npm run build`: normal Windows lane, passed, including the final freshness-qualified source. Ordinary renderer chunk warning remains. Previously recorded restricted spawn EPERM justifies the normal Windows execution lane.
- Focused five-file run: normal Windows lane, 67/67 passed, 4044 ms. Covers typed import/idempotence/dependencies, live completion and stable rebuild, stale history isolation, actual IPC review, Criteria projection, direct/phased map rendering, read-only rendering, and SQL Interview evidence routing. Earlier focused failures identified malformed evidence references and a test fixture using a nonexistent store method; both corrected.
- Initial composed run: receipt `adf1b740-bf45-40cd-9311-48176c2f20da`, stable source, 610421 ms, 115 files, 981 tests / 955 pass / 25 fail / 1 skip. Two attributable failures (read-only renderer fixture compatibility and SQL Interview evidence routing) corrected.
- Corrected composed run: receipt `caba0544-b0db-447a-ae46-9f18223c5138`, stable source, 611947 ms, 115 files, 981 tests / 957 pass / 23 fail / 1 skip. Both attributable failures passed.
- An attempted `--concurrency 4` planner/run was rejected before tests because concurrency and resource pools are repository-owned. Used the supported repository defaults thereafter; no validation policy changed.
- `npm run test:affected -- --changes tmp/rws06d-changes.json --preview`: restricted planner-only lane, passed with all 25 attributable code/test/catalog paths selected.
- `npm run test:affected -- --changes tmp/rws06d-changes.json`: final normal Windows lane, exit 1, receipt `4c57a5da-d27f-454c-abd2-79054abb394d`, stable source, 612704 ms, 115 files, 981 tests / 956 pass / 24 fail / 1 skip. Production build passed. Scope-budget advisory exceeded. Detailed local receipt: `tmp/rws06d-final-receipt.json`.

Broad failures retain B's 22: toolbox (3), intake renderer (1), project-planning missing workPlanning:status fixture (1), unchanged source-neutral execution fixtures (6), pre-existing agentHarness preload wiring expectation (1), managed source fixtures (8), workflow integration (2). Newly selected Phase Validation fixture adds one failure: VM-extracted unchanged transitionToWorkflowStep lacks its existing isDevelopmentForeground closure binding. Final run also reproduces C's bounded Tester timing observation (running versus completed). No broad pass or release acceptance claimed. Isolated Tester recheck result is recorded below.

## Safety and checkpoint

Required commit: `RWS06D migrate phase map and extract work map shell`; hash pending checkpoint and reported after commit. No push. Exact staged diff, whitespace and bounded secret/local-path/generated-output scans are completed before that checkpoint.

Remaining Operator work: visual and full-bundle acceptance after RWS06J. No card-local visual acceptance claimed. No bundle stop condition identified. Next card RWS06E remains unopened until checkpoint.

## Attributable files

- `src/shared/projectState/greenfieldPhaseMapContracts.ts`
- `src/shared/projectState/domainContracts.ts`
- `src/shared/projectState/entityTypeRegistry.ts`
- `src/shared/projectState/relationshipRegistry.ts`
- `src/shared/projectState/projectStateService.ts`
- `src/main/phaseMap/structuredPhaseMapService.ts`
- `src/main/phaseMap/structuredPhaseMapReadProjection.ts`
- `src/main/phaseMap/phaseMapService.ts`
- `src/main/projectState/sqliteProjectStateStore.ts`
- `src/main/projectPlanning/structuredProjectPlanningReadProjection.ts`
- `src/main/documents/firstNonApprovedResolver.ts`
- `src/main/currentWorkflow/currentWorkflowService.ts`
- `src/main/workflow/workflowApplicationIpc.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/WorkMapShell.tsx`
- `src/renderer/app/StructuredPhaseMapWorkspace.tsx`
- `src/renderer/app/WorkflowPlanningMap.tsx`
- `src/renderer/app/WorkCardMapWorkspace.tsx`
- `test/project-state/domain-contracts.test.cjs`
- `test/project-state/execution-completion.test.cjs`
- `test/phase-map/phase-map-service.test.cjs`
- `test/workflow/workflow-planning-ipc.test.cjs`
- `validation/capability-map.json`

## Final per-file receipt

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
| `test/phase-close/phase-close-service.test.cjs` | passed | 1/1 |
| `test/phase-close/phase-validation-state.test.cjs` | passed | 12/12 |
| `test/phase-interview/phase-interview-service.test.cjs` | passed | 7/7 |
| `test/phase-map/phase-map-service.test.cjs` | passed | 16/16 |
| `test/phase-planning/phase-planning-service.test.cjs` | passed | 3/3 |
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
| `test/renderer/phase-map-presentation.test.cjs` | passed | 7/7 |
| `test/renderer/phase-validation-renderer-sequencing.test.cjs` | passed | 11/11 |
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
| `test/repository/phase-validation-wiring.test.cjs` | passed | 3/3 |
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
| `test/workflow/phase-validation-production-boundary.test.cjs` | failed | 7/8 |
| `test/workflow/production-service-proof.test.cjs` | passed | 2/2 |
| `test/workflow/semantic-work-item-validator.test.cjs` | passed | 2/2 |
| `test/workflow/workflow-application-service.test.cjs` | passed | 28/28 |
| `test/workflow/workflow-execution-application-service.test.cjs` | passed | 27/27 |
| `test/workflow/workflow-planning-ipc.test.cjs` | passed | 14/14 |
| `test/workspaces/workspace-document-review.test.cjs` | passed | 1/1 |

Isolated recheck: `node --test --test-name-pattern "exact source-backed and source-neutral WorkItems use the bounded Tester lifecycle" test/work-card-building/codex-implementer-execution-service.test.cjs`, normal Windows lane, exit 0, 1/1 passed. The timing failure did not reproduce in isolation.

Staged review corrected three replacement characters in presentation separators to ASCII hyphens after the final receipt; no semantic changes. Final focused proof rerun below. Isolated Tester recheck duration: 21881 ms.

Final separator correction checks: production build passed; Phase Map, Planning IPC, production service and schema checks passed 40/40 (3926 ms); Workflow Hub and Work Card Map renderer owners passed as recorded in the checkpoint log. The checkpoint invocation also named a nonexistent workflow-hub-work-item-map path; Node selected the four existing owners, so the actual renderer owners were run separately. No test pass is attributed to the nonexistent path.

Checkpoint safety results: exact 26-path staged diff reviewed; whitespace check passed; added-line secret and concrete local-path scans and staged generated-output path scan all returned zero matches. Final renderer recheck: 35/35 passed, 1324 ms.
