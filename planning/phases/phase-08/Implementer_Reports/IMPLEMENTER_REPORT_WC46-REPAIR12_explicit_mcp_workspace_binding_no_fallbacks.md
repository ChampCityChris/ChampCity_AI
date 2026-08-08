# Implementer Report - WC46-REPAIR12 Explicit MCP Workspace Binding No Fallbacks

Status: Pending Architect/Operator review

## Pass Type

Numbered repair Work Card implementation pass.

## Repository Path Inspected

Verified approved repo root: `<PROJECT_REPO>`.

## Git Branch And Remote Status

- Branch inspected: `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Remote tracking status inspected: branch tracks `origin/feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Git mutation authorized: no.
- Git actions performed: read-only `git status --short --branch`, `git diff --name-only`, and `git diff`.
- Commit created: no.
- Commit hash: not applicable; Git mutation was prohibited.
- Tag created: no.

The worktree contained pre-existing WC46-REPAIR11 changes before this pass. This pass did not stage, commit, push, branch, pull, rebase, merge, reset, clean, stash, or tag.

## Files Created

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR12_explicit_mcp_workspace_binding_no_fallbacks.md`

## Files Modified

- `src/main/integrations/mcpWorkspacePromptContract.ts`
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`

## Files Intentionally Not Created

- No JSON Work Card sidecar.
- No migration utility.
- No MCP server behavior change.
- No renderer workspace-selection UI redesign.
- No commit, tag, branch, stash, stage, push, merge, pull, rebase, reset, clean, or checkout operation.

## Implementation Summary

Removed the inferred MCP workspace fallback from `requireBoundMcpWorkspace(...)`. The helper now reads only the explicit project-local `.champcity/mcp-workspace-binding.json` binding and otherwise fails closed.

Deleted the fallback helpers that read `.git/config`, parsed the Git origin remote, extracted repository names, read the current branch, and normalized repository leaf names into workspace IDs. Repository name, branch, label, and `gitBacked` remain evidence/display fields only when supplied by the explicit binding file.

Changed the blocked error text to require the exact fail-closed condition:

```text
BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH: selected project has no explicit MCP workspace binding.
```

Preserved the WC46-REPAIR11 shared prompt helper behavior for explicit bindings, including literal `workspaceId` use in `artifact_toolbox.create_markdown_artifact` JSON blocks, shared prompt-family consumption, and cross-workspace fallback prohibition language.

## Before And After Behavior

Before this repair, a selected project with no `.champcity/mcp-workspace-binding.json` but with a Git origin such as `ChampCityChris/ChampCity_GPT_MCP` could produce an inferred MCP workspace ID like `champcity_gpt_mcp`.

After this repair, the same project fails before prompt emission with `BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH` and does not emit `champcity_gpt_mcp`.

When an explicit binding contains `mcpWorkspaceId: "champcity_gpt"` and `repositoryName: "ChampCityChris/ChampCity_GPT_MCP"`, generated prompts use `champcity_gpt` literally and preserve the repository name only as bound repository evidence.

## Validation Performed

- `pwd`
  - Lane: read-only shell.
  - Exit code: 0.
  - Result: verified approved repo root.

- `git status --short --branch`
  - Lane: read-only Git.
  - Exit code: 0.
  - Result: branch and dirty worktree inspected before edits and again after validation.

- `Get-Content docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`
  - Lane: read-only shell.
  - Exit code: 0.
  - Result: repository boundary read.

- `Get-Content docs/dev/VALIDATION_COMMAND_LANES.md`
  - Lane: read-only shell.
  - Exit code: 0.
  - Result: validation lane read.

- `Get-Content planning/phases/phase-08/Work_Cards/WC46-REPAIR12_explicit_mcp_workspace_binding_no_fallbacks.md`
  - Lane: read-only shell.
  - Exit code: 0.
  - Result: Work Card read.

- `rg -n "deriveGitBackedBinding|repositoryNameFromRemote|normalizeWorkspaceId|requireBoundMcpWorkspace|mcp-workspace-binding|champcity_gpt_mcp|BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH" src test planning/phases/phase-08`
  - Lane: read-only shell.
  - Exit code: 0.
  - Result: confirmed fallback helper locations and relevant prompt/test surfaces before implementation.

- Initial `rg` post-edit search with a PowerShell-sensitive pattern
  - Lane: read-only shell.
  - Exit code: 1.
  - Result: command failed because the pattern was split by shell quoting; corrected with a safer single-quoted pattern.

- `rg -n 'deriveGitBackedBinding|repositoryNameFromRemote|normalizeWorkspaceId|currentGitBranch|champcity_gpt_mcp|selected workspace lacks' src/main/integrations src/main/workspaceSettings.ts src/shared/workspaceContracts.ts test/architect-outputs/architect-output-prompt-contracts.test.cjs`
  - Lane: read-only shell.
  - Exit code: 0.
  - Result: no forbidden production helper names remained; `champcity_gpt_mcp` appeared only in negative test assertions.

- `git diff -- src/main/integrations/mcpWorkspacePromptContract.ts test/architect-outputs/architect-output-prompt-contracts.test.cjs`
  - Lane: read-only Git.
  - Exit code: 0.
  - Result: reviewed bounded source/test changes.

