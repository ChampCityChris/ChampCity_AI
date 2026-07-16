<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-01/work_card/WC05",
  "artifactType": "work_card",
  "createdAt": "2026-06-29T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-01/Work_Cards/WC05_generate_builder_prompt.json",
  "markdownPath": "planning/phases/phase-01/Work_Cards/WC05_generate_builder_prompt.md",
  "payload": {
    "kind": "work_card",
    "title": "Generate Builder prompt"
  },
  "payloadHash": "sha256:99e7bf7d68db23430f423bab4f5126b5d0bffbac32e8f8472aff0f4d5eb7da44",
  "phaseId": "phase-01",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-16T00:00:00.000Z",
  "workCardId": "WC05"
}
-->

# Work Card: Generate Builder prompt

## Work Card ID

WC05

Created: 2026-06-29T00:00:00.000Z
Updated: 2026-06-29T00:00:00.000Z

## Phase

phase-01

## Status

ready_for_builder

## What Problem Are We Solving?

ChampCity A/I needs a manual Builder prompt generation step that turns validated Work Card artifacts and optional supporting context into a precise copy-ready Builder prompt without calling an LLM API or executing Builder work.

## What Should This Accomplish?

Add a Builder Prompt Generator screen and shared deterministic renderer that lets the Operator select a saved Work Card JSON artifact, optionally include supporting artifacts, copy the generated Builder prompt, and save it as durable Markdown.

## What Should the User Be Able To Do?

The Operator can complete the manual MVP handoff loop by selecting a validated Work Card, reviewing a generated Builder prompt, copying it for Builder use, and saving the prompt artifact under the phase planning folder.

## What Is Included?

- Add minimal navigation for `Builder Prompt Generator` alongside the existing Work Card screens.
- Allow selecting saved Work Card JSON files from `planning/phases/<phase-folder>/Work_Cards/` with `phase-01` as the default phase.
- Provide optional selectors for matching Work Card Markdown, Architect Prompt, Risk Review, and Prior Builder Report artifacts.
- Default optional selectors to matching artifacts by Work Card ID where feasible and show plain-language notes when optional artifacts are missing.
- Add constrained main/preload IPC to list and read approved planning artifact folders and to save Builder Prompt Markdown under `Builder_Prompts`.
- Validate loaded Work Card JSON with the existing Work Card validator before prompt generation.
- Create shared deterministic Builder prompt rendering logic under `src/shared/workCards/`.
- Generate prompts from the Work Card JSON as the primary source of truth, with selected supporting artifacts included as context only.
- Add copy-to-clipboard behavior using browser clipboard APIs with a plain-language fallback error.
- Create the WC05 Work Card JSON and Markdown artifacts and the WC05 Builder Report.
- Extend lightweight Work Card validation coverage for Builder prompt rendering and path safety.

## What Is Not Included?

- Do not call an LLM API.
- Do not implement automatic Architect reasoning.
- Do not execute Builder work.
- Do not generate prompts for simple fixes or repairs yet.
- Do not modify selected Work Cards.
- Do not update Work Card status.
- Do not update Work Card `riskLevel`.
- Do not implement Work Card editing.
- Do not implement Builder Report capture workflow.
- Do not implement validation or repair loops.
- Do not add OpenAI, Anthropic, Ollama, Featherless, LM Studio, or other provider integrations.
- Do not add database, cloud, auth, deployment, MCP, or connector integrations.
- Do not perform a broad UI redesign.
- Do not refactor unrelated source files.

## Requirements

- Renderer code must not read or write files directly.
- Filesystem reads and writes must be mediated by constrained main/preload IPC.
- IPC must normalize and validate paths, reject traversal, reject arbitrary absolute paths, restrict phase folder names to safe values, and read only `.json` Work Cards and `.md` supporting artifacts.
- The Builder prompt renderer must be deterministic string generation only and must not call an LLM, external API, filesystem API, or shell command.
- The generated Builder prompt must include role and repository, Work Card identity, required repo checks, goal, problem, user outcome, scope, out of scope, requirements, acceptance criteria, validation plan, risk review summary, supporting artifact context, Builder Report requirement, Git instructions, and out-of-scope guard language.
- Always include validation commands: `npm run typecheck`, `npm run build`, `npm test`, `npm run test:work-cards`, and `git status --short`.
- Include high-risk warning language when selected Risk Review context appears high risk.
- Include no-risk-review warning language when no Risk Review artifact is selected.
- Save Builder Prompt artifacts with filenames matching `BUILDER_PROMPT_<work_card_id>_<slug>.md`.
- WC05 must not edit Work Card JSON or Markdown, change Work Card status, change Work Card `riskLevel`, push to GitHub, or create release tags.

