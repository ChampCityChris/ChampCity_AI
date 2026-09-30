# WRB04 Repair03 Architect Code Review and RCA — 2026-09-28

**Reviewed baseline:** `8a6a9ab065cb94d13d1f774cdfa8a62f6bc82b62`  
**Reviewed Repair03 checkpoints:**  
- R03-01 `353abd5ab46824b0542fd0f7b6f6c7591663af5c`
- R03-02 `02b0f495521a7f498e4b8b307c851305a3768566`
- R03-03 `c86db3307f11c63eca7d263f203c56c12098d8ae`
- R03-04 `8a6a9ab065cb94d13d1f774cdfa8a62f6bc82b62`

**Disposition:** Repair03 materially passes; WRB04 requires one final bounded Repair04 before acceptance.

## Executive finding

Repair03 successfully corrected the state-machine defects identified in the Repair02 review.

Accepted at this boundary:

- embedded Architect browser in the shared execution Workspace;
- bounded Architect WorkItem result import;
- exact WorkItem execution planning retained in SPS;
- source-scope violations classified as failed/blocked before successful attempt state can survive;
- bounded exact-checkout restore after rejected source scope;
- failed-attempt replanning/retry;
- exact checkpoint-chain revision resolver;
- cumulative solution Operator Decision semantics;
- source-backed Phase member evidence across sequential revisions;
- historical WorkItem/Phase close no longer revalidated against later final revisions;
- source-neutral generated WorkItem/Phase Repairs use semantic AI proof;
- source-backed generated Repairs select deterministic proof;
- free-text and bounded MCP interaction panels;
- removal of the global runtime busy gate.

The remaining defects are much smaller and center on **recovery from legitimate structured checkpoint uncertainty** and **preventing impossible source-neutral deterministic plans**.

Repair03 final qualification also correctly disclosed missing source-backed deterministic Phase/Repair composed proof. Those proofs belong in the final Repair04 qualification, not another architecture redesign.

## Code review findings

### CRITICAL — implementation checkpoint blocked/inspection states have no product recovery action

A source-backed Implementer may return a valid semantic `implemented` result and then fail to produce a committed structured checkpoint for reasons other than Architect path-scope violation.

Examples already modeled by `semanticCheckpointService`:

- source inventory unavailable;
- exact attributable path mismatch;
- pre-staged source requiring inspection;
- commit outcome uncertain;
- source advanced but may match durable checkpoint evidence.

Current sequence:

```text
Implementer result = implemented
→ ImplementationRecord persisted
→ WorkItem = validation_pending
→ SourceCheckpoint = blocked|inspection-required OR checkpoint operation fails
→ session = failed
```

That state has no usable Current Project action to reconcile/retry the checkpoint.

The semantic checkpoint service itself is explicitly retryable and can reconcile an uncertain commit from durable checkpoint identity.

But the shared Workflow application/IPC/preload/Workspace exposes no retry action.

After process restart:

- the WorkItem remains `validation_pending`;
- exact Implementer cannot restart because Implementer contracts require `planned|ready`;
- Tester cannot start because it requires a committed implementation checkpoint;
- no UI can retry the application-owned checkpoint.

This is a real workflow dead-end.

#### Additional misleading status

`getWorkflowWorkItemStatus()` reports `canRunAgain = true` for a failed in-memory session, even when the durable WorkItem is `validation_pending` and therefore cannot start a new Implementer attempt.

The durable recovery state and session retry state disagree.

### CRITICAL — Tester checkpoint blocked/inspection states also have no product recovery action

Tester permanent-proof changes use `checkpointStructuredTesterResult()`.

That service supports durable retry/reconciliation through the same semantic checkpoint machinery.

On failure:

- TesterResult already exists;
- TesterResult remains `checkpointState = pending`;
- SourceCheckpoint may be blocked/inspection-required;
- Tester session becomes failed.

A second Tester run is not a valid recovery path because `createTesterResult()` rejects a second TesterResult for the same ImplementationRecord.

No Current Project action exposes:

`retry exact TesterResult checkpoint`

Therefore a valid Tester proof change can also dead-end the WorkItem after a recoverable checkpoint uncertainty.

### HIGH — checkpoint retry evidence is not fully durable at the product boundary

TesterResult durably stores its exact permanent test path set, so Tester checkpoint retry can be reconstructed.

Implementation checkpoint retry is weaker.

The runtime has the exact App Server-attributed implementation path set in memory, but the attempt packet currently persists only:

- semantic result;
- contract digest;
- model/effort;
- timestamps.

It does not persist the attributed source path set needed to reissue the same structured checkpoint safely after process restart.

A retry API must not infer trusted attribution from arbitrary dirty files.

The exact attributable path set needs to be preserved in application-owned attempt evidence for source-backed attempts.

### HIGH — shared action helper can erase or misclassify returned runtime failures

R03-01 attempted to make returned exact-runtime refusal models visible.

Current `WorkflowExecutionWorkspace.act()` does:

1. inspect returned object for `state = unavailable|failed` or `failureReason`;
2. set an error;
3. if the result has `eventTail`, cast/store it as an **Implementer** model;
4. immediately call `refresh()`;
5. successful refresh clears `error`.

