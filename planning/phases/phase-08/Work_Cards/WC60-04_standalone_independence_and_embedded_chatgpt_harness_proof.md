<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "implementationEvidence",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC60-04",
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
      "path": "planning/phases/phase-08/Work_Cards/WC60-02_ai_authority_workspace_and_toolbox_adaptation.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC60-03_ai_owned_mcp_http_oauth_runtime_and_lifecycle.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Standalone Independence and Embedded ChatGPT Harness Proof",
    "status": "approved_for_implementation",
    "sequence": 4,
    "bundleReview": "WC60",
    "dependsOn": ["WC60-01", "WC60-02", "WC60-03"],
    "donorCommit": "aaf72e00f6204325a9fd340dc5f53b62d0f8df1c",
    "gitMutationAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC60-04_standalone_independence_and_embedded_chatgpt_harness_proof.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Complete the WC60 ingestion by proving the A/I-owned Agent Harness operates independently of the standalone ChampCity_GPT product and aligns with the existing embedded ChatGPT/MCP handoff surface. Add only the bounded status/diagnostic integration needed for proof. Do not generalize Browser roles or implement Browser Implementer/worker orchestration in this card.",
    "reviewedAt": "2026-08-22"
  }
}
CHAMPCITY-METADATA -->

# WC60-04 — Standalone Independence and Embedded ChatGPT Harness Proof

Status: Approved for Implementer execution  
Parent bundle: `WC60`  
Sequence: 4 of 4  
Depends on: `WC60-01`, `WC60-02`, `WC60-03` complete  
Git mutation: prohibited

## Purpose

Prove that the ChampCity_GPT ingestion is complete as an **independent ChampCity A/I capability**.

At the end of this card:

- ChampCity A/I owns and runs the Agent Harness MCP service;
- the current selected A/I project is the tool workspace;
- existing A/I MCP handoff prompts and harness workspace identity agree;
- the standalone ChampCity_GPT application is not required to be running;
- the A/I harness can serve ChatGPT-compatible discovery and repository operations;
- the existing embedded ChatGPT surface has the information needed to use the A/I-owned endpoint;
- no Browser Implementer/general agent-role redesign has been smuggled into the ingestion bundle.

## Governing Proof Model

```text
ChampCity A/I selected project
        ↓
A/I Agent Harness workspace adapter
        ↓
A/I-owned MCP HTTP/OAuth runtime
        ↓
ChatGPT-compatible tools/list + tools/call
        ↓
repo/git/artifact/diagnostic providers
        ↓
selected project

Standalone ChampCity_GPT process
        X not required
```

## Existing Embedded Browser Boundary

ChampCity A/I already embeds ChatGPT under the Architect browser foundation using the persistent partition:

```text
persist:champcity-architect
```

WC60-04 must **reuse this existing browser/session foundation** for the ingestion proof.

Do not create:

- another ChatGPT login/session stack;
- a second browser partition for Implementer;
- a general multi-agent browser router;
- Browser Implementer/Verifier/Validator roles;
- automated browser interaction with ChatGPT;
- DOM scraping or credential extraction.

Generalizing `architectBrowserService` into a neutral `AgentBrowserService` remains a future card unless a minimal name-neutral refactor is strictly necessary to expose harness status. Do not perform a broad browser redesign here.

## MCP Handoff Alignment

The existing A/I prompt/handoff contract already derives the MCP workspace ID from the selected project root.

The WC60 Agent Harness must use the same identity.

Required proof example:

```text
selected root basename: FO76_Collector
handoff workspaceId: fo76_collector
harness workspaceId: fo76_collector
```

No `.champcity/mcp-workspace-binding.json` or donor workspace registry may override the selected-root route as runtime authority.

Update bounded handoff/status data where useful so the A/I UI can answer:

```text
Is the Agent Harness running?
Which MCP endpoint is A/I hosting?
Is OAuth/public connector configuration present?
Which workspaceId/project is currently exposed?
Do the handoff prompt and harness agree on that workspaceId?
```

Do not place tokens, OAuth secrets, or private configuration contents into handoff text.

## Minimal Harness Status Surface

Use the WC60-03 runtime status contract to expose a small A/I-owned harness status/diagnostic surface in the existing application.

It should make at least these states visible:

```text
Harness: stopped | starting | running | stopping | failed
Active workspaceId
Selected project identity/root summary
Local MCP endpoint
Public connector configuration: configured | not configured
OAuth: configured | not configured
Public tool exposure summary/count
Last startup failure, if any
```

This may live in the current Architect/browser/status area or another existing bounded diagnostics area.

Do not add a large standalone-style setup wizard in WC60-04.

## Automated End-to-End MCP Proof

Create an automated integration test that uses the actual A/I-owned MCP HTTP runtime and a temporary selected project workspace.

The proof must exercise the public protocol rather than calling toolbox implementation functions directly.

Required sequence:

```text
create temporary selected project
→ start A/I Agent Harness on loopback/ephemeral port
→ initialize MCP client/session as required by target SDK
→ tools/list
→ verify intended public toolbox exposure
→ repo_toolbox.status
→ repo_toolbox.list_files
→ repo_toolbox.read_file or bounded text read
→ repo_toolbox.search_files
→ write a bounded test Markdown artifact through the public write path with authorized test scope/context
→ read the written artifact back
→ git_toolbox.status when temporary project is Git-backed
→ diagnostics_toolbox reports the same selected workspaceId
→ stop harness
→ verify listener/runtime closed
```

