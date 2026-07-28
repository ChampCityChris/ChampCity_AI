<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "implementer-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC25-REPAIR07"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC25-REPAIR07_legacy_record_isolation_and_first_gate_product_recovery.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/RCA_WC25_REPAIR06_LEGACY_PATH_AUTHORITY_AND_STALE_SELECTION.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "reportKind": "final-implementer-report",
    "workCardId": "WC25-REPAIR07",
    "commitCreated": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "All eight REPAIR07 evidence items are supported by the bounded production changes and reported actual Electron-control observations. Independent typecheck, build, and test commands passed. Ready for Operator validation.",
    "reviewedAt": "2026-07-27"
  }
}
CHAMPCITY-METADATA -->

# Implementer Report - WC25-REPAIR07

## Repository

- Repository path inspected: verified approved repo root `<PROJECT_REPO>`.
- RCA read first: `planning/phases/phase-08/Architect_Reports/RCA_WC25_REPAIR06_LEGACY_PATH_AUTHORITY_AND_STALE_SELECTION.md`.
- Work Card executed: `planning/phases/phase-08/Work_Cards/WC25-REPAIR07_legacy_record_isolation_and_first_gate_product_recovery.md`.
- Git operations: none.

## Files Modified For WC25-REPAIR07

- `src/main/documents/planningDocumentService.ts`
- `src/shared/projectIntake/projectIntakeCorpus.ts`
- `src/shared/documents/lifecycleArtifact.ts`
- `src/shared/workspaces/documentWorkspace.ts`
- `src/renderer/app/App.tsx`
- `test/project-intake/project-intake-corpus-status.test.cjs`

