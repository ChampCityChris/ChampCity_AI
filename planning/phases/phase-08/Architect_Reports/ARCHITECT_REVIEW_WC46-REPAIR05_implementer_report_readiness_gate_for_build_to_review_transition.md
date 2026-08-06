<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
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
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR05_implementer_report_readiness_gate_for_build_to_review_transition.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR05_implementer_report_readiness_gate_for_build_to_review_transition.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review - WC46-REPAIR05 Implementer Report Readiness Gate for Build-to-Review Transition",
    "status": "RevisionRequested",
    "reviewedWorkCard": "WC46-REPAIR05",
    "reviewedReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR05_implementer_report_readiness_gate_for_build_to_review_transition.md",
    "gitMutationPerformed": false
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "Implementation adds the readiness classifier and fixes the normal skeleton-to-Build path, but resolver and close logic can still honor existing validation evidence for a reserved/skeleton report before enforcing readiness. That leaves the same class of defect reachable if the prior bug already created validation evidence against a skeleton report.",
    "reviewedAt": "2026-08-05"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC46-REPAIR05 Implementer Report Readiness Gate for Build-to-Review Transition

Document.Status=RevisionRequested

## Review Scope

Reviewed Work Card:

```text
planning/phases/phase-08/Work_Cards/WC46-REPAIR05_implementer_report_readiness_gate_for_build_to_review_transition.md
```

Reviewed Implementer Report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR05_implementer_report_readiness_gate_for_build_to_review_transition.md
```

Repository/workspace inspection was performed through ChampCity MCP against workspace `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. The working tree was dirty from the active WC46 repair series. No files were staged. No Git mutation was performed by this review.

I did not rerun local commands. Implementer-reported command results are treated as reported evidence only.

## Files Inspected

Production path inspected:

```text
src/main/workCardBuilding/workCardBuildingReviewService.ts
src/main/workCardLoop/workCardLoopAuthorityService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/workCardValidation/workCardValidationService.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/shared/workspaceContracts.ts
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
src/renderer/app/WorkCardReportReviewWorkspace.tsx
```

Test path inspected:

```text
test/work-card-building/work-card-building-review-service.test.cjs
test/work-card-validation/work-card-validation-service.test.cjs
test/workflow/current-execution-context.test.cjs
```

## Positive Findings

WC46-REPAIR05 implements the central concept correctly for the normal path.

`src/main/workCardBuilding/workCardBuildingReviewService.ts` now defines an Implementer Report readiness model with these states:

```text
missing
reserved-skeleton
ready-for-review
invalid
conflict
```

The added classifier is exposed through:

```text
classifyExpectedImplementerReportReadiness(...)
requireReadyImplementerReportForReview(...)
```

`getWorkCardBuildingReviewProjection(...)` now exposes:

```text
reportReadiness
reportReadinessReason
```

The skeleton report created by `buildImplementerReportDocument(...)` is no longer treated as ready merely because the report file exists. The classifier identifies the generated scaffold using combined metadata and body evidence, including `repositoryVerification = "Pending Implementer verification."`, empty evidence arrays, empty implementation summary, and the body marker `Status: Pending Implementer completion.`.

`src/main/workCardLoop/workCardLoopAuthorityService.ts` now routes `missing` and `reserved-skeleton` reports to `work-card-building-review`, and routes `ready-for-review` to `work-card-report-review`. That fixes the Operator-observed happy-path defect where Formal Work Card approval created a skeleton report and the application immediately jumped to Review & Validation.

`src/main/workCardValidation/workCardValidationService.ts` now calls `requireReadyImplementerReportForReview(...)` through advisory prompt generation and Operator validation decision paths. This provides main-process enforcement rather than relying only on renderer button state.

The renderer surfaces were also updated so Build Review displays report readiness and Review & Validation controls are gated on `reportReadiness === "ready-for-review"`.

Focused tests now cover the normal path:

```text
Formal Work Card Approved
→ skeleton Implementer Report exists
→ current workspace remains work-card-building-review
→ Operator validation decision is blocked because current workspace is not Review & Validation
→ substantive report is supplied
→ current workspace becomes work-card-report-review
→ Operator validation can create the validation authority
```

## Blocking Finding

### BF-01 — Existing validation evidence can still close or repair a reserved/skeleton report before readiness is enforced

The implementation still checks validation evidence before checking Implementer Report readiness in the central Work Card loop resolver.

In `src/main/workCardLoop/workCardLoopAuthorityService.ts`, `activeLoopAuthorityForCandidate(...)` does this sequence after resolving the Build Review projection:

```text
const report = documents.find((document) => document.markdownPath === projection.implementerReportPath)
const validation = report ? validationRecordForReportRevision(...) : undefined

if validation is RevisionRequested
→ route to work-card-repair

if validation is Approved
→ route to work-card-close

if projection.reportReadiness !== "ready-for-review"
→ route to work-card-building-review
```

