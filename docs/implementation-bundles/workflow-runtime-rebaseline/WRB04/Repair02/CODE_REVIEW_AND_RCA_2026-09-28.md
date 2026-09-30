# WRB04 Post-06 Code Review and RCA — 2026-09-28

**Authoritative reviewed baseline:** `3d4399e563665afbd38426416d12a84989a51470`  
**Implementation commit:** `WRB04-06 repair and qualify shared execution workspace`  
**Branch:** `dev`  
**Review disposition:** WRB04-06 is materially implemented but not yet accepted; bounded Repair02 required.

## Executive finding

The completed WRB04-06 checkpoint closes most of the earlier product-path gaps.

Accepted at this baseline:

- exact Feature/Issue shared execution Workspace dispatch;
- typed WorkItem decomposition application/IPC/preload/UI path;
- exact WorkItem visual and Operator action endpoints;
- exact Phase validation projection and policy actions;
- exact Implementer/Tester pending approval/input/cancel wiring;
- Implementer MCP elicitation wiring;
- source-backed Feature and Issue integration through the exact Workflow integration service;
- WIR target convergence onto exact Workflow identity;
- source-neutral execution without fabricated Git state;
- durable reopen coverage across materially more execution stages;
- linked-Dev integration and final Workflow closure.

The remaining defects are not another execution-kernel redesign.

They are concentrated correctness/authority defects in the new execution surface:

1. the required Architect WorkItem execution-planning boundary is still absent;
2. Operator-decision authority is owner-wide instead of Criterion-specific and can be falsely satisfied by unrelated prior Decisions;
3. human visual actions can only record a pass;
4. Phase validation adapts WorkItem mechanics in ways that can create false deterministic passes, incomplete semantic evidence, and unrecoverable failure states;
5. one deferred-visual ownership path remains internally inconsistent;
6. the renderer still mishandles free-text runtime input and reserializes exact runs through the global `busy` flag;
7. qualification tests prove positive paths but miss the negative/freshness/multi-member cases that expose these defects.

WRB04 therefore requires one bounded repair bundle, not another re-baseline.

## Code review findings

### CRITICAL — WorkItem execution planning is still bypassed

The governing WRB04 lifecycle is:

```text
Work Item Map
→ Work Item planning/decomposition
→ Implementer
```

WRB04-06 added the decomposition command, but not the WorkItem planning/elaboration boundary.

The shared Workspace currently shows the accepted WorkItem and allows direct **Run Implementer**.

The exact Implementer adapter still synthesizes the contract with:

```text
affectedPaths: []
proofIntent: ["Return semantic completion for the exact accepted WorkItem contract."]
```

for both source-backed and source-neutral execution.

No canonical SPS record currently stores the Architect's:

- implementation boundaries;
- affected paths/services/contracts;
- focused proof intent.

The exact Implementer prompt receives the generated contract wholesale, so this is not merely a renderer omission.

The result is that the Implementer receives a generic plan instead of the bounded Architect execution contract required by WRB04.

#### Additional contract mismatch

`buildWorkItemExecutionContract()` currently includes only Criteria directly owned by the WorkItem.

WorkItem completion/Validator logic also enforces Criteria owned by the accepted BoundedSolution.

A WorkItem can therefore be implemented without seeing an accepted-solution obligation that later blocks completion.

#### Scope enforcement consequence

The source-backed exact runtime captures observed file-change paths for checkpoint attribution, but it does not compare those changed paths to any Architect-approved affected-path scope because that scope does not exist.

**Root ownership:** incomplete WRB04-06 product implementation plus an earlier contract-design miss.

### CRITICAL — solution-level Operator Criteria can be satisfied without the Criterion decision

Current Operator Criterion handling resolves disposition on the Criterion's owner:

- WorkItem-owned Criterion → WorkItem disposition;
- solution-owned Criterion → BoundedSolution disposition;
- Phase-owned Criterion → Phase disposition.

This is incorrect for a Criterion validation policy.

