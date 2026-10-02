# RWS05D — Port Feature Assessment and Issue RCA to the Shared Architect Workspace

**Status:** IMPLEMENTER_READY
**Bundle:** RWS05 Architect Workspace Family
**Depends on:** RWS05A–RWS05C checkpoints

## Objective

Rebuild Feature Assessment and Issue RCA as adapters over the RWS05 Architect workspace shell and RWS05B ArchitectReviewCycle model, preserving their already-valid Structured Project State semantics while removing their provisional bespoke renderer compositions.

Do not migrate Feature Planning or Issue Correction Planning in this card. Those belong to the later Planning workspace-family refactor.

## Feature Assessment

The current Feature service already uses Structured Project State Findings and Decisions after acceptance. Refactor the assessment path so the Architect candidate is persisted before Operator disposition as reviewable SQL semantics.

Required behavior:

- Architect output contract remains the existing bounded Feature assessment contract.
- Candidate assessment values become exact Workflow-owned semantic records.
- The current Feature ArchitectReviewCycle stageKind is `feature-assessment`.
- Generated Markdown is rendered from those SQL semantic records for Operator review.
- Approve / Revision Requested / Reject use the exact current ArchitectReviewCycle recordVersion.
- Approved current cycle is the eligibility boundary for Feature Planning.
- Do not write or parse canonical Feature assessment Markdown.

Existing accepted Feature assessment Findings/Decisions may be adopted into a current ArchitectReviewCycle when their ownership is unambiguous. Preserve the existing records rather than recreating them unnecessarily.

## Issue RCA

The current Issue service already uses RootCause, Evidence, Findings, Decisions, and relationships. Refactor the RCA path so the proposed RCA exists in SQL before disposition and is grouped by the current `ArchitectReviewCycle(stageKind="issue-rca")`.

Required behavior:

- evidence upload remains Project State Evidence;
- RCA candidate persists RootCause records and exact evidence/finding relationships before review;
- generated RCA Markdown is rendered from SQL;
- Operator disposition governs the exact current cycle version;
- only an Approved current RCA cycle makes those RootCause records eligible for Correction Planning;
- existing accepted Issue RCA semantic records may be adopted into a current cycle when unambiguous;
- no legacy RCA Markdown becomes authority.

Do not regress the ability for RCA to cite the Workflow Intake directly when no additional Finding is required.

## Shared shell

Replace the current bespoke one-page `FeaturePlanningWorkspace` assessment presentation and `IssueWorkflowPlanningWorkspace` RCA presentation with adapters over the RWS05A Architect shell.

For these stages:

- left = generated semantic review projection plus workflow-specific supporting controls;
- right = embedded ChatGPT;
- common review/disposition behavior uses the same Architect review presentation primitives as Greenfield;
- Back to Workflows and stage rail remain consistent.

Issue evidence controls may appear in a typed left-side slot without creating a new page geometry.

Do not copy the current provisional Feature/Issue layout into the shell.

## Architect handoff/draft transport

Feature and Issue Architect prompts must request bounded structured output matching their existing semantic contracts.

If the existing temporary draft/paste transport is retained during this card, it is transport only. The Operator reviews the SQL-derived projection, not the raw textarea or temporary artifact.

Prefer converging Greenfield, Feature, and Issue onto one Architect candidate-ingestion adapter.

## Currentness and stale review

Any material change to the current Feature assessment or Issue RCA semantic member set must revise the ArchitectReviewCycle and make the prior Operator review non-current.

Do not infer currentness from timestamps alone when exact cycle revision is available.

## Existing-project compatibility

Supported migration:

- existing Feature assessment SQL Findings + governing Decision -> adopt into a Feature ArchitectReviewCycle when exact Workflow ownership is unambiguous;
- existing Issue RCA RootCause/Evidence/Decision state -> adopt into an Issue ArchitectReviewCycle when unambiguous.

If duplicate/conflicting semantic sets exist, block the affected Workflow and report the conflict. Do not guess.

Do not require Project recreation.

## Downstream compatibility

Feature Planning and Issue Correction Planning remain in their current implementation for now, but their prerequisite selectors must read the approved current ArchitectReviewCycle/semantic members rather than old assessment/RCA-specific review heuristics.

Do not rebuild their UI in this card.

## Focused proof

Prove:

1. Feature Assessment and Issue RCA both render through the shared Architect shell.
2. ChatGPT remains the right companion.
3. Feature candidate exists in SQL before Operator disposition.
4. Issue RCA RootCause candidate exists in SQL before Operator disposition.
5. generated Markdown is derived from SQL and manual edits do not affect state.
6. exact cycle review and revision invalidation work.
7. accepted legacy structured Feature/Issue state adopts idempotently when unambiguous.
8. ambiguous existing state blocks rather than guesses.
9. Feature Planning requires approved current Feature cycle.
10. Issue Correction Planning requires approved current RCA cycle.
11. Issue evidence behavior remains intact.
12. no Feature/Issue assessment/RCA canonical Markdown authority is introduced.

## Scope exclusions

Do not migrate:

- Feature Plan Review;
- Issue Correction Plan Review;
- Work Item Map;
- Execution;
- Validation;
- Close.

## Implementer Report

Write `docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS05D_IMPLEMENTER_REPORT.md`.

## Checkpoint and continuation

Commit `RWS05D port feature assessment and issue rca to architect shell`.

If no bundle stop condition is met, continue directly to RWS05E.
