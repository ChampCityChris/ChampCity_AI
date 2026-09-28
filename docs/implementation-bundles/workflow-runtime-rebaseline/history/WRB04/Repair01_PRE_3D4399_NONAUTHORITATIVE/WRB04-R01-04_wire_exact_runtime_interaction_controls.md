# WRB04-R01-04 — Wire Exact Implementer and Tester Interaction Controls

**Parent:** WRB04 Repair01  
**Depends on:** WRB04-R01-03 passing checkpoint/report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Make exact Implementer and Tester runtime sessions fully operable from the shared Feature/Issue execution Workspace, including interactive model requests, cancellation, and the concurrency model already accepted in WRB04-03R.

Do not change execution authority.

This card wires the existing exact runtime contracts into the product surface.

## 1. Reuse bounded interaction presentation

The legacy Work Card renderer already has bounded presentation for:

- Codex approval;
- Codex user input;
- MCP elicitation.

Extract/reuse those presentation components rather than reimplementing a second interaction parser.

A reusable renderer module is preferred, for example:

`CodexInteractionPanels.tsx`

Keep legacy Work Card behavior unchanged while allowing the shared Workflow Workspace to consume the same bounded models.

Do not route exact Workflow execution through legacy Work Card services merely to reuse UI.

## 2. Exact Implementer approval

When `CodexImplementerExecutionModel.pendingApproval` is non-null:

- render request type;
- impact summary;
- bounded command/file/permission detail;
- Approve Once;
- Deny.

Submit through the existing exact response API with:

- requestId;
- decision;
- exact workflowId;
- exact workItemId.

Refresh the exact session after response.

A response for Workflow A / WorkItem A cannot satisfy Workflow B / WorkItem B.

## 3. Exact Implementer user input

When `pendingUserInput` exists:

- render every bounded question;
- supported options;
- free-text input where no options are supplied;
- require all required answers before submit.

Submit through `respondToCodexUserInput` with exact Workflow/WorkItem identity.

Refresh the exact session after response.

## 4. Exact Implementer MCP elicitation

When `pendingMcpElicitation` exists:

- show server name;
- message;
- requested schema summary;
- supported fields/options;
- whether response is supported;
- URL only as informational context when supplied by the runtime contract.

Support the existing bounded actions:

- accept;
- decline;
- cancel.

For accept, collect only fields permitted by the declared elicitation model.

Submit through `respondToCodexMcpElicitation` with exact Workflow/WorkItem identity.

Do not expose raw MCP transport payloads or bypass the existing response contract.

## 5. Exact Implementer cancellation

When an exact Implementer session is running or waiting:

- show Cancel;
- call `cancelCodexImplementerExecution({ workflowId, workItemId })`;
- refresh exact status;
- preserve typed attempt/evidence semantics already owned by the runtime.

Do not cancel another Workflow's session.

## 6. Exact Tester interaction

When `CodexTesterExecutionModel.pendingApproval` exists:

- reuse the bounded approval panel;
- call `respondToWorkflowWorkItemTesterApproval(workflowId, workItemId, implementationRecordId, requestId, decision)`.

When `pendingUserInput` exists:

- reuse the bounded input panel;
- call `respondToWorkflowWorkItemTesterInput(...)`.

While Tester is running/waiting:

- show Cancel;
- call `cancelWorkflowWorkItemTester(workflowId, workItemId, implementationRecordId)`.

Tester has no MCP elicitation contract; do not invent one.

## 7. Correct exact-run concurrency presentation

WRB04-03R intentionally permits concurrent exact runs.

Current problem:

- `CodexRuntimeManager.acquireConcurrentExact()` allows multiple exact runs up to shared capacity;
- `getStatus().busy` becomes true whenever any exact run is active;
- the shared Workspace disables **Run Implementer** on `runtime.busy`.

That reserializes independent Workflows at the UI.

Do not reinterpret the legacy/global `busy` flag.

Expose bounded exact-run capacity in `CodexManagedRuntimeStatus`, equivalent to:

```ts
exactRunCapacity: {
  active: number;
  maximum: number;
  available: number;
}
```

The runtime manager is the source of truth.

Shared exact Workspace:

- may start another exact session when capacity remains and this exact owner is not already running/leased;
- disables only when exact capacity is exhausted or the selected exact owner is already running/blocked;
- displays a bounded capacity message when no exact slot remains.

Legacy execution paths may continue using their existing global `busy` semantics.

Do not increase the backend concurrency limit in this card.

## 8. Model selection behavior

Preserve the managed model catalog and selected defaults.

A model selection save must not terminate or mutate an already-running exact session.

The session continues with the model/effort captured when it acquired execution capacity.

No per-Workflow model persistence is required by this repair.

## 9. Visible runtime state

For Implementer and Tester show enough bounded status to diagnose a waiting run:

- state;
- started/completed time where available;
- failure reason;
- pending interaction type;
- bounded event/error tail where already available and safe.

Do not dump full raw model transcripts into the renderer.

## 10. Restart semantics

External model processes do not have to survive application death.

If the app is restarted while a model interaction is pending:

- reopened product state must not falsely present an in-memory pending request as actionable if its session is gone;
- exact SPS attempt/Tester evidence already persisted remains durable;
- UI must resolve to a truthful terminal/rerunnable/inspection state according to the existing runtime service.

Do not fabricate response continuity for a dead model process.

## Permanent proof

At minimum prove:

1. exact Implementer approval request renders;
2. approve and deny calls carry exact Workflow/WorkItem identity;
3. exact Implementer user input renders and submits bounded answers;
4. exact Implementer MCP elicitation renders and responds through the existing API;
5. exact Implementer cancel affects only its exact owner;
6. exact Tester approval renders and responds with exact implementation identity;
7. exact Tester input renders and responds;
8. exact Tester cancel affects only its exact owner;
9. a waiting session resumes/finishes after a valid response;
10. peer Workflow response ID/identity rejects;
11. second independent exact Implementer run remains startable while exact capacity remains;
12. capacity exhaustion disables/blocks new exact runs with a bounded reason;
13. legacy global run behavior is not changed;
14. restart does not expose stale in-memory interaction as live.

## Non-scope

Do not change:

- WorkItem execution planning/decomposition;
- Criterion policies;
- Phase validation;
- source checkpoint semantics;
- integration;
- maximum exact concurrency.

## Validation

Run:

- build;
- Codex runtime manager exact-capacity tests;
- exact Implementer service approval/input/elicitation/cancel tests;
- exact Tester service approval/input/cancel tests;
- shared reusable interaction panel tests;
- WorkflowExecutionWorkspace interaction tests;
- concurrent same/different Workflow UI behavior;
- restart truthfulness proof;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair01/Reports/WRB04-R01-04_IMPLEMENTER_REPORT.md`

Commit:

`WRB04-R01-04 wire exact runtime interactions`

Then read WRB04-R01-05 only.