The accepted planning graph already creates a human Operator `planning-acceptance` Decision with outcome `accepted` and links it with `governs` to the accepted BoundedSolution.

Therefore a required solution-level `operator_decision` Criterion may read as **pass before any Criterion-specific Operator decision occurs**.

This is a direct false-positive completion path.

### HIGH — multiple Operator Criteria collapse into one owner-wide disposition

Because completion checks the owner rather than the Criterion, one accepted Decision on a WorkItem, BoundedSolution, or Phase can satisfy multiple unrelated `operator_decision` Criteria on that owner.

`getRequiredOperatorDecisions()` has the same owner-level model.

Criterion policy must be Criterion-specific.

### HIGH — Operator decisions are not freshness-bound to the current execution evidence

The application preflights the latest WorkItem implementation/Tester/source state before recording a WorkItem Operator decision.

But the persisted Decision governs the owner only.

It does not retain typed provenance to:

- the current Criterion;
- current ImplementationRecord;
- current TesterResult;
- current source candidate where applicable.

A later implementation attempt can therefore inherit an earlier owner-level accepted disposition.

Phase Operator decisions have the same problem at aggregate scope.

### HIGH — human visual evidence cannot report failure or inconclusive evidence

`recordWorkItemVisualCriterion()` always records:

`outcome: "pass"`

`recordPhaseVisualCriterion()` also always records:

`outcome: "pass"`

The shared Workspace collects only a summary.

This means the Operator cannot truthfully record:

- failed visual validation;
- inconclusive visual validation.

For WorkItem/solution Criteria, a visual failure therefore cannot feed the existing canonical Repair path.

For Phase Criteria, a visual failure cannot be represented at all.

### HIGH — renderer supplies derived authority fields that the application should own

The accepted WRB04-04 API boundary states that the renderer must not author source revision, principal identity, Repair ownership, or completion eligibility.

The new WorkItem human-action APIs currently accept from the renderer:

- `implementationRecordId`;
- `sourceRevisionId`.

Phase visual action accepts:

- `sourceRevisionId`.

The application revalidates these values, so this is not an arbitrary-write vulnerability, but it is the wrong authority boundary.

The main process should derive the current implementation/Tester/source candidate and treat renderer IDs/versions only as bounded target/concurrency identity where actually required.

### CRITICAL — source-neutral deterministic Phase validation manufactures a pass

`validateDeterministicPhaseCriterion()` handles source-neutral Workflows by checking member WorkItem completion eligibility.

If the member WorkItems have no blockers, it records a deterministic Phase Validation with outcome `pass`.

That does not prove the Phase Criterion.

It proves only that the member WorkItems satisfied their own obligations.

A deterministic Phase Criterion may express an aggregate property not implied by WorkItem closure.

This is a false-positive validation path.

The existing source-neutral WorkItem deterministic Validator correctly refuses to fabricate repository proof; Phase validation must be at least as conservative.

### HIGH — semantic Phase validation is under-scoped to one member implementation

The semantic Phase Validator searches Phase members until it finds one successful ImplementationRecord + TesterResult pair.

It then calls the WorkItem semantic-review helper using:

- `workItemId = phaseId`;
- the Phase title;
- one member's ImplementationRecord;
- one member's TesterResult;
- member WorkItem states as text.

An aggregate Phase Criterion is therefore judged using one selected implementation/tester as the principal semantic evidence.

A multi-WorkItem Phase can pass without the Validator receiving all current member implementation/tester evidence.

### HIGH — failed Phase validation has no canonical path back into execution

WorkItem validation failures can create a canonical same-Workflow Repair WorkItem.

Phase deterministic/semantic/visual validation can produce a failed Criterion, but there is no typed Phase-failure → Repair transition.

The Phase remains blocked with no canonical correction WorkItem.

The relationship registry intentionally limits `repairs` to WorkItem → WorkItem, so Phase repair must be represented as a new same-Phase Repair/Fix WorkItem with explicit failure provenance rather than weakening the relationship rule.

### HIGH — WorkItem-owned deferred visual Criteria cannot actually complete at the Phase boundary

