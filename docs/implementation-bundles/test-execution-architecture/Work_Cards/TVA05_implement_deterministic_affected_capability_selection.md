# TVA05 — Implement Deterministic Affected-Capability Selection

**Order:** 5 of 9  
**Depends on:** TVA01–TVA04  
**Governing architecture:** `docs/architecture/CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/test-execution-architecture/Implementer_Reports/TVA05_IMPLEMENTER_REPORT.md`

## Objective

Use exact changed paths plus capability-map ownership to select the smallest complete deterministic proof set for a Work Item or integration candidate.

## Required Changes

1. Implement changed-path → capability matching from catalog `sourcePatterns`.
2. Accept exact changed repository-relative paths from:
   - a Work Item/checkpoint change set; or
   - exact source-control revision diff supplied by application code.
3. Include explicit Work Item capability scope when available; explicit scope may broaden but never weaken mechanically detected ownership.
4. Traverse capability dependencies according to the catalog's declared graph and validated direction.
5. Resolve behavior proof using preferred/primary proof metadata where available.
6. Select required fast and integration proof according to the ValidationProfile.
7. De-duplicate selected test files deterministically.
8. Return selection rationale per capability/behavior/test.
9. Unclassified changed production/test/tooling paths must fail visibly with actionable evidence.
10. Documentation-only or non-runtime changes may produce documentation/static-only plans when policy permits.
11. Add plan preview that accepts a fixture change set and produces stable machine-readable output.
12. Do not use Git shell commands inside the planner; revision diff mechanics belong to the source-control/application adapter.

## Capability Map Constraints

- Do not create hidden ownership outside the canonical catalog.
- If source patterns overlap, include all applicable capabilities unless a documented deterministic precedence rule already exists.
- If a capability has no adequate proof, fail planning rather than substituting full regression as a permanent fallback.

## Acceptance Criteria

1. Representative renderer-only change selects renderer-owned proof and excludes MCP soak/Desktop packaging proof.
2. Representative MCP session change selects MCP lifecycle/integration proof and excludes unrelated project-planning/packaging/performance proof unless profile requests it.
3. Shared source-control change selects the appropriate broader integration capabilities.
4. Unknown source path fails closed.
5. Identical changed paths/profile/catalog produce identical plan.
6. Dependency traversal cannot form an unchecked cycle.
7. No AI inference is required for selection.

## Validation

Use curated path-change fixtures covering:

- single capability;
- multiple capability;
- shared dependency;
- documentation-only;
- unknown/unmapped;
- explicit Work Item scope broadening.

Run catalog/planner tests and representative selected test execution.

## Implementer Report

Record matching/dependency algorithm, selection examples, failure behavior, files changed, tests/commands/results, and checkpoint commit.

## Post-Implementation

Checkpoint TVA05 only, then read TVA06.
