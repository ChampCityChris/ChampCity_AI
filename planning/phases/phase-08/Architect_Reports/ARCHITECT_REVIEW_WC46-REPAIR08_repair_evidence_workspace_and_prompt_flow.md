<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR08",
    "repairId": "WC46-REPAIR08",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR08_repair_evidence_workspace_and_prompt_flow.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR08_repair_evidence_workspace_and_prompt_flow.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review - WC46-REPAIR08 Repair Evidence Workspace and Prompt Flow",
    "status": "ApprovedForOperatorValidation",
    "reviewedWorkCard": "WC46-REPAIR08",
    "reviewedReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR08_repair_evidence_workspace_and_prompt_flow.md",
    "gitMutationPerformed": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Approved for Operator validation. The implementation satisfies the bounded repair by making Work Card Repair evidence-first, using the Validation Record as the repair authority, removing Stage 1 / Stage 2 and Reuse Repair Handoff as the primary UX, and preserving the selected-workspace-bound Repair Work Card prompt flow.",
    "reviewedAt": "2026-08-05"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC46-REPAIR08 Repair Evidence Workspace and Prompt Flow

Document.Status=ApprovedForOperatorValidation

## Review Scope

Reviewed Work Card:

```text
planning/phases/phase-08/Work_Cards/WC46-REPAIR08_repair_evidence_workspace_and_prompt_flow.md
```

Reviewed Implementer Report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR08_repair_evidence_workspace_and_prompt_flow.md
```

Repository/workspace inspection was performed through ChampCity MCP against workspace `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. The working tree is dirty from the active WC46 repair series. No files were staged. No Git mutation was performed by this review.

I did not rerun local commands. Implementer-reported command results are treated as reported evidence only.

## Files Inspected

Production path inspected:

```text
src/main/workCardValidation/workCardValidationService.ts
src/main/workCardRepair/workCardRepairService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/app/WorkCardRepairWorkspace.tsx
src/renderer/styles.css
```

Test path inspected:

```text
test/work-card-repair/work-card-repair-service.test.cjs
test/renderer/work-card-repair-workspace.test.cjs
test/architect-outputs/architect-output-prompt-contracts.test.cjs
test/architect-outputs/architect-output-workspace-repair.test.cjs
test/workflow/current-execution-context.test.cjs
```

## Findings

WC46-REPAIR08 satisfies the bounded repair.

The Validation Record remains the repair authority for `postValidationRecord` repairs. `workCardValidationService.ts` already writes `operatorValidationNotes`, `advisorySummary`, `repairDefectText`, `formalWorkCardPath`, `implementerReportPath`, and `implementerReportRevision` into Validation Record workflow data and renders Operator Validation Notes, Advisory Summary, and Repair Defect Text in the body. The implementation preserves that model and does not create a separate advisory-review artifact.

`workCardRepairService.ts` now exposes an evidence-first repair projection. The projection includes `primaryEvidenceDocument`, `supportingEvidenceDocuments`, `operatorValidationNotes`, `advisorySummary`, `repairDefectText`, phase ID, parent Work Card ID, evidence path/revision, repair origin, return target, handoff state, and repair target when available. For post-validation repair, the primary evidence document is the RevisionRequested Validation Record. Supporting evidence documents are the Implementer Report and Formal Work Card. Missing or unreadable supporting evidence returns `needs-attention` rather than silently dropping the path.

`WorkCardRepairWorkspace.tsx` no longer presents the primary UX as `Stage 1`, `Stage 2`, `Repair Architect Handoff`, `Reuse Repair Handoff`, `Prepare Repair Handoff`, or `Prepare Architect Prompt`. The screen is now organized around a left-side `Repair Evidence` document viewer and right-side `Repair Work Card Architect` prompt controls. The evidence tabs include Validation Record, Implementer Report, and Formal Work Card, and the selected evidence body is shown in a bounded preview.

`App.tsx` collapses internal Repair Architect handoff creation/reuse into the primary `Prepare Repair Work Card Prompt` action. If no handoff exists, the action calls the current repair creation path before preparing the Architect-output handoff for `work-card-repair`. The visible Operator flow is therefore prompt-centered rather than handoff-plumbing-centered.

The Repair Work Card prompt remains selected-workspace-bound and evidence-bound. The prompt tells the Architect to treat the Validation Record as repair authority, read it first for post-validation repairs, and includes exact Validation Record, Implementer Report, Formal Work Card, Repair Architect handoff, repair target, and return-target paths. The prompt does not request a separate advisory-review document and does not include project-specific wrong-target names.

## Acceptance Criteria Assessment

| AC | Result | Assessment |
|---|---:|---|
| 1 | Pass | `work-card-repair` renders an evidence-first workspace instead of the Stage 1 / Stage 2 UI. |
| 2 | Pass | Left side contains the Repair Evidence viewer. |
| 3 | Pass | Validation Record is the primary evidence document and is selected by default in the workspace state. |
| 4 | Pass | Implementer Report and Formal Work Card are modeled as supporting evidence documents. |
| 5 | Pass | Operator validation notes, advisory summary, and repair defect text are exposed from Validation Record evidence. |
| 6 | Pass | Right side presents Repair Work Card Architect controls and embedded ChatGPT browser panel. |
| 7 | Pass | Primary action is `Prepare Repair Work Card Prompt`; `Reuse Repair Handoff` is removed from the primary UI. |
| 8 | Pass | Prompt preparation internally creates/reuses the Repair Architect handoff when needed. |
| 9 | Pass | Copy Handoff remains available after prompt preparation through the existing Architect-output runtime. |
| 10 | Pass | Prompt includes Validation Record, Implementer Report, Formal Work Card, handoff, repair target, and return target. |
| 11 | Pass | Prompt avoids project-specific wrong-target names and does not request a separate advisory-review document. |
| 12 | Pass | Existing promotion still targets the exact Repair Work Card path from the handoff. |
| 13 | Pass | Missing/unreadable evidence surfaces as needs-attention. |
| 14 | Pass | No broad Work Card loop/global resolver rewrite was identified. |
| 15 | Reported Pass | Implementer reports typecheck, build, focused tests, and full Node lane passed; not rerun by Architect. |
| 16 | Pass | No dependency addition observed. |
| 17 | Pass | No Git operation reported or performed by this review. |

## Non-Blocking Notes

The projection still uses internal state names such as `handoff-needed` and `handoff-ready`, but the visible workspace labels translate them into Operator-facing states such as `Evidence Ready`, `Prompt Ready`, `Draft Pending`, and `Repair Card Reviewable`. That is acceptable because the internal model is not the primary UX.

The embedded ChatGPT/browser path still requires Operator validation because the automated tests cannot prove live browser attachment, copy/paste, ChatGPT response behavior, or MCP draft creation from the embedded session.

## Disposition

`ApprovedForOperatorValidation`.

WC46-REPAIR08 satisfies the bounded repair. Operator validation should focus on the running product sequence: Request Repair, confirm the Repair Evidence viewer opens with Validation Record selected, inspect supporting Implementer Report and Formal Work Card, prepare/copy the Repair Work Card prompt, and verify the promoted Repair Work Card appears at the exact target path.
