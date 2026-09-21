# TVA03 — Build Once and Establish Built-Output Freshness

**Order:** 4 of 10  
**Depends on:** TVA01–TVA02  
**Governing architecture:** `docs/architecture/CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/test-execution-architecture/Implementer_Reports/TVA03_IMPLEMENTER_REPORT.md`

## Broken Suite Quarantine

This card must use **minimal focused validation only**.

Do not run the legacy repository-wide aggregate, `npm test` while it still maps to that aggregate, `test:full`, `node --test "test/**/*.test.cjs"`, the complete supported-platform/full-regression profile, or an entire known-pathological test file when a narrower named subset can prove the owned behavior.

Use the smallest structural tests, named test cases, specific files, planner previews, and adapter-conformance subsets required by this card. Whole-repository qualification is post-bundle work.

## Confirmed Defect

Current validation can run TypeScript/build work redundantly:

- integration requires `typecheck` and then `build`;
- `build` itself starts with `tsc`;
- documented canonical validation then invokes `npm test`, which rebuilds again.

Built test commands also rely on the caller to know that `dist` matches source.

## Objective

Make one ValidationPlan own compilation/build freshness and reuse the resulting output across every selected built test in that plan.

## Required Changes

1. Extend ValidationPlanner/Executor with explicit static/build step ownership.
2. A profile requiring the production build must execute it at most once.
3. Do not run a redundant `tsc --noEmit` in the same plan when the production `tsc` build already provides equivalent TypeScript correctness.
4. A profile not requiring the full renderer/build may use a dedicated static/typecheck step where appropriate.
5. Built-test execution must be reachable only through:
   - the same ValidationRun that established the build; or
   - an explicit advanced/internal built command whose stale-output limitation is clearly bounded and never used as the canonical workflow entry.
6. Add a build/run receipt or equivalent in-memory/run-scoped identity sufficient to prove the tests are consuming the build from the current validation execution.
7. Do not add a full repository hashing pass that costs more than the build it protects unless evidence demonstrates necessity.
8. Preserve current production build outputs and packaging behavior.

## Primary Surfaces

- `package.json`
- `tsconfig.json`
- validation planner/executor from TVA01
- `docs/dev/VALIDATION_COMMAND_LANES.md`
- `docs/development/DEVELOPMENT_GUIDE.md`

TVA07 owns final public command migration; this card may add internal scripts required for build-once execution.

## Acceptance Criteria

1. One validation profile run never executes identical TypeScript compilation twice.
2. Selected built tests consume output from the current plan's build.
3. A stale built-only invocation cannot masquerade as the canonical work-item/integration validation path.
4. Build failure prevents tests that depend on the build.
5. Existing build/package semantics remain green.

## Validation

Focused validation runner tests plus:

- one successful build-once multi-lane plan;
- one injected/fixture build failure proving downstream tests do not execute;
- one stale/internal built command boundary test if such command remains public.

## Implementer Report

Record previous/new command graph, duplicate work removed, freshness mechanism, measured build counts, tests/commands/results,.

## Post-Implementation

After implementation, validation, and report completion, read TVA04. Do not pause for source-control mechanics.
