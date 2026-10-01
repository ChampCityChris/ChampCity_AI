# RWS03 Implementer Report

## Scope and repository verification

Implemented Work Card RWS03, Workflow intake persistence / renderer composition. Verified the primary `Dev` repository checkout and `dev` branch before edits. Actual starting HEAD: `42ff4ecc055c684f53b1dfcff2395ba8ee165cb1`; the card's reviewed baseline was `cace333a57178ea15d61572596b618e9673d35a6`. Remote: `origin`, ChampCityChris/ChampCity_AI. No push, merge, branch creation, or release action. Existing unrelated changes and concurrent changes were preserved.

## Implementation

The main-process Workflow intake facade exposes `getWorkflowIntake` and `saveWorkflowIntake` under exact Workflow identity. Saves validate active canonical Workflow type, exact registry entry workspace, matching typed payload, plain bounded objects, known field keys, required values, character limits, and UTF-8 byte limits before persistence. Saving leaves the workspace unchanged.

Feature and Issue reads/saves delegate to their existing planning services. Their internal intake validation now uses the same shared bounded contract; assessment, RCA, plan, evidence, and execution mechanics were not redesigned. Their renderer-specific intake-save APIs were removed from ChampCityApi/preload, while later-stage APIs and internal persistence services remain.

The four previously missing families store one Workflow-owned Finding per field under category `workflow-intake:<workflowType>:<fieldKey>`, using the shared label as title and `<Workflow label> intake context` as impact. Subsequent saves revise the same record. Blank optional fields create no initial Finding; clearing a populated field revises it to omitted with `Optional intake field omitted by Operator.` Reads omit those values. Active workflow_member relationships establish exact ownership; ambiguous field records fail visibly.

All six substantive intake entry workspaces now dispatch to WorkflowIntakeWorkspace, composed through IntakeWorkspaceShell. Questions, order, help text, required flags, and maximums come from RWS02. Both character and UTF-8 limits are 4,096. Forms reuse the Greenfield intake styling and full-width text-field treatment. The existing App-owned embedded browser fills the companion column. Header navigation, bounded feedback/error messages, saved-value loading, and save actions remain within the shell. Feature Assessment and Issue RCA preparation use the existing transitions and refresh App's exact Workflow projection. Other families remain editable at intake after saves.

Removed alternate Feature/Issue intake forms and duplicated field lists. Renamed Architect attachment eligibility to substantiveWorkflowForeground. Preserved the existing later-stage dispatch and browser owner. No Greenfield source or shell geometry was redesigned. No new table, entity type, sidecar, schema expansion, dependency, routing autofill, or new Architect transition was introduced. Validation metadata adds the exact new renderer consumer to its existing Workflow application owner.

## Files

- `src/main/workflow/workflowIntakeService.ts`
- `src/renderer/app/WorkflowIntakeWorkspace.tsx`
- `src/shared/workflowIntakeContracts.ts`
- `src/shared/workspaceContracts.ts`
- `src/main/workflow/workflowApplicationIpc.ts`
- `src/preload/index.ts`
- `src/renderer/app/workflowPlanningDispatch.ts`
- `src/renderer/app/architectSurfaceEligibility.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/FeaturePlanningWorkspace.tsx`
- `src/renderer/app/IssueWorkflowPlanningWorkspace.tsx`
- `src/renderer/styles.css`
- `src/main/featurePlanning/featurePlanningService.ts`
- `src/main/issuePlanning/issuePlanningService.ts`
- `test/project-state/workflow-type-registry.test.cjs`
- `test/renderer/workflow-hub-shell.test.cjs`
- `test/workflow/workflow-application-service.test.cjs`
- `docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS03_IMPLEMENTER_REPORT.md`
- `validation/capability-map.json`

Created two production consumers and this report; other listed paths were modified. No files deleted. No new permanent test files or persistence artifacts were created. Temporary change inputs and validation logs remain ignored under tmp.

## Proof and validation

