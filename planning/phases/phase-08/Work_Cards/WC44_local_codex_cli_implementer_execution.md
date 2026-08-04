<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC44"
  },
  "sourceRevisions": [
    {
      "path": "planning/project/Design_Documents/WORK_CARD_LIFECYCLE_REVIEW_REPAIR_AND_VALIDATION_WORKSPACE_DEFINITION.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC43-REPAIR03_automatic_implementer_report_and_build_review_workspace.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC43-REPAIR02_remove_work_card_heading_gates_and_reuse_shared_dual_pane.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Local Codex SDK Implementer Execution",
    "status": "approved_for_implementation",
    "executionMode": "one bounded local Codex SDK execution capability",
    "dependsOn": [
      "WC43-REPAIR03"
    ],
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44_local_codex_cli_implementer_execution.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Add a bounded Build / Review capability that uses the local Codex SDK, backed by the Operator's existing local Codex authentication, to execute the Approved Work Card in the selected project root and return to the existing Implementer Report review workflow. Do not store credentials, add an API-key path, or create a separate execution packet.",
    "reviewedAt": "2026-08-03"
  }
}
CHAMPCITY-METADATA -->

# WC44 — Local Codex SDK Implementer Execution

Status: Approved for Implementer execution  
Git mutation: prohibited

## Verified Repository Evidence

The current Work Card lifecycle design states that the Approved Formal Work Card is the Implementer instruction and that no separate Implementer Execution Packet or primary Implementer prompt artifact is created. The Implementer consumes the Approved Formal Work Card, performs the bounded implementation, and completes the existing `Implementer_Report`; the report remains the durable review target.

The current Build / Review production path was inspected:

```text
Approved Formal Work Card
→ work-card-building-review current workflow
→ deterministic Implementer Report target
→ canonical Pending Implementer Report shell
→ WorkCardBuildingReviewWorkspace
→ report disposition
→ Work Card Validation or Repair
```

The inspected repository surface includes Work Card Building service logic, Formal Work Card planning service, generic Architect-output review, current workflow, IPC and preload exposure, shared workspace contracts, document classification, renderer workspace wiring, canonical report persistence, downstream validation eligibility, and existing service, workflow, renderer, and wiring tests.

Confirmed current behavior:

- the application can register and display the exact Pending Implementer Report;
- the Operator can manually pass the Approved Work Card and report target to Codex outside the application;
- after manual Codex work, the application can review the repository-backed report;
- no production service currently starts, tracks, or cancels local Codex execution;
- no production path binds a Codex run to the selected project root, exact Approved Work Card, and existing report target;
- no production path captures Codex execution state, report-update state, and review readiness.

External product facts reviewed for this card:

- Codex TypeScript SDK is the primary integration mechanism for embedding Codex in a TypeScript application. The SDK wraps the local Codex CLI, starts threads, supports `run()` and streamed execution, and exchanges JSONL events through stdin/stdout.
- Codex SDK supports `workingDirectory` and `skipGitRepoCheck` options for a thread.
- Codex CLI supports Sign in with ChatGPT and stores credentials locally; ChampCity A/I must rely on that local Codex authentication rather than storing credentials.
- Codex app-server provides a richer local interface over stdio and is used for rich clients, but WebSocket transport is experimental or unsupported for production use.

## Objective

Add one bounded Implementer execution capability to the Build / Review workspace:

```text
Approved Work Card + existing Pending Implementer Report
→ Operator launches local Codex execution from ChampCity A/I
→ ChampCity A/I uses Codex SDK as the primary integration
→ Codex runs in the selected project root using local Codex authentication
→ Codex receives the exact Work Card/report prompt
→ Codex discovers project-local instructions and implements the Work Card
→ Codex updates the existing Implementer Report
→ ChampCity A/I refreshes and returns to normal report review
```

This card does not add a cloud Codex agent, API-key management, hosted automation server, ChatGPT web automation, separate execution packet, alternate report artifact, or autonomous approval path.

