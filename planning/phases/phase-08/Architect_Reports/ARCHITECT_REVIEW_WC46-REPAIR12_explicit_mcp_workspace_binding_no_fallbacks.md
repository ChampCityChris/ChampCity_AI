# Architect Review — WC46-REPAIR12 Explicit MCP Workspace Binding No Fallbacks

Document.Status=Approved  
Review revision: 1  
Reviewed artifact: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR12_explicit_mcp_workspace_binding_no_fallbacks.md`  
Reviewed Work Card: `planning/phases/phase-08/Work_Cards/WC46-REPAIR12_explicit_mcp_workspace_binding_no_fallbacks.md` revision 1

## Disposition

Approved for Operator validation.

WC46-REPAIR12 satisfies the bounded repair contract. The implementation removes the inferred MCP workspace fallback introduced by WC46-REPAIR11 and preserves the useful shared prompt-contract behavior.

## Repository Verification

Repository reviewed through ChampCity MCP workspace `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`.

The working tree remains dirty from the active WC46 repair series. No Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, tag, or other Git mutation was performed during this review.

## Inputs Reviewed

- Approved Repair Work Card: `planning/phases/phase-08/Work_Cards/WC46-REPAIR12_explicit_mcp_workspace_binding_no_fallbacks.md`, revision 1, sha256 `b78031bc675b7f04bce97dfdfca487a36840718e369a2dfd23d38212685ed6ee`
- Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR12_explicit_mcp_workspace_binding_no_fallbacks.md`, sha256 `2505ee5917fb694ea7f4b04a6936c5b06ae2a3f7850b5b49e405b80f9d46b59f`
- Prior Architect Review authority: `planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR11_workspace_bound_mcp_prompt_contracts.md`
- Production files:
  - `src/main/integrations/mcpWorkspacePromptContract.ts`
  - `src/main/workspaceSettings.ts`
- Test files:
  - `test/architect-outputs/architect-output-prompt-contracts.test.cjs`
- Project Intake source inspected separately for the Operator-observed repository-persistence issue:
  - `src/main/projectIntake/projectIntakeService.ts`

I did not rerun validation commands. Implementer-reported command results are treated as reported evidence only.

## Passing Findings

### P-01 — Inferred MCP workspace fallback removed

`src/main/integrations/mcpWorkspacePromptContract.ts` now implements `requireBoundMcpWorkspace(...)` as explicit-binding-only:

```text
read .champcity/mcp-workspace-binding.json
→ return configured binding when present
→ throw BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH when absent
```

The reviewed implementation no longer calls or contains the prior fallback path that read `.git/config`, parsed origin remotes, extracted repository leaf names, read Git branch, or normalized repository names into workspace IDs.

Targeted repository searches found no production matches in `src/main` for the prior fallback helper names or Git config fallback terms:

```text
deriveGitBackedBinding
repositoryNameFromRemote
normalizeWorkspaceId
.git/config
```

This satisfies the primary repair objective: no Git, folder, repository-name, diagnostics, or artifact-search fallback may create an MCP workspace ID.

### P-02 — Explicit binding remains supported and literal

The shared helper still supports explicit project-local binding through:

```text
.champcity/mcp-workspace-binding.json
```

When the file provides `mcpWorkspaceId`, the prompt helper uses that value literally in both the MCP preflight block and `artifact_toolbox.create_markdown_artifact` JSON blocks.

Repository metadata fields such as `repositoryName`, `branch`, `label`, and `gitBacked` remain display/evidence fields only. The reviewed source does not convert them into workspace ID authority.

### P-03 — Missing explicit binding fails closed

When no explicit MCP workspace binding exists, `requireBoundMcpWorkspace(...)` throws:

```text
BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH: selected project has no explicit MCP workspace binding. Bind or select the ChampCity MCP workspace before generating this prompt.
```

This is the correct failure mode. Prompt generation should block before emitting an MCP prompt rather than asking ChatGPT to infer, resolve, search, or fallback.

### P-04 — Focused tests cover the exact prior failure mode

`test/architect-outputs/architect-output-prompt-contracts.test.cjs` now includes focused coverage for both sides of the repair:

```text
Git repository identity without explicit MCP binding does not derive workspaceId
explicit MCP binding is used literally despite similar repository name
```

The negative fixture uses `ChampCityChris/ChampCity_GPT_MCP` and verifies no `champcity_gpt_mcp` derived workspace ID is emitted. The positive fixture verifies explicit `mcpWorkspaceId: "champcity_gpt"` is used literally even when `repositoryName` is `ChampCityChris/ChampCity_GPT_MCP`.

### P-05 — Authorized surface remained bounded

The Implementer changed only the bounded repair files for this pass:

```text
src/main/integrations/mcpWorkspacePromptContract.ts
test/architect-outputs/architect-output-prompt-contracts.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR12_explicit_mcp_workspace_binding_no_fallbacks.md
```

These are within the WC46-REPAIR12 authorized surface. No unrelated routing, validation, renderer, repair-loop, or Codex behavior change was identified in this review.

## Non-Blocking Observation — Project Intake repository persistence is a separate defect

Operator visual review raised a valid upstream defect: legacy Project Intake Markdown documents did not record the repository even though the intake questionnaire asks for it.

Repository inspection confirms the defect is not limited to legacy documents. Current `projectIntakeService.ts` normalizes `submission.projectRepository` to the selected `projectRoot` and uses it as the write target, but it does not persist `projectRepository` in either:

```text
projectIntakeBody(...)
intakeSubstantiveContent(...)
```

Therefore, new Project Intake documents currently do not record project repository authority in the body Markdown or embedded `workflowData` metadata.

This is not a WC46-REPAIR12 blocker because REPAIR12 is narrowly scoped to removing inferred MCP workspaceId fallbacks after WC46-REPAIR11. The Project Intake repository-persistence issue should be addressed as a separate WC46-REPAIR13 repair.

## Acceptance Criteria Assessment

1. `requireBoundMcpWorkspace(...)` no longer reads Git remote data, repository leaf names, folder names, diagnostics results, or artifact paths to derive `workspaceId` — Pass.
2. `deriveGitBackedBinding(...)` and equivalent inference helpers removed — Pass.
3. Prompt generation succeeds when explicit binding provides `mcpWorkspaceId` and uses it literally — Pass.
4. Prompt generation fails closed without explicit binding even for a valid Git repository with origin remote — Pass.
5. `ChampCityChris/ChampCity_GPT_MCP` without explicit binding does not produce `champcity_gpt_mcp` — Pass.
6. Explicit `mcpWorkspaceId: "champcity_gpt"` is used literally despite repository name — Pass.
7. Project repository metadata remains display/evidence only and is not used to synthesize MCP workspaceId — Pass.
8. Existing prompt-family contract tests continue to pass with explicit binding fixtures — Pass based on Implementer-reported validation.
9. No generated prompt reintroduces open-ended workspace resolution or cross-workspace fallback instructions — Pass for the reviewed helper/test path; WC46-REPAIR11 prompt-family updates remain preserved.
10. No unrelated workflow routing, artifact promotion, validation, or Codex behavior changes introduced — Pass for reviewed changed files.
11. No Git mutation performed — Pass based on MCP status and Implementer report.

## Validation Notes

The Implementer reported the following successful validation after expected sandbox false-failure lanes and one timeout requiring a longer bounded test run:

```text
npx tsc --noEmit → exit 0
npx tsc → exit 0
npx vite build → exit 0 in normal Windows validation lane
node --test --test-concurrency=1 → exit 0, 306 tests passed
secret/local-path scan over bounded surfaces → no matches
```

I did not rerun commands. These are Implementer-reported validation results only.

## Manual Validation Required

Operator validation should focus on the REPAIR12 contract only:

1. Use a selected project with explicit MCP binding and generate/copy an Advisory Architect Review prompt.
2. Confirm the prompt uses the explicit workspace ID literally.
3. Remove or omit the explicit MCP binding.
4. Confirm prompt generation is blocked before any prompt is copied.
5. Confirm no generated prompt suggests deriving, resolving, searching, or falling back to another workspace.

The separate Project Intake repository-persistence issue should be handled by a new REPAIR13 and should not block REPAIR12 validation.

## Final Disposition

Approved for Operator validation.
