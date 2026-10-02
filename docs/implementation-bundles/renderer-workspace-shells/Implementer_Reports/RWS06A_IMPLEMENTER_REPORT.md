# RWS06A Implementer Report

Status: implemented with bounded focused proof; wider profile has unrelated failures.

Approved repository root verified as the primary `Dev` repository (`<PROJECT_REPO>`). Branch: `dev`. Remote: `origin` configured; no fetch/push or release mutation performed. Existing unrelated changes were preserved.

## Implementation

Added typed `PlanCandidate`, boundary semantics, and deterministic topology resolution. Direct is the default; supplied invalid grouping fails closed. Phased requires at least two nonempty groups, complete membership, valid acceptance criteria, acyclic dependencies compatible with Phase order, and allowed boundary reasons with bounded rationale/evidence.

The SQL-backed `PlanReviewCycle` anchor stores only identities, membership, source versions, boundary evidence and semantic digest. Candidate bodies exist once in ordinary BoundedSolution, Criterion, Phase and WorkItem records. Until approval they have no accepted execution membership. Review projection is generated from SQL; exact-revision Operator disposition records a Decision. Approval activates the same semantic identities and creates the accepted graph and review Decision in one transaction. Revision/rejection do not activate a graph. Stale source/member versions reject approval. Accepted review projections retain their original semantic versions. Generic record and Decision commands cannot manufacture review anchors/dispositions.

Existing accepted Feature/Issue graph API and its source-neutral/deterministic-policy enforcement remain available. Project Creation redesign, renderer extraction, adapters and prompts belong to subsequent cards and were intentionally not created here. No dependencies, Markdown authority, sidecars, source migration, or runtime imports from test/history were added.

## Files

Created `src/shared/projectState/planReviewContracts.ts` and this report. Modified:
- `src/shared/projectState/domainContracts.ts`
- `src/shared/projectState/entityTypeRegistry.ts`
- `src/shared/projectState/relationshipRegistry.ts`
- `src/shared/projectState/projectStateService.ts`
- `src/main/workflow/workflowApplicationService.ts`
- `test/project-state/execution-completion.test.cjs`
- `test/project-state/domain-contracts.test.cjs`

Deleted: none. Permanent tests extended in existing execution-completion and domain-contract ownership boundaries; no new permanent test file added.

## Validation

- `npm run typecheck`: restricted Windows lane, exit 0.
- `npm run build`: restricted Windows lane, exit 1 (`spawn EPERM` in Vite/esbuild); normal Windows lane rerun exit 0. Ordinary renderer chunk-size warning remains.
- `node --test test/project-state/execution-completion.test.cjs`: restricted lane, exit 1 (`spawn EPERM`); normal lane initially 17/25 passing. Two new stale-source fixture calls omitted the required expected revision and were corrected. Six legacy fixtures fail because they request required deterministic criteria without a SourceBaseline; the enforcing code was verified at HEAD and left unchanged.
- `npm run test:affected -- --changes tmp/rws06a-changes.json --preview`: restricted planner-only lane, exit 0. Repeated with corrected schema fixture in exact changed-path scope.
- `npm run test:affected -- --changes tmp/rws06a-changes.json`: normal Windows lane, initial exit 1, receipt `8b0fec9b-25b2-44a4-b4b1-0184141a7d68`, source stable, 369 tests / 348 pass / 21 fail. One attributable schema fixture omission corrected.
- Same final profile: normal Windows lane, exit 1, receipt `620d6e00-22d8-4f73-9c61-bae1003cc9cf`, source stable, production-build step passed, 369 tests / 349 pass / 20 fail, 159498 ms. Advisory ordinary scope budget exceeded; managed-project-source contributed the longest duration. The receipt is retained locally in `tmp/rws06a-final-receipt.json`; exact-path selection and per-file results are preserved below.
- `node --test --test-name-pattern 'Plan topology|Plan review|rejected and stale-source Plans|all adopted Project State types' test/project-state/execution-completion.test.cjs test/project-state/domain-contracts.test.cjs`: normal Windows lane, exit 0, 6/6 pass against final built source.
- `git diff --check` on attributable paths: exit 0.

