# TSR08 — Repair Issue Fix Card Validation-Guidance Expectation

**Type:** Repair Work Card  
**Parent:** Test Suite Recovery

## Failed Evidence

`test/issue-resolution/issue-fix-card-service.test.cjs` has one failed assertion in:

`Fix Card planning handoff applies shared validation scope guidance without disturbing controlled context`

The test rejects any text matching `Work Card|Development Phase|phase parentage`, but the adopted shared validation guidance now legitimately contains phrases such as `Ordinary Work Card proof` and `Phase close`.

The remaining 20 tests pass.

## Root Cause

The test's negative prose assertion is broader than the behavior it intended to protect. It now rejects valid shared validation guidance rather than detecting Issue-domain ownership leakage.

## Objective

Replace the stale phrase-level assertion with proof of the actual Issue Fix Card boundary.

## Required Work

1. Preserve the requirement that Issue Fix Card context does not inherit Development-only parentage/workflow identity.
2. Stop treating generic shared validation vocabulary as forbidden Issue content.
3. Prefer structured/contract assertions over broad phrase rejection.
4. Do not rewrite production guidance merely to satisfy the old regex.

## Acceptance

1. The named Fix Card scenario passes.
2. The test still detects actual Development workflow/parentage contamination.
3. Shared validation guidance may reference generic Work Card/Phase validation concepts where architecturally correct.
4. The full Issue Fix Card file remains otherwise unchanged unless directly required.

## Focused Proof

Run only `test/issue-resolution/issue-fix-card-service.test.cjs`.

## Repair Implementer Report

Write `docs/implementation-bundles/test-suite-recovery/Implementer_Reports/TSR08_IMPLEMENTER_REPORT.md`.
