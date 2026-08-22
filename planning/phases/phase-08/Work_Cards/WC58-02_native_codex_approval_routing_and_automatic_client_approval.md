<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "implementationEvidence",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC58-02",
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
    }
  ],
  "workflowData": {
    "title": "Native Codex Approval Routing and Automatic Client Approval",
    "status": "approved_for_implementation",
    "sequence": 2,
    "bundleReview": "WC58",
    "dependsOn": ["WC58-01"],
    "gitMutationAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC58-02_native_codex_approval_routing_and_automatic_client_approval.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Make ChampCity the native Codex approval client for its own active Approved Work Card thread. No semantic risk reviewer and no individual Architect disposition.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# WC58-02 — Native Codex Approval Routing and Automatic Client Approval

Status: Approved for Implementer execution  
Parent bundle: `WC58`  
Sequence: 2 of 3  
Depends on: `WC58-01` complete  
Git mutation: prohibited

## Purpose

Restore Codex's native approval-request path, route those requests to ChampCity, and automatically answer them for the exact active Approved Work Card execution.

This is the programmatic equivalent of the Operator clicking **Approve** on each native Codex approval prompt.

## Required Runtime Policy

Start/resume the embedded Work Card thread with the pinned runtime's equivalent of:

```text
sandbox = danger-full-access
approvalPolicy = on-request
approvalsReviewer = user
```

Do not use `approvalsReviewer=auto_review` or `guardian_subagent`.

## Required Changes

1. Handle native App Server approval requests supported by the pinned runtime, including command execution and file change/apply-patch requests, plus permission/MCP approval requests where a client response is defined.
2. Verify only protocol ownership before approving: active App Server connection, exact ChampCity-created thread, current/continued turn, unresolved request ID.
3. For owned approval requests, return the runtime's supported one-shot approval decision (`approved`/equivalent). Do not run a second model, command-risk classifier, path classifier, or semantic safety review.
4. Keep approval decision spelling/version differences inside the App Server adapter and bind them to generated protocol types for the pinned runtime.
5. Record approval request type, thread/turn/request identity, decision, and completion result in bounded execution telemetry so a future denial can be distinguished from an approval that ChampCity answered.
6. If Codex emits a native approval request, ChampCity must answer it without asking the Operator to repeat Work Card authorization.
7. If Codex/runtime rejects an action without issuing a client-answerable approval request, record that distinctly as a runtime/tool denial. Do not label it `Operator approval required`.
8. `request_user_input` is not an approval request. Do not invent an answer. Preserve it for WC58-03 presentation/handling.
9. Windows UAC/restart/authentication/license/physical boundaries remain outside this auto-approval responder.

## Required Proof

- protocol-faithful fake App Server sends command approval request; ChampCity replies approved; same turn continues and completes;
- same proof for file-change/apply-patch approval;
- supported permission/MCP approval methods are either auto-approved with the exact pinned-runtime response shape or explicitly proven not applicable to that runtime;
- foreign/stale thread/turn/request IDs are never auto-approved;
- a runtime denial with no approval request is classified separately;
- `auto_review`/Guardian is absent from effective thread settings;
- full focused and regression suites remain green.

## Acceptance Criteria

1. Effective thread approval routing is `user`, not automatic reviewer.
2. Native command and file-change approval requests reach ChampCity.
3. ChampCity automatically approves requests owned by the active Approved Work Card execution.
4. Approval response continues the same turn.
5. No second human approval dialog or semantic risk reviewer is introduced.
6. A no-request runtime/tool denial is not misreported as missing Operator authorization.
7. Genuine OS/external boundaries remain distinguishable.
8. No global Codex config mutation or Git mutation is performed.

## Implementer Report

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC58-02_native_codex_approval_routing_and_automatic_client_approval.md`

Leave `Document.Status=Pending`. If incomplete/blocked, stop the WC58 sequence and return to Architect disposition.
