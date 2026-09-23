# SCL01V — Implement Equivalence and Shadow-Read Verification

**Depends on:** SCL01U  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01V_IMPLEMENTER_REPORT.md`

## Objective

Prove staged Structured Project State represents materially equivalent current workflow meaning before migrating consumers or authority.

## Required Changes

1. Render structured projections for imported workflows and compare semantic facts against the exact legacy snapshot.
2. Compare current stage, disposition, lineage, dependencies, validation state, open repairs, active Work Intakes and source bindings.
3. Classify mismatches as blocking/non-blocking with explicit evidence.
4. Add optional shadow-read comparison that never writes structured authority.
5. Bind verification result to exact snapshot + importer/schema versions.

## Acceptance Criteria

Cutover eligibility can be evaluated from a reproducible verification result; stale source invalidates that result.

## Validation

Equivalence/mismatch/staleness fixtures + migration lane.

## Post-Implementation

Report + checkpoint; continue to SCL01W.
