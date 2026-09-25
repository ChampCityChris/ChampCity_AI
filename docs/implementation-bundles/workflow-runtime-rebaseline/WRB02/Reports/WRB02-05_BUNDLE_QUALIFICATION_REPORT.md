# WRB02-05 Bundle Qualification Report

## Scope and repository

- Card: Work Card WRB02-05, Qualify Workflow Application/Inventory/Routing and Fence the Legacy WIR Pipeline.
- Approved repository root was verified as the active ChampCity_AI repository root; this report uses repository-relative paths only.
- Branch: `dev`, tracking `origin/dev`; 115 commits ahead before this card checkpoint. No remote actions.
- WRB02 card checkpoints:

| Card | Checkpoint SHA |
| --- | --- |
| WRB02-01 | `ee282996ef6a435701782210478a4e5a612f21d0` |
| WRB02-02 | `9da4d827f5a604aadf79dd548e79a1739be7e068` |
| WRB02-03 | `f314b2c7b43571792f67b16a2ea5b1e463b52822` |
| WRB02-04 | `0a7bedd4f3a4fb0014ad3180830ae52d4ddc68c8` |
| WRB02-05 | Pending this report's required checkpoint; the resulting SHA is reported with the completion message because a commit cannot contain its own hash. |

## Qualified Current Project boundary

- The Hub presents grouped Workflow inventory. The exact Workflow ID remains the navigation identity for direct starts, WIR, Project Creation, and routed targets.
- Current Project Work Intake projection and submission require a selected registered Project and fail with “Select or open a Project to use Work Intake.” The branch-owned generic submitter, Greenfield Work Intake fallback, branch picker, branch projection, and retry-source path were removed from production.
- Structured Work Intake capture accepts no base-branch or base-commit fields and does not inspect branch inventory. WIR stores routing authority in Structured Project State, creates no SourceBaseline or SourceBinding, and ends after target creation, provenance linking, closure, and exact target opening.
- Target-specific planning, decomposition, execution, and integration are no longer reachable from the Current Project WIR renderer or main/preload IPC. Current Project direct substantive Workflow starts and the optional WIR remain distinct Hub paths.
- Project Creation remains the one-time New Project path. The existing Greenfield Project Intake body is retained under its exact Project Creation Workflow.
- The architecture boundary is documented in `docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md`.

## Production paths

- Updated main IPC, preload contracts, shared Work Intake contracts, App navigation, structured Work Intake UI, Issue close presentation, and Architect surface eligibility under `src/main/main.ts`, `src/preload/index.ts`, `src/shared/`, and `src/renderer/app/`.
- Removed production branch-writing and route-continuation services: `workIntakeNavigationService.ts`, `routedWorkflowService.ts`, `workIssueRoutingService.ts`, and `workItemDecompositionService.ts`.
- Removed legacy route rail, branch-owned Work Intake workspace, routed assessment/planning/decomposition/execution/integration/Issue bridge and continuation renderer components.
- `workIntakeService.ts` now provides read-only parsing for retained legacy execution records. `workIntakeBranchService.ts` can verify a retained branch binding but no longer creates a branch. Synthetic legacy records used by existing execution/checkpoint tests are built under `test/support/work-intake-fixtures.cjs`.

## Retained transitional dependencies

These internal modules remain because production paths still import their read/verification behavior. They no longer have Current Project WIR UI or IPC entry points. WRB03 owns moving target planning onto substantive Workflow identity.

| Retained module | Exact production callers |
| --- | --- |
| `workIntakeService.readWorkIntake` | `workPlanningKernel.ts`, `workRoutingAssessmentService.ts`, `workRouteDecisionService.ts`, `lifecycleEvidenceCheckpointService.ts`, `operatorDispositionCheckpoint.ts`, `researchCompletionService.ts`, `routedDevelopmentExecutionBinding.ts`, `routedIntegrationService.ts`, and `workItemCheckpointService.ts`. |
| `workIntakeBranchService.verify` | `workRoutingAssessmentService.ts`, `workRouteDecisionService.ts`, `integrationCandidateService.ts`, `integrationRepairPolicyProvider.ts`, `lifecycleEvidenceCheckpointService.ts`, `researchCompletionService.ts`, `routedDevelopmentExecutionBinding.ts`, `routedIntegrationService.ts`, and `workItemCheckpointService.ts`. |
| `workRoutingAssessmentService` and `workRouteDecisionService` | The route decision service consumes the assessment reader. The decision service is still imported by `workPlanningKernel.ts`, `lifecycleEvidenceCheckpointService.ts`, `operatorDispositionCheckpoint.ts`, and `researchCompletionService.ts` as transitional planning/checkpoint context. |
| `workPlanningKernel.ts` | `issueExecutionPlan.ts`, `routedDevelopmentExecutionBinding.ts`, `routedIntegrationService.ts`, and `researchCompletionService.ts`. These are existing planning/execution internals; the removed WIR route continuation service is not an entry point. |

