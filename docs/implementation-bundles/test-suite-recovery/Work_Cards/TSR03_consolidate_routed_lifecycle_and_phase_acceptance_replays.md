# TSR03 — Consolidate Routed Lifecycle and Phase Acceptance Replays

**Type:** Work Card  
**Parent:** Test Suite Recovery

## Confirmed Problem

Three permanent owners repeatedly reconstruct large routed lifecycles:

- `desktop-development-lifecycle.test.cjs`: **427.8 s**; two slow cases consume ~215 s and ~212 s;
- `routed-lifecycle-acceptance.test.cjs`: **218.9 s**; conflicted-target path ~218 s and thousands of bounded Git operations;
- `phase-validation-state.test.cjs`: **206.5 s**; two routed acceptance cases consume ~123 s and ~83 s while the other tests are fast.

These scenarios also currently fail late on lifecycle/Git cleanliness/checkpoint expectations.

## Objective

Replace repeated historical end-to-end Work Card stories with:

- narrow durable invariant tests; and
- at most the minimum genuinely necessary routed end-to-end sentinel(s).

## Required Work

1. Inventory the invariant asserted by every slow lifecycle case.
2. Compare those invariants against existing Work Card, Phase, checkpoint, IntegrationCandidate, and route tests.
3. Remove/consolidate duplicate lifecycle replay where the invariant is already protected.
4. Rewrite unique local invariants against prepared completed-state fixtures or narrower service boundaries.
5. Retain an end-to-end routed sentinel only when cross-component composition itself is the behavior under test.
6. If retained, explicitly classify that sentinel as wider integration evidence rather than routine affected-capability proof.
7. Resolve stale late-stage assertions only where the behavior remains a current contract; do not preserve obsolete expectations merely because the test is old.

## Preserve

- sequential Repair lineage;
- stale validation rejection;
- durable Work Item close before successor eligibility;
- genuine Phase acceptance barriers;
- explicit Plan acceptance;
- lifecycle checkpoint/source-control cleanliness where still architecturally required;
- Integration Repair composition if it remains uniquely covered here.

## Acceptance

1. Routine functional lifecycle owners complete in under 60 seconds each.
2. Any retained broad integration sentinel has explicit unique composition ownership and remains within the adopted integration budget.
3. The current late failures are either repaired as current-contract regressions or removed as stale/redundant expectations with evidence.
4. No more than the minimum necessary end-to-end routed lifecycle sentinels remain.
5. No full-suite execution is used as this card's gate.

## Focused Proof

Run the three named owners or their replacements plus only directly affected checkpoint/Phase owners needed to prove preservation.

## Implementer Report

Write `docs/implementation-bundles/test-suite-recovery/Implementer_Reports/TSR03_IMPLEMENTER_REPORT.md`.
