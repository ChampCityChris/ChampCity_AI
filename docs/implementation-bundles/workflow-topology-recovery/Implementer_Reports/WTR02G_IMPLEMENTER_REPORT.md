# WTR02G Implementer Report

## Scope and starting state

- Repository root verified: the working directory was the approved ChampCity_AI repository root.
- Card: WTR02G — Move SourceCheckpoint and IntegrationRecord Ownership to Workflow.
- Starting SHA: `45949b5233f6fc7ba87611084bdb3f6284efbe0c`.
- Branch: `dev`; remote status at start: 89 commits ahead of `origin/dev`.
- No unrelated working-tree changes were present at start.
- Card-local checkpoint commit is authorized; no push or other Git mutation is authorized.

## Implementation

- `SourceCheckpoint` and `IntegrationRecord` bodies now require `workflowId` and have no `workIntakeId` field. Their entity schemas and semantic relationship endpoints require Workflow ownership.
- Typed Project State create commands take the owner Workflow ID explicitly. They validate a substantive Workflow in the SourceBinding lineage, matching SourceBaseline lineage, target ancestry, ready binding, and same-lineage repair WorkItems. Records link to SourceBinding, Workflow, and any valid target.
- Current Project State views expose `workflowId` for checkpoints and integrations. Shared checkpoint request DTOs require `workflowId` and `repositoryCheckoutId`; the provider-neutral integration request carries both as well.
- Checkpoint execution resolves the baseline anchor checkout under `.champcity/checkouts/<baseline.workflowId>`. It validates the managed checkout path, exact Git top-level/common directory, source line, checkout identity, branch and expected revision; attributable path digests and Git operations use that checkout. Exclusion locks key on the checkout root. Receipt identity includes Workflow and RepositoryCheckout IDs.
- Structured route decisions now return `not-required` with “Routing decision does not own source.” Implementation and disposition wrapper APIs take `workflowId` and resolve SourceBinding directly by Workflow lineage.
- Structured integration keeps its transitional Work Intake entry point but stores canonical records by Workflow lineage. It validates incoming source in the Workflow checkout and runs candidate/policy mechanics from `Dev`. The integration target path advances a clean exact `Dev` checkout in place while preserving target and incoming ref checks.
- Compatibility remains in the old candidate execution adapter only: its `WorkIntakeBranchBinding`, candidate receipt, and completion evidence still use intake identity. No such identity is stored in canonical IntegrationRecord bodies.
- Source Graph output identity remains Work Intake based for WTR02H. Its internal source-record selection now follows Workflow lineages to keep that existing projection compiling and working. SourceReadiness's transitional field is unchanged.
- Additional production files changed for required consumer adaptation: `sourceGraphService.ts` retains the existing Source Graph projection while reading canonical Workflow-owned bodies; `structuredWorkIntakeService.ts` derives its transitional WIR checkpoint presentation through target Workflow lineage; `integrationGit.ts` supports advancing the card-designated checked-out Dev target without switching Dev to a Workflow branch.
- Source Graph identity redesign and the later shared integration-kernel redesign were not implemented.

## Files changed

- `src/main/agentHarness/repository/integrationGit.ts`
- `src/main/sourceControl/semanticCheckpointService.ts`
- `src/main/sourceControl/sourceGraphService.ts`
- `src/main/sourceControl/structuredIntegrationService.ts`
- `src/main/sourceControl/structuredWorkflowCheckpointService.ts`
- `src/main/workIntake/structuredWorkIntakeService.ts`
- `src/shared/projectState/domainContracts.ts`
- `src/shared/projectState/entityTypeRegistry.ts`
- `src/shared/projectState/projectStateService.ts`
- `src/shared/projectState/relationshipRegistry.ts`
- `src/shared/sourceLifecycleContracts.ts`
- `test/project-state/authoritative-context-event-feed.test.cjs`
- `test/project-state/current-state-queries.test.cjs`
- `test/project-state/domain-contracts.test.cjs`
- `test/project-state/source-semantic-references.test.cjs`
- `test/source-control/semantic-checkpoint-service.test.cjs`
- `test/source-control/source-graph-projection.test.cjs`
- `test/source-control/structured-integration.test.cjs`
- `test/source-control/structured-workflow-checkpoint.test.cjs`
- This report.

## Validation

- `npm run build` — normal Windows lane passed; TypeScript, Vite renderer build, and branding asset copy completed. Vite reported its existing large-chunk advisory. A restricted run hit `spawn EPERM` at Vite/esbuild; per repository guidance it was recorded once and rerun in the normal lane.
- `node --test test/project-state/domain-contracts.test.cjs test/project-state/source-semantic-references.test.cjs test/project-state/current-state-queries.test.cjs test/project-state/authoritative-context-event-feed.test.cjs` — normal Windows lane passed, 23 tests.
- `node --test test/source-control/semantic-checkpoint-service.test.cjs` — normal Windows lane passed, 4 tests.
- `node --test test/source-control/structured-workflow-checkpoint.test.cjs` — normal Windows lane passed, 1 test.
- `node --test test/source-control/structured-integration.test.cjs` — normal Windows lane passed, 1 test.
- `node --test test/source-control/workflow-source-materialization.test.cjs` — normal Windows lane passed, 5 tests.
- `node --test test/source-control/source-graph-projection.test.cjs` — normal Windows lane passed, 3 tests; additional consumer regression coverage.
- `npm run validate:plan -- --profile work-item --changes tmp/wtr02g-changes.json` — passed as a preview; 60 tests selected, 15 capabilities, one production-build step.
- `npm run test:affected -- --changes tmp/wtr02g-changes.json` — final normal Windows lane run `d3c1132c-0aee-49b6-8562-dbc5392c97ba`, failed after 296,201 ms. The profile ran the production build successfully and selected 60 tests. Two deferred-scope failures are recorded below; the other 58 selected tests passed. An earlier run produced the same two failures.
- Deferred failures: `test/source-control/source-lifecycle-package.test.cjs` expected a Work Intake source binding to be ready but observed `unprepared`; this fixture still owns pre-WTR03C Project topology/bootstrap assumptions. `test/work-intake/greenfield-source-bootstrap.test.cjs` had two failed assertions in its incompatible partial Dev recovery case (`unprepared` observed instead of `blocked`); Greenfield/Dev bootstrap is WTR03C scope. Neither failure is in a WTR02G-owned focused proof.
- `git diff --check` — passed.

## Safety and Git actions

- No secrets or `.env` contents were inspected or added.
- Durable report paths are repository-relative; no concrete machine path is recorded.
- No generated output, dependency state, or temporary validation manifest is intended for commit.
- The exact card files have been staged after diff review and the bounded secret/local-path/generated-artifact scan. The one authorized checkpoint commit uses subject `WTR02G move checkpoints and integration to Workflow ownership`; its hash is reported in the task completion summary because this report must not be rewritten after commit solely to add its own hash.

## Remaining risks and next task

- The integration candidate engine retains its explicitly transitional intake-keyed receipt contracts for the later shared-integration bundle.
- WTR02H remains deferred for Architect review and release. No WTR02H work was started.
