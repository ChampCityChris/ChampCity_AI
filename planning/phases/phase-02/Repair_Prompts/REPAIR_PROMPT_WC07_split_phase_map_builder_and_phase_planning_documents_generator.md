You are acting as Implementer for ChampCity A/I.

The Implementer may be Codex, Claude Code, Cursor, or another coding agent. Repair only from the validation evidence below.

Repository:
<PROJECT_REPO>

## Repair Task Identity

- Repair task: REPAIR_WC07_split_phase_map_builder_and_phase_planning_documents_generator
- Selected Work Card ID: WC07
- Selected Work Card title: Split Phase Map Builder and Phase Planning Documents Generator
- Phase: phase-02
- Associated Implementer Report: BUILDER_REPORT_WC07_split_phase_map_builder_phase_planning_generator.md
- Validation record: VALIDATION_REPORT_WC07_split_phase_map_builder_and_phase_planning_documents_generator.json

## Operator Validation Result

- Validation result: Partial
- Operator decision: Partial - repair or follow-up needed

## What Passed

[ ] Phase Map Builder is separate.
[ ] Phase Planning Documents Generator is separate.
[ ] Phase Map Builder has no phase dropdown.
[ ] Phase Map Builder creates a saved Phase Map from the three source artifacts.
[ ] The saved Phase Map includes phase-03 from the roadmap.
[ ] Phase Planning Documents Generator selects phases from the Phase Map.
[ ] Phase Planning Documents Generator can select phase-03.
[ ] Normal generation does not require Phase Intake.
[ ] Normal generation does not require Phase Architect Interview Prompt.
[ ] Normal generation does not require pasted Phase Architect Interview output.
[ ] The old “Paste the completed Phase Architect Interview output first” blocker is gone from the normal path.
[ ] Missing-source errors identify the missing source.
[ ] WC07 planning docs and project docs were updated.
[ ] No Phase 02 closeout was automatically performed by the app.

## What Failed

None recorded.

## Observed Errors

None recorded.

## Evidence References

None recorded.

## Additional Operator Observations

Phase 02 Work Card 07 passes validation of everything that it comments but creates a new question of work flow.  Phase 03 artifacts were created consisting of A Phase Planning Doc, Work Card Plans, and a Work Card Backlog Doc.  It is unclear to the operator what direction is to be taken next.  Should we be using those documents to create an architect prompt to create the actual work cards using the Capture Screen? If so, Phase 3 is not selectable within that screen.  That screen while having the top Phase and Work Card Header Selection available also has manual entry for those fields that is not tied to the selectors. We are running into continued risk here that the Architect doesn't fully understand what this application is trying to accomplish or is purposefully forcing a none human mental model of intended steps.

## Repair Objective

Unsure,  wquestions in operator's observations require further discussion to level set with the architect on Application's purpose and Workflow model.  The Architect must ask questions of the operator that will help it clarify what this application is being designed to accomplish.

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
- Read the associated Implementer Report `BUILDER_REPORT_WC07_split_phase_map_builder_phase_planning_generator.md`.
- Read the validation record `VALIDATION_REPORT_WC07_split_phase_map_builder_and_phase_planning_documents_generator.json`.

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

Expected report name: `BUILDER_REPORT_REPAIR_WC07_split_phase_map_builder_and_phase_planning_documents_generator.md`

## Git Instructions

- Stage only repair-related files.
- Commit with a repair-specific message.
- Do not create a release tag.
- Do not push unless explicitly instructed.
