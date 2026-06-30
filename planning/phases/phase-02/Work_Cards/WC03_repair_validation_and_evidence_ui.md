# Work Card: Repair validation and evidence UI

## Work Card ID

WC03

Created: 2026-06-30T20:00:00.000Z
Updated: 2026-06-30T20:00:00.000Z

## Phase

phase-02

## Status

ready_for_builder

## What Problem Are We Solving?

WC01 and WC02 are functionally implemented, but Operator validation found validation traceability, Implementer Report import, and evidence capture defects that can break the Architect / Implementer audit trail before the next feature Work Card begins.

## What Should This Accomplish?

Repair the Human Validation and Implementer Report evidence workflow so selected Work Cards, associated reports, validation artifacts, and imported evidence stay aligned and durable.

## What Should the User Be Able To Do?

The Operator can select a phase and Work Card, see the correct matching Implementer Report, import report text, attach validation evidence files, and save Human Validation artifacts that reference the correct Work Card, report, and evidence paths.

## What Is Included?

- Create WC03 JSON and Markdown Work Card artifacts under Phase 02.
- Use one authoritative phase and Work Card selection state for Human Validation so header selection and validation form selection do not silently diverge.
- Default the Associated Implementer Report selector to the best matching report for the selected Work Card, preferring Work Card ID and slug matches.
- Reset dependent Implementer Report selection when the selected phase or Work Card changes.
- Add guardrails that warn or block saving validation when a non-matching Implementer Report is selected while a matching report exists.
- Load selected saved Implementer Report Markdown through constrained Electron IPC and populate the Report Capture text area.
- Keep Evidence Check updated after imported report text populates the Report Capture text area.
- Add minimal Human Validation evidence file import for common screenshots and text files.
- Copy imported evidence into `planning/phases/<phase>/Validation_Evidence/<workCardId>_<slug>/` using safe filenames and duplicate suffixing.
- Automatically append saved evidence paths to the validation screenshot/file references field.
- Save validation JSON and Markdown with imported evidence paths in the existing screenshot/file references field.
- Replace free-text validation phase entry with a phase selector sourced from safe folders under `planning/phases/`.
- Remove or disambiguate duplicate Human Validation save controls.
- Reduce header right-side control crunch without a broad redesign.
- Create the required WC03 Implementer Report under the legacy `Builder_Reports` folder.

## What Is Not Included?

- Do not implement Project Profile generation.
- Do not implement Project Roadmap generation.
- Do not implement Phase Intake.
- Do not implement Phase Architect Interview.
- Do not implement Phase Planning Documents.
- Do not implement Work Card generation.
- Do not call an LLM API.
- Do not add provider SDKs.
- Do not add ChatGPT or Claude subscription automation.
- Do not add browser automation.
- Do not add databases, auth, cloud deployment, MCP integration, connector integration, packaging, installers, release tags, or GitHub push behavior.
- Do not rename legacy `Builder_*` folders or historical artifact prefixes.
- Do not perform a broad UI redesign.
- Do not add OCR, a full evidence library, image editing, image previews, annotations, or drag-and-drop unless trivial and safe.

## Requirements

- Renderer code must not directly write files.
- Implementer Report reads from existing repo reports must go through constrained Electron IPC and stay inside `planning/phases/<phase>/Builder_Reports/`.
- Validation evidence writes must go through constrained Electron IPC and stay inside `planning/phases/<phase>/Validation_Evidence/<workCardId>_<slug>/`.
- Evidence import must support `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, and should support `.txt` and `.md`.
- Evidence import must reject traversal and unsafe source filenames and must not store binary data inside JSON.
- Saved validation Markdown must include imported evidence paths under `## Screenshots Or Files Referenced By Path`.
- Saved validation JSON must include imported evidence paths through the existing screenshot/file references field or an equivalent narrow structure.
- The WC02 validation default Associated Implementer Report must be `BUILDER_REPORT_WC02_add_project_architect_interview_prompt_generator.md`.
- No stale WC01 Implementer Report should remain selected when WC02 is selected unless the Operator explicitly changes the selection, and saving must guard against accidental mismatches.
- The validation phase selector must list available safe phase folders from `planning/phases/` and include `phase-02`.
- Header controls must remain readable at normal desktop widths and truncate or wrap cleanly where needed.
- Existing WC01 Project Intake, WC02 Project Architect Interview, and Phase 1 workflow screens must remain available.
- Legacy compatibility folders and prefixes, including `Builder_Reports` and `BUILDER_REPORT_*`, must not be renamed.

## How We Know This Is Done

