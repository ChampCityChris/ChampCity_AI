# Implementer Report - WC20 Canonical Project Intake Identity, Explicit Approval, and Rail Status Repair

Pass type: numbered Work Card
Work Card: WC20 canonical Project Intake identity, explicit approval, and rail status repair

## Repository And Git State

Repository path inspected: verified approved repo root (`<PROJECT_REPO>`)
Remote: `origin https://github.com/ChampCityChris/ChampCity_AI.git`
Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`

Starting dirty-tree inventory:

- Modified: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC17_project_intake_repository_selection_and_canonical_workspace_repair.md`
- Modified: `src/main/currentWorkflow/currentWorkflowService.ts`
- Modified: `src/main/documents/planningDocumentService.ts`
- Modified: `src/main/main.ts`
- Modified: `src/main/projectIntake/projectIntakeService.ts`
- Modified: `src/renderer/app/App.tsx`
- Modified: `src/renderer/styles.css`
- Modified: `src/shared/documents/documentOrder.ts`
- Modified: `src/shared/documents/planningDocument.ts`
- Modified: multiple existing test files under `test/`
- Untracked: WC18/WC19 reports, WC19/WC20 Work Cards, `src/main/contextMenu/`, `src/shared/projectIntake/`, `test/context-menu/`, and `test/project-intake/post-submit-review-state.test.cjs`

Git mutation: not authorized by WC20 and not performed. No branch, stage, commit, push, merge, rebase, tag, reset, restore, clean, or stash action was performed.

## Files Created

