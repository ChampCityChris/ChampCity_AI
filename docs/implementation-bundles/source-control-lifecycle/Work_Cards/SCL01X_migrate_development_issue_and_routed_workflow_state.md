# SCL01X — Migrate Development, Issue, and Routed Workflow State

**Depends on:** SCL01W  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01X_IMPLEMENTER_REPORT.md`

## Objective

Move remaining active engineering workflow state to ProjectStateService before canonical cutover.

## Required Changes

1. Migrate Development Phase/Work/Repair lifecycle, criteria, implementation records, validation and close eligibility.
2. Migrate Issue Resolution Finding/RCA/Solution/Fix/Repair/validation semantics out of issue Markdown state.
3. Migrate routed execution Work Items/decomposition/review/repair/completion state.
4. Use RegressionObligation/Validation/Evidence mappings where Tester semantics apply.
5. Preserve current renderer/IPC behavior through compatibility façades.
6. Remove direct authoritative filesystem scans from migrated workflow state calculations.

## Constraints

- Do not alter source-control mechanics owned by SCL02+.
- Do not add new human approval gates.

## Acceptance Criteria

All active V1 workflow families required for cutover can derive current state from ProjectStateService.

## Validation

Affected Development/Issue/routed workflow tests plus migration/work-item profiles; unrelated test debt is reported separately.

## Post-Implementation

Report + checkpoint; continue to SCL01Y.
