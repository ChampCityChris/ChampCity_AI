# RCO04 — Provision Isolated RepositoryCheckouts for Concurrent Work Intake Execution

**Order:** 4 of 8  
**Depends on:** RCO01–RCO03 plus current Work Intake branch binding  
**Governing architecture:** `docs/architecture/CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/repository-checkout-orchestration/Implementer_Reports/RCO04_IMPLEMENTER_REPORT.md`

## Objective

Bind each source-changing Work Intake to a dedicated RepositoryCheckout in addition to its dedicated branch so independent Work Items can be active concurrently without sharing a writable checkout.

## Required Changes

1. Extend Work Intake execution binding to reference a `checkoutId`.
2. On source-changing execution activation:
   - verify the Intake branch/base;
   - provision or resume the Intake's managed RepositoryCheckout;
   - verify branch ↔ checkout ↔ Repository ownership;
   - persist/reference the checkout identity through the appropriate structured execution state.
3. Do not treat Project-global current branch/current checkout as durable Work Intake truth.
4. Preserve the primary checkout as integration/local foreground by default; normal Implementer activation must not switch it away from `dev`.
5. Multiple Work Intakes in one Repository must be able to have active checkouts simultaneously.
6. Resume must find the same managed checkout or fail visibly if its identity/state no longer matches.
7. Do not create a second checkout for the same active Work Item merely because a client reconnects.

## Preserved Behavior

- Existing Work Intake branch ownership and checkpoint lineage remain authoritative.
- Existing route/planning behavior is unchanged.
- No new approval layer.
- Current single-Intake flows continue to function.

## Primary Surface to Inspect

- `src/main/workIntake/workIntakeBranchService.ts`
- Work Intake shared contracts/persistence
- `src/main/planExecution/routedDevelopmentExecutionBinding.ts`
- generic execution services
- Source-Control/Repository checkout services from RCO01–RCO03

## Acceptance Criteria

1. Two fixture Work Intakes from the same `dev` baseline can activate concurrently and receive distinct branches and distinct checkout IDs.
2. Their source changes remain isolated.
3. The primary checkout remains on the integration target.
4. Reopening/resuming an Intake resolves its prior checkout rather than allocating another.
5. Checkout disappearance/ownership mismatch fails closed with actionable state.

## Validation

Minimum:

- `npm run typecheck`
- `npm run build`
- extend existing Work Intake/Git tests in `test/agent-harness/git-mutation-boundary.test.cjs`
- run relevant routed Development planning/execution tests

## Implementer Report

Record binding/persistence changes, concurrency proof, primary-checkout preservation, resume semantics, test categorization, commands/results, and checkpoint commit.

## Post-Implementation

Checkpoint RCO04 only, then read RCO05.
