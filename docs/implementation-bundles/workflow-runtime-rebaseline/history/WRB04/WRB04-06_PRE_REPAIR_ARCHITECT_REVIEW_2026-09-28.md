# WRB04-06 Architect Review — 2026-09-28

**Reviewed checkpoint:** `2a1f7c0c526761b8a7b71b788c4980a5f1f389aa`  
**Disposition:** REPAIR REQUIRED — WRB04 NOT CLOSED  
**Active work remains:** `WRB04-06_shared_workspaces_qualification.md`  
**No new WRB04 card is authorized.**

## What passes

The four first-pass backend findings from the prior Architect review are corrected.

### Accepted-solution Repair

`createWorkflowRepair()` now accepts a current failing required Criterion owned by:
- the exact parent WorkItem; or
- the exact accepted BoundedSolution implemented by that WorkItem.

Peer/unrelated Criteria and unsupported human/deferred ownership are rejected.

Focused proof covers WorkItem-owned and accepted-solution-owned failures.

### Workflow Integration attribution

Exact Workflow integration now creates/updates IntegrationRecord and deterministic integration Validation through:

`workflow-integration-application / system / WorkflowIntegration`

rather than impersonating `local-operator`.

The direct integration service test proves persisted `createdBy`, `updatedBy`, and Validation `performedBy`.

### Integration Validation idempotency

Normal repeated `sync()` before/after target advancement reuses matching persisted candidate/check evidence and deduplicates IntegrationRecord validation IDs.

A changed candidate revision remains distinct evidence.

### Direct exact Workflow integration service proof

The new production-path test directly exercises `createWorkflowIntegrationService` for both Feature and Issue:

```text
accepted exact Workflow
→ SourceBinding/checkpoint
→ execution completion
→ linked-Dev candidate
→ IntegrationRecord/Validation
→ Dev advance
→ Workflow closure
```

This closes the prior WRB04-05 proof gap.

### Shared renderer dispatch

Feature and Issue now dispatch from their planning front halves to the same `WorkflowExecutionWorkspace` based on persisted exact Workflow `currentWorkspace`.

Closed WIR stays a routing summary and the routed target opens by exact target Workflow ID.

The remaining legacy routed/Issue modules have identifiable legacy callers; the exact Workflow execution branch does not depend on those modules for Current Project Feature/Issue execution.

## Blocking findings

### 1. Pre-execution WorkItem decomposition is not exposed by the product path

WRB04-06 explicitly requires WorkItem execution-contract planning/decomposition.

The canonical typed `decomposeWorkItem()` command exists only in Project State. There is no exact Workflow application/IPC/preload/renderer path for it.

The shared Workspace therefore displays accepted WorkItems and their contract context but cannot perform the adopted pre-execution decomposition operation.

Required repair:

- expose a bounded exact-Workflow decomposition application command;
- renderer may act only on an eligible `planned|ready` WorkItem;
- derive ownership/current versions from the exact Workflow;
- collect explicit replacement candidates, Criterion disposition, and dependency remapping required by the existing typed domain command;
- do not create another Markdown Work Card authority;
- refresh exact SPS projection after the atomic mutation;
- prove the voided source disappears from current execution and replacement WorkItems become the current exact Workflow plan.

This is not a new architecture. Use the already accepted `decomposeWorkItem` semantics.

### 2. Human/operator Criterion policies have no usable exact Workflow action

The shared Validator projection correctly exposes:
- `visual_human`;
- `operator_decision`;
- `deferred_visual_phase`.

But the renderer only displays explanatory text.

There is no exact Workflow IPC/preload action that lets the Operator:
- persist `visual_human` Validation;
- persist the required explicit Operator Decision.

Consequently a WorkItem/accepted-solution Criterion with either policy can block completion forever from the new Workspace.

Required repair:

- add typed application actions for human visual Validation and Operator Criterion Decision;
- derive the exact Criterion owner, current Criterion version, current implementation attempt, and source candidate in the main process;
- human visual Validation uses the human Operator principal and `validationMode = visual_human`;
- Operator-decision policy records a real Operator Decision; do not fake it with Validation;
- renderer presents the action only for the declared human policy;
- current evidence must be visible after refresh;
- stale source/attempt/criterion evidence must reject.

Operator participation here is required product evidence, not an approval gate added by the system.

### 3. Phase validation is missing

The shared Workspace exposes a **Complete Phase** button once member WorkItems are closed, but it has no Phase validation projection or action path.

Any Phase with a required Criterion—deterministic, semantic, visual, deferred visual, or Operator decision—can therefore reach:

```text
all WorkItems closed
→ Complete Phase button visible
→ typed Phase completion rejects on unsatisfied Criterion
→ no exact Workspace action can satisfy the Criterion
```

Required repair:

- expose exact Phase completion-relevant Criteria and their current evidence;
- support applicable deterministic and semantic Phase validation through existing validation machinery;
- support `visual_human` / `deferred_visual_phase` human evidence;
- support `operator_decision` through explicit Operator Decision;
- only enable Phase completion when its canonical eligibility is satisfied;
- preserve direct topology with no artificial Phase.

Also enforce the ownership invariant for `deferred_visual_phase`: it is a Phase-boundary policy. Do not silently accept it on a direct WorkItem/solution where there is no Phase boundary to consume it.

### 4. Exact Implementer/Tester sessions can request interaction that the shared Workspace cannot answer

The exact runtime models already surface pending interaction and the preload/main APIs already support it.

Implementer can expose:
- `pendingApproval`;
- `pendingUserInput`;
- MCP elicitation;
- cancellation.

Tester can expose:
- `pendingApproval`;
- `pendingUserInput`;
- cancellation.

`WorkflowExecutionWorkspace` renders none of these controls.

A valid exact execution can therefore enter a waiting state and become impossible to continue from the shared Workspace.

Required repair:

- render pending Implementer approval, user-input, MCP-elicitation, and cancel controls using the exact Workflow/WorkItem identity;
- render pending Tester approval, user-input, and cancel controls using Workflow/WorkItem/ImplementationRecord identity;
- reuse the established bounded interaction presentation from the existing Codex workspace where practical;
- do not route the exact Workflow through legacy execution authority merely to obtain these controls;
- prove request → visible control → exact response → resumed/terminal session.

## Qualification gaps caused by the blocking findings

The submitted final report cannot establish the required no-dead-end product smoke while the paths above are absent.

The current renderer test proves dispatch/static shell presence, not the complete interactive execution loop.

Restart/recovery proof is also too narrow: the current exact projection reopen test covers the Work Item Map state, not the required durable recovery points for Tester, Validator, Repair, Phase, integration candidate/repair, and final closure.

After the four repairs above, final qualification must include:

1. exact reopen from ready WorkItem;
2. completed Implementer attempt / validation-pending state;
3. TesterResult/checkpoint;
4. Validator evidence;
5. active Repair;
6. completed WorkItem and Phase;
7. integration-ready Workflow;
8. retained integration candidate/Repair;
9. final integrated/closed Workflow;
10. pending Implementer/Tester interaction resume or truthful rerunnable state.

The application launch command itself passed, but interactive navigation was not observed in the submitted qualification. After the dead-end fixes, perform the bounded launch/usability smoke if the environment exposes the window; otherwise state exactly which interaction evidence is deterministic versus still requiring Operator dogfood.

## Final disposition

WRB04 backend/kernel first pass remains accepted.

WRB04-06 final product qualification is **not accepted** at `2a1f7c0c526761b8a7b71b788c4980a5f1f389aa`.

Continue the existing WRB04-06 card. Do not create WRB04-07, WRB04-06A, or a separate Repair card.

When the four blockers and recovery qualification are complete, write a fresh final qualification report and stop for Architect review.
