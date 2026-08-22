<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "implementationEvidence",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC60-01",
    "parentWorkCardId": "WC60"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC60_agent_harness_core_ingestion_and_ai_owned_mcp_runtime.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC58-REPAIR01_app_server_lifecycle_approval_ownership_and_observability_completion.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Snapshot-Bound ChampCity_GPT Core Port",
    "status": "approved_for_implementation",
    "sequence": 1,
    "bundleReview": "WC60",
    "prerequisite": "WC58-REPAIR01 Architect Approved and clean ChampCity_AI target baseline",
    "donorRepository": "ChampCityChris/ChampCity_GPT_MCP",
    "donorBranch": "dev",
    "donorCommit": "aaf72e00f6204325a9fd340dc5f53b62d0f8df1c",
    "gitMutationAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC60-01_snapshot_bound_champcity_gpt_core_port.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Create the A/I-owned Agent Harness source boundary and port the reusable low-level ChampCity_GPT core from the exact clean donor snapshot. The donor repository is read-only. Do not establish MCP HTTP/OAuth runtime yet and do not port standalone Electron/CLI/release architecture.",
    "reviewedAt": "2026-08-22"
  }
}
CHAMPCITY-METADATA -->

# WC60-01 — Snapshot-Bound ChampCity_GPT Core Port

Status: Approved for Implementer execution  
Parent bundle: `WC60`  
Sequence: 1 of 4  
Donor: `ChampCity_GPT` `dev` @ `aaf72e00f6204325a9fd340dc5f53b62d0f8df1c`  
Git mutation: prohibited

## Purpose

Establish the A/I-owned `ChampCity Agent Harness` source boundary by porting the reusable low-level core from the exact clean ChampCity_GPT donor snapshot into ChampCity A/I.

This card is a **source ownership transfer**, not runtime integration. It creates the reusable primitives needed by later WC60 cards while deliberately excluding the donor's standalone product shell and avoiding premature MCP server/browser integration.

## Baseline Verification — Mandatory First Action

Before source edits, verify and record in the Implementer Report:

```text
Donor repository:
- repository identity = ChampCityChris/ChampCity_GPT_MCP
- branch = dev
- HEAD = aaf72e00f6204325a9fd340dc5f53b62d0f8df1c
- worktree = clean

Target repository:
- repository identity = ChampCityChris/ChampCity_AI
- current branch
- current HEAD
- worktree = clean
```

Read-only access to the donor repository outside the target repository is explicitly authorized for WC60. Production writes, tests, report writes, and all other mutations remain confined to ChampCity A/I.

If the donor is not at the exact baseline, stop with `BLOCKED_DONOR_BASELINE_MISMATCH`.

If the target is not clean before implementation begins, stop with `BLOCKED_TARGET_BASELINE_NOT_CLEAN`.

Do not reset, clean, stash, checkout, commit, or otherwise repair either baseline automatically.

## Target Source Boundary

Create an A/I-owned boundary principally under:

```text
src/main/agentHarness/
```

A reasonable internal organization is:

```text
src/main/agentHarness/
  core/
  repository/
  workspace/
  telemetry/
  tools/
```

The exact directory subdivision may follow target conventions, but all ingested production code must clearly belong to ChampCity A/I. Do not retain imports that require the donor checkout.

## Donor Core to Port/Adapt

Port the behavior needed by later harness cards from the exact donor snapshot, including where applicable:

### 1. Error and bounded-result primitives

Donor concepts/files include:

```text
src/utils/errors.ts
src/utils/errorClassification.ts
src/tools/inputLimits.ts
src/tools/textProjection.ts
src/server/resultTelemetry.ts
src/server/resultDeliveryTrace.ts
src/server/toolCallTrace.ts
```

Preserve useful behavior such as:

- stable typed error classification;
- bounded result serialization;
- large-text inspection/chunking/line/Markdown-section projection;
- continuation/source-hash semantics;
- tool-call/result delivery identifiers and bounded telemetry where useful to A/I.

Do not duplicate A/I application-wide logging infrastructure if an existing target service already owns the same concern. Adapt the donor mechanism behind the Agent Harness boundary.

### 2. Repository path/file policy and traversal

Donor concepts/files include:

```text
src/security/pathPolicy.ts
src/security/filePolicy.ts
src/security/diagnosticRedaction.ts
src/security/auditLog.ts
src/tools/repoTraversal.ts
src/tools/common.ts
src/tools/listProjectFiles.ts
src/tools/readProjectFile.ts
src/tools/searchProjectFiles.ts
src/tools/textProjection.ts
```

Port reusable behavior for:

- repository-relative path resolution;
- file/size/binary/symlink checks;
- bounded list/read/search;
- Markdown/text projection;
- diagnostic redaction needed by the harness;
- atomic/audited file-write support required by later toolbox work.

Adapt naming/configuration to A/I conventions. Do not import the donor `allowedRoots` product model as the A/I selected-project authority; WC60-02 will bind these primitives to the selected A/I project.

### 3. Patch primitives

Donor concepts/files include:

```text
src/pendingPatches.ts
src/utils/patch.ts
src/tools/proposePatch.ts
src/tools/applyApprovedPatch.ts
```

Port the bounded proposal/hash/application mechanics needed for Browser GPT source-edit capability later in WC60.

