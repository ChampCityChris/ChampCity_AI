# WRB04 Repair02 Architect Code Review and RCA — 2026-09-28

**Reviewed baseline:** `5585d0354fcc68a09ca2562731af6ee7668cc376`  
**Reviewed range:** `14e696693a84e497094ed7b66374507d50dcbff6..5585d0354fcc68a09ca2562731af6ee7668cc376`  
**Disposition:** Repair02 materially successful; WRB04 remains open for bounded Repair03.

## Executive finding

Repair02 corrected the majority of the post-WRB04-06 defects.

Accepted at this review boundary:

- canonical SPS WorkItem execution-plan fields;
- typed WorkItem execution-plan acceptance;
- exact Implementer contract consuming SPS planning rather than caller-supplied scope;
- accepted-solution Criteria included in the Implementer contract;
- source-path scope enforcement;
- Criterion-specific Operator Decision records;
- human visual pass/fail/inconclusive outcomes;
- renderer removal of implementation/source authority from human actions;
- source-neutral deterministic Phase validation no longer inventing pass evidence;
- aggregate semantic Phase input for all members in source-neutral proof;
- Phase Validation provenance links;
- deferred WorkItem visual consumption at Phase;
- typed Phase Repair;
- bounded free-text/select runtime interactions;
- structured MCP elicitation UI;
- removal of the global `runtime.busy` button gate;
- existing exact integration/runtime/recovery foundations.

The remaining failures are not another architecture redesign. They are four concrete state-machine seams exposed by composing Repair02 beyond its happy-path fixtures.

## Code review findings

### CRITICAL — out-of-scope source mutation leaves an implemented WorkItem that cannot be replanned or retried

R02-01 correctly checks App Server file-change events against the accepted Architect `affectedPaths`.

When an observed source path falls outside the accepted plan:

1. `attributionFailure` is recorded;
2. the exact model may still return semantic outcome `implemented`;
3. `persistAndFinishWorkflowAttempt()` runs **before** the attribution failure is dispositioned;
4. Project State records an `ImplementationRecord(outcome = implemented)`;
5. the WorkItem transitions to `validation_pending`;
6. source checkpoint is then blocked because attribution failed.

The source-backed test explicitly proves this current behavior by asserting the unsafe WorkItem's ImplementationRecord outcome is `implemented`.

That state has no forward path:

- exact Implementer only starts `planned|ready`;
- WorkItem planning acceptance only accepts `planned|ready`;
- WorkItem planning acceptance rejects any WorkItem with implementation history;
- the checkout remains dirty/uncheckpointed.

Therefore the Repair02 card's intended rule — broader legitimate source scope requires revised Architect planning before retry — cannot actually occur.

#### Root cause

This is partly an Architect Repair02 specification contradiction.

R02-01 simultaneously required:

- no WorkItem replanning after any ImplementationRecord; and
- replanning/retry when the implementation legitimately needs a broader path scope.

The implementation followed both locally and produced an impossible combined state.

#### Target behavior

A source-scope violation is not a successful implementation.

The application must preserve the attempt evidence while returning the WorkItem to a bounded replanning/inspection state and restoring the exact checkout to the pre-attempt revision under application-owned Git mechanics.

No unapproved source change may become a checkpoint.

### CRITICAL — cumulative solution Operator Decision write semantics can deadlock a multi-WorkItem Workflow

R02-02 correctly made Operator Decisions Criterion-specific.

However `recordCriterionOperatorDecision()` treats a solution-owned Criterion specially by requiring current implementation + TesterResult evidence for **every WorkItem in the Workflow** before the Decision can be recorded.

WorkItem completion also requires that solution Criterion.

For a dependency chain:

```text
WorkItem A implemented/tested
→ A cannot close until solution Operator Criterion is approved
→ downstream WorkItem B cannot execute until A closes
→ solution Operator Decision cannot be recorded until B is implemented/tested
```

The Workflow deadlocks.

Read-side code already uses a different rule:

- WorkItem projection checks the selected WorkItem's current TesterResult;
- WorkItem completion collects currently implemented/tested member evidence;
- Workflow completion expects the final current aggregate evidence set.

The write-side is therefore inconsistent with the read-side.

#### Correct semantic model

A solution-level Operator Criterion is cumulative:

- at WorkItem A boundary, the Decision may govern the solution Criterion using the current evidence set containing A;
- when B later produces current Tester evidence, the prior Decision becomes stale;
- the Operator may correct/reaffirm the same Criterion Decision with the expanded evidence set;
- final Workflow completion requires the Decision to match the complete current solution evidence set.

Future unimplemented WorkItems must not prevent the current eligible WorkItem from closing.

### CRITICAL — source-backed aggregate evidence incorrectly requires every TesterResult to equal the final source revision

Repair02 Phase and solution freshness helpers use the current Workflow source revision as an equality requirement for every member TesterResult.

