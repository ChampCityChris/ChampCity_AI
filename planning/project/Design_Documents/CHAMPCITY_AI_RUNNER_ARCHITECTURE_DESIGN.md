<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/design_document/CHAMPCITY_AI_RUNNER_ARCHITECTURE_DESIGN",
  "artifactType": "design_document",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/Design_Documents/CHAMPCITY_AI_RUNNER_ARCHITECTURE_DESIGN.json",
  "markdownPath": "planning/project/Design_Documents/CHAMPCITY_AI_RUNNER_ARCHITECTURE_DESIGN.md",
  "payload": {
    "kind": "design_document",
    "title": "ChampCity A/I Runner Architecture Design"
  },
  "payloadHash": "sha256:0e387088194e48b972abb38776cd7bbeedaa2ba5a67796037d1b802c1bb00402",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# ChampCity A/I Runner Architecture Design

Status: Proposed
Prepared: 2026-07-02
Project: ChampCity A/I
Primary repositories: ChampCity_AI and ChampCity_GPT

## 1. Purpose

This document captures the recommended development path for integrating ChatGPT, Codex, API-backed model execution, local models, and optional browser automation into ChampCity A/I without making any one execution surface the permanent product foundation.

The central design conclusion is that ChampCity A/I should not treat ChatGPT.com browser automation as the forward-facing supported product path. Instead, ChampCity A/I should implement a shared workflow core with multiple replaceable runner adapters.

The forward-facing supported product should use durable, supportable execution paths such as API-backed runners, Codex CLI where appropriate, local model runners, and ChampCity_GPT MCP-controlled repo access. The ChatGPT subscription/browser runner should be treated as an experimental, unsupported, power-user or founder-mode adapter because it depends on automating a private SaaS UI rather than a stable automation contract.

## 2. Executive Decision

ChampCity A/I will use a layered runner architecture:

```text
ChampCity A/I UI
        |
        v
Prompt Queue / Artifact Contract / Run Ledger / Cost Governor
        |
        v
Runner Adapters
        |-- API Runner
        |-- Codex CLI Runner
        |-- Local Model Runner
        |-- ChatGPT Browser Runner (experimental)
        |-- ChatGPT Assisted Launcher (fallback)
        |-- Workspace Agent Runner (future, if available)
        |
        v
ChampCity_GPT MCP / repo-safe read-write tools
        |
        v
Markdown + JSON artifacts in the ChampCity_AI repository
```

The stable product contract is not the runner. The stable product contract is:

- saved prompt artifacts;
- expected output paths;
- allowed write paths;
- run status;
- Markdown result files;
- JSON sidecar metadata;
- Implementer Reports, Validation Reports, Repair Prompts, and Closeout artifacts;
- repo-safe MCP read/write operations;
- run logging and cost estimates.

## 3. Problem Statement

ChampCity A/I is designed around an Architect / Implementer workflow. The Operator creates or approves scoped work. An Architect, often ChatGPT, frames the work and creates durable planning or handoff artifacts. An Implementer, often Codex, performs implementation work and creates Implementer Reports. The application must then ingest these artifacts, display progress, and guide validation or repair.

The Operator wants a button-click workflow inside ChampCity A/I, such as:

```text
Click button -> send saved prompt to ChatGPT or Codex -> receive Markdown result -> save result to repo -> app ingests result
```

Pure MCP does not fully solve this. MCP lets ChatGPT or Codex call tools exposed by ChampCity_GPT, but MCP alone does not normally make ChampCity A/I push a prompt into ChatGPT.com and force ChatGPT.com to execute it. Therefore, ChampCity A/I needs a runner layer.

## 4. Core Product Tension

The supported API path is architecturally cleaner, but token-metered usage can become expensive and unpredictable for reasoning-heavy workflows.

The subscription ChatGPT/Codex path is economically superior for many of this project’s highest-value activities:

- ambiguous reasoning;
- architecture design;
- debugging;
- repair-loop analysis;
- large implementation planning;
- iterative back-and-forth;
- long exploratory conversations.

However, subscription ChatGPT browser automation is not a stable platform contract. Chromium and Playwright/Puppeteer automation are mature, but ChatGPT.com’s private UI can change. The brittle part is not browser control; it is reliance on a fast-moving SaaS interface that does not guarantee DOM, layout, routing, completion-state, modal, or authentication stability.

The practical solution is to separate product architecture from execution adapters.

## 5. Product Strategy

### 5.1 Supported Public Product Path

The public, supportable product should be built around:

- API-backed execution for bounded tasks;
- Codex CLI runner where appropriate;
- local model runner for low-risk summarization/extraction/classification;
- ChampCity_GPT MCP for repo-safe access;
- deterministic Markdown/JSON artifact contracts;
- cost estimates and approval gates;
- reproducible run logs;
- clear user-facing status.

