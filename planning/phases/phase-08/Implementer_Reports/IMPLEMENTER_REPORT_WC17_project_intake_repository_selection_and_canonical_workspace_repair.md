# Implementer Report - WC17 Project Intake Repository Selection and Canonical Workspace Repair

Outcome: Implemented for automated/code validation; Operator manual validation remains required
Pass type: numbered Work Card
Work Card: `WC17_project_intake_repository_selection_and_canonical_workspace_repair`
Phase: `phase-08`

## Repository And Starting State

Repository path inspected: verified approved repo root
Branch verified: `feature/phase-04-wc01-repair01-evidence-derived-workflow`
Remote verified: `origin https://github.com/ChampCityChris/ChampCity_AI.git`
Starting status: branch was ahead of origin by 1 commit and dirty before implementation.
Starting dirty-tree inventory:

- Modified before this pass: `planning/phases/phase-08/Work_Cards/WC17_project_intake_repository_selection_and_canonical_workspace_repair.md`
- Modified before this pass: `planning/phases/phase-08/Work_Cards/WC17_project_intake_repository_selection_and_canonical_workspace_repair.json`

Git mutation authorization: not authorized.

## Files Retained

- Existing WC17 Work Card Markdown and JSON artifacts were read as active authority and left unstaged/uncommitted.
- Existing Phase 08 historical reviews were not modified.
- Existing renderer workflow header and dark shell styling from the prior pass were not redesigned.

## Files Created

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC17_project_intake_repository_selection_and_canonical_workspace_repair.md`

## Files Modified

- `src/main/currentWorkflow/currentWorkflowService.ts`
- `src/main/documents/planningDocumentService.ts`
- `src/main/main.ts`
- `src/main/projectIntake/projectIntakeService.ts`
- `src/main/workspaceSettings.ts`
- `src/preload/index.ts`
- `src/renderer/app/App.tsx`
- `src/shared/documents/documentOrder.ts`
- `src/shared/workspaceContracts.ts`
- `src/shared/workspaces/documentWorkspace.ts`
- `test/app-shell/app-shell.test.cjs`
- `test/documents/artifact-source-revision.test.cjs`
- `test/documents/planning-document-service.test.cjs`
- `test/lifecycle/evidence-lifecycle-resolver.test.cjs`
- `test/project-intake/project-intake-service.test.cjs`
- `test/repository/runtime-wiring-source.test.cjs`
- `test/resolver/first-non-approved-resolver.test.cjs`
- `test/workspaces/workspace-document-review.test.cjs`

## Files Deleted

None.

## Files Intentionally Not Created

- No Implementer handoff.
- No Human Validation acceptance record.
- No Architect Review record.
- No Phase closeout.
- No database, activity ledger, provider SDK, dependency, Playwright test, or deployment artifact.

## Single-Repository Selection Architecture

The app now uses one persisted main-process-owned active repository root:

- `workspace:choose` is the single folder selection operation.
- `workspaceSettings.validateWorkspaceRoot()` accepts any existing readable and writable directory.
- Repository selection no longer requires `planning/`.
- Selection does not create `planning/`.
- Canceled selection returns the current persisted repository selection.
- Failed selection throws a local error and does not replace the persisted repository.
- `readSelectedWorkspace()` and `saveSelectedWorkspace()` continue to persist and reload the active repository from app user data.

## Removed Split-Root Behavior

Removed the transient Project Intake repository authority:

- Removed `selectedProjectRepositoryRoot` from `src/main/main.ts`.
- Removed the separate `projectRepository:choose` IPC handler.
- Removed `chooseProjectRepositoryFolder` from the preload/API contract.
- Project Intake submission now calls `submitProjectIntakeForRepository(getRequiredWorkspaceRoot(), submission)`.
- The renderer may still carry `projectRepository` as read-only display/form state, but the main process overwrites write authority with the active persisted root.

## Empty-Repository Behavior

An active repository without `planning/` is now valid:

- `listPlanningDocuments()` returns `[]` when `planning/` is missing.
- Missing `planning/` does not create directories during selection or listing.
- `resolveFirstNonApprovedDocument()` now returns an explicit `pre-intake` state when the active repository has no canonical Project Intake evidence.
- `getCurrentWorkspaceModel()` maps `pre-intake` to `project-intake-capture`.
- Document reads and disposition writes still fail locally for unknown logical document IDs.

## Repository-Switch State Clearing

The renderer now clears repository-derived state before loading a newly selected active repository:

- document summaries;
- selected document ID;
- selected document preview;
- selected disposition value;
- feedback;
- document error;
- resolver result;
- current workspace model;
- Architect browser status.

After a successful repository selection, the renderer:

- sets the selected-workspace panel to the persisted active root;
- sets the Project Repository field to the same active root;
- moves to Project Intake Capture;
- refreshes documents and current projection from the newly active repository.

## Project Intake Classification Rule

Project Intake Capture ownership is now:

```text
artifactType=project-intake
or canonical Project Intake path under planning/project/Project_Intake/
```

Removed authority:

- broad `project_intake` / `project-intake` filename substring matching no longer routes documents into Project Intake Capture.

Explicit exclusions now covered by tests:

- Implementer Reports with `project_intake` in the filename;
- Work Cards with `project_intake` in the filename;
- design documents with `PROJECT_INTAKE` in the filename.

Architect Interview Prompt ownership:

- `artifactType=project-architect-interview-prompt` and canonical prompt paths route to Architect Interview, not Project Intake Capture.

## Questionnaire Fields

The renderer Project Intake form now displays the confirmed fixed questions:

1. `Project Name`
2. `Project Purpose - What are you trying to create, change, or accomplish?`
3. `Desired Outcome - What should the finished project allow the user or Operator to do?`
4. `Project Type`
5. `Project Repository`
6. `Does this repository already contain source code or project-planning documents?`
7. `Known Constraints or Non-Negotiables`
8. Conditional: `What should the Architect know before reviewing the existing repository?`

Required/optional behavior:

- Questions 1 through 5 use required form controls.
- Question 6 is represented by the existing binary checkbox, where unchecked is the explicit No state and checked is Yes.
- Question 7 remains optional.
- Question 8 remains optional and appears only when question 6 is Yes.
- Project Repository is read-only and populated from the active main-process-selected repository.
- Project Type values remain the approved fixed values from `projectTypeOptions`.

## Output Paths And Transaction Result

Successful submission writes exactly these four files through `writeArtifactTransaction()`:

```text
planning/project/Project_Intake/PROJECT_INTAKE_<project_slug>.md
planning/project/Project_Intake/PROJECT_INTAKE_<project_slug>.json
planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<project_slug>.md
planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<project_slug>.json
```

Transaction behavior:

- Project Intake pair remains Operator-authored gating review evidence with Approved disposition.
- Architect Interview Prompt pair remains Approved non-review handoff evidence.
- Prompt pair includes Project Intake source revision and Architect Interview output targets.
- Existing-repository Yes requires Architect repository review in the prompt even when the optional context note is blank.
- Minimal planning initialization creates only the directories needed for the four files above.
- Concrete local repository paths remain redacted as `<PROJECT_REPO>` in durable artifacts.

## Automated Test Inventory And Results

Added or updated coverage:

- empty readable/writable directories are valid active repositories;
- selecting/saving an empty repository does not create `planning/`;
- active repository selection reloads from persisted user data;
- missing `planning/` lists as an empty document set;
- empty repositories resolve to explicit Project Intake pre-intake state;
- Project Intake classification is metadata-first and canonical-path-only;
- Implementer Report, Work Card, and design document filename noise is excluded from Project Intake Capture;
- Architect Interview Prompt routes to Architect Interview;
- active repository root controls Project Intake writes over a submitted path;
- empty repository submission creates the four required files only;
- existing-repository Yes with blank optional context remains valid;
- invalid Project Type fails before writing files;
- later-lifecycle fixtures now seed Approved Project Intake when they intend post-intake ordering.

Validation commands:

```text
npm run typecheck
Execution lane: sandbox lane.
Result: passed.

