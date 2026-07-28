<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "implementer-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC25-REPAIR06"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC25-REPAIR06_full_lifecycle_content_ingestion_migration_blocking_and_running_product_completion.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/RCA_WC25_REPAIR05_INCOMPLETE_FULL_LIFECYCLE_CONTENT_INGESTION_AND_MIGRATION_BLOCKING.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "reportKind": "final-implementer-report",
    "workCardId": "WC25-REPAIR06",
    "commitCreated": false
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "Operator screenshots prove the running product fails at Project Intake and Architect Interview because unreadable path-classified legacy records are treated as active workflow authority. No migration is required; isolate historical/unreadable records from current-state resolution and prove the actual UI workflow.",
    "reviewedAt": "2026-07-27"
  }
}
CHAMPCITY-METADATA -->

# Implementer Report - WC25-REPAIR06

## Repository

- Repository path inspected: verified approved repo root `<PROJECT_REPO>`.
- Branch: current working tree branch inspected; no Git mutation performed.
- Remote status: not changed.
- Work Card executed: `planning/phases/phase-08/Work_Cards/WC25-REPAIR06_full_lifecycle_content_ingestion_migration_blocking_and_running_product_completion.md`.
- RCA read first: `planning/phases/phase-08/Architect_Reports/RCA_WC25_REPAIR05_INCOMPLETE_FULL_LIFECYCLE_CONTENT_INGESTION_AND_MIGRATION_BLOCKING.md`.

## Files Modified

- `src/main/documents/canonicalMarkdownDocumentWriter.ts`
- `src/main/projectPlanning/projectPlanningService.ts`
- `src/main/phaseMap/phaseMapService.ts`
- `src/main/phaseInterview/phaseInterviewService.ts`
- `src/main/phasePlanning/phasePlanningService.ts`
- `src/main/workCardPlanning/workCardPlanningService.ts`
- `src/main/workCardRepair/workCardRepairService.ts`
- `src/main/architectInterview/architectInterviewContextResolver.ts`
- `src/main/architectInterview/architectInterviewService.ts`
- `src/main/currentWorkflow/currentWorkflowService.ts`
- `src/main/migrations/pairedArtifactsToCanonicalMarkdownV1.ts`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/renderer/app/App.tsx`
- `src/shared/workspaceContracts.ts`
- `test/work-card-planning/work-card-planning-service.test.cjs`

## Files Created

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR06_full_lifecycle_content_ingestion_migration_blocking_and_running_product_completion.md`

## Files Intentionally Not Created

- No JSON sidecars.
- No Work Card specific permanent test island.
- No `WC25-REPAIR07`.
- No generic submission service, registry, creation contract, context key, target token, or caller-supplied authority layer.
- No compatibility aliases for deleted legacy Architect Interview repair paths.

## Implementation Summary

- Added a multi-document canonical Markdown writer and used it for atomic Project Profile/Roadmap and Phase Planning/Work Card Plan installs.
- Added application-owned save/import services for Project Planning, Phase Map, Phase Interview, Phase Planning, Formal Work Card, and Repair Work Card outputs.
- Added exact IPC channels and preload methods required by the Work Card:
  `projectPlanning:saveOutputs`, `phaseMap:saveOutput`, `phaseInterview:saveOutput`, `phasePlanning:saveOutputs`, `workCardPlanning:saveOutput`, and `workCardRepair:saveOutput`.
- Added renderer fields and save actions for later Architect-authored outputs, with refresh and selection after save.
- Changed current-workflow progression so the running app advances to the next missing lifecycle workspace after approvals and handoffs.
- Changed repair evidence path handling to normalize Windows separators so valid RevisionRequested evidence is not hidden.
- Derived Architect Interview identity from current Project Intake and Prompt evidence and made duplicate active Architect Interview identity a hard conflict.
- Removed normal-runtime Architect Interview legacy envelope repair API, IPC, preload method, renderer control, JSON review helpers, and legacy extraction helpers.
- Changed paired-artifact migration so Markdown/JSON authority mismatches block apply and leave originals unchanged.
- Changed duplicate legacy migration identity detection to use `{ artifactType, identity }` rather than target path.

## Running Application Proof

Controlled Electron proof used a temporary workspace under `<PROJECT_REPO>/.codex-runtime/wc25-repair06`, then removed that scratch directory after proof.

Observed running application behavior:

- The live Electron renderer title was `ChampCity A/I`.
- The visible page text showed the selected controlled workspace and current required workspace.
- Main lifecycle path reached `Implementer Handoff and Report Review` for `phase-01 / WC01`.
- The visible body included Project Intake, Architect Interview, Project Planning, Phase Map, Phase Interview, Phase Planning, Work Card Intake, Work Card Planning, Implementer Handoff and Report Review, and Work Card Repair lifecycle rows.
- Renderer preload API exposed all required save/import methods.
- `window.champcity.saveRepairWorkCardOutput()` saved `WC01-REPAIR01` through the running app and returned a Pending repair Work Card path.
- The saved repair Work Card metadata contained `artifactType: repair-work-card`, `workCardId: WC01-REPAIR01`, `repairId: WC01-REPAIR01`, and `parentWorkCardId: WC01`.
- Renderer migration preview returned `state: not-required`, `readyCount: 0`, `blockedCount: 0`, `itemCount: 0` for the clean controlled workspace.
- Controlled migration conflict proof showed revision/disposition mismatches as `blocked` and apply threw without deleting the legacy JSON or rewriting the legacy Markdown.
- Controlled duplicate identity proof showed duplicate legacy identities as blocked for both documents.
- Controlled Architect Interview duplicate identity proof returned `status: conflict`.

