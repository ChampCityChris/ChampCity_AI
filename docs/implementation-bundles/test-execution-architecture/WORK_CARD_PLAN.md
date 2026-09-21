# Test Execution Architecture — Work Card Plan

## Objective

Implement the adopted test execution and validation architecture so routine implementation and integration use fast, capability-mapped proof while expensive Desktop, packaging, performance/soak, and full-regression evidence remain available at the correct workflow boundaries.

## Governing Architecture and Evidence

1. `docs/architecture/CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`
2. `docs/governance/TEST_ARCHITECTURE_AND_VALIDATION_GOVERNANCE_STANDARD.md`
3. `docs/implementation-bundles/test-execution-architecture/CODE_REVIEW_AND_RCA.md`
4. `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`
5. `validation/capability-map.json`

## Card Sequence

1. **TVA01 — Make the Capability Map Executable and Establish Validation Profiles**
2. **TVA02 — Split Mixed-Lane Tests and Isolate Performance/Desktop Proof**
3. **TVA03 — Build Once and Establish Built-Output Freshness**
4. **TVA04 — Add Explicit Test Scheduling Safety and Bounded Parallelism**
5. **TVA05 — Implement Deterministic Affected-Capability Selection**
6. **TVA06 — Replace Integration Full Regression with the Candidate-Aware Integration Gate**
7. **TVA07 — Recompose Developer, Work Item, Phase, and Release Validation Commands**
8. **TVA08 — Audit Source-Proxy/Redundant Proof and Quarantine Environment-Sensitive Tests**
9. **TVA09 — Add Validation Telemetry, Performance Budgets, and End-to-End Acceptance**

## Dependency Shape

```text
TVA01
  ↓
TVA02
  ↓
TVA03
  ↓
TVA04
  ↓
TVA05
  ↓
TVA06
  ↓
TVA07
  ↓
TVA08
  ↓
TVA09
```

The sequence is intentionally conservative. TVA06 may not weaken the current integration gate until TVA01–TVA05 provide deterministic replacement selection and execution.

## Expected Outcome

After TVA09:

- ordinary edit/test feedback has a bounded fast command;
- ordinary Work Item validation uses affected capability proof;
- ordinary integration no longer executes the repository-wide full regression;
- performance/soak and Desktop/process evidence are explicit lanes;
- safe tests execute with bounded concurrency;
- builds are not duplicated within one validation plan;
- full regression remains available for phase/release evidence;
- validation selection and timing are machine-owned and inspectable.
