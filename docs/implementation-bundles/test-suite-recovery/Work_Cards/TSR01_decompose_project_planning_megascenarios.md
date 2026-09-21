# TSR01 — Decompose Project Planning Mega-Scenarios

**Type:** Work Card  
**Parent:** Test Suite Recovery  
**Evidence:** `TEST_SUITE_TIMING_AUDIT_2026-09-21.md`

## Confirmed Problem

`test/project-planning/project-planning-service.test.cjs` takes approximately **476 seconds** while all 28 tests pass.

The cost is concentrated in broad route/profile scenarios:

- routed Development binding / direct+phased behavior: ~127 s;
- phased subcase: ~128 s;
- shared direct/phased planning-kernel review: ~77 s;
- composition planning: ~44 s;
- Research closure: ~41 s;
- Infrastructure planning: ~40 s;
- Issue-route incompatibility: ~19 s.

Ordinary Project Planning tests are generally milliseconds.

## Objective

Preserve the unique Project Planning regression obligations while removing full historical workflow reconstruction that is not required to prove those obligations.

## Required Work

1. Inspect the slow scenarios and existing shared fixtures/proof owners.
2. Identify the durable invariant owned by each slow scenario.
3. Reuse existing permanent proof where an invariant is already protected.
4. Replace broad upstream lifecycle construction with the narrowest trustworthy prepared fixture/state.
5. Consolidate or retire duplicated scenario proof when equivalent behavior is already protected.
6. Keep genuinely distinct profile semantics for Development, Issue, Infrastructure, Research, and Composition.
7. Update ValidationCatalog metadata when test ownership, lane, duration, or file identity changes.

## Preserve

- direct vs phased Plan semantics;
- route/profile incompatibility rejection;
- reviewed Plan freshness/revision behavior;
- capability disposition requirements for Composition;
- Research closure semantics;
- Infrastructure operational-recovery requirements.

## Forbidden

- no production behavior changes solely to speed tests;
- no Session 2 Tester/determination-engine work;
- no unrelated Project Planning refactor;
- no full-suite execution;
- no replacement of behavioral proof with brittle source-text assertions.

## Acceptance

1. Unique durable Project Planning invariants remain deterministically proved.
2. Historical acceptance replay that provides no unique proof is removed or consolidated.
3. `test/project-planning/project-planning-service.test.cjs` or its replacement owners complete in **under 60 seconds total** on the supported workstation.
4. No single ordinary Project Planning scenario exceeds 30 seconds without explicit documented integration-sentinel justification.
5. Capability-map ownership remains complete and truthful.

## Focused Proof

Run only the affected Project Planning test owners and catalog/schema checks needed for changed metadata. Do not run `npm test`, `test:full`, or full-supported-platform.

## Implementer Report

Write:

`docs/implementation-bundles/test-suite-recovery/Implementer_Reports/TSR01_IMPLEMENTER_REPORT.md`

Report before/after scenario timings, tests removed/consolidated/rewritten, durable invariants preserved, and exact focused commands/results.
