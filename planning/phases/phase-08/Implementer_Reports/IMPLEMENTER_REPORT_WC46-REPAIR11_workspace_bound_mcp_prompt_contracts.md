# Implementer Report - WC46-REPAIR11 Workspace-Bound MCP Prompt Contracts

Status: Pending Architect/Operator review

## Pass Type

Numbered repair Work Card implementation pass.

## Repository Path Inspected

Verified approved repo root: `<PROJECT_REPO>`.

## Git Branch And Remote Status

- Branch inspected: `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Remote inspected: `origin` points to `https://github.com/ChampCityChris/ChampCity_AI.git`.
- Git mutation authorized: no.
- Git actions performed: read-only `git status`, `git remote -v`, `git diff --stat`, and `git diff --name-only`.
- Commit created: no.
- Commit hash: not applicable; Git mutation was prohibited.
- Tag created: no.

## Implementation Summary

Added one shared main-process MCP prompt contract helper at `src/main/integrations/mcpWorkspacePromptContract.ts`. It resolves a concrete bound MCP workspace descriptor from a repo-contained `.champcity/mcp-workspace-binding.json` file or an unambiguous Git remote fallback, builds the shared prompt preflight, and builds `artifact_toolbox.create_markdown_artifact` JSON examples with the literal bound workspace ID.

All active generated MCP prompt families now consume that shared helper. Prompt generation throws a blocked `BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH` error when no concrete binding can be resolved.

The selected workspace contract now exposes optional `mcpWorkspaceBinding` state when available, and the Architect handoff manifest now reports the bound MCP workspace binding instead of a repository placeholder.

The active Architect Interview prompt family had the same defect class even though it was outside the minimum file list. It was repaired as a narrowly necessary adjacent generated MCP prompt path so the production catalog cannot retain a cross-workspace escape hatch.

## Files Created

- `src/main/integrations/mcpWorkspacePromptContract.ts`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR11_workspace_bound_mcp_prompt_contracts.md`

## Files Modified

- `src/main/architectInterview/architectInterviewDraftPilot.ts`
- `src/main/architectInterview/architectInterviewService.ts`
- `src/main/integrations/architectMcpHandoffService.ts`
- `src/main/phaseInterview/phaseInterviewDraftOutput.ts`
- `src/main/phaseInterview/phaseInterviewService.ts`
- `src/main/phaseMap/phaseMapDraftOutput.ts`
- `src/main/phaseMap/phaseMapService.ts`
- `src/main/phasePlanning/phasePlanningDraftBundle.ts`
- `src/main/phasePlanning/phasePlanningService.ts`
- `src/main/projectPlanning/projectPlanningDraftBundle.ts`
- `src/main/projectPlanning/projectPlanningService.ts`
- `src/main/workCardPlanning/workCardPlanningService.ts`
- `src/main/workCardRepair/workCardRepairService.ts`
- `src/main/workCardValidation/workCardValidationService.ts`
- `src/main/workspaceSettings.ts`
- `src/shared/workspaceContracts.ts`
- `test/architect-interview/architect-interview-workspace.test.cjs`
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`
- `test/documents/single-file-workflow.test.cjs`
- `test/phase-interview/phase-interview-service.test.cjs`
- `test/project-planning/project-planning-service.test.cjs`
- `test/support/canonical-markdown-fixtures.cjs`
- `test/work-card-planning/work-card-planning-service.test.cjs`
- `test/work-card-repair/work-card-repair-service.test.cjs`
- `test/work-card-validation/work-card-validation-service.test.cjs`
- `test/workflow/production-service-proof.test.cjs`

## Files Intentionally Not Created

- No JSON Work Card sidecars.
- No migration utility.
- No MCP server behavior change.
- No renderer configuration UI; missing MCP binding now fails prompt generation closed.
- No commit, tag, branch, stash, stage, push, merge, pull, reset, or clean operation.

## Prompt Families Updated

- Advisory Architect Review prompt.
- Repair Work Card Architect prompt.
- Formal Work Card Architect prompt.
- Project Architect Interview prompt.
- Project Planning prompt.
- Phase Map prompt.
- Phase Interview prompt.
- Phase Planning prompt.
- Older service-level project/phase handoff builders with the same MCP text were also updated where present.

## Before And After Examples