Problems:

- Tester refusal models also have `eventTail` and can be written into Implementer state;
- capacity/lease/preflight error can disappear during immediate refresh;
- a returned unavailable model is not retained as the exact operation result;
- the renderer tests do not exercise this composed path.

The UI no longer falsely sets the explicit success feedback before the branch, but it still fails the Repair03 requirement that the returned refusal itself remain visibly attributable.

### HIGH — source-neutral planning can still accept required deterministic Criteria with no proof provider

The current product intentionally has no application-owned source-neutral deterministic provider.

Both WorkItem and Phase deterministic Validators correctly refuse to fabricate repository proof.

Generated source-neutral Repairs now use `semantic_ai`, which fixes internal Repair dead-ends.

However normal Workflow planning still permits a source-neutral accepted graph containing a required:

`validationPolicy = deterministic`

at WorkItem, accepted-solution, or Phase ownership.

Such a Workflow can execute until Validator/Phase close and then become permanently blocked because:

- there is no repository source;
- there is no source-neutral deterministic provider;
- accepted Criterion policy has no typed correction path after canonical plan acceptance.

R02-03 explicitly required a planning/preflight guard for this case; it was not implemented.

#### Target behavior

When a Workflow is already known to be source-neutral and there is no registered source-neutral deterministic provider:

- canonical planning acceptance must reject required deterministic Criteria;
- decomposition/split operations must not introduce a required deterministic Criterion into that source-neutral Workflow;
- generated Repairs remain source-mode aware as implemented in R03-03.

Optional/informational deterministic Criteria do not gate completion and may remain if desired.

### MEDIUM — Repair03 final qualification left required source-backed proofs open

R03-04 explicitly reports these as unproven:

- actual source-backed deterministic Phase ValidationCatalog run against a managed checkout;
- source-backed generated WorkItem/Phase Repair through implementation checkpoint → Tester → deterministic Validator → Repair close → original revalidation;
- composed source-backed Feature path with forced WorkItem + Phase Repairs and integration;
- full returned capacity/lease presentation;
- complete restart/reopen matrix;
- repeated legacy fence audit;
- inspectable desktop visual smoke.

The report correctly did not infer a pass.

The first two are important because they exercise production paths affected by R03-02/R03-03. They must be closed before WRB04 acceptance.

The unavailable inspectable desktop window may remain a documented environment limitation if deterministic renderer/product proof passes and no code defect is found.

## Root Cause Analysis

### Primary root cause — retryable backend checkpoint semantics were never promoted to a Current Project application action

The structured checkpoint layer was designed to preserve blocked/inspection evidence and reconcile retries safely.

The exact Workflow UI/runtime treats checkpointing as an internal tail of the Implementer/Tester run.

When the run process ends, the application exposes the terminal failure but loses the user's path back into the existing retryable checkpoint service.

The backend contract and product state machine therefore diverged.

### Secondary root cause — transient runtime models were used as the only recovery presentation

Implementer/Tester session models represent in-process execution.

SourceCheckpoint and TesterResult are durable SPS state.

The shared Workspace still relies too heavily on the former for terminal checkpoint presentation, so process restart loses the actionable recovery affordance even though durable evidence exists.

### Secondary root cause — source-neutral validation policy compatibility was deferred until execution

The product knows whether the exact Workflow has source identity before accepting its planning graph.

But validation-policy compatibility is checked only when Validator runs.

That turns a planning error into a late execution dead-end.

### Qualification root cause — Repair03 focused tests covered repaired happy paths but not durable checkpoint failure/reconciliation

R03-01 tested Architect scope violation, which intentionally creates **no** SourceCheckpoint.

That is a different state from an existing blocked/inspection SourceCheckpoint.

R03-04 did not add a reconciliation vertical for implementation or Tester checkpoint uncertainty.

The renderer returned-model tests were likewise not added.

## Accepted Repair03 work that Repair04 must preserve

Do not reopen without a demonstrated regression:

- embedded Architect browser and bounded draft import;
- canonical WorkItem execution-plan SPS fields;
- typed decomposition;
- source-scope enforcement and scope-violation rollback;
- failed-attempt replanning;
- canonical source revision-chain resolver;
- cumulative solution Operator Decision model;
- source-backed historical WorkItem/Phase closure semantics;
- Phase aggregate evidence lineage;
- source-mode-aware generated Repair Criteria;
- semantic source-neutral Repair product path;
- bounded runtime interaction components;
- exact backend concurrency;
- exact Workflow integration.

## Repair disposition

Release one final WRB04 Repair04 bundle from:

`8a6a9ab065cb94d13d1f774cdfa8a62f6bc82b62`

Sequence:

1. **WRB04-R04-01 — Expose Durable Structured Checkpoint Recovery**
2. **WRB04-R04-02 — Fence Unsupported Source-Neutral Deterministic Plans and Correct Runtime Failure Presentation**
3. **WRB04-R04-03 — Final Source-Backed Qualification and WRB04 Closeout**

R04-03 is qualification only.

Execute R04-01 through R04-03 sequentially and stop after R04-03 for Architect review.

## Disposition

Repair03 is not yet final WRB04 acceptance.

WRB05 remains unauthorized.