A phased Workflow may currently contain `deferred_visual_phase` Criteria owned by:

- a Phase;
- a WorkItem;
- the accepted solution.

Phase projection intentionally surfaces:

- WorkItem-owned deferred Criteria in that WorkItem's Phase;
- solution-owned deferred Criteria at the final Phase.

However `getCriterionValidationStatus()` recognizes deferred policy as Phase-consumable only when:

- the Criterion owner is a Phase; or
- the owner is a BoundedSolution whose Workflow has a Phase.

It does not resolve a WorkItem owner to its owning Phase.

So a WorkItem-owned deferred Criterion can:

1. appear in Phase validation;
2. receive human visual Validation;
3. still remain unsatisfied in canonical Phase completion.

The current qualification fixture uses Phase-owned deferred Criteria and therefore misses this path.

### HIGH — exact runtime input UI cannot answer free-text questions

`CodexPendingUserInputModel.questions[].options` may be empty.

The established legacy interaction panel renders:

- a `select` when options exist;
- a text input when options are absent.

The shared `WorkflowExecutionWorkspace` renders every Implementer and Tester question as a `select`.

A legitimate free-text model question therefore cannot be answered from the new shared Workspace.

The current renderer test checks only that source code contains response calls and labels; it does not render a free-text pending request.

### HIGH — shared UI reserializes exact execution that the backend intentionally made concurrent

The accepted WRB04-03R runtime supports concurrent exact Workflow/WorkItem execution.

`CodexRuntimeManager.acquireConcurrentExact()` allows multiple exact runs up to shared capacity.

But `WorkflowExecutionWorkspace` disables **Run Implementer** whenever:

`runtime.busy === true`.

`runtime.busy` is true whenever any exact run is active.

Therefore one running exact Workflow disables the start button in another independent exact Workflow even though the backend would accept it.

This reintroduces global serialization at the renderer layer.

### MEDIUM — MCP elicitation UI falls back to raw response JSON

The pending MCP elicitation contract already supplies bounded field metadata and options.

The shared Workspace renders those fields as text but asks the Operator to type a raw JSON response.

This is functional for a technically correct payload but does not reuse the bounded field presentation already established elsewhere.

This is not a separate architecture blocker, but it belongs with the runtime-interaction repair.

## Why the final qualification passed

The submitted proof is substantial but biased toward positive paths.

It proves:

- one-phase policy success;
- successful human visual evidence;
- successful Operator decision;
- one-member semantic Phase evidence;
- source-neutral deterministic Phase member completion;
- option-based exact runtime input;
- static renderer source wiring;
- exact service reopen across many stages.

It does not prove the cases that expose the defects:

- accepted solution with `operator_decision` before a Criterion-specific Decision;
- two Operator Criteria on one owner;
- new implementation after a prior Operator decision;
- visual fail/inconclusive;
- multi-member semantic Phase evidence;
- source-neutral deterministic Phase Criterion with a statement not implied by member completion;
- WorkItem-owned deferred visual Criterion at Phase close;
- failed Phase Criterion → repair → revalidation;
- free-text pending model question;
- two simultaneous independent exact runs through the renderer;
- Architect WorkItem execution planning before Implementer;
- out-of-scope source path relative to the Architect execution contract.

The tests therefore validated implemented happy paths without proving the full authority/state matrix.

## Root Cause Analysis

### Primary root cause — execution UI was built from available services rather than from the complete WRB04 state/authority model

WRB04's domain model is state-driven, but product implementation was assembled incrementally from whichever service endpoints were already present.

That produced working controls for the obvious sequence while leaving important semantics implicit:

- Architect execution planning;
- Criterion-specific human authority;
- aggregate Phase evidence;
- Phase correction;
- runtime interaction variants;
- exact concurrency presentation.

### Secondary root cause 1 — generic owner disposition was reused for Criterion policy

The existing `getEffectiveDisposition(targetId)` primitive is appropriate for owner-level disposition.

`operator_decision` is a Criterion policy.

