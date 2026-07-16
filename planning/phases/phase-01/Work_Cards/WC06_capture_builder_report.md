<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-01/work_card/WC06",
  "artifactType": "work_card",
  "createdAt": "2026-06-29T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-01/Work_Cards/WC06_capture_builder_report.json",
  "markdownPath": "planning/phases/phase-01/Work_Cards/WC06_capture_builder_report.md",
  "payload": {
    "kind": "work_card",
    "title": "Capture Builder Report"
  },
  "payloadHash": "sha256:7fcf9054b26de172d1bf6ba3bf7e19b5c8379c52347ddbf9c387ad0983616239",
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
  "workCardId": "WC06"
}
-->

# Work Card: Capture Builder Report

## Work Card ID

WC06

Created: 2026-06-29T00:00:00.000Z
Updated: 2026-06-29T00:00:00.000Z

## Phase

phase-01

## Status

ready_for_builder

## What Problem Are We Solving?

ChampCity A/I needs a durable Builder Report Capture step that preserves Builder reports as evidence after prompt generation without judging Builder quality or mutating Work Cards.

## What Should This Accomplish?

Add a Builder Report Capture screen and deterministic shared helpers that let the Operator paste or import a report, associate it with a Work Card when relevant, review validation warnings, generate a safe filename, and save Markdown under the phase Builder_Reports folder.

## What Should the User Be Able To Do?

The Operator can complete the post-Builder evidence loop by saving imperfect but useful Builder Reports in the correct phase folder while keeping Work Card status and risk data unchanged.

## What Is Included?

- Add minimal navigation for `Builder Report Capture` alongside the existing Work Card workflow screens.
- Allow selecting saved Work Card JSON files from `planning/phases/<phase-folder>/Work_Cards/` with `phase-01` as the default phase.
- Add report type handling for `Work Card`, `Fix`, `Repair`, and `Other` reports.
- Provide a large paste/edit text area as the primary Builder Report capture path.
- Support importing `.md` and `.txt` report files through a standard renderer file input and show imported text for review before save.
- Create shared deterministic Builder Report validation that warns about missing AGENTS.md report sections without blocking imperfect non-empty reports.
- Detect and display whether commit hash, validation results, blocking questions or blockers, and recommended next task appear in the report text.
- Generate safe Builder Report filenames from report type, selected Work Card when available, and a sanitized topic field.
- Add constrained main/preload IPC to save captured Markdown only under `planning/phases/<phase-folder>/Builder_Reports/` without silently overwriting existing files.
- Create the WC06 Work Card JSON and Markdown artifacts and the WC06 Builder Report.
- Extend lightweight validation coverage for Builder Report validation, filename generation, path safety, and paired Work Card artifacts.

## What Is Not Included?

- Do not call an LLM API.
- Do not evaluate Builder quality deeply.
- Do not implement report grading.
- Do not create a report index.
- Do not update Work Card status.
- Do not update Work Card `riskLevel`.
- Do not implement Work Card editing.
- Do not implement the human validation and repair loop.
- Do not execute Builder work.
- Do not generate prompts for repairs or fixes beyond report filename handling.
- Do not add OpenAI, Anthropic, Ollama, Featherless, LM Studio, or other provider integrations.
- Do not add database, cloud, auth, deployment, MCP, or connector integrations.
- Do not perform a broad UI redesign.
- Do not refactor unrelated source files.

## Requirements

- Renderer code must not write files directly.
- Filesystem writes must be mediated by constrained main/preload IPC.
- IPC must normalize and validate paths, reject traversal, reject arbitrary absolute paths, restrict phase folder names and generated filenames to safe values, and save only `.md` Builder Report files.
- Work Card association is required for Work Card reports and optional for Fix, Repair, and Other reports.
- Imported files must be limited to `.md` and `.txt` text files and must be saved through the same constrained capture flow as pasted text.
- Builder Report validation must return structured detected fields and warnings for missing required sections from `AGENTS.md`.
- `validEnoughToSave` must be false for empty text and generally true for non-empty imperfect reports so evidence is preserved.
- Filename generation must support Work Card, Fix, Repair, and Other report types.
- Generated filenames must be visible before save and must not allow arbitrary path or full filename input.
- Existing report files must not be silently overwritten.
- WC06 must not edit Work Card JSON or Markdown, change Work Card status, change Work Card `riskLevel`, create a report index, push to GitHub, or create release tags.