## Checks Run

- `npm run typecheck` in sandbox lane: passed.
- `npm run build` in sandbox lane: failed with documented Vite/esbuild `spawn EPERM`.
- `npm run build` in approved Windows validation lane: passed.
- `npm test` in sandbox lane: failed with documented Vite/esbuild `spawn EPERM`.
- `npm test` in approved Windows validation lane: passed, 97 tests passed.
- Controlled migration conflict diagnostic: passed, apply blocked and originals remained unchanged.
- Controlled duplicate legacy identity diagnostic: passed, both duplicates blocked.
- Controlled Architect Interview duplicate identity diagnostic: passed, resolver returned conflict.
- Running Electron renderer proof through live preload API: passed.
- `git status --short`: run for final reconciliation.

## Checks Skipped

- No Operator manual acceptance was performed. Implementer proof was limited to automated checks, code-level inspection, and running-app non-acceptance smoke proof.

## Independent Verification

Read-only subagent verification was requested after implementation. Findings:

- Duplicate active Architect Interview identity was still path-oriented. Corrected by making same canonical identity at different paths a conflict.
- Legacy pair reading remained in `src/main/migrations/pairedArtifactsToCanonicalMarkdownV1.ts`. This is allowed by the Work Card because legacy pair reading may remain only in that migration boundary and migration fixtures.

## Security And Safety

- No secrets, credentials, API keys, tokens, or `.env` files were added.
- Durable report paths use repo-relative paths and `<PROJECT_REPO>` only.
- No Git commit, branch, stage, reset, checkout, merge, pull, push, tag, or stash operation was performed.
- Temporary running-app proof files under `<PROJECT_REPO>/.codex-runtime/wc25-repair06` were removed before final reporting.

## Manual Validation Required

- Operator may manually review the changed source and rerun the Electron workflow if desired.
- Operator retains final Work Card acceptance authority.

## Residual Risks

- The Electron proof used the live renderer/preload API and visible renderer text through Electron remote debugging, not mouse-driven desktop automation, because the Windows automation execution hook was unavailable during final proof.
- Existing untracked RCA and Work Card inputs remain in the working tree because they were supplied as controlling artifacts and were not created or mutated by this implementation.

## Git Actions

- Commit created: no.
- Commit hash: none.
- Git mutation: none.

## Architect Review

Review.Result=RevisionRequested
Review.Date=2026-07-27

The running product failed Operator inspection at the first two workflow gates. This overrides the report's remote-debugging and API-driven completion claim.

### Operator-Observed Failures

1. In Project Intake, `PROJECT_INTAKE_champcity_ai.md` appears as the current Intake but the preview reports `Document could not be read as canonical Markdown` and `Local Error`.
2. The disposition dropdown and Apply button are disabled because `App.tsx` derives `selectedDocumentHasLocalError` from the selected summary's `readError`.
3. Architect Interview remains blocked by the same unreadable Intake state and shows unreadable or stale document entries rather than a usable current workflow.

### Root Cause

This is not evidence that historical documents must be migrated. It is an active-state isolation defect.

`src/shared/projectIntake/projectIntakeCorpus.ts` treats a document as active Project Intake when either its metadata says `artifactType=project-intake` or merely because its path is under `planning/project/Project_Intake/`. An unreadable legacy Markdown file has no trustworthy canonical metadata, but the path fallback still makes it current workflow authority.

`src/shared/workspaces/documentWorkspace.ts` repeats the same path-based fallback for Project Intake and Architect Interview grouping, so unreadable historical records appear in active workspace counts and document lists.

The exact screenshot Intake path was not present in the repository when independently checked after the failure. The application therefore displayed stale or legacy evidence as current authority rather than deriving current state only from readable repository evidence.

### Required Correction — No Migration

1. In `isActiveCanonicalProjectIntake()`, require all of the following:
   - `document.metadata.canonical` exists;
   - `document.metadata.artifactType === "project-intake"`;
   - `document.documentReadState === "readable"`;
   - `!document.readError`;
   - participation role is not `historical`;
   - path is not archived.
2. Remove `isCanonicalProjectIntakePath()` as an alternative source of active authority. Path may support display classification only; it must not establish current workflow authority.
3. In `documentWorkspace.ts`, do not place unreadable path-only legacy records in active Project Intake or Architect Interview groups. Exclude them from active workspace counts and groups or route them to a non-authoritative historical or context group.
4. Ensure Project Intake submission resolves an `open` current corpus when only unreadable historical files exist, writes a new readable canonical Intake and Prompt, selects that Intake, and enables disposition.
5. After approving the readable current Intake, prove in the running application that Architect Interview becomes current, the prompt is readable, the output field is usable, and the Interview can be saved and reviewed.
6. Clear stale selected-document state when a listed file no longer exists after refresh.

### Evidence Required

Use the actual Electron controls, not remote-debugging API calls:

- create or load a current canonical Project Intake;
- select it and visibly read its preview;
- choose `Approved` from the disposition dropdown;
- apply disposition successfully;
- observe Architect Interview become current;
- read the prompt preview;
- paste and save Architect Interview output;
- observe the saved Interview preview and disposition controls.

Historical files may remain untouched. No migration is required.

The mandatory requirement-to-evidence checklist is also absent from the report, so the report did not satisfy its own completion authority. Continue under WC25-REPAIR06. Do not create REPAIR07.
