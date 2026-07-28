<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC25-REPAIR07"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR06_full_lifecycle_content_ingestion_migration_blocking_and_running_product_completion.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Legacy Path Authority and Stale Selection RCA"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Operator screenshots established the running-product failure. Historical files may remain; no migration is required.",
    "reviewedAt": "2026-07-27"
  }
}
CHAMPCITY-METADATA -->

# RCA — Legacy Path Authority and Stale Selection

## Observed failure

The running application selected a legacy Project Intake Markdown file, reported it as `Local Error`, disabled disposition, and blocked Architect Interview.

## Causal chain

1. `planningDocumentService.ts` discovers every Markdown file under `planning/`. A file without a canonical metadata comment becomes an unreadable summary.
2. `projectIntakeCorpus.ts` nevertheless treats any file under `planning/project/Project_Intake/` as active Intake authority.
3. `lifecycleArtifact.ts` and `documentWorkspace.ts` repeat path-based fallbacks, classifying unreadable legacy Intake and Architect Interview files as active gating records.
4. `App.tsx` disables disposition when the selected summary has `readError` and can retain a selected ID after that file disappears.
5. Architect Interview consumes the same active Intake corpus and therefore remains blocked.

## Root cause

Filesystem location is being used as workflow authority when canonical metadata is absent. Historical or unmanaged Markdown is therefore promoted into current state.

## Decision

No migration is required. Historical files may remain unchanged.

Only readable canonical metadata may establish active workflow authority. Unmanaged legacy Markdown may be displayed as historical/context evidence, but it must not control the rail, resolver, active workspace counts, disposition, or Architect Interview prerequisites.

## Required correction

- Distinguish unmanaged legacy Markdown from readable canonical Markdown during discovery.
- Remove path-only authority from Project Intake and lifecycle classification.
- Keep unmanaged legacy Intake and Interview records out of active workflow groups and counts.
- Clear stale selection when refresh no longer returns the selected document.
- Prove Project Intake approval and Architect Interview save/review through actual Electron controls.
