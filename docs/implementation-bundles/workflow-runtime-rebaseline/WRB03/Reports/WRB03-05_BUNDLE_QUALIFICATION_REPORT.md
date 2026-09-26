# WRB03-05 Bundle Qualification Report

## Result and checkpoints

WRB03 qualification is complete. Exact-instance Feature and Issue front halves converge on canonical Workflow-owned Project State graphs, recover their workspace from SPS, and stop at the read-only Work Item Map boundary. WRB04 execution and integration work was not started.

| Card | Checkpoint |
|---|---|
| WRB03-01 | `fa107df9ffc6cd3fb23904baeeec57272f7bccfe` |
| WRB03-02 | `5ffd9d8f4d5cd84e040dee447255dd4c66b6fbe0` |
| WRB03-03 | `5ff69e36895d40121b64b9c79f304f8223b0eb08` |
| WRB03-04 | `170d5b4efe8c7582274adc754dff65616c2323e6` |
| WRB03-05 | Pending this report's checkpoint; hash is recorded in the final task response to avoid a self-referential report amend. |

## Production architecture and authority

- Feature planning: `src/main/featurePlanning/featurePlanningService.ts`, `src/shared/featurePlanningContracts.ts`, and `src/renderer/app/FeaturePlanningWorkspace.tsx`.
- Issue planning: `src/main/issuePlanning/issuePlanningService.ts`, `src/shared/issuePlanningContracts.ts`, and `src/renderer/app/IssueWorkflowPlanningWorkspace.tsx`.
- Exact Hub dispatch and reopen: `src/renderer/app/App.tsx`, `src/renderer/app/workflowPlanningDispatch.ts`, and the exact Workflow's `currentWorkspace` in SPS. Unsupported type/workspace pairs stay in the generic exact-instance shell; Project Creation keeps its one-time path; closed WIR opens its completed exact-instance summary.
- Canonical application and projection: `src/shared/projectState/projectStateService.ts`. `acceptWorkflowPlanningGraph` validates the exact active Workflow, bounded graph, supported topology and WorkItem kinds, candidate references, dependency DAG, explicit Criterion policy, and Issue solution addresses before it atomically creates SPS records and relationships. It records an accepted planning Decision governing the Workflow and BoundedSolution and advances `currentWorkspace` only after graph persistence.
- Ownership model: exact Workflow ID is identity. Workflow type selects semantics. WIR route provenance is contextual history. The canonical graph has BoundedSolution, optional Finding/RootCause address context, WorkItems, optional Phases, Criteria, dependency edges, and WorkItem-to-solution links. BoundedSolution uses the explicit `workflow_member` predicate; Phase and WorkItem membership uses `part_of`. No generic canonical Plan entity was introduced.
- Workflow-scoped `getWorkflowExecutionPlan(projectId, workflowId)` queries the exact owner, rejects cross-Workflow membership/dependencies, orders Phases by their canonical sequence, and returns the same plan-view shape for Feature and Issue. Tests prove application-issued IDs, independent memberships, criterion policy, dependency validation, and rejected cross-Workflow edges.
- WIR provenance does not own or gate a target plan. Direct and routed Features use the same service/contracts; a completed WIR and its route edge coexist with the target's persisted work-item-map and discoverable SPS plan.
- Issue intake Findings and evidence are exact-Workflow-owned. RCA decisions govern the Workflow; RootCauses explain its Findings and are supported by its Evidence. Correction planning normalizes through the same graph primitive with `fix` WorkItems and addresses the accepted RootCause/Finding IDs. A revision request creates no partial correction WorkItems. New evidence after plan preparation clears stale in-memory drafts, returns the Workflow to RCA, makes prior RCA state stale, and blocks correction-plan disposition until RCA is accepted again.
- SourceBaseline identity is captured at Workflow creation and stays immutable while Dev later becomes dirty. Planning reads baseline identity and leaves SourceBinding unprepared. Source-backed Feature/Issue, non-source Feature, and WIR-routed non-source Feature tests create no source checkout, SourceCheckpoint, ImplementationRecord, Validation, repair WorkItem, or IntegrationRecord.
- The Work Item Map in `src/renderer/app/WorkflowPlanningMap.tsx` presents topology, Bounded Solution, ordered Phases, WorkItems, dependencies, Criteria and policy; Issue adds RCA context and either workspace can show source baseline identity/status. It has no execution controls.

## Qualification evidence