Extended existing workflow-application-service proof for all six facade round trips, exact Workflow isolation, Feature/Issue delegation, optional omission and restoration, required-only initial saves, stable Finding identity under revisions, save authority rejection, character and multibyte limits, and unchanged entry workspace. The same existing owner now exercises real generic IPC listeners and verifies retired preload names and retained later-stage APIs. Extended workflow-hub-shell proof for all six exact entry dispatches, unrelated/closed workspace denial, shared shell composition, ordered labels, required/optional markers, companion content, and generic Architect eligibility. Updated workflow-type-registry proof for both 4,096 limits. Existing planning IPC and Greenfield shell parity tests were reused.

Commands and lanes:

- `npm run typecheck` (restricted Windows lane): exit 1, found a renderer payload cast type error during implementation; corrected before composed validation.
- `npm run validate:plan -- --profile work-item --changes tmp/rws03-changes.json` (restricted Windows lane): exit 0 with exact attributable paths. Final ownership preview briefly rejected an unsorted source-pattern insertion; sorted it and reran successfully, exit 0.
- `npm run test:affected -- --changes tmp/rws03-changes.json` (restricted Windows lane): exit 1, production-build launch returned `spawn EPERM`; no tests executed and this was not a source failure or pass.
- Same affected command (approved normal Windows lane): exit 1. Production build passed, 883 tests: 859 passed, 24 failed, no skips. The receipt reported sourceStable=false because this shared dirty checkout changed during validation. This is not a stable passing receipt for the checkpoint. All RWS03 focused owners passed in this run. Broader failures are listed below; no unrelated repairs were made.
- `node --test test/workflow/workflow-application-service.test.cjs test/workflow/workflow-planning-ipc.test.cjs test/project-state/workflow-type-registry.test.cjs test/renderer/workflow-hub-shell.test.cjs test/renderer/figma-redesign-shell.test.cjs` (approved normal Windows lane): exit 0, 58 passed, no failures or skips, against the composed build.
- Final `npm run build` (approved normal Windows lane), after bounded field-width/help-color/companion refinements: exit 0. Vite emitted its existing large-bundle warning.
- Final repetition of the same five named tests against the final build: exit 0, 58 passed, no failures or skips.
- `git diff --check` (restricted Windows lane): exit 0; line-ending normalization notices only.

Broader affected failures:

- `test/agent-harness/repository-io-hardening.test.cjs`: 1 failures.
- `test/agent-harness/reserved-toolbox-namespace.test.cjs`: 2 failures.
- `test/project-intake/post-submit-review-state.test.cjs`: 1 failures.
- `test/project-state/domain-contracts.test.cjs`: 2 failures.
- `test/project-state/execution-completion.test.cjs`: 6 failures.
- `test/renderer/issue-close-workspace.test.cjs`: 1 failures.
- `test/repository/runtime-wiring-source.test.cjs`: 1 failures.
- `test/source-control/managed-project-source.test.cjs`: 7 failures.
- `test/source-control/workflow-integration-service.test.cjs`: 2 failures.
- `test/work-card-building/codex-implementer-execution-service.test.cjs`: 1 failures.

Diagnostics concern toolbox registration/arguments, a null Work Intake fixture Project, missing sourceMode fixtures, source-neutral deterministic policy fixtures, Issue Close presentation expectations, Codex runtime forwarding expectations, managed Git fixture preparation/integration, and a Tester completion expectation. These boundaries are outside the RWS03 changes; passing focused facade/planning proof establishes the changed persistence path separately. The concurrent source changes prevent attributing this broad receipt to a frozen baseline. A stable broader qualification remains outstanding.

## Safety, Git, and remaining review

Only attributable paths are included in the checkpoint. Concurrent unrelated staged changes are preserved by committing an explicit RWS03 path list. Reviewed the attributable diff and performed bounded secret/local-path, generated-artifact, and whitespace scans; no findings in the attributable changes. Checkpoint hash is pending at report creation; the actual hash will be provided after the card-required commit, without amending this report merely to insert its own commit hash.

Electron launch smoke was not run; it is optional non-acceptance evidence. No external browser integration or Operator visual acceptance is claimed. No full/release profile was run. Architect review and Operator visual validation remain required for field spacing, scrolling, responsive geometry, embedded browser fill, save/reload feedback, and Feature/Issue continuation. Stop after the checkpoint; do not begin another workspace-family extraction.
