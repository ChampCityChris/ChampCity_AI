# IMPLEMENTER REPORT WC47 - Architect Interview Prompt Regeneration and Handoff Labeling

Status: Pending Architect/Operator review  
Pass type: numbered Work Card implementation  
Work Card: `WC47_architect_interview_prompt_regeneration_and_handoff_labeling`  
Repository path inspected: verified approved repo root (`<PROJECT_REPO>`)  
Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`  
Remote: `origin` configured for `https://github.com/ChampCityChris/ChampCity_AI.git`  
Git mutation: prohibited by Work Card; no staging, commit, push, checkout, pull, rebase, merge, reset, clean, stash, or tag was performed.

## RCA Confirmation

Confirmed. The durable Project Architect Interview Prompt writer was coupled to Project Intake submission, while Architect Interview handoff preparation only creates/reuses the runtime temporary draft submission. When the prompt Markdown was deleted after Intake approval, Architect Interview resolved that as a generic missing prerequisite with no visible recovery action. The `Prepare Handoff` label also blurred two distinct concepts: durable prompt-document regeneration and runtime ChatGPT handoff preparation.

## Files Created

- `src/main/architectInterview/projectArchitectInterviewPromptWriter.ts`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC47_architect_interview_prompt_regeneration_and_handoff_labeling.md`

## Files Modified By This Pass

- `src/main/projectIntake/projectIntakeService.ts`
- `src/main/architectInterview/architectInterviewContextResolver.ts`
- `src/main/architectInterview/architectInterviewService.ts`
- `src/main/architectOutputs/architectOutputWorkspaceService.ts`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/App.tsx`
- `test/architect-interview/architect-interview-workspace.test.cjs`
- `test/renderer/figma-redesign-shell.test.cjs`

The worktree already contained many unrelated modified/untracked WC46-era files before this pass. They were not reverted.

## Files Intentionally Not Created

- No JSON sidecars.
- No migration scripts or legacy migration support.
- No MCP binding file requirement.
- No provider SDK, database, authentication, cloud service, or dependency.
- No Operator acceptance record.

## Implementation Summary

- Extracted deterministic Project Architect Interview Prompt construction into a shared writer used by Project Intake submission and Architect Interview recovery.
- Added a recoverable `prompt-missing` Architect Interview domain state when exactly one readable Approved Project Intake exists and the deterministic prompt target is absent.
- Added idempotent prompt regeneration through the existing Architect-output IPC namespace: `architectOutput:regenerateInterviewPrompt`.
- Regeneration writes the deterministic prompt path, Approved disposition, current Intake source revision, `projectRepository`, `repositoryAuthority.projectRepository`, `projectSlug`, and `architectOutputTargets.markdown`.
- Regeneration refuses to overwrite an existing nonmatching deterministic prompt target.
- Runtime ChatGPT handoff preparation remains separate and still creates/reuses temporary body-only drafts under `planning/Architect_Drafts/...`.
- Architect Interview browser actions now show `Regenerate Interview Prompt`, `Prepare ChatGPT Handoff`, and `Copy ChatGPT Handoff` contextually.
- The missing-prompt workspace selects the Approved Project Intake as the inspectable evidence document instead of leaving the document panel empty.

## Before / After Behavior

Before: deleting `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<projectSlug>.md` after Intake approval left Architect Interview in a generic prerequisite failure with no recovery button.

After: the workspace reports the prompt as missing but recoverable, shows the Approved Project Intake as evidence, enables `Regenerate Interview Prompt`, recreates the durable prompt, refreshes to waiting-for-output, and then enables `Prepare ChatGPT Handoff`.

## Proof Points

- Project Intake is not rewritten during regeneration: `test/architect-interview/architect-interview-workspace.test.cjs` captures Intake bytes before deletion/regeneration and asserts they are unchanged after regeneration.
- Conflicting target files are not overwritten: the same suite writes a nonmatching file at the deterministic prompt path, verifies `needs-attention`, asserts regeneration throws, and asserts the file bytes are unchanged.
- Runtime handoff preparation remains runtime-only: the regeneration test captures regenerated prompt bytes and asserts `prepareArchitectOutputHandoff` leaves them unchanged while creating a prepared temporary draft instruction.
- `champcity_pdl` routing is preserved: the regeneration test uses a `ChampCity_PDL` workspace folder and verifies the prepared invocation uses literal workspaceId `champcity_pdl` with no workspace-inference instruction.
- Compact Architect draft IDs are preserved: the focused suite asserts regenerated prompt handoff submission IDs match `src-<20-hex>-r1`, remain below 240 characters, and do not embed the long prompt path.

