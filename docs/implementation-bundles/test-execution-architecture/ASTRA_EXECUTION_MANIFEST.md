# Test Execution Architecture — Astra Execution Manifest

## Purpose

Implement the repository's adopted validation-lane architecture as real deterministic execution infrastructure, eliminating the current monolithic serial full-suite integration bottleneck without weakening regression evidence.

## Before Starting

Verify:

1. selected Repository is `ChampCity_AI`;
2. the implementation source line/checkout is isolated from unrelated work;
3. all nine TVA Work Cards exist;
4. the architecture, governance standard, and RCA are readable and materially consistent with current source;
5. `validation/capability-map.json` exists and its current validator passes before schema changes;
6. current integration policy still uses the legacy full-regression npm-script gate unless a prior TVA card has intentionally changed it.

Stop on material mismatch rather than improvising a new validation model.

## Context Rule

At initialization read only:

1. this manifest;
2. `CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`;
3. `TEST_ARCHITECTURE_AND_VALIDATION_GOVERNANCE_STANDARD.md`;
4. `CODE_REVIEW_AND_RCA.md`;
5. `WORK_CARD_PLAN.md`;
6. `BUNDLE_INDEX.md`;
7. TVA01.

After each card passes and checkpoints, read the next card and only the relevant dependency reports.

## Sequential Execution

Execute:

`TVA01 → TVA02 → TVA03 → TVA04 → TVA05 → TVA06 → TVA07 → TVA08 → TVA09`

For each card:

1. verify the dependency implementation/reports;
2. inspect current capability-map ownership before changing tests;
3. implement only the card;
4. run the focused proof named by the card;
5. write the Implementer Report;
6. checkpoint exactly the card's attributable changes/report;
7. verify the checkpoint;
8. continue automatically unless a real blocker or Operator-owned decision is required.

## Preservation Rule

This bundle optimizes **selection and execution architecture**, not test count.

Do not delete, skip, or quarantine proof merely because it is slow.

A test may leave an ordinary lane only when its destination lane/profile remains explicit and mechanically executable.

## Source-Control Rule

One card = one checkpoint commit.

Do not merge the bundle source line into `dev`, tag, release, or publish during individual cards.

Tests that exercise Git/source-control behavior must use disposable fixture repositories/checkouts.

## Test Rule

Prefer reuse and relocation before adding new permanent proof.

When a new test is required, identify the previously uncovered behavior/failure mode. Do not add tests solely to prove that scripts contain exact strings when behavioral execution proof is practical.

## Performance Rule

Measure before and after relevant cards. Do not claim performance improvement from timeout values.

TVA09 owns final measured acceptance against the architecture budgets.

## Stop Conditions

Stop for:

- capability-map/catalog inconsistency;
- test selection that would silently omit unclassified changed source;
- inability to preserve an expensive test in an explicit destination lane;
- parallelization that introduces nondeterminism;
- stale built-output risk that cannot be mechanically controlled;
- integration gate change before replacement proof exists;
- provider/platform behavior requiring a material architecture decision.

## Completion

After TVA09 passes and checkpoints, return the bundle for Architect review and integration. Do not release as part of this bundle.