- `src/shared/projectIntake/projectIntakeCorpus.ts`
- `test/project-intake/project-intake-corpus-status.test.cjs`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC20_canonical_project_intake_identity_explicit_approval_and_rail_status_repair.md`

## Files Modified

- `src/main/projectIntake/projectIntakeService.ts`
- `src/shared/documents/documentOrder.ts`
- `src/main/currentWorkflow/currentWorkflowService.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/NestedWorkflowRail.tsx`
- `test/project-intake/project-intake-service.test.cjs`
- `test/project-intake/post-submit-review-state.test.cjs`
- `test/resolver/first-non-approved-resolver.test.cjs`
- `test/project-planning/project-planning-service.test.cjs`
- `test/phase-map/phase-map-service.test.cjs`
- `test/phase-interview/phase-interview-service.test.cjs`
- `test/phase-planning/phase-planning-service.test.cjs`
- `test/work-card-intake/work-card-intake-service.test.cjs`
- `test/work-card-planning/work-card-planning-service.test.cjs`

## Files Intentionally Not Created

- No database, registry file, hidden project identity store, route token, approval subsystem, duplicate-resolution UI, provider SDK, cloud integration, dependency, migration, placeholder Architect Interview output, Playwright test, or broad duplicate-artifact framework was created.

## Implementation Summary

Added a shared Project Intake corpus helper that analyzes active canonical Intake logical documents by `artifactType=project-intake` or canonical path under `planning/project/Project_Intake/`. It returns `open`, `single`, or `conflict`, exposes the conflict evidence paths, and derives the Project Intake rail labels `Open`, `Awaiting Approval`, `Completed`, and `Conflict`.

Changed Project Intake submission so a repository-level singleton Intake family is discovered before path calculation. The first submission still establishes the stable slug-based artifact key, but later Project Name edits reuse the existing Intake paths, associated prompt paths, and existing Architect Interview output targets. Existing singleton slugged Intake families without WC20 metadata are reused in place without migration.

Changed newly saved and revised Project Intake artifacts to `Document.Status=Pending` while preserving the generated Architect Interview Prompt as `participationRole=nonReviewHandoff` and `Document.Status=Approved`. Revisions reset the Intake to Pending and regenerate the prompt against the new Intake source revision. Explicit Operator approval continues through the existing synchronized `setDocumentDisposition()` path.

Added duplicate conflict projection to the resolver/current-workspace model. Multiple canonical Intake documents now produce `project-intake-conflict`, keep the active workspace at `project-intake-capture`, list every conflicting Intake path as source evidence, and block later Project or Phase evidence from taking precedence.

Updated the Project Intake rail card to receive explicit repository-derived lifecycle status from `App.tsx`. Visual selection still uses highlighting and `aria-current`; the Project Intake card no longer displays `CURRENT`, and selection does not replace `Completed`, `Awaiting Approval`, or `Conflict`.

## Singleton Corpus Analysis

Final behavior:

- zero canonical Intake documents: corpus `open`, rail `Open`, resolver `pre-intake`;
- one canonical Intake document with non-Approved disposition: corpus `single`, rail `Awaiting Approval`, resolver selects Project Intake as current;
- one canonical Intake document with Approved disposition and approved prompt but no Interview output: rail `Completed`, resolver waits for Architect Interview;
- more than one canonical Intake document: corpus `conflict`, rail `Conflict`, resolver/current model require duplicate resolution before later evidence.

## Stable Artifact Key And Path Reuse

New Intake JSON includes `projectArtifactKey`; Markdown includes `Project.ArtifactKey=<stable-key>`. For a pre-WC20 singleton without that metadata, the service derives the stable key from the existing canonical `PROJECT_INTAKE_<key>` path and writes future revisions back to the same paths.

Changed-name resubmission evidence is covered by `Project Name changes revise the same Intake prompt and Interview target paths`. The test submits `Revisionary`, then submits `Test`, and verifies:

- the same Intake Markdown/JSON paths are reused;
- the same prompt Markdown/JSON paths are reused;
- Architect Interview target paths are unchanged;
- `Project Name: Test` and JSON `projectName: "Test"` are updated as content;
- no second Intake or prompt family appears in the file inventory.

## Duplicate Conflict Behavior

Submission against a conflicting corpus throws this local error form:

`Project Intake conflict: multiple canonical Project Intake documents exist: <paths>. Resolve the duplicate Intake family before submitting Project Intake.`

The focused no-write test records the file inventory before submission and verifies the inventory is unchanged after the thrown conflict. Resolver conflict tests verify multiple Intake documents take precedence over later Pending Project Roadmap and later Pending Phase evidence.

## Disposition And Reapproval Behavior

Initial Project Intake Markdown/JSON disposition is Pending. Initial Project Architect Interview Prompt Markdown/JSON disposition remains Approved as a non-review handoff.

Explicit approval is tested through `setDocumentDisposition()` on the Pending Intake. After approval, resolver projects `waiting-for-architect-interview` with the exact prompt output targets. Resubmitting a revised Intake returns the Intake to Pending and requires reapproval before Architect Interview waiting resumes.

Approved downstream Architect Interview invalidation remains covered by the revised Intake test: an Approved Interview at the prompt output target is reset to Pending when the Intake is revised.

## Rail Status Derivation

The rail status helper is tested for:

- no Intake -> `Open`;
- Pending, Rejected, or RevisionRequested singleton Intake -> `Awaiting Approval`;
- Approved singleton Intake -> `Completed`;
- multiple Intake documents -> `Conflict`;
- lifecycle label derivation does not depend on active workspace selection.

`NestedWorkflowRail` now receives `projectIntakeStatus` as a prop from `App.tsx`; it does not call IPC or inspect the filesystem.

## Commands Run And Results

- `pwd` - passed; confirmed approved repo root.
- `git status --short --branch` - passed; found existing dirty tree and current feature branch.
- `Get-Content -Raw docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` - passed.
- `Get-Content -Raw docs/dev/VALIDATION_COMMAND_LANES.md` - passed.
- `Get-Content -Raw planning/phases/phase-08/Work_Cards/WC20_canonical_project_intake_identity_explicit_approval_and_rail_status_repair.md` - passed.
- Source and test inspection commands using `Get-Content` and `rg` - passed except one non-blocking PowerShell quoting mistake during a broad scan.
- `npm run typecheck` - passed in sandbox lane.
- `npm run build` - failed in sandbox lane with documented Vite/esbuild `spawn EPERM`.
- `npm run build` - passed in normal Windows lane after documented `spawn EPERM` rerun.
- `npm test` - failed in sandbox lane with documented Vite/esbuild `spawn EPERM`.
- `npm test` - first normal Windows rerun reached tests and exposed WC20 fixture expectation failures; corrected test setup helpers to explicitly approve Intake.
- `npm test` - passed in normal Windows lane: 251 tests passed, 0 failed.
- Electron launch smoke command - passed limited startup check: Electron process started and remained running after 8 seconds before being stopped.
- Scoped safety scan for local paths/secrets - passed for WC20 scoped source/test content; matches were pre-existing report wording about secret-safety and not secret values.
- `git status --short` - passed; final dirty tree remains because Git mutation was not authorized.

## Validation Performed

Static/build validation:

- `npm run typecheck` passed.
- `npm run build` passed in the normal Windows lane after sandbox `spawn EPERM`.

Automated test validation:

- `npm test` passed in the normal Windows lane.
- Test result: 251 passed, 0 failed.

Focused WC20 coverage includes canonical identity, changed-name path reuse, singleton slug reuse, duplicate conflict no-write behavior, Pending Intake creation, explicit approval, reapproval after revision, downstream invalidation, rail-status derivation, and conflict precedence.

Launch smoke:

- Non-acceptance Electron startup smoke passed only for process launch/no immediate crash. The process was still running after 8 seconds and was stopped intentionally.

## Architect Review Corrections - Archived Evidence and Exact Source Paths

Exact files changed:

- `src/shared/projectIntake/projectIntakeCorpus.ts`
- `src/main/projectIntake/projectIntakeService.ts`
- `test/project-intake/project-intake-corpus-status.test.cjs`
- `test/resolver/first-non-approved-resolver.test.cjs`
- `test/project-intake/project-intake-service.test.cjs`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC20_canonical_project_intake_identity_explicit_approval_and_rail_status_repair.md`

