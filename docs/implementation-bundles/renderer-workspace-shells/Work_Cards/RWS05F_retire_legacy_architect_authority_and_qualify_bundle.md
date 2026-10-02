# RWS05F — Retire Architect-Family Legacy Authority Paths and Qualify the Bundle

**Status:** IMPLEMENTER_READY
**Bundle:** RWS05 Architect Workspace Family
**Depends on:** RWS05A–RWS05E checkpoints

## Objective

Complete the Architect workspace-family cutover, remove now-obsolete Architect-family Markdown authority/recovery paths, finish the App.tsx extraction, and produce one bundle-level qualification package for Architect review.

This card is cleanup/qualification. Do not begin the Planning family.

## App.tsx cleanup

After the RWS05 adapters are active:

- remove Greenfield Architect Interview workspace composition that remains in App.tsx;
- remove Architect-family selected-document/recovery logic that exists only to bridge SQL records into the legacy repository document reader;
- remove Architect-family review/disposition state that is now owned by the shared shell/adapters;
- keep application routing, exact Workflow identity, and browser-host mechanics at App level only where they are genuinely application concerns.

Do not remove generic Architect-output infrastructure still required by later unmigrated workspace families such as Project Planning, Phase Interview/Planning, Work Card flows, validation, or repair.

The goal is bounded removal of Architect-family ownership, not a broad App rewrite.

## Retire legacy Architect-family authority

Greenfield:

- no canonical Project Architect Interview Markdown authority;
- no canonical prompt/interview freshness authority based on Markdown source revisions;
- no final-draft promotion path whose canonical result is Markdown;
- generated Interview Markdown may remain as readable projection/export;
- handoff prompt projection may remain as a derived aid if useful.

Feature / Issue:

- no assessment/RCA review state reconstructed from bespoke legacy heuristics when the current ArchitectReviewCycle is available;
- no raw draft textarea/paste content treated as canonical review state.

Migration / Integration / Infrastructure / Research:

- only the structured assessment model introduced in RWS05E is authoritative.

Do not delete historical files or historical structured records.

## Shared adapter contract

Converge the seven Architect-stage consumers on one common application-facing shape sufficient for the shell:

- exact Workflow identity/type/title;
- stageKind and stage label;
- prerequisite state;
- current ArchitectReviewCycle ID/version;
- current effective disposition;
- ordered generated review projection;
- workflow-specific support data/controls;
- Prepare/Copy/Refresh actions;
- review actions;
- browser companion eligibility;
- next-stage readiness.

Workflow-specific domain services may remain separate behind this adapter.

Do not force unrelated Planning/Execution domain models into this contract.

## Stage/rail finalization

Verify all substantive workflows show coherent front-half progression:

### Greenfield
- Project Intake
- Architect Interview
- Project Planning Not Ready/next legacy stage as currently supported

### Feature
- Intake
- Architect Assessment
- Planning next

### Issue
- Intake
- Root Cause Analysis
- Correction Planning next

### Migration / Integration / Infrastructure / Research
- Intake
- Architect Assessment
- Planning Not Ready

Rail state must derive from SQL authority for migrated Intake/Architect stages, not generated Markdown.

## Architecture updates

Update the renderer rebaseline and Structured Project State architecture to record the completed Architect-family pattern:

`approved Intake -> Architect interaction -> semantic SQL records -> ArchitectReviewCycle -> generated Markdown review projection -> SQL Decision -> next-stage eligibility`

Record explicitly:

- generated Architect Markdown is derived;
- model-authored transport is not canonical;
- review cycle is a grouping/version anchor, not a duplicate document entity;
- legacy free-form Architect Markdown is not reparsed into authority;
- family-by-family migration continues with Planning next.

## Bundle qualification

Run one final RWS05 affected-set validation from the RWS05A baseline through RWS05F.

Required:

- work-item validation plan against the complete RWS05 changed-file set;
- affected tests;
- focused Project State ArchitectReviewCycle tests;
- focused Greenfield Architect Interview tests;
- focused Feature Assessment tests;
- focused Issue RCA tests;
- focused Migration/Integration/Infrastructure/Research assessment tests;
- renderer shell/rail/browser tests;
- generated projection/manual-edit isolation tests;
- `git diff --check`.

Do not run full/release qualification unless the validation planner specifically requires it.

Known unrelated repository failures must be reported distinctly from RWS05-attributable failures. Do not modify unrelated production code to make the bundle green.

## Bundle-level acceptance proof

The Implementer Report must include a matrix for all seven substantive Workflow types showing:

- Intake authority = SQL;
- Architect stage exists;
- shared Architect shell used;
- Architect semantic authority = SQL records;
- review grouping = ArchitectReviewCycle;
- readable Markdown = generated projection;
- disposition = SQL Decision;
- ChatGPT attached in Architect stage;
- next-stage state after approval;
- legacy migration behavior.

## Operator validation target

After bundle implementation, Operator validation should be possible in one pass:

1. Greenfield: completed Intake -> Architect Interview -> structured review projection -> approve -> next stage.
2. Feature: Intake -> Architect Assessment -> structured review -> approve -> Planning.
3. Issue: Intake -> RCA -> structured review -> approve -> Correction Planning.
4. One of Migration/Integration/Infrastructure/Research: Intake -> Architect Assessment -> structured review -> approve -> Planning remains Not Ready.
5. Confirm consistent shell geometry and right-side ChatGPT across all Architect stages.
6. Confirm generated Markdown edits do not alter SQL.
7. Confirm App no longer owns the Architect-family workspace implementation.

## Implementer Report

Write `docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS05F_BUNDLE_QUALIFICATION_REPORT.md`.

Include every checkpoint hash from RWS05A through RWS05F and the complete changed-file set.

## Checkpoint and STOP

Commit `RWS05F qualify architect workspace family cutover`.

Then STOP.

Return the full RWS05A–RWS05F checkpoint sequence for one Architect review. Do not begin Planning-family extraction until Operator and Architect acceptance.