- WC03 Work Card JSON and Markdown artifacts are created.
- Header phase and Work Card selection and Human Validation form selection no longer silently diverge.
- Selecting WC02 in validation defaults the Associated Implementer Report to `BUILDER_REPORT_WC02_add_project_architect_interview_prompt_generator.md`.
- Saving WC02 validation references the WC02 Implementer Report, not WC01.
- Duplicate Human Validation save controls are removed, unified, or clearly disambiguated.
- Implementer Report Capture can import or load the WC02 Implementer Report Markdown into the report text area.
- Evidence Check updates after report import.
- Human Validation can import or attach at least one screenshot or image file into a repo-local evidence folder.
- Imported evidence paths are automatically added to the validation record.
- Saved validation Markdown includes the imported evidence path.
- Saved validation JSON includes the imported evidence path or equivalent structured evidence reference.
- Validation phase selection is available through a dropdown or equivalent phase picker.
- Header right-side controls no longer crunch at normal desktop width.
- Existing WC01 Project Intake screen still opens.
- Existing WC02 Project Architect Interview screen still opens.
- Existing Phase 1 workflow screens still open.
- No out-of-scope planning generation, LLM/API/provider/database/auth/cloud/MCP/connector/package/installer/release/push behavior is added.
- Legacy Builder compatibility paths are not renamed.

## How This Should Be Validated

- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards`.
- Run `git status --short` and review changed files.
- Manually validate that the app opens, header controls are readable, validation has a phase picker, phase-02 and WC02 selection defaults to the WC02 Implementer Report, WC02 validation saves with the WC02 report, Report Capture loads the WC02 report text and updates Evidence Check, Human Validation imports a screenshot or image into `planning/phases/phase-02/Validation_Evidence/`, saved validation JSON and Markdown include the evidence path, WC01 Project Intake opens, WC02 Project Architect Interview opens, and Phase 1 workflow screens open.

## Risk Level

medium

## Risks and Watch Items

- Validation traceability defects can produce misleading records if stale Work Card or report state is reused.
- The renderer is a large single-file React implementation, so UI changes must stay narrow and avoid disrupting existing screens.
- Evidence import touches filesystem writes and must stay constrained to approved validation evidence folders.
- Manual Electron validation is needed to confirm visual layout, file import UX, and saved validation artifacts in the desktop shell.

## Builder Instructions

- Verify the repository path and Git root before editing.
- Read `AGENTS.md`, Phase 02 WC01 and WC02 artifacts, existing reports, validation records, main/preload IPC, renderer source, and shared validation/report models before implementation.
- Keep this pass limited to validation traceability, Implementer Report import, evidence import, phase selector UX, save-control clarity, and header control layout.
- Preserve product-facing Operator, Architect, Implementer, Implementer Prompt, and Implementer Report terminology.
- Preserve legacy `Builder_*` compatibility artifact folders and file prefixes.
- Run required validation commands and document results in the WC03 Implementer Report.
- Stage only files changed or created for this repair and commit with `fix: repair validation and evidence UI`.

## Operator Notes

- This repair intentionally replaces the previously expected Project Planning Documents generator as WC03.
- The Project Planning Documents generator should move to a later Work Card number.
- This Work Card repairs evidence workflow integrity before adding more upstream planning features.
- Existing legacy Builder artifact names remain compatibility storage names until a dedicated migration Work Card changes them safely.

## Builder Handoff Prompt

Use this as the starting Implementer prompt. The section heading remains a legacy Builder handoff heading for artifact compatibility.

You are acting as Implementer for ChampCity A/I.

The Implementer may be Codex, Claude Code, Cursor, or another coding agent. Build only from this structured handoff and preserve the approved scope.

Before editing:
- Verify the repository path before editing. Expected repository: `C:\Users\chapm\Projects\ChampCity_AI`.
- Read `AGENTS.md` and relevant planning files.

Work Card: WC03 - Repair validation and evidence UI

Goal: Repair the Human Validation and Implementer Report evidence workflow so selected Work Cards, associated reports, validation artifacts, and imported evidence stay aligned and durable.

Scope:
- Create WC03 JSON and Markdown Work Card artifacts under Phase 02.
- Use one authoritative phase and Work Card selection state for Human Validation so header selection and validation form selection do not silently diverge.
- Default the Associated Implementer Report selector to the best matching report for the selected Work Card, preferring Work Card ID and slug matches.
- Reset dependent Implementer Report selection when the selected phase or Work Card changes.
- Add guardrails that warn or block saving validation when a non-matching Implementer Report is selected while a matching report exists.
- Load selected saved Implementer Report Markdown through constrained Electron IPC and populate the Report Capture text area.
- Keep Evidence Check updated after imported report text populates the Report Capture text area.
- Add minimal Human Validation evidence file import for common screenshots and text files.
- Copy imported evidence into `planning/phases/<phase>/Validation_Evidence/<workCardId>_<slug>/` using safe filenames and duplicate suffixing.
- Automatically append saved evidence paths to the validation screenshot/file references field.
- Save validation JSON and Markdown with imported evidence paths in the existing screenshot/file references field.
- Replace free-text validation phase entry with a phase selector sourced from safe folders under `planning/phases/`.
- Remove or disambiguate duplicate Human Validation save controls.
- Reduce header right-side control crunch without a broad redesign.
- Create the required WC03 Implementer Report under the legacy `Builder_Reports` folder.

Out of scope:
- Do not implement Project Profile generation.
- Do not implement Project Roadmap generation.
- Do not implement Phase Intake.
- Do not implement Phase Architect Interview.
- Do not implement Phase Planning Documents.
- Do not implement Work Card generation.
- Do not call an LLM API.
- Do not add provider SDKs.
- Do not add ChatGPT or Claude subscription automation.
- Do not add browser automation.
- Do not add databases, auth, cloud deployment, MCP integration, connector integration, packaging, installers, release tags, or GitHub push behavior.
- Do not rename legacy `Builder_*` folders or historical artifact prefixes.
- Do not perform a broad UI redesign.
- Do not add OCR, a full evidence library, image editing, image previews, annotations, or drag-and-drop unless trivial and safe.

Requirements:
- Renderer code must not directly write files.
- Implementer Report reads from existing repo reports must go through constrained Electron IPC and stay inside `planning/phases/<phase>/Builder_Reports/`.
- Validation evidence writes must go through constrained Electron IPC and stay inside `planning/phases/<phase>/Validation_Evidence/<workCardId>_<slug>/`.
- Evidence import must support `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, and should support `.txt` and `.md`.
- Evidence import must reject traversal and unsafe source filenames and must not store binary data inside JSON.
- Saved validation Markdown must include imported evidence paths under `## Screenshots Or Files Referenced By Path`.
- Saved validation JSON must include imported evidence paths through the existing screenshot/file references field or an equivalent narrow structure.
- The WC02 validation default Associated Implementer Report must be `BUILDER_REPORT_WC02_add_project_architect_interview_prompt_generator.md`.
- No stale WC01 Implementer Report should remain selected when WC02 is selected unless the Operator explicitly changes the selection, and saving must guard against accidental mismatches.
- The validation phase selector must list available safe phase folders from `planning/phases/` and include `phase-02`.
- Header controls must remain readable at normal desktop widths and truncate or wrap cleanly where needed.
- Existing WC01 Project Intake, WC02 Project Architect Interview, and Phase 1 workflow screens must remain available.
- Legacy compatibility folders and prefixes, including `Builder_Reports` and `BUILDER_REPORT_*`, must not be renamed.

