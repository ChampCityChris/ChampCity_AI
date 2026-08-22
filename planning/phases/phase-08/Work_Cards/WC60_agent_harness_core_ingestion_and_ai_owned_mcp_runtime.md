<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC60"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC58_autonomous_codex_approval_and_interaction_resolution.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC58-REPAIR01_app_server_lifecycle_approval_ownership_and_observability_completion.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC55_selected_project_root_mcp_routing_and_prompt_policy_cleanup.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "ChampCity Agent Harness Core Ingestion and A/I-Owned MCP Runtime Bundle",
    "status": "approved_for_implementation",
    "executionMode": "four sequential child Work Cards with one Architect bundle review after all four Implementer Reports are complete",
    "prerequisite": "WC58-REPAIR01 must pass Architect review and the Operator must establish a clean ChampCity_AI Git baseline before WC60-01 begins",
    "childWorkCards": ["WC60-01", "WC60-02", "WC60-03", "WC60-04"],
    "donorWorkspaceId": "champcity_gpt",
    "donorRepository": "ChampCityChris/ChampCity_GPT_MCP",
    "donorBranch": "dev",
    "donorCommit": "aaf72e00f6204325a9fd340dc5f53b62d0f8df1c",
    "targetWorkspaceId": "champcity_ai",
    "gitMutationAuthorized": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Perform a one-way, snapshot-bound ingestion of the proven ChampCity_GPT MCP core into ChampCity A/I as the first ChampCity Agent Harness implementation. ChampCity_GPT remains an independently developed standalone product. Do not create a shared package, runtime dependency, synchronization mechanism, or coupled development workflow. Port and adapt the donor core into A/I ownership, then prove the A/I-owned MCP runtime operates against the selected A/I project without the standalone ChampCity_GPT application running.",
    "reviewedAt": "2026-08-22"
  }
}
CHAMPCITY-METADATA -->

# WC60 — ChampCity Agent Harness Core Ingestion and A/I-Owned MCP Runtime Bundle

Status: Approved implementation bundle  
Target repository: `ChampCity_AI`  
Donor repository: `ChampCity_GPT` / `ChampCityChris/ChampCity_GPT_MCP`  
Donor baseline: `dev` @ `aaf72e00f6204325a9fd340dc5f53b62d0f8df1c`  
Git mutation: prohibited

## Purpose

Bring the proven ChampCity_GPT MCP core into ChampCity A/I as A/I-owned source code and establish the first production `ChampCity Agent Harness` runtime.

This is a **clean one-way ingestion**, not a repository merger and not the beginning of synchronized co-development.

ChampCity_GPT continues as its own standalone product for users who want a ChatGPT-compatible local-repository MCP server without ChampCity A/I. ChampCity A/I receives a snapshot-bound port of the useful core and thereafter owns its copy independently unless a later Operator-approved architecture decision establishes a shared package because real duplicated maintenance demonstrates the need.

The intended ownership model after WC60 is:

```text
ChampCity_GPT standalone product
    │
    └── continues independently

snapshot at dev/aaf72e00...
    │
    └── one-way source ingestion
             ↓
        ChampCity A/I
             │
             └── ChampCity Agent Harness
                    ├── A/I-owned MCP server/runtime
                    ├── repository/workspace tools
                    ├── tool exposure + telemetry
                    ├── OAuth/HTTP connector foundation
                    └── A/I authority adapters
```

There is no runtime arrow back to ChampCity_GPT.

## Clean-Break Contract

WC60 must preserve all of the following:

1. `ChampCity_GPT` is a **read-only donor** for this implementation bundle.
2. The donor snapshot is exactly:

```text
workspaceId: champcity_gpt
repository: ChampCityChris/ChampCity_GPT_MCP
branch: dev
commit: aaf72e00f6204325a9fd340dc5f53b62d0f8df1c
```

3. The donor repository must remain clean and unmodified throughout WC60.
4. ChampCity A/I must not depend on the donor repository at runtime, build time, test time, packaging time, or release time.
5. Do not create:
   - a Git submodule;
   - a Git subtree synchronization workflow;
   - an npm `file:`/workspace dependency on ChampCity_GPT;
   - a symlink/junction to donor source;
   - a build-time copy script that reads the sibling donor repository;
   - a runtime import from the donor checkout;
   - IPC/process delegation to the standalone ChampCity_GPT application;
   - a synchronization script or automatic upstream/downstream merge mechanism;
   - a new shared package solely to avoid code duplication.
6. ChampCity A/I owns the ingested implementation under an A/I namespace such as:

```text
src/main/agentHarness/
```

7. Future sharing between the products is explicitly deferred. It requires separate evidence and Operator authorization after duplicated fixes or maintenance burden demonstrate that a shared library is warranted.

## Baseline Gate

Before WC60-01 changes production source, the Implementer must verify and record:

```text
Donor ChampCity_GPT:
- branch = dev
- HEAD = aaf72e00f6204325a9fd340dc5f53b62d0f8df1c
- worktree = clean

Target ChampCity_AI:
- current branch
- current HEAD
- worktree = clean
```