Advisory Architect Review before:

```text
Use ChampCity MCP with repository reference <PROJECT_REPO>.
Resolve the configured workspace ID through diagnostics_toolbox.list_workspaces when it is not already known.
```

Advisory Architect Review after:

```text
MCP workspace binding:
- Bound workspaceId: alpha
- Use ChampCity MCP workspaceId "alpha" only.
- Do not inspect, search, compare, or fall back to any other configured workspace.
- If the bound workspaceId is absent, inaccessible, or does not contain the exact required artifact path, stop with BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH.
```

Repair Work Card Architect before:

```json
{
  "action": "create_markdown_artifact",
  "workspaceId": "<resolved workspace ID>"
}
```

Repair Work Card Architect after:

```json
{
  "action": "create_markdown_artifact",
  "workspaceId": "alpha",
  "params": {
    "relativePath": "planning/Architect_Drafts/.../repair-work-card.md",
    "content": "<complete body-only Repair Work Card Markdown>",
    "overwrite": false
  }
}
```

Formal Work Card Architect before:

```text
selected workspace repository reference: <PROJECT_REPO>
workspaceId: <resolved workspace ID>
```

Formal Work Card Architect after:

```text
selected MCP workspaceId: alpha
If the bound workspace cannot be verified through these exact paths, stop with BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH.
```

Project/phase prompt before:

```text
Use ChampCity MCP with repository reference <PROJECT_REPO>.
Resolve the configured workspace ID through diagnostics_toolbox.list_workspaces when it is not already known.
```

Project/phase prompt after:

```text
MCP workspace binding:
- Bound workspaceId: alpha
- Use this workspaceId in every ChampCity MCP tool call.
- diagnostics_toolbox.list_workspaces may be used only to confirm that this workspaceId exists.
```

## Artifact Tool Evidence

The repository-wide prompt matrix parses every `artifact_toolbox.create_markdown_artifact` JSON block generated by the active production Architect-output catalog and asserts:

- every block has `workspaceId: "alpha"`;
- no block contains `<resolved workspace ID>`;
- each expected temporary draft path is still present;
- `overwrite` remains `false`.

## Negative Multi-Workspace Evidence

`test/architect-outputs/architect-output-prompt-contracts.test.cjs` now includes a negative contract test where the prompt is bound to workspace `alpha`. The prompt contract forbids search, comparison, fallback, or switching to another configured workspace and requires `BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH` when exact artifacts are absent from the bound workspace. The fixture intentionally does not mention or authorize `beta`.

The same test file also verifies prompt generation throws `BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH` when a workspace has no bound MCP workspace ID.

## Validation Performed

- `pwd`
  - Lane: read-only shell.
  - Exit code: 0.
  - Result: verified approved repo root.

- `git status --short --branch`
  - Lane: read-only Git.
  - Exit code: 0.
  - Result: branch inspected; working tree dirty from this implementation pass.

- `git remote -v`
  - Lane: read-only Git.
  - Exit code: 0.
  - Result: remote inspected.

- `npx tsc --noEmit`
  - Lane: Direct clean-room automated validation.
  - Exit code: 0.
  - Result: typecheck passed.

- `npx tsc`
  - Lane: Direct clean-room automated validation.
  - Exit code: 0.
  - Result: TypeScript build passed.

- Targeted `node --test --test-concurrency=1` for prompt and touched service tests
  - Lane: sandbox first.
  - Exit code: 1.
  - Result: documented sandbox `spawn EPERM` false-failure mode.

- Targeted `node --test --test-concurrency=1` for prompt and touched service tests
  - Lane: normal Windows validation lane after sandbox `spawn EPERM`.
  - Exit code: 0.
  - Result: 60 tests passed.

- `npx vite build`
  - Lane: sandbox first.
  - Exit code: 1.
  - Result: documented esbuild `spawn EPERM` false-failure mode.

- `npx vite build`
  - Lane: normal Windows validation lane after sandbox `spawn EPERM`.
  - Exit code: 0.
  - Result: renderer production build passed.

- Initial full `node --test --test-concurrency=1`
  - Lane: normal Windows validation lane.
  - Exit code: 1.
  - Result: 301 passed, 3 failed. Failures were stale test fixtures/assertions after new fail-closed MCP binding requirements.

