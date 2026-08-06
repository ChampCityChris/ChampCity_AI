# Implementer Report - WC46-REPAIR08 Repair Evidence Workspace and Prompt Flow

Pass type: numbered Work Card repair  
Repository path inspected: verified approved repo root (`<PROJECT_REPO>`)  
Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`  
Remote: `origin` / `https://github.com/ChampCityChris/ChampCity_AI.git`  
Git mutation: not performed; Work Card prohibits staging, commit, push, checkout, pull, rebase, merge, stash, reset, clean, and tag.

## Working Status Verification

The working tree was dirty before this pass from the active WC46 repair series. This pass did not attempt to revert unrelated existing changes.

Files changed by this pass:

- `src/main/workCardRepair/workCardRepairService.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/WorkCardRepairWorkspace.tsx`
- `src/renderer/styles.css`
- `test/work-card-repair/work-card-repair-service.test.cjs`
- `test/renderer/work-card-repair-workspace.test.cjs`
- `test/workflow/current-execution-context.test.cjs`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR08_repair_evidence_workspace_and_prompt_flow.md`

Files intentionally not created:

- No Advisory Architect Review document.
- No JSON sidecar.
- No hidden repair state, routing marker, completion marker, migration, dependency, or alternate repair artifact.

## Implementation Summary

`work-card-repair` now exposes an evidence-first projection. For `postValidationRecord` repair origin, the primary repair authority is the current `RevisionRequested` Validation Record. The projection includes `primaryEvidenceDocument`, `supportingEvidenceDocuments`, `operatorValidationNotes`, `advisorySummary`, `repairDefectText`, parent Work Card ID, phase ID, evidence revision, repair target, return target, and handoff status.

The supporting evidence set is deterministic:

- Primary: Validation Record.
- Supporting: Implementer Report.
- Supporting: Formal Work Card.

Missing or unreadable required evidence produces `state: "needs-attention"` with a specific evidence problem instead of silently dropping the missing path.

The Repair workspace UI no longer presents the primary flow as Stage 1 / Stage 2 or `Reuse Repair Handoff`. The left pane is `Repair Evidence` with document tabs and body preview. The Validation Record is selected by default by binding `selectedEvidencePath` to `projection.primaryEvidenceDocument.markdownPath`. The right pane is `Repair Work Card Architect`, with embedded ChatGPT plus `Prepare Repair Work Card Prompt`, `Copy Handoff`, `Reload ChatGPT`, and `Refresh`.

The primary prompt action now collapses internal handoff creation/reuse into one Operator action. `prepareRepairWorkCardPromptFromEvidence()` creates the repair handoff only when the projection has no handoff, then prepares the existing catalog Architect-output handoff for `work-card-repair`.

The prepared Repair Work Card prompt is evidence-bound and selected-workspace-bound. Representative prompt lines now include:

```text
Use the selected project workspace already connected in this task. Treat that selected workspace as <PROJECT_REPO>.
Treat the Validation Record as the repair authority. Do not invent or request a separate advisory-review document.
Read the Validation Record first when this is a post-validation repair.
- Validation Record path: <validation-record-path>
- Implementer Report path: <implementer-report-path>
- Formal Work Card path: <formal-work-card-path>
Repair handoff path: <repair-architect-handoff-path>
Return target: work-card-validation
Final Repair Work Card target: <repair-work-card-target>
```

The prompt scan found no `ChampCityChris`, `champcity_ai`, or `Use ChampCity MCP` wrong-target repository wording in the repair prompt builder.

## Evidence Model Notes

The existing Validation Record writer was preserved. `workCardValidationService.ts` continues to write `operatorValidationNotes`, `advisorySummary`, `repairDefectText`, `formalWorkCardPath`, `implementerReportPath`, and `implementerReportRevision` into Validation Record `workflowData`, and continues to render Operator Validation Notes, Advisory Summary, and Repair Defect Text in the Validation Record body.

Option A was followed: advisory summary remains inside the Validation Record as repair evidence; no separate advisory-review artifact was added.

## Validation Performed

Validation lane used: `docs/dev/VALIDATION_COMMAND_LANES.md`, Lane 1 direct clean-room automated validation. Sandbox `spawn EPERM` was encountered for Vite and Node tests, then rerun once in the documented normal Windows lane.

- `npx tsc --noEmit` / sandbox lane: passed.
- `npx tsc` / sandbox lane: passed.
- `npx vite build` / sandbox lane: failed with documented `spawn EPERM`.
- `npx vite build` / normal Windows lane: passed; 1621 modules transformed.
- Focused `node --test --test-concurrency=1 test/work-card-repair/work-card-repair-service.test.cjs` / normal Windows lane: passed, 5 tests.
- Focused `node --test --test-concurrency=1 test/renderer/work-card-repair-workspace.test.cjs` / normal Windows lane: passed, 1 test.
- Focused `node --test --test-concurrency=1 test/architect-outputs/architect-output-prompt-contracts.test.cjs` / normal Windows lane: passed, 2 tests.
- Focused `node --test --test-concurrency=1 test/architect-outputs/architect-output-workspace-repair.test.cjs` / normal Windows lane: passed, 21 tests.
- Affected `node --test --test-concurrency=1 test/workflow/current-execution-context.test.cjs` / normal Windows lane: passed, 14 tests.
- Full `node --test --test-concurrency=1` / normal Windows lane: passed, 294 tests.
- Safety scan over changed files for concrete local paths and secret-like terms: no new local path or secret findings. The only match was an existing source comment `WC45-REPAIR01` in `src/renderer/styles.css`.
- UI source scan: no `Stage 1`, `Stage 2`, `Reuse Repair Handoff`, `Prepare Repair Handoff`, or `Prepare Architect Prompt` remains in `WorkCardRepairWorkspace.tsx` or the Repair app wiring.

## Validation Skipped

- Electron launch smoke: not performed; Work Card requires automated validation and leaves visual/interactive validation to the Operator unless explicitly authorized.
- Embedded ChatGPT live send/paste and draft creation: not performed; this remains Operator manual validation.
- Git staged diff and commit review: not performed because Git mutation is prohibited.

## Security and Safety Notes

No dependency was added. Renderer still uses typed preload/main contracts and does not receive arbitrary filesystem access. Repair evidence document bodies are read through the existing main-process planning document service and delivered in the bounded projection.

No secrets, credentials, environment-file contents, private keys, or concrete local machine paths were intentionally added to source, tests, or this report.

## Manual Validation Required

Operator should validate in the running app after Architect review:

1. Request Repair from Review & Validation.
2. Confirm Work Card Repair opens with a left-side Repair Evidence viewer.
3. Confirm Validation Record is selected by default.
4. Confirm Implementer Report and Formal Work Card can be selected.
5. Confirm Operator notes, advisory summary, and repair defect text are visible from the Validation Record evidence.
6. Confirm the primary action is `Prepare Repair Work Card Prompt`.
7. Prepare and copy the prompt.
8. Confirm embedded ChatGPT receives the selected-workspace-bound, evidence-bound prompt.
9. Create and promote the Repair Work Card draft.
10. Confirm the Repair Work Card appears for review at the exact repair target path.

## Residual Risks

The full automated lane passed, but the embedded browser flow still requires Operator observation because tests cannot prove live ChatGPT sign-in, paste/send behavior, or remote artifact creation. The repository remains dirty from the broader WC46 repair series, and this pass intentionally did not stage or commit any changes.

## Blocking Questions

None.

## Recommended Next Implementer Task

After Architect review and Operator manual validation, address any observed visual or embedded-browser issues in a separate approved repair card if needed.

Document.Status=Pending
