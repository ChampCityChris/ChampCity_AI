<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "implementationEvidence",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC58-01",
    "parentWorkCardId": "WC58"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC58_autonomous_codex_approval_and_interaction_resolution.md",
      "revision": 2
    }
  ],
  "workflowData": {
    "title": "Local Codex App Server Transport and Runtime Parity",
    "status": "approved_for_implementation",
    "sequence": 1,
    "bundleReview": "WC58",
    "prerequisite": "WC57-REPAIR06 Architect Approved",
    "gitMutationAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC58-01_local_codex_app_server_transport_and_runtime_parity.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Implement only the local App Server transport/runtime boundary. No individual Architect disposition; proceed to WC58-02 only when this report states complete and its tests pass.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# WC58-01 — Local Codex App Server Transport and Runtime Parity

Status: Approved for Implementer execution  
Parent bundle: `WC58`  
Sequence: 1 of 3  
Git mutation: prohibited

## Purpose

Replace the production `@openai/codex-sdk -> runStreamed() -> codex exec` transport with a local `codex app-server --listen stdio://` client while preserving ChampCity's existing execution-service behavior.

## Required Changes

1. Resolve and launch the packaged/local Codex runtime owned by ChampCity. Do not require a second Operator-installed CLI and do not use `npx` download-at-runtime.
2. Use App Server JSONL JSON-RPC over stdio. Bind method/field shapes to the pinned runtime's generated App Server schema (`codex app-server generate-ts`/`generate-json-schema`) rather than guessed protocol strings.
3. Implement initialize/initialized, `thread/start`, `turn/start`, streamed notifications, request correlation, cancellation/interrupt, stderr capture, and deterministic child-process shutdown.
4. Keep raw protocol handling in the main process behind one bounded adapter. Renderer/shared layers consume normalized ChampCity models only.
5. Preserve selected project root, Work Card prompt selection, Environment Resolution execution kind, report refresh, retry, progress tails, and cancellation behavior.
6. Spawn App Server with the current full process environment. After WC57 preflight refresh, preserve the refreshed PATH while retaining the rest of `process.env`. Remove the small allowlisted Codex environment map from the production path.
7. Preserve the user's native Codex `CODEX_HOME`, authentication, configuration, instructions, MCP configuration, skills/plugins/apps configuration, and other environment-derived settings. Do not rewrite global Codex config.
8. Record App Server initialize/thread response data needed by later WC58 cards, including runtime/user-agent, cwd, model where returned, reasoning effort where returned, approval policy/reviewer, and sandbox/effective permission state.

WC58-01 does not implement automatic approval responses. It only establishes the bidirectional transport needed by WC58-02.

## Required Proof

- fake App Server integration test uses newline-delimited JSON-RPC and exercises initialize → thread/start → turn/start → notifications → turn completion;
- cancellation sends the supported interrupt request and terminates cleanly;
- process cleanup is proven on completion, failure, cancellation, and service/application disposal;
- the App Server child inherits a representative non-allowlisted environment variable plus refreshed PATH;
- current Codex auth/config home is inherited rather than reconstructed;
- existing execution-service tests remain green through the normalized adapter;
- typecheck, build, focused tests, and full tests pass.

## Acceptance Criteria

1. Normal production Implementer execution no longer invokes SDK `runStreamed()`/`codex exec`.
2. App Server uses documented JSONL stdio protocol for the pinned runtime.
3. Full process environment inheritance replaces the current allowlist.
4. Selected project root and current Codex auth/config state reach App Server unchanged except intentional per-thread overrides.
5. Stream/cancel/report lifecycle remains functional.
6. App Server child processes do not leak.
7. No approval auto-review logic, WC57 provider redesign, or renderer protocol implementation is introduced.
8. No Git mutation is performed.

## Implementer Report

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC58-01_local_codex_app_server_transport_and_runtime_parity.md`

Leave `Document.Status=Pending`. If incomplete/blocked, stop the WC58 sequence and return to Architect disposition.
