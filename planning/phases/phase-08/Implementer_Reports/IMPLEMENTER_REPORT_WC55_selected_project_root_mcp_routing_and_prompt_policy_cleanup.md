<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "implementer-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC55"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC55_selected_project_root_mcp_routing_and_prompt_policy_cleanup.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "repositoryVerification": "verified approved repo root",
    "filesChanged": [
      "src/main/integrations/mcpWorkspacePromptContract.ts",
      "src/main/integrations/architectMcpHandoffService.ts",
      "src/main/workCardValidation/workCardValidationService.ts",
      "src/main/workCardBuilding/workCardBuildingReviewService.ts",
      "src/main/workCardBuilding/codexImplementerExecutionService.ts",
      "src/main/workspaceSettings.ts",
      "test/architect-outputs/architect-output-prompt-contracts.test.cjs",
      "test/work-card-validation/work-card-validation-service.test.cjs",
      "test/project-intake/project-intake-service.test.cjs",
      "test/project-planning/project-planning-service.test.cjs",
      "test/work-card-building/codex-implementer-execution-service.test.cjs",
      "test/support/canonical-markdown-fixtures.cjs",
      "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC55_selected_project_root_mcp_routing_and_prompt_policy_cleanup.md"
    ],
    "implementationSummary": "Selected-root MCP prompt routing and Codex prompt-policy cleanup implemented.",
    "validationResults": [
      "npx tsc --noEmit passed",
      "npx tsc passed in normal Windows lane",
      "npx vite build passed in normal Windows lane",
      "focused node --test suite passed 45/45 in normal Windows lane",
      "app-shell node --test suite passed 8/8 in normal Windows lane",
      "full node --test suite passed 330/330 in normal Windows lane"
    ],
    "acceptanceEvidence": [
      "Advisory Architect prompt uses selected-root MCP route and ignores report projectRepository evidence.",
      "Report readiness rejects nested repositoryAuthority mutation against application-owned Work Card authority.",
      "Codex prompt no longer includes the prohibited repository-boundary and local-path lines.",
      "Codex prompt replaces broad artifact prohibition with narrow secret and credential protection.",
      "No generic scan completion gate was added."
    ],
    "blockers": []
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Implementer Report - WC55 Selected Project Root MCP Routing and Prompt Policy Cleanup

Status: Pending Implementer completion.

## Repository Verification

Repository path inspected: verified approved repo root.

Current branch and remote status were inspected with `git status --short --branch`. The branch was already dirty before this WC55 pass, with prior Phase 08 source, test, Work Card, Architect Report, and Implementer Report changes present. Git mutation was prohibited by WC55, so no staging, commit, push, stash, reset, rebase, or cleanup action was performed.

The Operator instructed during this pass that no subagents are approved for decision review going forward. No subagents were used for this pass.

## Implementation Summary

Implemented selected-root MCP routing in the shared prompt contract:

- `requireBoundMcpWorkspace`, `resolveMcpWorkspaceBindingForPrompt`, `buildMcpWorkspaceBindingPromptBlock`, and `buildCreateMarkdownArtifactJsonBlock` now derive the normal route from `path.basename(path.resolve(workspaceRoot))` through the existing normalization convention.
- Mutable artifact workflowData, Implementer Reports, Architect drafts, Work Cards, and metadata `mcpWorkspaceBinding` values no longer override the normal MCP prompt route.
- Explicit `.champcity/mcp-workspace-binding.json` remains readable as Project Intake/workspace metadata evidence, but it is not used to override normal prompt routing.
- Workspace settings reports only an explicit configured binding and does not invent binding metadata for empty selected folders.

Updated Advisory Architect Review routing:

- Advisory prompt generation no longer passes Implementer Report workflowData into MCP route selection.
- A report containing top-level `projectRepository = "repository root"` cannot cause `repository_root` to appear in the advisory prompt.

Added bounded Implementer Report authority enforcement:

- Report readiness now detects nested `workflowData.repositoryAuthority` mutation when it mismatches the application-owned Work Card authority inherited from current source revisions.
- Route selection ignores report repository authority entirely.

Cleaned the Codex Implementer prompt:

- Removed `Do not modify files outside this repository root.`
- Removed `Do not write absolute local machine paths into repository artifacts.`
- Replaced the broad artifact-hygiene prohibition with narrow protection for secrets, credentials, authentication tokens, API/provider keys, and private environment-file contents.
- Added completion guidance that no generic security scan, safety scan, path-sanitization scan, or secret-like-string scan is required unless the Approved Work Card or project validation instructions require it.
- Added explicit guidance that the application owns canonical identity, source revisions, repository authority, and disposition authority in report metadata and that the Implementer must not rewrite those authority fields.

