<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "repair-work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC25-REPAIR09",
    "parentWorkCardId": "WC25"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC25-REPAIR08_architect_interview_mcp_completion_handoff.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Complete Canonical Document Review Surfaces",
    "executionMode": "one continuous bounded task",
    "recommendedReasoning": "medium",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR09_complete_document_review_surface.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Remove silent body truncation from every authoritative selected-document review surface while retaining bounded summaries where they are not used for disposition.",
    "reviewedAt": "2026-07-28"
  }
}
CHAMPCITY-METADATA -->

# WC25-REPAIR09 — Complete Canonical Document Review Surfaces

Repository: ChampCity_AI only  
Execution: one continuous bounded task using medium reasoning  
Git mutation: prohibited

## Evidence

The Revisionary Project Architect Interview revision 2 is a readable canonical Markdown document of approximately 44 KB and ends with section 44, `Governing Architectural Principles`.

The application review pane reaches its visual bottom around section 15. Repository inspection confirms that the selected document is correct; its body is silently truncated by the shared document-detail service:

```ts
const previewLimit = 12000;
preview: previewSource.slice(0, previewLimit),
previewTruncated: previewSource.length > previewLimit,
```

The shared renderer displays only `selectedDocument.preview` and does not expose or act on `previewTruncated`.

A second independent 12,000-character slice exists in the Architect Interview workspace model.

## Why the Cap Existed

The 12,000-character limit was introduced with the first governed planning-document viewer as a bounded `preview` implementation. The likely intent was to limit IPC payload size and renderer work while the early document workspace displayed lightweight previews.

No repository evidence establishes that 12,000 characters was benchmark-derived, approved as a product requirement, or introduced in response to a measured performance incident.

A bounded preview is appropriate for document lists, summary cards, diagnostics, search results, or other non-authoritative surfaces. It is invalid for a review surface where the Operator applies an approval, rejection, or revision disposition because hidden content cannot be reviewed.

## Scope Confirmation

This defect is not limited to Architect Interview.

`readPlanningDocument()` supplies the shared `PlanningDocumentDetail` contract used by the selected-document review pane in `App.tsx`. That pane is reused throughout the application for canonical Project, Phase, and Work Card documents, including dispositioned documents.

Therefore every workspace that reviews a selected canonical document through the shared viewer is affected by the same 12,000-character cap.

The Architect Interview dual-pane layout exposes the defect first because its Interview is long, but it is not a workspace-specific cause.

Authoring textareas, embedded ChatGPT, document lists, search results, and diagnostic summaries are not authoritative selected-document review surfaces and are not required to carry the full body.

## Objective

Make every authoritative selected-document review surface display the complete current canonical Markdown body before the Operator can apply a disposition.

## Exact Changes

### 1. Shared Selected-Document Detail

File: `src/main/documents/planningDocumentService.ts`

Change the authoritative `readPlanningDocument()` result so the selected document contains the complete canonical body.

Required behavior:

- do not apply `previewLimit` to the selected document detail used for review;
- do not silently truncate the body;
- preserve canonical body text exactly after existing line-ending normalization;
- keep bounded previews only in APIs or projections that are explicitly summary-only and cannot be dispositioned;
- remove, retire, or redefine `previewTruncated` so it cannot represent hidden content in an authoritative review contract.

Do not replace the defect with a warning while continuing to hide the remaining content.

### 2. Shared Document Review Pane

File: `src/renderer/app/App.tsx`

Render the complete selected canonical document body in the shared document-review pane used throughout the application.

Required behavior:

- long documents remain scrollable;
- the visual bottom matches the repository body ending;
- short documents retain current behavior;
- selected-document identity, readability state, disposition state, and review controls remain intact;
- the Operator can reach the actual end of the document before applying a disposition.

Do not create separate workspace-specific full-document implementations.

### 3. Architect Interview Model Duplication

File: `src/main/architectInterview/architectInterviewService.ts`

Remove the independent `.slice(0, 12000)` from `readPreviewIfAvailable()` or convert that field into an explicitly non-authoritative summary that is never used as the disposition review body.

The Architect Interview workspace model must not silently carry a truncated body that could later become another review source.

### 4. Revision Refresh

When a canonical document is revised at the same path and logical document ID:

- polling or refresh must reload the complete latest body;
- the selected document must remain selected when valid;
- the displayed revision must not retain the earlier truncated or stale body;
- scrolling may reset, but the content must be current and complete.

## Non-Scope

Do not:

- change canonical Markdown serialization;
- change document identity, source revision, freshness, or disposition authority;
- change ChampCity MCP;
- change the Architect Interview handoff protocol;
- redesign the embedded browser;
- remove bounded limits from list, search, diagnostic, or summary-only projections without evidence that they feed an authoritative review surface;
- redesign all document rendering or introduce a Markdown-rendering dependency;
- perform Git operations.

## Required Evidence Checklist

Record each item as `Proven` or `NotProven`:

1. `readPlanningDocument()` returns the complete selected canonical body with no 12,000-character slice.
2. The shared document-review pane displays the complete body in every workspace that uses the selected-document detail contract.
3. Architect Interview has no second silent 12,000-character authoritative-body path.
4. Revisionary Interview revision 2 visibly reaches section 44 and the displayed ending matches the repository file.
5. A second canonical document larger than 12,000 characters in a non-Architect workspace visibly reaches a unique end marker.
6. A short canonical document still displays normally.
7. A same-path substantive revision refreshes to the complete latest body without requiring workspace reselection.
8. Disposition controls remain usable after the complete long document is loaded.
9. Bounded list, search, and diagnostic summaries remain bounded and are not converted into full-body payloads unnecessarily.

Any `NotProven` item means implementation remains in this Work Card. Do not create REPAIR10.

## Validation

Use actual Electron controls.

### Revisionary proof

```text
open Architect Interview
→ select PROJECT_ARCHITECT_INTERVIEW_revisionary
→ scroll to the actual bottom
→ confirm section 44 is visible
→ confirm the final principle matches the repository file
→ confirm disposition controls remain usable
```

### Shared-viewer proof

Use one non-Architect canonical Project, Phase, or Work Card document larger than 12,000 characters with a unique final marker:

```text
open its owning workspace
→ select the document
→ scroll to the actual bottom
→ confirm the unique final marker is visible
→ confirm review controls remain usable when applicable
```

### Revision proof

```text
keep a long document selected
→ install or create a valid same-path higher revision with a changed final marker
→ refresh or wait for repository polling
→ confirm the same selected document displays the new complete ending
```

Source inspection and unit tests do not replace these walkthroughs.

After product validation passes, run once:

- `npm run typecheck`
- `npm run build`
- `npm test`

Tests are supporting diagnostics only.

## Completion

Write the Implementer Report only after all nine evidence items are Proven.

No Git operation. No summary-only workaround. No REPAIR10.
