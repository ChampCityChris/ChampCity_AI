0# Implementer Report: WC19 Project Intake Post-Submit Review and Continuation Precedence Repair

Pass type: numbered Work Card implementation
Work Card: `planning/phases/phase-08/Work_Cards/WC19_project_intake_post_submit_review_and_continuation_precedence_repair.md`

## Repository And Git State

Repository path inspected: verified approved repo root (`<PROJECT_REPO>`)

Remote:

```text
origin https://github.com/ChampCityChris/ChampCity_AI.git
```

Branch at start and finish:

```text
feature/phase-04-wc01-repair01-evidence-derived-workflow
```

Starting dirty-tree inventory included pre-existing WC18/native-context-menu changes before this pass:

```text
M src/main/currentWorkflow/currentWorkflowService.ts
M src/main/documents/planningDocumentService.ts
M src/main/main.ts
M src/main/projectIntake/projectIntakeService.ts
M src/renderer/app/App.tsx
M src/renderer/styles.css
M src/shared/documents/documentOrder.ts
M src/shared/documents/planningDocument.ts
M test/lifecycle/evidence-lifecycle-resolver.test.cjs
M test/project-intake/project-intake-service.test.cjs
M test/resolver/first-non-approved-resolver.test.cjs
?? planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC18_project_intake_operator_validation_defect_repair.md
?? planning/phases/phase-08/Work_Cards/WC19_project_intake_post_submit_review_and_continuation_precedence_repair.json
?? planning/phases/phase-08/Work_Cards/WC19_project_intake_post_submit_review_and_continuation_precedence_repair.md
?? src/main/contextMenu/
?? test/context-menu/
```

Git actions performed: read-only `git status`, `git branch --show-current`, `git remote -v`, and `git diff` inspection only.

Commit created: no.

Commit hash: not applicable because WC19 says Git mutation is not authorized.

Tag created: no.

No Git staging, commit, push, merge, rebase, reset, clean, restore, stash, or tag operation occurred.

## Files Created

