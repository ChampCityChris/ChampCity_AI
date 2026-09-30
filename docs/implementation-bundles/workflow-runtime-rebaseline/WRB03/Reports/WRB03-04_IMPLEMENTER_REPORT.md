# WRB03-04 Implementer Report

## Scope and repository

- Card: Work Card WRB03-04, exact-instance navigation and legacy planning fence.
- Approved repository root verified from the active checkout; the repository-root decision follows the active WRB03 bundle under `docs/implementation-bundles/workflow-runtime-rebaseline/WRB03/`.
- Branch: `dev`; `origin/dev` was 124 commits behind at this checkpoint (read-only local tracking ref; no fetch or push performed).
- WRB03-03 was committed as `5ff69e36895d40121b64b9c79f304f8223b0eb08` before this card's implementation.

## Implementation

- Feature and Issue workspaces now recover stage from exact Workflow `currentWorkspace` plus current SPS assessment/RCA/plan state. Preparing assessment, planning, or RCA records the corresponding current workspace in the canonical Workflow record.
- Hub dispatch uses exact Workflow type and supported workspace combinations; unsupported type/workspace combinations and closed Feature/Issue instances stay in the generic exact-instance shell. Component keys and APIs retain the exact Workflow ID, so same-type instances keep separate drafts/navigation.
- Closed WIR opens its completed exact-instance summary. Project Creation retains its existing one-time intake path.
- Feature and Issue accepted maps render a read-only structured view of direct/phased topology, Bounded Solution, ordered Phases, WorkItems, dependencies, criteria and validation policy. Issue maps include accepted RCA context; both retain source-baseline identity/status when available. No map execution controls are rendered.
- Issue RCA freshness now includes newly attached Evidence. Adding evidence after correction planning returns the Workflow to its RCA workspace. Issue Intake locks after Architect RCA preparation; map-state intake/evidence mutations are rejected. Feature map state is read-only.
- The exact Feature/Issue Hub workspace APIs call their dedicated Project State services. The exact workflow planning modules contain no Work Planning kernel, route-decision, old Issue bridge, or Markdown owner references.
- Remaining legacy production surfaces retained for existing legacy callers: `src/main/main.ts` still registers the `issueResolution:*` IPC surface and the legacy Issue UI in `src/renderer/app/App.tsx`; `src/main/workCardBuilding/codexImplementerExecutionService.ts` still consumes old Issue execution context; `src/main/planExecution/routedIntegrationService.ts` still uses intake-keyed route-owned planning. The exact Feature/Issue Hub navigation and new planning front halves do not invoke these services. They remain out of scope for removal because those callers serve legacy execution/routed integration paths.
- Intentionally not created: a provider/legacy switch, compatibility identity translation, migrations, dependencies, execution state, checkpoints, or Markdown authority for Feature/Issue planning.

## Validation evidence

- `npm run build` — normal Windows lane, exit 0. TypeScript, Vite renderer bundle, and branding asset copy passed. Vite emitted the existing large-chunk advisory.
- `node --test test/workflow/workflow-application-service.test.cjs test/renderer/workflow-hub-shell.test.cjs test/project-state/current-state-queries.test.cjs test/project-state/evidence-validation-freshness.test.cjs test/workflow/production-service-proof.test.cjs` — normal Windows lane, exit 0; 40 passed, 0 failed. Covered persisted workspace recovery, Feature/Issue exact-instance planning, exact type/workspace dispatch, closed WIR summary, read-only map rendering, Project State freshness, source-backed lazy behavior, and workflow IPC/application paths.
- `npm run validate:plan -- --profile work-item --changes tmp/wrb03-04-changes.json` — normal Windows lane, preview exit 0. Preview selected affected Current Project entry, Workflow, renderer, Project State, Issue, and dependent capabilities. Preview only; targeted execution proof is the test command above.
- `git diff --check` — exit 0.
- Initial restricted `npm run build` and Node test runner invocations each encountered the documented `spawn EPERM`; equivalent commands were run in the normal Windows lane. One initial focused test run exposed a stale expectation for workspace transition after revision; the expectation was corrected and the complete final focused suite passed. No visual Operator acceptance or external Architect conversation is claimed.

## Changed files

- Created: `src/renderer/app/WorkflowPlanningMap.tsx`, `src/renderer/app/workflowPlanningDispatch.ts`, this report.
- Modified: `src/main/featurePlanning/featurePlanningService.ts`, `src/main/issuePlanning/issuePlanningService.ts`, `src/renderer/app/App.tsx`, `src/renderer/app/FeaturePlanningWorkspace.tsx`, `src/renderer/app/IssueWorkflowPlanningWorkspace.tsx`, `src/renderer/app/WorkflowInstanceWorkspace.tsx`, `src/shared/featurePlanningContracts.ts`, `src/shared/issuePlanningContracts.ts`, `test/renderer/workflow-hub-shell.test.cjs`, `test/workflow/workflow-application-service.test.cjs`.
- Deleted: none.

## Git and safety

- The only pre-existing changes at card start were the WRB03-04 implementation edits described here; preceding card changes were committed.
- Exact staged diff, secret/local-path scan, and generated-artifact scan are required before the card-local checkpoint. No absolute local paths or credentials are intended in committed files. No push, release, or unrelated cleanup is in scope.
- Checkpoint hash: pending at report creation; this report will not be amended only to record its own commit hash.

## Remaining work

- No blocker identified for WRB03-04. Proceed to WRB03-05 only after this report and implementation are committed.
