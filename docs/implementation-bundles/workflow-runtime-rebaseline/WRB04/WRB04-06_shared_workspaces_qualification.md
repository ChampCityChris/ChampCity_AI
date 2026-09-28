# WRB04-06 — Complete Shared Execution Workspace Qualification

**Status:** REPAIR REQUIRED — continue this same card.  
**Current checkpoint:** `2a1f7c0c526761b8a7b71b788c4980a5f1f389aa`  
**Architect review:** `WRB04-06_ARCHITECT_REVIEW_2026-09-28.md`  
**Implementer:** GPT 6.0 Luna Medium  
**Rule:** ONE active card. Do not create WRB04-07, a lettered child, or a separate Repair card.

## Preserve

Preserve the existing WRB04 implementation through `2a1f7c0c526761b8a7b71b788c4980a5f1f389aa`.

The following are accepted and are not to be redesigned:

- exact Workflow/WorkItem execution;
- source-backed and source-neutral Implementer paths;
- Tester lifecycle;
- deterministic and semantic Validator;
- canonical Repair loop;
- WorkItem and exact Phase completion mechanics;
- Workflow execution completion;
- exact Workflow integration and linked-Dev mechanics;
- Integration Repair;
- shared Feature/Issue `WorkflowExecutionWorkspace`;
- Current Project dispatch away from private Feature/Issue legacy execution paths;
- WIR target navigation by exact target Workflow ID.

The submitted qualification report was reviewed and renamed:

`Reports/WRB04-06_SUBMITTED_QUALIFICATION_2026-09-28.md`

It is evidence of the first qualification attempt, not final acceptance.

## Remaining blockers

### 1. Expose typed pre-execution WorkItem decomposition

The accepted `ProjectStateService.decomposeWorkItem()` command exists, but the Current Project exact Workflow path does not expose it through application service, IPC/preload, or the shared Workspace.

Implement the production path without inventing a second decomposition model.

Required:

- exact `workflowId + workItemId`;
- only current `planned|ready` WorkItems;
- expected WorkItem version derived/presented explicitly;
- bounded replacement candidates;
- explicit Criterion disposition/mapping;
- explicit incoming/outgoing dependency remapping required by the existing domain command;
- atomic call to the existing typed decomposition command;
- refresh from exact SPS after success;
- source WorkItem becomes historical/voided and replacements become the current executable plan.

The renderer must not construct arbitrary Project State relationships directly.

### 2. Add exact human/operator Criterion actions

The shared Workspace currently shows human-policy Criteria but cannot satisfy them.

Implement exact application/API/UI actions for:

#### visual_human

- target an exact current Criterion;
- derive owner/current version/current source context in main;
- record `Validation` with `validationMode = visual_human`;
- performer is the human Operator principal;
- bind current implementation attempt/source candidate when the Criterion participates in WorkItem completion;
- reject stale Criterion/attempt/source evidence.

#### operator_decision

- record a real Operator `Decision`;
- govern the exact WorkItem, accepted solution owner, or Phase according to the canonical completion policy;
- do not substitute Validation for the Decision;
- require bounded Operator rationale;
- show current disposition after refresh.

Operator input is required evidence for these declared policies; it is not an added workflow approval gate.

### 3. Implement exact Phase validation before Phase close

A Phase with required Criteria currently has no usable validation path in the shared Workspace.

Add an exact Phase validation projection and actions.

Required policies:

- `deterministic` — use the existing ValidationCatalog/profile machinery against the exact current source/evidence;
- `semantic_ai` — independent read-only Validator principal with bounded Phase/WorkItem evidence;
- `visual_human` — human visual Validation;
- `deferred_visual_phase` — human visual evidence specifically at Phase close;
- `operator_decision` — explicit Operator Decision.

The Phase completion button must be enabled only when canonical Phase completion eligibility is satisfied.

Do not create an artificial Phase for direct topology.

Enforce the planning/domain invariant that `deferred_visual_phase` belongs to a real Phase boundary. It must not be silently accepted on a direct WorkItem/solution where no Phase can consume it.

### 4. Surface exact Implementer/Tester interaction requests

The backend already exposes these states/actions. Wire them into the shared Workspace.

#### Implementer

When present, render and handle:

- `pendingApproval`;
- `pendingUserInput`;
- pending MCP elicitation;
- cancel.

Responses must carry exact `workflowId + workItemId`.

Reuse the established bounded Codex interaction presentation where practical; do not route through legacy Work Card execution authority.

#### Tester

When present, render and handle:

- `pendingApproval`;
- `pendingUserInput`;
- cancel.

Responses must carry exact `workflowId + workItemId + implementationRecordId`.

Prove a pending request can be answered and the exact session resumes or reaches a truthful terminal state.

## Final qualification after repairs

Run focused end-to-end proof for the shared Current Project path.

### Feature source-backed

Prove:

```text
Feature planning
→ Work Item Map
→ optional typed decomposition
→ Implementer
→ interaction request/response where fixture requires it
→ source checkpoint
→ Tester
→ Tester interaction request/response where fixture requires it
→ Validator
→ canonical Repair
→ reimplementation
→ WorkItem completion
→ Phase validation/close when phased
→ Workflow completion
→ exact Workflow integration
→ Dev advancement
→ Workflow closed
```

Include at least one human-policy Criterion fixture through the exact action path.

### Issue

Prove the same shared post-plan runtime from an accepted Issue RCA/correction plan.

No Issue Fix Card/private Issue execution engine may own the Current Project target execution.

### WIR convergence

Route WIR to a Feature target, then prove target execution uses the same exact Workflow path as direct Feature start.

WIR remains routing provenance only.

### Source-neutral

Prove Implementer → Tester → Validator → completion → closed Workflow with no fabricated RepositoryCheckout, SourceCheckpoint, or IntegrationRecord.

### Restart/reopen recovery

Reopen exact SPS/runtime state at minimum after:

1. ready WorkItem;
2. successful Implementer / validation-pending;
3. TesterResult/checkpoint;
4. Validator evidence;
5. active Repair;
6. completed WorkItem/Phase;
7. integration-ready;
8. retained integration candidate/Integration Repair;
9. integrated/closed Workflow.

External model processes do not need to survive app death. Durable state must recover truthfully to resume/inspect/retry.

### Usability smoke

Run bounded desktop launch/navigation smoke when the environment exposes the window.

Verify at minimum:

- Feature/Issue enter the same shared execution Workspace;
- exact WorkItem selection/actions are usable;
- pending model interaction controls are visible when present;
- human Criterion/Phase validation actions are visible when required;
- errors are visible;
- Back to Workflows returns to Hub;
- reopen returns to the state derived from SPS.

If GUI automation remains unavailable, report that limitation precisely and do not claim interactive visual acceptance.

## Focused validation

Run:

- build;
- Project State decomposition/criterion/Phase focused tests;
- exact Workflow application/IPC tests;
- exact Implementer/Tester interaction tests;
- shared renderer tests covering the new controls;
- Feature vertical;
- Issue vertical;
- WIR target convergence;
- source-neutral vertical;
- restart/reopen qualification;
- direct exact Workflow integration test;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`;
- bounded desktop launch smoke.

Do not use the historical full test suite as the completion gate.

## Final report

Only after all blockers and qualifications pass, create:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-06_FINAL_QUALIFICATION_REPORT.md`

The report must explicitly distinguish deterministic UI/service proof from any manual/interactive evidence that could not be run.

## Checkpoint and STOP

Commit:

`WRB04-06 repair and qualify shared execution workspace`

Then STOP for human Architect review.

Do not begin WRB05.
