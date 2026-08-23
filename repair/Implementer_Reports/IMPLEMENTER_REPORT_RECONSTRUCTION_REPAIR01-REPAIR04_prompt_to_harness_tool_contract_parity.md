# Implementer Report: RECONSTRUCTION-REPAIR01-REPAIR04 Prompt-to-Harness Tool Contract Parity

## Pass Type

Repair implementation pass for `RECONSTRUCTION-REPAIR01-REPAIR04`.

## Repository / Branch / Status Verification

- Repository path inspected: verified approved repo root (`<PROJECT_REPO>`).
- Remote verified: `origin` points to `https://github.com/ChampCityChris/ChampCity_AI.git`.
- Branch observed: `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Working tree status: dirty before this pass, with many pre-existing deleted planning files, modified runtime/test files, and untracked repair / agent-harness planning artifacts. This pass did not revert or normalize unrelated dirty state.
- Git mutation: none. No branch switch, stage, commit, push, merge, rebase, tag, reset, clean, restore, or stash was performed because the repair card does not separately authorize Git mutation.
- Commit hash: not created; Git mutation was intentionally not performed.

## Exact Live Failure

Operator live Project Planning reached Architect draft-write, then both MCP calls failed with:

```text
MCP error -32602: Input validation error: Invalid arguments for tool artifact_toolbox: Invalid input
```

Confirmed mismatch:

- Generated prompt contract: `artifact_toolbox.create_markdown_artifact`
- Live Harness contract: `artifact_toolbox.write_markdown_artifact`

## Live Harness Contract Evidence

Inspected `src/main/agentHarness/tools/toolRegistry.ts`.

The artifact toolbox exposes:

- `status`
- `write_markdown_artifact`
- `write_json_artifact`

No `create_markdown_artifact` alias was added. The registry remains the production authority for public toolbox action names.

## Production Prompt Source Audit

Initial production search found stale `create_markdown_artifact` / `buildCreateMarkdownArtifactJsonBlock` references in:

- `src/main/integrations/mcpWorkspacePromptContract.ts`
- `src/main/architectInterview/architectInterviewDraftPilot.ts`
- `src/main/architectInterview/projectArchitectInterviewPromptWriter.ts`
- `src/main/projectPlanning/projectPlanningDraftBundle.ts`
- `src/main/projectPlanning/projectPlanningService.ts`
- `src/main/phaseMap/phaseMapDraftOutput.ts`
- `src/main/phaseMap/phaseMapService.ts`
- `src/main/phaseInterview/phaseInterviewDraftOutput.ts`
- `src/main/phasePlanning/phasePlanningDraftBundle.ts`
- `src/main/phasePlanning/phasePlanningService.ts`
- `src/main/workCardPlanning/workCardPlanningService.ts`
- `src/main/workCardRepair/workCardRepairService.ts`

Post-implementation source-search proof:

```text
rg -n "create_markdown_artifact|buildCreateMarkdownArtifactJsonBlock|submit_handoff_outputs|save_project_planning_outputs|save_architect_interview_output" src/main
```

Result: no matches.

## Files Created

- `repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR04_prompt_to_harness_tool_contract_parity.md`

## Files Modified

- `src/main/integrations/mcpWorkspacePromptContract.ts`
- `src/main/architectInterview/architectInterviewDraftPilot.ts`
- `src/main/architectInterview/projectArchitectInterviewPromptWriter.ts`
- `src/main/projectPlanning/projectPlanningDraftBundle.ts`
- `src/main/projectPlanning/projectPlanningService.ts`
- `src/main/phaseMap/phaseMapDraftOutput.ts`
- `src/main/phaseMap/phaseMapService.ts`
- `src/main/phaseInterview/phaseInterviewDraftOutput.ts`
- `src/main/phasePlanning/phasePlanningDraftBundle.ts`
- `src/main/phasePlanning/phasePlanningService.ts`
- `src/main/workCardPlanning/workCardPlanningService.ts`
- `src/main/workCardRepair/workCardRepairService.ts`
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`
- `test/architect-outputs/architect-output-workspace-repair.test.cjs`
- `test/architect-interview/architect-interview-workspace.test.cjs`
- `test/project-intake/project-intake-service.test.cjs`
- `test/project-planning/project-planning-service.test.cjs`
- `test/phase-map/phase-map-service.test.cjs`
- `test/phase-interview/phase-interview-service.test.cjs`
- `test/phase-planning/phase-planning-service.test.cjs`
- `test/work-card-planning/work-card-planning-service.test.cjs`