## Acceptance Criteria Mapping

1-4: Covered by regeneration test metadata/path assertions.  
5: Covered by Intake byte-stability assertion.  
6: Covered by conflicting-target no-overwrite test.  
7-9: Covered by `prompt-missing` model assertions and generic Architect-output model flags.  
10: Covered by prompt byte-stability after `prepareArchitectOutputHandoff`.  
11-12: Covered by `champcity_pdl` route and compact draft ID assertions.  
13: Covered by delete-prompt, reopen/refresh model, regenerate, prepare, and copy-availability assertions.  
14: Covered by existing Project Intake service test after writer extraction.  
15-17: No migration, unrelated workflow behavior, or Git mutation was introduced.

## Commands Run And Results

- `pwd` from `<PROJECT_REPO>`: exit 0, confirmed approved repo root.
- `git status --short --branch`: exit 0, showed pre-existing dirty feature branch plus this pass changes; read-only.
- `git remote -v`: exit 0, confirmed `origin`.
- `Get-Content` on required boundary and validation docs: exit 0 for `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` and `docs/dev/VALIDATION_COMMAND_LANES.md`.
- `Get-Content` on legacy governance protocol paths: exit 1 because files are absent; current boundary says those deleted legacy files are superseded and must not block Phase 08 work.
- `npx tsc --noEmit`: Lane 1 direct, exit 0.
- `npx tsc`: sandbox Lane 1 attempt, exit 1 with `TS5033 EPERM` writes under `dist/`.
- `npx tsc`: normal Windows lane rerun, exit 0.
- Focused `node --test --test-concurrency=1` suites in sandbox: exit 1 with documented `spawn EPERM` before assertions.
- Focused suites in normal Windows lane:
  - `test/architect-interview/architect-interview-workspace.test.cjs`: exit 0, 10/10 tests passed.
  - `test/project-intake/project-intake-service.test.cjs`: exit 0, 3/3 tests passed.
  - `test/renderer/figma-redesign-shell.test.cjs`: exit 0, 8/8 tests passed.
- `npx vite build`: sandbox Lane 1 attempt, exit 1 with documented esbuild `spawn EPERM`.
- `npx vite build`: normal Windows lane rerun, exit 0; 1622 modules transformed.
- `node --test --test-concurrency=1`: normal Windows lane, exit 0; 318/318 tests passed.
- Hidden Electron non-acceptance smoke: normal Windows lane, exit 0; process stayed alive for 8 seconds and was stopped.
- Final focused Architect Interview suite after adding prompt byte-stability assertion: normal Windows lane, exit 0; 10/10 tests passed.

## Validation Skipped

- Operator manual validation was not performed by the Implementer. The Work Card reserves acceptance for Architect/Operator review.
- No external ChatGPT sign-in, live MCP write-back, or human usability acceptance was claimed.
- No Git staging/commit/push validation was performed because WC47 prohibits Git mutation.

## Security And Safety Notes

- No secrets, credentials, API keys, token values, `.env` contents, private keys, screenshots, archives, or build-output artifacts were intentionally added to durable artifacts.
- Renderer filesystem authority was not broadened; regeneration remains mediated through typed preload and main-process IPC.
- Durable report paths use repo-relative paths and `<PROJECT_REPO>`.
- Safety scans found only pre-existing policy wording, token-count fixture field names, and existing report text; no introduced secret values or concrete local machine paths were identified in this pass surface.

## Manual Validation Required

Operator should verify the WC47 manual scenario in the built app: delete only the generated Project Architect Interview Prompt after Approved Intake, refresh Architect Interview, confirm `Regenerate Interview Prompt`, regenerate, confirm the prompt exists and Intake is unchanged, prepare/copy the ChatGPT handoff, verify temporary draft path under `planning/Architect_Drafts/...`, verify workspaceId `champcity_pdl` for a `ChampCity_PDL` project, and confirm no long draft ID failure occurs.

## Residual Risks

- The UI labels and recovery action are covered by source and service tests plus startup smoke, but final usability acceptance remains Operator-owned.
- The worktree contains unrelated pre-existing dirty/untracked WC46 artifacts; this pass did not stage or isolate a Git diff because Git mutation is prohibited.

## Blocking Questions

None.

## Recommended Next Implementer Task

Architect review of WC47, followed by Operator manual validation of the missing-prompt recovery workflow.
