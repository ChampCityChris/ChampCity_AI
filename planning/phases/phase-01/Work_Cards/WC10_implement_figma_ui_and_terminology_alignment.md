<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-01/work_card/WC10",
  "artifactType": "work_card",
  "createdAt": "2026-06-29T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-01/Work_Cards/WC10_implement_figma_ui_and_terminology_alignment.json",
  "markdownPath": "planning/phases/phase-01/Work_Cards/WC10_implement_figma_ui_and_terminology_alignment.md",
  "payload": {
    "kind": "work_card",
    "title": "Implement Figma UI and terminology alignment"
  },
  "payloadHash": "sha256:32062fb4bb42498c76579b65aa578bfcc8d95dee23dc1230d2d0518c6c6f454f",
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
  "workCardId": "WC10"
}
-->

# Work Card: Implement Figma UI and terminology alignment

## Work Card ID

WC10

Created: 2026-06-29T00:00:00.000Z
Updated: 2026-06-29T00:00:00.000Z

## Phase

phase-01

## Status

ready_for_builder

## What Problem Are We Solving?

ChampCity A/I has a validated Phase 1 MVP workflow and a Figma dark UI handoff, but the Electron app still presents the workflow as a plain light form interface with product-facing Builder terminology.

## What Should This Accomplish?

Adapt the Figma-designed compact dark guided workflow direction into the existing Electron renderer and align product-facing language around Architect / Implementer while preserving validated artifact behavior and legacy Builder_* storage paths.

## What Should the User Be Able To Do?

The Operator can move a Work Card through Capture, Architect, Risk, Build, Report, Validate, and Closeout in a polished dark ChampCity A/I interface that clearly treats Implementer as the product-facing build role.

## What Is Included?

- Inspect the WC09 Figma handoff documents and provided Figma source package before editing.
- Use the Figma source as a visual and structural reference, not as a blind replacement or demo-data import.
- Add the provided ChampCity A/I icon to renderer-accessible assets and use it in the app shell.
- Implement a compact dark app shell with a guided pipeline navigation model for Capture, Architect, Risk, Build, Report, Validate, and Closeout.
- Restyle all seven current renderer screens while preserving their existing inputs, previews, warnings, save behavior, and IPC calls.
- Rename visible Builder role language to Implementer where safe while preserving legacy internal API names and Builder_* artifact folders.
- Update generated Implementer prompt and repair prompt language so the product-facing role is Implementer.
- Update AGENTS.md to document the Implementer terminology transition and legacy Builder_* artifact compatibility.
- Create WC10 JSON and Markdown Work Card artifacts.
- Create the WC10 Builder Report under the legacy Builder_Reports folder.
- Run required validation commands and document results.

## What Is Not Included?

- Do not package the app.
- Do not create installers.
- Do not create release tags.
- Do not push to GitHub.
- Do not start Phase 2.
- Do not add LLM API calls.
- Do not add provider SDKs.
- Do not add authentication, databases, cloud services, deployment automation, MCP integrations, connector integrations, or provider-specific LLM SDKs.
- Do not add Playwright, heavy screenshot tooling, or broad UI dependency trees.
- Do not replace real workflow behavior with Figma demo state.
- Do not perform a broad artifact-folder migration.
- Do not delete or rename historical Builder Reports.

## Requirements

- The app shell must use the human-readable product name `ChampCity A/I` and make `Architect / Implementer` visible.
- The workflow navigation must include Capture, Architect, Risk, Build, Report, Validate, and Closeout.
- The UI must follow a compact modern dark direction with elevated panels, subtle borders, cyan/teal and blue accents, amber warnings, and red only for blocking or critical states.
- The provided icon must be present in renderer-accessible assets and visible in the UI.
- Existing Work Card capture, Architect prompt, Risk Review, Implementer prompt, Implementer report capture, Human Validation, Repair Prompt, and Phase Closeout behavior must continue to work.
- JSON/Markdown Work Card saves and all existing artifact folders must remain compatible.
- Physical `Builder_Prompts` and `Builder_Reports` folders must remain in place for compatibility during this pass.
- Generated Implementer prompt copy must say `You are acting as Implementer for ChampCity A/I.` and explain that the Implementer may be Codex, Claude Code, Cursor, or another coding agent.
- Repair prompt language must use Implementer where appropriate while preserving legacy report filename patterns.
- Validation must confirm WC10 JSON/Markdown parity, existing WC01-WC09 paired Work Card presence, app build success, pipeline labels, Implementer terminology, icon presence, and absence of Figma demo Work Card imports.

