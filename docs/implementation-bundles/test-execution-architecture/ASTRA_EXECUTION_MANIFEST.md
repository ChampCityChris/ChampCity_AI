# Test Execution Architecture — Astra Execution Manifest

## Purpose

Implement the repository's adopted validation-lane architecture as real deterministic execution infrastructure, eliminating the current monolithic serial full-suite integration bottleneck without weakening regression evidence.

## Execution Context Rule

Astra implements against the repository context supplied by ChampCity for the run.

Source-control topology is **not an Implementer concern** for this bundle.

Astra must not perform or reason about repository-placement mechanics as a prerequisite to implementation.

The current repository contents and the governing documents named by this bundle are the implementation source of truth for the run. ChampCity/Operator-owned infrastructure handles all repository placement and concurrent integration mechanics outside Astra's implementation task.

Astra must not treat concurrent unrelated repository activity as a blocker merely because another body of work is being developed at the same time. Stop only when the actual files required by the current card are materially inconsistent, concurrently changed in a way that makes the card unsafe to implement, or otherwise satisfy a real stop condition below.

Historical references to provider-specific source-control mechanics in the RCA/architecture describe the defect or lower-level implementation. They are not instructions for Astra to manage repository topology.

## Before Starting

Verify only:

1. selected Repository is `ChampCity_AI`;
2. all nine TVA Work Cards exist;
3. the architecture, governance standard, and RCA are readable and materially consistent with current source;
4. `validation/capability-map.json` exists and its current validator passes before schema changes;
5. current integration policy still uses the legacy full-regression validation path unless a prior TVA card has intentionally changed it.

Do not verify, enforce, or reason about source-control topology.

Stop on a material product/source contradiction, not on provider bookkeeping.

## Context Rule

At initialization read only:

1. this manifest;
2. `CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`;
3. `TEST_ARCHITECTURE_AND_VALIDATION_GOVERNANCE_STANDARD.md`;
4. `CODE_REVIEW_AND_RCA.md`;
5. `WORK_CARD_PLAN.md`;
6. `BUNDLE_INDEX.md`;
7. TVA01.

After each card is implemented, validated, and reported, read the next card and only the relevant dependency reports.

## Sequential Execution

Execute:

`TVA01 → TVA02 → TVA03 → TVA04 → TVA05 → TVA06 → TVA07 → TVA08 → TVA09`

For each card:

1. verify the dependency implementation/reports;
2. inspect current capability-map ownership before changing tests;
3. implement only the card;
4. run the focused proof named by the card;
5. write the Implementer Report;
6. continue automatically to the next card unless a real blocker or Operator-owned product/architecture decision is required.

Do not pause between cards for source-control operations or source-control confirmation.

## Preservation Rule

This bundle optimizes **selection and execution architecture**, not test count.

Do not delete, skip, or quarantine proof merely because it is slow.

A test may leave an ordinary lane only when its destination lane/profile remains explicit and mechanically executable.

## Source-Control Boundary

Astra owns source edits, test execution, implementation reasoning, and the Implementer Reports.

Astra does **not** own repository placement or integration mechanics.

Do not run source-control commands during this bundle except inside disposable test fixtures whose purpose is to test source-control behavior. Fixture source-control operations must remain contained inside the fixture repository and must never target the live `ChampCity_AI` repository.

## Test Rule

Prefer reuse and relocation before adding new permanent proof.

When a new test is required, identify the previously uncovered behavior/failure mode. Do not add tests solely to prove that scripts contain exact strings when behavioral execution proof is practical.

## Performance Rule

Measure before and after relevant cards. Do not claim performance improvement from timeout values.

TVA09 owns final measured acceptance against the architecture budgets.

## Stop Conditions

Stop only for:

- capability-map/catalog inconsistency that prevents truthful selection;
- test selection that would silently omit unclassified changed source;
- inability to preserve an expensive test in an explicit destination lane;
- parallelization that introduces nondeterminism;
- stale built-output risk that cannot be mechanically controlled;
- integration gate change before replacement proof exists;
- materially conflicting concurrent edits to files required by the current card;
- provider/platform behavior requiring a material architecture decision.

Do **not** stop because of source-control topology or the existence of other concurrent development.

## Completion

After TVA09 passes and its Implementer Report is complete, return the bundle for Architect review.

Do not release or publish as part of this bundle. Source-control integration into `dev` is handled outside Astra's implementation contract.