The prompt-policy edit initially triggered tool-layer patch rejections. The Operator then explicitly confirmed that the prior approval statement was intended as approval for this WC55 prompt cleanup after the risk explanation. The normal patch tool subsequently accepted the scoped WC55 edit.

## Files Created

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC55_selected_project_root_mcp_routing_and_prompt_policy_cleanup.md`

## Files Modified

- `src/main/integrations/mcpWorkspacePromptContract.ts`
- `src/main/integrations/architectMcpHandoffService.ts`
- `src/main/workCardValidation/workCardValidationService.ts`
- `src/main/workCardBuilding/workCardBuildingReviewService.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/workspaceSettings.ts`
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`
- `test/work-card-validation/work-card-validation-service.test.cjs`
- `test/project-intake/project-intake-service.test.cjs`
- `test/project-planning/project-planning-service.test.cjs`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- `test/support/canonical-markdown-fixtures.cjs`

Some files in this list were already dirty from prior Phase 08 work before this pass. This pass made only WC55-scoped edits in those files.

## Files Intentionally Not Created

- No JSON sidecar for this report.
- No `.champcity/mcp-workspace-binding.json`.
- No workspace discovery, similarity matching, Git-remote inference, diagnostics search, or cross-workspace fallback.
- No security scanner, path sanitizer, generic security approval gate, or secret-like-string scan gate.
- No commit, tag, branch, or other Git mutation.

## Production Prompt Families Inspected

- Architect Interview / Architect MCP handoff manifest: inspected and updated manifest route resolution to selected-root routing.
- Project Planning: inspected shared MCP route usage and updated tests for selected-root routing despite mutable `projectRepository` evidence.
- Phase Map: inspected shared MCP route usage through service and draft output prompt paths.
- Phase Interview: inspected shared MCP route usage through service and draft output prompt paths.
- Phase Planning: inspected shared MCP route usage through service and draft bundle prompt paths.
- Work Card Planning: inspected shared MCP route usage and selected workspace target display.
- Repair Work Card: inspected shared MCP route usage through Repair Work Card Architect prompt generation.
- Advisory Work Card Validation review: updated to stop using Implementer Report workflowData as route authority.
- Body-only Architect draft artifact invocations: updated through shared `buildCreateMarkdownArtifactJsonBlock`.
- Codex Implementer execution prompt: cleaned overbroad path/artifact rules and added WC55 completion guidance.

Additional equivalent generic path-sanitization or pseudo-security completion gate found and changed:

- Codex Implementer prompt broad artifact-hygiene line was found and replaced.
- Codex Implementer prompt now states auxiliary scans do not replace Work Card acceptance criteria.

No production generic security scan gate was found or added.

## Acceptance Criteria Evidence

1. `ChampCity_PDL` selected root produces `champcity_pdl`: covered by focused prompt-contract and advisory prompt tests.
2. Observed defect reproduced: `test/work-card-validation/work-card-validation-service.test.cjs` verifies report `projectRepository = "repository root"` does not produce `repository_root`.
3. Advisory Architect Review derives MCP routing from selected root: `buildAdvisoryArchitectReviewPrompt` now calls the shared prompt block without report workflowData.
4. Current production MCP prompt families use selected-root route: shared helper now ignores workflowData for normal route; production catalog prompt matrix passed.
5. No explicit binding, Git remote, diagnostics search, or cross-workspace fallback required: prompt contract tests cover unbound and Git-backed selected roots without override.
6. Generated prompts continue to contain one literal workspaceId and prohibit workspace switching/search: prompt contract tests passed.
7. Implementer Report readiness detects repository-authority mutation: new readiness test rejects mutated nested `repositoryAuthority`.
8. Codex prompt no longer contains `Do not modify files outside this repository root.`: Codex execution prompt test asserts absence.
9. Codex prompt no longer contains `Do not write absolute local machine paths into repository artifacts.`: Codex execution prompt test asserts absence.
10. Broad production endpoint/screenshot/archive/build-output prohibition removed and replaced by narrow secret protection: Codex execution prompt test asserts absence and replacement.
11. No generic scan is an implicit completion gate: Codex execution prompt test asserts required WC55 language.
12. This report lists every production prompt family inspected and records the changed equivalent language above.
13. Existing prompt contract, Codex execution, Work Card validation, retry/cancellation, artifact promotion, and lifecycle tests passed in the full suite.
14. Validation lane results are listed below. The repository currently uses direct clean-room validation commands per `docs/dev/VALIDATION_COMMAND_LANES.md`.