npm test
Execution lane: sandbox lane first.
Result: failed with documented Vite/esbuild spawn EPERM during build.

npm test
Execution lane: normal Windows lane after documented sandbox spawn EPERM.
First result after initial implementation: failed, 203 passed and 10 failed.
Correction: updated post-intake fixtures, Project Intake target-directory setup, and one classifier fixture filename.

npm test
Execution lane: normal Windows lane after corrections.
Result: passed, 213 passed, 0 failed.

npm run build
Execution lane: normal Windows lane.
Result: passed.

npm run typecheck
Execution lane: sandbox lane after corrections.
Result: passed.
```

## Launch Smoke Result

Non-acceptance smoke performed:

- Created a temporary empty repository and temporary app user-data root.
- Preloaded `workspace-settings.json` to point at the temporary empty repository.
- Launched `npm start` in the normal Windows environment.
- Confirmed the app process was still alive after startup.
- Confirmed `planning/` did not exist in the temporary repository before submission.
- Stopped the spawned Electron process tree and verified no repo-owned Electron process remained.

Launch-smoke limitation:

- The JavaScript Windows snapshot tool was not available for this turn after tool discovery exposed only its reset handle.
- Therefore the Implementer did not visually confirm Project Intake form rendering, repository switching through the dialog, or submission attempt through the live renderer.
- These remain Operator manual validation items.

## Remaining Operator Validation

Required human checks remain:

1. Select a new empty repository through the app.
2. Confirm the selected path is displayed and no `planning/` directory is created yet.
3. Confirm no ChampCity AI documents remain visible after switching.
4. Review the complete Project Intake questionnaire.
5. Submit a bounded test intake.
6. Confirm the four expected files exist in the selected repository.
7. Confirm Project Intake displays only the new Project Intake logical document.
8. Confirm Architect Interview displays the generated prompt.
9. Restart the application and confirm the selected repository persists.
10. Select another repository and confirm the first repository's documents disappear.

## Final Repository Status

Final status observed:

- Branch remains `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Branch remains ahead of origin by 1 commit.
- Working tree remains dirty with WC17 implementation changes and pre-existing WC17 Work Card artifact edits.
- No staging, commit, push, merge, rebase, tag, reset, clean, restore, or stash operation was performed.
- Commit hash: not applicable; no commit was created.

## Security And Secret-Safety Notes

- No secrets, API keys, tokens, credentials, cookies, passwords, or `.env` contents were read, printed, written, or persisted.
- Renderer code still receives no arbitrary filesystem write authority.
- Project Intake write authority is main-process-owned and repository-contained.
- Durable artifacts continue to use `<PROJECT_REPO>` instead of concrete local paths.

## Residual Risks

- Live dialog-based repository switching still needs Operator visual validation.
- Live renderer submission was not completed by the Implementer smoke check.
- `pre-intake` is intentionally minimal and does not redesign later lifecycle behavior.

## Recommended Next Implementer Task

After Operator validation, address any exact visible or workflow defects reported from the WC17 manual checks before beginning later workspace repairs.

## Document Disposition

Document.Status=Approved
