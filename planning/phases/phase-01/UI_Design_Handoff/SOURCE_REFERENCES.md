# Source References

This handoff does not copy large source files. Use these repository paths for Figma/Codex context.

## Renderer UI Files

- `src/renderer/renderer.ts`
- `src/renderer/styles.css`
- `src/renderer/index.html`
- `src/renderer/global.d.ts`

## Electron Main And Preload Files

- `src/main/main.ts`
- `src/preload/index.ts`
- `src/main/workCards/workCardFileStore.ts`

## Shared Work Card And Workflow Source

- `src/shared/workCards/workCardSchema.ts`
- `src/shared/workCards/workCardFileNames.ts`
- `src/shared/workCards/workCardDraft.ts`
- `src/shared/workCards/validateWorkCard.ts`
- `src/shared/workCards/renderWorkCardMarkdown.ts`
- `src/shared/workCards/renderArchitectFramingPrompt.ts`
- `src/shared/workCards/riskRouter.ts`
- `src/shared/workCards/renderRiskReviewMarkdown.ts`
- `src/shared/workCards/renderBuilderPrompt.ts`
- `src/shared/workCards/validateBuilderReport.ts`
- `src/shared/workCards/validationRecord.ts`
- `src/shared/workCards/renderValidationRecordMarkdown.ts`
- `src/shared/workCards/renderRepairPrompt.ts`
- `src/shared/workCards/phaseCloseout.ts`
- `src/shared/workCards/phaseCloseoutRecord.ts`
- `src/shared/workCards/renderPhaseCloseoutMarkdown.ts`

## Work Card Artifacts WC01-WC09

- `planning/phases/phase-01/Work_Cards/WC01_define_work_card_schema_and_markdown_renderer.json`
- `planning/phases/phase-01/Work_Cards/WC01_define_work_card_schema_and_markdown_renderer.md`
- `planning/phases/phase-01/Work_Cards/WC02_build_new_work_card_capture_form.json`
- `planning/phases/phase-01/Work_Cards/WC02_build_new_work_card_capture_form.md`
- `planning/phases/phase-01/Work_Cards/WC03_add_architect_framing_prompt_composer.json`
- `planning/phases/phase-01/Work_Cards/WC03_add_architect_framing_prompt_composer.md`
- `planning/phases/phase-01/Work_Cards/WC04_add_risk_router.json`
- `planning/phases/phase-01/Work_Cards/WC04_add_risk_router.md`
- `planning/phases/phase-01/Work_Cards/WC05_generate_builder_prompt.json`
- `planning/phases/phase-01/Work_Cards/WC05_generate_builder_prompt.md`
- `planning/phases/phase-01/Work_Cards/WC06_capture_builder_report.json`
- `planning/phases/phase-01/Work_Cards/WC06_capture_builder_report.md`
- `planning/phases/phase-01/Work_Cards/WC07_human_validation_and_repair_loop.json`
- `planning/phases/phase-01/Work_Cards/WC07_human_validation_and_repair_loop.md`
- `planning/phases/phase-01/Work_Cards/WC08_phase_1_closeout_and_status_management.json`
- `planning/phases/phase-01/Work_Cards/WC08_phase_1_closeout_and_status_management.md`
- `planning/phases/phase-01/Work_Cards/WC09_prepare_figma_ui_design_handoff_package.json`
- `planning/phases/phase-01/Work_Cards/WC09_prepare_figma_ui_design_handoff_package.md`

## Relevant Builder Reports

- `planning/phases/phase-01/Builder_Reports/BUILDER_REPORT_WC01_work_card_schema_renderer.md`
- `planning/phases/phase-01/Builder_Reports/BUILDER_REPORT_WC02_work_card_capture_form.md`
- `planning/phases/phase-01/Builder_Reports/BUILDER_REPORT_WC03_architect_framing_prompt_composer.md`
- `planning/phases/phase-01/Builder_Reports/BUILDER_REPORT_WC04_risk_router.md`
- `planning/phases/phase-01/Builder_Reports/BUILDER_REPORT_WC05_generate_builder_prompt.md`
- `planning/phases/phase-01/Builder_Reports/BUILDER_REPORT_WC06_capture_builder_report.md`
- `planning/phases/phase-01/Builder_Reports/BUILDER_REPORT_WC07_human_validation_and_repair_loop.md`
- `planning/phases/phase-01/Builder_Reports/BUILDER_REPORT_WC08_phase_1_closeout_and_status_management.md`
- `planning/phases/phase-01/Builder_Reports/BUILDER_REPORT_WC09_figma_ui_design_handoff_package.md`

## Generated Artifact Folders

- `planning/phases/phase-01/Work_Cards/`
- `planning/phases/phase-01/Architect_Prompts/`
- `planning/phases/phase-01/Risk_Reviews/`
- `planning/phases/phase-01/Builder_Prompts/`
- `planning/phases/phase-01/Builder_Reports/`
- `planning/phases/phase-01/Validation_Reports/`
- `planning/phases/phase-01/Repair_Prompts/`
- `planning/phases/phase-01/Closeout_Reports/`
- `planning/phases/phase-01/UI_Design_Handoff/`

## Validation Script

- `scripts/verify-work-card-fixture.mjs`
