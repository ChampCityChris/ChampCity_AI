<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR17",
    "repairId": "WC46-REPAIR17",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR17_project_repository_owned_mcp_workspace_route.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR17_project_repository_owned_mcp_workspace_route.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review WC46-REPAIR17 Project Repository Owned MCP Workspace Route",
    "disposition": "Approved for Operator validation",
    "reviewedWorkCardPath": "planning/phases/phase-08/Work_Cards/WC46-REPAIR17_project_repository_owned_mcp_workspace_route.md",
    "reviewedImplementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR17_project_repository_owned_mcp_workspace_route.md",
    "gitMutationAuthorized": false,
    "gitMutationPerformed": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "WC46-REPAIR17 satisfies the repair contract and is approved for Operator validation.",
    "reviewedAt": "2026-08-07"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC46-REPAIR17 Project Repository Owned MCP Workspace Route

Disposition: Approved for Operator validation  
Parent Work Card: `WC46`  
Repair Work Card: `WC46-REPAIR17`  
Git mutation: not authorized and not performed

## Evidence Inspected

Reviewed repository status through ChampCity MCP for workspace `champcity_ai`. The repository is `ChampCityChris/ChampCity_AI` on branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. The worktree remains dirty from the active WC46 repair sequence, with zero staged files at the time of review.

Reviewed the governing repair Work Card:

```text
planning/phases/phase-08/Work_Cards/WC46-REPAIR17_project_repository_owned_mcp_workspace_route.md
sha256: 7669e7ecc40d408e9df29df7ac5c652f63724bdf7446116a08009e947c4a40c9
```

