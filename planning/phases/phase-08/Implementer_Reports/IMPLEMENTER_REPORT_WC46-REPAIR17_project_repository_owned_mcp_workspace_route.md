# IMPLEMENTER REPORT WC46-REPAIR17 - Project Repository Owned MCP Workspace Route

Status: Pending Architect/Operator review  
Pass type: numbered Work Card repair  
Work Card: `WC46-REPAIR17`  
Branch inspected: `feature/phase-04-wc01-repair01-evidence-derived-workflow`  
Remote inspected: `origin https://github.com/ChampCityChris/ChampCity_AI.git`

## Repository Path Inspected

- Verified approved repo root: `<PROJECT_REPO>`
- Governing files read:
  - `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`
  - `docs/dev/VALIDATION_COMMAND_LANES.md`
  - `planning/phases/phase-08/Work_Cards/WC46-REPAIR17_project_repository_owned_mcp_workspace_route.md`

## Files Created

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR17_project_repository_owned_mcp_workspace_route.md`

## Files Modified

- `src/main/integrations/mcpWorkspacePromptContract.ts`
- `test/architect-interview/architect-interview-workspace.test.cjs`
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`
- `test/project-intake/project-intake-service.test.cjs`

## Files Intentionally Not Created

- No `.champcity/mcp-workspace-binding.json`
- No migration utility
- No new permanent Work-Card-specific test island
- No JSON sidecar for this Implementer Report
- No commit, tag, branch, or push artifact

## Implementation Summary

`mcpWorkspacePromptContract.ts` now has an app-owned route helper:

```text
workspaceId = normalizeWorkspaceId(path.basename(projectRepository))
```

Normalization performed:

```text
trim folder basename
lowercase
preserve alphanumeric and underscore characters
replace unsupported non-alphanumeric runs with underscore
collapse repeated underscores
trim leading/trailing underscores
require a non-empty value matching /^[a-z0-9_]+$/
```

For canonical workflow data with `repositoryAuthority.projectRepository` and no explicit binding, prompt generation now computes the MCP route from the selected project repository basename. Existing explicit binding readers remain readable for compatibility when present, but a normal no-binding Project Intake flow no longer blocks on `repositoryAuthority.mcpWorkspaceBinding` or `.champcity/mcp-workspace-binding.json`.

The prepared prompt still writes a literal route line:

```text
Use ChampCity MCP workspaceId "<computed-workspace-id>" only.
```

The artifact-tool JSON block also contains the same literal `workspaceId`.

## Before / After Behavior

Before:

- A Project Intake with `projectRepository` but no explicit MCP binding blocked Architect Interview handoff preparation with `BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED`.
- Missing `.champcity/mcp-workspace-binding.json` could prevent normal prompt generation even though Project Intake had selected the repository.

After:

- A Project Intake with `projectRepository` and no explicit MCP binding prepares the Architect Interview handoff.
- Copy Handoff becomes available.
- The prompt and `create_markdown_artifact` JSON use the computed literal workspaceId.
- If workflow metadata has no usable `projectRepository` route authority and no compatibility binding, prompt generation blocks with `BLOCKED_PROJECT_REPOSITORY_MCP_ROUTE_REQUIRED`.
- If the folder basename normalizes to an unsafe empty value, prompt generation blocks with `BLOCKED_PROJECT_REPOSITORY_MCP_ROUTE_INVALID`.

## Required Proof

- `ChampCity_PDL -> champcity_pdl`: covered by `projectRepository folder basename constructs the MCP workspace route`.
- Other examples covered by the same test:
  - `ChampCity_AI -> champcity_ai`
  - `ChampCity_GPT -> champcity_gpt`
  - `ChampCity_RP_Desktop -> champcity_rp_desktop`
  - `Revisionary -> revisionary`
- No explicit binding file required: covered by `Architect Interview handoff uses projectRepository route when repository authority has no binding`.
- Literal computed workspaceId in generated prompt and artifact JSON: covered by the same Architect Interview test.
- ChatGPT is not asked to resolve, infer, search, or select a workspace: covered by Architect Interview and prompt-contract negative assertions.
- Compact Architect draft IDs remain intact: covered by `Architect Interview handoff prepares compact draft ID for real long prompt path` and `architect-draft-ingestion` focused tests.

## Acceptance Criteria Mapping

1. Shared route helper added in `mcpWorkspacePromptContract.ts`.
2. `ChampCity_PDL -> champcity_pdl` verified.
3. Existing folder examples verified.
4. No-binding Architect handoff no longer requires `repositoryAuthority.mcpWorkspaceBinding`.
5. No-binding Architect handoff no longer requires `.champcity/mcp-workspace-binding.json`.
6. New Project Intake without explicit binding prepares Architect Interview handoff when `projectRepository` is present.
7. Prepared handoff prompt and artifact JSON contain the computed literal workspaceId.
8. Prompt tests reject resolve/infer/search/select language.
9. Missing or unsafe projectRepository route authority produces explicit projectRepository route-construction errors.
10. No durable `mcpWorkspaceBinding` metadata is created for the no-binding route.
11. Git remote, repository owner/name, artifact search, and MCP diagnostics are not used to derive workspaceId.
12. Binding-era tests were updated/reclassified around projectRepository route behavior where needed.
13. Compact draft ID behavior remains covered and passing.
14. No legacy document migration was performed.
15. No unrelated workflow routing, validation, repair, close, Codex, or UI redesign changes were introduced by this pass.
16. No Git mutation was performed.

