<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "implementationEvidence",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC60-02",
    "parentWorkCardId": "WC60"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC60_agent_harness_core_ingestion_and_ai_owned_mcp_runtime.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC60-01_snapshot_bound_champcity_gpt_core_port.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC55_selected_project_root_mcp_routing_and_prompt_policy_cleanup.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "A/I Authority Workspace and Toolbox Adaptation",
    "status": "approved_for_implementation",
    "sequence": 2,
    "bundleReview": "WC60",
    "dependsOn": ["WC60-01"],
    "donorCommit": "aaf72e00f6204325a9fd340dc5f53b62d0f8df1c",
    "gitMutationAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC60-02_ai_authority_workspace_and_toolbox_adaptation.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Adapt the ingested donor core to ChampCity A/I authority and reconstruct the useful public toolbox surface as composable A/I-owned providers. The current selected A/I project is the sole exposed workspace. Preserve tool compatibility where useful, but do not import donor standalone workspace, canonical artifact, Git-permission, or execution authority as competing product state.",
    "reviewedAt": "2026-08-22"
  }
}
CHAMPCITY-METADATA -->

# WC60-02 — A/I Authority, Workspace, and Toolbox Adaptation

Status: Approved for Implementer execution  
Parent bundle: `WC60`  
Sequence: 2 of 4  
Depends on: `WC60-01` complete  
Git mutation: prohibited

## Purpose

Turn the WC60-01 ingested core into an A/I-owned model-facing tool layer.

The goal is to preserve the useful ChampCity_GPT public-tool ergonomics while changing the **authority source** from the standalone donor product to ChampCity A/I.

The governing distinction is:

```text
Donor behavior worth preserving:
- bounded repository access
- safe patch mechanics
- Git inspection helpers
- tool/action schemas
- diagnostics/result delivery
- toolbox names useful to ChatGPT

Donor authority that must NOT be imported:
- independent allowed-root registry deciding the active project
- standalone write-mode configuration as workflow authority
- standalone artifact/catalog state as canonical project state
- standalone Git permission decisions
- arbitrary allowed-script execution
```

## Selected-Project Authority

ChampCity A/I already owns project selection through its workspace settings and WC55 MCP routing contract.

The A/I Agent Harness must expose the current selected project as its active workspace.

Required model:

```text
A/I selected workspace root
    ↓
normalize selected root basename with current A/I MCP workspace-ID contract
    ↓
Agent Harness workspace context
    ↓
repo/git/artifact/diagnostic tools
```

Do not require the selected project to be independently registered in a ChampCity_GPT-style allowed-roots configuration file.

### Workspace-ID behavior

The harness workspace ID must remain compatible with the current A/I prompt contract implemented by:

```text
src/main/integrations/mcpWorkspacePromptContract.ts
```

For example:

```text
ChampCity_AI   → champcity_ai
ChampCity_PDL  → champcity_pdl
FO76_Collector → fo76_collector
```

When a public toolbox call supplies `workspaceId`, the A/I harness must reject a value that does not match the active selected project instead of falling back to another configured repository.

The A/I-owned `diagnostics_toolbox.list_workspaces` may report the active selected project and its capability state, but WC60 does not create a second multi-workspace selector inside the harness.

Changing the A/I selected project must change the harness workspace context on the next resolved request/session without requiring edits to donor-style workspace config.

## A/I Tool Registration Architecture

Do not copy the donor's monolithic global tool catalog as a hard-coded architecture.

Create a composable A/I harness registration boundary in which tool providers can be assembled explicitly, for example conceptually:

```text
AgentHarnessToolProvider
  ├── repo
  ├── git
  ├── artifact
  ├── diagnostics
  ├── integration
  ├── browser
  ├── knowledge
  └── attached-image
```

Exact type names are implementation choices.

The important requirement is that future A/I cards can add `execution_toolbox`, worker delegation, or other model capabilities without editing one giant donor dispatcher or pretending every provider belongs to the standalone ChampCity_GPT product.