## Runtime Sequence

```text
Selected project root and current work-card-building-review projection
→ Operator selects Run Codex Implementer
→ application validates exact Approved Formal Work Card and existing Pending Implementer Report
→ application builds one prompt from current repository evidence
→ application starts one Codex SDK thread with workingDirectory = selected project root and skipGitRepoCheck = true
→ application sends the prompt through the SDK run/stream API
→ application streams bounded structured events and tracks completion, cancellation, elapsed time, and errors
→ Codex modifies files only inside the selected project root and updates the existing report
→ execution completes, fails, or is cancelled
→ application refreshes document inventory and current workflow
→ existing Build / Review workspace selects the Implementer Report for review
```

Failure path:

```text
missing Codex package/runtime, missing local authentication, invalid selected root, missing Approved Work Card, missing Pending report, SDK start error, nonzero execution outcome, timeout, or cancellation
→ no application-created implementation files
→ no alternate report
→ existing repository bytes remain whatever Codex actually changed before the failure
→ UI reports the exact failure and keeps the report review workflow visible
```

## Required Changes

### 1. Codex SDK dependency and service boundary

Add the official Codex TypeScript SDK dependency when not already present:

```text
@openai/codex-sdk
```

Create a main-process service responsible for Codex execution sessions. The service must use the SDK as the primary production integration.

The service must support exactly one in-flight Codex execution per selected workspace. A second launch while one is active must be rejected with an actionable message.

The service must expose a typed execution model containing:

```text
state: unavailable | ready | running | completed | failed | cancelled
integrationMode: sdk | app-server-stdio-fallback
phaseId
workCardId
workCardTitle
projectRoot
formalWorkCardPath
formalWorkCardRevision
formalWorkCardSha256
implementerReportPath
implementerReportRevision
implementerReportSha256
startedAt
completedAt
elapsedMs
eventTail
stderrTail
finalResponseTail
failureReason
reportUpdated
reportSha256After
```

`eventTail`, `stderrTail`, and `finalResponseTail` must be bounded in memory. Do not persist Codex events, stdout, stderr, final responses, or reasoning into the selected project repository or ChampCity planning artifacts automatically.

### 2. Integration hierarchy

The implementation hierarchy is fixed:

1. **Primary:** TypeScript Codex SDK.
2. **Secondary:** local `codex app-server` over stdio only if the SDK cannot satisfy a required status, streaming, or cancellation behavior and the Implementer documents the exact SDK limitation.
3. **Not authorized as the primary production mechanism:** raw direct `codex exec` process spawning from ChampCity A/I.

The SDK path may use the underlying local Codex CLI because the SDK itself wraps the CLI. That is acceptable. ChampCity A/I must not implement its own general-purpose Codex command wrapper when the SDK can provide the required behavior.

The app-server fallback, if used, must be local stdio only. WebSocket app-server transport is not authorized in this card.

### 3. Authentication boundary

ChampCity A/I must rely on the Operator's existing local Codex authentication. It must not create or manage authentication.

The application must not:

- run `codex login` or `codex --login`;
- request, display, store, copy, or inject Codex credentials;
- request, display, store, copy, or inject OpenAI API keys;
- set or mutate `CODEX_HOME`;
- parse token files under the Codex credential store;
- create API keys;
- write provider credentials to environment files, settings files, logs, reports, or diagnostics;
- override the Operator's Codex account, model, subscription, approval, sandbox, or plan settings.

When local authentication is missing or unusable, the UI must say:

```text
Codex is not authenticated in this local environment. Run codex login in a terminal, sign in with ChatGPT or your chosen Codex authentication method, then refresh.
```

The feature may call an SDK or Codex-provided status operation when available. It must not inspect private credential files to determine authentication.

### 4. Exact Implementer prompt

Build one prompt from current repository evidence immediately before launch. The prompt must not be stored as a durable planning artifact.