Final archive-exclusion predicate:

- `isActiveCanonicalProjectIntake()` first excludes `participationRole=historical`.
- It then calls `isArchivedPlanningDocument(document)` before accepting either `artifactType=project-intake` or canonical Project Intake paths.
- `isArchivedPlanningDocument(document)` inspects both Markdown and JSON evidence paths.
- The path predicate normalizes backslashes to forward slashes, compares case-insensitively, and excludes paths beginning with `planning/archive/`.

Archive-only test result:

- `archive-only Project Intake metadata is excluded from the active corpus` passed.
- `archive-only Project Intake resolves to pre-intake` passed.
- Corpus state: `open`.
- Rail status: `Open`.
- Resolver state: `pre-intake`.

Active-plus-archived test result:

- `active Pending Intake wins over archived Approved Intake` passed.
- `active Approved Intake wins over archived Pending Intake` passed.
- `active singleton plus archived Intake does not project conflict` passed.
- Archived paths were absent from active corpus `evidencePaths`.
- Pending active singleton rail status: `Awaiting Approval`.
- Approved active singleton rail status: `Completed`.

True active-conflict regression result:

- `true conflict evidence excludes archived Project Intake paths` passed.
- `true conflict between two active Intakes remains a conflict when archived Intake exists` passed.
- Conflict evidence contains only active Intake paths under `planning/project/Project_Intake/`.
- Archived Project Intake paths under `planning/archive/` are excluded.

Final prompt-renderer source-path contract:

- `renderPromptMarkdown()` now receives both `projectIntakeMarkdownPath` and `projectIntakeJsonPath`.
- `renderPromptJson()` now receives both `projectIntakeMarkdownPath` and `projectIntakeJsonPath`.
- The Markdown prompt writes `Source Revisions` using the actual Project Intake JSON path and writes canonical Markdown/JSON source lines using the two accepted Intake paths.
- The JSON prompt writes `sourceRevisions[0].path`, `canonicalProjectIntake.markdown`, and `canonicalProjectIntake.json` from the accepted Intake paths.
- Neither renderer reconstructs the Intake Markdown path from `projectSlug`.

Alternate canonical-path fixture:

- Existing Intake Markdown: `planning/project/project-intake/CANONICAL_PROJECT_INTAKE.md`
- Existing Intake JSON: `planning/project/project-intake/CANONICAL_PROJECT_INTAKE.json`
- Existing prompt Markdown: `planning/project/Project_Architect_Interview_Prompts/CANONICAL_PROMPT.md`
- Existing prompt JSON: `planning/project/Project_Architect_Interview_Prompts/CANONICAL_PROMPT.json`
- Existing Architect Interview target Markdown: `planning/project/Project_Architect_Interviews/CANONICAL_INTERVIEW.md`
- Existing Architect Interview target JSON: `planning/project/Project_Architect_Interviews/CANONICAL_INTERVIEW.json`

Exact preserved Intake paths:

- `projectIntakeMarkdownPath`: `planning/project/project-intake/CANONICAL_PROJECT_INTAKE.md`
- `projectIntakeJsonPath`: `planning/project/project-intake/CANONICAL_PROJECT_INTAKE.json`

Exact prompt `canonicalProjectIntake` values:

- `canonicalProjectIntake.markdown`: `planning/project/project-intake/CANONICAL_PROJECT_INTAKE.md`
- `canonicalProjectIntake.json`: `planning/project/project-intake/CANONICAL_PROJECT_INTAKE.json`
- `sourceRevisions[0].path`: `planning/project/project-intake/CANONICAL_PROJECT_INTAKE.json`

