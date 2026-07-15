<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/repair_record/WC08",
  "artifactType": "repair_record",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Repair_Prompts/REPAIR_PROMPT_WC08_current_step_context_inspector.json",
  "markdownPath": "planning/phases/phase-03/Repair_Prompts/REPAIR_PROMPT_WC08_current_step_context_inspector.md",
  "payload": {
    "kind": "repair_record",
    "title": "REPAIR PROMPT WC08 current step context inspector"
  },
  "payloadHash": "sha256:1d51e3981528aab4b33b3d0e34791d6c06574560c37d126291c5c9738bd6d33c",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [
      "champcity-ai/phase-03/work_card/WC08_current_step_context_inspector"
    ],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-14T00:00:00.000Z",
  "workCardId": "WC08"
}
-->

You are acting as Implementer for ChampCity A/I.

The Implementer may be Codex, Claude Code, Cursor, or another coding agent. Repair only from the validation evidence below.

Repository:
<PROJECT_REPO>

## Repair Task Identity

- Repair task: REPAIR_WC08_current_step_context_inspector
- Selected Work Card ID: WC08
- Selected Work Card title: Current Step Context Inspector
- Phase: phase-03
- Associated Implementer Report: IMPLEMENTER_REPORT_WC08_current_step_context_inspector.md
- Validation record: VALIDATION_REPORT_WC08_current_step_context_inspector.json

## Operator Validation Result

- Validation result: Pass
- Operator decision: Partial - repair or follow-up needed

## What Passed

1. Route context is easy to find beside Artifacts and Complete current action.
2. Route context does not consume permanent workspace area when not selected.
3. Left panel remains compact.
4. Inspector is not shown in supporting/reference screens.

6. Raw paths, technical IDs, warning codes, and fallback paths remain secondary/collapsed.
7. Stale/superseded/historical records are visibly non-controlling.
8. Capability state does not falsely claim write/MCP availability.
9. Artifacts remains the only artifact list/preview surface.
10. Complete current action remains easy to reach.
11. Reading the inspector does not mutate workflow state.
12. WC04/WC05/WC06/WC07 behavior remains usable.
13. WC09-WC15 behavior does not appear.

## What Failed

5. It explains why the current action was selected.

## Observed Errors

5. There is a whole lot of information here but it is completely unclear what it is communicating.

## Evidence References

None recorded.

## Additional Operator Observations

Information contained in Route Context is vast but does not clearly communicate to a non-technical user why the application has determined the progress.  It also doesn't provide any ability to tell the application that it is incorrect.  Navigation tabs now have a random flow of order they were created as opposed to a logical flow of how they would be used. Route Context may be better positioned as a tab in the Left Context menu as it directly relates to the Next Required Action information displayed there rather than the workspace. This doesn't mean it can use the workspace to display information when clicked but that the tab's placements itself doesn't make sense.

## Repair Objective

Repair the validated failure and preserve all behavior that already passed manual validation.

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
- Read the selected Work Card from `planning/phases/phase-03/Work_Cards/`.
- Read the associated Implementer Report `IMPLEMENTER_REPORT_WC08_current_step_context_inspector.md`.
- Read the validation record `VALIDATION_REPORT_WC08_current_step_context_inspector.json`.

## Validation Commands

```bash
npm run typecheck
npm run build
npm test
npm run test:work-cards
git status --short
```

## Implementer Report Requirement

Create a repair Implementer Report under `planning/phases/phase-03/Implementer_Reports/`.

Repair reports use the canonical `Implementer_Reports` folder and `IMPLEMENTER_REPORT_REPAIR_*` filename pattern.

Filename pattern: `IMPLEMENTER_REPORT_REPAIR_<work_card_id>_<slug>.md`

Expected report name: `IMPLEMENTER_REPORT_REPAIR_WC08_current_step_context_inspector.md`

## Git Instructions

- Stage only repair-related files.
- Commit with a repair-specific message.
- Do not create a release tag.
- Do not push unless explicitly instructed.
