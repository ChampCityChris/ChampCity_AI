<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC58-REPAIR02",
    "repairId": "WC58-REPAIR02",
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
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC58-REPAIR01_app_server_lifecycle_approval_ownership_and_observability_completion.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "MCP Elicitation Input Classification and Same-Turn Handling",
    "status": "approved_for_implementation",
    "executionMode": "one bounded WC58 follow-up repair",
    "parentWorkCardId": "WC58",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC58-REPAIR02_mcp_elicitation_input_classification_and_same_turn_handling.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Correct only the remaining WC58-REPAIR01 acceptance defect: mcpServer/elicitation/request is user-input/elicitation behavior and must not be represented as runtime.denial. Preserve all accepted REPAIR01 lifecycle, approval ownership, capability observability, stderr separation, request_user_input, Environment Resolution, and App Server behavior.",
    "reviewedAt": "2026-08-22"
  }
}
CHAMPCITY-METADATA -->

# WC58-REPAIR02 — MCP Elicitation Input Classification and Same-Turn Handling

Status: Approved for Implementer execution  
Parent: `WC58`  
Depends on: `WC58-REPAIR01` implementation and Architect revision request  
Git mutation: prohibited

## Purpose

Complete WC58 by correcting one remaining classification defect from REPAIR01.

Current production correctly recognizes:

```text
mcpServer/elicitation/request
```

as user-input/elicitation behavior rather than a native Codex approval request. However, it then emits that request as:

```text
runtime.denial
```

and the focused regression explicitly asserts that classification.

That violates the REPAIR01 requirement that MCP elicitation/user-input behavior remain distinct from:

```text
native approvals
runtime/tool denials
stderr diagnostics
request_user_input
```

This repair is limited to correcting that behavior. Do not reopen any other WC58 design or accepted REPAIR01 implementation.

## Required Change

### 1. Give MCP elicitation its own bounded runtime state

For a pinned-runtime `mcpServer/elicitation/request` belonging to the active ChampCity App Server thread/turn:

- do not auto-approve it;
- do not emit `runtime.denial` merely because it requires client/user input;
- do not fabricate elicitation content;
- normalize it as a distinct MCP-elicitation/input request in the App Server adapter;
- preserve its exact request ID and protocol ownership identity needed to answer the same pending request;
- surface enough bounded protocol-provided information for the Operator to understand what input is requested without exposing secrets.

The existing `request_user_input` path may be reused conceptually where appropriate, but MCP elicitation must remain distinguishable in telemetry/model/UI. Do not collapse unrelated protocol methods into one ambiguous event type.

### 2. Respond through the pinned runtime protocol when an applicable client response exists

Inspect the pinned `@openai/codex@0.146.0` generated App Server schema and implement only the response shape actually supported for `mcpServer/elicitation/request`.

If the pinned runtime defines a client response for supplied elicitation content:

```text
MCP elicitation arrives
→ ChampCity surfaces pending MCP input
→ Operator supplies required response
→ ChampCity replies to the exact request ID using the generated protocol shape
→ same Codex turn continues
```

If the pinned runtime does not define an applicable response path for the elicitation mode received, surface that condition explicitly as unsupported/unavailable MCP elicitation input state. Do not misclassify it as a runtime/tool denial and do not invent a protocol response.

### 3. Preserve real runtime denials

A genuine unsupported client method or other demonstrated runtime/tool denial for which no applicable client-answerable input/approval path exists must remain separately observable as `runtime.denial` or its existing equivalent.

This repair must therefore preserve the distinction:

```text
native approval request
→ ChampCity auto-approval telemetry

request_user_input
→ pending Codex user input

MCP elicitation
→ pending/distinct MCP elicitation input state

stderr warning/diagnostic
→ stderr diagnostic tail

genuine unsupported/no-client-response runtime/tool denial
→ runtime denial telemetry
```

## Preserved Behavior

Preserve all accepted WC58 and WC58-REPAIR01 behavior, including:

