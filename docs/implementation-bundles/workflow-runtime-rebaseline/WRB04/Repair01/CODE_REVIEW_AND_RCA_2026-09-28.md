# WRB04-06 Code Review and RCA — Shared Execution Workspace Qualification Failure

**Date:** 2026-09-28  
**Reviewed implementation checkpoint:** `2a1f7c0c526761b8a7b71b788c4980a5f1f389aa`  
**Architect review checkpoint:** `2a8181e0aa5c8644431d371135caf96e5d416ed6`  
**Disposition:** WRB04 backend/runtime remains accepted; WRB04-06 product qualification failed and requires bounded Repair01.

## Executive finding

WRB04 successfully rebuilt the execution kernel, but the first shared Feature/Issue execution Workspace was implemented and qualified as a **happy-path façade over the new services**, not as a complete user surface for the execution state machine.

The backend now contains substantially correct exact-Workflow mechanics for:

- WorkItem execution;
- source-backed/source-neutral behavior;
- Tester;
- Validator;
- Repair;
- WorkItem/Phase completion;
- Workflow completion;
- exact Workflow integration;
- Integration Repair.

The product surface does not expose every required transition in those mechanics.

The resulting defect class is:

> **A canonical SPS/runtime state exists and correctly blocks progression, but the shared Workspace provides no valid user or Architect action that can move the exact Workflow out of that state.**

That is why the new Workspace can appear functional in static renderer proof and straight-through service tests while still dead-ending a real Operator.

## Code review findings

### CRITICAL — Architect WorkItem planning was skipped entirely

The governing WRB04 baseline defines:

```text
Work Item Map
→ Work Item planning/decomposition
→ Implementer
```

The accepted WorkItem supplies objective, dependencies, and Criteria. The Architect planning boundary is supposed to refine the exact execution contract by:

- clarifying implementation boundaries;
- identifying affected files/services/contracts;
- identifying focused proof intent;
- decomposing oversized pre-execution WorkItems when needed;
- surfacing material scope/architecture conflicts.

The current shared Workspace jumps directly from Work Item Map to **Run Implementer**.

The deeper code defect is in `codexImplementerExecutionService.resolveWorkflowWorkItemContext()`:

- source-neutral execution calls the exact contract builder with `affectedPaths: []`;
- source-backed execution also calls it with `affectedPaths: []`;
- both use the same generic proof intent:
  `Return semantic completion for the exact accepted WorkItem contract.`

So the new exact runtime does not merely lack a decomposition button. It bypasses the Architect execution-contract elaboration that WRB04 was supposed to preserve.

The existing typed `ProjectStateService.decomposeWorkItem()` command is implemented and tested, but there is no Current Project application/IPC/preload/renderer path to invoke it.

**Ownership:** Implementer miss against an explicit WRB04 baseline/card requirement, amplified by Architect qualification not checking the actual exact contract values.

### CRITICAL — Phase completion can become an unrecoverable product dead-end

Project State correctly blocks Phase completion until required Phase Criteria are satisfied.

The shared Workspace exposes **Complete Phase** when member WorkItems are closed, but there is no exact Phase validation projection or action service.

There is no Current Project product path for Phase Criterion policy:

- deterministic;
- semantic_ai;
- visual_human;
- deferred_visual_phase;
- operator_decision.

A Phase can therefore reach:

```text
all WorkItems closed
→ Complete Phase visible
→ SPS rejects completion
→ no valid action exists in the shared Workspace to create the missing Phase evidence
```

The card explicitly required Phase validation/close. This was not implemented.

**Ownership:** Implementer defect; Architect test/review miss because qualification did not create a Phase with blocking Criteria.

### HIGH — Human-policy WorkItem/solution Criteria are visible but not actionable

The exact WorkItem validation projection correctly reports:

- `visual_human`;
- `operator_decision`;
- `deferred_visual_phase`.

The renderer displays explanatory text, but no exact application action exists to satisfy `visual_human` or `operator_decision`.

Project State already enforces the correct semantic distinction:

- visual evidence is a human `Validation`;
- Operator decision policy cannot be replaced by Validation.

The missing layer is the exact Workflow application/product path.

A WorkItem or accepted-solution Criterion with one of these policies can block completion forever even though the domain model is behaving correctly.

**Ownership:** Implementer product-path miss with an Architect acceptance-test miss. The original WRB04 card required human/deferred distinction and Operator action for declared human decisions, but did not specify the exact action API strongly enough.

### HIGH — Operator Criterion completion is currently owner-wide rather than Criterion-specific

`operator_decision` is a Criterion validation policy, but current completion checks call `getEffectiveDisposition()` on the WorkItem or Phase owner.

That means one accepted owner-level disposition can satisfy multiple distinct Operator Criteria on that owner.

The domain already supports Decision `governs` relationships to arbitrary entities, so the exact semantic target should be the Criterion itself.

Repair01 must make current Operator Criterion disposition Criterion-specific and preserve Decision history there.

