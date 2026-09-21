# TVA08 — Audit Source-Proxy/Redundant Proof and Quarantine Environment-Sensitive Tests

**Order:** 9 of 10  
**Depends on:** TVA01–TVA07  
**Governing architecture:** `docs/architecture/CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/test-execution-architecture/Implementer_Reports/TVA08_IMPLEMENTER_REPORT.md`

## Objective

Reduce maintenance noise and invalid failures after lane execution is stable by reconciling source-inspection, redundant, and environment-sensitive proof using the existing capability-map dispositions.

This card is not a test-count reduction exercise.

## Required Changes

1. Inventory every capability-map record with:
   - `sourceInspectionClassification` other than `none`;
   - V2 disposition `rewrite`, `consolidate`, `quarantine`, or `retire`;
   - `environment-bound` or `timing-sensitive` proof characteristics.
2. For source-text/proxy tests:
   - preserve legitimate static structural invariants;
   - replace implementation-coupled source-string assertions with behavioral/rendered/static-analysis proof where practical;
   - document exceptions.
3. Consolidate duplicate tests only when the retained preferred proof covers the same behavior/risk.
4. Retire only behavior explicitly superseded by adopted V2 architecture or genuinely redundant proof.
5. Quarantine environment-sensitive proof into its correct explicit lane/profile with reason and ownership; quarantine is not a pass.
6. Platform tests must declare the supported platform and skip clearly elsewhere.
7. Update capability-map behavior/preferred proof/disposition fields truthfully.
8. Do not rewrite product implementation merely to satisfy obsolete source-shape assertions.

## Negative Constraints

- No blanket deletion of source-inspection tests.
- No test-count target.
- No retirement without replacement/supersession evidence.
- No hiding flaky failures in an unexecuted directory.
- No removal of packaging, Desktop, integration, security, containment, or recovery proof merely because it is expensive.

## Acceptance Criteria

1. Every non-`none` source-inspection record has an explicit current disposition.
2. Every quarantined executable remains reachable through a named lane/profile.
3. Redundant proof removed has a documented retained proof mapping.
4. Capability-map exact executable coverage remains valid.
5. Ordinary fast/affected lanes contain materially less implementation-coupled proxy proof where behavioral proof exists.
6. No adopted behavior loses its only regression proof.

## Validation

- capability-map validator;
- affected rewritten/consolidated tests;
- explicit quarantine lane preview/execution;
- one full-regression profile after all dispositions are complete.

## Implementer Report

Include a disposition table for every touched/retired/moved test, replacement proof, reason, commands/results, resulting capability-map changes,.

## Post-Implementation

After implementation, validation, and report completion, read TVA09. Do not pause for source-control mechanics.
