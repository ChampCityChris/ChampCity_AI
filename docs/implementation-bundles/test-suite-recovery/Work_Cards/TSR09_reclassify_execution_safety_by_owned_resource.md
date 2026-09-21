# TSR09 — Reclassify Execution Safety by Owned Resource

**Type:** Work Card  
**Parent:** Test Suite Recovery

## Confirmed Problem

TVA04 conservatively classified the corpus approximately as:

- 117 `exclusive-process`;
- 10 `exclusive-desktop`;
- 10 `parallel-safe`;
- 2 `exclusive-packaging`;
- 3 `exclusive-performance`.

This made process use effectively synonymous with serialization even when tests own isolated temp directories, repositories, ports, and child processes.

## Objective

Replace coarse safety classification with explicit resource requirements that allow safe concurrency without weakening isolation.

## Required Model

Introduce deterministic scheduling metadata sufficient to distinguish at least:

- pure/stateless;
- temp-filesystem isolated;
- isolated Git-fixture;
- bounded Node/child-process;
- loopback/network with dynamically owned endpoints;
- Electron/Desktop;
- packaging;
- performance/soak;
- real shared repository/global-state exclusive.

A test may require more than one resource class.

## Required Work

1. Extend the ValidationCatalog scheduling schema without changing test semantics.
2. Audit every permanent test file and assign explicit owned resources.
3. Treat uncertainty fail-closed, but do not classify process use alone as global exclusivity.
4. Confirm temporary repository ownership and fixed/global resource usage from actual source.
5. Preserve explicit exclusive Desktop, packaging, performance, and genuinely shared-state tests.
6. Produce corpus counts by new scheduling class/resource requirement.

## Forbidden

- no scheduler behavior change in this card;
- no test lifecycle/Tester engine;
- no broad test rewrite;
- no assumption that all Git tests are parallel-safe;
- no assumption that all process tests are exclusive.

## Acceptance

1. Every permanent test has complete scheduling/resource metadata.
2. Missing/unknown resource classification fails closed.
3. Isolated Git and child-process tests are distinguishable from true shared-state exclusivity.
4. The number of globally exclusive tests is evidence-derived rather than inherited from TVA04's conservative default.
5. Catalog/schema focused checks pass.

## Focused Proof

Catalog/schema/planner preview only. Do not run the full test corpus under new concurrency yet.

## Implementer Report

Write `docs/implementation-bundles/test-suite-recovery/Implementer_Reports/TSR09_IMPLEMENTER_REPORT.md` with before/after scheduling-class counts and rationale for every remaining global-exclusive category.