Use temporary test repositories/workspaces. Do not use permissive fixtures that bypass the production workspace/tool authority path.

The test must not require the ChampCity_GPT server/application to be running and must not import donor runtime source.

## Standalone-Independence Proof

Add static/runtime regression evidence proving all of these are absent from A/I production operation:

```text
npm file/workspace dependency on ChampCity_GPT
Git submodule/subtree dependency
runtime import from sibling ChampCity_GPT checkout
build/test copy from sibling checkout
symlink/junction to donor source
spawn/exec of ChampCity_GPT CLI or packaged app
IPC to standalone ChampCity_GPT
read of ChampCity_GPT runtime/config directories as A/I authority
```

Source provenance references in documentation/Implementer Reports are allowed and expected.

The donor repository itself must still be clean at the exact original donor HEAD after WC60-04.

## Embedded ChatGPT Connector Readiness

A hosted ChatGPT surface may require an HTTPS-reachable MCP endpoint and OAuth registration. WC60 does not automate a reverse tunnel or manipulate the user's ChatGPT account.

The implementation must nevertheless make the A/I-owned service connector-ready:

- public base URL can be supplied through A/I-owned configuration;
- OAuth metadata/DCR/PKCE endpoints resolve from the A/I service when configured;
- handoff/status surfaces identify whether public connector configuration is present;
- no standalone ChampCity_GPT process is required behind the endpoint.

### Manual Operator validation after automated proof

After the WC60 bundle passes Architect review, Operator validation may point an existing/new ChatGPT MCP connector at the A/I-owned public endpoint and verify the embedded ChatGPT surface can:

```text
see the ChampCity Agent Harness tools
use the expected selected workspaceId
list/read/search the selected project
perform one bounded authorized artifact write
```

If an external HTTPS route or ChatGPT connector registration is not currently configured, that is an external setup boundary for the live manual validation; it is not permission for the Implementer to invent tunnel infrastructure inside WC60.

## Preserve Current A/I Workflow Behavior

WC60-04 must not regress:

- existing Architect browser session persistence/navigation behavior;
- current MCP workspace handoff prompt generation;
- canonical Architect output workflows;
- Work Card/Implementer Report workflow;
- WC57 deterministic development-environment preflight/resolution;
- WC58 Codex App Server implementation path;
- current selected-project switching.

The Agent Harness is an additional model-facing infrastructure service, not a replacement for these systems.

## No Role-Orchestration Expansion

Do not implement the next architecture stage in this card.

Explicitly absent from WC60-04:

```text
Browser GPT as Work Card Implementer
Browser GPT as Independent Verifier
Browser GPT as Validator
execution_toolbox
agent_toolbox.delegate_codex
agent_toolbox.delegate_local
CodexWorkerService extraction
local-model worker
multi-agent task queue
cost/latency worker routing
```

Those require later Work Cards after WC60 establishes a stable harness.

## Required Proof

1. Protocol-level E2E test starts the A/I-owned MCP runtime and performs the required public tool sequence against a temporary selected workspace.
2. `tools/list` exposes the intended A/I-owned public tool surface through target MCP SDK/runtime.
3. Tool calls use the same selected workspace ID as `mcpWorkspacePromptContract`.
4. Foreign/nonselected workspace IDs fail deterministically.
5. Bounded Markdown write through the public MCP write path succeeds only with the required write scope/authority and is readable afterward.
6. Git status/inspection works for a Git-backed selected test repository without Git mutation.
7. Harness diagnostics report the same active selected workspace identity used by repo/git tools.
8. Start/stop proof confirms runtime/listener cleanup.
9. Static scan proves there is no target runtime/build/test dependency on the donor repository/application.
10. Donor repository `HEAD` remains `aaf72e00f6204325a9fd340dc5f53b62d0f8df1c` and its worktree remains clean.
11. Existing Architect browser/navigation/session tests remain green.
12. Existing A/I MCP handoff prompt tests remain green.
13. WC57/WC58 focused regressions remain green.
14. Typecheck, build, focused Agent Harness/MCP tests, and full A/I suite pass.
15. No Browser-role orchestration or future-worker code is introduced.

## Acceptance Criteria

1. A/I's Agent Harness runs and serves tools without the standalone ChampCity_GPT application running.
2. A/I production/build/tests have no donor repository dependency beyond source provenance documentation.
3. The harness and current A/I handoff prompt resolve the same selected-project workspace ID.
4. Public MCP tool discovery and bounded selected-project repository operations succeed end to end through the A/I-owned HTTP runtime.
5. A bounded authorized public write path succeeds without bypassing OAuth/action authority.
6. Git inspection succeeds without introducing Git mutation.
7. Harness runtime/connector/workspace status is visible in A/I without exposing secrets.
8. Existing embedded Architect ChatGPT session foundation remains intact and connector-ready for the A/I-owned endpoint.
9. No standalone ChampCity_GPT setup UI/runtime process is copied or required.
10. No new shared package/synchronization mechanism is introduced.
11. No Browser Implementer/Verifier/Validator, execution toolbox, or worker delegation is introduced.
12. Donor repository remains clean and unchanged.
13. All required automated validation passes.
14. No Git mutation is performed.

## Final WC60 Report Rule

This is the final child card.

Required report path:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC60-04_standalone_independence_and_embedded_chatgpt_harness_proof.md`

Leave `Document.Status=Pending`.

After this report exists and states complete, stop. Do not create child Architect reviews. Return the complete WC60 parent + four child Work Cards + four Pending Implementer Reports for one integrated Architect bundle review.
