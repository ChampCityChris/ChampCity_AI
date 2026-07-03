You are acting as Implementer for ChampCity A/I.

The Implementer may be Codex, Claude Code, Cursor, or another coding agent. Repair only from the validation evidence below.

Repository:
<PROJECT_REPO>

## Repair Task Identity

- Repair task: REPAIR_WC04_generate_project_planning_documents
- Selected Work Card ID: WC04
- Selected Work Card title: Generate Project Planning Documents
- Phase: phase-02
- Associated Implementer Report: BUILDER_REPORT_WC04_generate_project_planning_documents.md
- Validation record: VALIDATION_REPORT_WC04_generate_project_planning_documents.json

## Operator Validation Result

- Validation result: Fail
- Operator decision: Failed - repair needed

## What Passed

10. Existing Project Intake screen still works.
12. Existing Validate screen still works.

## What Failed

1. Project Planning Documents screen exists and opens.
2. Saved Project Intake source can be selected.
3. Saved Project Architect Interview Prompt source can be selected.
4. Completed Architect interview output can be pasted into the screen.
5. Planning document preview is generated.
6. Save creates or updates PROJECT_PROFILE.md.
7. Save creates or updates PROJECT_STATE.md with Alpha app development wording.
8. Save creates or updates WORK_CARD_BACKLOG.md with the reconciled PH02 sequence.
9. Save creates or updates OPEN_QUESTIONS.md, RISKS.md, and DECISIONS.md when relevant.
11. Existing Project Architect Interview screen still works.

## Observed Errors

Project Architect Interview screen for new projects does not exist.  Project Planning Documents screen does not exist

## Evidence References

None recorded.

## Additional Operator Observations

None recorded.

## Repair Objective

WC04 - FIX

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
- Read the associated Implementer Report `BUILDER_REPORT_WC04_generate_project_planning_documents.md`.
- Read the validation record `VALIDATION_REPORT_WC04_generate_project_planning_documents.json`.

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

Expected report name: `BUILDER_REPORT_REPAIR_WC04_generate_project_planning_documents.md`

## Git Instructions

- Stage only repair-related files.
- Commit with a repair-specific message.
- Do not create a release tag.
- Do not push unless explicitly instructed.