- Concurrent same-title direct Feature scenario accepts two plans and proves distinct Solution, WorkItem, Criterion, Workflow projections, and reopen state.
- Structured WIR handoff scenario proves route selection closes WIR and creates the exact Feature target. That target saves its own intake, enters the shared Feature assessment/planning service, accepts a phased graph, and reopens at its own map with routed provenance. Its canonical solution remains discoverable after the WIR is closed.
- Issue scenario creates two same-title Issues with distinct Findings/Evidence, requests RCA revision on one without creating correction work, accepts and revises RCA on the other, exercises evidence freshness invalidation of a pending correction plan, then accepts a `fix` graph with the RCA address links.
- Existing graph/domain proof checks direct/phased topology, deterministic Phase order within each Workflow, explicit validation policies, accepted planning Decision governance, exact Workflow projection, dependency DAG, and cross-Workflow membership/dependency rejection.
- Legacy source-semantic-reference suite classification: the complete file has 6 passing SourceBaseline/SourceBinding/implementation-reference cases and 2 failing in-memory/SQLite variants of the later IntegrationRecord repair case. Those two attempt to attach a repair WorkItem to a superseded Workflow owner; current Project State correctly rejects membership on a non-current Workflow. This is a WRB04 execution/repair fixture, not a WRB03 planning path. The source-baseline portion was rerun with `--test-name-pattern="SourceBaseline|SourceBinding|implementation and disposition checkpoints"` and passed 6/6. The legacy fixture was not rewritten as part of WRB03.
- Remaining legacy callers: `src/main/main.ts` registers the legacy `issueResolution:*` IPC and the older Issue UI branch in `src/renderer/app/App.tsx` consumes that API. `src/main/workCardBuilding/codexImplementerExecutionService.ts` still consumes old Issue execution context; `src/main/planExecution/routedIntegrationService.ts` still uses intake-keyed route-owned planning. Exact Feature/Issue planning services and exact Hub navigation do not import or call those modules. They remain for their separate legacy/execution callers and are not the Current Project exact-Workflow planning authority.

## Commands and results

- `npm run build` — normal Windows lane, exit 0. TypeScript, Vite renderer bundle, and asset copy passed; Vite emitted the large-chunk advisory.
- `node --test test/workflow/workflow-application-service.test.cjs test/project-state/execution-completion.test.cjs test/renderer/workflow-hub-shell.test.cjs test/project-state/current-state-queries.test.cjs test/project-state/evidence-validation-freshness.test.cjs test/workflow/production-service-proof.test.cjs` — normal Windows lane, exit 0; 51 passed, 0 failed.
- `node --test --test-name-pattern="SourceBaseline|SourceBinding|implementation and disposition checkpoints" test/project-state/source-semantic-references.test.cjs` — normal Windows lane, exit 0; 6 passed, 0 failed. The unfiltered suite was separately run and its two WRB04 repair-membership fixture failures are classified above.
- `npm run validate:plan -- --profile work-item --changes tmp/wrb03-05-changes.json` — normal Windows lane, preview exit 0; selects affected planning graph, Feature/Issue, renderer, Workflow/WIR, source, and Project State proof. Preview only; the focused tests above were executed.
- `git diff --check` — exit 0.
- An earlier restricted focused test invocation returned `spawn EPERM`; the equivalent selected proof ran in the normal Windows lane. An earlier unfiltered source-semantic-reference run returned the two classified WRB04 repair-membership failures described above. No broad development/Issue lifecycle suite, visual Operator acceptance, or external Architect interaction is claimed.

## Architecture update and WRB04 entry conditions

- `REBASELINE_2026-09-24.md` now marks WRB03 implemented and pending Architect review.
- `WRB03/ARCHITECT_BASELINE_2026-09-26.md` names `workflow_member` as the BoundedSolution Workflow ownership predicate. The other architecture statements remain aligned with implementation.
- WRB04 must first repair integration candidate storage/ownership for Current Project managed Dev, which is a Git linked worktree whose `.git` is a file. Normalize on exact Git common-directory identity and prove managed Dev → candidate → Dev integration without changing the non-Git Project-container boundary. Evidence remains `WRB02/Repair01/ARCHITECT_REVIEW_2026-09-26.md` and the WRB04 entry in `REBASELINE_2026-09-24.md`.
- No WRB04 shared execution, integration, checkpoint, repair, or phase-close implementation was started. The Work Item Map remains read-only. Stop for human Architect review after this WRB03-05 checkpoint.

## Changed files

- Modified: `docs/implementation-bundles/workflow-runtime-rebaseline/REBASELINE_2026-09-24.md`, `docs/implementation-bundles/workflow-runtime-rebaseline/WRB03/ARCHITECT_BASELINE_2026-09-26.md`, `src/main/featurePlanning/featurePlanningService.ts`, `src/main/issuePlanning/issuePlanningService.ts`, `test/workflow/workflow-application-service.test.cjs`.
- Created: this bundle qualification report.
- Deleted: none. Capability metadata, migrations, dependencies, and generated product files were not changed.

## Git and safety

- Repository root and `dev` branch were verified. WRB03-04 was committed before WRB03-05 began; no unrelated working-tree edits were present.
- Exact staged diff, secret/local-path scan, generated-file review, and `git diff --cached --check` are performed before the checkpoint commit. No local-machine path, secret, generated build output, or test fixture is intended for source control.
- Checkpoint: pending this report's commit. No push, merge, release operation, or post-qualification WRB04 work is in scope.