Acceptance criteria:
- WC03 Work Card JSON and Markdown artifacts are created.
- Header phase and Work Card selection and Human Validation form selection no longer silently diverge.
- Selecting WC02 in validation defaults the Associated Implementer Report to `BUILDER_REPORT_WC02_add_project_architect_interview_prompt_generator.md`.
- Saving WC02 validation references the WC02 Implementer Report, not WC01.
- Duplicate Human Validation save controls are removed, unified, or clearly disambiguated.
- Implementer Report Capture can import or load the WC02 Implementer Report Markdown into the report text area.
- Evidence Check updates after report import.
- Human Validation can import or attach at least one screenshot or image file into a repo-local evidence folder.
- Imported evidence paths are automatically added to the validation record.
- Saved validation Markdown includes the imported evidence path.
- Saved validation JSON includes the imported evidence path or equivalent structured evidence reference.
- Validation phase selection is available through a dropdown or equivalent phase picker.
- Header right-side controls no longer crunch at normal desktop width.
- Existing WC01 Project Intake screen still opens.
- Existing WC02 Project Architect Interview screen still opens.
- Existing Phase 1 workflow screens still open.
- No out-of-scope planning generation, LLM/API/provider/database/auth/cloud/MCP/connector/package/installer/release/push behavior is added.
- Legacy Builder compatibility paths are not renamed.

Validation plan:
- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards`.
- Run `git status --short` and review changed files.
- Manually validate that the app opens, header controls are readable, validation has a phase picker, phase-02 and WC02 selection defaults to the WC02 Implementer Report, WC02 validation saves with the WC02 report, Report Capture loads the WC02 report text and updates Evidence Check, Human Validation imports a screenshot or image into `planning/phases/phase-02/Validation_Evidence/`, saved validation JSON and Markdown include the evidence path, WC01 Project Intake opens, WC02 Project Architect Interview opens, and Phase 1 workflow screens open.

Implementer Report:
- Create an Implementer Report under the legacy `planning/phases/phase-02/Builder_Reports/` folder and include commands run, validation results, security notes, git actions, and the recommended next Implementer task.
