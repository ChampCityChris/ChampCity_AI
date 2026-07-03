# Work Card: Add Project Intake capture

## Work Card ID

WC01

Created: 2026-06-30T15:00:00.000Z
Updated: 2026-06-30T15:00:00.000Z

## Phase

phase-02

## Status

ready_for_builder

## What Problem Are We Solving?

Phase 1 proved the Work Card execution loop, but ChampCity A/I still lacks the higher-level Project Intake workflow that lets a non-developer Operator start a new project in plain language.

## What Should This Accomplish?

Add Project Intake capture as the first upstream planning workflow, saving durable JSON and Markdown artifacts that the Architect can use later.

## What Should the User Be Able To Do?

The Operator can open a Project Intake screen, fill in plain-language project fields, preview the generated Markdown, and save paired Project Intake artifacts under project-level planning storage.

## What Is Included?

- Create Phase 02 scaffold folders for Work Cards and Builder Reports.
- Create WC01 JSON and Markdown Work Card artifacts for Phase 02.
- Add a simple JSON-compatible Project Intake shared model.
- Add lightweight Project Intake validation with blocking errors and non-blocking warnings.
- Add deterministic Project Intake Markdown rendering with non-developer-friendly headings.
- Add a Project Intake top-level UI mode without removing existing Phase 1 workflow screens.
- Add constrained main/preload IPC for saving Project Intake JSON and Markdown under `planning/project/Project_Intake/`.
- Generate safe `PROJECT_INTAKE_<slug>.json` and `PROJECT_INTAKE_<slug>.md` filenames without silently overwriting existing artifacts.
- Show a Markdown preview that states the next step is a Project Architect Interview prompt.
- Extend lightweight validation coverage for Phase 02 WC01 artifacts, existing Phase 01 Work Cards, Project Intake validation, rendering, warnings, and filename safety.
- Create the required WC01 Implementer Report under the legacy `Builder_Reports` folder.

## What Is Not Included?

- Do not generate Project Architect Interview prompts.
- Do not create a Project Profile.
- Do not create a Project Roadmap.
- Do not create phase plans.
- Do not create Work Cards from Project Intake.
- Do not call an LLM API.
- Do not add provider SDKs.
- Do not add authentication, databases, cloud services, deployment automation, MCP integrations, connector integrations, or deployment tooling.
- Do not package the app or create installers.
- Do not create release tags.
- Do not push to GitHub.
- Do not redesign the app shell or rename legacy `Builder_*` artifact folders.

## Requirements

- The Project Intake model must stay simple and JSON-compatible.
- Required fields must include project name, product summary, target users, user problem, desired user outcome, and source of truth location.
- Warnings must be returned for missing known constraints, non-goals, security or data concerns, and Operator uncertainties without blocking save.
- The Markdown renderer must use plain-language headings and include the required next-step statement.
- Renderer code must not write files directly.
- Main/preload IPC must constrain Project Intake writes to `planning/project/Project_Intake/`.
- Path handling must normalize and validate paths, reject traversal, reject arbitrary absolute paths from renderer input, and restrict generated filenames to safe slug values.
- Saving must create only generated Project Intake JSON and Markdown artifacts and must not silently overwrite existing files.
- Existing Work Card capture, Architect Prompt Composer, Risk Router, Implementer Prompt Generator, Implementer Report Capture, Human Validation, and Phase Closeout screens must remain available.
- No Project Architect Interview generator, Project Profile, roadmap, phase plan, Work Card generator, LLM call, SDK, database, auth, cloud, MCP, or connector integration may be added.

## How We Know This Is Done

- Phase 02 WC01 JSON validates against the existing Work Card schema.
- Phase 02 WC01 Markdown matches the existing Work Card renderer output.
- A Project Intake screen or mode is visible in the app.
- The Project Intake screen uses plain-language fields for the Operator.
- The Project Intake preview uses the deterministic Project Intake Markdown renderer.
- Saving Project Intake creates both JSON and Markdown files under `planning/project/Project_Intake/`.
- Filename generation uses safe `PROJECT_INTAKE_<slug>` names and suffixes duplicates or rejects unsafe values.
- The Project Intake artifact clearly says it does not create the Project Profile or Work Cards by itself.
- Existing Phase 1 workflow screens still open.
- No Project Architect Interview prompt is generated.
- No Project Profile, Project Roadmap, Phase Plan, or Work Cards are generated from the intake.
- `npm run typecheck`, `npm run build`, `npm test`, `npm run test:work-cards`, and `git status --short` are run and documented.

## How This Should Be Validated

- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards`.
- Run `git status --short` and review changed files.
- Manually validate that the Electron app opens, the Project Intake mode is visible, saving creates JSON and Markdown under `planning/project/Project_Intake/`, existing Phase 1 screens still open, and no downstream Architect Interview/Profile/Roadmap/Work Card generation occurs.

## Risk Level

medium

## Risks and Watch Items

- Project Intake is an upstream workflow and must not be confused with Work Card generation.
- The renderer is a large existing single-file React implementation, so changes must avoid breaking existing Phase 1 flows.
- Path safety is important because Project Intake saves project-level artifacts rather than phase-level artifacts.
- Manual Electron validation is still required to confirm the new screen and save flow in the desktop app.

## Builder Instructions

- Verify the repository path and Git root before editing.
- Read `AGENTS.md`, Phase 1 closeout artifacts, latest WC10 UI repair reports, renderer source, main/preload IPC, and shared Work Card files before implementation.
- Keep this pass limited to Project Intake capture and durable Project Intake artifacts.
- Preserve legacy `Builder_*` folder names for compatibility while using Implementer in product-facing copy.
- Run required validation commands and document results in the Builder Report.
- Stage only files changed or created for Phase 02 WC01 and commit with `feat: add project intake capture`.

## Operator Notes

- ChampCity A/I means Architect / Implementer.
- The app should help the Operator summon the Architect, not force the Operator to think like an architect.
- Project Intake is the first step in the future upstream flow before Project Architect Interview and planning documents.
- This Work Card intentionally stops before generating the Project Architect Interview prompt.

## Builder Handoff Prompt

Use this as the starting Implementer prompt. The section heading remains a legacy Builder handoff heading for artifact compatibility.

You are acting as Implementer for ChampCity A/I.

The Implementer may be Codex, Claude Code, Cursor, or another coding agent. Build only from this structured handoff and preserve the approved scope.

Before editing:
- Verify the repository path before editing. Expected repository: `<PROJECT_REPO>`.
- Read `AGENTS.md` and relevant planning files.

Work Card: WC01 - Add Project Intake capture

Goal: Add Project Intake capture as the first upstream planning workflow, saving durable JSON and Markdown artifacts that the Architect can use later.

Scope:
- Create Phase 02 scaffold folders for Work Cards and Builder Reports.
- Create WC01 JSON and Markdown Work Card artifacts for Phase 02.
- Add a simple JSON-compatible Project Intake shared model.
- Add lightweight Project Intake validation with blocking errors and non-blocking warnings.
- Add deterministic Project Intake Markdown rendering with non-developer-friendly headings.
- Add a Project Intake top-level UI mode without removing existing Phase 1 workflow screens.
- Add constrained main/preload IPC for saving Project Intake JSON and Markdown under `planning/project/Project_Intake/`.
- Generate safe `PROJECT_INTAKE_<slug>.json` and `PROJECT_INTAKE_<slug>.md` filenames without silently overwriting existing artifacts.
- Show a Markdown preview that states the next step is a Project Architect Interview prompt.
- Extend lightweight validation coverage for Phase 02 WC01 artifacts, existing Phase 01 Work Cards, Project Intake validation, rendering, warnings, and filename safety.
- Create the required WC01 Implementer Report under the legacy `Builder_Reports` folder.

Out of scope:
- Do not generate Project Architect Interview prompts.
- Do not create a Project Profile.
- Do not create a Project Roadmap.
- Do not create phase plans.
- Do not create Work Cards from Project Intake.
- Do not call an LLM API.
- Do not add provider SDKs.
- Do not add authentication, databases, cloud services, deployment automation, MCP integrations, connector integrations, or deployment tooling.
- Do not package the app or create installers.
- Do not create release tags.
- Do not push to GitHub.
- Do not redesign the app shell or rename legacy `Builder_*` artifact folders.

Requirements:
- The Project Intake model must stay simple and JSON-compatible.
- Required fields must include project name, product summary, target users, user problem, desired user outcome, and source of truth location.
- Warnings must be returned for missing known constraints, non-goals, security or data concerns, and Operator uncertainties without blocking save.
- The Markdown renderer must use plain-language headings and include the required next-step statement.
- Renderer code must not write files directly.
- Main/preload IPC must constrain Project Intake writes to `planning/project/Project_Intake/`.
- Path handling must normalize and validate paths, reject traversal, reject arbitrary absolute paths from renderer input, and restrict generated filenames to safe slug values.
- Saving must create only generated Project Intake JSON and Markdown artifacts and must not silently overwrite existing files.
- Existing Work Card capture, Architect Prompt Composer, Risk Router, Implementer Prompt Generator, Implementer Report Capture, Human Validation, and Phase Closeout screens must remain available.
- No Project Architect Interview generator, Project Profile, roadmap, phase plan, Work Card generator, LLM call, SDK, database, auth, cloud, MCP, or connector integration may be added.

Acceptance criteria:
- Phase 02 WC01 JSON validates against the existing Work Card schema.
- Phase 02 WC01 Markdown matches the existing Work Card renderer output.
- A Project Intake screen or mode is visible in the app.
- The Project Intake screen uses plain-language fields for the Operator.
- The Project Intake preview uses the deterministic Project Intake Markdown renderer.
- Saving Project Intake creates both JSON and Markdown files under `planning/project/Project_Intake/`.
- Filename generation uses safe `PROJECT_INTAKE_<slug>` names and suffixes duplicates or rejects unsafe values.
- The Project Intake artifact clearly says it does not create the Project Profile or Work Cards by itself.
- Existing Phase 1 workflow screens still open.
- No Project Architect Interview prompt is generated.
- No Project Profile, Project Roadmap, Phase Plan, or Work Cards are generated from the intake.
- `npm run typecheck`, `npm run build`, `npm test`, `npm run test:work-cards`, and `git status --short` are run and documented.

Validation plan:
- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards`.
- Run `git status --short` and review changed files.
- Manually validate that the Electron app opens, the Project Intake mode is visible, saving creates JSON and Markdown under `planning/project/Project_Intake/`, existing Phase 1 screens still open, and no downstream Architect Interview/Profile/Roadmap/Work Card generation occurs.

Implementer Report:
- Create an Implementer Report under the legacy `planning/phases/phase-02/Builder_Reports/` folder and include commands run, validation results, security notes, git actions, and the recommended next Implementer task.