The Operator intends to establish the clean ChampCity_AI baseline before handing WC60 to the Implementer.

If the donor baseline differs, stop with:

```text
BLOCKED_DONOR_BASELINE_MISMATCH
```

If the target worktree is not clean at WC60-01 start, stop with:

```text
BLOCKED_TARGET_BASELINE_NOT_CLEAN
```

Do not silently ingest a newer donor snapshot and do not clean/reset/stash either repository.

## Governing Product Boundary

### ChampCity_GPT remains responsible for its standalone product

The donor continues to own its own:

- Electron launcher/setup experience;
- standalone CLI entrypoint;
- standalone runtime/config directories;
- standalone release/package flow;
- standalone user configuration;
- public distribution concerns;
- future features chosen for ChampCity_GPT users.

WC60 performs no donor product work.

### ChampCity A/I owns the Agent Harness

A/I owns:

- selected-project authority;
- canonical workflow and artifact state;
- development-environment authority established by WC56/WC57;
- Codex worker execution established by WC58;
- A/I Electron lifecycle;
- A/I `userData` persistence;
- the ingested MCP runtime and model-facing tools;
- future Browser GPT/local model/Codex worker orchestration.

Donor code must be adapted to those A/I authorities rather than importing a competing authority model wholesale.

## Donor Snapshot Classification

The donor baseline contains useful reusable implementation in areas including:

```text
src/security/
src/server/
src/tools/
src/transports/
src/utils/
src/validation/
src/workspaceAuthority.ts
src/workspaceCapabilities.ts
src/workspaceWritePolicy.ts
src/workspaces.ts
src/writeAccess.ts
src/oauth.ts
src/httpAuthConfig.ts
src/pendingPatches.ts
```

The donor public tool surface currently includes:

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

The donor also contains standalone-product code that must **not** be copied as A/I architecture, including its Electron launcher/setup shell, standalone CLI/runtime-path management, publication/release workflow, and generic standalone lifecycle/config behavior where A/I already owns the equivalent concern.

WC60 child cards define the exact ingestion boundary.

## Compatibility Direction

Port donor behavior into the current ChampCity A/I technical stack. Do not downgrade A/I to donor package versions.

Current verified package mismatch includes:

```text
ChampCity_GPT donor:
- ESM / NodeNext-oriented source
- @modelcontextprotocol/sdk ^1.13.0
- React 19
- Electron 42
- TypeScript 5.8

ChampCity A/I target:
- CommonJS-oriented TypeScript build
- @modelcontextprotocol/sdk ^1.30.0
- React 18
- Electron 31
- TypeScript 5.5
```

The Implementer must adapt source to the target repository's current module/build/runtime conventions. Do not copy donor `package.json`, `tsconfig`, Electron version, React version, or module mode into A/I.

## A/I Authority Rules

The ingested harness must obey these product authorities:

1. **Selected project root is authoritative.** The current A/I selected workspace/project is the harness workspace. Do not require an independent ChampCity_GPT allowed-roots registry to decide which project A/I is operating on.
2. **A/I canonical workflow/artifacts remain authoritative.** Do not introduce a second planning/workflow/artifact-state engine from donor code.
3. **Git mutation remains governed by the active A/I Work Card/workflow.** Donor Git tooling does not become independent permission authority.
4. **WC57 owns development environment.** Do not port donor `runAllowedScript` as a substitute execution/provisioning system.
5. **WC58 owns the Codex worker/App Server path.** Do not replace or duplicate it during ingestion.
6. **A/I owns process environment.** Do not port donor server lifecycle behavior that temporarily rewrites global `process.env`.
7. **A/I owns persistent runtime state.** OAuth/server/runtime settings required by the A/I harness live under A/I-owned `userData`/settings, not ChampCity_GPT runtime directories.

## Child Work Cards

### WC60-01 — Snapshot-Bound ChampCity_GPT Core Port

Create the A/I-owned `agentHarness` source boundary and port the reusable low-level core from the exact donor snapshot: error/result handling, path/file policy, bounded text projection, repository traversal, patch primitives, workspace/capability primitives, audit/tool-call/result telemetry, and protocol-neutral support code. Preserve donor behavior with adapted tests while excluding standalone shell/runtime concerns.

### WC60-02 — A/I Authority, Workspace, and Toolbox Adaptation

Build the A/I harness-facing tool layer on top of the ingested core. Preserve useful public toolbox compatibility while replacing donor standalone workspace/config/artifact authority with selected-project and A/I workflow authority. Make tool registration composable rather than a monolithic global donor catalog.

### WC60-03 — A/I-Owned MCP HTTP/OAuth Runtime and Lifecycle

Port/adapt MCP server construction, ChatGPT-compatible tool exposure/schema handling, HTTP transport, OAuth/DCR/PKCE, runtime telemetry, and server lifecycle into A/I ownership. Store runtime state under A/I `userData`, avoid global environment rewriting, and start/stop through the A/I Electron lifecycle.

