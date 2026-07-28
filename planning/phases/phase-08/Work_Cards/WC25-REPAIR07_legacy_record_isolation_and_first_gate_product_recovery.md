<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "repair-work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC25-REPAIR07",
    "parentWorkCardId": "WC25"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Architect_Reports/RCA_WC25_REPAIR06_LEGACY_PATH_AUTHORITY_AND_STALE_SELECTION.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR06_full_lifecycle_content_ingestion_migration_blocking_and_running_product_completion.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Legacy Record Isolation and First-Gate Product Recovery",
    "executionMode": "one continuous bounded task",
    "recommendedReasoning": "medium",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR07_legacy_record_isolation_and_first_gate_product_recovery.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Bounded repair of the Operator-observed Project Intake and Architect Interview failure. Historical files remain untouched; no migration is authorized.",
    "reviewedAt": "2026-07-27"
  }
}
CHAMPCITY-METADATA -->

# WC25-REPAIR07 — Legacy Record Isolation and First-Gate Product Recovery

Repository: ChampCity_AI only  
Execution: one continuous bounded task using medium reasoning  
Git mutation: prohibited

## Read First

Read this Work Card and:

`planning/phases/phase-08/Architect_Reports/RCA_WC25_REPAIR06_LEGACY_PATH_AUTHORITY_AND_STALE_SELECTION.md`

The diagnosis and solution are fixed. Do not redesign the workflow and do not migrate historical files.

## Objective

Make Project Intake and Architect Interview usable when the repository contains historical or unmanaged Markdown.

Only readable canonical metadata may control current workflow state.

## Exact Changes

### 1. Distinguish unmanaged legacy Markdown

File: `src/main/documents/planningDocumentService.ts`

When a Markdown file does not begin with the canonical metadata delimiter:

- retain it as readable preview content;
- mark it non-authoritative with artifact type `legacy-unmanaged` and participation role `historical`;
- do not assign canonical metadata;
- do not report it as a canonical local error.

A file that begins with a canonical metadata block but fails parsing remains an invalid canonical error. Do not hide canonical corruption.

### 2. Remove path-only workflow authority

Files:

- `src/shared/projectIntake/projectIntakeCorpus.ts`
- `src/shared/documents/lifecycleArtifact.ts`

Active Project Intake requires:

- readable canonical metadata;
- artifact type `project-intake`;
- no read error;
- nonhistorical participation role;
- nonarchive path.

A path under `Project_Intake/` or `Project_Architect_Interviews/` must not establish gating authority by itself.

Path helpers may remain for display or filename parsing only.

### 3. Isolate legacy records from active workspaces

File: `src/shared/workspaces/documentWorkspace.ts`

Documents marked `legacy-unmanaged` or `historical` must not appear in active Project Intake or Architect Interview groups or counts.

Route them to a non-authoritative `Historical and unmanaged documents` group under Project Planning, or exclude them from visible active groups. They must never become the required workspace.

### 4. Clear stale selection

File: `src/renderer/app/App.tsx`

After every document refresh, if `selectedDocumentId` is absent from the returned inventory:

- clear `selectedDocumentId`;
- clear `selectedDocument`;
- clear selected disposition;
- let resolver selection choose the current readable document.

Do not retain a deleted or superseded preview.

## Required Evidence Checklist

Record these eight items as `Proven` or `NotProven` in the Implementer Report:

1. Legacy unmanaged Intake is non-authoritative.
2. Legacy unmanaged Architect Interview is non-authoritative.
3. A new canonical Intake is created and visibly readable.
4. The Intake disposition dropdown works.
5. Applying `Approved` succeeds.
6. Architect Interview becomes the current workspace with a readable prompt.
7. Architect output saves and visibly refreshes as Pending.
8. Interview disposition controls are usable.

Any `NotProven` item means the task is incomplete.

## Running-Product Acceptance

Use actual Electron controls against a controlled repository containing at least one legacy Intake or Interview Markdown file:

```text
Open workspace
→ confirm legacy file does not control current state
→ create Project Intake
→ select and visibly read the new Intake
→ choose Approved
→ apply disposition
→ observe Architect Interview become current
→ visibly read the prompt
→ paste and save Architect output
→ visibly read the saved Interview
→ confirm Interview disposition controls work
```

Remote-debugging API calls, source inspection, service invocation, and automated tests do not replace these observations.

After the product path passes, run once:

- `npm run typecheck`
- `npm run build`
- `npm test`

Tests are supporting diagnostics only. Do not expand the test suite.

## Completion

Write the Implementer Report only after all eight evidence items are Proven.

Do not create REPAIR08. Do not perform any Git operation. Historical files remain untouched and no migration is required.
