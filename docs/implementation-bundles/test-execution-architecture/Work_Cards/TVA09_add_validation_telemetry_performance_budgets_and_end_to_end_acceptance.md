# TVA09 — Add Validation Telemetry, Performance Budgets, and End-to-End Acceptance

**Order:** 9 of 9  
**Depends on:** TVA01–TVA08  
**Governing architecture:** `docs/architecture/CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/test-execution-architecture/Implementer_Reports/TVA09_IMPLEMENTER_REPORT.md`

## Objective

Prove the new validation architecture end to end, record machine-owned timing/selection evidence, and prevent the suite from silently regressing back into a 20+ minute routine integration gate.

## Required Changes

1. ValidationExecutor records bounded telemetry for each run:
   - profile;
   - exact source revision/context;
   - selected lanes/files/capabilities;
   - build duration;
   - total duration;
   - cohort/concurrency facts;
   - per-file duration where technically reliable;
   - pass/fail/skip counts;
   - slowest files;
   - bounded failure evidence.
2. Add deterministic reporting suitable for Implementer/Architect/integration receipts.
3. Refresh capability-map measured/estimated durations from actual supported-workstation evidence where practical.
4. Add budget evaluation using architecture targets:
   - static <30 s;
   - fast <30 s, temporary extraction ceiling 60 s;
   - ordinary affected <60 s;
   - ordinary integration gate target <3 min, review threshold 5 min.
5. A budget miss must be reported with the slowest contributing lane/files. Do not automatically skip proof to meet the budget.
6. Add end-to-end fixture acceptance for changed-path → plan → build once → scheduled test execution → receipt.
7. Add IntegrationCandidate acceptance proving:
   - ordinary bounded candidate uses integration-gate, not full regression;
   - performance/Desktop/packaging are excluded unless affected/policy-required;
   - all selected proof passes before target eligibility.
8. Run the explicit full supported-platform regression once and record lane-by-lane duration/composition.
9. Update architecture/corpus/development documentation to mark the new execution architecture implemented and retire the legacy monolithic command description.

## Required End-to-End Scenarios

At minimum:

1. **Renderer-only candidate**
   - bounded affected plan;
   - no MCP soak/Desktop packaging;
   - build occurs once.

2. **HOTFIX20-shaped MCP lifecycle candidate**
   - MCP/session affected proof selected;
   - functional lifecycle regression selected;
   - unrelated performance/soak excluded from ordinary gate;
   - integration eligibility only after passing receipt.

3. **Source-control/integration-policy candidate**
   - broader integration ownership selected;
   - target-owned policy safety remains intact.

4. **Unknown source path**
   - planning fails visibly rather than falling back to full suite.

5. **Explicit full profile**
   - all applicable supported-platform lanes run and report separately.

## Acceptance Criteria

1. Fast and affected lanes satisfy governance budgets or have a documented concrete blocker that remains in-scope; do not declare pass from timeout values.
2. Ordinary integration gate is below the 5-minute review threshold on the supported workstation and targets <3 minutes.
3. HOTFIX20-shaped integration no longer invokes full regression/performance/packaging/Desktop proof absent affected policy.
4. Full regression remains executable and green across applicable supported-platform lanes.
5. No executable test is absent from the capability catalog.
6. Validation receipts explain what ran and why.
7. No new flakiness is introduced by scheduling/parallelism.
8. The old `node --test --test-concurrency=1 "test/**/*.test.cjs"` path is no longer the routine integration/developer architecture.

## Validation

This is the bundle-wide acceptance card.

Run:

- catalog/planner/executor suites;
- representative fast/affected/integration/Desktop/performance lanes;
- explicit full supported-platform profile;
- IntegrationCandidate end-to-end profile proof;
- canonical static/build proof.

Record exact measured durations, not estimates.

## Implementer Report

Provide:

- before/after architecture comparison;
- measured lane/profile durations;
- slowest remaining proof;
- exact HOTFIX20-shaped integration plan and duration;
- full regression lane composition/duration;
- any remaining performance debt;
- tests reused/extended/consolidated/retired/new;
- exact commands/results;

## Completion

After TVA09 implementation, validation, and report completion, return the entire TVA bundle for Architect review. Do not tag, release, or perform repository integration.
