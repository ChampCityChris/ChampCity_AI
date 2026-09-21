# TSR10 — Implement Resource-Aware Parallel Scheduler

**Type:** Work Card  
**Parent:** Test Suite Recovery  
**Depends on:** TSR09

## Confirmed Problem

The current scheduler executes deterministic safety cohorts sequentially and only parallelizes `parallel-safe` files, defaulting to concurrency 2.

Even unrelated resource-safe work waits behind complete cohort barriers.

## Objective

Schedule tests continuously according to bounded owned resources instead of serializing broad categories.

## Required Behavior

The scheduler must:

1. consume TSR09 resource metadata;
2. maintain bounded resource pools;
3. admit a test only when all required resources are available;
4. allow independent temp/Git/process tests to overlap safely;
5. keep Desktop, packaging, performance, and true shared-state exclusivity where required;
6. preserve deterministic selection and receipt ordering independent of completion order;
7. preserve timeout, child-tree cleanup, and owned-temp cleanup;
8. continue other admitted work after one file fails unless policy requires a hard stop.

Initial pool sizes must be repository-owned configuration with conservative defaults, not caller-controlled arbitrary concurrency.

## Required Resource Controls

At minimum support independent limits for:

- general CPU/test workers;
- child-process-heavy tests;
- isolated Git fixtures;
- loopback/network tests;
- Desktop/Electron;
- packaging;
- performance/soak;
- global-exclusive work.

A global-exclusive job must run only when incompatible resources are quiescent.

## Forbidden

- no unbounded Promise.all over the full corpus;
- no machine-wide cleanup;
- no caller-supplied arbitrary concurrency/resource bypass;
- no Session 2 lifecycle determination;
- no weakening of timeout or containment.

## Acceptance

1. Synthetic scheduler proof demonstrates safe overlap for compatible resource classes.
2. Incompatible resources never overlap.
3. Global-exclusive barriers are enforced without turning unrelated resources into one universal serial queue.
4. Result receipts remain deterministic and complete.
5. Focused benchmark shows materially better wall-clock execution than the current cohort scheduler on the same representative safe workload without flake/failure increase.
6. No full suite is required until TSR11.

## Focused Proof

Scheduler contracts, process cleanup fixtures, planner/executor focused tests, and one representative bounded benchmark.

## Implementer Report

Write `docs/implementation-bundles/test-suite-recovery/Implementer_Reports/TSR10_IMPLEMENTER_REPORT.md` with scheduling traces and before/after benchmark evidence.