Preserve proposal identity, patch-hash verification, short-lived proposal behavior, and exact-patch application semantics where compatible with A/I.

Do not add an Operator click/token ceremony. This is a mechanical patch-integrity primitive, not a second authorization system.

### 4. Workspace/capability primitives

Donor concepts/files include:

```text
src/workspaces.ts
src/workspaceAuthority.ts
src/workspaceCapabilities.ts
src/workspaceWritePolicy.ts
src/writeAccess.ts
```

Port reusable data structures and capability evaluation primitives required to express:

- filesystem read availability;
- artifact persistence availability;
- patch workflow availability;
- Git inspection/mutation capability distinction;
- repository/Git detection;
- bounded operation classification.

Do **not** make the donor workspace registry authoritative in A/I. Port the primitives so WC60-02 can adapt them to A/I's selected-project model.

### 5. Git read/support primitives needed by toolbox adaptation

Port reusable Git execution/inspection helpers needed for later read-only Git tools and bounded patch support, including relevant donor behavior from:

```text
src/utils/git.ts
src/tools/gitStatus.ts
src/tools/gitDiff.ts
```

Do not expose or authorize Git mutation in this card.

## Module/Dependency Adaptation

ChampCity_GPT donor code is ESM/NodeNext-oriented. ChampCity A/I currently compiles under its own CommonJS-oriented TypeScript configuration.

The Implementer must:

- rewrite `.js` import suffixes/module assumptions as needed for target conventions;
- preserve target path/import conventions;
- preserve A/I's existing TypeScript/runtime versions;
- add only dependencies that the ingested low-level core actually requires and that are not already present;
- prefer replacing trivial donor dependency usage with existing A/I/platform primitives where doing so preserves behavior and reduces dependency growth.

Do not copy donor `package.json` or `tsconfig.json`.

Do not upgrade React/Electron/TypeScript as part of this card.

## Explicitly Excluded Donor Surfaces

Do not port these as production architecture in WC60-01:

```text
electron/**
src/cli.ts
src/index.ts
src/runtimePaths.ts
src/server/serverLifecycle.ts
src/transports/httpTransport.ts
src/transports/stdioTransport.ts
src/oauth.ts
src/httpAuthConfig.ts
src/server/createMcpServer.ts
src/server/registerTools.ts
src/tools/domainToolboxes.ts
src/tools/runAllowedScript.ts
release/publication/package scripts
Cloudflare/tunnel setup UX
standalone generated-client-config UX
```

Those surfaces are either handled by later child cards or explicitly remain standalone-only.

Also do not port donor canonical/business facades such as Builder Report/catalog behavior as new A/I authority. WC60-02 must decide how A/I toolboxes route to A/I-owned canonical services.

## Donor Preservation

WC60-01 must not modify:

```text
ChampCity_GPT source
ChampCity_GPT tests
ChampCity_GPT package files
ChampCity_GPT config
ChampCity_GPT Git state
```

The Implementer Report must record donor `git status` after the pass and confirm it remains clean.

## Required Proof

1. Baseline test/evidence proves the donor was read at the exact required commit and the target began clean.
2. A/I contains an `agentHarness` low-level source boundary with no runtime import/path dependency on the donor checkout.
3. Ported repository tests prove:
   - list files;
   - bounded text read;
   - bounded search;
   - text-file inspection;
   - chunk/line continuation behavior;
   - Markdown section projection where ported;
   - path traversal denial;
   - binary/size policy behavior.
4. Patch tests prove proposal/hash/application integrity and rejection of mismatched/stale proposals.
5. Workspace/capability tests prove the primitives can distinguish read, artifact, patch, Git-inspection, and Git-mutation capability classes without yet asserting donor registry authority.
6. Source scans prove no target production import contains a path/package dependency on ChampCity_GPT.
7. Source scans prove the excluded Electron/CLI/server lifecycle is not copied into the Agent Harness boundary.
8. Target typecheck and build pass.
9. Focused Agent Harness tests pass.
10. Full A/I tests pass.
11. Donor repository remains clean and at the same HEAD after implementation.

## Acceptance Criteria

1. The donor baseline is verified exactly before implementation.
2. The target baseline is verified clean before implementation.
3. Reusable donor low-level behavior is owned by A/I under an Agent Harness namespace.
4. Ported source follows A/I module/build conventions instead of changing A/I to donor conventions.
5. Repository path/file/read/search/text projection behavior has equivalent bounded regression coverage.
6. Patch integrity primitives have equivalent regression coverage.
7. Workspace/capability primitives are available for A/I adaptation but do not independently choose the active project.
8. No standalone MCP server, HTTP/OAuth runtime, Electron launcher, CLI, release flow, or Browser integration is introduced yet.
9. No `runAllowedScript` execution model is introduced.
10. No shared package, submodule, subtree, symlink, synchronization mechanism, or donor dependency is created.
11. Donor repository remains unchanged and clean.
12. No Git mutation is performed.
13. Any donor behavior intentionally not ported must be enumerated in the Implementer Report with the reason it is standalone-only, superseded by A/I authority, or deferred to a later WC60 child.

## Implementer Report

Required path:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC60-01_snapshot_bound_champcity_gpt_core_port.md`

Leave `Document.Status=Pending`.

If complete and automated acceptance passes, proceed to WC60-02 without an individual Architect disposition.