- Corrected failed-test rerun
  - Lane: normal Windows validation lane.
  - Exit code: 0.
  - Result: 10 tests passed.

- Final full `node --test --test-concurrency=1`
  - Lane: normal Windows validation lane.
  - Exit code: 0.
  - Result: 304 tests passed.

- `rg` forbidden generated-prompt production string scan over `src`
  - Lane: read-only shell.
  - Exit code: 1.
  - Result: no matches for the retired generated-prompt phrases.

- Safety scan for common secret/local-path patterns
  - Lane: read-only shell.
  - Result: no introduced secret values or concrete local machine paths found in changed source/test content. Broad matches were existing policy words, environment variable identifiers, token-count fixture names, or unrelated redaction code.

- `git status --short`
  - Lane: read-only Git.
  - Exit code: 0.
  - Result: changed files remain unstaged, as required by Git mutation prohibition.

## Validation Skipped

- Operator manual validation: not performed by Implementer; remains required.
- Real embedded ChatGPT MCP session validation: not performed; automated tests verify generated prompt contracts and local fail-closed behavior only.
- Git staging/commit/push: skipped because Work Card prohibits Git mutation.

## Acceptance Criteria Mapping

1. Shared helper exists: `src/main/integrations/mcpWorkspacePromptContract.ts`.
2. Concrete bound workspace ID or fail-closed behavior: helper resolves exact binding or throws `BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH`.
3. No prompt asks ChatGPT to resolve unknown workspace ID: production forbidden-string scan over `src` has no matches.
4. No placeholder artifact workspace ID: repository-wide prompt matrix parses action blocks and asserts `workspaceId: "alpha"`.
5. Advisory review prompt includes exact bound ID, exact paths, revisions, sha256, and blocked mismatch behavior: `workCardValidationService` and service test updated.
6. Repair Work Card prompt includes exact bound ID, source/target paths, and exact artifact write ID: `workCardRepairService` and tests updated.
7. Formal Work Card preserves selected target evidence and uses exact bound ID: `workCardPlanningService` and tests updated.
8. Project/phase prompts consume shared preflight: project planning, phase map, phase interview, and phase planning service and catalog builders updated.
9. Missing exact artifact in bound workspace is blocked, not searched elsewhere: shared preflight and negative tests require this.
10. Multi-workspace negative scenario covered: prompt contract test binds `alpha` and forbids fallback to any other workspace.
11. Future prompt regression covered: common prompt matrix asserts no retired phrases across all active catalog prompt families.
12. Non-MCP routing and artifact promotion preserved: full 304-test suite passed.
13. No Git mutation: no staging, commit, push, branch, pull, rebase, merge, reset, clean, stash, or tag was performed.

## Security And Secret-Safety Notes

No secrets, credentials, API keys, token values, `.env` contents, private keys, concrete local machine paths, screenshots, archives, or build-output artifacts were intentionally added to durable artifacts. Renderer filesystem authority was not broadened.

## Manual Validation Required

1. Generate/copy an Advisory Architect Review prompt while multiple MCP workspaces are configured.
2. Confirm the prompt contains one exact bound workspace ID and no generic workspace-resolution language.
3. Confirm it instructs the Architect to stop when exact Work Card or Implementer Report path/revision/sha verification fails in the bound workspace.
4. Generate/copy a Repair Work Card Architect prompt and confirm the artifact-tool JSON uses the exact workspace ID.
5. Generate/copy a Formal Work Card Architect prompt and confirm selected workspace target evidence is preserved with exact MCP workspace authority.
6. Generate/copy Project/Phase Architect prompts and confirm they use the same shared MCP preflight.
7. Confirm no prompt suggests searching another configured workspace when exact artifacts are missing.

## Residual Risks

- The repo-contained binding file convention is intentionally small and current. A future UI may be needed for explicit Operator configuration rather than relying on file/Git-derived binding.
- Automated tests prove prompt text and local fail-closed behavior, not live ChatGPT MCP tool execution.
- Architect Interview prompt files were repaired as an adjacent active generated MCP prompt family; Architect review should confirm this scope handling is acceptable.

## Blocking Questions

None.

## Recommended Next Implementer Task

Run Architect review on this Implementer Report, then have the Operator perform the manual multi-workspace prompt validation listed above.
