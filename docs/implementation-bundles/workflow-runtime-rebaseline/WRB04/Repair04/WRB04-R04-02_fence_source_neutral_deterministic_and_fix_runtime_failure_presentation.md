# WRB04-R04-02 — Fence Unsupported Source-Neutral Deterministic Plans and Fix Runtime Failure Presentation

**Parent:** WRB04 Repair04  
**Depends on:** WRB04-R04-01 passing checkpoint/report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Prevent source-neutral Workflows from accepting required deterministic proof obligations that the product cannot satisfy, and make returned exact-runtime refusal models remain visible and correctly attributed in the shared Workspace.

This card is deliberately bounded to planning-policy compatibility and renderer execution-result presentation.

## 1. Add one source-mode validation-policy compatibility rule

The current product has:

- source-backed deterministic proof through ValidationCatalog;
- source-neutral semantic/human/Operator proof;
- no application-owned source-neutral deterministic provider.

Therefore a source-neutral exact Workflow must not accept a **required** Criterion whose policy is `deterministic`.

Apply the rule to:

- WorkItem-owned Criteria;
- accepted-solution Criteria;
- Phase Criteria.

Optional/informational deterministic Criteria do not block completion and may remain accepted.

Do not fabricate a generic deterministic source-neutral provider in this card.

## 2. Enforce the guard at canonical planning acceptance

At `acceptWorkflowPlanningGraph()`:

1. resolve whether the exact Workflow already has canonical source identity;
2. source-backed if its exact Workflow/source lineage has the one valid SourceBaseline expected by the Current Project source model;
3. otherwise source-neutral.

If source-neutral and any required Criterion declares `validationPolicy = deterministic`:

- reject the planning graph atomically;
- return a bounded message that deterministic proof is unavailable for this source-neutral Workflow;
- instruct the Architect/Operator to use an actually supported policy such as semantic AI, human visual, or Operator decision as appropriate.

Do not mutate any planning entity before the rejection.

## 3. Enforce the same rule during typed WorkItem decomposition

A valid source-neutral accepted plan must not later acquire an impossible required deterministic Criterion through decomposition.

When `decomposeWorkItem()`:

- transfers an existing valid Criterion, preserve it;
- elevates an existing valid Criterion, preserve it;
- splits/creates a new required Criterion, apply the source-mode compatibility check;
- reject a new required deterministic split in a source-neutral Workflow.

Do not change decomposition graph semantics otherwise.

## 4. Preserve generated Repair source-mode policy

R03-03 already makes generated source-neutral Repair Criteria `semantic_ai`.

Do not regress that behavior.

Source-backed generated Repairs remain deterministic.

## 5. Add planning-handoff guidance

Feature/Issue Architect planning context and WorkItem planning handoff already know source mode.

When source-neutral:

- state explicitly that required deterministic ValidationCatalog proof is unavailable;
- require the Architect to select a supported validation policy for every required Criterion.

This is guidance only; canonical Project State enforcement remains authoritative.

## 6. Correct exact runtime result handling in the shared Workspace

Current generic `act()` mixes unrelated result types.

Replace runtime start/response handling with typed helpers.

At minimum use separate handlers equivalent to:

- `applyImplementerResult(model, successMessage?)`
- `applyTesterResult(model, successMessage?)`

Implementer result:

- store only in Implementer state;
- Tester model must never be cast/stored as Implementer;
- if state = running and no failureReason, show started/resumed feedback;
- if state = unavailable|failed or failureReason exists, preserve the returned model and show that exact error;
- do not immediately clear that error through a generic refresh.

Tester result:

- store only in Tester state;
- same failure/success behavior.

## 7. Refresh without erasing terminal operation feedback

Separate durable projection refresh from operation feedback.

A refresh may update:

- Workflow projection;
- validation projection;
- runtime catalog;
- Phase projections;
- exact session status.

But a successful projection fetch must not automatically erase an error returned by the operation that triggered it.

Use one explicit feedback lifecycle, for example:

- action handler decides success/error;
- refresh updates state without clearing operation feedback;
- user/next successful operation may clear prior error.

Do not leave stale errors forever after a later successful explicit action.

## 8. Capacity/lease/preflight returned-model proof

Exercise exact start APIs returning models rather than throwing.

Required renderer behavior:

### Capacity exhausted

Backend returns unavailable/failureReason.

Workspace:

- does not show “Implementer run started”;
- stores the returned Implementer model;
- displays exact capacity message;
- leaves WorkItem state unchanged.

### Same-checkout role lease refusal

Same requirements; show exact lease blocker.

### Source preparation refusal

Same requirements.

### Valid start

Returned state running:

- stores exact Implementer model;
- shows started feedback;
- polling begins.

### Tester returned refusal

Returned Tester unavailable/failed:

- stores Tester model only;
- error remains visible;
- Implementer display is unchanged.

## 9. Approval/input/cancel result attribution

Apply typed result handlers to exact interaction responses too.

Implementer approval/input/MCP/cancel responses update Implementer state.

Tester approval/input/cancel responses update Tester state.

Do not rely on structural coincidence such as both model types containing `eventTail`.

## 10. Restart/reopen

Runtime operation feedback itself is transient UI state.

Durable checkpoint/runtime truth after process restart comes from:

- SPS;
- exact execution status;
- R04-01 checkpoint recovery projection.

Do not persist transient error strings into Project State.

## Permanent proof

At minimum prove:

1. source-neutral planning rejects required deterministic WorkItem Criterion;
2. rejects required deterministic solution Criterion;
3. rejects required deterministic Phase Criterion;
4. optional/informational deterministic Criterion remains accepted;
5. source-backed planning still accepts required deterministic Criterion;
6. source-neutral decomposition rejects newly split required deterministic Criterion;
7. generated source-neutral Repair remains semantic_ai;
8. returned Implementer capacity refusal remains visible after projection refresh;
9. same-checkout lease refusal remains visible;
10. source-preparation refusal remains visible;
11. valid Implementer running result shows started feedback;
12. returned Tester refusal updates Tester state only;
13. Tester model is never stored as Implementer;
14. later successful explicit operation clears/replaces prior operation error correctly;
15. approval/input/MCP/cancel responses use the correct typed runtime state.

## Non-scope

Do not change:

- checkpoint retry mechanics from R04-01;
- source checkpoint lineage;
- cumulative solution/Phase evidence;
- Repair execution policy;
- integration.

## Validation

Run:

- build;
- canonical planning-policy tests;
- typed decomposition policy tests;
- Feature/Issue planning application tests;
- renderer exact runtime returned-model tests;
- interaction panel regression tests;
- exact backend capacity/lease tests;
- source-mode Repair regression;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair04/Reports/WRB04-R04-02_IMPLEMENTER_REPORT.md`

Commit:

`WRB04-R04-02 fence source-neutral proof and runtime errors`

Then immediately proceed to R04-03.
