
## Additional Operator audit defects — Repair browser action placement and fresh source-backed Implement readiness

| ID | Severity | Defect | RCA status | Repair |
|---|---|---|---|---|
| WSF20-D37 | Medium | Repair Work Card Architect controls render above the embedded ChatGPT browser instead of below it, inconsistent with the recovered browser-action layout used by the other candidate workspaces. | Confirmed | WSF20-REPAIR15 |
| WSF20-D38 | Blocker | A fresh source-backed WorkItem with no prepared ImplementationAttempt is reported Unavailable before Run because status requires materialized SourceBinding/checkout objects even though source materialization is intentionally owned by Run. This blocks newly approved Repair WorkItems from Implement. | Confirmed | WSF20-REPAIR15 |

### RCA — D37

`WorkCardRepairShell` currently composes the right column as Repair Architect controls followed by the embedded browser. R14 Review & Validation and the other recovered browser-capable candidate workspaces use browser first, actions below.

### RCA — D38

For a new source-backed WorkItem with no durable prepared attempt, `getWorkflowWorkItemStatus()` falls through to `resolveWorkflowWorkItemContext(workspaceRoot, selector, false)`.

Inside that function, when `prepareSource=false`, the source-backed path only has read-status facts such as source state/current revision, but then still requires `sourceBinding` and `repositoryCheckout`. Those materialized objects are only produced by the Run path with source preparation enabled.

The result is `Source-backed Workflow checkout is not prepared and verified.` Status becomes Unavailable, the renderer sets `canExecute=false`, and the Operator cannot press Implement to invoke the Start path that would correctly prepare the checkout.

R13 is present in current dev and already contains the source-backed/no-mutation Tester exception. Do not reopen Tester production behavior unless its current regression proof fails.

## Additional Operator audit defects — Implement Start failure is swallowed and stranded source changes poison later Repair

| ID | Severity | Defect | RCA status | Repair |
|---|---|---|---|---|
| WSF20-D39 | Blocker | Work Card Implement discards the execution model returned by Start; a returned Unavailable/failed model is immediately overwritten by refresh, so the Operator sees an enabled Implement button that appears to do nothing. | Confirmed | WSF20-REPAIR16 |
| WSF20-D40 | Blocker | Mutation-required source-backed finalization relies on App Server file_change events for attribution. If the runtime changes an allowed file but emits no file_change event, ChampCity blocks checkpoint creation yet leaves the exact workflow checkout dirty. Later Repair/source preparation then fails on the dirty checkout. | Confirmed live | WSF20-REPAIR16 |
| WSF20-D41 | High | Existing stranded successful implementation evidence cannot be deterministically recovered when the runtime packet lacks sourceCheckpointAttempt attribution, even when the current dirty checkout can be proven to contain only approved WorkItem paths on the exact reserved revision. | Confirmed live | WSF20-REPAIR16 |

### Live evidence — D39/D40/D41

Current Greenfield workflow checkout:

`workflow-3500ba39-001e-4a09-82fd-23a1e4f5aa75`

is dirty with exactly:

`?? conformance/phase-1/work-card-01.txt`

The file contains:

`Greenfield_Test Phase 1 lifecycle proof 01`

The workflow branch itself is still at the original baseline commit `5e9ae23798f177efba1453bfc7cd39a77006376a`.

The only runtime attempt packet is the parent attempt:

`eeb23acd-d3c4-4417-825a-5658449345b3.json`

Its semantic result says the Implementer created only `conformance/phase-1/work-card-01.txt` and returned outcome `implemented`, but the packet has no `sourceCheckpointAttempt` block.

Therefore the prior run completed semantically, the exact source change remains on disk, but no implementation SourceCheckpoint/commit was created.

The current Repair screen shows a prepared attempt but no new runtime packet exists, proving the Repair Start is failing before a Codex thread/session is created.

### RCA — D39

`WorkCardImplementWorkspace.onRunCodex` calls `startWorkflowWorkItemCodexExecution(...)` through the generic `action()` helper. That helper ignores the returned `CodexImplementerExecutionModel` and then refreshes.

The execution service uses returned models, not only thrown errors, to report source-preparation/lease/preflight failures. Therefore a returned `state=unavailable` can be discarded. If a durable attempt was already prepared, the subsequent status refresh can return Ready again, visually producing a no-op.

### RCA — D40

For mutation-required source-backed runs, final attribution is accumulated primarily from App Server `file_change` events. The no-mutation R13 path performs a final Git working-tree reconciliation, but the mutation-required path does not.

If a valid allowed source change exists on disk but no `file_change` event was emitted, `source.attributablePaths` stays empty. Finalization records the semantic ImplementationRecord, sets checkpoint blocked (`No attributable source changes were reported`), and does not clean or checkpoint the actual dirty paths.

The managed workflow checkout therefore remains dirty and every later materialization/start fails the exact clean-checkout invariant.

### RCA — D41

Existing `retryImplementationCheckpoint()` expects the runtime packet to contain `sourceCheckpointAttempt.attributablePaths`. The live parent packet predates/falls outside that condition and has no such field, so the safe retry path cannot reconstruct the missing checkpoint.

A deterministic fallback is possible because Start verified the checkout was clean at attempt start, the attempt/result identities are durable, and current Git status can be compared against the exact approved WorkItem `affectedPaths` and reserved source revision.
