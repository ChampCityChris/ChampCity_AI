<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC58-REPAIR01",
    "repairId": "WC58-REPAIR01",
    "parentWorkCardId": "WC58"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC58_autonomous_codex_approval_and_interaction_resolution.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC58-01_local_codex_app_server_transport_and_runtime_parity.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC58-02_native_codex_approval_routing_and_automatic_client_approval.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC58-03_codex_capability_parity_observability_and_end_to_end_migration.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC58-01_local_codex_app_server_transport_and_runtime_parity.md",
      "revision": 3
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC58-02_native_codex_approval_routing_and_automatic_client_approval.md",
      "revision": 3
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC58-03_codex_capability_parity_observability_and_end_to_end_migration.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "App Server Lifecycle, Approval Ownership, and Observability Completion",
    "status": "approved_for_implementation",
    "executionMode": "one bounded WC58 bundle repair",
    "parentWorkCardId": "WC58",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC58-REPAIR01_app_server_lifecycle_approval_ownership_and_observability_completion.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Complete WC58 by repairing four demonstrated integration defects only: App Server cleanup on application shutdown and initialization failure; protocol-faithful ownership validation for legacy approval callbacks; bounded capability/config observability that preserves useful identities rather than counts only; and separation of ordinary App Server stderr from genuine runtime/tool denial telemetry. Preserve the implemented WC58 App Server architecture and approval model.",
    "reviewedAt": "2026-08-22"
  }
}
CHAMPCITY-METADATA -->

# WC58-REPAIR01 — App Server Lifecycle, Approval Ownership, and Observability Completion

Status: Approved for Implementer execution  
Parent: `WC58`  
Depends on: completed WC58-01, WC58-02, and WC58-03 Implementer passes and integrated Architect review  
Git mutation: prohibited

## Purpose

Complete the existing WC58 App Server implementation by repairing four demonstrated bundle-acceptance defects. This repair does not reopen the WC58 architecture and does not authorize a broader Codex, workflow, renderer, development-environment, or approval redesign.

The current implementation materially satisfies the intended WC58 architecture:

```text
Approved Work Card
→ deterministic development-environment preflight
→ local packaged Codex App Server over JSONL stdio
→ full inherited process environment
→ selected project cwd
→ on-request / user / danger-full-access
→ ChampCity-owned native approval responses
→ same-turn continuation
→ bounded runtime diagnostics and request_user_input handling
```

The repair is limited to completing the portions of the approved bundle contract that current production code does not yet satisfy.

## Confirmed Defects

### Defect 1 — App Server cleanup is not wired to application shutdown, and initialization failure can lose the transport handle

Current production code provides deterministic `JsonlCodexAppServerTransport.dispose()` behavior and the execution service disposes the transport after a normal, failed, or cancelled execution reaches its `finally` path.

However:

- `src/main/main.ts` has no application-shutdown hook that asks the Codex execution service to terminate an active App Server before Electron exits;
- `CodexImplementerExecutionService` exposes no service-level shutdown/dispose boundary for that purpose; and
- `loadCodexAppServerAdapter()` initializes a newly created transport before returning it, so an initialization failure can reject before the caller receives the transport needed to dispose the spawned child.

This leaves WC58 bundle acceptance criterion 13 incomplete:

```text
App Server child processes terminate on completion/cancellation/application shutdown.
```

### Defect 2 — Legacy approval callbacks do not validate the protocol-provided conversation/thread identity

The App Server adapter correctly validates `threadId` and `turnId` on current v2 approval requests.

The same adapter also supports legacy approval methods:

```text
execCommandApproval
applyPatchApproval
```

The pinned-runtime legacy shape uses `conversationId` as the thread/conversation identity. Current `handleServerRequest()` reads only `params.threadId` and `params.turnId`; when those fields are absent it can fall back to the sole active ChampCity thread. A legacy request that supplies a foreign `conversationId` can therefore bypass the intended exact-thread ownership comparison.

This violates WC58-02's requirement that foreign/stale ownership identifiers are never auto-approved.

### Defect 3 — Capability observability reduces App Server responses to counts and does not expose required web/tool configuration

The current transport queries the required capability methods:

```text
config/read
mcpServerStatus/list
skills/list
app/installed
plugin/installed
```

but `readCapability()` currently reduces each successful response to:

```text
state
count
"Observed through Codex App Server."
```

The resulting model/UI can report that capabilities were read, but cannot identify which MCP servers, skills, apps, or plugins were actually observed. The current WC58 production surface also does not preserve or expose the web/tool configuration available from `config/read` or the pinned runtime equivalent.

This leaves WC58-03 capability-parity observability incomplete.

### Defect 4 — Ordinary App Server stderr is misclassified as a runtime denial

The transport currently routes every App Server stderr chunk through `broadcastErrorTail()` as:

```text
runtime.denial
```

The WC58 implementation passes itself observed benign runtime warnings on stderr. A warning, diagnostic, or generic stderr message is not by itself proof that Codex/runtime denied an action without issuing a client-answerable approval request.

WC58 requires approval activity and genuine no-request runtime/tool denials to remain distinguishable. Ordinary stderr must therefore not be projected as a runtime denial merely because it was written to stderr.

## Required Changes

### 1. Complete deterministic App Server lifecycle cleanup

Add the smallest application/service lifecycle boundary needed to guarantee cleanup.

Required behavior:

1. `CodexImplementerExecutionService` must expose a bounded shutdown/dispose operation for the currently tracked App Server execution, if any.
2. Application shutdown must invoke that operation before the main process exits.
3. An active App Server turn must be interrupted/cancelled as appropriate and its App Server transport disposed.
4. Shutdown cleanup must be idempotent and must not create a second App Server or restart work.
5. `loadCodexAppServerAdapter()` or its equivalent construction path must dispose a transport if initialization fails after the child process was spawned.
6. Preserve existing completion, cancellation, retry, report-refresh, and Environment Resolution behavior.

The implementation may use the existing Electron application lifecycle event that best supports awaited cleanup. Do not add a general process supervisor or unrelated shutdown framework.

### 2. Normalize and enforce protocol-faithful approval ownership for every supported approval method

Keep ownership logic inside the App Server adapter.

For each supported native approval request, normalize the pinned protocol's identity fields before deciding ownership. At minimum:

```text
v2 threadId → ChampCity thread identity
legacy conversationId → ChampCity thread identity
turnId, when supplied → active/current turn identity
request id → unresolved request identity
```

Required behavior:

- any protocol-provided thread/conversation identity that does not equal the exact active ChampCity-created thread must be rejected;
- any protocol-provided turn identity that does not equal the current turn must be rejected;
- an already-resolved request ID must be rejected;
- telemetry must report the actual normalized request identity rather than silently replacing a foreign identity with the current ChampCity thread;
- current v2 command/file/permission approval behavior must remain unchanged for valid owned requests;
- legacy `execCommandApproval` and `applyPatchApproval` must continue to receive the pinned-runtime supported approval response only when ownership is valid.

Do not add path classification, command-risk classification, semantic review, `auto_review`, Guardian, or a second model.

### 3. Preserve bounded capability identities and required config/tool observability

Continue using App Server as the source of truth. Do not recreate Codex configuration inside ChampCity.

Normalize enough non-secret information from successful capability responses to answer the WC58 diagnostic questions materially rather than by count alone.

At minimum preserve bounded identity/status summaries for:

```text
MCP servers
skills
installed apps
installed plugins
```

Also preserve the effective web/tool configuration exposed by `config/read` or the pinned runtime equivalent when available.

The normalized model may use compact arrays or bounded summary strings. It must not dump the entire Codex config or expose secret/token values. This is observability of already-exposed App Server state, not a new package/configuration registry.

The Implement workspace must display enough of the normalized result to determine what was actually observed. A count-only display is insufficient.

If a capability read is unsupported or fails, retain the existing explicit `unavailable` state rather than fabricating capability data.

### 4. Separate stderr diagnostics from genuine runtime/tool denial telemetry

Preserve a clear distinction between:

```text
App Server stderr/warning/diagnostic output
```

and:

```text
a runtime/tool denial for which no client-answerable approval request was issued
```

Required behavior:

- arbitrary stderr text must not automatically create a `runtime.denial` event;
- stderr may remain in the existing error/stderr diagnostic tail or another existing bounded diagnostic surface;
- unsupported client methods or other demonstrated no-client-response denials may remain classified as runtime denial where appropriate;
- native approval requests that ChampCity answers must remain in approval telemetry, not denial telemetry;
- `request_user_input` and MCP elicitation/user-input behavior must remain distinct from approvals and denials.

Do not introduce a general semantic error classifier.

## Preserved WC58 Behavior

Preserve all currently implemented WC58 behavior that is not directly defective, including:

- production Work Card execution uses the packaged `@openai/codex` App Server rather than `@openai/codex-sdk -> codex exec`;
- JSONL JSON-RPC transport remains the production execution path;
- the App Server child receives the full current parent process environment;
- selected project root remains the execution cwd;
- native Codex auth/config/CODEX_HOME state is inherited rather than rewritten;
- Work Card threads/turns request `danger-full-access`, `on-request`, and `approvalsReviewer=user`;
- no `auto_review`, Guardian, command-risk reviewer, path-risk reviewer, or second approval model is introduced;
- owned current v2 command/file/permission approval requests remain automatically client-approved;
- `request_user_input` remains a real Operator-input path and is not auto-answered;
- Work Card Implementation and Environment Resolution continue to use the same App Server harness;
- WC57 Environment Resolution evidence and deterministic post-resolution preflight remain unchanged;
- report refresh, retry, progress tails, cancellation, and Build workspace behavior remain intact;
- no global `~/.codex/config.toml` mutation is introduced;
- no Git mutation is performed.

