<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-02/work_card/WC04",
  "artifactType": "work_card",
  "createdAt": "2026-07-01T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-02/Work_Cards/WC04_generate_project_planning_documents.json",
  "markdownPath": "planning/phases/phase-02/Work_Cards/WC04_generate_project_planning_documents.md",
  "payload": {
    "kind": "work_card",
    "title": "Generate Project Planning Documents"
  },
  "payloadHash": "sha256:a9016494b97541e68920b247418fc034fa89737fb33361ec7720b1e07c70d1b2",
  "phaseId": "phase-02",
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
  "workCardId": "WC04"
}
-->

# Work Card: Generate Project Planning Documents

## Work Card ID

WC04

Created: 2026-07-01T00:00:00.000Z
Updated: 2026-07-01T00:00:00.000Z

## Phase

phase-02

## Status

ready_for_builder

## What Problem Are We Solving?

Phase 02 can capture Project Intake and generate a Project Architect Interview prompt, but the app does not yet consume the completed Architect interview output or turn it into durable project planning documents.

## What Should This Accomplish?

Add a deterministic Project Planning Documents workflow that uses saved upstream project context and pasted completed Architect interview output to preview and save durable project-level planning artifacts.

## What Should the User Be Able To Do?

The Operator can select relevant saved project source context, paste completed Architect interview output, preview generated project planning documents, and save durable Markdown/JSON planning artifacts into the repository.

## What Is Included?

- Create WC04 JSON and Markdown Work Card artifacts under Phase 02.
- Add a Project Planning Documents screen or equivalent upstream workflow step after Project Architect Interview.
- Allow the Operator to select a saved Project Intake as source context.
- Allow the Operator to select a saved Project Architect Interview Prompt as source context.
- Allow the Operator to paste completed Architect interview output.
- Generate previewable project planning documents from selected source context and pasted Architect interview output.
- Save durable project planning artifacts under `planning/project/`.
- Generate or update `planning/project/PROJECT_PROFILE.md`.
- Generate or update `planning/project/PROJECT_STATE.md`.
- Generate or update `planning/project/WORK_CARD_BACKLOG.md`.
- Generate or update `planning/project/OPEN_QUESTIONS.md`.
- Generate or update `planning/project/RISKS.md`.
- Generate or update `planning/project/DECISIONS.md` when decisions are present.
- Save paired JSON sidecar artifacts where structured reuse is useful for later phase-planning workflows.
- Correct stale MVP/foundation language in project-level Markdown as part of this pass.
- Preserve the Capture -> Frame -> Plan -> Build -> Prove mental model.
- Preserve Operator / Architect / Implementer terminology.
- Create the required WC04 Implementer Report under the legacy `Builder_Reports` folder.

## What Is Not Included?

- Do not call an LLM API.
- Do not add provider SDKs.
- Do not add ChatGPT or Claude browser automation.
- Do not add database, auth, cloud, deployment automation, MCP, or connector integrations.
- Do not implement phase closeout.
- Do not close Phase 02.
- Do not implement Phase Intake.
- Do not implement Phase Interview prompt generation.
- Do not implement Phase Planning Documents.
- Do not generate the initial Work Card plan beyond updating the project backlog.
- Do not implement release, package, or installer work.
- Do not perform a broad UI redesign.
- Do not rename `Builder_Reports` or legacy `BUILDER_REPORT_*` files.

## Requirements

- Renderer code must not directly read or write local files.
- All Project Planning Documents reads and writes must go through constrained Electron main/preload IPC.
- Source selections must be safe basenames from approved project planning folders.
- The app must reject unsafe filenames, traversal, arbitrary absolute paths, and unsupported source paths.
- Project Intake source reads must stay inside `planning/project/Project_Intake/`.
- Project Architect Interview Prompt source reads must stay inside `planning/project/Project_Architect_Interview_Prompts/`.
- Saving Project Planning Documents must write only approved project-level Markdown files and structured sidecars under approved `planning/project/` paths.
- Saving must make it clear to the Operator that project-level Markdown files are updated in place.
- Generated preview must be visible before save.
- Save result must show written Markdown and JSON paths.
- Existing Project Intake screen must continue to work.
- Existing Project Architect Interview screen must continue to work.
- Existing Validate screen and Validation Target behavior must continue to work.
- The generation path must be deterministic and must not call an LLM API.
- `PROJECT_STATE.md` must describe the current stage as Alpha app development, not MVP foundation/scaffold.
- `PROJECT_PROFILE.md` must not name the product as `ChampCity_AI Work Card MVP`.
- `WORK_CARD_BACKLOG.md` must show the reconciled Phase 02 sequence through WC06.

## How We Know This Is Done