That is correct for the latest member but wrong for sequential source-backed WorkItems.

Normal source-backed chronology is:

```text
WorkItem A implementation/tester → candidate R1
WorkItem A closes
WorkItem B implementation/tester → candidate R2
final Workflow candidate = R2
```

A's TesterResult remains legitimate evidence for A, but its `candidateRevisionId` is R1, not R2.

Current helpers therefore drop A from the aggregate evidence set after B advances source.

Affected paths include:

- `currentPhaseTesterIds()`;
- Project State Phase aggregate evidence resolution;
- Criterion Operator Decision preflight for aggregate evidence.

Consequences:

- source-backed multi-member semantic Phase validation cannot assemble all members;
- source-backed Phase human/Operator evidence can remain blocked/stale;
- final solution-level Operator Decision cannot represent the true cumulative evidence set.

Repair02's Phase tests are source-neutral, so this escaped qualification.

#### Correct semantic model

Each current WorkItem's latest TesterResult is valid when its candidate revision lies on the exact immutable Workflow checkpoint chain that leads to the current SourceBinding revision.

It does not need to equal the final revision.

The aggregate Phase/solution Validation or Decision itself remains bound to the final current source revision, so later source advancement still stales the aggregate result.

### CRITICAL — Workflow completion retroactively revalidates closed WorkItems and closed Phase Criteria against the final revision

`getWorkflowExecutionCompletionProjection()` iterates every closed WorkItem and calls:

`getWorkItemCompletionEligibility(..., finalCurrentSourceRevision)`

That retroactively evaluates each closed WorkItem's TesterResult and Validation against the Workflow's final revision.

Earlier WorkItems were correctly validated and closed at earlier candidate revisions.

After later WorkItems advance source, their evidence becomes stale relative to the final revision even though their typed close boundary remains valid historical execution state.

The same projection also iterates required Criteria owned by **every Phase** and evaluates them against the final Workflow source revision. A Phase that was correctly validated and closed at R1 can therefore become stale after a later Phase advances source to R2.

This can make a normal multi-WorkItem or multi-Phase source-backed Workflow impossible to complete.

#### Correct semantic model

Typed WorkItem and Phase close are authoritative historical boundaries.

Workflow completion then verifies:

- every WorkItem/Phase is canonically closed;
- no active child/Repair/dependency violation exists;
- each closed WorkItem's latest Implementation/Tester evidence remains on the exact Workflow checkpoint lineage;
- final aggregate solution/Workflow obligations are current at the final candidate.

It must not rerun closed WorkItem or closed Phase Criterion freshness against a later revision.

Solution-level Criteria remain final aggregate obligations and must be current at the final Workflow candidate.

### HIGH — source-neutral canonical Repair WorkItems are not executable through the product Validator

The WorkItem deterministic Validator correctly refuses to fabricate deterministic repository proof for source-neutral WorkItems.

But internally created Repair WorkItems can receive deterministic Repair Criteria:

- Tester `production-defect-suspected` with no parent Criterion → deterministic Repair Criterion;
- rejected Operator Criterion → deterministic Repair Criterion;
- Phase Repair → always deterministic Repair Criterion.

In a source-neutral Workflow, the Repair can be:

```text
planned
→ Architect planned
→ Implementer
→ Tester
→ validation_pending
→ deterministic Validator returns no source-neutral proof
→ Repair can never close
```

Current tests hide this by directly calling `ProjectStateService.recordValidation(... deterministic pass ...)` instead of using the production Validator.

That is not a valid product-path proof.

#### Target behavior

The generated Repair WorkItem's own internal Criterion must be executable in the Workflow's source mode.

The original failed Criterion remains authoritative and is revalidated after Repair.

A bounded default is:

- source-backed generated Repair Criterion → deterministic;
- source-neutral generated Repair Criterion → `semantic_ai`.

The Repair's internal Criterion proves the bounded corrective objective. The original failing parent/Phase Criterion is then revalidated under its original policy.

### HIGH — WorkItem planning did not restore the embedded Architect product path

R02-01 correctly created durable WorkItem execution planning, but the shared Workspace currently implements the Architect interaction as:

- generate a handoff string;
- copy it to the clipboard;
- make the Operator manually transfer the answer into three textareas.

Feature and Issue front halves already use the embedded Architect browser pattern:

`browserPanel={routedArchitectBrowserPanel}`

The execution Workspace does not accept/render that browser panel.

The WRB04 baseline explicitly called for salvaging Work Card Architect UX.

The current flow therefore restores the data model but not the intended product interaction.

#### Target behavior

The shared execution Workspace receives the same embedded Architect browser.

Normal WorkItem planning becomes:

- Prepare Architect Handoff;
- Copy Instructions;
- use embedded Architect browser;
- paste/import bounded structured Architect result;
- review;
- Accept execution plan or decompose.

The three manual fields may remain as a fallback/editor, but must not be the only normal path.

