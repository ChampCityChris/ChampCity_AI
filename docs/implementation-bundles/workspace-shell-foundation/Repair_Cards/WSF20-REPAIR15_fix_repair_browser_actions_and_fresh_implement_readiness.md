# WSF20-REPAIR15 — Fix Repair browser actions and fresh Implement readiness

**Type:** Repair Card  
**Parent:** WSF20  
**Defects:** WSF20-D37, WSF20-D38  
**Starting baseline:** `197cace436aa0b12e5b8734b82fd20f961bae5a1`

> Preserve unrelated dirty Forgejo/bootstrap work. Do not stage, amend, restore, or modify it as part of R15.

## Objective

Unblock the live Repair loop without changing workflow authority:

1. Repair Architect browser controls belong below the embedded ChatGPT surface.
2. A fresh eligible source-backed WorkItem must be able to start Implement even when its managed source checkout has not yet been materialized for that attempt.

Source materialization and exact checkout verification remain Run responsibilities.

# D37 — Repair browser actions below ChatGPT

## Required correction

In `WorkCardRepairShell`, compose the right column in this order:

1. optional compact Repair Architect status/heading;
2. embedded `browserPanel`;
3. Repair browser action controls;
4. bounded feedback/error.

The actual Prepare / Copy / Reload / Refresh controls must appear below the embedded browser.

Preserve:

- Prepare Repair Work Card Prompt;
- Copy Handoff;
- Reload ChatGPT;
- Refresh;
- existing enable/disable semantics;
- browser geometry and persistent session.

Prefer the same action vocabulary used by `WorkflowCandidateBrowserActions` if it fits without changing Repair semantics. Otherwise preserve the existing Repair controls but place/style them consistently below the browser.

Do not move the document/disposition controls into the browser column.

## Presentation proof

Prove DOM order: browser host precedes Prepare/Copy/Reload/Refresh actions, and the browser owns the fill height while the action region remains intrinsic.

R14 Review & Validation must remain browser-first/actions-below.

# D38 — Status must not require Run-time source materialization

## Governing boundary

Status / presentation read:
- determine whether the exact WorkItem may attempt to start;
- perform no source materialization.

Implement / Start:
- prepare/recover durable attempt;
- materialize/verify exact source checkout when source-backed;
- build exact execution context;
- start Implementer.

Do not move source preparation into status polling.

## Required correction

### 1. Add a read-only exact start-readiness path

For `getWorkflowWorkItemStatus()` when there is no live session, no prepared/running attempt requiring recovery, and no completed attempt owning the current downstream state, derive start readiness from the current `WorkflowExecutionProjection` and exact WorkItem.

Require:

- exact Workflow and WorkItem identity;
- WorkItem is active and planned or ready;
- current execution eligibility is true;
- planning/contract review blockers are absent;
- source projection is not explicitly blocked.

For source-backed WorkItems:

- an unprepared/preparable source state must not make Status Unavailable;
- a ready source state may be reported ready without rematerializing;
- explicit blocked source state remains unavailable.

Return a bounded ready-to-start execution model with state=ready, canRunAgain=true, exact Workflow/WorkItem identity/version, sourceMode=source-backed, and no failure/retry blocker.

Execution contract digest / checkout identity may remain unresolved until Run if materialization is required. Do not invent them during status.

### 2. Start remains exact authority

`startWorkflowWorkItemSelected()` continues to:

- prepare/recover the durable ImplementationAttempt;
- resolve context with source preparation enabled;
- materialize/verify SourceBinding and repository checkout;
- build the exact WorkItem execution contract;
- enforce R13 mutation intent from approved affectedPaths;
- fail closed if preparation or verification fails;
- use the durable attempt ID as executionRef.

A ready Status means only that Start may be attempted.

### 3. Fresh Repair WorkItem regression

Build a source-backed Greenfield fixture that reaches parent Review & Validation → Request Repair → Repair planning approved → Repair WorkItem canonical Implement, with no prepared attempt for the Repair.

Before Start prove:

- status is Ready, not Unavailable;
- no source materialization occurs during status;
- renderer displays enabled Implement when model/runtime selection is ready.

After clicking Implement prove:

- source materialization/preparation occurs at Start;
- exactly one durable attempt is created/reused;
- exact Repair WorkItem begins;
- R13 no-mutation or mutation-required semantics follow the Repair WorkItem's approved affectedPaths.

### 4. Ordinary fresh WorkItem regression

Run the same status/start proof for a non-Repair source-backed WorkItem so this is not Repair-special-casing.

### 5. Preserve existing attempt/recovery semantics

Do not regress:

- prepared attempt → ready without another reservation;
- running attempt without live session → recovery/inspection required;
- completed no-mutation R13 attempt → completed/checkpoint-not-required;
- mutation-required missing checkpoint → strict blocked/recovery behavior;
- ambiguous/stale attempt → fail closed.

# R13 Tester verification — mandatory regression only

Current dev already contains the R13 Tester exception: zero implementation checkpoints plus an exact `isSourceBackedNoMutationImplementation(...)` result allows Tester to proceed; mutation-required WorkItems still require an exact committed implementation checkpoint.

Run the existing source-backed no-mutation Implementer/Tester owner.

If it passes, do not modify Tester production code.

If it fails on current HEAD, stop and report the exact failed R13 invariant before broadening this card.

## Focused proof

Run at minimum:

- Work Card Repair renderer owner;
- Work Card Implement renderer owner;
- Codex Implementer execution service owner;
- R13 source-backed no-mutation Implementer/Tester regression;
- workflow execution application owner;
- Greenfield full SQL Repair lifecycle owner;
- relevant browser/layout owner;
- static/build proof after excluding unrelated dirty Forgejo work.

## Operator acceptance

Continue the current live Repair WorkItem:

1. Repair Architect controls appear below ChatGPT;
2. approve Repair planning;
3. canonical Repair Implement opens;
4. Status is Ready rather than `Source-backed Workflow checkout is not prepared and verified`;
5. Implement is enabled when model/runtime selection is ready;
6. clicking Implement prepares/verifies source and starts the exact Repair;
7. no manual source-preparation step is required.

When the parent no-mutation WorkItem returns to Review & Validation, verify Tester no longer demands an implementation checkpoint if R13 qualification applies.

## Forbidden changes

- no source materialization during status polling;
- no weakening Start checkout verification;
- no Repair-specific execution stack;
- no schema migration;
- no manual SQL repair;
- no weakening R13 mutation-required checkpoint rules;
- no unrelated Tester redesign;
- no Forgejo/bootstrap changes.

## Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR15_IMPLEMENTER_REPORT.md`

## Checkpoint

`WSF20-R15 fix Repair browser actions and fresh Implement readiness`

Then stop for Operator audit.