### WC60-04 — Standalone Independence and Embedded ChatGPT Harness Proof

Prove the final integrated A/I harness can serve the selected project independently of the standalone ChampCity_GPT application/repository and is usable by the existing embedded ChatGPT surface without redesigning agent roles. Validate tool discovery, selected-workspace routing, bounded repository read/search/write behavior, lifecycle, and connector diagnostics. This is an ingestion proof, not Browser Implementer orchestration.

## Bundle Review Rule

The four children are sequential:

```text
WC60-01 → WC60-02 → WC60-03 → WC60-04
```

Each child must produce its required Pending Implementer Report and may proceed to the next child when:

- its production implementation is complete;
- its required focused tests pass;
- target repository remains free of unrelated scope expansion; and
- donor repository remains unchanged.

**Do not create individual Architect approval dispositions for WC60-01/02/03/04.**

After all four Pending Implementer Reports exist and state complete, the Architect performs one integrated WC60 review against:

- parent WC60;
- all four child Work Cards;
- all four Implementer Reports;
- the final integrated A/I production source;
- donor-baseline preservation evidence; and
- full regression results.

A child that is incomplete or blocked stops the sequence and returns to Architect disposition.

## Bundle Acceptance

WC60 is not complete until the integrated result proves all of the following:

1. ChampCity A/I contains an A/I-owned Agent Harness implementation derived from the exact donor commit `aaf72e00f6204325a9fd340dc5f53b62d0f8df1c`.
2. The donor repository was read only and remains unchanged/clean.
3. The target A/I repository has no submodule, subtree-sync, sibling-file dependency, symlink, local npm dependency, runtime import, build-time copy, or IPC/process dependency on ChampCity_GPT.
4. A/I builds/tests with the donor application stopped and without reading donor files at runtime/test runtime.
5. Current A/I package/runtime versions remain authoritative; A/I is not downgraded to the donor stack.
6. The Agent Harness projects the **current selected A/I project root** as its workspace authority.
7. Donor standalone workspace configuration does not override the A/I selected-project authority.
8. A/I canonical workflow/artifact services remain authoritative; no parallel canonical workflow engine is introduced.
9. The A/I-owned public MCP surface exposes the intended bounded model-facing toolboxes through composable registration and server-side action validation.
10. Repository list/read/search and bounded write/patch behavior operate against the selected project through A/I-owned code.
11. Git inspection remains available where the selected project is Git-backed, while Git mutation remains subordinate to A/I authorization and is not granted merely because donor tooling supports it.
12. MCP HTTP and OAuth/DCR/PKCE runtime behavior is hosted by ChampCity A/I, not the standalone donor process.
13. Harness runtime/config/OAuth/log/generated state is rooted in A/I-owned runtime state and does not use ChampCity_GPT runtime directories.
14. Starting/stopping the harness does not temporarily rewrite unrelated A/I `process.env` state.
15. A/I application shutdown deterministically stops the A/I-owned MCP server/runtime.
16. Existing embedded ChatGPT can be pointed at/discover the A/I-owned MCP endpoint without requiring the standalone ChampCity_GPT app to run.
17. Tool discovery resolves the selected project workspace identity expected by existing A/I MCP handoff prompts.
18. A protocol/E2E proof demonstrates tool discovery plus selected-workspace list/read/search and a bounded write path through the A/I-owned MCP runtime.
19. No `execution_toolbox`, Browser Implementer orchestration, local-model worker, Codex delegation API, or automatic multi-agent router is added in WC60.
20. WC57 development-environment behavior and WC58 Codex App Server behavior remain intact.
21. Typecheck, build, focused harness tests, MCP protocol tests, and the full repository suite pass.
22. No Git mutation is performed by the Implementer.

## Explicit Deferrals

The following are future cards, not hidden WC60 scope:

- Browser ChatGPT as the primary Implementer/Verifier/Validator role;
- generalized `AgentBrowserService` role orchestration beyond the minimum ingestion proof;
- an A/I `execution_toolbox` for arbitrary development commands/builds/tests;
- Browser GPT delegation to the WC58 Codex worker;
- local-model worker integration;
- cost/capability-aware automatic worker routing;
- a shared Agent Harness package used by both repositories;
- synchronization or upstream/downstream merge automation between A/I and ChampCity_GPT;
- redesign of the standalone ChampCity_GPT product.

## Negative Constraints

- Do not modify ChampCity_GPT.
- Do not merge repository histories.
- Do not create Git submodules/subtrees.
- Do not create a shared package in this bundle.
- Do not downgrade A/I dependencies to donor versions.
- Do not copy the donor Electron launcher/setup UI into A/I.
- Do not copy donor release/publication tooling into A/I.
- Do not port `runAllowedScript` as the A/I execution engine.
- Do not let donor artifact/catalog logic replace A/I canonical planning/workflow authority.
- Do not mutate global Codex configuration.
- Do not redesign WC57 or WC58.
- Do not perform Git mutation.
