<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
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
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR16_repository_authority_mcp_binding_and_compact_draft_ids.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR16_repository_authority_mcp_binding_and_compact_draft_ids.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR16_repository_authority_mcp_binding_and_compact_draft_ids.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Project Repository Owned MCP Workspace Route",
    "status": "approved_for_implementation",
    "executionMode": "one bounded repair after WC46-REPAIR16 validation exposed remaining MCP route blocker",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "After WC46-REPAIR16, Prepare Handoff still blocks with BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED even when Project Intake has already captured the selected project repository. The application is still treating an explicit mcpWorkspaceBinding artifact/config value as required routing authority instead of constructing the MCP workspace route from the canonical projectRepository captured at Project Intake.",
    "rootCause": "MCP workspace routing was over-modeled as durable document metadata and explicit binding validation. The selected project repository directory is the project authority; the MCP workspaceId is a prompt transport route that the application can construct deterministically from the project folder name when preparing the handoff prompt.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR17_project_repository_owned_mcp_workspace_route.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Use Project Intake projectRepository as the source of truth and construct the MCP workspaceId route from the project folder name. Do not require mcpWorkspaceBinding metadata/config for normal prompt generation.",
    "reviewedAt": "2026-08-07"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR17 — Project Repository Owned MCP Workspace Route

Status: Approved for Implementer execution  
Parent: `WC46`  
Git mutation: prohibited

## Confirmed Defect

The application still blocks Architect handoff preparation with an MCP binding error after the project repository has already been captured and persisted by Project Intake.

Operator-visible failure:

```text
Error invoking remote method 'architectOutput:prepareHandoff':
Error: BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED: current project has repository authority but no explicit MCP workspace binding. Bind/select the ChampCity MCP workspace before preparing MCP handoff prompts.
```

Confirmed implementation pattern after WC46-REPAIR16:

```text
src/main/documents/repositoryAuthority.ts
- repositoryAuthority.projectRepository is persisted.
- requireMcpWorkspaceBindingForPrompt(...) still treats missing mcpWorkspaceBinding as a blocker.

src/main/integrations/mcpWorkspacePromptContract.ts
- bindingForPrompt(...) checks repositoryAuthority.mcpWorkspaceBinding.
- when absent, it checks .champcity/mcp-workspace-binding.json.
- when absent, it throws BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED.

src/main/integrations/architectMcpHandoffService.ts
- buildArchitectHandoffManifest(...) relies on the same explicit binding route.
```

This is the wrong readiness model. The selected Project Intake repository directory is the durable project authority. The MCP workspace ID is a transport route used when generating a ChatGPT/MCP prompt. It should be constructed by the application from the selected project repository directory, not persisted and revalidated as document authority.

Current MCP workspace ID convention confirmed by configured workspace examples and Operator direction:

```text
Project folder basename -> lowercase workspaceId

ChampCity_AI -> champcity_ai
ChampCity_GPT -> champcity_gpt
ChampCity_RP_Desktop -> champcity_rp_desktop
Revisionary -> revisionary
ChampCity_PDL -> champcity_pdl
```

## Objective

Make Project Intake `projectRepository` the only project-side source of truth for MCP route construction.

Required outcome:

```text
Project Intake captures normalized projectRepository
→ canonical documents preserve repositoryAuthority.projectRepository
→ Prepare Handoff constructs workspaceId from projectRepository folder basename
→ generated prompt uses that literal workspaceId
→ no mcpWorkspaceBinding metadata/config file is required for normal prompt generation
→ ChatGPT receives a fixed workspaceId and is not asked to infer or search
```

## Runtime Sequence

```text
Operator selects project repository directory
→ Project Intake persists projectRepository and repositoryAuthority.projectRepository
→ Architect Interview workspace displays current documents normally
→ Operator clicks Prepare Handoff
→ app reads projectRepository from current canonical workflowData
→ app computes workspaceId from basename(projectRepository).toLowerCase()
→ app writes the computed workspaceId into the prepared prompt and artifact-tool JSON
→ Copy Handoff becomes available
```

