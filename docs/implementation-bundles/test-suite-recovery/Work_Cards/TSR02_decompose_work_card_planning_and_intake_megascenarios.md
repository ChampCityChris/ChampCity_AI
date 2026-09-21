# TSR02 — Decompose Work Card Planning and Intake Mega-Scenarios

**Type:** Work Card  
**Parent:** Test Suite Recovery

## Confirmed Problem

`test/work-card-planning/work-card-planning-service.test.cjs` takes approximately **337 seconds**.

Three scenarios dominate:

- routed Work Items reuse Formal planning/report review: ~160 s;
- Work Item decomposition/topology correction: ~94 s;
- routed phased eligibility/lineage barriers: ~76 s.

`test/work-card-intake/work-card-intake-service.test.cjs` takes approximately **117 seconds**, dominated by direct/phased artifact-scope scenarios of roughly 56–60 seconds each.

Most ordinary tests in both files are sub-second.

## Objective

Preserve Work Card planning/intake invariants without reconstructing complete routed lifecycle history for every assertion.

## Required Work

1. Identify unique durable invariants in the slow scenarios.
2. Use prepared routed Plan/Work Item fixtures at the nearest valid boundary rather than replaying Project/route history unnecessarily.
3. Separate topology/lineage proof from Formal Work Card review/report lifecycle proof where they are distinct.
4. Reuse existing tests for already-owned behavior.
5. Consolidate or retire duplicated historical acceptance proof.
6. Keep the large-inventory projection performance contract if it protects the shared projection optimization; do not fold it into ordinary semantic cases.
7. Reconcile capability-map ownership/durations after changes.

## Preserve

- candidate eligibility;
- direct vs genuine-Phase artifact ownership;
- dependency/lineage barriers;
- Formal Work Card planning/review semantics;
- report-review return behavior;
- topology correction atomicity;
- no legacy Phase artifacts in direct topology.

## Acceptance

1. `work-card-planning-service.test.cjs` or its replacement owners complete in under 60 seconds total.
2. `work-card-intake-service.test.cjs` or its replacement owners complete in under 60 seconds total.
3. No removed scenario leaves a unique invariant without permanent proof.
4. The dedicated large-inventory projection proof remains isolated from ordinary semantics.
5. No production workflow changes are made solely for timing.

## Focused Proof

Run only affected Work Card Planning/Intake owners and required catalog/schema checks. No repository-wide suite/profile.

## Implementer Report

Write `docs/implementation-bundles/test-suite-recovery/Implementer_Reports/TSR02_IMPLEMENTER_REPORT.md` with before/after timings and explicit disposition of every removed or rewritten slow scenario.