### HIGH — exact start failures can be returned as a model and then displayed as success

R02-04 correctly removed the global `runtime.busy` gate.

When exact runtime capacity is exhausted, or same-checkout lease acquisition fails, the execution service commonly **returns** an unavailable `CodexImplementerExecutionModel` with `failureReason`; it does not throw.

`WorkflowExecutionWorkspace.act()` ignores the returned model and unconditionally sets the supplied success message before refresh.

For **Run Implementer**, that message is:

`Implementer run started.`

A capacity or lease refusal can therefore briefly/incorrectly report success, and refresh may discard the failure model because no session was created.

Tester start has the same general action-result risk.

Repair02 tests prove:

- backend capacity error;
- removal of the button gate;

but not the composed renderer presentation of a returned unavailable model.

### MEDIUM — Repair02 final qualification remained fragmented

R02-05 accurately disclosed several missing composed proofs.

The code review confirms the important missing cases were exactly where the remaining defects lived:

- no source-backed multi-member Phase proof;
- no complete source-backed multi-WorkItem close → final Workflow completion proof;
- no out-of-scope path → replan/retry proof;
- no source-neutral Repair through the production Validator;
- no rendered capacity refusal proof;
- no embedded Architect execution-planning smoke.

The report was correct not to claim Architect acceptance.

## Root Cause Analysis

### Primary root cause — freshness semantics were defined as “equal current revision” rather than evidence lineage

Source-backed execution is cumulative.

Each WorkItem closes at a point on one Workflow checkpoint chain.

Repair02 aggregate evidence code treated the final SourceBinding revision as though every historical WorkItem's TesterResult must have been produced at that final revision.

That confuses:

- current aggregate candidate freshness; with
- historical member evidence provenance.

The correct invariant is lineage membership plus current-per-WorkItem attempt identity.

### Secondary root cause — current WorkItem and final solution evidence boundaries were conflated

Solution Criteria participate in WorkItem validation and final Workflow completion.

Operator Decision freshness therefore needs a cumulative evidence set that grows as WorkItems complete.

The write path instead required the eventual complete set immediately, causing dependency deadlock.

### Secondary root cause — source-scope failure was handled after successful attempt persistence

Scope enforcement was inserted at checkpoint attribution, after semantic attempt finalization had already marked the WorkItem implemented.

This made a policy failure look like a successful implementation plus failed checkpoint rather than a recoverable invalid attempt.

### Secondary root cause — generated Repair Criteria assumed repository-backed deterministic proof

Repair creation reused deterministic validation as a generic safe default.

That is invalid for source-neutral Workflows, where the production Validator intentionally has no deterministic repository proof.

### Product-path root cause — backend authority repair was completed before the corresponding UX/recovery loop

R02-01 restored canonical WorkItem planning state but stopped at clipboard/manual transfer.

R02-04 restored backend concurrency access but did not make returned refusal models first-class UI results.

### Qualification root cause — focused tests bypassed the failing product seams

Examples:

- source-neutral Repair tests directly injected Validation through Project State;
- source-backed Phase aggregate evidence was not tested with 2+ sequential source revisions;
- out-of-scope source test stopped after blocked checkpoint;
- concurrency qualification separated backend capacity from renderer behavior;
- Architect planning tests checked gating/fields rather than the embedded interaction.

## Accepted Repair02 work that Repair03 must preserve

Do not reopen without demonstrated regression:

- SPS WorkItem execution-plan fields and typed acceptance;
- exact contract consuming SPS plan;
- WorkItem + accepted-solution Criteria in contract;
- path-scope enforcement itself;
- typed decomposition;
- Criterion-specific Operator Decision entity/relationships;
- visual pass/fail/inconclusive;
- renderer removal of source/implementation authority from human actions;
- source-neutral deterministic Phase blocked behavior;
- Phase aggregate provenance relationship model;
- semantic Phase all-member payload shape;
- deferred WorkItem visual ownership resolution;
- typed Phase Repair representation;
- bounded interaction panels;
- free-text/select input support;
- structured MCP elicitation;
- exact runtime concurrent backend capacity;
- exact Workflow integration and closure mechanics.

## Repair disposition

Release one bounded WRB04 Repair03 bundle from:

`5585d0354fcc68a09ca2562731af6ee7668cc376`

Sequence:

1. **WRB04-R03-01 — Repair WorkItem Planning UX and Scope-Violation Recovery**
2. **WRB04-R03-02 — Correct Source-Backed Evidence Lineage and Completion**
3. **WRB04-R03-03 — Make Canonical Repairs Executable Across Source Modes**
4. **WRB04-R03-04 — Requalify and Close WRB04**

R03-04 is qualification only.

Do not split these further unless a material architecture contradiction is found.

## Disposition

Repair02 is **not accepted as final WRB04 closure**.

It remains the implementation baseline for Repair03.

WRB05 remains unauthorized.