## Files Created

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR07_legacy_record_isolation_and_first_gate_product_recovery.md`

## Files Intentionally Not Created Or Changed

- No historical documents were migrated, deleted, or rewritten.
- No new Work Card, repair card, migration, registry, compatibility reader, or JSON sidecar was created.
- No test suite expansion was performed; one existing diagnostic fixture was updated to represent canonical summaries under the new authority rule.

## Implementation Summary

- Non-canonical Markdown discovered under `planning/` is now readable preview content with `artifactType: legacy-unmanaged` and `participationRole: historical`; it is not reported as canonical corruption.
- Markdown that begins with the canonical metadata delimiter but fails parsing still reports a canonical read error.
- Active Project Intake authority now requires readable canonical metadata, `artifactType: project-intake`, nonhistorical role, no read error, and nonarchive path.
- Lifecycle classification no longer promotes Project Intake or Project Architect Interview records by path alone.
- Legacy unmanaged and historical documents are routed to `Historical and unmanaged documents` under Project Planning instead of active Intake or Architect Interview groups.
- Renderer document inventory refresh now clears stale selected document state when the selected ID is absent from the returned inventory.

## Required Evidence Checklist

1. Proven - Legacy unmanaged Intake was non-authoritative. In the controlled Electron workspace, `LEGACY_INTAKE.md` existed under `planning/project/Project_Intake/`, but Intake count remained `0` and current workspace stayed `Project Intake Capture`.
2. Proven - Legacy unmanaged Architect Interview was non-authoritative. In the same controlled workspace, `LEGACY_INTERVIEW.md` existed under `planning/project/Project_Architect_Interviews/`, but Architect Interview count remained `0` before canonical Intake creation.
3. Proven - A new canonical Intake was created and visibly readable. The Electron UI showed the new `PROJECT_INTAKE_...` document selected, `Canonical Markdown Readable`, and the rendered Intake body.
4. Proven - The Intake disposition dropdown worked. The dropdown opened visibly and showed `Approve`, `Reject`, and `Request Revision`.
5. Proven - Applying `Approved` succeeded. The Electron UI changed Project Intake to `Completed`, showed the Intake as `Approved`, and advanced the rail to Architect Interview.
6. Proven - Architect Interview became the current workspace with a readable prompt. The Electron UI showed Architect Interview as `Waiting for Output`, Prompt selected, and the approved prompt handoff status visible.
7. Proven - Architect output saved and visibly refreshed as Pending. The visible output textarea accepted Markdown, Save Architect Output was clicked, and the UI changed to `Awaiting Approval` with Interview selected and `Interview Review Current: Pending`.
8. Proven - Interview disposition controls were usable. After zooming the Electron UI out, the Interview review dropdown was visible, opened, showed the same review options, and selecting `Approve` enabled `Apply Interview Review`.

## Validation

- `npm run typecheck` in sandbox lane: passed.
- `npm run build` in sandbox lane: failed with documented Vite/esbuild `spawn EPERM`.
- `npm run build` in approved Windows validation lane: passed.
- `npm test` in sandbox lane: failed with documented Vite/esbuild `spawn EPERM`.
- `npm test` in approved Windows validation lane: initially failed 6 stale Project Intake corpus diagnostics because handcrafted summaries lacked canonical metadata.
- Existing Project Intake corpus diagnostic summaries were updated to include canonical metadata.
- `npm test` in approved Windows validation lane after correction: passed, 97 tests passed.

## Checks Skipped

- No Operator acceptance or phase closeout was performed.
- No migration was run because the Work Card explicitly prohibited migration and historical rewrites.

## Temporary Proof Workspace

- A controlled Electron proof workspace was created under `<PROJECT_REPO>/.codex-runtime/wc25-repair07`.
- The proof workspace contained unmanaged legacy Intake and Architect Interview Markdown plus newly created canonical documents produced through the UI.
- The temporary proof workspace was removed before this report was written.

## Security And Local Path Safety

- No secrets, credentials, tokens, API keys, or `.env` files were added.
- Durable report content uses repo-relative paths and `<PROJECT_REPO>`.
- The UI necessarily displayed the local selected workspace path during Electron proof, but no concrete local path was recorded in this report.

## Residual Risks

- The embedded ChatGPT pane trapped focus and obscured part of the Interview review panel at default zoom; zooming out through the actual Electron UI made the review dropdown visible and usable.
- The working tree contains pre-existing WC25-REPAIR06 modifications and untracked controlling artifacts. They were not reverted, staged, committed, or otherwise mutated by this task.

## Git Actions

- Commit created: no.
- Commit hash: none.
- Stage/push/branch/tag/stash/reset/checkout: none.

## Architect Review

Review.Result=Approved
Review.Date=2026-07-27

REPAIR07 is approved for Operator validation.

### Requirement Review

1. `planningDocumentService.ts` now distinguishes unmanaged Markdown from malformed canonical Markdown. Unmanaged files remain readable but receive `artifactType=legacy-unmanaged` and `participationRole=historical`; malformed files beginning with the canonical delimiter retain `readError`.
2. `projectIntakeCorpus.ts` now requires readable canonical metadata and exact `project-intake` type for active Intake authority.
3. `lifecycleArtifact.ts` no longer promotes Project Intake or Architect Interview by path alone and classifies unmanaged or historical documents before lifecycle routing.
4. `documentWorkspace.ts` routes unmanaged and historical documents to `Historical and unmanaged documents` under Project Planning rather than active Intake or Architect Interview groups.
5. `App.tsx` centralizes inventory application through `applyDocumentInventory()` and clears selected ID, preview, and disposition when the selected record is absent. All current `listDocuments()` refresh paths use this function.
6. The Implementer Report records actual Electron-control observations for each of the eight required evidence items, including Intake approval and Architect Interview output review.

### Independent Supporting Validation

- `npm run typecheck`: passed.
- `npm run build`: passed; 1,608 modules transformed.
- `npm test`: passed; 97 passed, 0 failed.
- HEAD remained `c4574453e607287aca9f67b7c274d34034154fd5`.
- No Git mutation occurred.

### Non-Blocking Observation

At default zoom, the embedded ChatGPT pane reportedly obscured part of the Interview review panel. The control remained reachable through the Electron zoom control and the required review interaction completed. This is a UI-layout concern for Operator observation, not a failure of the bounded legacy-authority repair.

Parent WC25 remains unresolved until Operator validation confirms the actual Project Intake and Architect Interview path in the target workspace. No REPAIR08 is authorized by this review.
