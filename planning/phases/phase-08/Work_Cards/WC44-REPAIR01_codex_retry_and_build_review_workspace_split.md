<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
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
      "path": "planning/phases/phase-08/Work_Cards/WC44_local_codex_cli_implementer_execution.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44_local_codex_cli_implementer_execution.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC44_local_codex_cli_implementer_execution.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Codex Retry and Build Review Workspace Split",
    "status": "approved_for_implementation",
    "executionMode": "one bounded retry-state and workspace-presentation repair",
    "parentWorkCardId": "WC44",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR01_codex_retry_and_build_review_workspace_split.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Repair WC44 by adding a retry-capable terminal Codex state and splitting Build execution from Implementer Report review. Codex execution must become the right-pane build console; report disposition must move to a dedicated review workspace.",
    "reviewedAt": "2026-08-03"
  }
}
CHAMPCITY-METADATA -->

# WC44-REPAIR01 — Codex Retry and Build Review Workspace Split

Status: Approved for Implementer execution  
Parent: `WC44`  
Git mutation: prohibited

## Verified Repository Evidence

The complete current production path was inspected:

```text
Approved Formal Work Card
→ canonical Pending Implementer Report
→ work-card-building-review
→ WorkCardBuildingReviewWorkspace
→ Codex SDK execution status/start/cancel
→ report refresh
→ report disposition
→ Work Card Validation or Repair
```

The inspected surface includes the WC44 card revision 2, WC44 Implementer Report, Architect review, Codex SDK execution service, Work Card Building service, current workflow, workspace definitions, IPC and preload exposure, shared contracts, renderer workspace, CSS, document classification, downstream validation and repair behavior, and focused tests.

Confirmed accepted WC44 behavior:

- `@openai/codex-sdk` is installed and used as the primary production integration.
- The renderer exposes only status, start, and cancel.
- Start derives project root, Work Card identity, Work Card SHA-256, report identity, and report SHA-256 from main-process repository evidence.
- The renderer cannot provide commands, project roots, arguments, prompts, Work Card IDs, report paths, or config overrides.
- Codex credentials, OpenAI API keys, and `CODEX_HOME` are not requested, stored, parsed, displayed, or injected.
- The existing Pending Implementer Report remains the review target.
- Codex execution state does not approve the report, create a Validation Record, create a Repair Work Card, or advance workflow.

Confirmed defects:

1. After a terminal Codex state, the service keeps returning the terminal session instead of exposing retry readiness from current repository evidence. The renderer enables `Run Codex Implementer` only for `state === "ready"`, so a failed, cancelled, completed-no-report-update, or completed run can leave the Operator unable to run Codex again without app restart.
2. Operator visual validation shows the Codex CLI/SDK execution panel is presented as a stacked afterthought inside the same vertical review surface. The event tail and final response tail are squeezed into the document-review page instead of occupying the right pane like other interactive workspaces.
3. The current Build / Review workspace combines three separate jobs: Approved Work Card instruction, Codex execution console, and Architect review of the Implementer Report. This creates a cramped workspace and exposes report-review controls in the same surface that should be focused on implementation execution.

Architect decision for this repair:

- Keep `work-card-building-review` as the Work Card Build / Codex execution workspace.
- Add a second visible workspace for Architect review of the Implementer Report: `work-card-report-review`.
- The Build workspace owns launching and monitoring Codex. The Report Review workspace owns disposition of the Implementer Report.
- The same canonical Implementer Report remains the only durable review target.

## Objective

Repair WC44 so local Codex execution is retry-capable and visually first-class.

The Build workspace must become a two-pane execution workspace:

```text
left pane: Approved Work Card instruction, report target, run controls, last-run summary
right pane: Codex execution console with event/error/final-response tails
```

The Implementer Report review must move to its own dedicated workspace using the same report authority and downstream disposition semantics.

## Runtime Sequence

### Build execution path

```text
Approved Formal Work Card and fresh Pending Implementer Report
→ work-card-building-review opens as Build / Codex Execution
→ Operator selects Run Codex Implementer
→ SDK run starts against selected project root
→ right pane streams bounded Codex execution evidence
→ run completes, fails, or is cancelled
→ application refreshes current repository evidence
→ last-run evidence remains visible
→ Run Codex Implementer is available again when preflight is valid and no run is active
→ Operator may rerun Codex or proceed to report review
```

### Report review path

```text
Pending Implementer Report exists
→ Operator opens work-card-report-review
→ workspace displays Approved Work Card as read-only reference and Implementer Report as disposition target
→ Architect reviews repository-backed report and changed work evidence
→ Approved report enables Work Card Validation
→ RevisionRequested report enables pre-validation Repair
```

No Codex terminal state may itself advance the workflow.

## Required Changes

### 1. Terminal state retry readiness

Modify the Codex execution model so terminal run evidence and current retry readiness are represented separately.

Add fields or equivalent model shape:

```text
lastRunState: completed | failed | cancelled | null
canRunAgain: boolean
retryBlocker: string | null
```

Rules:

- `state=running` means one active SDK execution exists and `canRunAgain=false`.
- After completed, failed, or cancelled execution, preserve the terminal evidence in the model.
- Recompute `canRunAgain` from current repository evidence: current workspace, readable Approved Formal Work Card, fresh Pending Implementer Report, no active run, and SDK/runtime availability.
- `Run Codex Implementer` must be enabled when `canRunAgain=true`, even when the last run state was failed, cancelled, completed, or completed without report update.
- The last terminal message must remain visible until a new run starts or the workspace context changes.
- Starting a retry replaces the prior last-run evidence only after the new run starts.
- A second launch while `state=running` remains rejected.

Do not discard terminal evidence immediately. Do not require app restart or workspace switching to retry.

### 2. Auth/runtime retry behavior

When SDK runtime or authentication is unavailable:

- preserve the targeted error message;
- expose the current report and Work Card context;
- after the Operator fixes local Codex auth outside ChampCity and refreshes/status polls, `canRunAgain` must become true without app restart when all preflight checks pass.

Add direct automated proof for auth-like SDK failure mapping to the approved local-authentication message.

### 3. Split visible Work Card Building surfaces

Add one visible workspace definition:

```text
id: work-card-report-review
label: Implementer Report Review
location: { level: "workCard", stage: "building" }
order: 15
```

Preserve existing `work-card-building-review` ID, but treat it as the Build / Codex Execution workspace. Its visible label may be changed to:

```text
Implementer Build
```

The existing `work-card-repair` remains order 20.

Update the nested Work Card loop so the Building segment exposes:

```text
Build
Report Review
Repair
```

Do not create another lifecycle level. Both Build and Report Review belong to Work Card / Building.

### 4. Current workflow and document ownership

The current workflow must resolve these states:

- Approved Work Card and missing report: `work-card-building-review` with `Create Implementer Report` recovery.
- Pending report and no approved/rejected/revision disposition: `work-card-building-review` remains the build execution step by default.
- `work-card-report-review` is available as a visible workspace while a current Pending, RevisionRequested, Rejected, or Approved report exists.
- The Implementer Report document is classified to `work-card-report-review` for review selection and disposition.
- Downstream validation eligibility continues to depend on a fresh Approved Implementer Report, not on Codex execution state.
- Repair creation continues to depend on a RevisionRequested Implementer Report.

A direct rail click into `work-card-report-review` must resolve the same current Work Card and report projection. It must not create reports, start Codex, or mutate state.

### 5. Build workspace two-pane layout

Replace the current stacked Codex panel with a dedicated two-pane Build workspace.

Layout:

```text
left:  build context and controls — Approved Work Card path/revision, report path/revision, status, Run/Cancel, last-run summary
right: Codex execution console — event tail, error tail, final response tail, report-updated indicator
```

Use the same shared dual-pane proportions and responsive behavior already used by embedded Architect workspaces. Do not create a one-off cramped layout.

The right pane must remain visible and readable during running and terminal states. It must not be buried below the report review controls.

The Build workspace must not render:

- report disposition selector;
- report review notes;
- Apply Review;
- generic empty document list;
- `Select a document` placeholder;
- `Document workflow not yet implemented`.

### 6. Report Review workspace

Create a dedicated report-review renderer surface.

It must show:

- Approved Work Card path and revision as read-only reference;
- Implementer Report path, revision, disposition, freshness, and read status;
- document selector with exactly `Approved Work Card` and `Implementer Report`;
- report selected by default;
- report disposition controls only when the current fresh Implementer Report is selected;
- review notes and `Apply Review` targeting only the report.

It must not show Codex run controls or execution tails.

The implementation may use a shared review component if that keeps Operator Validation and Implementer Report Review consistent, but this card only authorizes the Work Card report-review behavior. Do not redesign Operator Validation unless a tiny shared component extraction is necessary and fully tested.

### 7. IPC/preload preservation

Do not add new IPC or preload methods for the workspace split unless strictly necessary.

The existing Codex APIs remain:

```text
getCodexImplementerExecutionStatus
startCodexImplementerExecution
cancelCodexImplementerExecution
```

The existing current workflow disposition route may continue to review the Implementer Report, but it must target `work-card-report-review`, not the Build execution surface.

Renderer-supplied command, prompt, path, report, or Work Card identity remains prohibited.

## Preserved Behavior

Preserve unchanged:

- SDK-primary Codex integration;
- local Codex authentication boundary;
- no API-key path;
- no raw `codex exec` primary path;
- no WebSocket app-server path;
- no arbitrary command runner;
- Approved Formal Work Card remains the sole implementation authority;
- existing Pending Implementer Report remains the sole review target;
- report disposition controls validation and repair progression;
- no Validation Record before Operator validation;
- report registration and recovery behavior from WC43-REPAIR03;
- no Git mutation by ChampCity A/I.

