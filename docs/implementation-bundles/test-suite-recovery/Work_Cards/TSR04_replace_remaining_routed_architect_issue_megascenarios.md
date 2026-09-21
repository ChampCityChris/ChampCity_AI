# TSR04 — Replace Remaining Routed Architect/Issue Mega-Scenarios

**Type:** Work Card  
**Parent:** Test Suite Recovery

## Confirmed Problem

Additional files show the same fossilized acceptance pattern:

- `issue-architect-planning-service.test.cjs`: one routed defect/RCA/phased-correction/reroute scenario consumes ~67.5 s of a ~67.9 s file;
- `architect-output-workspace-repair.test.cjs`: one route-authority/reroute lineage scenario consumes ~63.2 s of a ~67.8 s file;
- `routed-integration-focus.test.cjs`: ~59.9 s for three routed integration cases.

The surrounding ordinary tests are fast.

## Objective

Keep the unique Architect/Issue/routing invariants while eliminating repeated complete lifecycle setup that exists only to reach those assertions.

## Required Work

1. Identify the unique invariant owned by each slow scenario.
2. Reuse or extend existing route-decision, Issue planning, lineage, or integration proof when equivalent.
3. Replace broad setup with the nearest stable fixture/boundary.
4. Consolidate duplicated reroute/lineage assertions.
5. Preserve explicit route authority and stale-evidence behavior.
6. Keep `routed-integration-focus` bounded to integration behavior; it must not become another general lifecycle acceptance file.

## Preserve

- Operator route decision authority;
- revision/reroute lineage semantics;
- Issue RCA/planning disposition behavior;
- stale evidence rejection;
- direct/phased routing differences;
- bounded clean/conflict integration semantics owned by the focus test.

## Acceptance

1. Each affected file/replacement owner completes in under 60 seconds.
2. No one local semantic assertion requires reconstructing an unrelated complete lifecycle.
3. No unique route/Issue invariant is lost.
4. Removed proof is explicitly identified as redundant, historical, or superseded.

## Focused Proof

Only the named owners/replacements and directly required route/Issue contract checks. No full suite.

## Implementer Report

Write `docs/implementation-bundles/test-suite-recovery/Implementer_Reports/TSR04_IMPLEMENTER_REPORT.md`.