## Commands Run And Results

Working directory for all commands: `<PROJECT_REPO>`

- `pwd`
  - Lane: read-only shell
  - Exit: 0
  - Result: verified approved repo root
- `git status --short --branch`
  - Lane: read-only Git
  - Exit: 0
  - Result: dirty worktree existed before this repair; no Git mutation performed
- `git remote -v`
  - Lane: read-only Git
  - Exit: 0
  - Result: confirmed `origin`
- `npx tsc --noEmit`
  - Lane: direct clean-room automated validation
  - Exit: 0
  - Result: TypeScript typecheck passed
- `npx tsc`
  - Lane: sandbox attempt
  - Exit: 1
  - Result: sandbox `EPERM` while writing `dist/`; not treated as source failure
- `npx tsc`
  - Lane: approved normal Windows execution lane
  - Exit: 0
  - Result: TypeScript build passed
- `node --test --test-concurrency=1 test/project-intake/project-intake-service.test.cjs test/architect-interview/architect-interview-workspace.test.cjs test/architect-outputs/architect-output-prompt-contracts.test.cjs test/architect-outputs/architect-draft-ingestion.test.cjs`
  - Lane: sandbox attempt
  - Exit: 1
  - Result: documented `spawn EPERM`; not treated as source failure
- Same focused `node --test` command
  - Lane: approved normal Windows execution lane
  - Exit: 0
  - Result: 25 tests passed, 0 failed
- `npx vite build`
  - Lane: sandbox attempt
  - Exit: 1
  - Result: documented esbuild `spawn EPERM`; not treated as source failure
- `npx vite build`
  - Lane: approved normal Windows execution lane
  - Exit: 0
  - Result: renderer production build passed, 1622 modules transformed
- `node --test --test-concurrency=1`
  - Lane: approved normal Windows execution lane
  - Exit: 124 on first 120-second bounded attempt
  - Result: timed out before returning pass/fail
- `node --test --test-concurrency=1`
  - Lane: approved normal Windows execution lane, longer bounded attempt
  - Exit: 0
  - Result: full suite passed, 316 tests passed, 0 failed
- Final `npx tsc --noEmit`
  - Lane: direct clean-room automated validation
  - Exit: 0
  - Result: final TypeScript typecheck passed
- Final `npx tsc`
  - Lane: approved normal Windows execution lane
  - Exit: 0
  - Result: final TypeScript build passed
- Final focused `node --test` command
  - Lane: approved normal Windows execution lane
  - Exit: 0
  - Result: 25 tests passed, 0 failed
- Local path and secret-pattern safety scan with `rg`
  - Lane: local safety scan
  - Exit: 1
  - Result: no matches in files touched for this repair

## Validation Performed

- Static/type validation: passed.
- Electron/main/preload/shared/renderer TypeScript build: passed in approved normal Windows lane.
- Renderer bundle build: passed in approved normal Windows lane.
- Focused capability tests: passed, 25/25.
- Full serial Node test suite: passed, 316/316.
- Local safety scan: passed, no concrete local paths or secret-like strings found in files touched for this repair.

## Validation Skipped

- Operator manual validation: not performed by Implementer.
- Embedded ChatGPT/MCP live write-back validation: not performed by Implementer; Work Card leaves this for Operator-observed validation.
- Git staging/commit/push validation: skipped because Git mutation is prohibited by this Work Card.

## Manual Validation Required

1. Create or use a project repository folder named `ChampCity_PDL`.
2. Complete Project Intake without creating `.champcity/mcp-workspace-binding.json`.
3. Open Architect Interview.
4. Click Prepare Handoff.
5. Confirm no `BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED` error appears.
6. Confirm Copy Handoff becomes available.
7. Copy the handoff and confirm it says to use workspaceId `champcity_pdl` only.
8. Confirm no 240-character Architect draft submission ID error occurs.
9. Confirm no legacy document was migrated solely for this repair.

## Git Actions Performed

- No branch switch.
- No pull, rebase, merge, reset, clean, stash, tag, stage, commit, or push.
- Commit created: no.
- Commit hash: not applicable; Git mutation prohibited.

## Security / Secret-Safety Notes

- No credential material, API keys, or environment-file content were added.
- Report uses `<PROJECT_REPO>` and repo-relative paths only.
- No concrete local machine paths were written into this report.
- No new filesystem write authority was added to renderer code.

## Blocking Questions

- None.

## Residual Risks

- Existing explicit MCP binding compatibility remains readable when already present. The repaired no-binding Project Intake path is covered and no longer requires that binding.
- Operator live MCP validation remains required to prove the external ChatGPT/MCP environment can access the computed workspaceId.
- The worktree contained many pre-existing uncommitted and untracked files before this repair; this pass did not mutate Git state or attempt to separate prior changes.

## Recommended Next Implementer Task

After Architect review and Operator manual validation, continue the active WC46 workflow according to the existing resolver authority.