- WC04 Work Card JSON and Markdown artifacts are created.
- A Project Planning Documents workflow step appears after Project Architect Interview and before downstream Work Card capture.
- The Operator can select a saved Project Intake JSON artifact from `planning/project/Project_Intake/`.
- The Operator can select a saved Project Architect Interview Prompt JSON artifact from `planning/project/Project_Architect_Interview_Prompts/`.
- The Operator can paste completed Architect interview output.
- A deterministic preview includes `PROJECT_PROFILE.md`, `PROJECT_STATE.md`, `WORK_CARD_BACKLOG.md`, `OPEN_QUESTIONS.md`, `RISKS.md`, and `DECISIONS.md` when decisions are present.
- The preview is visible before saving.
- Saving writes project-level Markdown artifacts under `planning/project/` and reports the written paths.
- Saving writes a structured JSON sidecar under a safe project planning folder for later reuse.
- Unsafe source filenames, traversal, arbitrary absolute paths, and unsupported source paths are rejected.
- Project-level stale MVP/foundation wording is corrected to Alpha app development wording.
- The reconciled Phase 02 backlog sequence lists WC01 through WC06 with WC03 as the validation/evidence UI repair and WC04 as Project Planning Documents.
- Existing Project Intake still opens and saves through constrained IPC.
- Existing Project Architect Interview still opens and saves through constrained IPC.
- Existing Validate screen and Validation Target behavior remain available.
- No LLM API call, provider SDK, browser automation, database, auth, cloud, deployment, MCP, connector, phase closeout, Phase Intake, Phase Interview, Phase Planning Documents, release, package, installer, broad redesign, or legacy Builder path rename is added.
- WC04 Implementer Report is created.

## How This Should Be Validated

- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards` if the build environment allows it.
- Run `git status --short` and review changed files.
- List remaining Operator manual validation steps in the WC04 Implementer Report without performing Operator acceptance.

## Risk Level

medium

## Risks and Watch Items

- Project-level planning documents are updated in place, so the UI must make that explicit before saving.
- The deterministic generator can only organize the pasted Architect interview output; it cannot infer a perfect roadmap without adding LLM behavior.
- The renderer is still a large single-file React implementation, so the new workflow step must be inserted narrowly.
- Project source selection and write paths touch durable repository files and must stay constrained to approved planning folders.

## Builder Instructions

- Verify the repository path and Git root before editing.
- Read `AGENTS.md`, Phase 02 WC01 through WC03 artifacts, project-level planning files, existing Project Intake and Project Architect Interview shared models, main/preload IPC, and renderer source before implementation.
- Keep this pass limited to deterministic Project Planning Documents generation and project-level stale language correction.
- Preserve product-facing Operator, Architect, Implementer, Implementer Prompt, and Implementer Report terminology.
- Preserve legacy `Builder_*` compatibility artifact folders and file prefixes.
- Do not perform Operator manual validation or create accepted Human Validation records.
- Run required validation commands and document results in the WC04 Implementer Report.
- Stage only files changed or created for WC04 and commit with `feat: generate project planning documents`.

## Operator Notes

- This Work Card is the reconciled Phase 02 WC04 after WC03 was used for the validation and evidence UI repair.
- The generated project planning documents are deterministic drafts based on selected source artifacts and pasted Architect interview output.
- Project-level Markdown files are intended to be updated in place by this workflow.
- Existing legacy Builder artifact names remain compatibility storage names until a dedicated migration Work Card changes them safely.

## Builder Handoff Prompt

Use this as the starting Implementer prompt. The section heading remains a legacy Builder handoff heading for artifact compatibility.

You are acting as Implementer for ChampCity A/I.

The Implementer may be Codex, Claude Code, Cursor, or another coding agent. Build only from this structured handoff and preserve the approved scope.

Before editing:
- Verify the repository path before editing. Expected repository: `<PROJECT_REPO>`.
- Read `AGENTS.md` and relevant planning files.

Work Card: WC04 - Generate Project Planning Documents

Goal: Add a deterministic Project Planning Documents workflow that uses saved upstream project context and pasted completed Architect interview output to preview and save durable project-level planning artifacts.

Scope:
- Create WC04 JSON and Markdown Work Card artifacts under Phase 02.
- Add a Project Planning Documents screen or equivalent upstream workflow step after Project Architect Interview.
- Allow the Operator to select a saved Project Intake as source context.
- Allow the Operator to select a saved Project Architect Interview Prompt as source context.
- Allow the Operator to paste completed Architect interview output.
- Generate previewable project planning documents from selected source context and pasted Architect interview output.
- Save durable project planning artifacts under `planning/project/`.
- Generate or update `planning/project/PROJECT_PROFILE.md`.
- Generate or update `planning/project/PROJECT_STATE.md`.
- Generate or update `planning/project/WORK_CARD_BACKLOG.md`.
- Generate or update `planning/project/OPEN_QUESTIONS.md`.
- Generate or update `planning/project/RISKS.md`.
- Generate or update `planning/project/DECISIONS.md` when decisions are present.
- Save paired JSON sidecar artifacts where structured reuse is useful for later phase-planning workflows.
- Correct stale MVP/foundation language in project-level Markdown as part of this pass.
- Preserve the Capture -> Frame -> Plan -> Build -> Prove mental model.
- Preserve Operator / Architect / Implementer terminology.
- Create the required WC04 Implementer Report under the legacy `Builder_Reports` folder.

Out of scope:
- Do not call an LLM API.
- Do not add provider SDKs.
- Do not add ChatGPT or Claude browser automation.
- Do not add database, auth, cloud, deployment automation, MCP, or connector integrations.
- Do not implement phase closeout.
- Do not close Phase 02.
- Do not implement Phase Intake.
- Do not implement Phase Interview prompt generation.
- Do not implement Phase Planning Documents.
- Do not generate the initial Work Card plan beyond updating the project backlog.
- Do not implement release, package, or installer work.
- Do not perform a broad UI redesign.
- Do not rename `Builder_Reports` or legacy `BUILDER_REPORT_*` files.

Requirements:
- Renderer code must not directly read or write local files.
- All Project Planning Documents reads and writes must go through constrained Electron main/preload IPC.
- Source selections must be safe basenames from approved project planning folders.
- The app must reject unsafe filenames, traversal, arbitrary absolute paths, and unsupported source paths.
- Project Intake source reads must stay inside `planning/project/Project_Intake/`.
- Project Architect Interview Prompt source reads must stay inside `planning/project/Project_Architect_Interview_Prompts/`.
- Saving Project Planning Documents must write only approved project-level Markdown files and structured sidecars under approved `planning/project/` paths.
- Saving must make it clear to the Operator that project-level Markdown files are updated in place.
- Generated preview must be visible before save.
- Save result must show written Markdown and JSON paths.
- Existing Project Intake screen must continue to work.
- Existing Project Architect Interview screen must continue to work.
- Existing Validate screen and Validation Target behavior must continue to work.
- The generation path must be deterministic and must not call an LLM API.
- `PROJECT_STATE.md` must describe the current stage as Alpha app development, not MVP foundation/scaffold.
- `PROJECT_PROFILE.md` must not name the product as `ChampCity_AI Work Card MVP`.
- `WORK_CARD_BACKLOG.md` must show the reconciled Phase 02 sequence through WC06.

Acceptance criteria:
- WC04 Work Card JSON and Markdown artifacts are created.
- A Project Planning Documents workflow step appears after Project Architect Interview and before downstream Work Card capture.
- The Operator can select a saved Project Intake JSON artifact from `planning/project/Project_Intake/`.
- The Operator can select a saved Project Architect Interview Prompt JSON artifact from `planning/project/Project_Architect_Interview_Prompts/`.
- The Operator can paste completed Architect interview output.
- A deterministic preview includes `PROJECT_PROFILE.md`, `PROJECT_STATE.md`, `WORK_CARD_BACKLOG.md`, `OPEN_QUESTIONS.md`, `RISKS.md`, and `DECISIONS.md` when decisions are present.
- The preview is visible before saving.
- Saving writes project-level Markdown artifacts under `planning/project/` and reports the written paths.
- Saving writes a structured JSON sidecar under a safe project planning folder for later reuse.
- Unsafe source filenames, traversal, arbitrary absolute paths, and unsupported source paths are rejected.
- Project-level stale MVP/foundation wording is corrected to Alpha app development wording.
- The reconciled Phase 02 backlog sequence lists WC01 through WC06 with WC03 as the validation/evidence UI repair and WC04 as Project Planning Documents.
- Existing Project Intake still opens and saves through constrained IPC.
- Existing Project Architect Interview still opens and saves through constrained IPC.
- Existing Validate screen and Validation Target behavior remain available.
- No LLM API call, provider SDK, browser automation, database, auth, cloud, deployment, MCP, connector, phase closeout, Phase Intake, Phase Interview, Phase Planning Documents, release, package, installer, broad redesign, or legacy Builder path rename is added.
- WC04 Implementer Report is created.

Validation plan:
- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards` if the build environment allows it.
- Run `git status --short` and review changed files.
- List remaining Operator manual validation steps in the WC04 Implementer Report without performing Operator acceptance.

Implementer Report:
- Create an Implementer Report under the legacy `planning/phases/phase-02/Builder_Reports/` folder and include commands run, validation results, security notes, git actions, and the recommended next Implementer task.
