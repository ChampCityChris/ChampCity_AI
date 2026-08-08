<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR13",
    "repairId": "WC46-REPAIR13",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR12_explicit_mcp_workspace_binding_no_fallbacks.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR12_explicit_mcp_workspace_binding_no_fallbacks.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Project Intake Repository Persistence",
    "status": "approved_for_implementation",
    "executionMode": "one bounded prospective Project Intake persistence repair after WC46-REPAIR12 validation",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "Project Intake requires projectRepository and uses it as the selected write root, but new Project Intake canonical artifacts do not persist that repository value in body Markdown or embedded workflowData. Legacy Project Intake documents are not being migrated by Operator choice.",
    "rootCause": "submitProjectIntakeForRepository normalizes projectRepository and passes it forward, but projectIntakeBody and intakeSubstantiveContent omit the field when writing durable Project Intake evidence.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR13_project_intake_repository_persistence.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Persist projectRepository prospectively in new Project Intake body Markdown and metadata workflowData. Do not migrate legacy documents.",
    "reviewedAt": "2026-08-06"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR13 — Project Intake Repository Persistence

Status: Approved for Implementer execution  
Parent: `WC46`  
Git mutation: prohibited

## Confirmed Defect

Project Intake currently asks for `projectRepository` and uses it as the selected repository root, but newly written Project Intake artifacts do not persist that value.

Confirmed source facts in `src/main/projectIntake/projectIntakeService.ts`:

- `submitProjectIntakeForRepository(...)` resolves `submission.projectRepository` to `projectRoot` and writes that normalized value back into `repositoryBoundSubmission.projectRepository`.
- `projectIntakeBody(...)` does not write a `Project Repository:` field.
- `intakeSubstantiveContent(...)` does not include `projectRepository` in canonical `workflowData`.
- Project Architect Interview Prompt metadata spreads `intakeContent`, so it also lacks `projectRepository`.

Legacy Project Intake documents are not in scope for migration.

## Objective

Prospectively persist Project Intake repository authority for new Project Intake submissions.

Required outcome:

```text
Operator submits Project Intake with projectRepository
→ app normalizes projectRepository to selected project root
→ Project Intake body includes Project Repository
→ Project Intake workflowData includes projectRepository
→ Project Architect Interview Prompt workflowData includes the same projectRepository through the existing intakeContent spread
```

## Required Changes

1. Update `intakeSubstantiveContent(...)` to include `projectRepository: submission.projectRepository`.
2. Update `projectIntakeBody(...)` to write a stable `Project Repository: <value>` line with the other fixed intake fields.
3. Preserve the existing `promptMetadata.workflowData = { ...intakeContent, ... }` propagation so the Project Architect Interview Prompt metadata receives the same value.
4. Do not migrate, rewrite, or backfill legacy Project Intake documents solely to add this field.

The persisted value must be the normalized value used by `submitProjectIntakeForRepository(...)`, not a separate raw field.

## Preserved Behavior

Preserve unchanged:

- Project Intake questionnaire contract and required-field validation;
- projectRepository as the selected write root;
- Project Intake slug, canonical path, revision, conflict detection, and invalidation behavior;
- Project Architect Interview Prompt target behavior;
- WC46-REPAIR12 explicit MCP workspace binding/no-fallback behavior;
- all MCP workspaceId, prompt-generation, Work Card loop, repair routing, validation, and Codex behavior;
- no legacy Project Intake migration;
- no Git mutation.

## Authorized Surface

Production file authorized:

```text
src/main/projectIntake/projectIntakeService.ts
```

Tests authorized:

```text
test/project-intake/project-intake-service.test.cjs
test/project-intake/project-intake-corpus-status.test.cjs
test/support/canonical-markdown-fixtures.cjs
```

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR13_project_intake_repository_persistence.md
```

## Acceptance Criteria

1. New Project Intake canonical metadata includes `workflowData.projectRepository`.
2. New Project Intake body Markdown includes a fixed `Project Repository:` line.
3. The persisted repository value is the normalized project root value used by `submitProjectIntakeForRepository(...)`.
4. New Project Architect Interview Prompt metadata includes the same `workflowData.projectRepository` through existing `intakeContent` propagation.
5. Existing Project Intake conflict detection, revision creation, prompt target resolution, and invalidation behavior remain unchanged.
6. No legacy Project Intake migration is performed.
7. Tests prove a new Project Intake submission persists `projectRepository` in body Markdown and metadata workflowData.
8. Tests prove Project Architect Interview Prompt workflowData receives the same value.
9. No unrelated MCP workspace binding, prompt-generation, Work Card loop, repair routing, validation, or Codex behavior changes are introduced.
10. No Git mutation is performed.

## Negative Constraints

Do not:

- migrate legacy Project Intake documents;
- infer or synthesize MCP workspaceId from projectRepository;
- treat projectRepository as MCP workspaceId;
- add duplicate repository fields with different names;
- change Project Intake path selection, slug generation, revision invalidation, or prompt target logic except as required by tests for this field;
- modify unrelated project planning, phase planning, Work Card, repair, validation, Codex, or MCP prompt behavior;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Return Target

```text
WC46-REPAIR13 implementation complete
→ planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR13_project_intake_repository_persistence.md
→ Architect review
→ Operator validation
→ return to the active WC46 repair/work-card loop according to existing resolver authority
```

## Implementer Report Requirements

The Implementer Report must include exact files changed, confirmation that no legacy migration was performed, before/after repository persistence behavior, validation commands with working directory and exit codes, acceptance-criteria mapping, and any skipped validation or residual risk.

The report must remain `Pending` for Architect/Operator review.

## Manual Validation

1. Create a new Project Intake for a temporary project repository.
2. Confirm the generated Project Intake body includes `Project Repository:`.
3. Confirm Project Intake `workflowData.projectRepository` exists and matches the normalized repository path.
4. Confirm Project Architect Interview Prompt `workflowData.projectRepository` exists and matches the same value.
5. Confirm no legacy Project Intake document was migrated solely for this field.
