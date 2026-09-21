# TVA04 — Add Explicit Test Scheduling Safety and Bounded Parallelism

**Order:** 4 of 9  
**Depends on:** TVA01–TVA03  
**Governing architecture:** `docs/architecture/CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/test-execution-architecture/Implementer_Reports/TVA04_IMPLEMENTER_REPORT.md`

## Confirmed Defect

The only repository-wide built test command hard-codes `--test-concurrency=1`. This avoids concurrency hazards by serializing every test file, including independent deterministic files that can safely run together.

The capability map currently records dependency classes but does not explicitly encode scheduling exclusivity.

## Objective

Introduce explicit execution-safety metadata and a bounded scheduler that runs safe test files concurrently while keeping process/Desktop/performance/packaging proof exclusive.

## Required Changes

1. Extend the validation catalog schema with a deterministic execution-safety classification, for example:
   - `parallel-safe`
   - `exclusive-process`
   - `exclusive-desktop`
   - `exclusive-performance`
   - `exclusive-packaging`
2. Bump/validate the capability-map schema as required and update every executable test record.
3. Do not infer safety solely from directory names. Classify based on actual dependencies/global state.
4. ValidationExecutor must partition selected files into scheduling cohorts.
5. Execute `parallel-safe` files with bounded file-level concurrency.
6. Choose the initial supported-workstation concurrency from measured evidence. It must be configurable and conservative; do not assume maximum CPU count is safe.
7. Exclusive cohorts run serially and never overlap with another cohort that could invalidate their measurements/global state.
8. Preserve deterministic output ordering in receipts even when execution is concurrent.
9. Ensure failure of one file does not leave child processes or temporary resources running.
10. Do not yet change integration policy.

## Parallelization Safety Rules

Tests using only isolated temp roots, pure data, in-process deterministic services, or isolated fixture repositories may be eligible.

Tests that own real Electron, machine-global startup state, timing/performance measurements, package output, or unbounded external processes must not be marked parallel-safe without proof.

Git tests using truly isolated fixture repositories may be parallel-safe; tests touching the selected source repository are not valid fixtures.

## Acceptance Criteria

1. Catalog rejects an executable test missing scheduling classification.
2. A representative safe cohort demonstrably overlaps execution.
3. Exclusive process/Desktop/performance tests do not overlap.
4. Result ordering remains deterministic.
5. No test is skipped because it cannot run in parallel.
6. Repeated representative runs show no introduced flakiness.
7. Measured fast/integration lane wall-clock improves where safe files exist.

## Validation

Run:

- catalog/schema tests;
- scheduler unit/contract tests;
- repeated representative fast cohort;
- repeated exclusive process fixture proof;
- cleanup/failure injection.

Do not benchmark by reducing assertions or lowering waits that are themselves the contract.

## Implementer Report

Document classification vocabulary, file classifications changed, chosen concurrency ceiling and evidence, before/after representative timings, flake observations, commands/results,.

## Post-Implementation

After implementation, validation, and report completion, read TVA05. Do not pause for source-control mechanics.