- packaged `@openai/codex` App Server over JSONL stdio;
- full inherited process environment;
- selected project cwd;
- `danger-full-access / on-request / approvalsReviewer=user`;
- no `auto_review`, Guardian, semantic approval reviewer, command-risk classifier, or second model;
- current and legacy command/file/permission approval ownership and automatic client approval;
- legacy `conversationId` validation;
- application-shutdown and initialization-failure cleanup;
- bounded MCP/skills/apps/plugins and web/tool observability;
- generic App Server stderr remaining separate from runtime denial telemetry;
- existing `request_user_input` behavior and same-turn continuation;
- Work Card Implementation and Environment Resolution using the same App Server harness;
- WC57 evidence handoff, parent environment refresh, and deterministic post-resolution preflight;
- report refresh, retry, cancellation, and existing Implement workspace behavior;
- no global Codex configuration mutation;
- no Git mutation.

## Authorized Surface

Production changes are limited to the smallest existing WC58 surfaces required to classify, surface, and when supported answer MCP elicitation:

```text
src/main/workCardBuilding/codexAppServerProtocol.ts
src/main/workCardBuilding/codexAppServerTransport.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/shared/workspaceContracts.ts
src/main/main.ts
src/preload/index.ts
src/renderer/app/App.tsx
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
```

Only touch files actually required by the pinned protocol and the existing input/diagnostic path.

Tests may be added or updated under the corresponding existing WC58 test areas.

Do not modify WC57 provisioning, Work Card authority, browser integration, MCP workspace routing, Architect workflows, navigation, capability normalization beyond what this elicitation state requires, or any unrelated renderer behavior.

## Required Proof

1. A protocol-faithful fake App Server regression sends `mcpServer/elicitation/request` and proves it does **not** emit `runtime.denial`.
2. The same regression proves MCP elicitation is exposed as a distinct pending/input state with the correct request/thread/turn identity.
3. If the pinned runtime supports an applicable client response, a regression proves the Operator-supplied response is returned to the exact request ID and the same turn continues.
4. If the pinned runtime does not support an applicable response for the tested elicitation mode, a regression proves ChampCity surfaces that state explicitly without fabricating a response or labeling it a runtime denial.
5. Existing command/file/permission approval auto-response regressions remain green.
6. Existing foreign/stale current and legacy approval ownership regressions remain green.
7. Existing `request_user_input` wait/respond/same-turn regression remains green.
8. Existing benign-stderr regression remains green and still does not create runtime-denial telemetry.
9. A genuine unsupported client-method regression still produces distinct runtime-denial telemetry.
10. App Server lifecycle cleanup regressions remain green.
11. Capability/config observability regressions remain green.
12. Environment Resolution/WC57 handoff regressions remain green.
13. Production source remains free of `@openai/codex-sdk` execution and `auto_review` routing.
14. Typecheck, production build, focused WC58 suites, renderer/runtime wiring suites, and the full automated test suite pass.

## Acceptance Criteria

1. `mcpServer/elicitation/request` is never classified as `runtime.denial` solely because it requests client/user input.
2. MCP elicitation has a distinct bounded state/event with preserved request and ownership identity.
3. MCP elicitation is not auto-approved and its requested content is not fabricated.
4. When the pinned runtime defines an applicable client response, Operator-provided elicitation input is returned using the exact generated protocol shape and continues the same turn.
5. When no applicable client response exists, the condition is surfaced as MCP elicitation/input unavailable or unsupported state rather than runtime denial.
6. Genuine no-client-response runtime/tool denials remain separately observable.
7. `request_user_input`, approval telemetry, stderr diagnostics, and MCP elicitation remain distinguishable from one another.
8. All accepted WC58-REPAIR01 lifecycle, approval ownership, capability observability, and stderr corrections remain intact.
9. No semantic reviewer, approval redesign, protocol invention, or unrelated architecture/UI change is introduced.
10. No global Codex configuration mutation is performed.
11. No Git mutation is performed.
12. The Implementer Report marks any unimplemented acceptance criterion incomplete; no residual-limitation pass is permitted.

## Operator Validation After Automated Pass

After Architect approval, repeat the existing WC58 live App Server validation. No new broad Operator scenario is required solely for this repair.

If live Codex emits MCP elicitation, confirm the Implement workspace shows it as MCP input rather than approval or denial and, where the pinned runtime supports a response, that supplied input continues the same turn.

The existing WC58 Operator checks for approval continuation, `request_user_input`, capability visibility, and application-close child cleanup remain the final live validation gate.

## Implementer Report

Required path:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC58-REPAIR02_mcp_elicitation_input_classification_and_same_turn_handling.md`

Leave `Document.Status=Pending`.