**Ownership:** earlier architecture/implementation shortcut not detected because permanent completion tests did not cover multiple Operator Criteria on one owner.

### HIGH — Exact Implementer/Tester interaction states are not surfaced

The runtime models already contain bounded pending states.

Implementer:

- `pendingApproval`;
- `pendingUserInput`;
- `pendingMcpElicitation`;
- cancellation.

Tester:

- `pendingApproval`;
- `pendingUserInput`;
- cancellation.

Main/preload already expose exact response routes.

The legacy Work Card Workspace already has reusable bounded approval/input/elicitation presentation.

The new `WorkflowExecutionWorkspace` renders none of those states.

A legitimate exact model run can therefore become `running` while waiting for interaction that the Operator cannot answer from the shared Workspace.

**Ownership:** Architect specification miss plus implementation incompleteness. The original 06 card required a usable shared Implementer/Tester presentation but did not explicitly enumerate all interactive runtime states.

### HIGH — Exact Implementer contract omits accepted-solution Criteria

The shared validation/completion path correctly treats required Criteria owned by the accepted BoundedSolution as completion obligations for the WorkItem.

The exact Implementer contract does not.

Both source-backed and source-neutral contract builders currently populate `criteria` from:

`plan.criteria.filter(candidate => candidate.ownerId === workItemId)`

Accepted-solution Criteria are therefore invisible to the Implementer even though they can later block completion and trigger Repair.

The exact Architect planning and Implementer contract must present the same completion-relevant WorkItem + accepted-solution obligations that Validator/completion will enforce.

**Ownership:** Architect contract miss carried forward from WRB04-02/04 and not caught by qualification.

### HIGH — Shared Workspace reintroduces global execution serialization at the UI

WRB04-03R explicitly repaired exact Workflow concurrency so independent Workflow checkouts and source-neutral WorkItems can run concurrently subject to shared capacity.

`CodexRuntimeManager.acquireConcurrentExact()` supports up to four exact runs.

However `WorkflowExecutionWorkspace` disables **Run Implementer** when `runtime.busy` is true.

`CodexRuntimeManager.getStatus().busy` becomes true whenever `concurrentExactRuns > 0`.

The UI therefore disables a second independent exact Implementer run whenever any first exact run is active, even though the backend explicitly permits it.

Required repair must use exact run/session state or explicit remaining-capacity semantics rather than the legacy/global busy boolean.

**Ownership:** Implementer UI regression against the accepted WRB04-03R concurrency boundary; Architect qualification miss.

### HIGH — Restart/reopen qualification did not cover the required state machine

The 06 card required durable recovery at:

- ready WorkItem;
- implementation;
- Tester;
- Validator;
- Repair;
- WorkItem/Phase completion;
- integration candidate/repair;
- final closed Workflow.

The submitted evidence proves exact-ID projection reopen near the Work Item Map and separately proves durable SPS/storage behavior, but it does not replay/reopen the shared execution product path at each required boundary.

The final report therefore overstated qualification relative to the card.

**Ownership:** Implementer qualification defect; Architect process miss for allowing static/siloed evidence to stand in for the requested recovery matrix.

### MEDIUM — Static renderer proof was used as a proxy for interactive usability

`workflow-hub-shell.test.cjs` proves:

- dispatch to the shared execution component;
- exact Workflow ID appears;
- Back to Workflows appears;
- Work Item Map text appears.

It does not exercise:

- effects/loading;
- button clicks;
- state refresh;
- pending agent interactions;
- human Criterion actions;
- Phase validation;
- decomposition;
- Repair action completion;
- integration controls.

The test is useful as shell proof, but it is not product-path qualification.

**Ownership:** qualification design defect.

## Accepted code that must not be reopened

The review accepts and freezes the following unless a repair card directly demonstrates a regression:

- exact WorkItem execution identity;
- Implementer actor attribution;
- source-backed/source-neutral execution;
- TesterResult/checkpoint architecture;
- semantic/deterministic WorkItem Validator mechanics;
- WorkItem + accepted-solution Criterion projection;
- canonical Repair creation including accepted-solution failures;
- exact WorkItem completion;
- exact Workflow-owned Phase membership isolation;
- Workflow execution completion;
- exact Workflow integration;
- linked-Dev Git common-directory handling;
- integration system attribution;
- integration Validation synchronization behavior covered by the accepted direct integration service proof;
- final Workflow closure after Dev integration;
- shared Feature/Issue post-plan renderer dispatch;
- WIR target opening by exact target Workflow ID;
- removal of zero-caller routedDevelopmentApplicationService and WorkIntake structuredIntegrationService.

Repair01 is not permission to redesign those surfaces.

## Root Cause Analysis

### Primary root cause — no canonical state/action coverage matrix governed Workspace qualification

The execution domain was designed as structured state transitions, but the renderer implementation and qualification were not derived from the same transition inventory.

