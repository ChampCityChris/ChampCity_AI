<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR12",
    "repairId": "WC46-REPAIR12",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR11_workspace_bound_mcp_prompt_contracts.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR11_workspace_bound_mcp_prompt_contracts.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR11_workspace_bound_mcp_prompt_contracts.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Explicit MCP Workspace Binding Without Fallbacks",
    "status": "approved_for_implementation",
    "executionMode": "one bounded repair after WC46-REPAIR11 review",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "WC46-REPAIR11 replaced prompt-time workspace inference with code-time workspace inference. The shared MCP prompt helper falls back to deriving an MCP workspaceId from Git remote repository leaf names when no explicit binding is present. That can emit a concrete but invalid workspaceId and preserves the same authority defect in another layer.",
    "rootCause": "MCP workspace routing authority was treated as discoverable from Git/repository names instead of explicit project/app metadata. Project repository authority is captured through Project Intake/project metadata, but MCP tool workspaceId must be an explicit stored binding. No fallback is required or allowed.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR12_explicit_mcp_workspace_binding_no_fallbacks.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Remove all inferred MCP workspaceId fallbacks. Prompt generation must use explicit project/app MCP binding or fail closed.",
    "reviewedAt": "2026-08-06"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR12 — Explicit MCP Workspace Binding Without Fallbacks

Status: Approved for Implementer execution  
Parent: `WC46`  
Git mutation: prohibited

## Confirmed Defect

WC46-REPAIR11 correctly introduced a shared MCP prompt contract, but its binding resolver is still wrong.

`src/main/integrations/mcpWorkspacePromptContract.ts` reads an explicit `.champcity/mcp-workspace-binding.json` binding when present, then falls back to deriving `workspaceId` from Git remote repository names when the explicit binding is absent. That fallback is not application authority. It can produce a concrete invalid MCP workspace ID, such as deriving `champcity_gpt_mcp` from `ChampCityChris/ChampCity_GPT_MCP` even though the configured MCP workspace ID is `champcity_gpt`.

This is the same defect class WC46-REPAIR11 was meant to eliminate: workspace authority is still inferred, only now inside application code instead of inside the generated ChatGPT prompt.

## Source Evidence

Authoritative review evidence:

```text
planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR11_workspace_bound_mcp_prompt_contracts.md
```

Relevant implementation evidence:

```text
src/main/integrations/mcpWorkspacePromptContract.ts
- requireBoundMcpWorkspace(...) reads explicit binding first.
- If absent, it calls deriveGitBackedBinding(...).
- deriveGitBackedBinding(...) reads .git/config, extracts origin, normalizes the repository leaf, and emits that as workspaceId.
```

Relevant project authority fact:

```text
Project Intake captures project repository authority.
That project repository identity may be used as project metadata/evidence.
It must not be used to synthesize MCP tool workspaceId.
```

## Objective

Remove all inferred MCP workspaceId fallbacks.

Prompt generation must use an explicit app/project MCP workspace binding, or it must fail closed before emitting any MCP prompt. No Git, filesystem, folder-name, remote-name, diagnostics, or artifact-path fallback may produce a workspaceId.

## Runtime Sequence

```text
Project Intake / project metadata establishes project repository authority
→ Operator/app explicitly binds that project to an MCP workspaceId
→ prompt generation reads the explicit binding
→ generated prompts use that literal workspaceId in every MCP tool example
→ missing explicit binding blocks prompt generation with BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH
→ no prompt is emitted with inferred workspaceId
```

## Required Changes

### 1. Remove all inferred MCP workspaceId fallbacks

Update `src/main/integrations/mcpWorkspacePromptContract.ts` so `requireBoundMcpWorkspace(...)` accepts only explicit binding sources.

Remove fallback behavior that derives or guesses `workspaceId` from:

```text
.git/config
Git origin remote
repository owner/name
repository leaf name
workspace folder name
normalized path
MCP diagnostics search
artifact path search
```

Delete or stop using fallback helpers equivalent to:

```text
deriveGitBackedBinding(...)
repositoryNameFromRemote(...)
currentGitBranch(...)
normalizeWorkspaceId(...) as workspaceId authority
```

A normalization helper may remain only for non-authoritative display formatting if needed. It must not create or repair an MCP workspaceId.

### 2. Use explicit project/app binding only

Valid MCP workspaceId sources are limited to:

```text
- explicit app-selected workspace binding stored for the project; or
- explicit project-local binding file such as .champcity/mcp-workspace-binding.json.
```

Project repository authority captured at Project Intake may be preserved as repository metadata, expected repository label, or review evidence. It must not be converted into a workspaceId.

If an explicit binding includes repositoryName, branch, or label, those values are display/evidence fields only. They do not authorize fallback or ID synthesis.

### 3. Fail closed when explicit binding is absent

When no explicit MCP workspaceId is present, prompt generation must fail before emitting a prompt.

Required blocked behavior:

```text
BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH: selected project has no explicit MCP workspace binding.
```

The error text may include Operator guidance to bind/select the MCP workspace. It must not instruct ChatGPT to resolve the workspace, search workspaces, infer from Git, or try another repository.

### 4. Preserve WC46-REPAIR11 prompt contract work

Do not revert the useful parts of WC46-REPAIR11.

Preserve:

```text
buildMcpWorkspaceBindingPromptBlock(...)
buildCreateMarkdownArtifactJsonBlock(...)
shared prompt-family consumption
literal workspaceId in artifact_toolbox examples when explicit binding exists
BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH prompt language
forbidden cross-workspace fallback language
```

Only the inferred binding fallback is being repaired.

