# Work Card: Add Project Architect Interview prompt generator

## Work Card ID

WC02

Created: 2026-06-30T18:00:00.000Z
Updated: 2026-06-30T18:00:00.000Z

## Phase

phase-02

## Status

ready_for_builder

## What Problem Are We Solving?

Project Intake capture exists, but the Operator still has to write the next Architect interview prompt by hand before upstream project planning can continue.

## What Should This Accomplish?

Add a prompt-generation workflow that reads a saved Project Intake and produces a copy-ready Project Architect Interview prompt without calling an LLM API.

## What Should the User Be Able To Do?

The Operator can choose a saved Project Intake, preview a high-quality Architect interview prompt, copy it into the Architect surface, and save paired JSON/Markdown prompt artifacts for durable planning records.

## What Is Included?

- Create WC02 JSON and Markdown Work Card artifacts under Phase 02.
- Ensure Phase 02 Work_Cards and Builder_Reports folders and project-level Project Intake and Project Architect Interview Prompt folders exist.
- Add a JSON-compatible Project Architect Interview Prompt shared model.
- Add deterministic Architect interview prompt generation from a validated saved Project Intake.
- Add deterministic Markdown rendering for saved Project Architect Interview Prompt artifacts with the required headings and Next Step copy.
- List saved Project Intake JSON artifacts from `planning/project/Project_Intake/` using constrained main/preload IPC.
- Validate selected Project Intake filenames as basenames matching `PROJECT_INTAKE_<slug>.json` before reading.
- Validate parsed Project Intake JSON with the existing Project Intake validator before generating prompts.
- Save paired prompt JSON/Markdown artifacts under `planning/project/Project_Architect_Interview_Prompts/` with safe `PROJECT_ARCHITECT_INTERVIEW_PROMPT_<slug>` filenames and suffixing.
- Add a Project Architect Interview UI screen or mode with saved intake selection, prompt preview, copy, save, saved-path feedback, and useful error messages.
- Extend Work Card validation coverage for the new prompt model, renderer, filename safety, IPC wiring, and UI labels.
- Create the required WC02 Implementer Report under the legacy `Builder_Reports` folder.

## What Is Not Included?

- Do not call an LLM API.
- Do not create the Project Profile.
- Do not create a Project Roadmap.
- Do not create Phase Intake.
- Do not create Phase Architect Interview.
- Do not create Phase Planning Documents.
- Do not create Work Card Planning Documents.
- Do not generate Work Cards from Project Intake or Project Architect Interview output.
- Do not add provider SDKs.
- Do not add ChatGPT or Claude subscription automation.
- Do not add browser automation.
- Do not add databases, auth, cloud deployment, MCP integration, connector integration, packaging, installers, release tags, or GitHub push behavior.
- Do not perform a broad UI redesign or make the known header and validation phase-selector follow-up issues the focus.
- Do not rename legacy `Builder_*` folders or historical artifact prefixes.

## Requirements

- Saved Project Intake listing must include only safe JSON filenames from `planning/project/Project_Intake/`.
- Renderer code must not directly read or write local files.
- Project Intake reads must go through constrained Electron IPC and must stay inside `planning/project/Project_Intake/`.
- Project Architect Interview Prompt writes must go through constrained Electron IPC and must stay inside `planning/project/Project_Architect_Interview_Prompts/`.
- The renderer must not send arbitrary absolute input or output paths.
- The main process must validate selected filenames as basenames, require `.json`, require the expected Project Intake artifact naming pattern, and reject traversal.
- The generated prompt must tell the Architect to review the Project Intake, infer safe defaults, ask only necessary Operator-judgment questions, provide suggested plain-language answers, preserve Architect / Implementer terminology, and avoid implementation code.
- The generated prompt must explicitly say it does not create the Project Profile, Project Roadmap, Phase Plans, Work Cards, Project Planning Documents, or saved files.
- The saved Markdown prompt artifact must begin with `# Project Architect Interview Prompt: <projectName>` and include all required WC02 headings.
- Saving must create paired JSON/Markdown prompt artifacts without silently overwriting existing files.
- Existing WC01 Project Intake capture and existing Phase 1 workflow screens must still open.
- No out-of-scope provider, storage, auth, cloud, MCP, connector, packaging, release, push, broad redesign, or legacy folder rename work may be added.

## How We Know This Is Done

