<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR05",
    "repairId": "WC46-REPAIR05",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR04_selected_workspace_target_binding_and_loop_drift_hardening.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR04_selected_workspace_target_binding_and_loop_drift_hardening.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR04_selected_workspace_target_binding_and_loop_drift_hardening.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Implementer Report Readiness Gate for Build-to-Review Transition",
    "status": "approved_for_implementation",
    "executionMode": "one bounded Work Card loop readiness repair",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "The Work Card loop resolver treats the existence of the application-created skeleton Implementer Report as evidence that Build is complete and routes directly to Review & Validation. The skeleton report is only a reserved report target and contains no Implementer evidence, so Review & Validation is exposed before the Implementer has completed the build/report pass.",
    "rootCause": "Formal Work Card approval automatically creates or registers an Implementer Report document. The Work Card loop resolver and building projection currently use report existence / reportMissing=false as the build-to-review gate. The generated skeleton report body states Pending Implementer completion and contains only headings/placeholders, but no readiness classification distinguishes missing/reserved/skeleton from completed Implementer evidence.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR05_implementer_report_readiness_gate_for_build_to_review_transition.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Add an application-owned Implementer Report readiness gate. Skeleton/reserved reports must keep the Work Card in Build Review and must not expose Review & Validation or Operator validation actions. Do not remove selected-workspace targeting or the Work Card loop resolver introduced by prior repairs.",
    "reviewedAt": "2026-08-04"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR05 — Implementer Report Readiness Gate for Build-to-Review Transition

Status: Approved for Implementer execution  
Parent: `WC46`  
Git mutation: prohibited

## Verified Repository Evidence

The current application workspace was verified through ChampCity MCP as `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. The working tree is dirty from the active WC46 repair series and no files are staged. No Git mutation is authorized.

Operator running-app evidence from 2026-08-04 shows the Work Card loop at:

```text
MVP-01-WC02
Loop step: Review & Validation
Work Card position: Review & Validation in phase
Displayed report: IMPLEMENTER_REPORT_MVP-01-WC02_monorepo_skeleton_and_boundary_enforcement
Report body: skeleton headings only, beginning with Repository Verification / Implementation Summary / Files Created / Files Modified / Acceptance Criteria Evidence
```

The Operator-confirmed failure sequence is:

```text
WC02 Formal Work Card was approved
→ application-created skeleton Implementer Report existed
→ Work Card loop marked Build complete
→ app routed directly to Review & Validation
→ Validate Passed / Request Repair controls were exposed against a skeleton report
```

Inspected production path:

```text
src/main/workCardPlanning/workCardPlanningService.ts
→ Formal Work Card approval / disposition
→ src/main/workCardBuilding/workCardBuildingReviewService.ts
→ buildApprovedFormalWorkCardAndReportDocuments(...)
→ buildImplementerReportDocument(...)
→ src/main/workCardLoop/workCardLoopAuthorityService.ts
→ activeLoopAuthorityForCandidate(...)
→ src/main/currentWorkflow/currentWorkflowService.ts
→ currentModelFromWorkCardLoopAuthority(...)
→ renderer Review & Validation workspace
```

Confirmed source facts:

1. `workCardBuildingReviewService.buildApprovedFormalWorkCardAndReportDocuments(...)` adds `buildImplementerReportDocument(...)` when the Formal Work Card is approved and no report currently exists.
2. `buildImplementerReportDocument(...)` creates an `implementer-report` canonical document with `documentDisposition.status = "Pending"` and placeholder workflow data: `repositoryVerification: "Pending Implementer verification."`, empty `filesChanged`, empty `validationResults`, empty `acceptanceEvidence`, empty `deviations`, empty `blockers`, and empty `remainingOperatorValidation`.
3. `implementerReportBody(...)` emits a skeleton body with `Status: Pending Implementer completion.` followed by empty section headings.
4. `getWorkCardBuildingReviewProjection(...)` currently computes `reportMissing: !report`, so the skeleton report makes `reportMissing` false.
5. `workCardLoopAuthorityService.activeLoopAuthorityForCandidate(...)` calls `getWorkCardBuildingReviewProjection(...)`; when `projection.reportMissing` is false, the resolver falls through to Review & Validation unless validation evidence says otherwise.
6. Therefore, report existence currently functions as the Build-complete gate.
7. The skeleton report is not Implementer evidence. It is a reserved target / scaffold for later Implementer completion.

## Confirmed Defect

The Work Card loop conflates **report target reservation** with **Implementer build completion**.

Current behavior:

```text
Approved Formal Work Card
→ application creates skeleton Implementer Report target
→ report file exists
→ reportMissing becomes false
→ resolver routes to work-card-report-review
→ Operator validation controls appear against skeleton report
```

Required behavior:

```text
Approved Formal Work Card
→ application may reserve/create skeleton Implementer Report target
→ skeleton report is classified as reserved/skeleton, not ready
→ Work Card remains in Build Review
→ Review & Validation is not active
→ Operator validation controls are unavailable
→ Implementer completes substantive report evidence
→ report is classified ready for review
→ resolver routes to work-card-report-review
```

## Root Cause

The new Work Card loop resolver correctly centralizes the Work Card segment, but its Build-to-Review transition still depends on the old binary report check:

```text
report exists? yes/no
```

That check is insufficient because the application itself creates a placeholder report as part of Formal Work Card approval. The resolver needs an application-owned readiness classification that distinguishes these states:

```text
missing
reserved/skeleton
ready-for-review
invalid/conflict
```

## Objective

Add an Implementer Report readiness gate so only a completed, substantive, current Implementer Report can transition the Work Card loop from Build Review to Review & Validation.

This repair is limited to the Work Card Build → Review & Validation transition and associated validation eligibility. It must preserve:

- the centralized Work Card loop resolver introduced by WC46-REPAIR03;
- selected-workspace Formal Work Card prompt targeting introduced by WC46-REPAIR04;
- automatic report-target reservation if still needed;
- normal completed-report Review & Validation behavior;
- Work Card Repair / Close / Next behavior after a valid report is reviewed.

## Runtime Sequence

### Existing authoritative evidence

```text
Approved Formal Work Card
Application-created Implementer Report target
Implementer Report metadata/body
Work Card loop authority projection
Current workspace model
Renderer workspace controls
```

### Authorized application action

```text
Operator approves Formal Work Card
Application creates or finds Implementer Report target
Application refreshes current workspace
```

### Required state transition

```text
Approved Formal Work Card + no report
→ work-card-building-review