## Preserved Behavior

Preserve unchanged:

- Project Intake project repository capture and project repository metadata;
- shared MCP prompt contract introduced by WC46-REPAIR11;
- updated Advisory Architect Review prompt behavior;
- updated Repair Work Card Architect prompt behavior;
- updated Formal Work Card Architect prompt behavior;
- updated project/phase/Architect Interview prompt behavior;
- literal workspaceId artifact-toolbox examples when explicit binding exists;
- application-owned artifact promotion, canonical metadata, final writes, review state, and cleanup;
- non-MCP workflow routing, Work Card loop authority, repair routing, validation disposition, and Codex implementer behavior;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/main/integrations/mcpWorkspacePromptContract.ts
src/main/workspaceSettings.ts
src/shared/workspaceContracts.ts
src/main/integrations/architectMcpHandoffService.ts
```

Prompt-generator files may be changed only if their current call sites must adapt to the explicit-binding-only API:

```text
src/main/workCardPlanning/workCardPlanningService.ts
src/main/workCardValidation/workCardValidationService.ts
src/main/workCardRepair/workCardRepairService.ts
src/main/projectPlanning/projectPlanningService.ts
src/main/projectPlanning/projectPlanningDraftBundle.ts
src/main/phaseInterview/phaseInterviewService.ts
src/main/phaseInterview/phaseInterviewDraftOutput.ts
src/main/phaseMap/phaseMapService.ts
src/main/phaseMap/phaseMapDraftOutput.ts
src/main/phasePlanning/phasePlanningService.ts
src/main/phasePlanning/phasePlanningDraftBundle.ts
src/main/architectInterview/architectInterviewService.ts
src/main/architectInterview/architectInterviewDraftPilot.ts
```

Tests authorized:

```text
test/architect-outputs/architect-output-prompt-contracts.test.cjs
test/work-card-planning/work-card-planning-service.test.cjs
test/work-card-validation/work-card-validation-service.test.cjs
test/work-card-repair/work-card-repair-service.test.cjs
test/project-planning/project-planning-service.test.cjs
test/phase-interview/phase-interview-service.test.cjs
test/phase-map/phase-map-service.test.cjs
test/phase-planning/phase-planning-service.test.cjs
test/architect-interview/architect-interview-workspace.test.cjs
test/workflow/production-service-proof.test.cjs
test/support/canonical-markdown-fixtures.cjs
```

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR12_explicit_mcp_workspace_binding_no_fallbacks.md
```

## Acceptance Criteria

1. `requireBoundMcpWorkspace(...)` no longer reads Git remote data, repository leaf names, folder names, diagnostics results, or artifact paths to derive `workspaceId`.
2. The implementation removes or disables `deriveGitBackedBinding(...)` and any equivalent workspaceId inference path.
3. Prompt generation succeeds when an explicit binding provides `mcpWorkspaceId`, and generated prompts use that value literally.
4. Prompt generation fails closed when no explicit binding exists, even if the selected project is a valid Git repository with a valid origin remote.
5. A test proves `ChampCityChris/ChampCity_GPT_MCP` without explicit binding does not produce `champcity_gpt_mcp` and instead blocks prompt generation.
6. A test proves explicit binding `mcpWorkspaceId: "champcity_gpt"` is used literally even when repositoryName is `ChampCityChris/ChampCity_GPT_MCP`.
7. Project repository metadata remains preserved as metadata/evidence only and is not used to synthesize MCP workspaceId.
8. Existing prompt-family contract tests continue to pass with explicit binding fixtures.
9. No generated prompt reintroduces open-ended workspace resolution or cross-workspace fallback instructions.
10. No unrelated workflow routing, artifact promotion, validation, or Codex behavior changes are introduced.
11. No Git mutation is performed.

## Negative Constraints

Do not:

- keep Git remote fallback under another name;
- infer MCP workspaceId from project repository, folder name, path, Git config, diagnostics, or file search;
- add a best-effort workspace match;
- silently choose a workspace because names are similar;
- ask ChatGPT to resolve missing workspace binding;
- emit a prompt when explicit MCP workspace binding is missing;
- change MCP server behavior;
- introduce a broad workspace-selection UI redesign;
- rewrite WC46-REPAIR11 prompt-family updates;
- modify unrelated loop, validation, repair, close, Codex, or renderer behavior;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Return Target

After implementation, the Work Card loop must remain on WC46-REPAIR12 implementation/report review.

Expected return sequence:

```text
WC46-REPAIR12 implementation complete
→ application-owned Implementer Report at planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR12_explicit_mcp_workspace_binding_no_fallbacks.md
→ Architect review of that report
→ Operator validation
→ return to the active WC46 repair/work-card loop according to existing resolver authority
```

## Implementer Report Requirements

The Implementer Report must include:

- exact files changed;
- explicit statement that Git/folder/remote/diagnostics fallbacks were removed;
- before/after behavior for missing explicit binding;
- proof that explicit binding is used literally;
- proof that repository names are not converted into workspaceId;
- exact validation commands, working directory, exit codes, and result summaries;
- acceptance-criteria mapping;
- skipped validation or residual risk.

The report must remain `Pending` for Architect/Operator review.

## Manual Validation

Manual validation after implementation:

1. Use a selected project with explicit MCP binding and generate an Advisory Architect Review prompt.
2. Confirm the prompt uses the explicit workspaceId literally.
3. Remove or omit the explicit MCP binding.
4. Confirm prompt generation is blocked before any prompt is copied.
5. Confirm no generated prompt suggests deriving, resolving, searching, or falling back to another workspace.
