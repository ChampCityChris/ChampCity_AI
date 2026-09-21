# WIR23-REPAIR04 — Preserve Sequential Intake Target Baseline

**Parent:** WIR04 / WIR22 / WIR23  
**Architect finding:** AR-WIR-04 in `ARCHITECT_CODE_REVIEW_2026-09-20.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR04_IMPLEMENTER_REPORT.md`

## Confirmed Defect

The Work Intake form currently defaults its base branch to the repository's currently checked-out branch.

A completed Work Intake remains checked out on its `work-intake/...` branch after target advancement. A temporarily clean active Work Intake may also be the current branch.

Starting another Intake can therefore default the new work to the prior Work Intake branch instead of its intended integration target.

## Root Cause

Base-branch suggestion is renderer-derived from checkout state rather than service-derived from Work Intake/source-control semantics.

The current checkout and the appropriate integration baseline are not always the same SourceLine.

## Objective

Have the service provide the correct suggested integration baseline for Start Work so sequential Intakes default to the intended target rather than accidentally nesting one Work Intake under another.

## Required Changes

1. Extend the Work Intake projection with a service-owned suggested base identity containing the branch/SourceLine and its current exact commit.
2. Resolution rule:
   - if the current branch is not a managed Work Intake branch, the current branch may remain the default;
   - if the current branch belongs to a Work Intake, default to that Intake's recorded `baseBranch` / integration target;
   - resolve the **current commit of that target**, not the historical `baseCommit` from when the prior Intake began.
3. Do not hardcode `dev`; the target comes from the Intake binding and current repository state.
4. Update `WorkIntakeWorkspace.tsx` to initialize from the service-owned suggestion rather than deriving the default directly from `currentBranch`.
5. The Operator must remain able to deliberately choose another supported branch.
6. `submitWorkIntake()` and branch establishment must continue rechecking exact branch/commit identity before creating the new Work Intake branch.
7. If the suggested target disappears or moves between projection and submission, fail stale and refresh rather than silently choosing another branch.

## Required Proof

The production path must show:

1. On a normal target branch, Start Work defaults to that branch.
2. On an active/complete Work Intake branch, Start Work defaults to the Intake's target branch at the target's current commit.
3. Saving creates the new Work Intake branch from that target, not from the previous Work Intake branch.
4. Explicit Operator selection of another valid target still works.
5. Target movement between form load and submit is rejected as stale.
6. No branch name such as `dev` is embedded as product policy.

## Preserve

- Existing Work Intake branch naming/identity.
- Exact base commit capture.
- Operator branch choice.
- Existing Work Intake recovery behavior.
- Current compatibility lane until RepositoryCheckout orchestration replaces checkout assumptions.

## Forbidden Changes

- No automatic nested Work Intake branches.
- No hardcoded target branch.
- No renderer-owned source-control inference.
- No forced checkout switching solely to solve this defaulting issue.
- No RepositoryCheckout implementation in this card.

## Implementer Report

Record the baseline-selection rules, production files changed, exact source-control facts used to derive the suggestion, proof exercised, deviations, and residual risk.

## Return Path

Return to Architect code review of sequential Work Intake behavior.
