# TSR05 — Disposition the Deleted Git Mutation Monolith

**Type:** Work Card  
**Parent:** Test Suite Recovery

## Confirmed State

`test/agent-harness/git-mutation-boundary.test.cjs` is currently deleted in the working tree.

Earlier TVA evidence established the old monolithic file as pathological and repeatedly avoided running it wholesale. The current recovery must not restore that file simply because it historically contained broad Git/source-control proof.

## Objective

Determine which unique durable regression obligations formerly lived only in the monolith, prove those obligations in the narrowest existing or replacement owners, and leave the monolithic file retired if its unique obligations are fully preserved elsewhere.

## Required Work

1. Inspect the deleted file from repository history/diff without restoring it wholesale as the implementation strategy.
2. Inventory each materially unique behavior it protected.
3. Map every still-current obligation to existing decomposed owners where available.
4. For any uncovered current invariant, add or extend the smallest appropriate permanent owner.
5. Remove obsolete Work Card acceptance/history-only assertions.
6. Reconcile ValidationCatalog references so no deleted test path remains required.
7. Document which historical cases were retired as redundant or superseded.

## Preserve

Current source-control safety obligations, including as applicable:

- bounded mutation containment;
- exact branch/ref ownership;
- divergence rejection;
- remote deletion safety;
- push/fast-forward safety;
- tag safety;
- workspace/repository access constraints;
- source checkpoint semantics still owned by current architecture.

## Forbidden

- do not recreate the old 1,000+ line aggregate;
- do not create another single replacement monolith;
- do not weaken Git/source-control safety;
- do not implement Session 2 Tester lifecycle machinery.

## Acceptance

1. The deleted monolith remains deleted unless Architect review finds a unique reason to restore a narrowly reduced owner.
2. Every current unique source-control invariant has an explicit permanent proof owner.
3. ValidationCatalog contains no stale reference to the deleted aggregate.
4. Focused source-control owners complete within their applicable lane budgets.

## Focused Proof

Run only the mapped source-control owners and catalog/schema checks required to establish coverage. No full suite.

## Implementer Report

Write `docs/implementation-bundles/test-suite-recovery/Implementer_Reports/TSR05_IMPLEMENTER_REPORT.md` with a behavior-to-owner disposition table.