Approved Formal Work Card + reserved/skeleton report
→ work-card-building-review

Approved Formal Work Card + invalid/conflicting report
→ work-card-building-review or needs-attention with blocker

Approved Formal Work Card + substantive ready report
→ work-card-report-review
```

### Operator-visible outcome

```text
Skeleton report is visible as a build/report target, but the loop remains Build.
Review & Validation is reached only after Implementer evidence is present.
Validate Passed / Request Repair are not available against the skeleton report.
```

## Required Changes

### 1. Add Implementer Report readiness classification

Introduce an application-owned readiness classifier in the Work Card building/report path. Preferred location:

```text
src/main/workCardBuilding/workCardBuildingReviewService.ts
```

The classifier may be exported for tests and resolver use. It must classify the expected Implementer Report for an approved Formal Work Card as one of:

```text
missing
reserved-skeleton
ready-for-review
invalid
conflict
```

A different name is acceptable if the semantics are equivalent and documented in the Implementer Report.

Minimum classification rules:

#### Missing

No document exists at the expected Implementer Report path.

#### Reserved / skeleton

A document exists at the expected path, but it is the application-created scaffold and does not contain substantive Implementer evidence. The current known skeleton markers include:

```text
metadata.workflowData.repositoryVerification = "Pending Implementer verification."
metadata.workflowData.filesChanged = []
metadata.workflowData.validationResults = []
metadata.workflowData.acceptanceEvidence = []
metadata.workflowData.implementationSummary = ""
body contains "Status: Pending Implementer completion."
body contains only the standard report headings without substantive evidence content
```

The classifier must not depend on exactly one marker if a safer combined check is available. It must be robust enough that trivial heading-only reports remain skeleton/reserved.

#### Ready for review

A report is ready for Review & Validation only when all are true:

- it is at the exact expected Implementer Report path;
- it is readable;
- it is fresh;
- artifact type is `implementer-report`;
- participation role remains `gatingReview`;
- phase ID and Work Card ID match the approved Formal Work Card;
- source revision points to the approved Formal Work Card path and revision;
- disposition is still reviewable by the Operator, normally `Pending`;
- it is not the reserved/skeleton report;
- it contains substantive Implementer evidence beyond the generated headings/placeholders.

Substantive evidence must be proven by application-owned checks, not by mere file existence. The exact check may use metadata workflowData, body Markdown section content, or both. At minimum, a report with empty implementation summary, empty files/validation/acceptance evidence, and the generated `Status: Pending Implementer completion.` line must not be ready.

#### Invalid / conflict

A report exists but fails identity, source revision, freshness, readability, or canonical metadata checks. A conflicting report for the same Work Card exists at a different path.

### 2. Update Build Review projection to expose readiness

Extend `WorkCardBuildingReviewProjection` and the shared contract as needed so the projection exposes report readiness. It should include a stable field equivalent to:

```text
reportReadiness: missing | reserved-skeleton | ready-for-review | invalid | conflict
reportReadinessReason: string
```

The existing `reportMissing` field may remain for compatibility, but it must no longer be the only build-to-review gate.

Build Review should remain the current workspace for both `missing` and `reserved-skeleton` states.

### 3. Update Work Card loop authority transition

Update `src/main/workCardLoop/workCardLoopAuthorityService.ts` so `activeLoopAuthorityForCandidate(...)` routes by readiness classification, not by `reportMissing` alone.

Required routing:

```text
reportReadiness = missing
→ work-card-building-review