That ordering leaves a real gap. A reserved/skeleton report with existing Approved or RevisionRequested validation evidence will be routed to Close or Repair before the readiness gate is applied.

This matters because WC46-REPAIR05 was created precisely after the previous application state exposed Review & Validation controls against a skeleton report. The prior defect could already have allowed a validation record to be created against a skeleton report. The repair must not continue to honor that invalid validation evidence as if it came from a ready Implementer Report.

Required correction:

```text
If reportReadiness is missing, reserved-skeleton, invalid, or conflict
→ do not honor validation records for that report revision
→ route to Build Review or needs-attention according to readiness
→ surface blocker/evidence when an invalid validation record exists against a non-ready report

Only when reportReadiness is ready-for-review
→ consider Approved / RevisionRequested validation records for Close or Repair routing
```

This is not a hypothetical governance concern. It is the same failure class produced by the live application before WC46-REPAIR05. The current implementation blocks future validation actions through the main-process decision path, but it does not neutralize validation evidence that may already exist for the skeleton report revision.

## Acceptance Criteria Assessment

| AC | Result | Assessment |
|---|---:|---|
| 1 | Pass | Readiness classifier exists in `workCardBuildingReviewService.ts`. |
| 2 | Pass | Classifier exposes missing, reserved-skeleton, ready-for-review, invalid, and conflict. |
| 3 | Pass | Generated skeleton is classified as reserved-skeleton. |
| 4 | Pass for normal path | Formal Work Card approval plus skeleton keeps current workflow in Build Review when no validation evidence exists. |
| 5 | Pass for normal path | Workflow tests show Build remains current for skeleton. |
| 6 | Pass for normal path | Review & Validation is not activated for a skeleton when no validation record exists. |
| 7 | Partial | Backend validation actions reject skeleton reports prospectively, but existing validation evidence against a skeleton can still drive close/repair routing. |
| 8 | Pass | Renderer controls are gated on `reportReadiness === "ready-for-review"`. |
| 9 | Pass | Substantive report transitions to Review & Validation. |
| 10 | Pass | Ready report criteria include readable/fresh/identity/source/non-skeleton checks. |
| 11 | Pass | Invalid report evidence is not treated as ready. |
| 12 | Pass | Conflicting reports are classified as conflict. |
| 13 | Pass prospectively | Ready reports still support Validate Passed and Request Repair. |
| 14 | Pass prospectively | Request Repair routing is preserved after ready report review. |
| 15 | Pass prospectively | Validate Passed routes to Close / Next after ready report review. |
| 16 | Pass | Close / Next return behavior remains covered. |
| 17 | Pass | Selected-workspace prompt targeting from WC46-REPAIR04 was not reopened. |
| 18 | Pass | No hidden state or alternate persistence was identified. |
| 19 | Reported Pass | Implementer reports typecheck/build/focused/full test pass; not rerun by Architect. |
| 20 | Pass | No dependency addition observed. |
| 21 | Pass | No Git operation reported or performed by this review. |

## Scope Notes

The Implementer modified these files that were not explicitly listed in the Work Card production surface:

```text
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
src/renderer/app/WorkCardReportReviewWorkspace.tsx
```

The renderer changes are relevant to displaying readiness and disabling validation controls, so they are treated as explainable adjacent implementation. `codexImplementerExecutionService.ts` is also relevant to the Build workspace because Codex preflight depends on Implementer Report target/readiness behavior. This review does not mark those as blocking, but the Implementer Report should have called out the `codexImplementerExecutionService.ts` change as a bounded adjacent correction.

## Required Repair

Revise WC46-REPAIR05 implementation so readiness is evaluated before validation routing in the Work Card loop authority.

Required behavior:

```text
Approved Formal Work Card + skeleton Implementer Report + no validation
→ work-card-building-review

Approved Formal Work Card + skeleton Implementer Report + Approved validation record
→ work-card-building-review or needs-attention
→ do not route to work-card-close

Approved Formal Work Card + skeleton Implementer Report + RevisionRequested validation record
→ work-card-building-review or needs-attention
→ do not route to work-card-repair

Approved Formal Work Card + ready-for-review report + Approved validation record
→ work-card-close

Approved Formal Work Card + ready-for-review report + RevisionRequested validation record
→ work-card-repair
```

Add focused tests proving skeleton + stale/invalid validation evidence cannot close or repair the Work Card. The test should simulate a validation record whose source revisions point to the skeleton report revision.

## Disposition

`RevisionRequested`.

The normal skeleton-to-Build correction is implemented, but readiness is still not the first gate before validation routing. The Work Card loop can still honor invalid validation evidence for a reserved/skeleton report. Operator validation should not proceed until this is repaired.