Using the owner as the target collapsed Criterion authority and accidentally inherited unrelated planning Decisions.

### Secondary root cause 2 — Phase validation reused WorkItem primitives without an aggregate evidence contract

Deterministic Phase validation used member completion as source-neutral proof.

Semantic Phase validation selected one member implementation/tester.

Neither operation had a canonical aggregate Phase evidence set.

### Secondary root cause 3 — the WorkItem execution contract remained an ephemeral adapter product

The contract builder was implemented before the user-facing Architect WorkItem-planning step.

The adapter continued to supply empty affected paths and generic proof intent instead of consuming durable Architect execution planning.

### Secondary root cause 4 — renderer interaction qualification checked wiring, not contract variants

Static source assertions proved that response APIs were called with exact IDs.

They did not prove:

- optionless/free-text questions;
- simultaneous exact runs;
- structured MCP elicitation;
- visual failure;
- rejected/stale human evidence.

### Qualification root cause — negative/freshness/aggregate scenarios were underrepresented

The final suite proves many successful transitions, but not the failure and freshness cases that determine whether authority remains correct after retries, repairs, and aggregate Phase work.

## Accepted implementation that Repair02 must preserve

Do not reopen without a demonstrated regression:

- exact Project/Workflow/WorkItem identity;
- lazy Workflow source materialization;
- exact source-backed/source-neutral Implementer runtime;
- implementation checkpoints;
- Tester determination/result/checkpoint architecture;
- exact Tester write boundary;
- deterministic/semantic WorkItem Validator mechanics;
- canonical WorkItem Repair loop;
- typed WorkItem completion;
- exact Workflow-owned Phase membership;
- Workflow execution completion;
- exact Workflow integration;
- linked-Dev Git common-directory handling;
- integration application attribution;
- integration validation synchronization;
- Integration Repair;
- Dev advancement and final Workflow closure;
- Feature/Issue shared execution Workspace dispatch;
- WIR target convergence;
- current restart/reopen evidence that is not contradicted by the findings above.

## Target state

WRB04 closes only when:

1. every executable WorkItem/Repair has a canonical Architect execution plan before Implementer start;
2. exact Implementer contract consumes that plan and every completion-relevant WorkItem/solution Criterion;
3. source-backed observed changes are bounded by the accepted affected-path scope;
4. Operator Criterion decisions govern the exact Criterion and are fresh for current execution evidence;
5. visual human evidence can pass, fail, or be inconclusive;
6. human action APIs derive current implementation/Tester/source identity in the application layer;
7. source-neutral deterministic Phase validation never manufactures proof;
8. semantic Phase validation receives the complete current member evidence set;
9. WorkItem-owned deferred visual evidence can actually satisfy its Phase boundary;
10. failed Phase Criteria create bounded same-Phase Repair work and return to validation;
11. free-text runtime questions are answerable;
12. exact UI concurrency matches backend exact-run concurrency;
13. final qualification proves negative/freshness/multi-member cases, not only happy-path completion.

## Repair disposition

Release one fresh WRB04 Repair02 bundle from `3d4399e563665afbd38426416d12a84989a51470`.

Repair01 created before this completed baseline is historical/non-authoritative and must not govern implementation.

Repair02 sequence:

1. **WRB04-R02-01 — Restore Architect WorkItem Execution-Contract Authority**
2. **WRB04-R02-02 — Correct Human Criterion Decision and Visual Evidence Semantics**
3. **WRB04-R02-03 — Correct Phase Validation, Deferred Evidence, and Phase Repair**
4. **WRB04-R02-04 — Correct Exact Runtime Interaction and Concurrency Presentation**
5. **WRB04-R02-05 — Requalify and Close WRB04**

Each Repair Card receives one report and one attributable checkpoint.

Do not split these cards further unless a material architecture contradiction is found.

## Disposition

WRB04 remains open.

The correct next action is WRB04-R02-01.

WRB05 remains unauthorized until R02-05 checkpoints and final Architect review accepts WRB04.
