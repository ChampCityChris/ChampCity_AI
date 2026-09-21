# TVA01 — Make the Capability Map Executable and Establish Validation Profiles

**Order:** 1 of 9  
**Depends on:** current capability-map validator and adopted test-governance standard  
**Governing architecture:** `docs/architecture/CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`  
**RCA:** `docs/implementation-bundles/test-execution-architecture/CODE_REVIEW_AND_RCA.md`  
**Implementer Report:** `docs/implementation-bundles/test-execution-architecture/Implementer_Reports/TVA01_IMPLEMENTER_REPORT.md`

## Verified Evidence

- `validation/capability-map.json` already records every executable permanent test file and includes proposed lane, duration, platform, dependencies, behavior coverage, and V2 disposition.
- `test/validation/capability-map.test.cjs` proves exact coverage and schema integrity.
- Repository search finds no validation runner consuming `proposedValidationLane` or behavior coverage for execution selection.
- `scripts/` currently has no test-lane planner/runner infrastructure.
- Current package scripts still execute one serial glob.

Reverify these facts at implementation start.

## Objective

Turn the existing capability map from passive governance metadata into deterministic executable validation planning, without changing the current integration gate yet.

## Required Changes

1. Implement a repository-owned ValidationCatalog loader using `validation/capability-map.json`.
2. Implement a deterministic ValidationPlanner that can produce a plan for an explicit lane/profile from the catalog.
3. Add repository-owned ValidationProfile configuration for at least:
   - `implementation-fast`
   - `work-item`
   - `repair`
   - `integration-gate`
   - `phase-close`
   - `release-qualification`
   - `full-supported-platform`
4. A plan must contain exact selected test paths, lane, selection reason, platform requirement, build requirement, known/estimated duration, and capability/behavior ownership.
5. Add a ValidationExecutor foundation able to run an explicit list of test files through Node's test runner and return bounded structured results. Keep execution serial in this card; TVA04 owns concurrency.
6. Add a deterministic plan-preview command suitable for tests and future workflow/MCP use.
7. Validate that every selected test exists in the catalog and every executable permanent test remains represented.
8. Missing/invalid lane/profile/catalog data must fail visibly.
9. Do not switch package defaults or integration policy in this card.

## Architecture Constraints

- Do not duplicate a second hand-maintained list of all test files.
- Selection must derive from the capability map/profile.
- Do not use AI to select files.
- Do not read local archive/history to decide lane ownership.
- Preserve the existing map's exact coverage invariant.

## Primary Surfaces

- `validation/capability-map.json`
- `test/validation/capability-map.test.cjs`
- new bounded validation scripts/modules under `scripts/validation/` or equivalent
- `package.json` only if a non-default preview/internal command is required
- `docs/governance/TEST_ARCHITECTURE_AND_VALIDATION_GOVERNANCE_STANDARD.md`

## Acceptance Criteria

1. Planner can deterministically list the exact tests for every declared primary lane/profile.
2. Repeated planning for the same catalog/profile yields identical ordered output.
3. Invalid/unmapped test/catalog state fails closed.
4. Existing capability-map exact-coverage test remains green.
5. The executor can run a curated explicit test list and report bounded results.
6. No existing test has been deleted or omitted from the catalog.
7. Current integration policy remains unchanged.

## Validation

Minimum focused proof:

- current capability-map validator;
- new validation planner/executor tests;
- one representative explicit fast plan execution against already-built output if appropriate.

Run build/static proof required by the changed scripts/modules, but do not run the monolithic full suite merely because this card changes validation infrastructure.

## Implementer Report

Record catalog/profile schema, files changed, exact planning semantics, error behavior, tests reused/extended/new, command results, deviations/blockers, and checkpoint commit.

## Post-Implementation

Checkpoint TVA01 only, then read TVA02.