Use this exact prompt template, substituting only the dynamic values in angle brackets:

```text
You are the Implementer for ChampCity A/I.

Working directory:
- The current process working directory is the selected project repository root.
- Do not modify files outside this repository root.
- Do not write absolute local machine paths into repository artifacts.

Authority:
- The Approved Formal Work Card is the sole implementation contract.
- Read it before changing files.
- Formal Work Card path: <FORMAL_WORK_CARD_PATH>
- Formal Work Card artifact revision: <FORMAL_WORK_CARD_REVISION>
- Formal Work Card SHA-256: <FORMAL_WORK_CARD_SHA256>

Required report:
- Use the existing application-owned Implementer Report.
- Implementer Report path: <IMPLEMENTER_REPORT_PATH>
- Implementer Report artifact revision before execution: <IMPLEMENTER_REPORT_REVISION>
- Implementer Report SHA-256 before execution: <IMPLEMENTER_REPORT_SHA256>
- Do not create an alternate report, sidecar, summary, execution packet, or completion marker.
- Implementation is incomplete until this exact report contains the complete auditable evidence required by the Approved Work Card and remains Pending for review.

Project instructions:
- Discover and follow project-local instructions, including AGENTS.md, README files, validation documents, package scripts, and repository-specific conventions.
- If project instructions conflict with the Approved Work Card, follow the Approved Work Card and document the conflict in the report.

Execution rules:
- Implement only the approved Work Card.
- Preserve all negative constraints in the Work Card.
- Do not stage, commit, push, tag, reset, clean, stash, or perform Git mutation unless the Work Card explicitly authorizes it.
- Do not introduce secrets, credentials, provider keys, environment-file contents, production endpoints, screenshots, archives, build outputs, or unrelated generated artifacts.
- Run the validation required by the Approved Work Card when possible.
- Record exact commands, working directory, exit codes, and result summaries in the Implementer Report.
- Map each acceptance criterion to evidence in the Implementer Report.
- Distinguish automated validation completed from Operator validation remaining.
- State any skipped validation, scope expansion, residual risk, or blocker.

Completion:
- When implementation and validation are complete, update only the existing Implementer Report at the required path.
- Leave the report disposition as Pending.
- End your final response with the report path and whether implementation is complete, blocked, or incomplete.
```

Do not paraphrase this prompt in production. If future changes are needed, they require a later Work Card.

### 5. Execution preflight

Enable `Run Codex Implementer` only when all are true:

- current workspace is `work-card-building-review`;
- selected workspace root exists and is a directory;
- the current Work Card Building projection resolves one current Approved Formal Work Card;
- the exact Implementer Report exists;
- the report is readable, fresh, and Pending;
- no Codex execution is currently running for the selected workspace;
- the SDK/runtime can start without requiring ChampCity-owned authentication.

If the SDK package or local Codex runtime is unavailable, show:

```text
Codex SDK or local Codex runtime is not available from this application environment. Install Codex locally, authenticate it, then refresh.
```

Do not attempt installation or authentication from ChampCity A/I.

### 6. Main process, IPC, and preload

Add exactly these API capabilities:

```text
getCodexImplementerExecutionStatus(): Promise<CodexImplementerExecutionModel>
startCodexImplementerExecution(): Promise<CodexImplementerExecutionModel>
cancelCodexImplementerExecution(): Promise<CodexImplementerExecutionModel>
```

The start route must derive all context from the current selected workspace and current workflow model. It must not accept arbitrary project roots, commands, Work Card IDs, report paths, arguments, or prompt text from the renderer.

The cancel route may cancel only the tracked Codex execution for the selected workspace. If SDK cancellation is unavailable or incomplete, document the limitation and fail safely without creating a second process-control mechanism.

### 7. SDK execution behavior

Use the SDK thread API with the selected project root as the working directory. Use `skipGitRepoCheck: true` because selected ChampCity project workspaces can be repository-like planning workspaces without `.git`, while real project repositories may or may not have Git initialized.