This path is supportable, documentable, and appropriate for a forward-facing product.

### 5.2 Experimental Power-User / Founder Path

The ChatGPT subscription browser runner should exist as an optional execution mode:

```text
Run with ChatGPT Subscription (Experimental)
```

This mode should be positioned as:

- local/browser-based;
- useful for reasoning-heavy Architect work;
- cost-controlled through the user’s ChatGPT subscription;
- potentially requiring login or manual recovery;
- not the standard supported automation path;
- replaceable by future official Workspace Agent or subscription-side trigger APIs if those become available.

### 5.3 Shared Core

Both paths must share the same workflow core. There should not be one product for API and another product for ChatGPT browser automation.

The shared core must include:

- Prompt Queue;
- Artifact Contract;
- Run Ledger;
- Cost Governor;
- Repository-safe MCP bridge;
- validation and repair workflow;
- progress/status model;
- artifact ingestion and indexing.

## 6. Runner Modes

### 6.1 API Runner

The API runner is the default supported automation path for bounded, measurable tasks.

Best uses:

- artifact summarization;
- Work Card field extraction;
- validation triage;
- structured JSON generation;
- Markdown sidecar generation;
- status classification;
- deterministic prompt rendering;
- low-to-medium complexity copy generation.

Avoid using the API runner by default for:

- large architecture decisions;
- exploratory planning;
- multi-step repo diagnosis;
- autonomous coding loops;
- high-reasoning repair analysis;
- unbounded conversation-style work.

The API runner must be governed by the Cost Governor.

### 6.2 Codex CLI Runner

The Codex CLI runner should be the preferred near-term automation route for Implementer work.

Flow:

```text
User clicks Run with Codex
        |
        v
ChampCity A/I saves Codex handoff prompt
        |
        v
ChampCity A/I invokes Codex CLI in the selected repo
        |
        v
Codex performs scoped implementation
        |
        v
Codex writes or is instructed to write Implementer Report / result artifact
        |
        v
ChampCity A/I watches repo and ingests result
```

This is less brittle than browser automation because Codex CLI is intended for command-line automation. It still requires local authentication and configuration.

### 6.3 Local Model Runner

The local model runner should be used for low-cost, low-risk, lower-judgment work.

Best uses:

- first-pass summaries;
- keyword extraction;
- artifact title generation;
- status label suggestions;
- Markdown cleanup;
- simple checklist drafting;
- offline or privacy-sensitive draft work.

Local model output should be treated as draft-quality unless validated.

### 6.4 ChatGPT Browser Runner (Experimental)

The ChatGPT browser runner is an optional experimental adapter for using the user’s ChatGPT subscription through a controlled Chromium browser.

The runner should not own workflow state. It should only submit a launch instruction and verify that the expected artifact was written.

Preferred flow:

```text
User clicks Run with ChatGPT Subscription
        |
        v
ChampCity A/I creates queued prompt artifact
        |
        v
Browser runner opens ChatGPT.com using existing user profile
        |
        v
Runner submits a short instruction telling ChatGPT to use ChampCity_GPT MCP
        |
        v
ChatGPT reads queued prompt through MCP
        |
        v
ChatGPT writes result through MCP
        |
        v
ChampCity A/I verifies expected Markdown artifact exists
```

The browser runner should avoid scraping long ChatGPT responses. It should rely on the repo artifact or MCP run ledger as the completion signal.

The runner should support visible mode and pause-for-user recovery when login, modal, connector approval, or unexpected UI conditions occur.

### 6.5 Assisted ChatGPT Launcher

This is the fallback path when full browser automation fails or is disabled.

Flow:

```text
User clicks Open in ChatGPT
        |
        v
ChampCity A/I saves queued prompt
        |
        v
ChampCity A/I opens ChatGPT.com
        |
        v
ChampCity A/I copies launch instruction to clipboard
        |
        v
User pastes/submits
        |
        v
ChatGPT uses MCP to save result
```

This still reduces friction while preserving a manual recovery path.

### 6.6 Workspace Agent Runner (Future)

If the user’s ChatGPT workspace exposes Workspace Agent API triggers, ChampCity can add a Workspace Agent runner later.

This should not be required for V1 because availability depends on plan/workspace access and product maturity. Even where triggering exists, the system may still need the agent to write results back through ChampCity_GPT MCP because trigger APIs may not return the completed result directly.

## 7. MCP Server Tool Requirements

ChampCity_GPT should own the MCP tool surface. ChampCity A/I should consume it or write artifacts in the same contract.

Recommended new toolbox:

```text
prompt_toolbox
```

Minimum actions:

```text
queue_prompt
list_queued_prompts
get_queued_prompt
mark_prompt_in_progress
save_prompt_result
record_prompt_run_event
save_codex_implementer_report
```

