# Work Card — Phase 08 WC05 Project Planning Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: high
Depends on: WC04
Execution authorization: withheld
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC05_project_planning_workspace.md`

## Purpose

Implement `project-planning-review`, generate the Approved non-review Project Planning handoff, receive `Project_Profile` and `Project_Roadmap`, review them independently, and apply one synchronized bundle disposition.

## Controlling Designs

- `PROJECT_PLANNING_WORKSPACE_DEFINITION.md`
- `PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `GENERATED_ARCHITECT_HANDOFF_CONTRACT.md`
- `ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`

## Workspace and Migration

```text
id: project-planning-review
level: project
stage: planning
order: 10
replaces: Project Planning
```

Retire the provisional `Project Planning` entry without affecting unrelated workspaces.

## Required Current Inputs

- Approved current Project Intake pair;
- Approved non-review Architect Interview Prompt pair;
- current Approved Project Architect Interview pair.

Stale or mismatched source revisions block handoff.

## Generated Handoff

```text
planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_<project-slug>.*
```

The pair uses `participationRole=nonReviewHandoff`, `Document.Status=Approved`, artifact revision, and current source-revision references. It names the exact output pairs:

```text
planning/project/PROJECT_PROFILE.*
planning/project/Project_Roadmap/PROJECT_ROADMAP_<project-slug>.*
```

## Workspace Experience

```text
Embedded Architect chat
|
├── Project Profile preview
├── Project Roadmap preview
└── one shared bundle disposition
```

Reuse WC03 browser/MCP components without weakening their security contract.

Both output pairs begin `Pending`, contain artifact revisions and source-revision references, and are independently readable. The shared disposition remains disabled until both current versions are reviewed.

Approve, Reject, or Request Revision updates all four output files through one staged operation. Revision notes apply to both documents; the Architect may revise either or both, but both must return to a coherent current Pending state before another decision.

## Freshness and Completion

A change to Project Intake, Interview Prompt, or Architect Interview invalidates the planning bundle and all downstream Project Building evidence.

Project Planning completes only when both output pairs are valid, synchronized, fresh, and Approved with no unresolved write error.

## Explicit Non-Goals

No Phase Map, Phase Planning, Work Cards, automatic navigation, hidden completion state, independent single-document approval, provider API, DOM automation, new dependency, or Git operation.

## Required Validation

```text
npm run typecheck
npm run build
npm test
```

Cover provisional migration, input freshness, non-review handoff treatment, WC03 security regression, four-file transaction and rollback, mixed-state prevention, bundle revision, downstream invalidation, and completion derivation.

## Acceptance Criteria

1. One final `project-planning-review` workspace replaces the provisional entry.
2. Handoff requires current Approved inputs.
3. Handoff is Approved `nonReviewHandoff` and names exact output targets.
4. Both planning documents are independently reviewable but not independently approvable.
5. Shared disposition is atomic across four files.
6. Source changes invalidate the bundle and downstream evidence.
7. Completion requires both current Approved documents.
8. WC03 browser-security boundaries remain intact.
9. No later lifecycle or hidden authority is introduced.
10. Typecheck, build, and tests pass.
11. No Git mutation occurs.

## Implementer Report Requirements

Record repository verification, changed files, migration, paths, handoff role, source freshness, transaction behavior, WC03 regression evidence, validation results, and remaining Operator validation. End with `Document.Status=Pending`.

## Manual Validation After Architect Review

The Operator should generate and review both planning documents, exercise a shared revision, then revise the interview and confirm the older planning bundle no longer completes Project Planning.

## Document Disposition

Document.Status=Approved
