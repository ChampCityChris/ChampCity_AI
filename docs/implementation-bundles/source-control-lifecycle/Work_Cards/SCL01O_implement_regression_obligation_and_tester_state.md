# SCL01O — Implement Regression Obligation and Tester State

**Depends on:** SCL01N  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01O_IMPLEMENTER_REPORT.md`

## Objective

Implement the durable testing semantics required by the Tester/Test Lifecycle architecture without treating executable test files as state.

## Required Changes

1. Implement RegressionObligation entity and lifecycle.
2. Represent TestLifecycleAssessment as typed Validation.
3. Represent ImplementationProof as immutable Evidence tied to Work Item/ImplementationRecord/source baseline.
4. Represent PermanentTestReference as typed ProjectResource/source reference linked by `proves`.
5. Support one proof artifact satisfying multiple obligations and obligation supersession/retirement.
6. Keep ValidationCatalog/repository test files outside canonical state while linking them deterministically.

## Acceptance Criteria

Tester decisions/proof obligations remain queryable even when transient tests are deleted, without duplicating executable source.

## Validation

Tester-state mapping tests + work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01P.
