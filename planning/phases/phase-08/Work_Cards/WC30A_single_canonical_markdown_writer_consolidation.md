<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC30A"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC30_reusable_architect_draft_ingestion_and_canonical_promotion.md",
      "revision": 2
    }
  ],
  "workflowData": {
    "title": "Single Canonical Markdown Writer Consolidation",
    "status": "approved_for_implementation",
    "executionMode": "one bounded infrastructure consolidation pass",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC30A_single_canonical_markdown_writer_consolidation.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Remove the duplicate canonical Markdown transaction implementation from planningDocumentService and make canonicalMarkdownDocumentWriter the sole production canonical writer without changing document behavior.",
    "reviewedAt": "2026-07-31"
  }
}
CHAMPCITY-METADATA -->

# WC30A — Single Canonical Markdown Writer Consolidation

Status: Approved for Implementer execution  
Git mutation: prohibited

## Finding

The repository contains two production canonical Markdown writer implementations:

```text
src/main/documents/canonicalMarkdownDocumentWriter.ts
  writeCanonicalMarkdownDocument()
  writeCanonicalMarkdownDocuments()

src/main/documents/planningDocumentService.ts
  private writeCanonicalMarkdownTransaction()
```

Both serialize canonical metadata and body, execute an artifact transaction, reread installed files, parse canonical Markdown, and verify installed metadata and body. The duplication is unnecessary and can drift.

## Objective

Make `canonicalMarkdownDocumentWriter.ts` the sole production implementation for canonical Markdown serialization, atomic writing, rollback, reread, and installed-content verification.

`planningDocumentService.ts` must retain document discovery, read behavior, disposition calculation, substantive revision calculation, downstream invalidation, and result assembly, but it must no longer implement its own canonical writer.

## Required Change

1. Replace every call to the private `writeCanonicalMarkdownTransaction()` in `planningDocumentService.ts` with `writeCanonicalMarkdownDocument()` or `writeCanonicalMarkdownDocuments()` from `canonicalMarkdownDocumentWriter.ts`.
2. Delete the private `writeCanonicalMarkdownTransaction()` implementation from `planningDocumentService.ts`.
3. Remove imports that were required only by that duplicate implementation, including direct canonical serialization, direct artifact-transaction writing, and duplicate installed-file verification dependencies when no longer used elsewhere in the file.
4. Preserve current behavior for:
   - single-document disposition updates;
   - coordinated multi-document disposition updates;
   - substantive revision increments;
   - downstream disposition invalidation;
   - body preservation;
   - atomic rollback;
   - installed metadata and body verification;
   - returned `PlanningDocumentSummary` and `RevisionSaveResult` values.
5. Do not change canonical metadata shape, artifact revision rules, source revisions, participation roles, disposition rules, freshness logic, downstream dependency selection, or document discovery.

## Required Tests

Prove:

1. single-document disposition update still preserves body and artifact revision;
2. multi-document disposition update remains atomic;
3. substantive revision increments exactly once and resets disposition as currently defined;
4. downstream invalidation remains unchanged;
5. an injected installed-verification failure restores original bytes for planning-service writes;
6. no second production canonical writer remains in `planningDocumentService.ts` or another new location;
7. Project Intake and WC30 promotion continue using the same shared canonical writer;
8. typecheck, build, and complete tests pass in the normal Windows lane.

## Non-Scope

Do not:

- change Project Intake behavior;
- change WC30 draft ingestion or promotion behavior;
- adopt WC31 or any production Architect-output flow;
- change metadata builders;
- introduce a generic metadata authority engine;
- add migrations, compatibility paths, fallbacks, aliases, sidecars, or hidden state;
- modify renderer, preload, IPC, action rails, MCP integration, or workflow resolution;
- add dependencies;
- perform Git operations.

## Authorized Surface

Expected changes are limited to:

```text
src/main/documents/planningDocumentService.ts
src/main/documents/canonicalMarkdownDocumentWriter.ts only if a narrow shared API adjustment is required
focused document tests
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC30A_single_canonical_markdown_writer_consolidation.md
```

Any additional production file requires a concrete necessity explanation in the Implementer Report.

## Completion

Create the Implementer Report only after all required tests pass and repository search confirms one production canonical writer implementation remains.

Do not package, promote, restart, reconnect, stage, commit, push, reset, clean, stash, merge, tag, or publish in this Work Card.