- `src/shared/projectIntake/postSubmitReviewState.ts`
- `test/project-intake/post-submit-review-state.test.cjs`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC19_project_intake_post_submit_review_and_continuation_precedence_repair.md`

## Files Modified

- `src/renderer/app/App.tsx`
- `src/renderer/styles.css`
- `src/shared/documents/documentOrder.ts`
- `test/resolver/first-non-approved-resolver.test.cjs`
- `test/lifecycle/evidence-lifecycle-resolver.test.cjs`
- `test/documents/artifact-source-revision.test.cjs`
- `test/dogfood/real-corpus-dogfood.test.cjs`

## Files Intentionally Not Created

- No Playwright, browser automation, or renderer-testing dependency.
- No placeholder Project Architect Interview artifacts.
- No hidden workflow state, queues, route tokens, databases, or universal missing-output framework.
- No native context-menu changes.
- No preload contract, repository-selection, embedded Architect browser, or later lifecycle service changes for WC19.

## Implementation Summary

The application now keeps the Project Intake form and document review surface in one parent-constrained workspace. `.workspace-surface` no longer claims the full viewport from inside `.app-body`; it uses `height: 100%`, `min-height: 0`, and owns the outer vertical scroll. The document list and preview remain bounded internal scroll regions. Viewport-derived `document-workspace` max-height rules were replaced with parent-relative sizing.

Successful Project Intake submission now creates a dedicated Project Intake confirmation state containing the Project Intake Markdown path, Project Intake JSON path, Architect Interview Prompt Markdown path, and Architect Interview Prompt JSON path. This confirmation is separate from generic resolver feedback. It is displayed inside Project Intake Capture, is replaced by the next successful submission, and is cleared when repository-derived state is cleared for a repository change.

Post-submit synchronization now stores resolver/current-required context without forcing visible navigation. The viewed workspace remains `project-intake-capture`, the created Project Intake logical document is selected by matching the submission result paths against the reloaded document list, and the review surface is scrolled/focused into view. The current-required banner can still report Architect Interview as the next required workspace.

Lifecycle resolution now follows the WC19 order:

```text
Order planning documents
verify canonical Project Intake exists
evaluate Project Intake continuation prerequisite
return continuation state when present
otherwise select the first current gating document
otherwise return all-approved
```

This makes missing or incomplete Project Architect Interview Prompt evidence and missing Project Architect Interview output take precedence over later Pending or stale Project, Phase, Work Card, validation, or closeout evidence. Once a canonical Interview exists, normal current-document resolution resumes.

## Tests Added Or Updated

Resolver precedence coverage now includes later Pending Project Roadmap and Phase Planning evidence competing against:

- Approved Intake with missing prompt.
- Approved Intake plus Approved prompt with missing Interview.
- Pending canonical Interview after continuation yields.
- Approved Interview allowing later Pending Project or Phase evidence to become current.

Post-submit state coverage verifies:

- Created Intake path resolves to the loaded logical document.
- Four-path confirmation payload is created from a successful submission result.
- Project Intake remains the viewed workspace while resolver context requires Architect Interview.
- Repository change clears the Project Intake confirmation.

Existing downstream fixture tests were updated where they intended to test behavior after Project Intake continuation completion; those fixtures now include the Approved prompt and Approved Interview prerequisite evidence.

## Commands Run And Results

```text
pwd
Result: passed; approved repo root verified.
```

```text
git status --short --branch
Result: passed; dirty tree recorded.
```

```text
Get-Content docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md
Result: passed; repository boundary reviewed before production edits.
```

```text
Get-Content docs/dev/VALIDATION_COMMAND_LANES.md
Result: passed; validation lane reviewed before build/test commands.
```

```text
Get-Content planning/phases/phase-08/Work_Cards/WC19_project_intake_post_submit_review_and_continuation_precedence_repair.md
Result: passed; Work Card reviewed.
```

```text
npm run typecheck
Lane: package validation, sandbox.
Result: passed.
```

```text
npm run build
Lane: package validation, sandbox.
Result: failed with documented Vite/esbuild spawn EPERM while loading Vite config.
```

```text
npm run build
Lane: normal Windows lane after documented sandbox EPERM.
Result: passed.
```

```text
npm test
Lane: package validation, sandbox.
Result: failed with documented Vite/esbuild spawn EPERM during build prelude.
```

```text
npm test
Lane: normal Windows lane after documented sandbox EPERM.
Result: failed, 231 passed and 2 failed. Failures were older fixtures missing the newly required Project Intake continuation evidence.
```

```text
npm test
Lane: normal Windows lane.
Result: failed, 232 passed and 1 failed. Remaining failure was a JSON-only prompt fixture that did not satisfy the paired-prompt continuation contract.
```

```text
npm test
Lane: normal Windows lane.
Result: passed, 233 passed and 0 failed.
```

```text
npm start
Lane: normal Windows launch-smoke lane.
Result: command stayed alive until the smoke timeout, indicating no immediate Electron startup crash. The app process was then stopped and a follow-up process check found no remaining Electron processes from this launch.
```

```text
rg -n "<local-path, secret, credential, token, env-file, and private-key patterns>" <WC19 scoped files>
Result: no matches.
```

## Validation Performed

- TypeScript typecheck passed.
- Production build passed in the normal Windows lane after the documented sandbox EPERM.
- Full Node test suite passed in the normal Windows lane: 233 tests passed, 0 failed.
- Scoped local-path and secret-safety scan passed for WC19-touched files.
- Non-acceptance startup smoke was partially performed: Electron launched and stayed alive until the smoke timeout, with no immediate startup crash observed.

## Validation Skipped Or Limited

Operator visual validation was not performed by the Implementer. WC19 assigns controlling validation of viewer visibility, scrolling, focus transition, confirmation placement, and supported window heights to the Operator.

Live renderer submission was not manually accepted by the Implementer. The created-document selection and viewed-workspace/current-required-workspace split are covered by pure state tests and production service tests, but no new renderer automation dependency is authorized and no Operator acceptance was performed.

The launch smoke did not prove viewport reachability or usability. It only established that the app started without an immediate crash under the normal Windows lane.

## Security And Secret-Safety Notes

No credential material, environment-file contents, or concrete local machine paths were added to WC19-touched files.

All durable report paths use `<PROJECT_REPO>` or repo-relative paths.

No renderer unrestricted filesystem access was introduced.

No dependency was added.

## Final Repository Status

Final status remained dirty because WC19 prohibits Git mutation and because this pass began with pre-existing dirty files:

```text
M src/main/currentWorkflow/currentWorkflowService.ts
M src/main/documents/planningDocumentService.ts
M src/main/main.ts
M src/main/projectIntake/projectIntakeService.ts
M src/renderer/app/App.tsx
M src/renderer/styles.css
M src/shared/documents/documentOrder.ts
M src/shared/documents/planningDocument.ts
M test/documents/artifact-source-revision.test.cjs
M test/dogfood/real-corpus-dogfood.test.cjs
M test/lifecycle/evidence-lifecycle-resolver.test.cjs
M test/project-intake/project-intake-service.test.cjs
M test/resolver/first-non-approved-resolver.test.cjs
?? planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC18_project_intake_operator_validation_defect_repair.md
?? planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC19_project_intake_post_submit_review_and_continuation_precedence_repair.md
?? planning/phases/phase-08/Work_Cards/WC19_project_intake_post_submit_review_and_continuation_precedence_repair.json
?? planning/phases/phase-08/Work_Cards/WC19_project_intake_post_submit_review_and_continuation_precedence_repair.md
?? src/main/contextMenu/
?? src/shared/projectIntake/
?? test/context-menu/
?? test/project-intake/post-submit-review-state.test.cjs
```

## Blocking Questions

None for the bounded WC19 implementation.

## Manual Validation Required

Operator validation remains required for:

1. Selecting a clean test repository and completing Project Intake.
2. Confirming the success panel names all four created files.
3. Confirming the visible workspace remains Project Intake Capture.
4. Confirming the newly created Project Intake document is selected.
5. Confirming its preview is visible without changing workspaces.
6. Confirming the document list and preview are reachable by ordinary scrolling.
7. Confirming the current-required banner reports Architect Interview waiting while Project Intake remains visible.
8. Confirming Architect Interview shows the generated prompt on manual navigation.
9. Returning to Project Intake and confirming the creation confirmation remains available.
10. Repeating with the conditional repository-review field visible.
11. Repeating at maximized, minimum, and intermediate supported window heights.
12. Verifying a long preview and lower controls remain reachable.
13. Selecting another repository and confirming the old confirmation clears.
14. Using an existing-project fixture with later Pending evidence and confirming missing prompt or missing Interview remains required.
15. Adding a Pending Interview and confirming it becomes current.
16. Approving the Interview and confirming downstream evidence becomes current.

## Residual Risks

The main remaining risk is visual: CSS reachability and focus behavior need Operator validation in the actual app at the required window sizes. Automated tests confirm resolver and post-submit state behavior but do not prove human-visible reachability.

The working tree includes pre-existing dirty files outside the WC19 edit set. They were not reverted or staged.

## Architect Review Findings

Disposition: RevisionRequested before Operator validation.

### Blocking Finding 1 — Submission confirmation is not visible during document review

The confirmation is rendered at the bottom of `ProjectIntakeCapture`, immediately before the separate `document-workspace`. After submission, `focusProjectIntakeReviewSurface()` calls `scrollIntoView({ block: "start" })` on the document workspace. That transition places the document workspace at the top of the scroll viewport and moves the confirmation above the visible area.

WC19 requires the confirmation to remain visible while the Operator reviews the created Intake. Keeping it in the DOM above the review surface does not satisfy that requirement when the implementation intentionally scrolls it out of view.

Required correction:

- place the durable confirmation within the post-submit review region, or use another bounded layout that keeps it visible alongside the selected Intake review;
- retain all four created paths;
- preserve the confirmation during document loading and resolver refresh;
- keep the review surface focus/scroll behavior without moving the confirmation outside the visible review context;
- do not add a fixed overlay that covers document content.

### Blocking Finding 2 — Selected Intake preview is mislabeled as Architect Interview

After successful submission, the renderer correctly keeps `activeWorkspaceId=project-intake-capture` and selects the created Project Intake logical document. However, `CurrentDocumentSummary` branches only on `resolverResult.status === "waiting-for-architect-interview"` and hardcodes:

- Current workspace: Architect Interview;
- Current document: Project Architect Interview Prompt;
- Effective disposition: Approved handoff.

That summary is displayed directly above the selected Project Intake preview. The preview header can therefore show the Intake filename while its summary says the current document is the Architect Interview Prompt.

This reintroduces the state conflation WC19 was intended to remove. The current-required lifecycle state belongs in `CurrentWorkspaceBanner`; the document summary must describe the workspace and document currently being viewed.

Required correction:

- make `CurrentDocumentSummary` describe `activeWorkspaceId` and `selectedDocument` rather than replacing them with resolver-required state;
- when Project Intake is selected after submission, show Project Intake Capture, the Intake filename, and its actual disposition;
- retain Architect Interview waiting information in the current-required banner and resolver feedback;
- preserve correct summary behavior after the Operator manually navigates to Architect Interview and selects the prompt.

### Verified WC19 Repairs

The following changes are source-consistent with the approved card:

- `.workspace-surface` no longer claims `100vh` inside `.app-body`;
- the workspace uses parent-constrained sizing with an outer scroll owner;
- successful submission creates a separate four-path confirmation state;
- the created Project Intake path is resolved to its logical document and selected;
- the visible workspace remains Project Intake Capture after submission;
- Project Intake continuation is evaluated before later gating artifacts;
- later Pending Project and Phase evidence is covered by focused precedence tests.

WC19 remains the Implementer instruction for these two bounded corrections. No new Work Card is required.

## Recommended Next Implementer Task

Correct only the two blocking findings above, update this same Implementer Report with the changed files and validation results, and return it for review.

## Document Disposition

Document.Status=RevisionRequested