### 7.1 queue_prompt

Creates a durable queued prompt artifact in the repo.

Required fields:

- targetClient: chatgpt, codex, api, local, either;
- projectId;
- promptKind;
- title;
- promptMarkdown;
- sourceArtifactPaths;
- expectedOutputPath;
- allowedWritePaths;
- approvalRequired.

### 7.2 list_queued_prompts

Lists queued prompts by project, target client, and status.

### 7.3 get_queued_prompt

Returns the full prompt text, source paths, expected output path, and completion instructions.

### 7.4 mark_prompt_in_progress

Locks a queued prompt for a runner to avoid duplicate execution.

### 7.5 save_prompt_result

Writes the generated Markdown output to the approved repo path and optionally writes a JSON sidecar.

This tool must enforce:

- allowed path validation;
- no writes outside configured repo roots;
- no arbitrary absolute paths;
- no overwrite unless explicitly allowed;
- audit logging.

### 7.6 record_prompt_run_event

Records run lifecycle events, including started, tool-called, artifact-written, failed, completed, and manually-recovered.

### 7.7 save_codex_implementer_report

Writes Codex Implementer Reports into the expected phase folder and records validation commands, changed files, and remaining manual validation.

## 8. Recommended Repo Folders

Add deterministic folders under the ChampCity_AI repository:

```text
planning/handoffs/Queued_Prompts/
planning/handoffs/ChatGPT/
planning/handoffs/Codex/
planning/handoffs/API/
planning/handoffs/Local_Model/
planning/handoffs/Prompt_Runs/
planning/handoffs/Prompt_Results/
```

Final outputs should be routed to their phase-specific destinations where appropriate:

```text
planning/phases/phase-XX/Architect_Outputs/
planning/phases/phase-XX/Implementer_Reports/
planning/phases/phase-XX/Validation_Reports/
planning/phases/phase-XX/Repair_Prompts/
planning/phases/phase-XX/Closeout_Reports/
```

## 9. Cost Governor

The Cost Governor is required if API execution is supported.

Responsibilities:

```text
estimateRunCost()
classifyRunTier()
selectRunner()
enforceBudget()
logActualUsage()
compareEstimateToActual()
```

Recommended routing categories:

```text
ROUTE_SUBSCRIPTION_CHATGPT
ROUTE_SUBSCRIPTION_CODEX
ROUTE_API_FAST
ROUTE_API_REASONING
ROUTE_API_BATCH
ROUTE_LOCAL_MODEL
ROUTE_MANUAL
```

Default cost-control rules:

- high-reasoning Architect work should route to ChatGPT subscription by default;
- Implementer coding work should route to Codex subscription/CLI by default;
- bounded extraction/summarization/classification may route to API or local model;
- expensive API runs require approval;
- autonomous multi-step API coding loops require explicit spend envelopes;
- API prompts should be context-compiled, not conversation-replayed;
- static prompt prefixes should be cache-friendly;
- output tokens and reasoning tokens must be capped by task type.

Recommended Alpha caps:

```text
Hard monthly API cap: $25-$50
Per-run auto-approval cap: $0.25
Per-run warning threshold: $1.00
Per-run manual approval threshold: $2.00+
Daily cap: $5.00
No autonomous multi-step API coding without explicit approval
No long-context/pro API by default
```

## 10. User-Facing UI Model

The UI should not hide the runner distinction. It should make the route explicit while keeping the workflow simple.

Recommended buttons:

```text
Run with API
Run with Codex
Run Locally
Run with ChatGPT Subscription (Experimental)
Open in ChatGPT
```

Example explanation for experimental mode:

```text
Uses your ChatGPT subscription through a local browser runner. Best for reasoning-heavy workflows. May require occasional login or manual recovery. Not part of the standard supported automation path.
```

Example explanation for API mode:

```text
Fully automated and supported, but token-metered. ChampCity will estimate cost before running.
```

Example explanation for Codex mode:

```text
Uses your local Codex CLI setup for implementation work. Best for scoped Work Cards and Implementer Reports.
```

## 11. Browser Runner Guardrails

If implemented, the ChatGPT browser runner must follow these rules:

- no password capture;
- use an existing authenticated user browser profile;
- visible mode by default;
- headless/background mode only as advanced option;
- never scrape unrelated chats;
- only submit prompts created by ChampCity;
- only save output into approved repo paths;
- prefer MCP result artifact verification over DOM scraping;
- pause for user login, MFA, connector approval, or unexpected modals;
- capture screenshots/logs only when allowed by user settings;
- provide manual fallback.

The runner should be considered an adapter, not infrastructure.

## 12. Completion Signal Policy

Do not rely primarily on ChatGPT page state to determine success.

Weak signal:

```text
The response stopped streaming.
```

Better signal:

```text
The expected Markdown artifact exists at the approved repo path.
```

Best signal:

```text
ChampCity_GPT MCP run ledger records save_prompt_result completed and the expected Markdown/JSON artifacts validate.
```

## 13. Failure and Recovery Model

Each runner must report one of these states:

```text
queued
starting
waiting_for_user
running
artifact_written
completed
failed
cancelled
manual_recovery_required
```

Manual recovery should always preserve the prompt artifact and expected output path.

If the ChatGPT browser runner fails, the user should be able to:

- open assisted ChatGPT launcher;
- copy launch instruction;
- send the same prompt through API;
- send the same prompt to Codex if appropriate;
- run locally if appropriate;
- mark the run abandoned without losing artifacts.

## 14. Implementation Roadmap

### Phase A - Shared Artifact Contract

Deliverables:

- queued prompt file format;
- prompt result file format;
- sidecar JSON metadata format;
- deterministic folder structure;
- app ingestion of queued prompts and prompt results.

### Phase B - ChampCity_GPT MCP prompt_toolbox

Deliverables:

- queue_prompt;
- list_queued_prompts;
- get_queued_prompt;
- save_prompt_result;
- strict path validation;
- run event logging.

### Phase C - Codex CLI Runner

Deliverables:

- run Codex against saved prompt;
- capture output;
- require Implementer Report artifact;
- repo watcher detects result;
- status panel in ChampCity A/I.

### Phase D - API Runner and Cost Governor

Deliverables:

- task routing rules;
- token/cost estimate before run;
- per-run and daily/monthly budget caps;
- model selection policy;
- actual usage logging;
- context packet compilation.

### Phase E - ChatGPT Assisted Launcher

Deliverables:

- save prompt;
- open ChatGPT;
- copy launch instruction;
- watch expected output path;
- provide manual completion state.

### Phase F - ChatGPT Browser Runner Experimental

Deliverables:

- controlled Chromium launch;
- existing user profile support;
- launch instruction submission;
- pause-for-user recovery;
- result verification through repo/MCP;
- evidence capture;
- visible experimental labeling.

### Phase G - Workspace Agent Runner Research

Deliverables:

- determine plan/workspace access;
- verify Workspace Agent trigger availability;
- prototype trigger path if available;
- retain MCP result writeback as source of truth.

## 15. Acceptance Criteria

This architecture is acceptable when:

- ChampCity A/I can create a queued prompt artifact from a button click;
- ChatGPT, Codex, API, or local runner can consume the same prompt artifact;
- generated Markdown can be saved to an approved repo path;
- ChampCity A/I can ingest and display the result;
- run status is visible to the Operator;
- API costs are estimated before execution;
- unsupported ChatGPT browser automation is clearly labeled experimental;
- manual fallback exists for every runner;
- no runner owns durable workflow state;
- the same artifact contract works across all runners.

## 16. Architecture Decision Record Draft

Title: Use Shared Runner Architecture with Experimental Subscription Runner

Decision:

ChampCity A/I will implement a shared prompt queue, artifact contract, run ledger, cost governor, and repo-safe MCP bridge. Execution will be delegated to replaceable runner adapters. API-backed, Codex CLI, and local model runners will form the supported product path. ChatGPT subscription browser automation will be implemented, if at all, as an experimental power-user/founder-mode runner adapter and not as the forward-facing support foundation.

Rationale:

- API execution is cleaner and more supportable but can become expensive for reasoning-heavy work.
- Subscription ChatGPT and Codex are economically superior for exploratory architecture and implementation planning.
- Browser automation is technically feasible but depends on a non-contractual UI surface.
- A shared artifact contract prevents runner instability from corrupting product workflow state.
- Future official Workspace Agent or subscription trigger paths can replace the browser runner without redesigning the application.

Consequences:

- ChampCity must build runner abstraction as a first-class architecture component.
- ChampCity_GPT MCP should gain prompt queue and prompt result tools.
- ChampCity A/I must expose runner status and manual recovery paths.
- The ChatGPT subscription runner must be labeled experimental and treated as optional.
- The public product remains supportable through API/Codex/local runners.

Status: Proposed.

## 17. Next Recommended Work Card

Create a ChampCity_GPT Work Card to implement `prompt_toolbox` with the first four actions:

```text
queue_prompt
list_queued_prompts
get_queued_prompt
save_prompt_result
```

Then create a ChampCity_AI Work Card to add a button-driven prompt queue workflow and result watcher.

The first proof loop should be:

```text
ChampCity A/I button creates queued prompt
ChatGPT reads queued prompt through MCP
ChatGPT writes Markdown result through MCP
ChampCity A/I detects and displays the result
```

## Document Disposition
Document.Status=Pending
