<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "implementer-report",
  "artifactRevision": 1,
  "participationRole": "evidence",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC28"
  },
  "workflowData": {
    "title": "Implementer Report - WC28 Current Project Startup, Navigation, and Phase Map Clarity",
    "status": "implemented_not_committed",
    "gitMutationAuthorized": false,
    "intendedCommitMessage": "WC28 current project startup navigation and phase map clarity"
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "Git mutation was prohibited by the Work Card.",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Implementer Report - WC28 Current Project Startup, Navigation, and Phase Map Clarity

Pass type: numbered Work Card implementation  
Work Card: WC28  
Repository path inspected: verified approved repo root  
Branch observed: `feature/phase-04-wc01-repair01-evidence-derived-workflow`  
Remote observed: `origin` -> approved public repository URL  
Git mutation authorization: prohibited  
Commit created: no  
Commit hash: not applicable; Git mutation prohibited

## Implementation Summary

Implemented the WC28 application-shell pass without changing Project Planning or Phase Map artifact authority.

- Startup and project selection now refresh repository evidence, load `getCurrentWorkspaceModel()`, and transition to the evidence-derived active workflow step instead of forcing Project Intake.
- Workflow-step navigation now routes through one renderer transition helper that clears cross-step previews, preserves only documents owned by the destination step, and selects a current destination document when available.
- The left sidebar now contains a compact selected-project selector with `Choose Project` and clear actions.
- Duplicate Project, Phase, and Work Card workflow-step lists were removed from the sidebar; the top lifecycle rail remains the workflow-step navigator.
- Visible repository-selection terminology now uses Project, while process screens are described as workflow steps.
- Phase Map missing-output state now includes both Project Profile and Project Roadmap as input evidence and suppresses disposition until a Phase Map output document is selected.

## Files Created

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC28_current_project_startup_navigation_and_phase_map_clarity.md`

## Files Modified

- `src/renderer/app/App.tsx`
- `src/renderer/app/NestedWorkflowRail.tsx`
- `src/renderer/styles.css`
- `src/main/currentWorkflow/currentWorkflowService.ts`
- `test/renderer/document-review-surface-source.test.cjs`
- `test/renderer/architect-browser-attachment-coordinator.test.cjs`
- `test/workflow/production-service-proof.test.cjs`

Pre-existing dirty files were present before this pass and were not reverted.

## Files Intentionally Not Created

- No JSON sidecar for WC28.
- No migration utility.
- No recent-project persistence.
- No project database, authentication, provider SDK, MCP connector, settings screen, or deployment artifact.

## Proof Items

1. Application startup with Revisionary opens Phase Map rather than Project Intake: OperatorValidationPending. Automated evidence proves the established Project Planning-complete corpus resolves to `project-phase-map`; actual persisted Revisionary startup smoke was not performed by the Implementer.
2. Choosing an already-established project opens its evidence-derived current workflow step: Proven. `activateWorkspaceSelection()` no longer forces Intake and `refreshDocuments({ useResolver: true })` transitions from `getCurrentWorkspaceModel().activeWorkspaceId`.
3. A greenfield project with no Intake still opens Project Intake: Proven. Existing resolver behavior and validation remain green.
4. Visible repository terminology uses Project; process screens remain workflow steps: Proven by source update and renderer source tests.
5. The project selector appears at the top of the left sidebar and can choose a project: Proven by source update and renderer source tests.
6. The workflow header and body no longer repeat `Choose Workspace` or the large selected-workspace panel: Proven by renderer source tests.
7. The left sidebar no longer renders Project, Phase, or Work Card workflow-step lists: Proven by renderer source tests.
8. Top rail navigation still opens every registered workflow step: Proven by the single transition callback and existing rail validation.
9. Moving from Project Planning to an empty Phase Map clears the Roadmap preview: Proven by transition helper ownership rules and source tests.
10. Phase Map Ready state shows both Profile and Roadmap as input evidence and does not enable disposition before a Phase Map exists: Proven by current-workflow service test and renderer source test.
11. A Pending Phase Map is selected in Phase Map and can be dispositioned there: Proven by transition helper selection of destination-owned non-approved review documents and Phase Map disposition guard.
12. Project Planning continues to own synchronized Profile/Roadmap disposition: Proven by unchanged Project Planning review controls and existing bundle-disposition tests.
13. Project Intake, Architect Interview, and Project Planning accepted flows do not regress: Proven by full automated test suite.
14. `npm run typecheck`, `npm run build`, and `npm test` pass in the approved lane: Proven. Typecheck passed in sandbox; build and test passed in the documented normal Windows lane after sandbox `spawn EPERM`.

## Commands Run And Results

- `pwd` - passed; verified approved repo root.
- `git status --short --branch` - passed; branch observed with pre-existing dirty files.
- `git remote -v` - passed; approved remote observed.
- `Get-Content docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` - passed.
- `Get-Content docs/dev/VALIDATION_COMMAND_LANES.md` - passed.
- `Get-Content planning/phases/phase-08/Work_Cards/WC28_current_project_startup_navigation_and_phase_map_clarity.md` - passed.
- `Get-Content planning/phases/phase-08/Architect_Reports/CODE_REVIEW_PROJECT_SHELL_NAVIGATION_AND_PHASE_MAP_CLARITY.md` - passed.
- Focused source reads and `rg` scans over renderer, current workflow, and tests - passed.
- `node --check test/workflow/production-service-proof.test.cjs` - passed.
- `node --check test/renderer/document-review-surface-source.test.cjs` - passed.
- `node --check test/renderer/architect-browser-attachment-coordinator.test.cjs` - passed.
- `npm run typecheck` - passed in package validation lane.
- `npm run build` - sandbox failed with documented Vite/esbuild `spawn EPERM`; normal Windows lane rerun passed.
- `npm test` - sandbox failed during nested build with documented Vite/esbuild `spawn EPERM`; normal Windows lane rerun passed, 130 tests passed.
- `node -e` current-model probe against the development repository - passed; confirmed the development repository itself resolves to Project Intake because it has no canonical Project Intake corpus.
- `git status --short` - passed; dirty tree remains.

## Validation Performed

- Static/type validation: `npm run typecheck` passed.
- Build validation: `npm run build` passed in the documented normal Windows lane.
- Unit and source validation: `npm test` passed in the documented normal Windows lane, 130 passing tests.
- Focused WC28 coverage added for Phase Map input evidence and shell navigation/source rules.
- Local safety scan performed for secrets and concrete local paths in the Implementer Report.

## Validation Skipped And Reason

- Electron launch smoke: skipped. WC28 did not explicitly authorize the Implementer to perform Operator acceptance, and actual persisted Revisionary startup remains Operator-observed validation.
- Operator manual validation: skipped; reserved for the Operator.
- Git staging, commit, push, and PR creation: skipped; Work Card explicitly prohibits Git mutation.

## Security And Secret-Safety Notes

- No secrets, tokens, credentials, API keys, or `.env` contents were added.
- No new dependencies were added.
- Renderer filesystem authority was not broadened.
- The Implementer Report avoids concrete local machine paths and uses repo-relative paths.

## Manual Validation Required

- Launch the Electron app with the Operator's persisted Revisionary project selection and confirm startup lands on Phase Map.
- Use `Choose Project` in the sidebar to select an established project and confirm it lands on the evidence-derived workflow step.
- Navigate from Project Planning to an empty Phase Map and confirm no Roadmap preview remains visible.
- Confirm Phase Map shows handoff/output-generation actions without disposition until a Pending Phase Map exists.

## Residual Risks

- Actual persisted-project startup was not visually smoked by the Implementer.
- The working tree contained substantial pre-existing Phase 08 changes, including files touched by this pass; this report identifies WC28-intended files but does not claim ownership of unrelated pre-existing modifications.

## Git Actions Performed

None. Git mutation was prohibited.

## Recommended Next Implementer Task

Run Operator-observed startup and navigation smoke validation for WC28, then review the dirty tree scope before any future commit-authorized pass.
