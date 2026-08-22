<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "implementationEvidence",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC58-03",
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
    }
  ],
  "workflowData": {
    "title": "Codex Capability Parity, Observability, and End-to-End Migration",
    "status": "approved_for_implementation",
    "sequence": 3,
    "bundleReview": "WC58",
    "dependsOn": ["WC58-01", "WC58-02"],
    "gitMutationAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC58-03_codex_capability_parity_observability_and_end_to_end_migration.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Complete the App Server migration by proving effective Codex configuration/capability surfaces, handling genuine request_user_input without fabricating answers, and validating the integrated Work Card plus Environment Resolution harness. Final Architect review is performed only at parent WC58 bundle level.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# WC58-03 — Codex Capability Parity, Observability, and End-to-End Migration

Status: Approved for Implementer execution  
Parent bundle: `WC58`  
Sequence: 3 of 3  
Depends on: `WC58-01`, `WC58-02` complete  
Git mutation: prohibited

## Purpose

Finish the embedded Codex migration by proving what the App Server session actually has available, exposing that state in ChampCity, and using the same harness for normal implementation and Environment Resolution.

## Required Changes

### 1. Read effective Codex runtime state instead of assuming it

Through App Server, capture the effective values exposed by the pinned runtime for:

- Codex/runtime user-agent/version;
- selected project cwd;
- model and reasoning effort where available;
- approval policy and approval reviewer;
- sandbox/effective permission profile;
- active Codex home/config source where exposed.

ChampCity may override only the execution settings it intentionally owns for the Work Card thread. Do not duplicate or rewrite the user's global Codex configuration.

### 2. Inventory Codex-native capability surfaces

Use the pinned App Server methods where supported to query and normalize at least:

```text
config/read
mcpServerStatus/list
skills/list
app/list or app/installed
plugin/installed or plugin/list
```

Also expose web/tool configuration from `config/read` or the runtime's equivalent when available.

This is observability, not a new package registry. ChampCity must not recreate MCP, skills, apps, or plugin configuration that Codex already owns.

### 3. Add bounded Implement-workspace harness diagnostics

Without redesigning the workspace, show enough state to answer:

```text
Which Codex runtime is running?
Which project root does it see?
Which model/reasoning setting is effective?
What sandbox/approval/reviewer is effective?
Are MCP servers, skills, apps, and plugins visible?
Did ChampCity auto-answer native approval requests?
Did a runtime denial occur without an approval request?
```

Do not expose secrets/tokens.

### 4. Handle genuine `request_user_input` as input, not approval

When App Server emits a supported `request_user_input` server request:

- do not auto-answer or invent missing facts;
- show the protocol-provided question/options in a small bounded Implement-workspace input surface;
- send the Operator's answer back to the exact pending request;
- continue the same Codex turn;
- distinguish this state from native approval, UAC, restart, and runtime denial.

Do not create a general-purpose chat client in this card.

### 5. Complete the production migration

Both execution kinds must use the App Server harness:

```text
work-card-implementation
environment-resolution
```

Environment Resolution must receive the WC57 exact evidence payload and rerun deterministic preflight after completion as it does today.

Remove obsolete `runStreamed()`/SDK execution code and the environment allowlist when no longer used. Remove `@openai/codex-sdk` only if it is no longer required and the packaged Codex runtime remains an explicit supported dependency.

## Required End-to-End Proof

1. Fake/protocol test: command approval → ChampCity approves → command completes → same turn continues.
2. Fake/protocol test: file-change approval → ChampCity approves → patch completes → same turn continues.
3. Fake/protocol test: `request_user_input` waits for supplied answer and then continues the same turn.
4. Runtime state test proves effective `on-request`, `user`, `danger-full-access`, expected cwd, and model/reasoning fields when returned.
5. Capability inventory tests cover MCP status, skills, apps, plugins, and config/tool visibility using protocol-faithful responses.
6. Environment Resolution uses App Server and carries unresolved WC57 evidence.
7. Work Card completion still refreshes the canonical Implementer Report and preserves cancellation/retry behavior.
8. No production `runStreamed()`/`codex exec` path remains for embedded Implementer execution.
9. Typecheck, build, focused suites, and full tests pass.

## Acceptance Criteria

1. ChampCity can prove the effective App Server execution policy rather than merely request it.
2. The embedded session uses the user's native Codex configuration/capability ecosystem.
3. MCP/skills/apps/plugins visibility is observable through App Server without parallel ChampCity configuration.
4. Genuine user-input requests have a working response path and are not auto-approved or fabricated.
5. Work Card implementation and Environment Resolution both use App Server.
6. Approval telemetry distinguishes requested/auto-approved from hard runtime denial.
7. Existing WC57 preflight and post-resolution verification remain unchanged.
8. No general chat redesign, global Codex config mutation, or Git mutation is performed.

## Implementer Report

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC58-03_codex_capability_parity_observability_and_end_to_end_migration.md`

Leave `Document.Status=Pending`.

After this report exists and states complete, stop. Do not create child Architect reviews. Return the complete WC58 bundle for one integrated Architect review.
