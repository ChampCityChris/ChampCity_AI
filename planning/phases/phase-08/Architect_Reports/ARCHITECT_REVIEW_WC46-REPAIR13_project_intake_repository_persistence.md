# Architect Review — WC46-REPAIR13 Project Intake Repository Persistence

Document.Status=Approved  
Review revision: 1  
Reviewed artifact: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR13_project_intake_repository_persistence.md`  
Reviewed Work Card: `planning/phases/phase-08/Work_Cards/WC46-REPAIR13_project_intake_repository_persistence.md` revision 1

## Disposition

Approved for Operator validation.

WC46-REPAIR13 satisfies the approved repair contract. The implementation prospectively persists the Project Intake repository value in new Project Intake body Markdown and canonical workflowData, and the existing Project Architect Interview Prompt metadata spread now carries the same value forward. No legacy Project Intake migration was introduced.

## Repository Verification

Repository reviewed through ChampCity MCP workspace `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`.

The working tree remains dirty from the active WC46 repair series. No Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, tag, or other Git mutation was performed during this review.

## Inputs Reviewed

- Approved Repair Work Card: `planning/phases/phase-08/Work_Cards/WC46-REPAIR13_project_intake_repository_persistence.md`, revision 1, sha256 `f38848d27e3847d317d0ae61ad6fb330ba4eb52a1fa26b68a31ebc467fe0af0a`
- Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR13_project_intake_repository_persistence.md`, sha256 `c0ce10499ab94d228cea90915e96ab6ef6e1d26c83c637e55847d4f53e0cd3f2`
- Production file: `src/main/projectIntake/projectIntakeService.ts`
- Test file: `test/project-intake/project-intake-service.test.cjs`
- MCP git status for workspace, branch, changed paths, and staged count

I did not rerun validation commands. Implementer-reported commands are treated as reported evidence only.

## Passing Findings

### P-01 — Project Intake workflowData now persists projectRepository

`intakeSubstantiveContent(...)` now includes:

```text
projectRepository: submission.projectRepository
```

This is the same submission value produced by `submitProjectIntakeForRepository(...)` after normalizing the selected repository root into `repositoryBoundSubmission.projectRepository`. That satisfies the Work Card requirement to persist the normalized selected repository value rather than a separate raw field.

### P-02 — Project Intake body Markdown now persists Project Repository

`projectIntakeBody(...)` now emits exactly one fixed Project Repository field with the other fixed intake fields:

```text
Project Repository: ${submission.projectRepository}
```

This satisfies the durable body Markdown evidence requirement for new Project Intake submissions.

### P-03 — Project Architect Interview Prompt metadata receives the same value

The implementation preserved the existing prompt metadata pattern:

```text
workflowData: {
  ...intakeContent,
  projectSlug,
  architectOutputTargets: { markdown: architectInterviewTargetMarkdownPath }
}
```

Because `intakeContent` now contains `projectRepository`, the Project Architect Interview Prompt metadata receives the same repository value without changing prompt target logic.

### P-04 — Tests prove prospective persistence

`test/project-intake/project-intake-service.test.cjs` now asserts:

```text
result.projectRoot === path.resolve(root)
Project Intake metadata.workflowData.projectRepository === result.projectRoot
Project Intake body contains exactly one Project Repository line matching result.projectRoot
Project Architect Interview Prompt metadata.workflowData.projectRepository === result.projectRoot
Prompt metadata projectRepository matches Intake metadata projectRepository
```

These tests directly cover the required prospective write path.

### P-05 — Legacy migration remains absent

No migration utility, backfill path, or legacy-document rewrite was introduced. The implementation is limited to prospective Project Intake creation/update behavior.

### P-06 — Authorized surface was respected

The implementation changed only the bounded production/test surfaces for this repair:

```text
src/main/projectIntake/projectIntakeService.ts
test/project-intake/project-intake-service.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR13_project_intake_repository_persistence.md
```

No MCP workspace binding, prompt-generation, Work Card loop, repair routing, validation disposition, Codex, or renderer behavior was changed by this repair.

## Blocking Findings

None.

## Non-Blocking Notes

The persisted Project Repository value is a normalized local repository root. That matches WC46-REPAIR13's explicit requirement. Legacy Project Intake documents remain without this field by design and by Operator direction.

## Acceptance Criteria Assessment

1. New Project Intake canonical metadata includes `workflowData.projectRepository` — Pass.
2. New Project Intake body Markdown includes fixed `Project Repository:` line — Pass.
3. Persisted repository value is normalized project root from `submitProjectIntakeForRepository(...)` — Pass.
4. New Project Architect Interview Prompt metadata includes the same value — Pass.
5. Existing conflict detection, revision creation, prompt target resolution, and invalidation behavior remain unchanged — Pass based on bounded source change and reported full test pass.
6. No legacy Project Intake migration is performed — Pass.
7. Tests prove new Project Intake body and metadata persistence — Pass.
8. Tests prove Project Architect Interview Prompt workflowData receives same value — Pass.
9. No unrelated MCP workspace binding, prompt-generation, Work Card loop, repair routing, validation, or Codex behavior changes — Pass.
10. No Git mutation is performed — Pass.

## Validation Notes

The Implementer reported these validation results:

```text
npx tsc --noEmit → exit 0
npx tsc → exit 0
npx vite build → exit 0 after documented sandbox spawn EPERM false-failure
node --test --test-concurrency=1 → exit 0, 306 tests passed after documented sandbox spawn EPERM false-failure
```

I did not rerun these commands. They are recorded as Implementer-reported evidence only.

## Manual Validation Recommended

1. Create a new Project Intake for a temporary project repository.
2. Confirm generated Project Intake body includes `Project Repository:`.
3. Confirm Project Intake `workflowData.projectRepository` matches the normalized repository path.
4. Confirm Project Architect Interview Prompt `workflowData.projectRepository` matches the same value.
5. Confirm no legacy Project Intake document was migrated solely for this field.

## Final Disposition

Approved for Operator validation.
