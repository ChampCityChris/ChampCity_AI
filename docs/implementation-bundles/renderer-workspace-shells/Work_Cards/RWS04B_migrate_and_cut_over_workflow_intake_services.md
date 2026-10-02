# RWS04B — Migrate and Cut Over Workflow Intake Services to Structured State

**Status:** IMPLEMENTER_READY  
**Depends on:** RWS04A accepted  
**Type:** Intake persistence cutover / bounded legacy import  
**Baseline:** use current `dev` after accepted RWS04A.

## Objective

Build one structured Workflow Intake application service for **all seven substantive Intake families** and provide deterministic migration from the Intake representations already present in existing Projects.

This card builds and proves the service/migration boundary. Renderer activation belongs to RWS04C.

## Scope: seven Intake families

Include:

- Project Creation / Greenfield
- Feature / Capability
- Refactor / Migration
- Integration / Composition
- Issue Resolution
- Infrastructure / Platform
- Research / Prototype

Exclude Work Intake Routing.

## Unified Intake contract

Extend `workflowIntakeContracts.ts` so the application service can validate all seven Workflow types.

Preserve the six RWS02 definitions.

Add Project Creation using the existing Greenfield fields/semantics:

1. `projectName`
2. `projectPurpose`
3. `desiredOutcome`
4. `projectType`
5. `projectRepository`
6. `hasExistingSourceOrPlanning` (boolean)
7. `knownConstraints` (optional)
8. `repositoryReviewContext` (optional)

Preserve current Greenfield labels/order and `ProjectType` values.

## Structured Workflow Intake service

Refactor the current generic Workflow Intake facade so SQL `WorkflowIntake` is the sole authoritative Intake source.

Required operations:

- get exact Workflow Intake;
- save/revise exact Workflow Intake;
- review current Intake revision;
- return current record version and current disposition.

Do not create/update Feature/Issue/RWS03 Intake Findings after cutover.

Feature/Issue planning services must read Intake values from the structured WorkflowIntake projection rather than reconstructing Intake from Findings.

## Existing-project migration is supported

Existing Projects **are migratable**. No SQL schema migration is required.

Implement deterministic, idempotent per-Workflow migration with preview/apply semantics. Migration never deletes legacy evidence.

### Legacy sources

#### Project Creation

Source:

- the one canonical Greenfield Project Intake Markdown associated with the exact current `project-creation` Workflow.

Import:

- its canonical `workflowData` into WorkflowIntake;
- provenance `origin: "legacy-import"` with sourceRef = exact Markdown path;
- map current document disposition:
  - Pending -> no structured review Decision;
  - Approved -> current `approved` Workflow Intake Decision;
  - RevisionRequested -> `revision_requested`;
  - Rejected -> `rejected`;
- preserve review notes and reviewedAt when available.

Fail closed for that Workflow if canonical Intake identity is ambiguous/conflicting.

#### Feature

Source exact Workflow-owned legacy Findings with category `feature-intake`.

Map existing field titles to the preserved Feature keys.

#### Issue

Source exact Workflow-owned legacy Findings with category `issue-intake`.

Map existing field titles to the preserved Issue keys.

#### Refactor / Integration / Infrastructure / Research

Source RWS03 exact Workflow-owned Findings with category:

`workflow-intake:<workflowType>:<fieldKey>`

Map `current` values; omit `omitted` optional values.

### Migration invariants

- if one valid current WorkflowIntake already exists: no-op after validating it;
- no legacy Intake data: report `not-needed`;
- one unambiguous legacy source: import once;
- ambiguous/conflicting sources: report `blocked`, do not guess;
- never delete old Markdown or Findings;
- never treat old records as authority after successful import;
- repeated apply is idempotent.

## Lazy compatibility seam

Expose an `ensureWorkflowIntake`/equivalent operation that:

1. returns current structured Intake if present;
2. otherwise previews the exact Workflow migration;
3. auto-applies only an unambiguous `ready` migration;
4. returns empty if no legacy Intake exists;
5. fails with the specific migration blocker if ambiguous.

This allows existing Projects to move forward without a one-time manual migration screen.

Do not perform project-wide mutation on startup.

## Greenfield compatibility

The current Greenfield renderer/API may remain on its old path until RWS04C activates the shared service.

However, build a structured Greenfield adapter sufficient for RWS04C to replace `submitProjectIntakeForRepository`.

The adapter must preserve:

- exact current Project Creation Workflow identity;
- repository binding/current project root semantics;
- existing field validation;
- no Workflow workspace advance on Intake save.

Do not write new authoritative Greenfield Markdown in this card.

## Downstream semantic consumers

Update existing consumers that require Intake semantics to obtain them from the structured WorkflowIntake service after ensure/migration:

- Feature Assessment preparation;
- Issue RCA preparation;
- Greenfield Architect Interview context/prompt preparation.

They may still produce their existing later-stage Markdown artifacts. Only their **Intake input source** changes.

Prepared instructions must identify exact WorkflowIntake ID + recordVersion as authority. They may include a generated Markdown projection path later as human-readable context, but must not call it authoritative.

Do not migrate Architect Interview/Assessment/RCA output state in this card.

## Legacy records after import

Legacy Findings and Greenfield Intake Markdown remain historical evidence.

Do not revise them to stay synchronized and do not delete them.

This deliberately prevents dual-write authority.

## Required production areas

Expected:

- `src/shared/workflowIntakeContracts.ts`
- `src/main/workflow/workflowIntakeService.ts`
- new bounded migration/helper module(s)
- `src/main/featurePlanning/featurePlanningService.ts`
- `src/main/issuePlanning/issuePlanningService.ts`
- Greenfield Architect Interview context/prompt service surfaces needed to consume structured Intake.

No renderer activation, Markdown projection writer, top rail, Git/source-control, or SQL table migration.

## Focused proof

Extend existing workflow/service/migration owners to prove:

1. all seven Workflow types save/read one WorkflowIntake;
2. no new Intake Findings are created;
3. Feature/Issue planning services read structured Intake;
4. Greenfield Architect Interview context reads structured Intake;
5. each legacy format migrates correctly;
6. legacy Greenfield disposition imports into an exact-version Decision;
7. migration is idempotent;
8. ambiguous Greenfield documents or duplicate legacy field sources block rather than guess;
9. existing legacy data remains untouched after migration;
10. current Workflow workspace is unchanged by save/migration;
11. no SQLite schema migration is required.

Include a fixture representing a newly registered Project with an existing Greenfield Markdown Intake and a fixture representing RWS03 Finding-backed Refactor/Migration Intake.

## Validation

- `npm run validate:plan -- --profile work-item --changes tmp/rws04b-changes.json`
- `npm run test:affected -- --changes tmp/rws04b-changes.json`
- focused Workflow Intake / Feature / Issue / Architect Interview tests;
- `git diff --check`.

Do not run full/release qualification.

## Acceptance criteria

1. One application service owns structured Intake for all seven substantive Workflow types.
2. Existing Projects can migrate supported legacy Intake state without a database schema migration.
3. Legacy ambiguity blocks only the affected Workflow and preserves source evidence.
4. Feature, Issue and Greenfield downstream Architect preparation consume SQL Intake.
5. No new authoritative Intake Markdown or Intake Findings are written.
6. Production renderer is not switched until RWS04C.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS04B_IMPLEMENTER_REPORT.md`

Include migration matrix, blocked conditions, compatibility findings, proof and validation.

## Checkpoint and STOP

Commit:

`RWS04B migrate workflow intake to structured state`

Then STOP for Architect review.