## How We Know This Is Done

- Navigation shows `New Work Card`, `Architect Prompt Composer`, `Risk Router`, `Builder Prompt Generator`, and `Builder Report Capture`.
- Builder Report Capture lists saved Work Card JSON files for `phase-01`.
- Selecting a Work Card displays its ID, title, phase, status, and risk level.
- Report type selector shows `Work Card`, `Fix`, `Repair`, and `Other`.
- The Operator can paste Builder Report Markdown into a large text area.
- The Operator can import a `.md` or `.txt` report file and review the imported text before saving.
- Validation warnings appear for missing required report sections.
- Imperfect non-empty reports can still be saved.
- Empty reports cannot be saved.
- The generated filename is visible before save.
- Saving creates a Markdown artifact under `planning/phases/phase-01/Builder_Reports/`.
- Existing report files are not silently overwritten.
- Work Card JSON and Markdown files are not modified.
- No report index is created.
- `npm run typecheck`, `npm run build`, `npm test`, and `npm run test:work-cards` pass.

## How This Should Be Validated

- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards`.
- Run any new Builder Report validation or path-safety script if one is added.
- Run `git status --short` and review changed files.
- Manually run `npm start` to validate the Electron UI.

## Risk Level

medium

## Risks and Watch Items

- Manual Electron UI validation is still required because no renderer smoke test exists yet.
- Report validation is intentionally shallow and may miss unusual wording.
- Imported text files could be large, so the MVP keeps import limited to plain `.md` and `.txt` files.
- Path safety must remain constrained because this feature saves user-provided Markdown text.

## Builder Instructions

- Verify the repository path before editing.
- Read `AGENTS.md`, the WC01-WC05 Builder Reports, the WC04 repair report, and the existing WC01-WC05 Work Card JSON artifacts before implementation.
- Keep the pass limited to WC06 Builder Report capture, constrained IPC, validation warnings, filename generation, Work Card artifacts, validation coverage, and the Builder Report.
- Do not call LLM APIs, execute Builder work, evaluate Builder quality deeply, modify selected Work Cards, update Work Card statuses or risk levels, add provider SDKs, or implement unrelated features.
- Run the required validation commands and document results in the Builder Report.
- Stage only files created or modified for WC06 and commit with `feat: add builder report capture`.

## Operator Notes

- A Work Card is the smallest buildable unit of work that can be handed to a Builder.
- A Work Card should never be authored by the Operator alone.
- WC06 captures Builder Reports as durable evidence only.
- The Builder Report Capture workflow must not mark Work Cards as complete, validated, failed, repaired, or closed.
- This closes the MVP loop after Work Card capture, Architect framing prompt, risk review, Builder prompt generation, and Builder execution.

## Builder Handoff Prompt

Use this as the starting Builder prompt:

You are acting as Builder for ChampCity A/I.

Before editing:
- Verify the repository path before editing. Expected repository: `<PROJECT_REPO>`.
- Read `AGENTS.md` and relevant planning files.

Work Card: WC06 - Capture Builder Report

Goal: Add a Builder Report Capture screen and deterministic shared helpers that let the Operator paste or import a report, associate it with a Work Card when relevant, review validation warnings, generate a safe filename, and save Markdown under the phase Builder_Reports folder.

Scope:
- Add minimal navigation for `Builder Report Capture` alongside the existing Work Card workflow screens.
- Allow selecting saved Work Card JSON files from `planning/phases/<phase-folder>/Work_Cards/` with `phase-01` as the default phase.
- Add report type handling for `Work Card`, `Fix`, `Repair`, and `Other` reports.
- Provide a large paste/edit text area as the primary Builder Report capture path.
- Support importing `.md` and `.txt` report files through a standard renderer file input and show imported text for review before save.
- Create shared deterministic Builder Report validation that warns about missing AGENTS.md report sections without blocking imperfect non-empty reports.
- Detect and display whether commit hash, validation results, blocking questions or blockers, and recommended next task appear in the report text.
- Generate safe Builder Report filenames from report type, selected Work Card when available, and a sanitized topic field.
- Add constrained main/preload IPC to save captured Markdown only under `planning/phases/<phase-folder>/Builder_Reports/` without silently overwriting existing files.
- Create the WC06 Work Card JSON and Markdown artifacts and the WC06 Builder Report.
- Extend lightweight validation coverage for Builder Report validation, filename generation, path safety, and paired Work Card artifacts.

Out of scope:
- Do not call an LLM API.
- Do not evaluate Builder quality deeply.
- Do not implement report grading.
- Do not create a report index.
- Do not update Work Card status.
- Do not update Work Card `riskLevel`.
- Do not implement Work Card editing.
- Do not implement the human validation and repair loop.
- Do not execute Builder work.
- Do not generate prompts for repairs or fixes beyond report filename handling.
- Do not add OpenAI, Anthropic, Ollama, Featherless, LM Studio, or other provider integrations.
- Do not add database, cloud, auth, deployment, MCP, or connector integrations.
- Do not perform a broad UI redesign.
- Do not refactor unrelated source files.

Requirements:
- Renderer code must not write files directly.
- Filesystem writes must be mediated by constrained main/preload IPC.
- IPC must normalize and validate paths, reject traversal, reject arbitrary absolute paths, restrict phase folder names and generated filenames to safe values, and save only `.md` Builder Report files.
- Work Card association is required for Work Card reports and optional for Fix, Repair, and Other reports.
- Imported files must be limited to `.md` and `.txt` text files and must be saved through the same constrained capture flow as pasted text.
- Builder Report validation must return structured detected fields and warnings for missing required sections from `AGENTS.md`.
- `validEnoughToSave` must be false for empty text and generally true for non-empty imperfect reports so evidence is preserved.
- Filename generation must support Work Card, Fix, Repair, and Other report types.
- Generated filenames must be visible before save and must not allow arbitrary path or full filename input.
- Existing report files must not be silently overwritten.
- WC06 must not edit Work Card JSON or Markdown, change Work Card status, change Work Card `riskLevel`, create a report index, push to GitHub, or create release tags.

Acceptance criteria:
- Navigation shows `New Work Card`, `Architect Prompt Composer`, `Risk Router`, `Builder Prompt Generator`, and `Builder Report Capture`.
- Builder Report Capture lists saved Work Card JSON files for `phase-01`.
- Selecting a Work Card displays its ID, title, phase, status, and risk level.
- Report type selector shows `Work Card`, `Fix`, `Repair`, and `Other`.
- The Operator can paste Builder Report Markdown into a large text area.
- The Operator can import a `.md` or `.txt` report file and review the imported text before saving.
- Validation warnings appear for missing required report sections.
- Imperfect non-empty reports can still be saved.
- Empty reports cannot be saved.
- The generated filename is visible before save.
- Saving creates a Markdown artifact under `planning/phases/phase-01/Builder_Reports/`.
- Existing report files are not silently overwritten.
- Work Card JSON and Markdown files are not modified.
- No report index is created.
- `npm run typecheck`, `npm run build`, `npm test`, and `npm run test:work-cards` pass.

Validation plan:
- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards`.
- Run any new Builder Report validation or path-safety script if one is added.
- Run `git status --short` and review changed files.
- Manually run `npm start` to validate the Electron UI.

Builder Report:
- Create a Builder Report under `planning/phases/phase-01/Builder_Reports/` and include commands run, validation results, security notes, git actions, and the recommended next Builder task.