Example:

```text
projectRepository: C:\Users\chapm\Projects\ChampCity_PDL
basename: ChampCity_PDL
workspaceId: champcity_pdl
```

The app may still produce a clear route-construction error if `projectRepository` is absent, empty, malformed, or produces an unsafe workspace ID. It must not require a separate `mcpWorkspaceBinding` value for a normal new project flow.

## Required Changes

### 1. Replace explicit-binding gate with projectRepository route construction

Update `src/main/integrations/mcpWorkspacePromptContract.ts` and related helpers so normal MCP prompt generation resolves the workspace ID from project repository authority.

Required route formula:

```text
workspaceId = normalizeWorkspaceId(path.basename(projectRepository))
```

Minimum normalization:

```text
trim folder basename
lowercase
preserve alphanumeric and underscore characters
replace unsupported non-alphanumeric runs with underscore
collapse repeated underscores
trim leading/trailing underscores
require non-empty result matching a safe workspace-id pattern
```

For current project folder names, this must produce:

```text
ChampCity_AI -> champcity_ai
ChampCity_GPT -> champcity_gpt
ChampCity_RP_Desktop -> champcity_rp_desktop
Revisionary -> revisionary
ChampCity_PDL -> champcity_pdl
```

### 2. Stop requiring mcpWorkspaceBinding in canonical document metadata

Do not require `repositoryAuthority.mcpWorkspaceBinding` for normal Architect handoff preparation.

The following must no longer be true for normal prompt generation:

```text
repositoryAuthority exists + mcpWorkspaceBinding missing -> hard blocked
.champcity/mcp-workspace-binding.json missing -> hard blocked
```

`repositoryAuthority.projectRepository` is enough to construct the route.

Existing `mcpWorkspaceBinding` fields may remain readable for compatibility, but they must not be mandatory and must not be the primary route authority for the selected project workflow.

### 3. Keep ChatGPT from inferring anything

The prepared prompt must still contain a literal route:

```text
Use ChampCity MCP workspaceId "champcity_pdl" only.
```

The prompt must not say:

```text
resolve the configured workspace ID
search other workspaces
choose whichever workspace contains the file
infer from diagnostics
```

The application may compute the workspaceId. ChatGPT must not.

### 4. Preserve repository authority propagation

Keep `repositoryAuthority.projectRepository` propagation from WC46-REPAIR15/16.

Do not remove:

```text
workflowData.projectRepository
workflowData.repositoryAuthority.projectRepository
```

Do not migrate legacy documents solely for this repair.

### 5. Preserve compact Architect draft IDs

Do not alter the WC46-REPAIR16 compact Architect draft ID behavior except where tests need to pass the revised route helper API.

Preserve:

```text
ad-<owning-workspace>-<output-kind>-<submission-key>-src-<20-hex-sha256-prefix>-r<revision>
```

## Preserved Behavior

Preserve unchanged:

- Project Intake repository directory capture;
- top-level `workflowData.projectRepository` compatibility;
- `repositoryAuthority.projectRepository` propagation;
- compact Architect draft submission IDs from WC46-REPAIR16;
- sourceHandoff path/revision as the stale/source authority;
- app-owned canonical metadata and promotion behavior;
- temporary Architect drafts as body-only documents;
- Work Card loop authority, repair routing, validation authority, close/next routing, Codex behavior, and renderer UI behavior except corrected handoff availability/error text;
- no legacy document migration;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/main/integrations/mcpWorkspacePromptContract.ts
src/main/integrations/architectMcpHandoffService.ts
src/main/documents/repositoryAuthority.ts
```

Supporting production files may be changed only if required to adapt helper names/types without changing behavior:

```text
src/main/architectInterview/architectInterviewDraftPilot.ts
src/main/architectInterview/architectInterviewService.ts
src/main/projectIntake/projectIntakeService.ts
src/shared/workspaceContracts.ts
```

Tests authorized:

```text
test/project-intake/project-intake-service.test.cjs
test/architect-interview/architect-interview-workspace.test.cjs
test/architect-outputs/architect-output-prompt-contracts.test.cjs
test/architect-outputs/architect-draft-ingestion.test.cjs
test/support/canonical-markdown-fixtures.cjs
```

A new focused route-resolution test file is authorized if cleaner.

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR17_project_repository_owned_mcp_workspace_route.md
```

