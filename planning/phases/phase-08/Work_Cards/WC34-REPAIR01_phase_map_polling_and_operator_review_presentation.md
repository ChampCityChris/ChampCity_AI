<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC34-REPAIR01",
    "repairId": "WC34-REPAIR01",
    "parentWorkCardId": "WC34"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC34_phase_map_single_output_draft_ingestion_cutover.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC34_phase_map_single_output_draft_ingestion_cutover.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Phase Map Polling and Operator Review Presentation Repair",
    "status": "approved_for_implementation",
    "executionMode": "one bounded WC34 repair pass",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC34-REPAIR01_phase_map_polling_and_operator_review_presentation.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Repair only automatic Phase Map promotion polling and the Operator-facing Phase Map review projection. Preserve WC34 persistence and identity behavior.",
    "reviewedAt": "2026-07-31"
  }
}
CHAMPCITY-METADATA -->

# WC34-REPAIR01 — Phase Map Polling and Operator Review Presentation Repair

Status: Approved for Implementer execution  
Parent: `WC34`  
Git mutation: prohibited

## Defects

Operator validation identified two defects:

1. The three-second Phase Map quiet poll lists documents and returns on an unchanged repository fingerprint before calling the status path that promotes a ready temporary draft. Promotion therefore occurs only after manual refresh.
2. The Phase Map review pane renders raw body Markdown in a generic `<pre>`, exposing the fenced JSON as the primary review experience instead of an Operator-readable phase sequence.

The deterministic temporary draft directory is correct and is not part of this repair.

## Required Repair

### 1. Poll the promotion path before evaluating repository change

In the Phase Map renderer polling path:

```text
quiet poll
→ call the Phase Map/current-workflow status path that inspects and may promote the active draft
→ list planning documents after that call
→ calculate the Phase Map evidence fingerprint from the refreshed repository state
→ update inventory, current workflow model, selected output, and preview when evidence changed
```

Requirements:

- retain the existing three-second interval;
- polling must not prepare a submission or advance the request ordinal;
- one ready draft must promote without manual refresh;
- malformed drafts must surface the promotion failure without creating a final document;
- stale poll responses must not overwrite newer state;
- do not add filesystem watching, background workers, or a second promotion route.

### 2. Render an Operator-readable Phase Map projection

When the selected document is a readable Phase Map output, replace the default raw-body presentation with a specialized read-only projection derived from canonical `metadata.workflowData.phases`.

For each phase display:

- order and phase ID;
- title;
- purpose;
- dependencies, or `None`;
- source references.

Requirements:

- preserve phase order by numeric `order`;
- do not reparse the Markdown body as authority;
- do not edit, normalize, or reinterpret phase content in the renderer;
- retain the canonical Markdown body through a secondary `View Source` / `Hide Source` control for auditability;
- disposition controls must continue to operate on the canonical Phase Map document;
- malformed or missing `workflowData.phases` must show `Needs Attention`, not a fabricated projection.

## Preserve

Preserve without redesign:

- WC34 draft identity and temporary path construction;
- `create_markdown_artifact` handoff;
- Phase Map body and domain validation;
- canonical `workflowData.phases` projection;
- creation, revision, retry, cleanup, and disposition behavior;
- closeout-derived completion and first-incomplete-phase selection;
- Architect Interview and Project Planning workspaces.

## Authorized Surface

Expected changes are limited to:

```text
src/renderer/app/App.tsx
one adjacent shared or renderer-only Phase Map presentation helper if useful
focused renderer/runtime Phase Map tests
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC34-REPAIR01_phase_map_polling_and_operator_review_presentation.md
```

A narrow main-process status accessor change is allowed only when required to expose the already-existing Phase Map promotion status. Do not alter WC30 or WC34 algorithms.

## Required Proof

1. A renderer quiet poll with an active ready Phase Map draft invokes the promotion-capable status path before repository fingerprint comparison.
2. The same poll detects the promoted canonical output, selects it, and loads it without manual refresh.
3. Quiet polling does not create or advance submissions.
4. Malformed draft polling surfaces failure and creates no final Phase Map.
5. Stale asynchronous poll results cannot replace newer Phase Map state.
6. A readable Phase Map renders ordered phase cards/rows from `metadata.workflowData.phases`.
7. The default view does not present raw fenced JSON as the primary review content.
8. `View Source` reveals the exact canonical body and `Hide Source` restores the projection.
9. Missing or malformed phase metadata renders `Needs Attention` and no fabricated phases.
10. Existing Phase Map disposition behavior remains functional.
11. Architect Interview, Project Planning, and other document previews remain unchanged.
12. Typecheck, build, and complete tests pass in the normal Windows lane.
13. Operator running-product validation remains pending.

Tests must execute the production polling sequence and rendered Phase Map presentation. String-presence assertions or direct calls to isolated promotion helpers do not prove items 1–9.

## Operator Validation

```text
copy Phase Map handoff
→ create valid temporary draft
→ wait without pressing Refresh Phase Map
→ confirm automatic promotion and automatic selection
→ confirm readable phase sequence is shown
→ toggle View Source and verify exact canonical Markdown
→ approve the Phase Map
```

Also validate one malformed draft and confirm the visible failure state appears without a final Phase Map.

## Non-Scope

Do not shorten or replace deterministic draft IDs, modify the Phase Map schema, change phase content, add editing, change lifecycle rails, alter persistence, add dependencies, or perform Git operations.

## Completion

Create the Implementer Report only after proof items 1–12 pass. Do not claim Operator validation.