reportReadiness = reserved-skeleton
→ work-card-building-review

reportReadiness = invalid/conflict
→ work-card-building-review or needs-attention with blocker/evidence

reportReadiness = ready-for-review
→ work-card-report-review
```

The resolver must continue to route a valid `RevisionRequested` validation record to repair and an Approved validation record to close. Do not break repair or close behavior for already-reviewed reports.

### 4. Block validation actions for non-ready reports

Ensure Operator validation cannot be applied to a missing, reserved/skeleton, invalid, or conflicting report.

This may be enforced in one or more of:

```text
src/main/workCardValidation/workCardValidationService.ts
src/main/workCardBuilding/workCardBuildingReviewService.ts
src/main/currentWorkflow/currentWorkflowService.ts
renderer validation workspace controls
```

The authoritative enforcement must be backend/main-process. Renderer disabling may supplement it but cannot be the only guard.

`Validate Passed` and `Request Repair` must require a ready-for-review Implementer Report.

### 5. Preserve skeleton report reservation behavior where useful

This repair does not require deleting the skeleton report creation behavior. It may remain useful as a reserved target and body scaffold.

However, a reserved/skeleton report must be clearly treated as Build-stage state. It must not imply:

- Implementer completed the build;
- report is ready for Review & Validation;
- Operator may validate;
- Work Card can be closed;
- downstream candidates may start.

### 6. Renderer behavior

If the renderer receives `work-card-building-review` with a reserved/skeleton report, it should show Build Review / Implementer Report target state, not Review & Validation.

The Review & Validation workspace must not appear for a skeleton report. Validation buttons must not be active for a skeleton report.

## Preserved Behavior

Preserve unchanged:

- Formal Work Card approval still approves the Formal Work Card;
- selected-workspace Formal Work Card prompt targeting from WC46-REPAIR04;
- Work Card loop authority resolver from WC46-REPAIR03;
- skeleton report target creation if the current application design still needs it;
- Implementer Report target path convention;
- valid completed Implementer Report routing to Review & Validation;
- `Request Repair` routing after a ready report is reviewed and receives RevisionRequested validation;
- `Validate Passed` routing after a ready report is reviewed and receives Approved validation;
- Close / Next behavior;
- Work Card Map statuses `Complete`, `Eligible`, `Ineligible`;
- all-complete routing to Phase Validation;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/main/workCardBuilding/workCardBuildingReviewService.ts
src/main/workCardLoop/workCardLoopAuthorityService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/workCardValidation/workCardValidationService.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/app/NestedWorkflowRail.tsx
```

Renderer files are authorized only as needed to display report readiness, keep the Operator on Build Review for skeleton reports, or disable/suppress validation controls for non-ready reports.

Tests authorized:

```text
test/work-card-building/work-card-building-review-service.test.cjs
test/work-card-loop/work-card-loop-authority-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-map-workspace.test.cjs
test/renderer/work-card-close-workspace.test.cjs
test/app-shell/app-shell.test.cjs
```

