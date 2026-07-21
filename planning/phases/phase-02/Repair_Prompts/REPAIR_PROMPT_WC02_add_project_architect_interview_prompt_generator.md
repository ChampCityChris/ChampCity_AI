You are acting as Implementer for ChampCity A/I.

The Implementer may be Codex, Claude Code, Cursor, or another coding agent. Repair only from the validation evidence below.

Repository:
<PROJECT_REPO>

## Repair Task Identity

- Repair task: REPAIR_WC02_add_project_architect_interview_prompt_generator
- Selected Work Card ID: WC02
- Selected Work Card title: Add Project Architect Interview prompt generator
- Phase: phase-02
- Associated Implementer Report: BUILDER_REPORT_WC01_add_project_intake_capture.md
- Validation record: VALIDATION_REPORT_WC02_add_project_architect_interview_prompt_generator.json

## Operator Validation Result

- Validation result: Pass
- Operator decision: Partial - repair or follow-up needed

## What Passed

Project Architect Interview screen is visible and usable.
Saved Project Intake selector works in the UI.
Prompt preview appears in the UI.
Copy prompt works.
Save prompt works through the UI.
Existing Project Intake screen still works through the UI.
Existing Phase 1 screens still open through the UI

## What Failed

Report Screen is unable to pull in implementer reports, Validate screen requires screenshots be manually saved in project folder and then directories typed into form.  We should be able to paste screenshots in form and application can import them into the repo.

## Observed Errors

Report Screen is unable to pull in implementer reports

## Evidence References

None

## Additional Operator Observations

None

## Repair Objective

A minimal fix pass to correct Report Screen and Validate Screenshot import

## Scope

- Repair only the failure validated by the Operator. Do not broaden implementation.
- Preserve passing behavior called out by the Operator.
- Keep changes limited to the validated repair path.

## Out Of Scope

- Do not broaden implementation.
- Do not start the next Work Card.
- Do not rewrite unrelated code.
- Do not update Work Card status.
- Do not add provider SDKs, database, cloud, auth, deployment, MCP, or connector integrations unless explicitly part of the repair.

## Required Repo Checks

- Confirm current working directory is `<PROJECT_REPO>`.
- Confirm Git repository root is `<PROJECT_REPO>`.
- Run `git status --short --branch`.
- Run `git remote -v`.
- Read `AGENTS.md`.
- Read the selected Work Card from `planning/phases/phase-02/Work_Cards/`.
- Read the associated Implementer Report `BUILDER_REPORT_WC01_add_project_intake_capture.md`.
- Read the validation record `VALIDATION_REPORT_WC02_add_project_architect_interview_prompt_generator.json`.

## Validation Commands

```bash
npm run typecheck
npm run build
npm test
npm run test:work-cards
git status --short
```

## Implementer Report Requirement

Create a repair Implementer Report under `planning/phases/phase-02/Builder_Reports/`.

Compatibility note: the product-facing role is Implementer, but repair reports still use the legacy `Builder_Reports` folder and `BUILDER_REPORT_REPAIR_*` filename pattern.

Filename pattern: `BUILDER_REPORT_REPAIR_<work_card_id>_<slug>.md`

Expected report name: `BUILDER_REPORT_REPAIR_WC02_add_project_architect_interview_prompt_generator.md`

## Git Instructions

- Stage only repair-related files.
- Commit with a repair-specific message.
- Do not create a release tag.
- Do not push unless explicitly instructed.

## Document Disposition
Document.Status=Pending
