# Builder Report - WC01 Add Project Intake Capture

## Pass Type

Numbered Work Card (`WC01`): add Project Intake capture as the first upstream planning workflow for ChampCity A/I.

## Repository Path Inspected

- Requested repository path: `C:\Users\chapm\Projects\ChampCity_AI`
- Current working directory inspected: `C:\Users\chapm\Projects\ChampCity_AI`
- Git repository root inspected: `C:/Users/chapm/Projects/ChampCity_AI`

## Git Branch And Remote Status

- Current branch: `master`
- Remote:
  - `origin	https://github.com/ChampCityChris/ChampCity_AI.git (fetch)`
  - `origin	https://github.com/ChampCityChris/ChampCity_AI.git (push)`
- Pre-existing untracked Phase 1 artifacts, `.obsidian/`, and `Generic Docs/` files were observed and not staged as this Work Card.

## Phase 2 Folders Created

- `planning/phases/phase-02/`
- `planning/phases/phase-02/Work_Cards/`
- `planning/phases/phase-02/Builder_Reports/`
- `planning/project/Project_Intake/` was created on disk as the constrained Project Intake artifact target. It contains no seeded intake artifact.

## Files Created

- `planning/phases/phase-02/Work_Cards/WC01_add_project_intake_capture.json`
- `planning/phases/phase-02/Work_Cards/WC01_add_project_intake_capture.md`
- `planning/phases/phase-02/Builder_Reports/BUILDER_REPORT_WC01_add_project_intake_capture.md`
- `src/shared/workCards/projectIntake.ts`
- `src/shared/workCards/validateProjectIntake.ts`
- `src/shared/workCards/renderProjectIntakeMarkdown.ts`
- `src/shared/workCards/fixtures/projectIntakeFixture.ts`
- `src/shared/workCards/fixtures/workCardProjectIntakeFixture.ts`

## Files Modified

- `scripts/verify-work-card-fixture.mjs`
- `src/main/main.ts`
- `src/main/workCards/workCardFileStore.ts`
- `src/preload/index.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/global.d.ts`

## Files Intentionally Not Created

- No Project Intake JSON/Markdown record was seeded under `planning/project/Project_Intake/`.
- No Project Architect Interview prompt was generated.
- No `PROJECT_PROFILE`, Project Roadmap, Phase Plan, Phase Intake, Phase Architect Interview, or generated Work Cards were created.
- No release tag, package, installer, push, provider SDK, LLM API call, database, auth flow, cloud service, deployment automation, MCP integration, or connector integration was added.
- No legacy `Builder_*` folders or historical artifacts were renamed.

## Project Intake Model Summary

- Added a JSON-compatible `ProjectIntake` model with the approved plain-language fields.
- Added `ProjectIntakeInput`, preview/save result types, stage options, safe slug generation, and `PROJECT_INTAKE_<slug>.json/.md` filename helpers.
- Added validation that blocks missing project name, product summary, target users, user problem, desired user outcome, and source-of-truth location.
- Added non-blocking warnings for missing known constraints, non-goals, security/data concerns, and Operator uncertainties.
- Added deterministic Markdown rendering with the required Project Intake headings and next-step statement.

## UI Changes Made

- Added a new top-level `Project Intake` mode before the existing Work Card pipeline screens.
- Kept existing Phase 1 workflow screens available: Capture, Architect, Risk, Implement, Report, Validate, and Closeout.
- Added a guided plain-language Project Intake form with required visible fields, defaults for current stage, source-of-truth location, preferred Implementer tool, and Architect surface.
- Added Markdown preview, copy, save feedback, warnings, and saved JSON/Markdown path display.
- Added visible copy clarifying that this pass saves only Project Intake and does not generate the Project Architect Interview prompt or downstream planning artifacts.

## IPC/Path Safety Notes

- Renderer code still does not write files directly.
- `projectIntake:preview` and `projectIntake:save` are exposed through preload/main IPC.
- The renderer sends form data only; it does not send target paths or filenames.
- Main process derives the safe slug and filenames, resolves them inside `planning/project/Project_Intake/`, rejects traversal, rejects folder/absolute-path filename input, and writes only generated `.json` and `.md` artifacts.
- Saves use non-overwriting `wx` writes and the existing suffixing helper to avoid silent overwrites.

