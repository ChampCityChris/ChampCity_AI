# Architect Review — WC46-REPAIR11 Workspace-Bound MCP Prompt Contracts

Document.Status=RevisionRequested  
Review revision: 1  
Reviewed artifact: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR11_workspace_bound_mcp_prompt_contracts.md`  
Reviewed Work Card: `planning/phases/phase-08/Work_Cards/WC46-REPAIR11_workspace_bound_mcp_prompt_contracts.md` revision 1

## Disposition

RevisionRequested.

WC46-REPAIR11 correctly addresses most duplicated prompt text and introduces a shared MCP prompt preflight, but the implementation does not yet satisfy the core binding requirement. The new Git-remote fallback can synthesize a workspace ID that is not an actual configured MCP workspace ID. That converts the original drift problem into a different failure mode: prompts can be generated with a concrete but invalid workspace ID instead of failing closed or using a durable exact binding.

## Repository Verification

Repository reviewed through ChampCity MCP workspace `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`.

The working tree remains dirty from the active WC46 repair series. No Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, tag, or other Git mutation was performed during this review.

MCP diagnostics confirmed multiple configured workspaces and no explicit default workspace. The configured workspaces include `champcity_ai`, `champcity_gpt`, `champcity_rp_desktop`, and `revisionary`. This is the exact operating condition WC46-REPAIR11 was intended to harden.

## Inputs Reviewed

- Approved Repair Work Card: `planning/phases/phase-08/Work_Cards/WC46-REPAIR11_workspace_bound_mcp_prompt_contracts.md`, revision 1, sha256 `6a09563eec03280b7cad0a9b4bde92672ee046bc010f5215abcc510bf5cd6f0e`
- Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR11_workspace_bound_mcp_prompt_contracts.md`, sha256 `508eb40db1848e368f0657497a6fce17534003ab65272ba8fd6bb9f1dc435512`
- Current MCP diagnostics workspace list
- Production files:
  - `src/main/integrations/mcpWorkspacePromptContract.ts`
  - `src/main/integrations/architectMcpHandoffService.ts`
  - `src/main/workspaceSettings.ts`
  - `src/shared/workspaceContracts.ts`
  - `src/main/workCardValidation/workCardValidationService.ts`
  - `src/main/workCardRepair/workCardRepairService.ts`
  - `src/main/workCardPlanning/workCardPlanningService.ts`
  - `src/main/projectPlanning/projectPlanningService.ts`
  - prompt-builder search results across project/phase prompt services
- Test files:
  - `test/architect-outputs/architect-output-prompt-contracts.test.cjs`
  - repository search results for MCP-binding test fixtures

I did not rerun validation commands. Implementer-reported command results are treated as reported evidence only.

## Passing Findings

### P-01 — Shared MCP prompt contract helper exists

`src/main/integrations/mcpWorkspacePromptContract.ts` now centralizes:

```text
requireBoundMcpWorkspace(...)
buildMcpWorkspaceBindingPromptBlock(...)
buildCreateMarkdownArtifactJsonBlock(...)
```

The generated prompt block contains the required hard boundary language:

```text
Use ChampCity MCP workspaceId "<id>" only.
Do not inspect, search, compare, or fall back to any other configured workspace.
diagnostics_toolbox.list_workspaces may be used only to confirm that this workspaceId exists.
If the bound workspaceId is absent, inaccessible, or does not contain the exact required artifact path, stop with BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH.
```

This is the correct direction and directly addresses the original prompt-drift class.

### P-02 — Major prompt families consume the shared helper

Repository search confirmed the shared preflight is now consumed by the main affected prompt families, including:

```text
workCardValidationService.ts
workCardRepairService.ts
workCardPlanningService.ts
projectPlanningService.ts
projectPlanningDraftBundle.ts
phaseInterviewService.ts
phaseInterviewDraftOutput.ts
phaseMapService.ts
phaseMapDraftOutput.ts
phasePlanningService.ts
phasePlanningDraftBundle.ts
```

The Advisory Architect Review prompt now includes exact Formal Work Card path/revision/sha256, exact Implementer Report path/revision/sha256, bound-workspace-only read instructions, and a hard stop for path/revision/sha mismatch.

The Repair Work Card Architect prompt now uses the shared bound workspace preflight and calls `buildCreateMarkdownArtifactJsonBlock(...)`, so the artifact-toolbox example is produced with a literal workspace ID rather than `"<resolved workspace ID>"`.

The Formal Work Card Architect prompt preserves the selected-workspace target evidence from WC46-REPAIR04 and upgrades the remaining workspace language to the shared MCP preflight.

### P-03 — Forbidden legacy prompt strings appear removed from production prompt builders

Targeted MCP repository searches over `src/main` did not return matches for the old generated-prompt phrases:

```text
Resolve the configured workspace ID
resolved workspace ID
<PROJECT_REPO>
```

The production prompt matrix test also asserts against these retired phrases across the active Architect-output catalog.

### P-04 — Architect Interview prompt expansion is warranted

The Implementer changed `src/main/architectInterview/architectInterviewDraftPilot.ts` and `src/main/architectInterview/architectInterviewService.ts`, even though those files were not individually listed in the Authorized Surface section.

This is acceptable as a bounded supporting change. WC46-REPAIR11 requires every generated MCP prompt family to consume the shared workspace-bound contract. The Architect Interview prompt family is an active generated MCP prompt surface. Leaving it uncorrected would preserve the same cross-workspace escape hatch this repair is meant to close.