## Public Compatibility Target

Preserve these donor public names in the A/I harness where implemented:

```text
repo_toolbox
git_toolbox
artifact_toolbox
diagnostics_toolbox
integration_toolbox
browser_toolbox
knowledge_toolbox
workspace_write_attached_image
```

Preserve server-side action validation. Unknown actions/parameters must not silently execute a fallback operation.

Do not add `execution_toolbox` in WC60.

## Required Toolbox Adaptation

### 1. `repo_toolbox`

Provide A/I-owned equivalents of the donor repository actions needed for current ChatGPT repository work, including:

```text
status
list_files
read_file
inspect_text_file
read_text_chunk
read_text_lines
read_markdown_section
search_files
write_markdown_artifact
write_json_artifact
propose_patch
apply_approved_patch
```

The WC60-01 ingested repository/path/text/patch core must back these actions.

Repository-relative path and file policies remain mechanical correctness boundaries. Do not introduce a second semantic approval model.

Write-capable actions must remain distinguishable from read actions so WC60-03 can apply OAuth `files.write` scope and A/I runtime write authority.

### 2. `git_toolbox`

Preserve useful donor Git inspection behavior, including:

```text
status
diff
pre_commit_scan
readiness_summary
inspect_history
```

The donor also supports mutation actions such as branch preparation, staging, commit, push, and integration. Those action names may be carried forward for compatibility only if they are subordinated to A/I authorization.

Required rule:

```text
Donor capability support != authorization to mutate Git
```

A/I must have an explicit active-workflow authorization signal before any Git mutation-capable harness action can execute. The Work Card's `gitMutationAuthorized` state remains authoritative.

If there is no approved A/I mutation authority, mutation actions must return a bounded authority denial; they must not ask the model to infer permission from the fact that a repository is Git-backed.

WC60 itself authorizes no Git mutation.

### 3. `artifact_toolbox`

Preserve useful generic artifact read/write projection, image-read, planning-corpus, or review-support behavior only where it does not establish a competing canonical state engine.

Critical rule:

**A/I canonical document metadata, workflow state, disposition, Work Card identity, Implementer Report identity, validation state, and handoff state remain owned by existing A/I services.**

Do not port donor Builder Report/catalog concepts as a new source of truth over A/I planning artifacts.

Generic file persistence may write an A/I-authorized target, but it must not independently decide:

- which artifact is canonical;
- whether a Work Card is Approved/Pending;
- whether an Implementer Report is ready;
- whether a workflow transition occurred.

When donor artifact behavior overlaps an existing A/I canonical service, adapt the toolbox action to the A/I service or omit the conflicting donor implementation and document the mapping.

### 4. `diagnostics_toolbox`

Port/adapt the useful diagnostics model so ChatGPT can inspect:

- Agent Harness runtime/tool exposure state;
- active selected workspace identity;
- filesystem/artifact/patch/Git capability state;
- OAuth scope state once WC60-03 exists;
- recent bounded tool/result delivery state;
- MCP server/tool inventory state once WC60-03 exists.

Do not expose secrets or private token values.

Diagnostics describe state; they do not become workflow authority.

### 5. `integration_toolbox`, `browser_toolbox`, `knowledge_toolbox`

Preserve the donor's current bounded/broker behavior where it remains useful, including explicit unavailable/not-implemented results.

Do not expand them into arbitrary upstream MCP passthrough, browser automation, external-document scraping, or hidden knowledge persistence during WC60.

These toolboxes are compatibility/foundation surfaces only in this bundle.

### 6. `workspace_write_attached_image`

Port the donor's bounded ChatGPT attachment-to-workspace behavior where compatible, preserving size/type/dimension/path controls.

The selected A/I project is the target workspace authority.

Do not add general arbitrary remote-download behavior.

## Tool Schema Compatibility

Port/adapt the donor's useful ChatGPT schema-sanitization and exposure rules so public `tools/list` definitions remain JSON-serializable and compatible with ChatGPT MCP discovery.