Use streamed execution when available so the UI can display progress. If the SDK only supports buffered output for the required host configuration, the UI may show running state and final result only, but the Implementer Report and repository evidence remain authoritative.

Do not pass model overrides, approval overrides, sandbox overrides, config overrides, `OPENAI_API_KEY`, or custom provider environment variables in this card. The SDK may receive a minimal environment needed for `PATH` resolution, but it must inherit local Codex authentication through the normal Codex runtime mechanism.

### 8. Build / Review workspace UI

Extend the dedicated `WorkCardBuildingReviewWorkspace`.

When a Pending report exists, show a Codex execution panel with:

- Formal Work Card path and revision;
- report path and revision;
- Codex availability state;
- integration mode;
- `Run Codex Implementer`;
- `Cancel Codex Run` only while running;
- process state, elapsed time, report-updated indicator, and concise event/error tails;
- post-run message telling the Operator to review the existing Implementer Report.

After completion, failure, or cancellation:

```text
refresh documents
refresh current workflow
select the Implementer Report
keep report review controls available when the report is current
```

Do not add embedded ChatGPT, a terminal emulator, a text prompt editor, arbitrary command input, or a second report view.

### 9. Result collection

The application collects execution status and then returns to existing repository-backed review.

Completion is determined by repository evidence, not SDK final response text:

- the existing report remains the review target;
- if the report body or artifact revision changed, show that the report was updated;
- if Codex reports success but the report did not change, show `Codex completed, but the Implementer Report was not updated.`;
- if Codex fails or is cancelled, show the execution state and keep the report available for manual inspection.

Do not mark the report Approved, create a Validation Record, create a Repair Work Card, or advance workflow based on Codex execution state.

## Preserved Behavior

Preserve unchanged:

- Approved Formal Work Card remains the sole Implementer instruction;
- Implementer Report remains the durable review target;
- report disposition and downstream validation or repair behavior;
- existing report registration and recovery behavior;
- existing Work Card Planning, Repair, Validation, and Close paths;
- no cloud Codex agent or ChatGPT web automation;
- no storage of provider credentials or Codex auth material;
- no Git operation by ChampCity A/I;
- no automatic approval based on execution success.

## Authorized Surface

```text
package.json
package-lock.json
src/main/workCardBuilding/workCardBuildingReviewService.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
src/renderer/app/App.tsx
src/renderer/styles.css
test/work-card-building/work-card-building-review-service.test.cjs
test/work-card-building/codex-implementer-execution-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-building-review-workspace.test.cjs
test/renderer/document-review-surface-source.test.cjs
test/repository/runtime-wiring-source.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44_local_codex_cli_implementer_execution.md
```

A small fake SDK adapter or fake streamed-event source is authorized under `test/` only. It must not replace the production SDK path.

No dependency other than the official Codex TypeScript SDK is authorized unless the Implementer proves it is directly required for Electron-compatible cancellation/status handling and documents the evidence in the report. `node-pty`, terminal emulators, shell frameworks, job queues, background services, local databases, and WebSocket app-server clients are not authorized.

## Risks and Constraints

This feature launches a local coding agent capable of modifying the selected project repository. The risk boundary is local and Operator-authorized. The application must make the working directory and report target visible before launch and must prevent arbitrary command execution.

Codex may still change files before failure or cancellation. ChampCity A/I must report execution state and refresh repository evidence; it must not attempt to roll back or hide those changes.

The SDK may evolve. The implementation must preserve the architectural boundary even if exact method names differ: SDK-primary integration, local authentication, selected project root, exact prompt, existing report, no credential storage, no arbitrary command runner.

## Acceptance Criteria

