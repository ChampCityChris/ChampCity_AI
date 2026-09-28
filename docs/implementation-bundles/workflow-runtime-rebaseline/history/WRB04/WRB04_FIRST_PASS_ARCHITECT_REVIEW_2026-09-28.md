# WRB04 First-Pass Architect Review — 2026-09-28

**Reviewed through:** `865237d6db0877049d6e8de81b21f8ec7d01f54c`  
**Repository state at review start:** clean `dev`  
**Disposition:** FIRST-PASS RUNTIME COMPLETE; WRB04 FINAL QUALIFICATION INCOMPLETE  
**Active continuation:** existing `WRB04-06_shared_workspaces_qualification.md`

## Executive conclusion

The first implementation pass of the WRB04 shared execution kernel has reached the intended backend boundary.

The following now exist as real production paths:

- exact Workflow/WorkItem execution ownership;
- Implementer attempt lifecycle and source checkpoints;
- Tester determination/result/checkpoint/runtime;
- source-backed and source-neutral execution;
- independent deterministic and semantic Validator paths;
- typed WorkItem and Phase completion;
- canonical same-Workflow Repair WorkItems and Repair re-entry;
- Workflow execution completion;
- exact-Workflow integration keyed by Workflow rather than WorkIntake;
- managed linked-Dev candidate support through Git common-directory identity;
- Integration Repair mechanics;
- Dev advancement and typed Workflow closure;
- direct/preload APIs for the exact services.

WRB04-04 and WRB04-05 therefore represent a meaningful completed first pass of the runtime/kernel.

WRB04 is **not yet complete as a product bundle** because WRB04-06 correctly discovered that the shared post-plan UI/navigation family and the required end-to-end vertical qualifications are not wired.

Do not create another card. Continue and complete WRB04-06.

## Accepted first-pass results

### WRB04-04

Checkpoint:

`4b9ad3f1bf97b63034a03a741b2900f3bdf340dd`

Accepted first-pass architecture:

- Feature and Issue share exact Workflow validation/completion services.
- exact source-backed and source-neutral Validator evidence is represented.
- semantic Validator is a separate read-only, network-disabled agent principal.
- Implementer attribution now persists the actual Implementer agent rather than `local-operator`.
- WorkItem validation projection includes WorkItem and accepted-solution Criteria.
- routine WorkItem/Phase completion uses an application/system principal.
- Phase completion resolves exact Workflow membership rather than peer Project-wide Workflow state.
- Repair is represented as a canonical same-Workflow WorkItem and re-enters the shared runtime.

Focused proof reported 53/53 plus targeted Implementer/Tester regression.

### WRB04-05

Checkpoint:

`39840feba1c8e119588883e5aa13c47e2cc15689`

Accepted first-pass architecture:

- source-neutral Workflow execution can close without fabricating repository integration state;
- source-backed Workflow execution transitions to `integration-ready`;
- exact Workflow integration no longer requires WorkIntake identity;
- WIR routing provenance may resolve the target Workflow, after which integration delegates to the exact Workflow service;
- candidate storage supports linked `Dev/` checkouts by exact Git common-directory identity;
- conventional Git checkout behavior remains supported;
- candidate construction, validation, bounded Integration Repair, Dev advancement, IntegrationRecord state, and final Workflow closure are present;
- no push/Main/release behavior is implied.

Focused lower-level integration proof reported 38/38.

## First-pass defects found during Architect code review

These are bounded corrections and belong inside WRB04-06 before vertical qualification.

### 1. Solution-level failed Criterion cannot create its canonical Repair

The Validator correctly accepts completion-relevant Criteria owned by:
- the WorkItem; and
- the accepted BoundedSolution.

Completion eligibility likewise includes both.

However `createWorkflowRepair()` currently accepts a failing Validation only when the failed Criterion is directly owned by the parent WorkItem.

A required accepted-solution Criterion can therefore:

```text
fail validation
→ block WorkItem completion
→ Validator attempts canonical Repair
→ Repair command rejects because Criterion owner is the BoundedSolution
```

That leaves a real dead-end in the shared loop.

Required correction:

- accept a current failing required Criterion when it is owned either by the parent WorkItem or by the exact accepted BoundedSolution implemented by that WorkItem;
- continue rejecting unrelated/peer/Phase Criteria;
- preserve exact Workflow ownership and duplicate-failure identity;
- prove both WorkItem-owned and accepted-solution-owned failing Criteria create one canonical Repair and re-enter the same shared runtime.

Do not create a separate repair card.

### 2. Exact Workflow integration mechanics still impersonate the Operator