- A Project Architect Interview prompt generator screen, mode, or section exists.
- Saved Project Intake JSON artifacts can be listed from `planning/project/Project_Intake/`.
- The Operator can select a saved Project Intake.
- The selected Project Intake is read through constrained IPC, not direct renderer filesystem access.
- Invalid or missing Project Intake artifacts produce useful UI errors.
- A generated Architect interview prompt is previewed.
- The prompt includes the selected Project Intake content or a normalized summary.
- The prompt tells the Architect to ask only necessary questions, infer safe defaults, and provide suggested answers in plain language.
- The prompt explicitly does not create the Project Profile, Project Roadmap, Phase Plans, Work Cards, or implementation code.
- The Operator can copy the generated prompt.
- The Operator can save paired JSON/Markdown prompt artifacts under `planning/project/Project_Architect_Interview_Prompts/`.
- Saved prompt filenames follow `PROJECT_ARCHITECT_INTERVIEW_PROMPT_<slug>.json` and `.md`, with suffixing when needed.
- The saved Markdown begins with `# Project Architect Interview Prompt: <projectName>`.
- The saved Markdown includes all required headings and the required Next Step language.
- Existing WC01 Project Intake capture still works.
- Existing Phase 1 workflow screens still open.
- No LLM API call, provider SDK, database, auth, cloud, MCP, connector, package, installer, release tag, push, broad UI redesign, or legacy Builder path rename is added.
- WC02 Work Card JSON/Markdown artifacts are created.
- WC02 Implementer Report is created.

## How This Should Be Validated

- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards`.
- Run `git status --short` and review changed files.
- Manually validate that the Electron app opens, Project Intake still opens, Project Intake save still works, Project Architect Interview is visible, saved Project Intake selection works, prompt preview appears, copy works, save creates paired JSON/Markdown artifacts under `planning/project/Project_Architect_Interview_Prompts/`, existing Phase 1 screens still open, and no downstream planning artifacts or integrations are generated.

## Risk Level

medium

## Risks and Watch Items

- The renderer is still a large single-file React implementation, so the new screen must avoid disrupting existing Phase 1 flows.
- Project-level artifact reads and writes need strict path constraints because they are outside phase-specific Work Card folders.
- The generated prompt must be clear that it starts an interview and does not create final planning outputs yet.
- Manual Electron validation is needed to prove copy/save behavior in the desktop shell.

## Builder Instructions

- Verify the repository path and Git root before editing.
- Read `AGENTS.md`, the WC01 Project Intake artifacts and reports, the Project Intake shared model/render/validate files, main/preload IPC, and renderer source before implementation.
- Keep this pass limited to Project Architect Interview prompt generation from saved Project Intake artifacts.
- Preserve product-facing Architect / Implementer terminology and legacy `Builder_*` compatibility artifact paths.
- Run required validation commands and document results in the WC02 Implementer Report.
- Stage only files changed or created for WC02 and commit with `feat: add project architect interview prompt generator`.

## Operator Notes

- ChampCity A/I means Architect / Implementer.
- The Operator should not have to write the Architect interview prompt manually.
- This Work Card intentionally stops before Project Profile, roadmap, phase planning, and Work Card planning generation.
- Existing legacy Builder artifact names remain compatibility storage names until a dedicated migration Work Card changes them safely.

## Builder Handoff Prompt

Use this as the starting Implementer prompt. The section heading remains a legacy Builder handoff heading for artifact compatibility.

You are acting as Implementer for ChampCity A/I.

The Implementer may be Codex, Claude Code, Cursor, or another coding agent. Build only from this structured handoff and preserve the approved scope.

Before editing:
- Verify the repository path before editing. Expected repository: `C:\Users\chapm\Projects\ChampCity_AI`.
- Read `AGENTS.md` and relevant planning files.

Work Card: WC02 - Add Project Architect Interview prompt generator

Goal: Add a prompt-generation workflow that reads a saved Project Intake and produces a copy-ready Project Architect Interview prompt without calling an LLM API.

Scope:
- Create WC02 JSON and Markdown Work Card artifacts under Phase 02.
- Ensure Phase 02 Work_Cards and Builder_Reports folders and project-level Project Intake and Project Architect Interview Prompt folders exist.
- Add a JSON-compatible Project Architect Interview Prompt shared model.
- Add deterministic Architect interview prompt generation from a validated saved Project Intake.
- Add deterministic Markdown rendering for saved Project Architect Interview Prompt artifacts with the required headings and Next Step copy.
- List saved Project Intake JSON artifacts from `planning/project/Project_Intake/` using constrained main/preload IPC.
- Validate selected Project Intake filenames as basenames matching `PROJECT_INTAKE_<slug>.json` before reading.
- Validate parsed Project Intake JSON with the existing Project Intake validator before generating prompts.
- Save paired prompt JSON/Markdown artifacts under `planning/project/Project_Architect_Interview_Prompts/` with safe `PROJECT_ARCHITECT_INTERVIEW_PROMPT_<slug>` filenames and suffixing.
- Add a Project Architect Interview UI screen or mode with saved intake selection, prompt preview, copy, save, saved-path feedback, and useful error messages.
- Extend Work Card validation coverage for the new prompt model, renderer, filename safety, IPC wiring, and UI labels.
- Create the required WC02 Implementer Report under the legacy `Builder_Reports` folder.

Out of scope:
- Do not call an LLM API.
- Do not create the Project Profile.
- Do not create a Project Roadmap.
- Do not create Phase Intake.
- Do not create Phase Architect Interview.
- Do not create Phase Planning Documents.
- Do not create Work Card Planning Documents.
- Do not generate Work Cards from Project Intake or Project Architect Interview output.
- Do not add provider SDKs.
- Do not add ChatGPT or Claude subscription automation.
- Do not add browser automation.
- Do not add databases, auth, cloud deployment, MCP integration, connector integration, packaging, installers, release tags, or GitHub push behavior.
- Do not perform a broad UI redesign or make the known header and validation phase-selector follow-up issues the focus.
- Do not rename legacy `Builder_*` folders or historical artifact prefixes.

Requirements:
- Saved Project Intake listing must include only safe JSON filenames from `planning/project/Project_Intake/`.
- Renderer code must not directly read or write local files.
- Project Intake reads must go through constrained Electron IPC and must stay inside `planning/project/Project_Intake/`.
- Project Architect Interview Prompt writes must go through constrained Electron IPC and must stay inside `planning/project/Project_Architect_Interview_Prompts/`.
- The renderer must not send arbitrary absolute input or output paths.
- The main process must validate selected filenames as basenames, require `.json`, require the expected Project Intake artifact naming pattern, and reject traversal.
- The generated prompt must tell the Architect to review the Project Intake, infer safe defaults, ask only necessary Operator-judgment questions, provide suggested plain-language answers, preserve Architect / Implementer terminology, and avoid implementation code.
- The generated prompt must explicitly say it does not create the Project Profile, Project Roadmap, Phase Plans, Work Cards, Project Planning Documents, or saved files.
- The saved Markdown prompt artifact must begin with `# Project Architect Interview Prompt: <projectName>` and include all required WC02 headings.
- Saving must create paired JSON/Markdown prompt artifacts without silently overwriting existing files.
- Existing WC01 Project Intake capture and existing Phase 1 workflow screens must still open.
- No out-of-scope provider, storage, auth, cloud, MCP, connector, packaging, release, push, broad redesign, or legacy folder rename work may be added.

