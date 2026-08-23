# Implementer Report: RECONSTRUCTION-REPAIR01 Single Workflow Authority and Context-Document Projection

## Pass Type

Temporary pre-dogfood reconstruction repair.

## Repository / Branch / Status Verification

- Repository path inspected: verified approved repo root (`<PROJECT_REPO>`).
- Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Remote: `origin` is the approved public repository.
- Initial worktree status: dirty before this pass. There were many pre-existing deleted planning files, untracked reconstruction files, and modified source files unrelated to this repair.
- Final relevant status: modified files listed below plus new reconstruction regression/report files. No staging, commit, push, branch switch, rebase, tag, reset, clean, restore, or stash was performed.

## Exact Defect And Code Path

The inspected pre-correction path had three conflicting authorities:

1. `src/shared/documents/documentOrder.ts` already excluded `contextOnly`, `historical`, and `nonReviewHandoff` documents from current lifecycle gating.
2. `src/shared/workspaces/documentWorkspace.ts` still projected documents by path/filename heuristics. It sent `legacy-unmanaged` / `historical` Markdown to `project-planning-review` as historical/unmanaged material and treated `design_documents` as a Phase Planning heuristic.
3. `src/renderer/app/App.tsx` had a local `isWorkflowReviewDocument()` that allowed every document except `nonReviewHandoff`, so canonical `contextOnly` documents and plain historical/unmanaged Markdown could be selected as workflow review documents.

When a Project Planning Architect-output workspace model loaded, `App.tsx` also allowed `architectOutputModel.railStatus` to overwrite the repository-derived rail status for `project-planning-review`. That made the active workspace projection capable of presenting a different lifecycle state from the semantic repository projection.

## Root Cause

Workflow authority and document presentation were split across semantic lifecycle classification, path-based workspace projection, and a duplicate renderer review predicate. The path/renderer layers could promote context and historical documents into lifecycle review selection even though the semantic lifecycle resolver already treated them as non-gating evidence.

## Files Modified

- `src/shared/workspaces/documentWorkspace.ts`
- `src/renderer/app/workflowReviewDocuments.ts`
- `src/renderer/app/App.tsx`
- `test/renderer/document-review-surface-source.test.cjs`

Note: `src/renderer/app/App.tsx` already contained unrelated pending edits before this pass. This repair only added the strict review-predicate import and changed `documentIdForWorkflowStep()` to require semantic review eligibility for resolver-preferred, current, still-selected, and fallback review documents.

## Files Created

- `test/reconstruction/reconstruction-repair01.test.cjs`
- `repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01_single_workflow_authority_and_context_document_projection.md`

## Files Intentionally Not Created

- No Project Profile placeholder.
- No Project Roadmap placeholder.
- No canonical Project Planning output in the live repository.
- No new persistent workflow-state store.
- No schema migration.
- No filename allowlist for ChampCity A/I reconstruction files.

## Implementation Summary

- `classifyPlanningDocument()` now consults `classifyLifecycleArtifact()` first so canonical semantic metadata and participation role drive workspace projection where available.
- Removed `design_documents` from the Phase Planning path heuristic.
- Historical/unmanaged documents are grouped as `Reference and history`, not as lifecycle review authority.
- Context-only documents are grouped as `Context documents`, and remain reference material.
- `src/renderer/app/workflowReviewDocuments.ts` now defines strict lifecycle review eligibility:
  - canonical metadata present;
  - readable and non-error;
  - participation role is `gatingReview` or `compoundGatingReview`;
  - optional workspace argument must match the semantic lifecycle workspace.
- `App.tsx` now uses the strict helper and does not preserve or auto-select non-review documents when navigating workflow steps.

## Reconstruction Regression Fixture

Added `test/reconstruction/reconstruction-repair01.test.cjs`.

The fixture builds the exact cleaned reconstruction shape:

- Approved canonical Project Intake.
- Approved canonical Project Architect Interview Prompt referencing Intake.
- Approved canonical Project Architect Interview referencing Intake and Prompt.
- Approved canonical `contextOnly` Current Application Baseline under `planning/project/Design_Documents/`.
- Approved canonical `contextOnly` Future Application Design under `planning/project/Design_Documents/`.
- Plain noncanonical Work Card and Repair Card standard under the same directory.
- Substantive source under `src/`.
- No Project Profile, no Project Roadmap, no `planning/phases/` corpus, and no Architect drafts.

The regression verifies:

- top rail inputs resolve Project Intake Completed, Architect Interview Completed, Project Planning Ready;
- Project Planning model reports `reconciliation-required`, `ready-for-handoff`, and `canPrepareHandoff=true`;
- Project Planning Architect-output workspace model remains Ready and handoff-preparable;
- context and historical documents are not Phase Planning documents and fail strict lifecycle review eligibility;
- no Project Planning review document is selected from context/historical material;
- preparing the handoff uses the existing Project Planning handoff/draft-bundle path.

## Validation Performed

- `npm run typecheck`
  - Lane: package validation.
  - Result: passed.
- `npm run build`
  - Lane: sandbox first, then normal Windows execution lane due documented `spawn EPERM`.
  - Sandbox result: failed while Vite/esbuild loaded config with `spawn EPERM`.
  - Normal Windows result: passed.
- `node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs test/workspaces/workspace-document-review.test.cjs test/renderer/document-review-surface-source.test.cjs test/renderer/architect-output-workspace-source.test.cjs test/renderer/figma-redesign-shell.test.cjs test/reconstruction/reconstruction-repair01.test.cjs`
  - Lane: sandbox first, then normal Windows execution lane due documented `spawn EPERM`.
  - Sandbox result: failed before executing tests with `spawn EPERM`.
  - Normal Windows result: passed, 40 tests passed.

## Preserved True-Blocker Coverage

The focused lane retained existing Project Planning tests for:

- greenfield/source mismatch blocking;
- unmanaged exact target collision blocking;
- source revision invalidation;
- invalid handoff role blocking;
- partial and malformed draft bundle handling;
- synchronized bundle disposition behavior.

## Safety / Secret Notes

- Local safety scan over changed source/test/repair surfaces found no sensitive credential material or concrete local machine paths.
- The report uses `<PROJECT_REPO>` and repo-relative paths only.

## Validation Skipped

- Full `npm test`: skipped because the repair card explicitly requested focused validation and did not require the full historical suite.
- Electron launch smoke: skipped because the repair card reserves live workflow acceptance for Operator validation.
- Operator live validation: not performed by Implementer.

## Deviations

- The older deleted governance protocol files referenced by the legacy AGENTS tail were absent. `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` states those deleted protocol files are superseded for the current clean-room build, so this pass continued under the repair card, repository boundary, and validation-lane authority.
- The reconstruction regression validates the renderer predicate by source-level renderer tests and by the compiled shared lifecycle classification rule, because Vite bundles renderer helpers rather than emitting `dist/renderer/app/workflowReviewDocuments.js`.

## Git Actions

- Commit created: no.
- Commit hash: not applicable.
- Tag created: no.
- Push performed: no.
- Reason: the Repair Card forbids Git mutation unless separately authorized by the Operator.

## Remaining Operator Live Validation Required

1. Launch ChampCity A/I against the cleaned reconstruction corpus.
2. Verify Architect Interview remains Completed.
3. Verify Project Planning shows Ready before entering the workspace.
4. Enter Project Planning.
5. Verify Project Planning remains Ready.
6. Verify no context/historical standards document is presented as the current lifecycle review artifact.
7. Verify `Prepare Project Planning Handoff` is enabled.
8. Prepare the Project Planning handoff.
9. Verify the workspace transitions to the normal waiting-for-output/copy-handoff state.
10. Continue through creation/promotion of Project Profile + Roadmap and verify their compound review controls.

## Residual Risks

- Existing unrelated dirty worktree changes remain and were not modified or reverted.
- The live Electron UI was not manually exercised by the Implementer; Operator validation is still required.

## Blocking Questions

None.

## Recommended Next Implementer Task

After Architect review and Operator live validation, address any live UI observations as a follow-up bounded repair if the runtime behavior differs from the focused regression.