## Authorized Surface

```text
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/main/workCardBuilding/workCardBuildingReviewService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/shared/workspaceContracts.ts
src/shared/workspaces/documentWorkspace.ts
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/app/App.tsx
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
src/renderer/app/WorkCardReportReviewWorkspace.tsx
src/renderer/styles.css
test/work-card-building/codex-implementer-execution-service.test.cjs
test/work-card-building/work-card-building-review-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-building-review-workspace.test.cjs
test/renderer/work-card-report-review-workspace.test.cjs
test/renderer/project-rail-presentation.test.cjs
test/renderer/document-review-surface-source.test.cjs
test/repository/runtime-wiring-source.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR01_codex_retry_and_build_review_workspace_split.md
```

A small shared renderer component may be extracted only when it directly avoids duplicating report review markup and is covered by focused tests.

No package dependency is authorized.

## Risks and Constraints

The repair must not make the application approve work based on Codex output. The human review of the Implementer Report remains the gate.

The split introduces another visible workspace, so navigation and current workflow behavior must be explicit. Do not hide state transitions behind automatic navigation that surprises the Operator.

A terminal Codex run may have changed repository files before failure or cancellation. The application must preserve that fact and refresh evidence. It must not roll back, clean, stash, or hide those changes.

## Acceptance Criteria

1. After a cancelled Codex run, the UI preserves the cancellation evidence and enables `Run Codex Implementer` again when current preflight conditions pass.
2. After a failed SDK/auth/runtime run, the UI preserves the failure evidence and enables retry after current preflight conditions pass.
3. After a completed run that does not update the report, the UI shows the no-report-update message and enables retry while the report remains Pending and fresh.
4. A second launch while a run is active remains rejected.
5. Cancellation still affects only the tracked active SDK execution.
6. Auth-like SDK failure maps to the approved local-authentication message and does not mutate report disposition.
7. Build workspace renders as a two-pane layout with Codex execution console in the right pane and build context/actions in the left pane.
8. Build workspace does not render report disposition controls, review notes, Apply Review, generic empty document list, or placeholder document text.
9. `work-card-report-review` exists in the visible workspace registry at Work Card / Building order 15 and appears in the Work Card loop between Build and Repair.
10. Implementer Report documents classify to `work-card-report-review` for review selection.
11. Report Review workspace defaults to the Implementer Report and exposes exactly two document choices: Approved Work Card and Implementer Report.
12. Report Review workspace applies disposition only to the current fresh Implementer Report.
13. Approved report continues to enable Work Card Validation; RevisionRequested report continues to enable Repair.
14. Codex execution state does not create a Validation Record, Repair Work Card, report disposition, or workflow advancement.
15. Positive and negative proof exercises the real service model, current-workflow projection, rail presentation, renderer build surface, renderer report-review surface, retry logic, and downstream eligibility. Source-string tests may support wiring but cannot be the primary proof.
16. Typecheck, TypeScript build, Vite build, focused tests, and complete Node test lane pass in the approved normal Windows environment.
17. No Git operation occurs.

## Negative Constraints

Do not:

- add a new Codex dependency;
- change the SDK-primary integration;
- add raw CLI primary execution;
- add WebSocket app-server transport;
- add arbitrary command input;
- let the renderer supply project root, command, arguments, prompt, Work Card ID, or report path;
- persist Codex tails as planning artifacts;
- approve or reject reports based on Codex state;
- create a Validation Record from Codex state;
- create a Repair Work Card from Codex state;
- move report review back into the Build execution surface;
- change unrelated workspaces;
- perform Git operations.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/
IMPLEMENTER_REPORT_WC44-REPAIR01_codex_retry_and_build_review_workspace_split.md
```

Implementation is incomplete until that report exists.

The report must map every acceptance criterion to concrete proof and include:

- all changed files;
- exact retry-state model changes;
- preflight recomputation evidence;
- terminal-run retry evidence for cancelled, failed, and completed-no-update states;
- auth-failure mapping proof;
- two-pane Build workspace rendered evidence;
- report-review workspace rendered evidence;
- rail/workspace classification evidence;
- downstream validation and repair eligibility evidence;
- validation commands and results;
- any adjacent shared component extraction and why it was necessary;
- Operator validation remaining;
- residual risks;
- confirmation that SDK/auth/report/disposition/Git boundaries remain unchanged.

## Manual Validation

After Architect approval, the Operator must validate in the running app:

1. Open Build for a Work Card with a Pending Implementer Report.
2. Confirm the Codex console occupies the right pane and is readable at normal desktop width.
3. Run Codex and cancel it.
4. Confirm cancellation evidence remains visible and `Run Codex Implementer` can be used again without restarting the app.
5. Confirm Report Review is a separate workspace.
6. Open Report Review and confirm only the Implementer Report can be dispositioned.
7. Confirm Approved and RevisionRequested report outcomes expose only the authorized next workflow.