Acceptance criteria:
- A Project Architect Interview prompt generator screen, mode, or section exists.
- Saved Project Intake JSON artifacts can be listed from `planning/project/Project_Intake/`.
- The Operator can select a saved Project Intake.
- The selected Project Intake is read through constrained IPC, not direct renderer filesystem access.
- Invalid or missing Project Intake artifacts produce useful UI errors.
- A generated Architect interview prompt is previewed.
- The prompt includes the selected Project Intake content or a normalized summary.
- The prompt tells the Architect to ask only necessary questions, infer safe defaults, and provide suggested answers in plain language.
- The prompt explicitly does not create the Project Profile, Project Roadmap, Phase Plans, Work Cards, or implementation code.
- The Operator can copy the generated prompt.
- The Operator can save paired JSON/Markdown prompt artifacts under `planning/project/Project_Architect_Interview_Prompts/`.
- Saved prompt filenames follow `PROJECT_ARCHITECT_INTERVIEW_PROMPT_<slug>.json` and `.md`, with suffixing when needed.
- The saved Markdown begins with `# Project Architect Interview Prompt: <projectName>`.
- The saved Markdown includes all required headings and the required Next Step language.
- Existing WC01 Project Intake capture still works.
- Existing Phase 1 workflow screens still open.
- No LLM API call, provider SDK, database, auth, cloud, MCP, connector, package, installer, release tag, push, broad UI redesign, or legacy Builder path rename is added.
- WC02 Work Card JSON/Markdown artifacts are created.
- WC02 Implementer Report is created.

Validation plan:
- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards`.
- Run `git status --short` and review changed files.
- Manually validate that the Electron app opens, Project Intake still opens, Project Intake save still works, Project Architect Interview is visible, saved Project Intake selection works, prompt preview appears, copy works, save creates paired JSON/Markdown artifacts under `planning/project/Project_Architect_Interview_Prompts/`, existing Phase 1 screens still open, and no downstream planning artifacts or integrations are generated.

Implementer Report:
- Create an Implementer Report under the legacy `planning/phases/phase-02/Builder_Reports/` folder and include commands run, validation results, security notes, git actions, and the recommended next Implementer task.
