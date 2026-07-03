# Work Card: Phase 1 closeout and status management

## Work Card ID

WC08

Created: 2026-06-29T00:00:00.000Z
Updated: 2026-06-29T00:00:00.000Z

## Phase

phase-01

## Status

ready_for_builder

## What Problem Are We Solving?

ChampCity A/I needs a phase-level closeout workflow that summarizes Phase 1 artifacts, identifies missing or incomplete expected artifacts, and records an Operator closeout decision without mutating Work Cards.

## What Should This Accomplish?

Add a Phase Closeout screen, deterministic artifact summary logic, a JSON-compatible closeout record model, Markdown rendering, constrained closeout save IPC, validation coverage, and durable WC08 planning artifacts.

## What Should the User Be Able To Do?

The Operator can review Phase 1 artifact readiness, choose a closeout decision, preview the generated closeout Markdown, and save both JSON and Markdown closeout records under the phase planning folder.

## What Is Included?

- Add `Phase Closeout` to the existing minimal navigation.
- Default the closeout workflow to `phase-01`.
- Read artifact counts and filenames from approved phase artifact folders only.
- Create shared deterministic phase artifact summary logic.
- Show Work Card JSON/Markdown pairing status and missing expected artifact observations.
- Generate deterministic closeout recommendations without overclaiming that the phase is complete.
- Capture Operator closeout decision fields for summary, completed work, remaining work, known risks, notes, and recommended next action.
- Create a JSON-compatible Phase Closeout record type.
- Render deterministic Phase Closeout Markdown with a non-mutating note.
- Save generated JSON and Markdown closeout records under `planning/phases/<phase-folder>/Closeout_Reports/` without silently overwriting existing files.
- Create the WC08 Work Card JSON and Markdown artifacts and the WC08 Builder Report.
- Extend lightweight validation coverage for phase artifact summaries, closeout records, Markdown rendering, path safety, and paired Work Card artifacts.

## What Is Not Included?

- Do not package the app.
- Do not push to GitHub.
- Do not create release tags.
- Do not mutate Work Card status.
- Do not mutate Work Card `riskLevel`.
- Do not execute Builder work.
- Do not call an LLM API.
- Do not implement report grading.
- Do not update Work Card editing.
- Do not execute repair work.
- Do not copy, upload, or manage evidence files.
- Do not start Phase 2 automatically.
- Do not add OpenAI, Anthropic, Ollama, Featherless, LM Studio, or other provider integrations.
- Do not add database, cloud, auth, deployment, MCP, or connector integrations.
- Do not perform a broad UI redesign.
- Do not refactor unrelated source files.

## Requirements

- Renderer code must not read or write files directly.
- Filesystem reads and writes must be mediated by constrained main/preload IPC.
- IPC must normalize and validate paths, reject traversal, reject arbitrary absolute paths from renderer input, restrict phase folder names to safe values, and read only expected artifact file types.
- The summary must include phase ID, artifact counts by folder, Work Card count, paired and missing Work Card artifacts, artifact counts for prompts/reports/repairs/closeouts, missing expected artifact observations, and a deterministic recommendation.
- For Phase 1, expect WC01 through WC08 by the end of this pass.
- Warnings must not be treated as hard blockers.
- Decision options must include close, continue, repair, UI cleanup, release/package readiness, and next phase readiness choices.
- Closeout records must be saved as generated `.json` and `.md` files under `Closeout_Reports`.
- Existing closeout reports must not be silently overwritten.
- Closeout Markdown must include artifact summary, warnings, recommendation, Operator fields, timestamp, and a note that no workflow state is mutated.

## How We Know This Is Done

- Navigation shows `New Work Card`, `Architect Prompt Composer`, `Risk Router`, `Builder Prompt Generator`, `Builder Report Capture`, `Human Validation`, and `Phase Closeout`.
- Phase Closeout displays the selected/default phase.
- Phase Closeout displays artifact counts for `phase-01`.
- Phase Closeout displays Work Card JSON/Markdown pairing status.
- Phase Closeout displays warnings for missing expected artifacts when present.
- Phase Closeout displays a deterministic recommendation.
- The Operator can select a closeout decision.
- The Operator can enter closeout summary, completed items, remaining items, known risks, notes, and recommended next action.
- A Markdown preview is visible.
- Saving creates both JSON and Markdown closeout records under `planning/phases/phase-01/Closeout_Reports/`.
- Work Card JSON and Markdown files are not modified.
- Builder Reports and Validation Reports are not modified.
- No release tag is created.
- No push is performed.
- The app does not package or deploy anything.
- `npm run typecheck`, `npm run build`, `npm test`, and `npm run test:work-cards` pass.

## How This Should Be Validated

- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards`.
- Run any new closeout validation script if one is added.
- Run `git status --short` and review changed files.
- Manually run `npm start` to validate the Electron UI.

## Risk Level

medium

## Risks and Watch Items

- Manual Electron UI validation is still required because no renderer smoke test exists yet.
- Artifact summary logic could overstate readiness if it treats file presence as proof of completion, so recommendation wording must stay cautious.
- Path safety must remain constrained because this screen reads multiple phase artifact folders and writes generated closeout records.
- Existing Closeout Reports must be protected from silent overwrite.

## Builder Instructions

- Verify the repository path before editing.
- Read `AGENTS.md`, the WC01-WC07 Builder Reports, relevant repair/fix reports, and the existing WC01-WC07 Work Card JSON artifacts before implementation.
- Keep the pass limited to WC08 Phase Closeout summary, constrained IPC, closeout record saving, validation coverage, the WC08 Work Card artifacts, and the Builder Report.
- Do not package the app, push to GitHub, create release tags, mutate Work Card status or risk levels, execute Builder work, add provider SDKs, or implement unrelated features.
- Run the required validation commands and document results in the Builder Report.
- Stage only files created or modified for WC08 and commit with `feat: add phase closeout workflow`.

## Operator Notes

- A Work Card is the smallest buildable unit of work that can be handed to a Builder.
- A Work Card should never be authored by the Operator alone.
- WC08 records a phase-level closeout decision only.
- WC08 must not automatically close, approve, fail, repair, or mutate Work Cards.
- The closeout record helps the Architect and Operator decide whether Phase 1 needs repair, UI cleanup, release/package readiness, closeout, or next-phase planning.

## Builder Handoff Prompt

Use this as the starting Builder prompt:

You are acting as Builder for ChampCity A/I.

Before editing:
- Verify the repository path before editing. Expected repository: `<PROJECT_REPO>`.
- Read `AGENTS.md` and relevant planning files.

Work Card: WC08 - Phase 1 closeout and status management

Goal: Add a Phase Closeout screen, deterministic artifact summary logic, a JSON-compatible closeout record model, Markdown rendering, constrained closeout save IPC, validation coverage, and durable WC08 planning artifacts.

Scope:
- Add `Phase Closeout` to the existing minimal navigation.
- Default the closeout workflow to `phase-01`.
- Read artifact counts and filenames from approved phase artifact folders only.
- Create shared deterministic phase artifact summary logic.
- Show Work Card JSON/Markdown pairing status and missing expected artifact observations.
- Generate deterministic closeout recommendations without overclaiming that the phase is complete.
- Capture Operator closeout decision fields for summary, completed work, remaining work, known risks, notes, and recommended next action.
- Create a JSON-compatible Phase Closeout record type.
- Render deterministic Phase Closeout Markdown with a non-mutating note.
- Save generated JSON and Markdown closeout records under `planning/phases/<phase-folder>/Closeout_Reports/` without silently overwriting existing files.
- Create the WC08 Work Card JSON and Markdown artifacts and the WC08 Builder Report.
- Extend lightweight validation coverage for phase artifact summaries, closeout records, Markdown rendering, path safety, and paired Work Card artifacts.

Out of scope:
- Do not package the app.
- Do not push to GitHub.
- Do not create release tags.
- Do not mutate Work Card status.
- Do not mutate Work Card `riskLevel`.
- Do not execute Builder work.
- Do not call an LLM API.
- Do not implement report grading.
- Do not update Work Card editing.
- Do not execute repair work.
- Do not copy, upload, or manage evidence files.
- Do not start Phase 2 automatically.
- Do not add OpenAI, Anthropic, Ollama, Featherless, LM Studio, or other provider integrations.
- Do not add database, cloud, auth, deployment, MCP, or connector integrations.
- Do not perform a broad UI redesign.
- Do not refactor unrelated source files.

Requirements:
- Renderer code must not read or write files directly.
- Filesystem reads and writes must be mediated by constrained main/preload IPC.
- IPC must normalize and validate paths, reject traversal, reject arbitrary absolute paths from renderer input, restrict phase folder names to safe values, and read only expected artifact file types.
- The summary must include phase ID, artifact counts by folder, Work Card count, paired and missing Work Card artifacts, artifact counts for prompts/reports/repairs/closeouts, missing expected artifact observations, and a deterministic recommendation.
- For Phase 1, expect WC01 through WC08 by the end of this pass.
- Warnings must not be treated as hard blockers.
- Decision options must include close, continue, repair, UI cleanup, release/package readiness, and next phase readiness choices.
- Closeout records must be saved as generated `.json` and `.md` files under `Closeout_Reports`.
- Existing closeout reports must not be silently overwritten.
- Closeout Markdown must include artifact summary, warnings, recommendation, Operator fields, timestamp, and a note that no workflow state is mutated.

Acceptance criteria:
- Navigation shows `New Work Card`, `Architect Prompt Composer`, `Risk Router`, `Builder Prompt Generator`, `Builder Report Capture`, `Human Validation`, and `Phase Closeout`.
- Phase Closeout displays the selected/default phase.
- Phase Closeout displays artifact counts for `phase-01`.
- Phase Closeout displays Work Card JSON/Markdown pairing status.
- Phase Closeout displays warnings for missing expected artifacts when present.
- Phase Closeout displays a deterministic recommendation.
- The Operator can select a closeout decision.
- The Operator can enter closeout summary, completed items, remaining items, known risks, notes, and recommended next action.
- A Markdown preview is visible.
- Saving creates both JSON and Markdown closeout records under `planning/phases/phase-01/Closeout_Reports/`.
- Work Card JSON and Markdown files are not modified.
- Builder Reports and Validation Reports are not modified.
- No release tag is created.
- No push is performed.
- The app does not package or deploy anything.
- `npm run typecheck`, `npm run build`, `npm test`, and `npm run test:work-cards` pass.

Validation plan:
- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards`.
- Run any new closeout validation script if one is added.
- Run `git status --short` and review changed files.
- Manually run `npm start` to validate the Electron UI.

Builder Report:
- Create a Builder Report under `planning/phases/phase-01/Builder_Reports/` and include commands run, validation results, security notes, git actions, and the recommended next Builder task.