Some modified files already had unrelated dirty changes before this pass; this report identifies the files touched by this repair, not a clean isolated diff from `HEAD`.

## Files Intentionally Not Created Or Modified

- Did not modify `src/main/agentHarness/tools/toolRegistry.ts`.
- Did not add a `create_markdown_artifact` compatibility alias.
- Did not create a new artifact writer.
- Did not switch prompts to `repo_toolbox.write_markdown_artifact`.
- Did not manually revise `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.md`.
- Did not add dependencies.

## Implementation Summary

- Renamed `buildCreateMarkdownArtifactJsonBlock()` to `buildWriteMarkdownArtifactJsonBlock()`.
- Updated the generated JSON action from `create_markdown_artifact` to `write_markdown_artifact`.
- Preserved the existing invocation params: `relativePath`, `content`, and `overwrite: false`.
- Preserved bound `workspaceId` behavior through the shared MCP workspace binding contract.
- Updated all active Architect-output draft/finalization prompt generators to instruct `artifact_toolbox.write_markdown_artifact`.
- Preserved the conversational Interview handoffs as non-writing; only final draft / prepared draft handoffs include draft-write instructions.
- Updated tests that positively expected the retired action.
- Added a focused prompt-to-live-tool parity regression to `test/architect-outputs/architect-output-prompt-contracts.test.cjs`.

## Shared Helper Proof

`src/main/integrations/mcpWorkspacePromptContract.ts` now exports:

```text
buildWriteMarkdownArtifactJsonBlock()
```

It emits:

```text
action: "write_markdown_artifact"
workspaceId: <bound workspaceId>
params.relativePath
params.content
params.overwrite: false
```

`buildCreateMarkdownArtifactJsonBlock()` no longer exists under `src/main/`.

## Active Flow Proof

The corrected active production Architect-output flows are represented by `productionArchitectOutputCatalog` and the contract regression:

- Project Architect Interview finalization
- Project Planning
- Phase Map
- Phase Interview finalization
- Phase Planning bundle
- Formal Work Card
- Repair Work Card

The regression generates each prepared/final draft instruction and verifies every generated Markdown draft JSON invocation uses `write_markdown_artifact`, the bound workspace ID, string `relativePath`, string `content`, and `overwrite: false`.

## Parity Regression Design / Result

Added test:

```text
production Architect-output prompt toolbox references match live Agent Harness registry
```

Design:

- Builds public toolbox/action inventory from `createAgentHarnessToolRegistry(...).listTools("files.read files.write")`.
- Generates prepared instructions for every active production Architect-output definition.
- Extracts explicit `toolbox.action` references from generated instructions.
- Asserts each referenced toolbox exists in the live registry.
- Asserts each referenced action exists on that toolbox.
- Asserts generated Markdown draft write blocks use `artifact_toolbox.write_markdown_artifact`.
- Asserts generated instructions contain no `artifact_toolbox.create_markdown_artifact` or `create_markdown_artifact`.

Result: passed in the focused normal Windows validation lane.

## Validation Performed

Commands and results:

```text
npm run typecheck
```

- Lane: package validation lane, sandboxed.
- Result: passed.

```text
npm run build
```

- Lane: package validation lane, sandboxed first.
- Result: failed with documented Vite/esbuild `spawn EPERM`.

```text
npm run build
```

- Lane: normal Windows execution lane after documented sandbox `spawn EPERM`.
- Result: passed. TypeScript compile and Vite production build completed.