## Acceptance Criteria

1. A shared app-owned route helper computes MCP workspaceId from `projectRepository` folder basename.
2. `ChampCity_PDL` computes to `champcity_pdl`.
3. Existing examples compute correctly: `ChampCity_AI`, `ChampCity_GPT`, `ChampCity_RP_Desktop`, and `Revisionary`.
4. Normal Architect handoff preparation no longer requires `repositoryAuthority.mcpWorkspaceBinding`.
5. Normal Architect handoff preparation no longer requires `.champcity/mcp-workspace-binding.json`.
6. A new Project Intake without explicit MCP binding still prepares the Architect Interview handoff prompt when `projectRepository` is present.
7. The prepared handoff prompt contains the literal computed workspaceId and uses it in artifact-tool JSON.
8. The prepared handoff prompt does not ask ChatGPT to resolve, infer, search, or select a workspace.
9. If `projectRepository` is missing or produces an unsafe workspace ID, prompt preparation blocks with a clear projectRepository route-construction error.
10. Project Repository is not treated as a durable `mcpWorkspaceBinding` metadata field.
11. No MCP workspace ID is derived by ChatGPT, Git remote, repository owner/name, artifact path search, or MCP diagnostics search.
12. Existing explicit-binding tests are either removed, reclassified as legacy compatibility, or updated so they do not obscure the projectRepository route behavior.
13. WC46-REPAIR16 compact draft ID tests continue to pass.
14. No legacy document migration is performed.
15. No unrelated workflow routing, validation, repair, close, Codex, or UI redesign changes are introduced.
16. No Git mutation is performed.

## Negative Constraints

Do not:

- require `mcpWorkspaceBinding` for normal prompt generation;
- require `.champcity/mcp-workspace-binding.json` for normal prompt generation;
- make ChatGPT resolve workspace ID;
- search other MCP workspaces inside the generated prompt;
- choose a workspace based on artifact path search;
- inspect Git remote, repository owner/name, or branch to choose workspace ID;
- validate the project repository a second time through MCP binding metadata;
- rewrite or backfill legacy documents;
- alter lifecycle rails, browser panes, validation decisions, repair routing, close routing, or Codex execution;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Return Target

```text
WC46-REPAIR17 implementation complete
→ planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR17_project_repository_owned_mcp_workspace_route.md
→ Architect review
→ Operator validation
→ return to active WC46 workflow according to existing resolver authority
```

## Implementer Report Requirements

The Implementer Report must include:

- exact files changed;
- before/after behavior for a project with no explicit MCP binding file;
- the exact projectRepository-to-workspaceId formula;
- proof for `ChampCity_PDL -> champcity_pdl`;
- proof that generated prompts contain the computed literal workspaceId;
- proof that ChatGPT is not asked to resolve or infer workspace ID;
- proof that compact Architect draft IDs remain intact;
- validation commands, working directory, exit codes, and result summaries;
- acceptance-criteria mapping;
- skipped validation or residual risk.

The report must remain `Pending` for Architect/Operator review.

## Manual Validation

1. Create or use a project repository folder named `ChampCity_PDL`.
2. Complete Project Intake without creating `.champcity/mcp-workspace-binding.json`.
3. Open Architect Interview.
4. Click Prepare Handoff.
5. Confirm no `BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED` error appears.
6. Confirm Copy Handoff becomes available.
7. Copy the handoff and confirm it says to use workspaceId `champcity_pdl` only.
8. Confirm no 240-character Architect draft submission ID error occurs.
9. Confirm no legacy document was migrated solely for this repair.
