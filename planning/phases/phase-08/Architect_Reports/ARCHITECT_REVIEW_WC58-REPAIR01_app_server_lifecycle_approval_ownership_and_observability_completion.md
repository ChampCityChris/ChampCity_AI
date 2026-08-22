<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
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
      "path": "planning/phases/phase-08/Work_Cards/WC58-REPAIR01_app_server_lifecycle_approval_ownership_and_observability_completion.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC58-REPAIR01_app_server_lifecycle_approval_ownership_and_observability_completion.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review WC58-REPAIR01 — App Server Lifecycle, Approval Ownership, and Observability Completion",
    "disposition": "revision_requested",
    "parentWorkCardId": "WC58",
    "repairId": "WC58-REPAIR01",
    "repairRequired": true,
    "nextRepairId": "WC58-REPAIR02",
    "operatorValidationRequired": false,
    "gitMutationAuthorized": false
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "REPAIR01 successfully corrects App Server application/initialization cleanup, legacy conversationId ownership enforcement, bounded capability/config observability, and generic stderr separation. One explicit repair requirement remains violated: mcpServer/elicitation/request is user-input/elicitation behavior and the Work Card requires it to remain distinct from approvals and denials, but production still emits it as runtime.denial and the focused regression explicitly asserts that classification. AC12 is therefore not satisfied and the Implementer Report overstates completion. Preserve all accepted REPAIR01 changes and make one bounded REPAIR02 limited to correcting MCP elicitation classification/handling without reopening WC58 architecture.",
    "reviewedAt": "2026-08-22"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC58-REPAIR01

## Disposition

**Revision requested.**

WC58-REPAIR01 materially repairs the four defects identified in the integrated WC58 review, but one explicit behavior in the repair contract remains incorrect. The defect is narrow and does not justify reopening the WC58 App Server architecture.

Preserve the completed lifecycle, approval-ownership, capability-observability, and stderr changes. A single bounded follow-up repair is required for MCP elicitation classification/handling before Operator validation.

## Review Basis

Reviewed against:

- `planning/phases/phase-08/Work_Cards/WC58-REPAIR01_app_server_lifecycle_approval_ownership_and_observability_completion.md` revision 1, SHA-256 `c37c1a5533a60b92d948b2ed3afde496acdb62111000bd6a02af69f52cd90146`.
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC58-REPAIR01_app_server_lifecycle_approval_ownership_and_observability_completion.md` revision 1, SHA-256 `97854947f38add817dea7478def98a991c4c0a05c9e3fae5b98e2ecfe2c10c94`.
- Current production source in `src/main/workCardBuilding`, `src/main/main.ts`, shared execution contracts, and the Implement-workspace renderer.
- Current focused regressions in `test/work-card-building` and renderer tests.
- Current read-only Git status on `feature/phase-04-wc01-repair01-evidence-derived-workflow`; no staged changes are present and the pre-existing Phase 08 worktree remains dirty.

## Accepted Corrections

### 1. App Server lifecycle cleanup is now materially complete

`loadCodexAppServerAdapter(...)` now owns the transport across initialization and disposes it if `initialize()` fails after the child has been spawned.

`CodexImplementerExecutionService` now tracks the active App Server adapter and exposes `shutdownActiveExecutions()`. The shutdown path:

```text
active session
→ mark cancellation
→ abort current turn
→ interrupt active App Server thread when available
→ dispose App Server adapter
→ bounded wait for execution completion
```

The operation is guarded by a shared shutdown promise and is idempotent from the service boundary.

`src/main/main.ts` now handles Electron `before-quit`, prevents the first exit, awaits the Codex cleanup operation, then re-enters `app.quit()` only after cleanup has completed or reported an error. This closes the application-shutdown lifecycle gap identified by the parent WC58 review.

Focused tests prove service shutdown cancellation/disposal and initialization-failure child cleanup. Existing transport interrupt/disposal tests remain present.

### 2. Legacy approval ownership now uses the pinned protocol identity

The adapter now normalizes request ownership through:

```text
threadId
or legacy conversationId
turnId when supplied
request id
```

The normalized identity is used before auto-approval and is also carried into approval telemetry.

Focused transport regressions now prove:

- owned `execCommandApproval` with `conversationId=thread-1` is approved;
- foreign legacy `execCommandApproval` is rejected;
- owned `applyPatchApproval` is approved;
- foreign legacy `applyPatchApproval` is rejected;
- existing v2 foreign-thread and stale-turn rejection remains intact.

This repairs the concrete legacy-identity bypass identified in the integrated WC58 review without introducing path classification, command-risk review, `auto_review`, Guardian, or a second model.

### 3. Capability observability now retains useful bounded identities

Successful App Server capability reads are no longer reduced to counts only. `CodexAppServerCapabilityReadState` now carries bounded `details`, and the adapter extracts non-secret identities/statuses for MCP servers, skills, installed apps, and installed plugins.

`config/read` is traversed only for bounded observable web/tool/MCP/browser-related paths while secret-like configuration keys are skipped. The resulting details are projected through the existing runtime model and rendered in the Implement workspace.

The focused regression proves concrete identities such as MCP server names, skills, apps, and plugins remain visible and proves web/tool configuration is surfaced while a sensitive fixture value is omitted.

This satisfies the REPAIR01 requirement to make the capability surface materially observable rather than count-only.

### 4. Generic stderr is no longer automatically called a runtime denial

App Server stderr now emits `runtime.stderr`. The execution service routes that event to the existing stderr/error tail and summarizes it as `app-server.stderr` in the event tail.

The focused regression proves a benign App Server stderr warning produces `runtime.stderr`, not `runtime.denial`.

Unsupported client methods still produce explicit `runtime.denial`, preserving the required distinction between diagnostic stderr and a genuine client-unhandled runtime/tool request.

### 5. WC58 architecture remains preserved

Current source inspection remains consistent with the intended WC58 runtime:

```text
packaged @openai/codex App Server
JSONL stdio
full inherited process environment
selected project cwd
on-request / user / danger-full-access
ChampCity-owned approval response
request_user_input response path
shared Work Card / Environment Resolution execution harness
```

No production `@openai/codex-sdk` reference or `auto_review` routing was found in the current source search. The Implementer Report records successful typecheck, build, 34 focused tests, and a 407-test full suite.

## Blocking Finding

### MCP elicitation is still classified as `runtime.denial` despite the repair contract explicitly forbidding that classification

REPAIR01 Required Change 4 states that the implementation must preserve a clear distinction between stderr diagnostics, genuine no-client-approval runtime/tool denials, approvals, and user-input behavior. It explicitly requires:

> `request_user_input` and MCP elicitation/user-input behavior must remain distinct from approvals and denials.

Current production code does not satisfy that requirement.

For `mcpServer/elicitation/request`, `handleServerRequest()` currently does the following:

```text
recognize MCP elicitation as user input, not an approval
→ push event type runtime.denial
→ mark request resolved
→ return JSON-RPC error
```

The focused transport test locks this behavior in by asserting:

```text
mcpDenialEvent.type === runtime.denial
```

The Implementer Report likewise states that "MCP elicitation denial remain[s] distinct runtime.denial telemetry." That is not the approved REPAIR01 contract. The Work Card says MCP elicitation/user-input behavior must be distinct **from denials**, not represented as one.

This is therefore not a residual-risk observation or optional UI refinement. It is a direct acceptance failure in the repaired production behavior and its test fixture.

## Acceptance Criteria Disposition

Accepted from current production/test evidence:

- AC1-3: application/initialization/completion/cancellation lifecycle cleanup;
- AC4-6: current and legacy approval ownership and valid-response continuation;
- AC7: no semantic reviewer, risk classifier, Guardian, `auto_review`, or additional Operator approval ceremony;
- AC8-11: bounded capability/config observability, explicit unavailable state, and generic stderr separation;
- AC13-16: shared App Server harness preservation, no global Codex config mutation, no unrelated redesign, and no Git mutation.

**AC12 is not accepted.** MCP elicitation/user-input behavior remains incorrectly represented in runtime-denial telemetry. Because REPAIR01 AC17 prohibits passing an unimplemented criterion as a residual limitation, the report's `complete-pending-review` conclusion is not accepted.

## Required Follow-Up

Create one bounded `WC58-REPAIR02`. Preserve all accepted REPAIR01 code and tests except the incorrect MCP-elicitation denial behavior.

The repair should be limited to:

```text
mcpServer/elicitation/request
→ classify as MCP elicitation / user-input behavior, not approval and not runtime denial
→ expose a bounded distinct state/event
→ if the pinned runtime defines a client response for supplied elicitation content, route the Operator-provided response back to that exact pending request and continue the same turn
→ if the pinned runtime does not provide an applicable response path, surface that limitation as MCP-elicitation/input state rather than runtime denial
→ update focused tests
→ full regression
```

Do not modify command/file/permission auto-approval, lifecycle behavior, capability normalization, WC57 Environment Resolution, Codex execution policy, browser integration, MCP workspace routing, or any unrelated renderer/workflow architecture.

## Final Decision

**WC58-REPAIR01 requires one additional bounded revision before Operator validation.**

The repair is narrow. Do not reopen the WC58 design or discard the accepted REPAIR01 implementation. Correct the MCP elicitation classification/handling, prove it separately from runtime denial and native approval telemetry, rerun the focused/full suites, and return the result for Architect review.