`workflowIntegrationService.sync()` currently creates its Project State service using:

`local-operator / human / Operator`

and then uses that principal for:
- IntegrationRecord creation;
- IntegrationRecord state advancement;
- integration Validation records.

Those are machine-owned integration mechanics, not human Operator decisions.

Required correction:

- use the explicit Workflow Integration application/system principal for IntegrationRecord creation/advancement and deterministic integration Validation;
- reserve the Operator principal for actual Operator decisions, including material conflict decisions;
- prove persisted `createdBy`, `updatedBy`, and Validation `performedBy` attribution.

### 3. Integration validation synchronization is not idempotent

The exact integration service calls `sync(record)` before target advancement and again after advancement.

The candidate record retains its `validation` receipts after transition from `validated` to `integrated`.

Current `sync()` records every receipt on every call, so one successful candidate can persist the same integration Validation evidence twice and append duplicate validation IDs.

Required correction:

- make candidate-to-SPS validation synchronization idempotent;
- identify persisted validation evidence by exact IntegrationRecord + candidate revision + check identity/equivalent immutable receipt identity;
- repeated query/sync/retry/finalization must not duplicate the same proof;
- genuinely rerun validation after a repaired/new candidate revision must remain distinct evidence.

### 4. Exact Workflow integration service lacks direct production-path proof

The WRB04-05 test evidence exercises the lower-level integration candidate engine and linked-worktree mechanics, but the test corpus does not directly reference `createWorkflowIntegrationService`.

That leaves the new composition layer insufficiently proven:

```text
SPS completion
→ exact Workflow SourceBinding
→ candidate service
→ IntegrationRecord sync
→ Dev advance
→ Workflow closure
```

WRB04-06 must add direct focused proof through the exact Workflow integration service/API, including the attribution and idempotency fixes above.

This is a qualification gap, not a reason to redesign the service.

## WRB04-06 audit result

Checkpoint:

`865237d6db0877049d6e8de81b21f8ec7d01f54c`

The Implementer correctly refused to claim qualification.

The audit established that:

- the exact backend services and preload APIs exist;
- the Renderer does not yet expose one shared post-plan execution Workspace;
- Feature planning currently ends at Work Item Map;
- Issue retains separate legacy lifecycle surfaces;
- routed-development production execution still constructs `routedDevelopmentExecutionService`;
- the required Feature, Issue, WIR, source-neutral, restart/recovery, test-lifecycle, linked-integration, and application-smoke verticals are not proven.

This is now the single remaining WRB04 implementation boundary.

## Active WRB04-06 continuation

WRB04-06 must now do two things in one card.

### A. Close the three bounded first-pass kernel defects

1. accepted-solution Criterion Repair support;
2. machine/system attribution for exact integration mechanics;
3. idempotent integration Validation synchronization;
4. direct exact `workflowIntegrationService` production-path proof.

### B. Finish the originally specified WRB04-06 product convergence

- build one shared Feature/Issue post-plan execution Workspace family;
- expose Work Item Map → Implementer → Tester → Validator → Repair → close/next → Phase → Workflow integration;
- recover navigation from exact SPS/runtime IDs;
- replace/fence Current Project legacy execution authority;
- ensure a WIR-created target Workflow uses the same exact execution runtime rather than routed-development private execution;
- perform Feature source-backed vertical;
- perform Issue vertical;
- perform WIR → Feature target vertical;
- perform source-neutral vertical;
- perform restart/recovery proof;
- perform test-lifecycle proof;
- perform linked-Dev exact integration through the actual Workflow integration service;
- run bounded application launch/usability smoke.

No new Workflow family front half and no web-client migration belong here.

## Legacy fence requirement

The final qualification must distinguish historical code from active Current Project authority.

For Feature/Issue Current Project execution, no production path may derive execution authority from:

- `workPlanningKernel`;
- `routedDevelopmentExecutionBinding`;
- `routedDevelopmentExecutionService`;
- WorkIntake-keyed integration authority;
- private `issueExecutionPlan`;
- Issue Fix Card identity;
- Markdown/currentWorkflow reconstruction.

WIR may remain the routing front half, but once it creates `targetWorkflowId`, the target must use the same exact Workflow planning/execution/integration services as a directly started target.

## Review status

This is a good first-pass stopping point.

The backend architecture is no longer the sprawling uncertainty that existed at the start of WRB04. The remaining work is concrete and observable: one shared user-facing execution path, legacy fencing, three bounded kernel corrections, and vertical qualification.

Do not begin WRB05 until WRB04-06 completes and receives final Architect review.