## How We Know This Is Done

- The renderer app shell displays the ChampCity A/I icon, product name, and Architect / Implementer subtitle.
- The primary navigation presents the pipeline as Capture, Architect, Risk, Build, Report, Validate, and Closeout.
- All seven screens render in the compact dark visual system.
- Visible UI labels prefer Implementer over Builder except where referencing legacy `Builder_*` storage folders, filenames, or historical artifacts.
- The Implementer prompt generator still lists Work Cards and supporting artifacts, previews/copies/saves prompts, and uses existing storage paths.
- The Implementer Report capture flow still previews validation warnings, generates legacy `BUILDER_REPORT_*` filenames, and saves Markdown reports.
- Human Validation still lists legacy Builder Report files, saves validation JSON/Markdown, and generates Repair Prompts when appropriate.
- Phase Closeout still summarizes approved artifact folders and saves closeout JSON/Markdown.
- WC10 JSON validates against the Work Card schema.
- WC10 Markdown matches the existing Work Card renderer output.
- Existing WC01-WC09 Work Card JSON/Markdown artifacts remain present and valid.
- No Figma demo Work Card data replaces app data.
- A WC10 Builder Report is created.
- No release tag is created.
- No push is performed.

## How This Should Be Validated

- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards`.
- Run `git status --short` and review changed files.
- Manually validate with `npm start` that the Electron UI opens, the icon appears, the workflow feels like a guided pipeline, and all seven workflows still operate.

## Risk Level

medium

## Risks and Watch Items

- The renderer is a large single-file React implementation, so visual edits must avoid breaking existing state flows.
- The Figma package contains demo state and many UI dependencies that must not replace real app data or broaden dependencies.
- Terminology migration could accidentally break legacy artifact paths if internal names are renamed too aggressively.
- Manual visual validation is still required because automated screenshot tooling is out of scope.

## Builder Instructions

- Verify the repository path and Git root before editing.
- Read `AGENTS.md`, WC09 Figma handoff documents, latest Builder Reports, renderer source, main/preload IPC, and shared Work Card files before implementation.
- Treat Implementer as the product-facing role while preserving legacy Builder_* folders and filenames for compatibility.
- Do not add broad dependencies or import the full Figma demo app.
- Run required validation commands and document results in the Builder Report.
- Stage only files changed or created for WC10 and commit with `feat: implement figma ui and implementer terminology`.

## Operator Notes

- This is an implementation pass, not a redesign exploration pass.
- The product-facing meaning of A/I is Architect / Implementer.
- Legacy artifact names may still use Builder_* until a dedicated migration Work Card.
- The Figma source package and icon were provided under `planning/phases/phase-01/UI_Design_Handoff/` before this pass.

## Builder Handoff Prompt

Use this as the starting Implementer prompt. The section heading remains a legacy Builder handoff heading for artifact compatibility.

You are acting as Implementer for ChampCity A/I.

The Implementer may be Codex, Claude Code, Cursor, or another coding agent. Build only from this structured handoff and preserve the approved scope.

Before editing:
- Verify the repository path before editing. Expected repository: `<PROJECT_REPO>`.
- Read `AGENTS.md` and relevant planning files.

Work Card: WC10 - Implement Figma UI and terminology alignment

Goal: Adapt the Figma-designed compact dark guided workflow direction into the existing Electron renderer and align product-facing language around Architect / Implementer while preserving validated artifact behavior and legacy Builder_* storage paths.

Scope:
- Inspect the WC09 Figma handoff documents and provided Figma source package before editing.
- Use the Figma source as a visual and structural reference, not as a blind replacement or demo-data import.
- Add the provided ChampCity A/I icon to renderer-accessible assets and use it in the app shell.
- Implement a compact dark app shell with a guided pipeline navigation model for Capture, Architect, Risk, Build, Report, Validate, and Closeout.
- Restyle all seven current renderer screens while preserving their existing inputs, previews, warnings, save behavior, and IPC calls.
- Rename visible Builder role language to Implementer where safe while preserving legacy internal API names and Builder_* artifact folders.
- Update generated Implementer prompt and repair prompt language so the product-facing role is Implementer.
- Update AGENTS.md to document the Implementer terminology transition and legacy Builder_* artifact compatibility.
- Create WC10 JSON and Markdown Work Card artifacts.
- Create the WC10 Builder Report under the legacy Builder_Reports folder.
- Run required validation commands and document results.

Out of scope:
- Do not package the app.
- Do not create installers.
- Do not create release tags.
- Do not push to GitHub.
- Do not start Phase 2.
- Do not add LLM API calls.
- Do not add provider SDKs.
- Do not add authentication, databases, cloud services, deployment automation, MCP integrations, connector integrations, or provider-specific LLM SDKs.
- Do not add Playwright, heavy screenshot tooling, or broad UI dependency trees.
- Do not replace real workflow behavior with Figma demo state.
- Do not perform a broad artifact-folder migration.
- Do not delete or rename historical Builder Reports.

Requirements:
- The app shell must use the human-readable product name `ChampCity A/I` and make `Architect / Implementer` visible.
- The workflow navigation must include Capture, Architect, Risk, Build, Report, Validate, and Closeout.
- The UI must follow a compact modern dark direction with elevated panels, subtle borders, cyan/teal and blue accents, amber warnings, and red only for blocking or critical states.
- The provided icon must be present in renderer-accessible assets and visible in the UI.
- Existing Work Card capture, Architect prompt, Risk Review, Implementer prompt, Implementer report capture, Human Validation, Repair Prompt, and Phase Closeout behavior must continue to work.
- JSON/Markdown Work Card saves and all existing artifact folders must remain compatible.
- Physical `Builder_Prompts` and `Builder_Reports` folders must remain in place for compatibility during this pass.
- Generated Implementer prompt copy must say `You are acting as Implementer for ChampCity A/I.` and explain that the Implementer may be Codex, Claude Code, Cursor, or another coding agent.
- Repair prompt language must use Implementer where appropriate while preserving legacy report filename patterns.
- Validation must confirm WC10 JSON/Markdown parity, existing WC01-WC09 paired Work Card presence, app build success, pipeline labels, Implementer terminology, icon presence, and absence of Figma demo Work Card imports.

Acceptance criteria:
- The renderer app shell displays the ChampCity A/I icon, product name, and Architect / Implementer subtitle.
- The primary navigation presents the pipeline as Capture, Architect, Risk, Build, Report, Validate, and Closeout.
- All seven screens render in the compact dark visual system.
- Visible UI labels prefer Implementer over Builder except where referencing legacy `Builder_*` storage folders, filenames, or historical artifacts.
- The Implementer prompt generator still lists Work Cards and supporting artifacts, previews/copies/saves prompts, and uses existing storage paths.
- The Implementer Report capture flow still previews validation warnings, generates legacy `BUILDER_REPORT_*` filenames, and saves Markdown reports.
- Human Validation still lists legacy Builder Report files, saves validation JSON/Markdown, and generates Repair Prompts when appropriate.
- Phase Closeout still summarizes approved artifact folders and saves closeout JSON/Markdown.
- WC10 JSON validates against the Work Card schema.
- WC10 Markdown matches the existing Work Card renderer output.
- Existing WC01-WC09 Work Card JSON/Markdown artifacts remain present and valid.
- No Figma demo Work Card data replaces app data.
- A WC10 Builder Report is created.
- No release tag is created.
- No push is performed.

Validation plan:
- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards`.
- Run `git status --short` and review changed files.
- Manually validate with `npm start` that the Electron UI opens, the icon appears, the workflow feels like a guided pipeline, and all seven workflows still operate.

Implementer Report:
- Create an Implementer Report under the legacy `planning/phases/phase-01/Builder_Reports/` folder and include commands run, validation results, security notes, git actions, and the recommended next Implementer task.

## Document Disposition
Document.Status=Pending