Remaining broad failures: repository toolbox status (1), reserved toolbox status (2), intake renderer fixture (1), unchanged source-neutral execution fixtures (6), managed source preservation/integration fixtures (8), workflow integration (2). Toolbox runtime files were already dirty before this card; these surfaces were not changed here. They do not exercise the new PlanReviewCycle path. No wider pass or release acceptance is claimed.

Focused proof covers direct default, valid phased derivation, one-phase rejection, incomplete membership, Phase cycle, contradictory WorkItem dependency, boundary reason/evidence enforcement, exact-version invalidation, rejection, stale sources, SQL persistence and unchanged accepted materialization semantics with the same candidate IDs.

## Exact-path receipt

Changed paths:
- `src/shared/projectState/domainContracts.ts`
- `src/shared/projectState/entityTypeRegistry.ts`
- `src/shared/projectState/relationshipRegistry.ts`
- `src/shared/projectState/projectStateService.ts`
- `src/shared/projectState/planReviewContracts.ts`
- `src/main/workflow/workflowApplicationService.ts`
- `test/project-state/execution-completion.test.cjs`
- `test/project-state/domain-contracts.test.cjs`

| Test | Result | Pass/tests |
| --- | --- | --- |
| `test/agent-harness/agent-harness-core.test.cjs` | passed | 15/15 |
| `test/agent-harness/registered-workspace-registry.test.cjs` | passed | 17/17 |
| `test/agent-harness/repository-enumeration-semantics.test.cjs` | passed | 6/6 |
| `test/agent-harness/repository-file-operations.test.cjs` | passed | 17/17 |
| `test/agent-harness/repository-io-hardening.test.cjs` | failed | 10/11 |
| `test/agent-harness/reserved-toolbox-namespace.test.cjs` | failed | 0/2 |
| `test/characterization/desktop-project-repository-binding.test.cjs` | passed | 4/4 |
| `test/context-menu/local-renderer-context-menu.test.cjs` | passed | 6/6 |
| `test/documents/repository-binding-compatibility.test.cjs` | passed | 1/1 |
| `test/lifecycle/nested-lifecycle.test.cjs` | passed | 5/5 |
| `test/project-intake/post-submit-review-state.test.cjs` | failed | 4/5 |
| `test/project-intake/project-intake-corpus-status.test.cjs` | passed | 7/7 |
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
| `test/source-control/managed-project-source.test.cjs` | failed | 15/23 |
| `test/source-control/workflow-integration-service.test.cjs` | failed | 0/2 |
| `test/validation/capability-map.test.cjs` | passed | 5/5 |
| `test/validation/test-lifecycle-determination.test.cjs` | passed | 3/3 |
| `test/work-card-building/codex-app-server-transport.test.cjs` | passed | 15/15 |
| `test/work-card-planning/development-environment-contract.test.cjs` | passed | 7/7 |
| `test/work-intake/greenfield-source-bootstrap.test.cjs` | passed | 1/1 |
| `test/work-intake/structured-work-intake-capture.test.cjs` | passed | 6/6 |
| `test/workflow/deterministic-work-item-validator.test.cjs` | passed | 1/1 |
| `test/workflow/semantic-work-item-validator.test.cjs` | passed | 2/2 |
| `test/workflow/workflow-application-service.test.cjs` | passed | 28/28 |
| `test/workflow/workflow-execution-application-service.test.cjs` | passed | 27/27 |
| `test/workflow/workflow-planning-ipc.test.cjs` | passed | 3/3 |

## Safety and checkpoint

Attributable staged diff inspected; bounded secret, concrete local-path and generated-output scans passed with zero matches. No secrets, concrete local paths or generated-output paths included. Commit required: `RWS06A add structured plan review and topology resolver`; hash pending checkpoint (reported after commit, no amendment solely for hash). No push.

Remaining Operator validation: visual review and full bundle acceptance after RWS06J. No card-local visual acceptance claimed. Next task: RWS06B; no bundle stop condition identified.
