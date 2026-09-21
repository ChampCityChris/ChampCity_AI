# TSR11 — Rebaseline and Qualify the Recovered Suite

**Type:** Work Card  
**Parent:** Test Suite Recovery  
**Depends on:** TSR01–TSR10

## Objective

Measure the recovered permanent suite end to end and establish the new operational baseline before normal V2 development resumes.

## Required Work

1. Correct the local timing-audit wrapper's exit-code/status capture if still needed; do not alter its wall-clock methodology.
2. Run a fresh serial per-file timing audit so intrinsic file costs are comparable with the September 21 baseline.
3. Run representative resource-aware ValidationProfiles through the production planner/executor.
4. Record file, lane, capability, and scheduler wall-clock metrics.
5. Compare before/after cost concentration.
6. Confirm no current permanent test has an unresolved ownership/classification gap.
7. Record any intentionally expensive performance/soak/platform evidence separately from ordinary development cost.

## Recovery Acceptance Targets

Unless a concrete environment blocker is documented:

- ordinary functional test files: **<60 s each**;
- any retained wider integration sentinel: explicitly justified and inside its governing integration budget;
- serial per-file corpus audit: **target <=15 minutes**;
- `implementation-fast`: within adopted fast-lane budget;
- representative affected-capability validation: within adopted <60 s ordinary target where applicable;
- representative `integration-gate`: target <3 minutes and below the 5-minute review threshold;
- no unresolved current-contract failures in the permanent supported-platform corpus;
- resource-aware scheduling demonstrates real overlap for independently owned work.

Performance/soak and platform-specific evidence must be reported honestly and is not forced under ordinary developer budgets.

## Required Report

Create:

`docs/implementation-bundles/test-suite-recovery/TEST_SUITE_RECOVERY_FINAL_REPORT.md`

Include:

- before/after total serial timing;
- top 20 before/after;
- file-count distribution by duration bucket;
- suite failures before/after;
- tests retired/consolidated/rewritten;
- final resource-class counts;
- representative profile wall times;
- remaining known debt, if any;
- whether normal development can resume without the legacy test-suite quarantine.

## Validation

This is the only recovery card expected to run broad qualification.

Use the production validation architecture after focused recovery has passed. Do not hide failures or convert unresolved defects into skips merely to meet the time target.

## Completion

Stop for Architect review of the recovery result. Session 2 Tester/Test Lifecycle implementation remains a separate future initiative.
