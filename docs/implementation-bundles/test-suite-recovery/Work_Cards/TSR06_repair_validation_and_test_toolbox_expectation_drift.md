# TSR06 — Repair Validation and Test-Toolbox Expectation Drift

**Type:** Repair Work Card  
**Parent:** Test Suite Recovery  
**Related implementation:** TVA10 bounded `test_toolbox` execution capabilities

## Failed Evidence

The timing audit reports current failures in:

- `test/agent-harness/reserved-toolbox-namespace.test.cjs`;
- `test/validation/validation-runner.test.cjs`;
- `test/validation/capability-map.test.cjs`;
- `test/agent-harness/integration-profile-gate.test.cjs`.

Confirmed reserved-namespace failures are stale expectations: they still assert `test_toolbox` is an unimplemented status-only placeholder even though TVA10 intentionally implemented five execution actions.

The remaining validation failures must be classified against current TVA10/planner/executor behavior before any repair.

## Objective

Align validation infrastructure proof with the current implemented toolbox/validation contracts and repair any actual validation defect discovered during classification.

## Required Work

1. Inspect TVA10 implementation/report and each failing assertion.
2. Classify each failure as stale test expectation or implementation defect.
3. Update stale namespace/catalog/runner expectations to the current contract.
4. Repair production validation code only where a real contract defect exists.
5. Preserve fail-closed catalog/profile semantics and bounded toolbox execution.
6. Do not broaden this card into lifecycle-test optimization or scheduler redesign.

## Acceptance

1. The four named validation/test-toolbox owners pass focused execution.
2. Tests assert the current implemented `test_toolbox` actions, not the old placeholder contract.
3. ValidationCatalog schema/ownership remains complete.
4. No production behavior is changed merely to satisfy a stale assertion.
5. No full-suite execution is required.

## Focused Proof

Run only the four named owners plus exact static/schema checks required by changed validation code.

## Repair Implementer Report

Write `docs/implementation-bundles/test-suite-recovery/Implementer_Reports/TSR06_IMPLEMENTER_REPORT.md` and list each failure with its classification and correction.