Keep action-specific limits and server-side validation in production. Do not rely on schema metadata alone to enforce limits.

Because A/I already uses `@modelcontextprotocol/sdk ^1.30.0`, bind the implementation to the target SDK's actual types/APIs. Do not downgrade to donor SDK `^1.13.0` merely to copy source literally.

## A/I Authority Adapter

Introduce one bounded authority/context seam between public tool dispatch and project operations.

It must be able to answer at least:

```text
Which selected project is active?
What workspaceId represents it?
Is the target Git-backed?
Is this action read or write?
Is patch workflow available?
Is Git mutation authorized by current A/I workflow?
Which canonical A/I service owns this artifact operation, if any?
```

Do not make individual toolbox implementations re-read arbitrary app state independently when a shared authority context can supply it.

## Donor Source Guidance

Relevant donor implementation to study from the exact snapshot includes:

```text
src/server/registerTools.ts
src/tools/toolboxActionPolicy.ts
src/tools/domainToolboxes.ts
src/tools/publicSafeFacade.ts
src/tools/workspaceStatusFacade.ts
src/tools/artifactCatalog.ts
src/tools/builderReportFacade.ts
src/tools/workspaceWriteAttachedImage.ts
src/tools/gitWorkflow/**
src/workspaces.ts
src/workspaceAuthority.ts
```

Port behavior selectively. Do not copy `domainToolboxes.ts` wholesale if doing so would preserve donor coupling that the A/I provider architecture is intended to remove.

## Required Proof

1. Selected-workspace tests prove A/I project selection, not donor configuration, determines the active harness root.
2. Workspace-ID tests prove current A/I normalization compatibility.
3. A supplied foreign/nonselected workspace ID is rejected rather than routed to another configured repository.
4. Tool-provider registration tests prove providers are composable and public names/actions are deterministic.
5. `repo_toolbox` protocol-level/service tests prove list/read/search/text projection and bounded write/patch behavior against a temporary selected workspace.
6. `git_toolbox` tests prove Git inspection works on a Git-backed selected workspace.
7. Git mutation tests prove mutation-capable actions are denied when A/I workflow authority does not authorize Git mutation.
8. Artifact tests prove generic tool use does not manufacture or override A/I canonical disposition/workflow state.
9. Diagnostics tests prove active selected-workspace and capability state is observable without exposing secret values.
10. Attached-image tests preserve donor bounded attachment behavior if that surface is exposed.
11. Tool action validation rejects unsupported actions and malformed/unknown parameters as specified by the A/I harness contract.
12. No `execution_toolbox`, shell/process runner, worker delegation, or Browser-role orchestration appears in production source.
13. Target typecheck/build/focused tests/full suite pass.
14. Donor repository remains unchanged and clean.

## Acceptance Criteria

1. The A/I selected project is the sole Agent Harness workspace authority.
2. Existing A/I MCP workspace-ID prompt normalization and harness workspace identity agree.
3. Donor standalone allowed-root/default-workspace selection is not an independent authority in A/I.
4. Public toolbox registration is composable rather than a single donor-global dispatcher dependency.
5. `repo_toolbox` provides the bounded repository operations required for current ChatGPT local-repository work.
6. Git inspection is available when the selected project is Git-backed.
7. Git mutation is not authorized merely because the donor supports it; A/I workflow authority remains controlling.
8. A/I canonical workflow/artifact state is not replaced by donor catalog/facade state.
9. The intended public toolbox names remain available or any intentionally deferred/inapplicable donor action is explicitly documented in the Implementer Report.
10. Unsupported action/parameter calls fail deterministically rather than falling through.
11. No standalone donor config file is required to switch the A/I harness between selected projects.
12. No donor repository modification/dependency is introduced.
13. No Git mutation is performed.

## Implementer Report

Required path:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC60-02_ai_authority_workspace_and_toolbox_adaptation.md`

Leave `Document.Status=Pending`.

If complete and automated acceptance passes, proceed to WC60-03 without an individual Architect disposition.
