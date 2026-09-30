# WRB03-02 Implementer Report

## Scope and repository

- Card: Work Card WRB03-02, Feature/Capability exact-Workflow intake, Architect planning, and canonicalization.
- Approved repository root verified from the active checkout and its `dev` branch; the WRB03 card bundle is under `docs/implementation-bundles/workflow-runtime-rebaseline/WRB03/`.
- Branch: `dev`; `origin/dev` was 122 commits behind before this card checkpoint. No push performed.
- Git checkpoint hash: pending commit at report creation; report will not be amended solely to add its own commit hash.

## Implementation

- Added an exact Workflow ID Feature planning service and constrained IPC/preload API. Direct and routed Feature Workflows use the same service; routed provenance is presentation context only.
- Persisted nine bounded Feature Intake fields as SPS `Finding` records linked to the exact Workflow with `relates_to`. This keeps intake durable without creating a direct-start WorkIntake and does not collide with WRB03-01's `workflow_member` accepted-plan marker.
- Derived current Feature assessment disposition from SPS Decisions, invalidated it when intake changes, and gated plan preparation on an accepted current assessment. Revision requests record an SPS Decision and open a fresh Architect cycle without creating plan records.
- Added the Feature workspace, embedded Architect browser attachment, copyable exact-context prompt, manual draft refresh, assessment/planning dispositions, and a read-only map sourced from the canonical SPS Workflow plan.
- Accepted plan disposition calls WRB03-01's atomic `acceptWorkflowPlanningGraph`; no plan Markdown is read for the map. Feature Work Items use kind `feature` by default from the candidate graph.
- Extended existing workflow-service and Workflow Hub renderer suites, and mapped the new behavior and proof in `validation/capability-map.json`.
- Intentionally not created: WorkIntake for direct Features, route-owned planning, canonical Feature-plan Markdown, execution/session/Git/Work Card/validation/repair/checkpoint/integration/close actions, new dependencies, or migrations.

## Validation evidence

- `npm run build` — normal Windows lane, exit 0. Production TypeScript and Vite build passed; Vite emitted its existing large-chunk advisory.
- `node --test test/workflow/workflow-application-service.test.cjs test/renderer/workflow-hub-shell.test.cjs test/project-state/execution-completion.test.cjs test/project-state/current-state-queries.test.cjs test/workflow/production-service-proof.test.cjs` — normal Windows lane, exit 0; 38 passed, 0 failed. Covers exact same-title isolation, no direct WorkIntake, SPS intake, noncanonical revision, assessment gating/state, routed provenance, one graph acceptance, Feature item normalization, read-only graph projection, WIR navigation/handoff, renderer boundary, and WRB03-01 graph regression.
- `npm run validate:plan -- --profile work-item --changes tmp/wrb03-02-changes.json` — normal Windows lane, preview exit 0. The initial preview identified three new source paths without ownership; the capability map was updated and the final preview succeeded. Preview selected the scoped work-item proof; execution was limited to the focused suites above.
- `git diff --check` — exit 0.
- Restricted `npm run build` and focused `node --test ...` attempts each encountered `spawn EPERM` once. As required, each equivalent command was rerun in the normal Windows lane and passed; sandbox results are not counted as passes or source failures.
- External Architect integration was not exercised. Browser attachment and prepare/copy/refresh controls are present; Operator visual review remains optional workflow acceptance, not a card blocker.

## Changed files

- Created: `src/main/featurePlanning/featurePlanningService.ts`, `src/main/featurePlanning/featurePlanningIpc.ts`, `src/shared/featurePlanningContracts.ts`, `src/renderer/app/FeaturePlanningWorkspace.tsx`.
- Modified: `src/main/main.ts`, `src/preload/index.ts`, `src/renderer/app/App.tsx`, `src/renderer/app/architectSurfaceEligibility.ts`, `src/shared/workspaceContracts.ts`, `test/renderer/workflow-hub-shell.test.cjs`, `test/workflow/workflow-application-service.test.cjs`, `validation/capability-map.json`.
- Deleted: none.

## Git and safety

- No unrelated pre-existing changes were present at card start; WRB03-01 was committed as `fa107df9ffc6cd3fb23904baeeec57272f7bccfe` before opening this card.
- No secrets or concrete machine-local paths are intended in committed files. New Feature service and renderer paths were searched for calls to `workPlanningKernel`, `readWorkIntake`, and `workRouteDecisionService`; none were found.
- Required card-local checkpoint commit is pending this report's creation. No push or release action is in scope.

## Remaining work

- No implementation blocker identified for WRB03-02. Continue to WRB03-03 only after this card is committed.