## How We Know This Is Done

- Navigation shows `New Work Card`, `Architect Prompt Composer`, `Risk Router`, and `Builder Prompt Generator`.
- Builder Prompt Generator lists saved Work Card JSON files for `phase-01`.
- Selecting a Work Card displays its ID, title, phase, status, and risk level.
- Optional artifact selectors appear for Work Card Markdown, Architect Prompt, Risk Review, and Prior Builder Report.
- Matching optional artifacts are selected by default where feasible.
- Missing optional artifacts show a plain-language note and do not block prompt generation.
- Generated Builder prompt is visible and includes repo checks, validation commands, out-of-scope guard, Git instructions, and Builder Report requirement.
- High-risk Risk Review context produces the required high-risk warning language.
- Missing Risk Review context produces a warning but does not block generation.
- `Copy Prompt` works or shows a plain-language fallback error.
- Saving creates Markdown under `planning/phases/phase-01/Builder_Prompts/`.
- Work Card JSON and Markdown files are not modified.
- `npm run typecheck`, `npm run build`, `npm test`, and `npm run test:work-cards` pass.

## How This Should Be Validated

- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards`.
- Run `git status --short` and review changed files.
- Manually run `npm start` to validate the Electron UI.

## Risk Level

medium

## Risks and Watch Items

- Manual Electron UI validation is still required because no renderer smoke test exists yet.
- Path safety must remain constrained as more planning artifact folders are listed and read.
- Prompt wording must preserve the Work Card as source of truth and must not imply approval without selected Risk Review context.
- Supporting artifacts could duplicate Work Card content, so selected context should be bounded without being omitted.

## Builder Instructions

- Verify the repository path before editing.
- Read `AGENTS.md`, the WC01-WC04 Builder Reports, and the existing WC01-WC04 Work Card JSON artifacts before implementation.
- Keep the pass limited to WC05 Builder prompt generation, constrained IPC, prompt saving, validation coverage, the WC05 Work Card artifacts, and the Builder Report.
- Do not call LLM APIs, execute Builder work, modify selected Work Cards, update Work Card statuses or risk levels, add provider SDKs, or implement unrelated features.
- Run the required validation commands and document results in the Builder Report.
- Stage only files created or modified for WC05 and commit with `feat: add builder prompt generator`.

## Operator Notes

- A Work Card is the smallest buildable unit of work that can be handed to a Builder.
- A Work Card should never be authored by the Operator alone.
- WC05 generates a Builder prompt from validated artifacts only.
- The Builder Prompt Generator must not perform Architect reasoning, revise the Work Card, or execute Builder work.
- This completes the first manual MVP handoff loop: capture draft Work Card, generate Architect framing prompt, generate Risk Review, generate Builder prompt.

## Builder Handoff Prompt

Use this as the starting Builder prompt:

You are acting as Builder for ChampCity A/I.

Before editing:
- Verify the repository path before editing. Expected repository: `<PROJECT_REPO>`.
- Read `AGENTS.md` and relevant planning files.

Work Card: WC05 - Generate Builder prompt

Goal: Add a Builder Prompt Generator screen and shared deterministic renderer that lets the Operator select a saved Work Card JSON artifact, optionally include supporting artifacts, copy the generated Builder prompt, and save it as durable Markdown.

Scope:
- Add minimal navigation for `Builder Prompt Generator` alongside the existing Work Card screens.
- Allow selecting saved Work Card JSON files from `planning/phases/<phase-folder>/Work_Cards/` with `phase-01` as the default phase.
- Provide optional selectors for matching Work Card Markdown, Architect Prompt, Risk Review, and Prior Builder Report artifacts.
- Default optional selectors to matching artifacts by Work Card ID where feasible and show plain-language notes when optional artifacts are missing.
- Add constrained main/preload IPC to list and read approved planning artifact folders and to save Builder Prompt Markdown under `Builder_Prompts`.
- Validate loaded Work Card JSON with the existing Work Card validator before prompt generation.
- Create shared deterministic Builder prompt rendering logic under `src/shared/workCards/`.
- Generate prompts from the Work Card JSON as the primary source of truth, with selected supporting artifacts included as context only.
- Add copy-to-clipboard behavior using browser clipboard APIs with a plain-language fallback error.
- Create the WC05 Work Card JSON and Markdown artifacts and the WC05 Builder Report.
- Extend lightweight Work Card validation coverage for Builder prompt rendering and path safety.

Out of scope:
- Do not call an LLM API.
- Do not implement automatic Architect reasoning.
- Do not execute Builder work.
- Do not generate prompts for simple fixes or repairs yet.
- Do not modify selected Work Cards.
- Do not update Work Card status.
- Do not update Work Card `riskLevel`.
- Do not implement Work Card editing.
- Do not implement Builder Report capture workflow.
- Do not implement validation or repair loops.
- Do not add OpenAI, Anthropic, Ollama, Featherless, LM Studio, or other provider integrations.
- Do not add database, cloud, auth, deployment, MCP, or connector integrations.
- Do not perform a broad UI redesign.
- Do not refactor unrelated source files.

Requirements:
- Renderer code must not read or write files directly.
- Filesystem reads and writes must be mediated by constrained main/preload IPC.
- IPC must normalize and validate paths, reject traversal, reject arbitrary absolute paths, restrict phase folder names to safe values, and read only `.json` Work Cards and `.md` supporting artifacts.
- The Builder prompt renderer must be deterministic string generation only and must not call an LLM, external API, filesystem API, or shell command.
- The generated Builder prompt must include role and repository, Work Card identity, required repo checks, goal, problem, user outcome, scope, out of scope, requirements, acceptance criteria, validation plan, risk review summary, supporting artifact context, Builder Report requirement, Git instructions, and out-of-scope guard language.
- Always include validation commands: `npm run typecheck`, `npm run build`, `npm test`, `npm run test:work-cards`, and `git status --short`.
- Include high-risk warning language when selected Risk Review context appears high risk.
- Include no-risk-review warning language when no Risk Review artifact is selected.
- Save Builder Prompt artifacts with filenames matching `BUILDER_PROMPT_<work_card_id>_<slug>.md`.
- WC05 must not edit Work Card JSON or Markdown, change Work Card status, change Work Card `riskLevel`, push to GitHub, or create release tags.

Acceptance criteria:
- Navigation shows `New Work Card`, `Architect Prompt Composer`, `Risk Router`, and `Builder Prompt Generator`.
- Builder Prompt Generator lists saved Work Card JSON files for `phase-01`.
- Selecting a Work Card displays its ID, title, phase, status, and risk level.
- Optional artifact selectors appear for Work Card Markdown, Architect Prompt, Risk Review, and Prior Builder Report.
- Matching optional artifacts are selected by default where feasible.
- Missing optional artifacts show a plain-language note and do not block prompt generation.
- Generated Builder prompt is visible and includes repo checks, validation commands, out-of-scope guard, Git instructions, and Builder Report requirement.
- High-risk Risk Review context produces the required high-risk warning language.
- Missing Risk Review context produces a warning but does not block generation.
- `Copy Prompt` works or shows a plain-language fallback error.
- Saving creates Markdown under `planning/phases/phase-01/Builder_Prompts/`.
- Work Card JSON and Markdown files are not modified.
- `npm run typecheck`, `npm run build`, `npm test`, and `npm run test:work-cards` pass.

Validation plan:
- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards`.
- Run `git status --short` and review changed files.
- Manually run `npm start` to validate the Electron UI.

Builder Report:
- Create a Builder Report under `planning/phases/phase-01/Builder_Reports/` and include commands run, validation results, security notes, git actions, and the recommended next Builder task.