## Authorized Surface

Production changes are limited to the existing WC58 execution/runtime/diagnostic surfaces required for these defects, expected principally within:

```text
src/main/workCardBuilding/codexAppServerProtocol.ts
src/main/workCardBuilding/codexAppServerTransport.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/main/main.ts
src/preload/index.ts
src/renderer/app/App.tsx
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
src/shared/workspaceContracts.ts
```

Tests may be added or updated under the corresponding existing test areas.

Do not redesign WC57 development-environment provisioning, Work Card authority, Architect workflows, application navigation, browser integration, MCP workspace routing, or unrelated renderer features.

## Required Proof

1. A transport lifecycle regression proves child cleanup on normal completion remains functional.
2. A cancellation regression proves the active App Server turn/process is terminated cleanly.
3. An application/service-shutdown regression proves an active App Server is interrupted/disposed before shutdown completes.
4. An initialization-failure regression proves a child spawned before failed initialization is disposed and does not leak.
5. A v2 foreign-thread and stale-turn regression remains green.
6. A legacy `execCommandApproval` regression proves a foreign `conversationId` is rejected and an owned `conversationId` is approved.
7. A legacy `applyPatchApproval` regression proves the same ownership behavior.
8. Approval telemetry preserves normalized protocol ownership identity and does not mask a foreign legacy identity.
9. Capability tests prove MCP servers, skills, apps, and plugins retain bounded observable identities/status rather than counts only.
10. A config-read regression proves web/tool configuration is surfaced when the pinned App Server returns it and remains unavailable/absent when it does not.
11. A stderr regression proves benign App Server stderr does not create `runtime.denial` telemetry.
12. A no-client-approval runtime/tool denial remains distinctly observable as a runtime denial.
13. `request_user_input` waiting, response, and same-turn continuation remain green.
14. Environment Resolution still uses the App Server harness, carries WC57 evidence, refreshes the parent environment, and reruns deterministic preflight.
15. Production source remains free of the retired `@openai/codex-sdk` execution path and `auto_review` approval routing.
16. Typecheck, production build, focused WC58 suites, renderer/runtime wiring suites, and the full automated test suite pass.

## Acceptance Criteria

1. An App Server child cannot be left running merely because ChampCity exits while an execution is active.
2. An App Server child spawned before initialization failure is deterministically cleaned up.
3. Current completion/cancellation cleanup remains functional and idempotent.
4. Every supported approval method validates the pinned protocol's actual thread/conversation identity before auto-approval.
5. A legacy approval request with a foreign `conversationId` is never auto-approved.
6. Owned current and legacy approval requests still receive the pinned-runtime supported approval response and continue the same turn.
7. No semantic reviewer, risk classifier, `auto_review`, Guardian, or additional Operator approval ceremony is introduced.
8. Runtime diagnostics identify the observed MCP servers, skills, apps, and plugins through bounded non-secret data rather than counts only.
9. Effective web/tool configuration is observable when exposed by the pinned App Server runtime.
10. Capability read failure/unsupported state remains explicit and does not fabricate data.
11. Generic App Server stderr is not classified as a runtime/tool denial solely because it was written to stderr.
12. Genuine no-client-approval runtime/tool denial remains distinguishable from approval activity, stderr diagnostics, and `request_user_input`.
13. Work Card Implementation and Environment Resolution continue to use the App Server production harness with existing WC57 handoff behavior intact.
14. No global Codex configuration mutation is performed.
15. No unrelated architecture or UI redesign is introduced.
16. No Git mutation is performed.
17. The Implementer Report marks any unimplemented acceptance criterion incomplete; no residual-limitation pass is permitted.

## Operator Validation After Automated Pass

After automated validation passes, restart ChampCity A/I and run one real Approved Work Card through the embedded App Server path.

Confirm the live runtime shows:

```text
selected project cwd
intended model/reasoning where returned
danger-full-access / on-request / user
actual MCP/skills/apps/plugins capability identities where available
web/tool configuration where available
```

During the run, confirm an owned native approval can continue without asking the Operator to repeat Work Card authorization. If a genuine `request_user_input` occurs, confirm it pauses for the supplied answer and continues the same turn.

Finally, start a run and close ChampCity while the App Server is active; confirm no child App Server remains orphaned after application shutdown.

## Implementer Report

Required path:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC58-REPAIR01_app_server_lifecycle_approval_ownership_and_observability_completion.md`

Leave `Document.Status=Pending`.
