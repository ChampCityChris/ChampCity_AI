# WRB03-03 Implementer Report

## Scope and repository

- Card: Work Card WRB03-03, exact-Workflow Issue intake, evidence, RCA, correction planning, and canonicalization.
- Approved repository root verified from the active checkout; this card is from `docs/implementation-bundles/workflow-runtime-rebaseline/WRB03/`.
- Branch: `dev`; `origin/dev` was 123 commits behind before this checkpoint. No push performed.
- Git checkpoint hash: pending commit at report creation; the report will not be amended solely to record its own commit hash.

## Implementation

- Added exact Workflow ID Issue planning contracts/service and constrained main IPC/preload APIs. Direct and WIR-routed Issue Workflow instances use the same service; WIR provenance is display context only.
- Added durable Issue Intake as exact-Workflow SPS Findings for observed and expected behavior, reproduction, environment, impact, and constraints.
- Added bounded selected-file evidence intake. Main copies payload bytes to `.champcity/evidence/` under the selected Project, uses a generated filename, records SHA-256 digest, size, media type, and a repository-relative SPS payload reference, and links Evidence to the exact Workflow and observed Finding.
- Added Architect RCA preparation, copy, refresh, and Operator review. Accepted RootCause records relate to the exact Workflow, explain exact Findings, and link supporting Evidence. SPS Decisions track RCA review; a request for revision leaves the last accepted RCA projection intact until a revised RCA is accepted.
- Extended WRB03-01 graph normalization with optional exact-Workflow Finding/RootCause address references, validated and linked atomically with BoundedSolution creation. Issue correction WorkItems must be `fix`; the shared graph normalizer creates WorkItems/Phases/Criteria, planning acceptance, and the read-only Work Item Map transition.
- Added an Issue Workflow renderer selected by exact Workflow ID from the Hub. It uses the embedded Architect browser and exposes no execution, Fix Card, validation, repair, checkpoint, integration, or close actions.
- The Current Project exact Workflow path does not call the legacy Issue planning service, Work Intake route decision service, or the Work Planning kernel.
- Remaining legacy callers, outside this exact-Workflow front half: `src/main/main.ts` still registers legacy `issueResolution:*` IPC; the old UI path in `src/renderer/app/App.tsx` still hosts `IssueResolutionWorkspace`, `IssuePlanningWorkspace`, validation and close surfaces; `src/main/workCardBuilding/codexImplementerExecutionService.ts` and `src/main/planExecution/routedIntegrationService.ts` still import old Issue services. These are retained for their existing callers and are not used by Current Project Hub exact Workflow navigation.
- Intentionally not created: private Issue execution binding, Issue Markdown RCA/plan authority, Fix Card files, migrations, dependencies, or out-of-scope execution/validation/repair/integration workflows.

## Validation evidence

- `npm run build` — normal Windows lane, exit 0. Production TypeScript, Vite renderer, and asset copy passed; Vite emitted its large-chunk advisory.
- `node --test test/workflow/workflow-application-service.test.cjs test/renderer/workflow-hub-shell.test.cjs test/project-state/execution-completion.test.cjs test/project-state/current-state-queries.test.cjs test/project-state/evidence-validation-freshness.test.cjs test/workflow/production-service-proof.test.cjs` — normal Windows lane, exit 0; 47 passed, 0 failed. Includes exact same-title isolation, routed convergence/provenance, hashed evidence ownership, RCA Finding/Evidence relationships, accepted RCA revision preservation, no WorkItems on revision, exact `fix` graph normalization and Solution addresses, lazy source baseline, renderer boundary, WRB03-01 graph and Project State Evidence regression.
- `node --test test/renderer/workflow-hub-shell.test.cjs` — normal Windows lane, exit 0; 15 passed, 0 failed.
- `npm run validate:plan -- --profile work-item --changes tmp/wrb03-03-changes.json` — normal Windows lane, preview exit 0. The preview selected the affected Workflow application, renderer, Project State, evidence, and dependent capabilities. Preview only; execution is represented by the focused test command above.
- `git diff --check` — exit 0.
- Restricted `npm run build` encountered `spawn EPERM` twice during the iterative implementation; the equivalent final build passed in the normal Windows lane. The focused Node test run passed in the normal Windows lane. No external Architect conversation or visual Operator acceptance was claimed.
- The new exact Issue planning modules were searched for `RoutedIssueBridge`, `workPlanningKernel`, `readWorkIntake`, `workRouteDecisionService`, and `issueResolutionService`; no legacy path references were found.

## Changed files

- Created: `src/main/issuePlanning/issuePlanningService.ts`, `src/main/issuePlanning/issuePlanningIpc.ts`, `src/shared/issuePlanningContracts.ts`, `src/renderer/app/IssueWorkflowPlanningWorkspace.tsx`.
- Modified: `src/shared/projectState/projectStateService.ts`, `src/main/main.ts`, `src/preload/index.ts`, `src/renderer/app/App.tsx`, `src/shared/workspaceContracts.ts`, `test/renderer/workflow-hub-shell.test.cjs`, `test/workflow/workflow-application-service.test.cjs`, `validation/capability-map.json`.
- Deleted: none.

## Git and safety

- No unrelated changes were present at card start. WRB03-02 was committed as `5ffd9d8f4d5cd84e040dee447255dd4c66b6fbe0` before this card began.
- The evidence payload writer confines files to the selected Project's `.champcity/evidence/` directory and never exposes renderer filesystem access. Committed state stores digests and relative references, not local absolute paths.
- Required card-local checkpoint commit is pending this report's creation. No push or release operation is in scope.

## Remaining work

- No implementation blocker identified for WRB03-03. Continue to WRB03-04 only after committing this card.
