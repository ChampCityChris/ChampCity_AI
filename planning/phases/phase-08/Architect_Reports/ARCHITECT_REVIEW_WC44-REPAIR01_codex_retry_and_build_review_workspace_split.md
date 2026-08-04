<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC44-REPAIR01",
    "repairId": "WC44-REPAIR01",
    "parentWorkCardId": "WC44"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44-REPAIR01_codex_retry_and_build_review_workspace_split.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR01_codex_retry_and_build_review_workspace_split.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC44-REPAIR01 Codex Retry and Build Review Workspace Split",
    "reviewResult": "Approved",
    "blockingDefects": 0,
    "operatorValidationRequired": true
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "WC44-REPAIR01 satisfies the required retry-state repair and separates Codex build execution from Implementer Report review. Approved for Operator validation. Real pane readability and real Codex cancellation remain manual validation items.",
    "reviewedAt": "2026-08-03"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC44-REPAIR01 Codex Retry and Build Review Workspace Split

Disposition: `Approved for Operator validation`  
Git mutation: none

## Review Boundary

ChampCity MCP was used to inspect:

- `planning/phases/phase-08/Work_Cards/WC44-REPAIR01_codex_retry_and_build_review_workspace_split.md` revision 1;
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR01_codex_retry_and_build_review_workspace_split.md` revision 1;
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`;
- `src/main/currentWorkflow/currentWorkflowService.ts`;
- `src/shared/workspaceContracts.ts`;
- `src/shared/workspaces/documentWorkspace.ts`;
- `src/shared/documents/lifecycleArtifact.ts`;
- `src/renderer/app/App.tsx`;
- `src/renderer/app/NestedWorkflowRail.tsx`;
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`;
- `src/renderer/app/WorkCardReportReviewWorkspace.tsx`;
- `src/renderer/styles.css`;
- focused service, workflow, renderer, rail, and source-wiring tests;
- repository status.

`WC44-REPORT01` was not found in the repository. The available completed repair report is `WC44-REPAIR01`, and this review covers that artifact.

This review did not run local commands, launch Electron, or execute Codex. The MCP does not expose a confirmed command-execution lane. Implementer-reported command results are treated as reported evidence and source/test content was independently inspected.

## Accepted Findings

### 1. Retry-state defect repaired

The Codex execution model now separates active execution state from retry readiness using the added fields:

```text
lastRunState
canRunAgain
retryBlocker
```

The service preserves terminal evidence for completed, failed, and cancelled runs. It recomputes retry readiness from current repository evidence and SDK availability after terminal states. The renderer enables `Run Codex Implementer` based on `canRunAgain`, not solely on `state === "ready"`.

The implementation preserves the one-running-execution rule. While a run is active, `canRunAgain=false` and the retry blocker states that Codex execution is already running.

### 2. SDK/auth/report boundaries preserved

The repair does not alter the accepted WC44 boundaries:

- SDK-primary integration remains in place.
- The renderer still cannot provide project root, command, arguments, prompt, Work Card ID, report path, or Codex configuration.
- No raw CLI primary path was added.
- No WebSocket app-server path was added.
- No API-key path was added.
- Codex credentials and `CODEX_HOME` remain outside ChampCity ownership.
- Codex state does not approve reports, create validation records, create repair cards, or advance lifecycle.

### 3. Build and Report Review split implemented

The visible workflow is now split as required:

```text
work-card-building-review = Implementer Build / Codex execution
work-card-report-review = Implementer Report Review
work-card-repair = Repair
```

`work-card-report-review` is registered at Work Card / Building order 15, between Build order 10 and Repair order 20.

Implementer Report documents are classified to `work-card-report-review`, while pending reports continue to make the current workflow default to the Build execution step.

### 4. Build workspace is no longer the report-review surface

`WorkCardBuildingReviewWorkspace` now presents:

- Approved Work Card path and revision;
- Implementer Report target and revision;
- last Codex run summary;
- run/cancel controls;
- right-side Codex execution console with event, error, and final-response tails.

It no longer renders report disposition selector, review notes, Apply Review, generic empty document list, `Select a document`, or `Document workflow not yet implemented`.

### 5. Report Review workspace owns disposition

`WorkCardReportReviewWorkspace` presents the Approved Work Card as read-only reference and the Implementer Report as the review target. It exposes exactly two document choices:

```text
Approved Work Card
Implementer Report
```

Disposition controls are shown only when the current fresh Implementer Report is selected. The App routes report disposition through the existing current-workflow disposition route with `work-card-report-review` as the explicit target.

### 6. Downstream lifecycle authority preserved

Approved Implementer Report still enables Work Card Validation. RevisionRequested Implementer Report still drives pre-validation Repair. Codex execution state does not create a validation record, repair card, or disposition.

## Validation Evidence Reviewed

The Implementer Report states these validation results:

- `npm run typecheck`: passed in sandbox.
- `npm run build`: sandbox failed with documented Vite/esbuild `spawn EPERM`; normal Windows lane passed.
- Focused Node lane: sandbox failed with documented `spawn EPERM`; normal Windows lane passed, 54 tests.
- `npm test`: passed in normal Windows lane, 241 tests.

Source/test review confirmed coverage for:

- cancelled run can expose retry readiness;
- failed SDK/auth-like run maps to the approved authentication message and preserves retry evidence;
- completed/no-report-update run exposes retry readiness;
- second launch while running remains blocked;
- cancellation only aborts the tracked SDK signal;
- pending reports default current workflow to Build;
- report disposition is blocked from Build and allowed through Report Review;
- report classification to `work-card-report-review`;
- rail registration and order for Build, Report Review, Repair;
- Build and Report Review renderer source separation.

## Residual Manual Validation

Operator validation is still required for the running application. In particular, automated/source validation does not prove actual desktop readability of the two-pane Codex console or real local Codex cancellation behavior.

Operator must validate:

1. Build opens with Codex execution console in the right pane and the console is readable at normal desktop width.
2. A real Codex run can be started from the Build workspace.
3. A real Codex run can be cancelled without affecting unrelated processes.
4. Cancellation evidence remains visible and `Run Codex Implementer` becomes available again without app restart when preflight is valid.
5. Report Review is a separate workspace.
6. Only the Implementer Report can be dispositioned in Report Review.
7. Approved and RevisionRequested report outcomes expose only the authorized next workflow.

## Disposition

Approved for Operator validation.

No blocking implementation defect was found in the reviewed source and report evidence. No Git operation was performed.