No defect was identified in that expansion during this review.

## Blocking Findings

### B-01 — Git-remote fallback can synthesize an invalid MCP workspaceId

`requireBoundMcpWorkspace(...)` first reads `.champcity/mcp-workspace-binding.json`. If that file is absent, it falls back to `deriveGitBackedBinding(...)`.

The fallback derives a workspace ID by reading `.git/config`, extracting the Git remote repository leaf, and normalizing that leaf:

```text
repositoryName = repositoryNameFromRemote(originUrl)
repoLeaf = repositoryName.split("/").at(-1)
workspaceId = normalizeWorkspaceId(repoLeaf)
```

That is not a durable MCP workspace binding. It does not consult MCP diagnostics, does not verify that the synthesized workspace ID exists, and does not prove the mapping is unambiguous.

The defect is confirmed against the currently configured MCP workspace set:

```text
Configured MCP workspaceId: champcity_gpt
Configured repositoryName: ChampCityChris/ChampCity_GPT_MCP
Git-remote fallback would derive: champcity_gpt_mcp
```

`champcity_gpt_mcp` is not in the configured workspace list. Therefore, for a known configured workspace, the implementation can generate prompts with a concrete but invalid workspace ID instead of using the actual configured MCP workspace ID or failing closed before prompt emission.

This violates the central WC46-REPAIR11 contract:

```text
Application-selected MCP workspace is bound before prompt generation
→ generated prompt contains the exact bound workspaceId
```

It also violates Acceptance Criteria 2:

```text
Prompt generation has access to a concrete bound MCP workspaceId, or prompt generation fails closed with a clear blocked state.
```

A guessed value derived from a Git remote is not a concrete bound MCP workspaceId unless it is verified against MCP workspace configuration or explicitly stored as operator/app binding.

### B-02 — The test suite does not prove the fallback is unambiguous or correct

The repository-wide prompt contract tests create `.champcity/mcp-workspace-binding.json` with `mcpWorkspaceId: "alpha"` and then verify prompts use `alpha`. That proves the configured binding-file path works.

The tests do not prove the Git-remote fallback is safe. There is no test covering a real current mismatch pattern such as:

```text
repositoryName: ChampCityChris/ChampCity_GPT_MCP
actual MCP workspaceId: champcity_gpt
fallback-derived ID: champcity_gpt_mcp
```

There is also no test proving that the fallback fails closed when a derived ID cannot be confirmed against configured MCP workspaces.

The multi-workspace negative test is useful, but it only verifies that a prompt bound to `alpha` forbids fallback to another workspace. It does not verify that the app can correctly bind the selected workspace to the actual MCP workspace ID when repository names and workspace IDs do not normalize to the same string.

Because the root defect is workspace binding correctness, this is a blocking proof gap.

## Required Revision

The implementer must repair the WC46-REPAIR11 implementation so that prompt generation uses an exact MCP workspace ID that is either explicitly configured or verifiably resolved.

Required correction:

```text
1. Do not synthesize MCP workspaceId from Git remote repository leaf unless the result is verified against known MCP workspace configuration.
2. Prefer explicit binding from `.champcity/mcp-workspace-binding.json` or app-selected workspace settings.
3. If using any derived binding, prove it against a known configured workspace list or remove the fallback.
4. If no exact MCP workspace ID can be verified, prompt generation must fail closed before emitting a prompt.
5. Add tests for at least one non-identical repository-name/workspace-id mapping.
```

The correction must preserve the passing prompt-family updates. Do not revert the shared helper or reintroduce local duplicated workspace preflight text.

## Acceptance Criteria Assessment

1. Shared helper exists and is consumed by major prompt families — Pass.
2. Concrete bound workspace ID or fail-closed behavior — Fail. The Git fallback can emit an invalid ID rather than fail closed.
3. No prompt asks ChatGPT to resolve unknown workspace ID — Pass based on reviewed prompt builders and targeted search.
4. No placeholder artifact workspace ID — Pass for reviewed artifact-tool examples.
5. Advisory review prompt exact binding/path/revision/sha behavior — Pass for reviewed source.
6. Repair Work Card Architect exact binding/source/target/artifact behavior — Pass for reviewed source.
7. Formal Work Card selected target evidence preserved and upgraded — Pass for reviewed source.
8. Project/phase prompts consume shared preflight — Pass for reviewed source.
9. Missing exact artifact in bound workspace blocked, not searched elsewhere — Partial. Prompt text says this, but binding can be wrong before the prompt is copied.
10. Multi-workspace negative scenario covered — Partial. Prompt fallback language is tested; real workspace-ID mapping correctness is not.
11. Future prompt regression covered — Pass for active production catalog strings; see B-02 for missing fallback coverage.
12. Non-MCP routing/artifact promotion/review state unchanged — No blocking defect found in reviewed path.
13. No Git mutation — Pass based on MCP status and Implementer report.

## Validation Notes

The Implementer reported the following successful validation after initial false-failure lanes and test fixture corrections:

```text
npx tsc --noEmit → exit 0
npx tsc → exit 0
targeted node --test → exit 0, 60 tests passed
npx vite build → exit 0
final full node --test --test-concurrency=1 → exit 0, 304 tests passed
forbidden generated-prompt production string scan over src → no retired phrase matches
```

I did not rerun these commands. These are recorded as Implementer-reported validation evidence only.

## Final Disposition

RevisionRequested.