## Commands Run And Results

- `pwd` - confirmed workspace path `C:\Users\chapm\Projects\ChampCity_AI`.
- `git rev-parse --show-toplevel` - confirmed Git root `C:/Users/chapm/Projects/ChampCity_AI`.
- `git status --short --branch` - confirmed branch `master` and observed pre-existing untracked files.
- `git remote -v` - confirmed GitHub origin URL.
- `Get-Content -LiteralPath AGENTS.md` - read repository rules.
- `Get-Content` for the required Phase 1 closeout reports and latest WC10 UI/repair reports - inspected Phase 1 closeout, risks, and UI baseline.
- `Get-Content` / `rg --files` / `rg -n` for renderer, main, preload, shared Work Card source, scripts, and styles - inspected current app and validation structure.
- `New-Item -ItemType Directory -Force ...` - created required Phase 02 and Project Intake folders.
- `npm run typecheck` - passed.
- First `npm run build` - failed in sandbox with Vite/esbuild `spawn EPERM`.
- Escalated `npm run build` - passed.
- `npm test` - passed.
- First escalated `npm run test:work-cards` - build passed, validation failed because the new source assertion expected a JSX phrase to be contiguous.
- Updated the validation assertion to check stable visible source text pieces.
- Escalated `npm run test:work-cards` rerun - passed and reported `Work Card fixture validation passed.`
- `git status --short` - reviewed scoped WC01 changes and pre-existing untracked files.
- `git diff --check` - no whitespace errors; Windows line-ending warnings only.

## Validation Performed

- `npm run typecheck` - passed.
- `npm run build` - passed when escalated after sandbox `spawn EPERM`.
- `npm test` - passed.
- `npm run test:work-cards` - passed when escalated because it runs build first.
- Validation now confirms:
  - Phase 02 WC01 JSON validates.
  - Phase 02 WC01 Markdown matches the Work Card renderer output.
  - Existing Phase 01 Work Cards still validate.
  - Project Intake fixture validates.
  - Project Intake Markdown includes required headings and next-step copy.
  - Required Project Intake fields produce blocking errors when missing.
  - Optional-but-important fields produce warnings without blocking save.
  - Project Intake slug, artifact filename, and path sanitizer reject traversal examples such as `../bad`.

## Validation Skipped And Reason

- Manual Electron UI validation was not performed from Codex. The automated build and Work Card validation passed, but Operator visual/manual validation is still required.
- No actual Project Intake save was performed from the UI because this pass should not seed a fake project-level intake artifact.
- No release/package/install validation was run because release readiness, packaging, installers, tags, and pushes are out of scope.

## Manual Electron Validation Requirement

Manual Operator validation should confirm:

- App opens.
- `Project Intake` mode is visible.
- Project Intake fields are plain-language and non-developer-friendly.
- Project Intake preview is visible.
- Saving creates both JSON and Markdown under `planning/project/Project_Intake/`.
- Existing Phase 1 workflow screens still open.
- Existing artifact paths still work.
- No Project Architect Interview prompt is generated yet.
- No Project Profile, Project Roadmap, Phase Plan, or Work Cards are generated from the intake.
- No release tag, push, package, installer, LLM call, provider SDK, database, auth, cloud, deployment, MCP, or connector integration is added.

## Git Actions Performed

- Staging and commit are performed after this report is created.
- Intended commit message: `feat: add project intake capture`
- Commit hash: recorded in the final Implementer response after Git creates the commit. The exact hash cannot be embedded into this same committed report without changing the commit hash.
- Release tag: none.
- Push: none.

## Security/Secret-Safety Notes

- No secrets, API keys, tokens, credentials, or private values were requested, printed, stored, or committed.
- Renderer code does not use direct filesystem access.
- Project Intake writes are mediated through constrained Electron main/preload IPC.
- The renderer cannot provide arbitrary absolute output paths.
- Generated Project Intake filenames are restricted to safe slug values.
- No external network calls, provider SDKs, databases, auth, cloud services, deployment automation, MCP integrations, or connector integrations were added.

## Blocking Questions

None.

## Recommended Next Implementer Task

Operator should manually validate the Project Intake screen, then Architect should define Phase 02 / WC02: Add Project Architect Interview prompt generator.
