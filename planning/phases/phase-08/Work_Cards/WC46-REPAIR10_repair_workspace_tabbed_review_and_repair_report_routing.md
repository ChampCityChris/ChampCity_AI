<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR10",
    "repairId": "WC46-REPAIR10",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR09_repair_work_card_deterministic_target_path.md",
      "revision": 4
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR09_repair_work_card_deterministic_target_path.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR09_repair_work_card_deterministic_target_path.md",
      "revision": 2
    }
  ],
  "workflowData": {
    "title": "Repair Workspace Tabbed Review and Repair Report Routing",
    "status": "approved_for_implementation",
    "executionMode": "one bounded repair UI and repair-report routing correction after WC46-REPAIR09",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "WC46-REPAIR09 partially fixed deterministic repair target paths and repair implementation binding, but Operator validation shows the Repair workspace still renders stacked repair evidence, status, and Repair Work Card review sections rather than the approved tabbed document-viewer model. Repository review also confirms the repair branch routes an Approved Repair Work Card to Implement, but does not route a ready repair-specific Implementer Report to Review & Validation.",
    "rootCause": "The repair renderer copied concepts from the generic Architect-output review path but stacked them inside WorkCardRepairWorkspace instead of reusing the approved FigmaDocumentCard / tabbed document viewer pattern already present in App.tsx. The backend repairLoopAuthority branch added Approved Repair Work Card to Build routing, but it does not mirror the formal Work Card readiness distinction that routes ready Implementer Reports to work-card-report-review.",
    "codexServiceFinding": "No defect is currently identified in codexImplementerExecutionService.ts. Its WC46-REPAIR09 repair-contract support is preserved behavior, not REPAIR10 implementation scope.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR10_repair_workspace_tabbed_review_and_repair_report_routing.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Use the existing approved tabbed document-viewer model for Repair workspace documents and complete the repair implementation Build to Review & Validation transition. Do not rewrite WC46-REPAIR09 target-path work or modify Codex execution without a proven new defect.",
    "reviewedAt": "2026-08-05"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR10 — Repair Workspace Tabbed Review and Repair Report Routing

Status: Approved for Implementer execution  
Parent: `WC46`  
Git mutation: prohibited

## Confirmed Defect

WC46-REPAIR09 is partially successful but does not pass Operator validation.

Operator visual validation shows the `work-card-repair` workspace still using a stacked custom layout:

```text
Repair Documents tabs
→ metadata grid
→ repair defect block
→ repair target block
→ return target/source grid
→ separate Repair Work Card review block lower on the page
→ right-side embedded ChatGPT panel squeezed beside the stack
```

This is not the approved document-review UI model. It is visually dense, pushes the readable document body out of view, duplicates document surfaces, and makes the Repair Work Card disposition path harder to operate.

The approved model already exists in the application and is visible in the Project Profile / Project Roadmap workspace: a tab row, one selected document viewport, compact header/path/status actions, Markdown body rendering, and disposition controls below the selected document.

Repository review also confirms a backend lifecycle defect. WC46-REPAIR09 routes an Approved Repair Work Card to `work-card-building-review` for repair implementation, but the repair branch does not route a ready repair-specific Implementer Report onward to `work-card-report-review`. The repair lifecycle can therefore remain in Implement after the repair report is ready for review.

The intended repair flow is:

```text
Repair Work Card Pending or RevisionRequested
→ work-card-repair with tabbed document viewer and Repair Work Card review controls
→ Repair Work Card Approved
→ work-card-building-review while repair Implementer Report is missing, reserved, incomplete, invalid, or conflicting
→ work-card-report-review once repair-specific Implementer Report is ready-for-review
→ Work Card Validation uses the repair-specific Implementer Report under the existing Operator authority model
```

No defect is currently identified in `src/main/workCardBuilding/codexImplementerExecutionService.ts`. WC46-REPAIR09’s repair-contract Codex support is necessary preserved behavior, not a REPAIR10 defect.

## Source Evidence

Repository verified through ChampCity MCP as workspace `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. The working tree is dirty from the active WC46 repair series. No Git mutation is authorized.

Current governing inputs inspected:

```text
planning/phases/phase-08/Work_Cards/WC46-REPAIR09_repair_work_card_deterministic_target_path.md revision 4
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR09_repair_work_card_deterministic_target_path.md revision 1
planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR09_repair_work_card_deterministic_target_path.md revision 2
```

Operator screenshots provide direct UI evidence that the Repair workspace still renders repair metadata and review content as stacked panels, while the approved Project Profile / Project Roadmap workspace renders readable documents through a tabbed viewer.

Relevant source facts:

```text
src/renderer/app/App.tsx
- FigmaDocumentCard(...) implements the approved tabbed document-viewer model.
- It renders .figma-document-tabs when multiple slots are present.
- It renders one selected document through .figma-document-card-body and FigmaMarkdownBody(...).
- FigmaArchitectReviewPanel(...) renders disposition controls below the selected document and uses Architect-output review state.
- These components are currently local to App.tsx rather than a reusable Repair workspace document-viewer component.
```

```text
src/renderer/app/WorkCardRepairWorkspace.tsx
- The Repair workspace receives repair evidence, prompt actions, browser panel, and reviewPanel.
- It renders repair evidence and repair status through custom panels and grids.
- It places reviewPanel after the stacked repair evidence/status panels.
- It does not use the same tabbed current-document viewer model as FigmaDocumentCard.
```

```text
src/renderer/styles.css
- The approved viewer style exists under the figma document classes used by FigmaDocumentCard.
- Repair-specific styles exist, but current usage produces a stacked repair page instead of one selected readable document surface.
```

```text
src/main/workCardLoop/workCardLoopAuthorityService.ts
- repairLoopAuthority(...) now recognizes Approved Repair Work Cards and routes to work-card-building-review.
- The approved-repair branch computes getWorkCardBuildingReviewProjection(...), but returns work-card-building-review regardless of reportReadiness.
- The formal Work Card path in activeLoopAuthorityForCandidate(...) already distinguishes missing/reserved/invalid/conflict from ready-for-review and routes ready reports to work-card-report-review.
- The repair branch must mirror that readiness distinction using the repair-specific Implementer Report.
```

```text
src/main/workCardBuilding/workCardBuildingReviewService.ts
- WC46-REPAIR09 added repair-work-card implementation contract support and repair-specific report targets.
- That support is necessary and must be preserved.
- The remaining defect is not that repair contract support exists; it is that the loop does not complete the repair report readiness transition.
```

```text
src/main/workCardBuilding/codexImplementerExecutionService.ts
- WC46-REPAIR09 added repair contract type/label/path and repair-specific report target support for Codex Implementer prompts.
- No current defect has been identified in this file.
- This file is preserved behavior for REPAIR10 and is not authorized implementation surface unless a focused failing test proves direct necessity and the Implementer documents the exact reason.
```

## Objective

Repair the `work-card-repair` UI by using the approved tabbed document-viewer model, and complete repair implementation routing from Build to Review & Validation when the repair-specific Implementer Report becomes ready.

This card does not rewrite WC46-REPAIR09 deterministic repair target path work, repair-specific report target work, or Codex repair-contract prompt support. It repairs the two remaining confirmed defects identified by Operator validation and Architect code review.

## Runtime Sequence

### Repair workspace document review

```text
work-card-repair opens
→ Repair document viewer displays one tab row:
   - Validation Record
   - Implementer Report
   - Formal Work Card
   - Repair Work Card, when promoted
→ selected tab controls one readable document viewport
→ selected document header shows status/path/copy controls using the approved current-document visual model
→ Repair Work Card tab is selected by default when the Repair Work Card is Pending or RevisionRequested
→ disposition controls appear below the selected Repair Work Card when it is reviewable
→ prompt/browser controls remain available in the right pane without squeezing the document viewport into unreadable stacked blocks
```

### Repair implementation routing

```text
Approved Repair Work Card exists
→ repairLoopAuthority resolves repair implementation context
→ if repair Implementer Report is missing or reserved skeleton:
   route to work-card-building-review
→ if repair Implementer Report is invalid or conflicting:
   route to work-card-building-review with blocker
→ if repair Implementer Report is ready-for-review:
   route to work-card-report-review
→ Review & Validation reviews the repair-specific Implementer Report path, not the original parent Work Card report
```

## Required Changes

### 1. Replace stacked Repair workspace document UI with the approved tabbed document-viewer model

The Repair workspace must not stack large repair evidence/status/review panels above the document body.

Use the existing approved model from `App.tsx` as the implementation reference:

```text
FigmaDocumentCard(...)
FigmaMarkdownBody(...)
FigmaArchitectReviewPanel(...)
CSS classes: .figma-document-card, .figma-document-tabs, .figma-document-card-body, .figma-markdown-body
```

Recommended implementation:

```text
Extract the reusable document-viewer and review-panel pieces from App.tsx into a narrowly named renderer component file, then use the same component from both the existing Architect-output document shell and WorkCardRepairWorkspace.
```

Acceptable implementation:

```text
Keep the existing component local if extraction is too broad, but WorkCardRepairWorkspace must render the same tabbed document-viewer behavior and visual structure, not another custom stacked grid.
```

The Repair workspace document tabs must include:

```text
Validation Record
Implementer Report
Formal Work Card
Repair Work Card, when promoted or otherwise available as an Architect-output slot
```

Default tab selection must be deterministic:

```text
If Repair Work Card is Pending or RevisionRequested → select Repair Work Card.
Else → select Validation Record.
```

The selected document viewport must show exactly one document body at a time. Compact metadata may appear in the selected document header or a narrow status strip, but it must not push the document body below several large grids.

### 2. Preserve Repair Work Card review authority while fixing layout

The Repair Work Card disposition path must continue to use Architect-output review authority for `work-card-repair`.

Required behavior:

- The Operator can apply `Approved` or `RevisionRequested` to the Repair Work Card from the Repair workspace.
- `RevisionRequested` still requires review notes.
- Presented-revision/stale review protection remains enforced.
- Generic document disposition must not bypass Architect-output review authority.
- Repair Work Card review controls must be visually associated with the selected Repair Work Card tab, not buried after unrelated evidence/status panels.

### 3. Keep repair prompt/browser behavior intact

Preserve WC46-REPAIR08 and WC46-REPAIR09 prompt behavior:

- `Prepare Repair Work Card Prompt` remains the primary prompt action before the Repair Work Card exists.
- `Copy Handoff`, `Reload ChatGPT`, and `Refresh` remain available in the right pane.
- Internal Repair Architect handoff mechanics remain hidden from the primary Operator path.
- Deterministic repair target paths from WC46-REPAIR09 remain unchanged.

### 4. Complete repair implementation Build to Review & Validation routing

Repair lifecycle routing must mirror the formal Work Card readiness distinction for repair-specific reports.

For an Approved Repair Work Card:

```text
reportReadiness = missing
→ workspaceId = work-card-building-review
→ loopStep = Build
→ requiredAction tells Operator/Implementer to create/complete repair Implementer Report
```

```text
reportReadiness = reserved-skeleton
→ workspaceId = work-card-building-review
→ loopStep = Build
→ requiredAction tells Implementer to complete the reserved repair report with substantive evidence
```

```text
reportReadiness = invalid or conflict
→ workspaceId = work-card-building-review
→ loopStep = Build
→ blocker = reportReadinessReason
```

```text
reportReadiness = ready-for-review
→ workspaceId = work-card-report-review
→ loopStep = ReviewAndValidation
→ workCardId = repairId
→ parentWorkCardId = original parent Work Card
→ repairId = approved Repair Work Card ID
→ implementerReportPath = repair-specific Implementer Report path
→ formalWorkCardPath / contract path = approved Repair Work Card path
```

The route must not use the original parent Work Card Implementer Report when the active contract is a Repair Work Card.

### 5. Treat Codex repair-contract support as preserved behavior, not repair scope

Do not modify `src/main/workCardBuilding/codexImplementerExecutionService.ts` for REPAIR10 unless a focused failing test proves direct necessity for one of the two confirmed defects above.

The already implemented WC46-REPAIR09 behavior is preserved:

```text
Approved Repair Work Card contract path
repair contract label/type
repair-specific Implementer Report target
```

This card does not authorize broadening Codex execution behavior, changing SDK integration, changing retry/session semantics, or refactoring Codex prompt generation.

## Preserved Behavior

Preserve unchanged:

- WC46-REPAIR09 deterministic Repair Work Card target path format: `planning/phases/{phaseId}/Work_Cards/{repairId}.md`;
- full repair defect text preservation in Validation Record, Repair Architect handoff, prompt, metadata/workflowData, and Repair Work Card body;
- WC46-REPAIR08 evidence-first repair authority model;
- Validation Record as repair authority for post-validation repairs;
- Repair Work Card promotion through existing Architect-output runtime;
- Architect-output review authority and stale presented-revision protection;
- repair-specific Implementer Report target format: `planning/phases/{phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_{repairId}.md`;
- existing repair-contract Codex prompt behavior from WC46-REPAIR09;
- non-repair Formal Work Card implementation/report behavior;
- Work Card Map / Planning / Implement / Review & Validation / Close behavior outside the repair branch;
- no hidden state, sidecars, route tokens, alternate repair documents, completion markers, or separate advisory-review documents;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/renderer/app/App.tsx
src/renderer/app/WorkCardRepairWorkspace.tsx
src/renderer/app/WorkCardReportReviewWorkspace.tsx
src/renderer/styles.css
src/shared/workspaceContracts.ts
src/main/workCardLoop/workCardLoopAuthorityService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/workCardBuilding/workCardBuildingReviewService.ts
```

A new narrowly named renderer component file may be created only if it extracts the approved tabbed document-viewer model for reuse, for example:

```text
src/renderer/app/FigmaDocumentCard.tsx
src/renderer/app/TabbedDocumentViewer.tsx
```

`src/main/workCardRepair/workCardRepairService.ts` is not authorized for REPAIR10 unless the Implementer finds that existing projection data cannot supply the four document tabs. If that occurs, the Implementer must keep changes limited to projection shape/read-model support and must document the exact missing field in the Implementer Report.

`src/renderer/app/WorkCardBuildingReviewWorkspace.tsx` is not authorized unless the routing fix exposes an existing incorrect label in the Implement workspace. If touched, changes must be limited to displaying existing `implementationContractLabel` / contract path data correctly.

`src/main/workCardBuilding/codexImplementerExecutionService.ts` is not authorized for REPAIR10 by default. Existing repair-contract Codex behavior is preserved. Touch it only if a focused failing test proves it is directly required by REPAIR10; otherwise leave it unchanged.

Do not create a second visual language for repair documents. Reuse or faithfully factor the approved tabbed document-viewer model.

Tests authorized:

```text
test/renderer/work-card-repair-workspace.test.cjs
test/renderer/figma-redesign-shell.test.cjs
test/app-shell/app-shell.test.cjs
test/repository/runtime-wiring-source.test.cjs
test/work-card-loop/work-card-loop-authority-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/work-card-building/work-card-building-review-service.test.cjs
test/architect-outputs/architect-output-workspace-repair.test.cjs
```

Do not modify `test/work-card-building/codex-implementer-execution-service.test.cjs` unless a focused failing test proves the Codex service itself is involved.

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR10_repair_workspace_tabbed_review_and_repair_report_routing.md
```

## Acceptance Criteria

1. `work-card-repair` no longer stacks repair evidence, repair status, and Repair Work Card review panels into one long unreadable page.
2. `work-card-repair` uses the approved tabbed document-viewer model or a faithful extraction of it.
3. The Repair workspace document tabs include Validation Record, Implementer Report, Formal Work Card, and Repair Work Card when available.
4. Only one selected document body is visible in the main Repair document viewer at a time.
5. Repair Work Card is selected by default when it is Pending or RevisionRequested; otherwise Validation Record is selected by default.
6. Repair Work Card disposition controls appear below the selected Repair Work Card document and remain associated with that selected document.
7. Repair Work Card disposition uses Architect-output review authority and preserves stale presented-revision protection.
8. Generic document disposition cannot approve or revision-request the Repair Work Card in place of Architect-output review authority.
9. Prompt/browser controls remain available without squeezing or burying the document viewer.
10. Approved Repair Work Card with missing repair-specific Implementer Report routes to `work-card-building-review`.
11. Approved Repair Work Card with reserved-skeleton repair-specific Implementer Report remains in `work-card-building-review`.
12. Approved Repair Work Card with invalid/conflicting repair-specific Implementer Report remains in `work-card-building-review` with blocker.
13. Approved Repair Work Card with ready-for-review repair-specific Implementer Report routes to `work-card-report-review`.
14. Review & Validation for repair uses the repair-specific Implementer Report path and preserves parent Work Card / repair ID identity.
15. Original parent Work Card Implementer Report is not used as the repair implementation report.
16. Existing repair-contract Codex behavior remains unchanged unless a focused failing test proves direct necessity.
17. Non-repair Formal Work Card implementation and report routing remain unchanged.
18. Typecheck, build, focused tests, and full test lane pass in the approved Windows environment.
19. No dependency is added.
20. No Git operation occurs.

## Negative Constraints

Do not:

- stack Repair documents, metadata, and review controls into a long custom page;
- create another custom repair-only document viewer when the approved tabbed viewer model can be reused or extracted;
- show multiple large document bodies at the same time in the Repair workspace;
- bury Repair Work Card disposition below unrelated evidence/status blocks;
- bypass Architect-output review with generic document disposition;
- regress deterministic Repair Work Card target paths;
- modify `codexImplementerExecutionService.ts` without a focused failing test proving direct necessity;
- roll back or broaden existing Codex repair-contract support;
- use the original parent Work Card Implementer Report as the repair implementation report;
- route ready repair-specific Implementer Reports back to Implement indefinitely;
- route repair implementation directly to Close or Work Card Map;
- rewrite the global project/phase resolver;
- add hidden state, route tokens, sidecars, alternate repair documents, completion markers, or separate advisory-review documents;
- add dependencies;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Return Target

Preserve existing repair return-target semantics from prior repair work:

```text
postValidationRecord → work-card-validation
preValidationReportReview → work-card-building-review
```

This card only completes the missing Repair Work Card review UI and repair Implementer Report readiness routing. It does not redesign post-repair return semantics.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR10_repair_workspace_tabbed_review_and_repair_report_routing.md
```

The report must include:

- repository path, branch, remote, and working status verification;
- all changed files;
- confirmation that no Git mutation occurred;
- proof that the Repair workspace uses the approved tabbed document-viewer model or a faithful extraction;
- proof that Repair documents render as tabs with one selected document body;
- proof that Repair Work Card defaults selected when reviewable;
- proof that Repair Work Card disposition still uses Architect-output review authority and stale presented-revision checks;
- proof that prompt/browser controls remain available and visually separate from the document viewer;
- proof that approved Repair Work Card with missing/reserved/invalid/conflicting repair report routes to Build with the correct required action/blocker;
- proof that approved Repair Work Card with ready repair-specific Implementer Report routes to Review & Validation;
- proof that repair Review & Validation uses the repair-specific report path and preserves parent Work Card / repair ID identity;
- proof that non-repair Formal Work Card flow is unchanged;
- confirmation that `codexImplementerExecutionService.ts` was not touched unless a focused failing test required it, with the exact reason if touched;
- commands run and results;
- validation skipped and reason;
- residual risks and Operator manual validation remaining.

End with:

```text
Document.Status=Pending
```

## Manual Validation

After Architect review, the Operator must validate in the running application:

1. Open Work Card Repair with an active promoted Repair Work Card.
2. Confirm the left/main Repair document area uses the approved tabbed document viewer, not stacked panels.
3. Confirm the tabs include Validation Record, Implementer Report, Formal Work Card, and Repair Work Card.
4. Confirm only one selected document body is visible at a time.
5. Confirm the Repair Work Card tab is selected by default when it is reviewable.
6. Confirm the Repair Work Card can be Approved or RevisionRequested from the associated disposition controls.
7. Approve the Repair Work Card.
8. Confirm the app routes to Implement while the repair Implementer Report is missing or reserved.
9. Complete or simulate a ready repair-specific Implementer Report.
10. Confirm the app routes to Review & Validation for the repair-specific Implementer Report, not the original parent Work Card report.
