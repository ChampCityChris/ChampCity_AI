<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR06",
    "repairId": "WC46-REPAIR06",
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
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR05_implementer_report_readiness_gate_for_build_to_review_transition.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Codex Report Canonical Refresh and Implement Workspace Label",
    "status": "approved_for_implementation",
    "executionMode": "one bounded Codex/report refresh and UI label repair",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "After WC46-REPAIR05, the app correctly returned WC02 to the Build workspace for the reserved Implementer Report, but a Codex Implementer run completed with report update evidence while the running app retained a canonical-read/readiness error: 'Canonical document contains a duplicate metadata block.' MCP inspection of the selected project report then showed the final report bytes were canonical and substantive, so the app did not reliably re-read the final report state and clear stale parse/readiness errors after Codex execution. The same UI also still labels the workspace as Build / Implementer Build instead of Implement.",
    "rootCause": "The Codex execution service records terminal completion and reportUpdated based primarily on SHA/revision changes and does not require a stable final canonical parse/readiness refresh before presenting the completed result. The existing Codex tests only append body text to a canonical report and do not cover duplicate-metadata intermediate writes, final canonical recovery, or clearing a prior readiness error. User-facing labels also still expose legacy Build wording.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR06_codex_report_canonical_refresh_and_implement_workspace_label.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Fix the Codex post-run report refresh path so final canonical report bytes control readiness and stale parse errors are cleared. Rename user-facing Work Card Build labels to Implement. Do not broaden the Work Card loop resolver or alter selected-workspace prompt binding.",
    "reviewedAt": "2026-08-05"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR06 — Codex Report Canonical Refresh and Implement Workspace Label

Status: Approved for Implementer execution  
Parent: `WC46`  
Git mutation: prohibited

## Confirmed Defect

Operator validation after WC46-REPAIR05 showed two issues:

1. The application correctly returned `MVP-01-WC02` to the Build workspace after Formal Work Card approval and skeleton report creation.
2. Running Codex Implementer completed and reported the Implementer Report as updated, but the UI retained these errors:

```text
Canonical document contains a duplicate metadata block.
Document could not be read as canonical Markdown.
Report readiness: invalid
```

MCP inspection of the selected `revisionary` workspace then read the same report successfully as canonical Markdown:

```text
planning/phases/MVP-01/Implementer_Reports/IMPLEMENTER_REPORT_MVP-01-WC02_monorepo_skeleton_and_boundary_enforcement.md
```

The final report is no longer skeleton-only. It contains substantive Implementer evidence and states that implementation is blocked because the environment has .NET SDK `8.0.421` while the approved Work Card requires the .NET 10 SDK family. Therefore the running app's duplicate-metadata/readiness error is not a reliable reflection of the final report bytes.

A separate UI wording defect remains: the Work Card execution workspace is displayed as `Build` / `Implementer Build`; the desired user-facing label is `Implement`.

## Root Cause

The current Codex execution path records terminal completion and report update evidence without first requiring a stable final canonical read and readiness refresh for the Implementer Report.

Inspected path:

```text
src/main/workCardBuilding/codexImplementerExecutionService.ts
→ executeWithSdk(...)
→ refreshReportEvidence(...)
→ getStatus(...)
→ resolveRetryReadiness(...)
→ getCurrentWorkspaceModel(...)
→ getWorkCardBuildingReviewProjection(...)
```

Confirmed source facts:

- `refreshReportEvidence(...)` sets `reportUpdated` from SHA/revision comparison.
- If parsing report metadata fails, it catches the error and falls back to the previous revision; it does not make final canonical readability the terminal report authority.
- Existing Codex tests append a line to the report body; they do not simulate duplicate metadata, an invalid intermediate write, final canonical recovery, or stale readiness error clearing.
- `planningDocumentService.listPlanningDocuments(...)` reads planning files from disk on each call, so the failure is in Codex/report status refresh behavior and UI state recovery, not an intentional durable document cache.

## Objective

After a Codex Implementer run, the application must use the final report bytes on disk as the authority for report readiness.

Required outcome:

```text
Codex run completes
→ app performs a stable final canonical read of the Implementer Report
→ if final bytes are canonical and substantive, stale duplicate-metadata/readiness errors are cleared
→ current workspace transitions according to current readiness
→ if final bytes remain invalid, app keeps the Work Card in Implement with the final parse error
```

Also rename user-facing Work Card Build labels to `Implement` without renaming internal workspace IDs unless strictly necessary.

## Runtime Sequence

### Successful final report recovery

```text
Reserved Implementer Report exists
→ Codex run starts
→ Codex may create an invalid intermediate write while editing
→ Codex finishes with a canonical substantive report
→ application performs final stable canonical read
→ reportReadiness becomes ready-for-review or valid blocked evidence
→ duplicate-metadata error is cleared
→ current workspace reflects the final report state
```

### Final invalid report

```text
Reserved Implementer Report exists
→ Codex run finishes
→ final file still contains duplicate metadata or other canonical parse error
→ application keeps the Work Card in Implement
→ reportReadiness remains invalid
→ validation controls remain unavailable
→ error message reflects the final report bytes, not a stale intermediate read
```

## Required Changes

### 1. Stabilize post-Codex report refresh

Update `src/main/workCardBuilding/codexImplementerExecutionService.ts` so Codex terminal status is based on a final stable read of the exact Implementer Report path.

The implementation must do all of the following:

- after streamed execution completes, re-read the exact Implementer Report path from disk;
- require a canonical parse attempt against the final report bytes before presenting a successful report update state;
- tolerate transient/intermediate invalid report bytes during the run;
- clear stale parse/readiness errors when a later final read is canonical;
- if the final report remains invalid after a bounded retry/stabilization window, keep the Work Card in Implement and surface that final parse error;
- do not auto-delete, strip, or silently repair duplicate metadata blocks;
- do not create sidecar files or alternate completion markers.

A small bounded retry/debounce loop is authorized for the final read only, to handle file-write stabilization after Codex exits. It must not become open-ended polling.

### 2. Make terminal Codex status match final report authority

A Codex run must not show a clean successful review-ready state based only on SHA change.

Required status behavior:

```text
Final report canonical + substantive evidence
→ terminal run may show completed / report updated
→ retry blocker and stale parse errors are cleared

Final report changed but not canonical
→ terminal run must expose failure or blocker text for the final canonical parse error
→ reportReadiness remains invalid
→ Review & Validation remains unavailable

Final report unchanged
→ keep existing incomplete behavior: Codex completed but report was not updated
```

If existing state enums make a separate `completed-with-invalid-report` state impractical, use the existing terminal state plus `failureReason` / `retryBlocker` consistently. The UI must not present the invalid final report as ready for Review & Validation.

### 3. Refresh current workspace/readiness after Codex completion

After Codex completion and final report refresh, the app must refresh the current workspace model from disk so the visible state matches the final report.

Required behavior:

- if final report is canonical and ready-for-review, the visible duplicate-metadata error disappears and the workflow can move to Review & Validation;
- if final report is canonical but records a legitimate implementation blocker, it is still a substantive report and should be reviewable under the existing readiness rules;
- if final report is invalid, the Implement workspace remains current and shows the final parse/readiness error.

### 4. Rename user-facing Build labels to Implement

Change user-facing Work Card execution labels only.

Required label behavior:

```text
Build → Implement
Implementer Build → Implement
Run Codex Implementer may remain as the action label
Review & Validation remains unchanged
```

Internal workspace IDs such as `work-card-building-review`, persisted artifact names, route names, and existing enum values may remain unchanged unless a narrow code change is necessary. Do not perform a broad rename.

## Preserved Behavior

Preserve unchanged:

- WC46-REPAIR05 readiness classifier and Build-to-Review gate;
- selected-workspace prompt targeting from WC46-REPAIR04;
- Work Card loop resolver from WC46-REPAIR03;
- skeleton/reserved Implementer Report target behavior;
- ready-for-review routing to Review & Validation;
- validation controls blocked for missing/skeleton/invalid reports;
- Codex run authorization and cancellation behavior;
- exact Implementer Report path authority;
- no hidden state, route token, sidecar, or alternate report;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/main/workCardBuilding/workCardBuildingReviewService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/shared/workspaceContracts.ts
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/app/App.tsx
```

`workCardBuildingReviewService.ts`, `currentWorkflowService.ts`, `workspaceContracts.ts`, and `App.tsx` may be changed only if needed to carry final report canonical/readiness status or refresh the displayed current workspace.

Tests authorized:

```text
test/work-card-building/codex-implementer-execution-service.test.cjs
test/work-card-building/work-card-building-review-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/renderer/project-rail-presentation.test.cjs
test/app-shell/app-shell.test.cjs
```

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR06_codex_report_canonical_refresh_and_implement_workspace_label.md
```

## Acceptance Criteria

1. After Codex completion, the app performs a final canonical read of the exact Implementer Report path.
2. A transient duplicate-metadata/intermediate invalid report write does not leave a stale error if the final report is canonical.
3. A final canonical substantive report clears the duplicate-metadata/readiness error and is classified by the existing readiness rules.
4. A final canonical report that records an implementation blocker remains reviewable as substantive Implementer evidence when it satisfies readiness criteria.
5. A final invalid duplicate-metadata report remains blocked in Implement and does not route to Review & Validation.
6. A final invalid report surfaces the final parse/readiness error; it must not show a misleading clean success state.
7. A Codex run that does not update the report still reports that the Implementer Report was not updated.
8. No automatic metadata stripping, report repair, alternate report, sidecar, or completion marker is introduced.
9. The current workspace/readiness view refreshes after Codex completion so stale parse errors are cleared when final bytes are canonical.
10. User-facing Work Card loop labels display `Implement` instead of `Build` / `Implementer Build` where the workspace is shown to the Operator.
11. Internal route/workspace identifiers remain compatible unless narrowly required otherwise.
12. WC46-REPAIR05 behavior remains intact: skeleton reports stay in Implement and validation controls remain unavailable.
13. Ready reports still route to Review & Validation.
14. Selected-workspace prompt targeting remains intact.
15. Typecheck, build, focused tests, and full test lane pass in the approved normal Windows environment.
16. No dependency is added.
17. No Git operation occurs.

## Negative Constraints

Do not:

- rewrite the Work Card loop resolver;
- reopen the Implementer Report readiness classification except as needed for final refresh integration;
- treat SHA change alone as completed report readiness;
- auto-delete or strip duplicate metadata blocks from report files;
- add hidden selected-candidate state, route tokens, sidecars, or completion marker files;
- create alternate Implementer Reports;
- change selected-workspace prompt targeting;
- rename internal workspace IDs broadly;
- route invalid reports to Review & Validation;
- enable validation controls for missing/skeleton/invalid reports;
- add dependencies;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR06_codex_report_canonical_refresh_and_implement_workspace_label.md
```

The report must include:

- repository path, branch, remote, and working status verification;
- all changed files;
- confirmation that no Git mutation occurred;
- exact post-Codex final-read/stabilization design;
- proof that final canonical report bytes clear stale duplicate-metadata/readiness errors;
- proof that final invalid duplicate-metadata bytes remain blocked and do not route to Review & Validation;
- proof that unchanged report behavior remains incomplete;
- proof that WC46-REPAIR05 skeleton/readiness behavior remains intact;
- proof that ready reports still route to Review & Validation;
- proof that user-facing workspace labels now say `Implement`;
- commands run and results;
- validation skipped and reason;
- residual risks and Operator manual validation remaining.

End with:

```text
Document.Status=Pending
```

## Manual Validation

After Architect review, the Operator must validate in the running app:

1. Open the WC02 Implement workspace.
2. Confirm the page/rail uses `Implement` instead of `Build` / `Implementer Build`.
3. Run Codex Implementer.
4. Confirm that if the final report is canonical, stale `duplicate metadata block` errors clear after completion/refresh.
5. Confirm a canonical substantive blocked report can move to Review & Validation.
6. Confirm an invalid final report remains in Implement and does not enable validation controls.