Changed Project Name reconstruction check:

- Test submission changed Project Name to `Changed Alternate Name`.
- The same Intake paths, prompt paths, and Architect Interview output targets were preserved.
- The reconstructed path `planning/project/Project_Intake/PROJECT_INTAKE_changed_alternate_name.md` did not appear in prompt Markdown or prompt JSON.
- No second Intake or prompt family was created.

Validation result for this correction:

- Typecheck: `npm run typecheck` passed in sandbox lane.
- Build: `npm run build` failed in sandbox lane with documented Vite/esbuild `spawn EPERM`; rerun in normal Windows lane passed.
- Complete test suite: `npm test` failed in sandbox lane with documented Vite/esbuild `spawn EPERM`; rerun in normal Windows lane passed, 251 tests passed, 0 failed.
- Launch smoke: limited Electron startup smoke passed; Electron started and remained running after 8 seconds, then the launched process was stopped. This was not Operator acceptance and did not visually validate the archived-evidence or alternate-path workflows.
- Final repository status: dirty tree remains because WC17-WC20 accumulated work is unstaged and Git mutation is not authorized.
- Git operation confirmation: no branch, stage, commit, push, merge, rebase, tag, reset, restore, clean, or stash action was performed.

## Validation Skipped And Reason

- Full Operator manual validation was not performed because WC20 reserves final visual/workflow acceptance for the Operator after Architect review.
- Interactive Electron workflow smoke for saving, approving, resubmitting, and duplicate-fixture visual inspection was not fully performed through UI controls; the same behavior was covered by automated service/resolver/renderer-state tests, and the remaining visual acceptance steps are listed below for the Operator.
- No Playwright validation was run because WC20 explicitly did not authorize Playwright or a new dependency.

## Manual Validation Required

Operator should perform the WC20 manual validation checklist from the Work Card, including:

- save Project Name A in an empty repository and confirm one Intake pair plus one prompt pair;
- confirm Intake Pending, prompt Approved, rail `Awaiting Approval`;
- approve Intake and confirm rail `Completed` and Architect Interview waiting;
- resubmit with Project Name B and confirm the same Intake/prompt/Interview target paths are preserved;
- confirm the revised Intake returns to Pending and rail returns to `Awaiting Approval`;
- restart and confirm path reuse remains stable;
- open a duplicate Intake fixture and confirm rail `Conflict`, duplicate paths are listed, submission is blocked, and later evidence does not bypass the conflict.

## Security And Secret-Safety Notes

No secrets, credentials, API keys, token values, cookies, session storage, `.env` contents, concrete local machine paths, large archives, screenshots, or generated junk were introduced. Durable artifacts use repo-relative paths and `<PROJECT_REPO>` where repository identity is referenced.

## Blocking Questions

None.

## Residual Risks

- The launch smoke was intentionally non-acceptance and did not replace Operator visual validation.
- The repository had substantial pre-existing dirty/untracked work before WC20; this pass did not revert or stage unrelated changes.
- Automatic duplicate cleanup remains intentionally out of scope.

## Git Actions Performed

No Git mutation occurred. Commit hash: not applicable because WC20 explicitly did not authorize Git mutation.

## Architect Review Disposition

Disposition: Approved for Operator validation.

The two Architect correction findings are resolved in source:

- archived Project Intake evidence is excluded before artifact metadata or canonical-path identity can qualify it for the active corpus;
- both prompt renderers receive and persist the exact accepted Project Intake Markdown and JSON paths rather than reconstructing an existing path from `projectSlug`.

Focused source review also confirms that the established WC20 behaviors remain intact: Pending Intake creation, Approved non-review prompt generation, singleton path reuse, duplicate active conflict precedence, explicit Operator approval, and evidence-derived Project Intake rail status.

The Implementer-reported `npm run typecheck`, normal-Windows `npm run build`, and full `npm test` result of 251 passed and 0 failed are accepted as reported evidence. The Architect did not independently execute those commands.

Operator visual and workflow validation remains controlling for final WC20 acceptance.

## Recommended Next Task

Perform the WC20 Operator validation checklist. Do not begin another Project Intake repair unless Operator validation identifies a concrete defect.

## Final Repository Status

Final `git status --short` still reports the pre-existing dirty/untracked tree plus WC20 source/test/report changes. No files were staged or committed.

## Document Disposition

Document.Status=Approved