There was no explicit artifact asserting, for every reachable Current Project execution state:

1. what canonical record/state makes the state reachable;
2. what action is required to leave it;
3. which application service owns that action;
4. which UI control exposes it;
5. which permanent proof demonstrates the transition.

Without that matrix, the implementation naturally covered the most visible straight-through path:

```text
ready
→ Implementer
→ Tester
→ deterministic/semantic Validator
→ complete
→ integrate
```

and omitted less frequent but fully valid states.

### Secondary root cause 1 — WorkItem planning authority was reduced to automatic contract synthesis

The runtime contract builder existed before the user-facing Architect planning step.

Instead of making exact Implementer execution consume durable Architect elaboration, the adapter supplied empty affected paths and generic proof intent.

That made the architecture appear wired while eliminating the intended WorkItem planning boundary.

### Secondary root cause 2 — domain policy support and product action support were developed separately

Project State correctly supports visual/human/Operator/deferred Criterion semantics.

The WorkItem Validator implemented deterministic and semantic AI paths.

The renderer consumed the read projection.

No one closed the final mapping from each declared policy to an exact Current Project action.

Phase policy support suffered the same split.

### Secondary root cause 3 — existing interaction UI was not reused in the new shared Workspace

The exact Implementer/Tester backend retained interactive model events, while the shared Workspace implemented only start/status summary.

Existing bounded Codex approval/input/elicitation UI components remained embedded in the legacy Work Card surface instead of being extracted/reused.

### Secondary root cause 4 — qualification evidence was vertically fragmented

Backend integration proof, renderer static proof, Project State tests, and app launch each passed independently.

None of them proved the whole state transition through the product surface.

This allowed a locally correct set of components to produce a globally incomplete workflow.

### Process root cause — Architect abandoned the established failed-review repair workflow

After WRB04-03 and again during WRB04-06, the Architect repeatedly edited/re-scoped the active card instead of:

```text
freeze failed checkpoint
→ code review
→ RCA
→ bounded Repair Cards
→ implement sequentially
→ requalify
```

That created moving instructions and contributed directly to Implementer confusion.

This is a process defect in the Architect execution, not a reason to add more workflow machinery to the product.

## Why the tests passed

The passing proof was real but insufficient.

- Project State tests proved domain rules.
- exact Workflow service tests proved backend operations.
- direct integration tests proved source-backed Feature/Issue integration.
- renderer SSR proved that the new shared component was selected and contained basic text/actions.
- `npm start` proved the desktop process could launch.

None of those tests required a Workflow containing:
- an Architect-planning/decomposition decision;
- a visual/operator Criterion;
- a Phase Criterion;
- an Implementer/Tester pending interaction;
- a restart/reopen at each execution stage.

The tests therefore never entered the missing states.

## Target state

The shared execution path is complete only when every canonical execution state has one owned action path.

At minimum:

| State / obligation | Owning action |
| --- | --- |
| WorkItem needs Architect elaboration | exact WorkItem planning acceptance |
| WorkItem oversized | typed decomposition |
| Implementer waiting for approval/input/elicitation | exact runtime response |
| Tester waiting for approval/input | exact Tester response |
| deterministic WorkItem/solution Criterion | deterministic Validator |
| semantic WorkItem/solution Criterion | semantic Validator |
| visual WorkItem/solution Criterion | human visual Validation |
| Operator WorkItem/solution Criterion | explicit Operator Decision |
| active Repair | same exact execution loop |
| deterministic Phase Criterion | Phase deterministic Validator |
| semantic Phase Criterion | Phase semantic Validator |
| visual/deferred visual Phase Criterion | human Phase Validation |
| Operator Phase Criterion | explicit Phase Operator Decision |
| Phase eligible | typed Phase completion |
| Workflow eligible | typed Workflow execution completion |
| integration conflict/failure | Integration Repair / declared Operator decision |
| integrated | typed Workflow close |

Restart/reopen must reconstruct this state from SPS/runtime evidence, not from renderer memory or Markdown files.

## Repair boundaries

Release one WRB04 Repair01 bundle with five sequential cards.

1. **WRB04-R01-01 — Restore Architect WorkItem Planning and Typed Decomposition**
2. **WRB04-R01-02 — Complete Human Criterion Evidence Actions**
3. **WRB04-R01-03 — Complete Exact Phase Validation and Close**
4. **WRB04-R01-04 — Wire Exact Implementer and Tester Interaction Controls**
5. **WRB04-R01-05 — Requalify Shared Execution and Close WRB04**

Do not merge these into one implementation card.

Do not split them further unless a material architecture contradiction is found.

## Disposition

Checkpoint `2a1f7c0c526761b8a7b71b788c4980a5f1f389aa` remains useful implementation evidence but is not final WRB04 acceptance.

The direct WRB04-06 implementation loop is blocked.

Repair01 becomes the only authorized continuation.

After WRB04-R01-05, stop for final Architect disposition before WRB05.