If no `test/work-card-building/` directory exists, create it for the readiness classifier tests.

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR05_implementer_report_readiness_gate_for_build_to_review_transition.md
```

Adjacent test helper changes under `test/` are allowed only if explained in the Implementer Report.

## Acceptance Criteria

1. An Implementer Report readiness classifier exists and is named in the Implementer Report.
2. The classifier distinguishes at least `missing`, `reserved/skeleton`, `ready-for-review`, and invalid/conflict states.
3. The application-created skeleton report is classified as reserved/skeleton, not ready-for-review.
4. After Formal Work Card approval creates a skeleton report, current workflow remains `work-card-building-review` for the active Work Card.
5. After Formal Work Card approval creates a skeleton report, the Work Card rail shows Build as current and Review & Validation is not current.
6. Review & Validation workspace is not activated for a skeleton report.
7. Backend validation actions reject missing and reserved/skeleton reports.
8. Renderer validation controls are unavailable or inaccessible for a skeleton report.
9. A substantive completed Implementer Report at the expected path transitions the active Work Card to `work-card-report-review`.
10. The ready-for-review report must be readable, fresh, identity-matching, source-revision-matching, and non-skeleton.
11. A report at the expected path with invalid identity/source/freshness/readability is not treated as ready.
12. Conflicting Implementer Report documents for the same Work Card remain blocked as conflict/needs-attention.
13. `Validate Passed` and `Request Repair` remain available for a ready-for-review report through the existing Operator validation process.
14. `Request Repair` after a ready report still routes to Work Card Repair with parent Work Card identity preserved.
15. `Validate Passed` after a ready report still routes to Work Card Close / Next.
16. Close / Next still returns to Work Card Map and recalculates candidate statuses.
17. WC46-REPAIR04 selected-workspace prompt targeting remains intact and generated prompts still do not contain project-specific wrong-target repository names.
18. No hidden selected-candidate state, route token, close acknowledgement, map sidecar, closeout document, validation mutation outside the existing validation process, or alternate persistence is created.
19. Typecheck, build, focused tests, and full test lane pass in the approved normal Windows environment.
20. No dependency is added.
21. No Git operation occurs.

## Negative Constraints

Do not:

- remove the Work Card loop authority resolver;
- route Build to Review based only on Implementer Report file existence;
- treat the skeleton report as completed Implementer evidence;
- enable Validate Passed or Request Repair against a skeleton report;
- require the Implementer Report to be Approved before Review & Validation if the existing review workflow expects Pending reports to be reviewed by the Operator;
- delete skeleton report creation unless the replacement still preserves the report target reservation and existing downstream target path behavior;
- alter selected-workspace prompt binding from WC46-REPAIR04;
- hard-code project-specific repository names into prompts;
- rewrite the global project/phase workflow resolver;
- change Work Card Map status labels;
- mutate validation records, Implementer Reports, phase closeouts, or project closeouts outside the authorized workflow;
- add dependencies;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR05_implementer_report_readiness_gate_for_build_to_review_transition.md
```

The report must include:

- repository path, branch, remote, and working status verification;
- all changed files;
- confirmation that no Git mutation occurred;
- exact readiness classifier path, exported names, and state names;
- exact skeleton detection criteria;
- exact ready-for-review criteria;
- proof that Formal Work Card approval plus skeleton report keeps the loop in Build Review;
- proof that Review & Validation and validation actions are blocked for skeleton reports;
- proof that a substantive completed report transitions to Review & Validation;
- proof that ready reports still support Validate Passed, Request Repair, Repair, Close / Next, and Work Card Map return;
- proof that selected-workspace prompt targeting remains intact from WC46-REPAIR04;
- proof that no hidden state or alternate persistence was created;
- commands run and results;
- validation skipped and reason;
- residual risks and Operator manual validation remaining.

End with:

```text
Document.Status=Pending
```

## Manual Validation

After Architect review of the Implementer Report, the Operator must validate in the running application:

1. Select an Eligible Work Card from Work Card Map.
2. Generate and approve the Formal Work Card.
3. Confirm the application-created skeleton Implementer Report does not move the loop to Review & Validation.
4. Confirm the current workspace remains Build Review.
5. Confirm Validate Passed and Request Repair are not available for the skeleton report.
6. Complete or load a substantive Implementer Report for that Work Card.
7. Refresh or continue and confirm the app moves to Review & Validation.
8. Validate Passed and confirm Close / Next is reached.
9. Return to Work Card Map and confirm candidate completion status recalculates correctly.