- `npx tsc --noEmit`
  - Lane: Direct clean-room automated validation.
  - Exit code: 0.
  - Result: typecheck passed.

- `npx tsc`
  - Lane: Direct clean-room automated validation.
  - Exit code: 0.
  - Result: Electron main, preload, shared, and TypeScript renderer build passed.

- `npx vite build`
  - Lane: sandbox first.
  - Exit code: 1.
  - Result: documented esbuild `spawn EPERM` sandbox false-failure mode.

- `npx vite build`
  - Lane: normal Windows validation lane after sandbox `spawn EPERM`.
  - Exit code: 0.
  - Result: renderer production build passed; 1622 modules transformed.

- `node --test --test-concurrency=1`
  - Lane: sandbox first.
  - Exit code: 1.
  - Result: documented sandbox `spawn EPERM` false-failure mode; 57 file-level failures occurred before test bodies executed.

- `node --test --test-concurrency=1`
  - Lane: normal Windows validation lane after sandbox `spawn EPERM`.
  - Exit code: 124.
  - Result: timed out after 124 seconds without returning a test result.

- `node --test --test-concurrency=1`
  - Lane: normal Windows validation lane with longer bounded timeout.
  - Exit code: 0.
  - Result: 306 tests passed, 0 failed.

- `git diff --name-only`
  - Lane: read-only Git.
  - Exit code: 0.
  - Result: confirmed broader dirty worktree remained from prior uncommitted work.

- `rg -n 'api[_-]?key|secret|token|password|BEGIN (RSA|OPENSSH|PRIVATE) KEY|C:\\\\Users\\\\|/home/|\\.env' src/main/integrations/mcpWorkspacePromptContract.ts test/architect-outputs/architect-output-prompt-contracts.test.cjs planning/phases/phase-08/Work_Cards/WC46-REPAIR12_explicit_mcp_workspace_binding_no_fallbacks.md`
  - Lane: read-only shell.
  - Exit code: 1.
  - Result: no matches found for common secret or concrete local-path patterns in the bounded source/test/card surfaces.

## Acceptance Criteria Mapping

1. `requireBoundMcpWorkspace(...)` no longer reads Git remote data, repository leaf names, folder names, diagnostics results, or artifact paths to derive `workspaceId`: satisfied in `src/main/integrations/mcpWorkspacePromptContract.ts`.
2. `deriveGitBackedBinding(...)` and equivalent inference helpers removed: satisfied by deleting `deriveGitBackedBinding(...)`, `repositoryNameFromRemote(...)`, `currentGitBranch(...)`, and `normalizeWorkspaceId(...)`.
3. Prompt generation succeeds when explicit binding provides `mcpWorkspaceId`: covered by existing prompt matrix and new literal `champcity_gpt` test.
4. Prompt generation fails closed without explicit binding even when Git origin exists: covered by new `ChampCityChris/ChampCity_GPT_MCP` unbound Git fixture test.
5. `ChampCityChris/ChampCity_GPT_MCP` without explicit binding does not produce `champcity_gpt_mcp`: covered by new negative assertion.
6. Explicit `mcpWorkspaceId: "champcity_gpt"` is used literally despite repository name: covered by new literal-binding test.
7. Repository metadata remains display/evidence only: `repositoryName` is preserved in prompt text but no code converts it into `workspaceId`.
8. Existing prompt-family contract tests pass with explicit binding fixtures: full normal-lane test suite passed.
9. No prompt reintroduces open-ended workspace resolution or cross-workspace fallback instructions: WC46-REPAIR11 forbidden prompt assertions remain passing.
10. No unrelated workflow routing, artifact promotion, validation, or Codex behavior changes: full normal-lane suite passed with no source changes outside the bounded files for this repair.
11. No Git mutation performed: satisfied; work remained unstaged and uncommitted.

## Validation Skipped

- Operator manual validation: not performed by Implementer; remains required.
- Real embedded ChatGPT MCP session validation: not performed; automated checks prove local prompt generation and fail-closed behavior only.
- Electron launch smoke: skipped because this repair changed prompt contract logic and tests, not renderer reachability or runtime UI wiring.
- Git staging/commit/push: skipped because Git mutation is prohibited.

## Security And Secret-Safety Notes

No secrets, credentials, API keys, token values, `.env` contents, private keys, concrete local machine paths, screenshots, archives, or generated junk were intentionally added to durable artifacts. Renderer filesystem authority was not broadened.

## Manual Validation Required

1. Use a selected project with explicit MCP binding and generate an Advisory Architect Review prompt.
2. Confirm the prompt uses the explicit workspace ID literally.
3. Remove or omit the explicit MCP binding.
4. Confirm prompt generation is blocked before any prompt is copied.
5. Confirm no generated prompt suggests deriving, resolving, searching, or falling back to another workspace.

## Residual Risks

- Automated validation does not prove live ChatGPT access to the configured MCP workspace.
- There is still no broad UI flow for creating an explicit MCP binding; this repair only enforces fail-closed behavior for prompt generation.
- The worktree remains dirty with prior uncommitted WC46-REPAIR11 changes, so Architect review should distinguish this repair's files from pre-existing changes.

## Blocking Questions

None.

## Recommended Next Implementer Task

Run Architect review on this report, then proceed to Operator manual validation for the explicit-binding and missing-binding prompt flows.