1. Build / Review exposes `Run Codex Implementer` only when an Approved Formal Work Card and fresh Pending Implementer Report are current.
2. Start derives project root, Work Card path, Work Card revision, Work Card SHA-256, report path, report revision, and report SHA-256 from repository evidence, not renderer-supplied values.
3. The SDK starts a thread with working directory equal to the selected project root and `skipGitRepoCheck` enabled.
4. Codex receives the exact approved Implementer prompt through the SDK run or streamed-run API.
5. The production path cannot execute arbitrary renderer-provided commands, paths, arguments, config overrides, or prompt text.
6. Codex credentials, API keys, and provider secrets are neither requested nor stored by ChampCity A/I.
7. Missing SDK/runtime/auth produces a targeted error and no report mutation.
8. One in-flight execution per selected workspace is enforced.
9. Cancellation affects only the tracked execution and never kills unrelated local processes.
10. Successful SDK completion refreshes documents, selects the Implementer Report, and reports whether the report changed.
11. SDK failure or cancellation refreshes documents, keeps the report visible, and does not alter report disposition.
12. A successful SDK final response without report changes is reported as incomplete for review purposes.
13. The existing Implementer Report remains the only review target; no alternate report, sidecar, execution packet, or completion marker is created.
14. Approved report still enables Work Card Validation; RevisionRequested report still enables Repair; no Validation Record is created by Codex execution.
15. Positive and negative tests exercise the real SDK adapter boundary through a fake SDK in tests, current-workflow context derivation, IPC/preload wiring, renderer behavior, report-change detection, cancellation, and downstream review eligibility. Source-string assertions are supplemental only.
16. Typecheck, TypeScript build, Vite build, focused tests, and the complete Node test lane pass in the approved normal Windows environment.
17. No Git operation occurs.

## Negative Constraints

Do not:

- build an arbitrary command runner;
- use raw `codex exec` as the primary ChampCity production integration;
- use WebSocket app-server transport;
- create a separate Implementer handoff artifact, execution packet, approval token, or primary Implementer prompt;
- require or store an API key;
- read or parse Codex credential files;
- set `CODEX_HOME` or mutate Codex local state;
- pass model, sandbox, approval, or provider configuration overrides;
- mutate repository state during status polling;
- create more than one execution session for one workspace;
- overwrite or approve the Implementer Report;
- add JSON sidecars, marker files, execution-run records, local database state, or hidden active-card state;
- change unrelated Architect-output, repair, validation, closeout, or workspace behavior;
- perform Git operations.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/
IMPLEMENTER_REPORT_WC44_local_codex_cli_implementer_execution.md
```

Implementation is incomplete until that report exists.

Map every acceptance criterion to concrete evidence. Report:

- every created and modified file;
- exact SDK package and version installed;
- exact SDK APIs used and any local app-server fallback reason if applicable;
- proof that local Codex auth is used without ChampCity credential storage;
- preflight and failure-state behavior;
- exact prompt construction proof;
- fake SDK positive and negative execution proof;
- report-change detection proof;
- cancellation proof;
- IPC/preload and renderer evidence;
- commands, working directory, exit codes, and results;
- any narrowly necessary adjacent correction and why it was required;
- automated validation completed and Operator validation remaining;
- scope expansion, residual risks, and confirmation that no parallel command, handoff, report, authority, persistence, or credential mechanism was introduced.

## Manual Validation

After Architect approval, the Operator must validate on a trusted local machine with Codex already installed and authenticated:

1. Run `codex login` or the current Codex login flow outside ChampCity A/I and confirm local Codex can run normally.
2. Open Build / Review for a Work Card with a Pending Implementer Report.
3. Confirm the workspace shows the selected project root, Approved Work Card path, and exact report path before launch.
4. Select `Run Codex Implementer`.
5. Confirm Codex runs against the selected project repository and project-local instructions are respected.
6. Confirm the existing Implementer Report is updated at the exact path and remains Pending.
7. Confirm ChampCity A/I refreshes and selects the report for review.
8. Confirm cancellation is available while running and no unrelated process is terminated.
9. Confirm the report, not the Codex final response, controls review and downstream workflow.