## Commands and Results

- `pwd`: passed; verified approved repo root.
- `git status --short --branch`: passed; showed pre-existing dirty worktree plus WC55-touched files.
- `Get-Content -Raw docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`: passed; boundary read before production edits.
- `Get-Content -Raw docs/dev/VALIDATION_COMMAND_LANES.md`: passed; validation lane read before validation.
- `Get-Content -Raw planning/phases/phase-08/Work_Cards/WC55_selected_project_root_mcp_routing_and_prompt_policy_cleanup.md`: passed; approved Work Card read.
- `rg` prompt and route searches: passed; used as prompt inventory/supporting search, not as a security scan gate.
- `npx tsc --noEmit`: passed.
- `npx tsc`: sandbox run failed with documented `EPERM` write mode; normal Windows lane rerun passed.
- `node --test --test-concurrency=1 test/architect-outputs/architect-output-prompt-contracts.test.cjs test/work-card-validation/work-card-validation-service.test.cjs test/project-intake/project-intake-service.test.cjs test/project-planning/project-planning-service.test.cjs test/work-card-building/codex-implementer-execution-service.test.cjs`: sandbox run failed with documented `spawn EPERM`; normal Windows lane reruns passed 45/45.
- `npx vite build`: sandbox run failed with documented esbuild `spawn EPERM`; normal Windows lane rerun passed.
- `node --test --test-concurrency=1 test/app-shell/app-shell.test.cjs`: normal Windows lane passed 8/8 after workspace settings correction.
- `node --test --test-concurrency=1`: normal Windows lane initially passed 328/330, with two workspace-settings tests failing because selected-root route was being exposed as invented binding metadata. After correcting workspace settings to report only explicit configured binding metadata, final full run passed 330/330.

## Validation Performed

- Static typecheck: `npx tsc --noEmit` passed.
- Main/preload/shared/renderer TypeScript compile: `npx tsc` passed in normal Windows lane.
- Renderer production build: `npx vite build` passed in normal Windows lane.
- Focused WC55 tests: 45/45 passed in normal Windows lane.
- App-shell regression tests: 8/8 passed in normal Windows lane.
- Full compiled Node suite: 330/330 passed in normal Windows lane.

Execution lane used:

- Direct clean-room validation for commands that did not hit sandbox restrictions.
- Normal Windows lane for `npx tsc`, `npx vite build`, and `node --test` after the documented sandbox `EPERM`/`spawn EPERM` failure mode appeared.

## Validation Skipped

- Operator manual validation was not performed by the Implementer. WC55 reserves embedded ChatGPT/MCP live confirmation and normal Codex Implementer cycle judgment for the Operator.
- No Electron launch smoke was performed because WC55 did not require Implementer live UI acceptance and automated production-path tests passed.

## Manual Validation Required

Using the selected `ChampCity_PDL` project, the Operator should:

1. Generate an Advisory Architect Review prompt from the current repair report even if that report contains the descriptive `projectRepository = "repository root"` value.
2. Confirm the prompt says `Bound workspaceId: champcity_pdl` and `Use ChampCity MCP workspaceId "champcity_pdl" only.`
3. Confirm `repository_root` does not appear.
4. Send the prompt to embedded ChatGPT and confirm it can read the exact Work Card and Implementer Report from `champcity_pdl` without workspace mismatch.
5. Run a normal Codex Implementer cycle and confirm the production prompt does not instruct Codex to sanitize absolute paths, remain inside the repository for tool installation, or run a generic security/safety scan as a completion requirement.

## Security and Secret-Safety Notes

No secrets, credentials, authentication tokens, API/provider keys, or private environment-file contents were introduced. The Codex prompt retains real secret/credential protection while removing broad artifact and path language that WC55 identified as overbroad. Renderer filesystem authority was not broadened.

## Git Actions

No Git mutation performed. WC55 prohibits Git mutation.

Current worktree remains dirty because it already contained unrelated prior Phase 08 changes before this WC55 pass, and this pass added WC55-scoped edits and this report.

## Residual Risks

- The Implementer cannot perform Operator-owned embedded ChatGPT/MCP validation.
- Several files touched by WC55 were already dirty before this pass; final review should distinguish WC55 changes from prior Phase 08 work.

## Blocking Questions

None.

## Recommended Next Implementer Task

Operator manual validation for WC55 using the selected `ChampCity_PDL` project and embedded ChatGPT MCP access.

Document.Status=Pending