Reviewed the Implementer Report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR17_project_repository_owned_mcp_workspace_route.md
sha256: 528ab0c6b7d25c70899fb2544b4150fa2990e02768d227372bfc7d7433d2b7ca
```

Inspected production and test evidence in the repository:

```text
src/main/integrations/mcpWorkspacePromptContract.ts
src/main/integrations/architectMcpHandoffService.ts
src/main/documents/repositoryAuthority.ts
src/main/projectIntake/projectIntakeService.ts
test/project-intake/project-intake-service.test.cjs
test/architect-interview/architect-interview-workspace.test.cjs
test/architect-outputs/architect-output-prompt-contracts.test.cjs
test/architect-outputs/architect-draft-ingestion.test.cjs
test/support/canonical-markdown-fixtures.cjs
```

Validation commands were not re-run by the Architect. Implementer-reported command results are treated as report evidence only.

## Contract Summary

WC46-REPAIR17 required the application to stop treating explicit `mcpWorkspaceBinding` metadata or `.champcity/mcp-workspace-binding.json` as the normal readiness requirement for prompt generation. The selected Project Intake repository path is the durable project authority. The app must construct the MCP workspace route at prompt-preparation time from the project repository folder basename.

The required formula was:

```text
workspaceId = normalizeWorkspaceId(path.basename(projectRepository))
```

The required examples were:

```text
ChampCity_AI -> champcity_ai
ChampCity_GPT -> champcity_gpt
ChampCity_RP_Desktop -> champcity_rp_desktop
Revisionary -> revisionary
ChampCity_PDL -> champcity_pdl
```

The generated prompt still had to provide a literal workspace ID to ChatGPT and continue forbidding ChatGPT-side workspace inference, search, or fallback.

## Production Review

`src/main/integrations/mcpWorkspacePromptContract.ts` now includes route construction helpers:

```text
workspaceIdFromProjectRepository(projectRepository)
normalizeWorkspaceId(value)
projectRepositoryBasename(projectRepository)
```

The implementation derives the workspace ID from `repositoryAuthority.projectRepository` when no explicit `mcpWorkspaceBinding` exists. The normalization matches the Work Card requirement: lowercasing, preserving alphanumeric and underscore characters, replacing unsupported character runs with underscores, collapsing repeated underscores, trimming edge underscores, and rejecting empty or unsafe results.

The normal no-binding path now flows as follows:

```text
workflowData.repositoryAuthority.projectRepository
→ projectRepositoryBasename(...)
→ normalizeWorkspaceId(...)
→ BoundMcpWorkspaceDescriptor.workspaceId
→ prepared prompt line and artifact-tool JSON workspaceId
```

This satisfies the core runtime correction for the `ChampCity_PDL -> champcity_pdl` route.

`buildCreateMarkdownArtifactJsonBlock(...)` and `buildMcpWorkspaceBindingPromptBlock(...)` both use `bindingForPrompt(...)`, so the same computed route is used consistently in the visible MCP instruction and in the JSON block that ChatGPT will call.

`src/main/integrations/architectMcpHandoffService.ts` now resolves the manifest MCP route through `resolveMcpWorkspaceBindingForPrompt(...)`, so Browser Actions / Prepare Handoff can return a ready manifest using the same route logic instead of demanding `repositoryAuthority.mcpWorkspaceBinding`.

`src/main/documents/repositoryAuthority.ts` still contains compatibility helpers for explicit MCP binding, but no inspected production call path requires `requireMcpWorkspaceBindingForPrompt(...)` for the normal no-binding Project Intake route. This is acceptable as compatibility residue because the reviewed prompt path is now driven by `projectRepository` when no binding exists.

No production evidence showed Git remote, repository owner/name, MCP diagnostics, artifact search, or ChatGPT inference being used to select the workspace ID.

## Test Review

`test/project-intake/project-intake-service.test.cjs` now proves the required formula examples, including:

```text
ChampCity_PDL -> champcity_pdl
ChampCity_AI -> champcity_ai
ChampCity_GPT -> champcity_gpt
ChampCity_RP_Desktop -> champcity_rp_desktop
Revisionary -> revisionary
```

The same test proves `buildCreateMarkdownArtifactJsonBlock(...)` emits a literal `workspaceId` of `champcity_pdl` with no `.champcity/mcp-workspace-binding.json` present.

`test/project-intake/project-intake-service.test.cjs` also preserves the WC46-REPAIR13/15 requirement that Project Intake without explicit MCP binding still writes `repositoryAuthority.projectRepository` and does not synthesize `repositoryAuthority.mcpWorkspaceBinding`.

`test/architect-interview/architect-interview-workspace.test.cjs` proves an Architect Interview handoff can be prepared from a no-binding project with repository authority only. It verifies:

```text
- Architect Interview model remains usable
- Prepare Handoff succeeds
- Copy Handoff becomes available through canCopyHandoff
- the prepared instruction uses the computed literal workspaceId
- the JSON invocation uses the same computed workspaceId
- no .champcity/mcp-workspace-binding.json exists
- the instruction does not contain resolve/infer/search language
```

The existing compact Architect draft ID coverage remains intact through the long-path Architect Interview test and the architect draft ingestion tests.

## Blocking Findings

None.

## Non-Blocking Concerns

The code still retains compatibility paths for explicit MCP binding. That is acceptable for this pass because WC46-REPAIR17 required removing it as the normal requirement, not deleting every compatibility reader. Future cleanup can remove unused binding-era helpers after the new projectRepository route is stable across the full beta-validation flow.

The Implementer Report states the full serial test suite passed in the normal Windows lane. The Architect did not independently run those commands.

## Acceptance Criteria Assessment

1. Shared app-owned route helper computes MCP workspaceId from `projectRepository` folder basename: Passed.
2. `ChampCity_PDL` computes to `champcity_pdl`: Passed.
3. Existing examples compute correctly: Passed.
4. Normal Architect handoff preparation no longer requires `repositoryAuthority.mcpWorkspaceBinding`: Passed.
5. Normal Architect handoff preparation no longer requires `.champcity/mcp-workspace-binding.json`: Passed.
6. New Project Intake without explicit MCP binding still prepares Architect Interview handoff when `projectRepository` is present: Passed.
7. Prepared handoff prompt contains the literal computed workspaceId and uses it in artifact-tool JSON: Passed.
8. Prepared handoff prompt does not ask ChatGPT to resolve, infer, search, or select a workspace: Passed.
9. Missing or unsafe `projectRepository` route authority produces route-construction errors: Passed by production logic; direct negative proof is limited in reviewed tests.
10. Project Repository is not treated as a durable `mcpWorkspaceBinding` metadata field: Passed for the no-binding route.
11. No MCP workspace ID is derived by ChatGPT, Git remote, repository owner/name, artifact path search, or MCP diagnostics search: Passed.
12. Existing explicit-binding tests are updated or reclassified so they do not obscure projectRepository route behavior: Passed enough for this repair because the no-binding route has direct test coverage.
13. WC46-REPAIR16 compact draft ID tests continue to pass: Passed by report evidence and inspected tests.
14. No legacy document migration is performed: Passed.
15. No unrelated workflow routing, validation, repair, close, Codex, or UI redesign changes are introduced: Passed by file-surface inspection.
16. No Git mutation is performed: Passed.

## Review Disposition

WC46-REPAIR17 is approved for Operator validation.

The repair addresses the live failure class: a new project such as `ChampCity_PDL` should no longer require explicit MCP binding metadata or a `.champcity/mcp-workspace-binding.json` file to prepare the Architect Interview handoff. The app should compute `champcity_pdl` from the Project Intake repository folder and place that literal workspace ID into the copied prompt.

## Manual Validation Required

Perform the manual validation from the Work Card:

```text
1. Create or use a project repository folder named ChampCity_PDL.
2. Complete Project Intake without creating .champcity/mcp-workspace-binding.json.
3. Open Architect Interview.
4. Click Prepare Handoff.
5. Confirm no BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED error appears.
6. Confirm Copy Handoff becomes available.
7. Copy the handoff and confirm it says to use workspaceId champcity_pdl only.
8. Confirm no 240-character Architect draft submission ID error occurs.
9. Confirm no legacy document was migrated solely for this repair.
```

## Git Status

No Git mutation was authorized or performed by the Architect review. Final repository status remained dirty with zero staged files.
