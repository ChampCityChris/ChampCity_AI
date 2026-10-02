# RWS05C — Cut Greenfield Architect Interview Over to Structured Project State

**Status:** IMPLEMENTER_READY
**Bundle:** RWS05 Architect Workspace Family
**Depends on:** RWS05A and RWS05B checkpoints

## Objective

Make the Greenfield Project Architect Interview the reference implementation of the new Architect workspace family:

`approved WorkflowIntake -> Architect handoff -> structured semantic records -> ArchitectReviewCycle -> generated Markdown review projection -> Operator Decision`

The existing canonical Project Architect Interview Markdown must stop being authority.

## Typed Greenfield Architect output

Define a bounded typed output contract derived from the current required Interview coverage.

The contract must materially cover:

- Project Understanding
- Users and Primary Workflows
- Scope
- Non-Scope
- Constraints
- Key Decisions
- Architect Recommendations
- Data and Integration Requirements
- Security, Compliance, and Operational Considerations
- Risks and Dependencies
- Assumptions
- Deferred Decisions
- Unresolved Questions
- Acceptance Direction
- Project Planning Direction

Prefer structured strings/lists/records rather than one free-form Markdown body.

The handoff may use the existing temporary Architect draft transport if that is the narrowest compatible path, but transport content must be parsed/validated as the typed Architect output and persisted to SQL before it can become reviewable. A temporary transport file is not canonical state.

Do not create final canonical Architect Interview Markdown from the model response.

## Semantic persistence mapping

Materialize the Greenfield Interview into existing Project State semantics:

- one primary `BoundedSolution` for Project/architecture/planning direction, including scope in/out, constraints, assumptions, and risks;
- bounded `Finding` records for material users/workflows, capability/product understanding, data/integration requirements, security/compliance/operational requirements, deferred items, and unresolved items;
- `Criterion` records for acceptance direction where the content can be expressed as criteria;
- proposed key decisions/recommendations must not become effective Operator Decisions merely because the Architect emitted them.

All reviewable semantic records belong to the exact Project Creation Workflow and current `ArchitectReviewCycle(stageKind="project-interview")`.

A proposed review member must not be selected as accepted governing Project architecture merely because it exists. Downstream selectors must require an Approved current ArchitectReviewCycle where appropriate.

## Operator review

Generated Markdown is rendered from the current SQL semantic members in the same human-readable 15-section order used by the current Greenfield Interview.

The left review pane uses that generated projection.

Approve / Revision Requested / Reject create the exact-version Architect review Decision against the current ArchitectReviewCycle.

Approval must not require rewriting the generated Markdown.

A revised Architect output changes semantic membership/version, revises the cycle, and makes the previous review stale.

## Generated Markdown

Use a dedicated derived writer analogous to the Intake projection writer.

Preserve the familiar Greenfield Architect Interview path when safe for compatibility, but its file is now a generated projection only.

The projection must be rebuildable from SQL and contain a generated marker plus bounded projection metadata including cycle ID/version and source semantic entity IDs.

Manual edits/deletion of the generated file never change SQL.

Generated Architect Interview projections must be excluded from legacy canonical authority discovery.

## Legacy Greenfield migration

Do **not** parse a free-form historical Architect Interview Markdown body into semantic authority.

If an active Project has only legacy Greenfield Architect Interview Markdown and no structured ArchitectReviewCycle:

- retain the legacy document as historical evidence/provenance;
- require a fresh Architect Interview cycle from the approved structured Intake;
- do not guess semantic records from prose.

This is an accepted migration limitation.

## Prompt/handoff migration

Architect Interview instructions must consume approved SQL WorkflowIntake directly.

Any generated prompt Markdown is a handoff aid only and must not become a prerequisite authority source.

Prefer eliminating the canonical Prompt/Interview source-revision dependency where the SQL IDs/versions can express freshness directly.

Freshness of Greenfield Architect Interview is based on the exact approved Intake revision and ArchitectReviewCycle version, not on generated Markdown revision metadata.

## Workspace behavior

Use the RWS05A shared Architect shell.

Preserve:

- left review/work surface;
- right embedded ChatGPT;
- existing reload/retry browser behavior;
- direct navigation from completed Intake;
- Prepare/Copy handoff behavior where still useful;
- Greenfield top rail.

Architect Interview completion/rail status derives from the current SQL review cycle and exact-version Decision.

## Downstream bridge

Project Planning prerequisites must consume approved structured Greenfield Architect semantics.

Do not require Project Planning to parse generated Architect Interview Markdown.

Project Planning itself remains otherwise legacy in this card; its family migration comes later.

## Focused proof

Prove:

1. approved SQL Intake prepares Greenfield Architect handoff without canonical Intake Markdown authority;
2. typed Architect output validates and persists semantic records;
3. current cycle groups exact semantic members;
4. generated 15-section Markdown is rendered from SQL;
5. manual projection edits/deletion do not alter SQL and refresh rematerializes;
6. exact-version review works;
7. revision invalidates prior approval;
8. direct navigation after Intake approval is error-free;
9. Project Planning prerequisite reads approved structured Architect semantics;
10. legacy free-form Interview Markdown is never parsed into authority;
11. old historical files remain preserved;
12. no final model-authored canonical Interview Markdown is written.

## Implementer Report

Write `docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS05C_IMPLEMENTER_REPORT.md`.

## Checkpoint and continuation

Commit `RWS05C cut greenfield architect interview to structured state`.

If no bundle stop condition is met, continue directly to RWS05D.