```text
node --test --test-concurrency=1 test/agent-harness/agent-harness-core.test.cjs test/architect-outputs/architect-output-prompt-contracts.test.cjs test/architect-outputs/architect-output-workspace-repair.test.cjs test/architect-interview/architect-interview-workspace.test.cjs test/project-intake/project-intake-service.test.cjs test/project-planning/project-planning-service.test.cjs test/phase-map/phase-map-service.test.cjs test/phase-interview/phase-interview-service.test.cjs test/phase-planning/phase-planning-service.test.cjs test/work-card-planning/work-card-planning-service.test.cjs test/work-card-repair/work-card-repair-service.test.cjs
```

- Lane: sandboxed first.
- Result: failed before test execution with documented `spawn EPERM`.

```text
node --test --test-concurrency=1 test/agent-harness/agent-harness-core.test.cjs test/architect-outputs/architect-output-prompt-contracts.test.cjs test/architect-outputs/architect-output-workspace-repair.test.cjs test/architect-interview/architect-interview-workspace.test.cjs test/project-intake/project-intake-service.test.cjs test/project-planning/project-planning-service.test.cjs test/phase-map/phase-map-service.test.cjs test/phase-interview/phase-interview-service.test.cjs test/phase-planning/phase-planning-service.test.cjs test/work-card-planning/work-card-planning-service.test.cjs test/work-card-repair/work-card-repair-service.test.cjs
```

- Lane: normal Windows execution lane after documented sandbox `spawn EPERM`.
- Result: passed.
- Test count: 110 passed, 0 failed, 0 skipped.

```text
rg -n "create_markdown_artifact|buildCreateMarkdownArtifactJsonBlock|submit_handoff_outputs|save_project_planning_outputs|save_architect_interview_output" src/main
```

- Result: no matches.

```text
rg -n "AKIA|AIza|sk-[A-Za-z0-9]|api[_-]?key|secret|password|token|\.env|<local-path-patterns>" <touched repair files>
```

- Result: no matches.

## Validation Skipped

- Full historical `npm test`: skipped by repair instruction, which required focused validation rather than the entire historical suite.
- Electron launch smoke: not performed because this repair touched prompt contract text and tests only; remaining live MCP Project Planning validation is Operator-owned.
- Operator live validation: not performed by Implementer.

## Security / Secret-Safety Notes

- No secrets, tokens, API keys, credentials, or `.env` content were added.
- No concrete local machine paths were written into this report or intentional repair artifacts.
- Draft writes remain repository-relative and constrained through the existing MCP workspace binding.
- Renderer filesystem access and MCP transport were not modified.

## Deviations / Blockers

- The legacy `docs/governance/EXECUTION_PASS_PROTOCOL.md` referenced by `AGENTS.md` is absent. Current `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` states the legacy final section of `AGENTS.md` is superseded and those deleted protocol files are not required.
- Existing working tree is heavily dirty. This pass avoided unrelated files and performed no Git mutation.

## Manual Validation Required

Operator live validation remains required:

1. Restart/reload ChampCity A/I with the repaired build while the A/I Harness remains the active MCP server.
2. Return to Project Planning.
3. Prepare a fresh Project Planning draft handoff/submission.
4. Send the generated instruction to Browser ChatGPT.
5. Verify both temporary Project Profile and Project Roadmap drafts are created through `artifact_toolbox.write_markdown_artifact` without the `-32602` input-validation failure.
6. Verify ChampCity A/I detects both drafts and promotes the atomic Project Planning bundle normally.
7. Continue normal Profile/Roadmap review.

## Residual Risks

- Automated tests prove generated prompt/tool parity and draft promotion behavior, but they do not prove Browser ChatGPT has access to the live MCP server in the Operator environment.
- Dirty pre-existing repository state may complicate later review if this repair is not isolated before staging.

## Recommended Next Implementer Task

After Architect review, perform the Operator live Project Planning validation described above. If it passes, return to the Project Planning workflow and handle temporary reconstruction repair artifact disposition according to Architect direction.
