# RWS05B — Structured Architect Review Cycle Foundation

**Status:** IMPLEMENTER_READY
**Bundle:** RWS05 Architect Workspace Family
**Depends on:** RWS05A checkpoint

## Objective

Add the Structured Project State foundation needed to review Architect-produced semantic records as one exact, versioned work product without making Markdown authoritative and without duplicating semantic content into a generic document blob.

## Domain model

Add a first-class `ArchitectReviewCycle` entity whose purpose is only to:

- identify the exact Workflow;
- identify the Architect stage/workspace family;
- anchor the current review revision;
- bind one exact set of semantic Project State records for Operator review.

It must not store a copy of the semantic document body.

Suggested body:

```ts
ArchitectReviewCycle: {
  workflowId: EntityId;
  workflowType: WorkflowType;
  stageKind:
    | "project-interview"
    | "feature-assessment"
    | "issue-rca"
    | "migration-assessment"
    | "integration-assessment"
    | "infrastructure-assessment"
    | "research-assessment";
  semanticDigest: string;
}
```

`semanticDigest` is application-computed from the exact current review-member identities/versions. It exists to ensure a changed semantic set advances the review-cycle record version. It is not a content authority.

No review/disposition status belongs in this body. Effective review state is derived from Decisions.

## Relationships

Add exact relationships:

- `architect_review_for: ArchitectReviewCycle -> Workflow`
- `review_member: Finding | RootCause | BoundedSolution | Criterion | Evidence -> ArchitectReviewCycle`

Rules:

- one active ArchitectReviewCycle for one exact Workflow + stageKind;
- exact same Project;
- Work Intake Routing is invalid;
- Project Creation is valid;
- review members must be active exact Project State records;
- membership cannot silently cross Workflows;
- Decisions use existing `governs` against the ArchitectReviewCycle.

Semantic records may also retain their normal Workflow relationships where required by downstream domain logic.

## Review semantics

Add typed commands equivalent to:

- get current cycle for exact Workflow + stage;
- create/revise current cycle from an exact bounded member set;
- get current effective disposition;
- record Operator review for exact cycle recordVersion.

Decision contract:

- decisionType `architect-review`;
- scope `architect-review:<cycleId>@<recordVersion>`;
- outcomes `approved | revision_requested | rejected`;
- Revision Requested requires bounded notes;
- human Operator only.

Changing any review member identity/version must revise the cycle and make prior review non-current automatically.

Do not mutate prior immutable Decisions.

## Semantic authority

The canonical content remains the actual semantic records:

- Greenfield Interview: Findings, Bounded Solutions, Criteria, Evidence/Decisions as applicable.
- Feature Assessment: Findings and related Decisions.
- Issue RCA: RootCause plus Evidence/Findings and relationships.
- Migration/Integration/Infrastructure/Research assessments: workflow-specific combinations of Findings, Bounded Solutions, Criteria, Evidence, and Decisions.

The ArchitectReviewCycle is only a grouping/version anchor for review.

Do not create an `ArchitectDocument` or long-text SQL blob that duplicates these records.

## Generated projection contract

Add shared types/helpers for an Architect review projection generated from the current cycle and its semantic members.

The projection must support:

- workflow/cycle identity;
- stage kind;
- exact recordVersion;
- effective disposition;
- deterministic ordered Markdown body;
- generated review filename/path;
- source semantic entity IDs/versions.

Do not write files in this card unless a narrow test helper requires rendering the in-memory projection.

## Existing SQLite compatibility

As with WorkflowIntake, current entity tables use open-text entity type and validated JSON. Prove the new entity/relationships work without a SQLite table migration.

Do not advance `project_state_authority`.

## Architecture docs

Update Structured Project State architecture to record:

`Architect semantic records -> ArchitectReviewCycle version anchor -> generated review Markdown -> Operator Decision`

and explicitly state that the review cycle groups canonical semantic records rather than replacing them.

## Focused proof

Prove:

1. ArchitectReviewCycle registration and validation.
2. Project Creation plus all six existing-project substantive Workflow types are valid owners.
3. WIR is rejected.
4. one current cycle per Workflow + stage.
5. exact member ownership and same-Project enforcement.
6. semantic member change advances the cycle version/digest.
7. exact-version Operator review.
8. prior review becomes stale after cycle revision.
9. Revision Requested requires notes.
10. existing SQLite schema accepts the new entity with no migration.

## Scope exclusions

No renderer activation.
No Greenfield legacy migration.
No Feature/Issue service rewrite.
No new workspace routes.
No Markdown authority changes.
No App.tsx cleanup beyond what RWS05A already did.

## Implementer Report

Write `docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS05B_IMPLEMENTER_REPORT.md`.

## Checkpoint and continuation

Commit `RWS05B add structured architect review cycle foundation`.

If no bundle stop condition is met, continue directly to RWS05C.