Deleted route-only test files: `test/agent-harness/work-intake-branch-boundary.test.cjs`, `test/characterization/routed-integration-focus.test.cjs`, `test/characterization/routed-research-integration-focus.test.cjs`, `test/issue-resolution/issue-architect-planning-service.test.cjs`, and `test/work-intake/route-disposition-checkpoint.test.cjs`. The renderer WIR test file was rewritten around the structured capture, six-route handoff, closed-target, and IPC-fence cases. Route-only cases were removed from `architect-draft-ingestion.test.cjs`, `architect-output-workspace-repair.test.cjs`, `desktop-issue-lifecycle.test.cjs`, `project-intake-service.test.cjs`, and `work-card-planning-service.test.cjs`; the Research planning service assertion no longer expects the deleted routed continuation projection. Shared Work Card, Issue lifecycle, Architect output, and checkpoint proofs remain.

The validation capability map no longer claims the retired routed-stage and legacy branch-ownership behaviors. It records each surviving test path and current case count.

## Qualification evidence

- `npm run build` — normal Windows lane, exit 0. TypeScript, Vite renderer build, and branding asset copy passed. The first restricted-lane attempt returned the documented Vite/esbuild `spawn EPERM`; the equivalent command was then run once in the normal Windows lane and passed.
- `node --test test/renderer/work-intake-routed-workspaces.test.cjs test/project-state/current-project-entry.test.cjs test/project-state/work-intake-routing.test.cjs test/work-intake/structured-work-intake-capture.test.cjs test/workflow/workflow-application-service.test.cjs test/renderer/workflow-hub-shell.test.cjs test/validation/capability-map.test.cjs test/characterization/desktop-issue-lifecycle.test.cjs test/work-card-planning/work-card-planning-service.test.cjs test/project-intake/project-intake-service.test.cjs` — normal Windows lane, exit 0; 74 tests passed, 0 failed. Covers non-source and source-backed WIR, Greenfield Project Creation, exact instance start/open, no-Project bounded failure, WIR routing and handoff, retained Issue/Work Card regressions, and capability-map integrity.
- `node --test test/architect-outputs/architect-output-workspace-repair.test.cjs test/architect-outputs/architect-draft-ingestion.test.cjs test/project-state/current-project-entry.test.cjs test/work-intake/structured-work-intake-capture.test.cjs test/validation/capability-map.test.cjs` — normal Windows lane, exit 0; 55 tests passed, 0 failed.
- `node --test test/agent-harness/source-checkpoint-boundary.test.cjs` was included in the focused combined run; both checkpoint scenarios passed, including the retained legacy source verification path.
- `npm run validate:plan -- --profile work-item --changes tmp/wrb02-05-validation-changes.json` — passed after classifying `src/shared/workIntakeBranchContracts.ts` under `existing-project-dev-work-source`; preview selected 55 changed paths, 23 capabilities, 758 behaviors, 129 test files, and one static/build step. The card explicitly limits this qualification to bounded selected lanes because the historical affected sweep is 8–10 minutes; that sweep was not executed.
- `git diff --check` — pending final pre-commit safety check.

## Deferred boundary and closure

- Deferred to WRB03: migrate target-specific planning and Architect planning surfaces onto substantive Workflow identity.
- Deferred to WRB03/04: shared planning/execution owner migration and target-specific execution/integration behavior. No WRB03/04 implementation was started in this card.
- No dependency, schema, migration, external integration, launch smoke, or compatibility adapter was added.
- Final checkpoint commit message required by the card: `WRB02-05 qualify Workflow application inventory and routing`. Commit SHA is reported after creation.
- Recommended next task: stop for Architect review of the completed WRB02 bundle; do not begin WRB03 in this run.
