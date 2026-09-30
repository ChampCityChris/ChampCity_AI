# SCL01Y — Implement State-Provider Generation Fence and Atomic Cutover

**Depends on:** SCL01X  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01Y_IMPLEMENTER_REPORT.md`

## Objective

Switch one Project from legacy Markdown authority to Structured Project State exactly once without dual-write authority or late legacy writers.

## Required Changes

1. Implement durable provider-kind/generation state.
2. Acquire an application-level semantic writer/execution fence covering legacy state writers and in-flight callbacks.
3. Re-snapshot/re-verify freshness under the fence.
4. Atomically select Structured Project State as canonical provider and increment generation.
5. Reject stale old-generation writes after the switch.
6. Recover unknown cutover outcomes from durable provider-generation state.
7. Permit administrative rollback only under the governing migration rules.
8. Treat package execution authorization as approval to perform this deterministic cutover once every documented freshness, equivalence, backup, integrity and writer-fence gate passes. Do not request a second card-level Operator approval.

## Constraints

- UI disablement alone is not a writer fence.
- No dual-write authority.
- No cutover with unresolved blocking mismatches.
- If all deterministic gates pass, perform the cutover and continue; card completion is not an additional human approval checkpoint.

## Acceptance Criteria

After successful cutover exactly one provider accepts canonical writes; stale legacy writes fail deterministically.

## Validation

Race/fence/crash/unknown-outcome migration fixtures + migration lane.

## Post-Implementation

Report + checkpoint; continue to SCL01Z.
