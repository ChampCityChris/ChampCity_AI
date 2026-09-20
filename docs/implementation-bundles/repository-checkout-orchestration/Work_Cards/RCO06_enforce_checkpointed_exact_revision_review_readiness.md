# RCO06 — Enforce Checkpointed Exact-Revision Review Readiness

**Order:** 6 of 8  
**Depends on:** RCO01–RCO05 and current source-checkpoint lifecycle  
**Governing architecture:** `docs/architecture/CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/repository-checkout-orchestration/Implementer_Reports/RCO06_IMPLEMENTER_REPORT.md`

## Failed Capability Evidence

HOTFIX20 was reported ready for Architect review while the named Git branch had not advanced and the implementation bytes were not visible from the primary checkout. The review system therefore had no exact durable implementation revision to inspect.

## Objective

Make source-changing Work Items review-ready only after ChampCity has checkpointed the complete attributable implementation/report into an exact commit on the bound Work Item branch.

## Required Changes

1. Define an application-owned review-ready source revision contract containing:
   - Repository;
   - Work Item;
   - branch;
   - checkoutId used for execution;
   - before checkpoint;
   - resulting checkpoint commit;
   - Implementer Report identity/hash.
2. Completion from the runtime is not sufficient to enter Architect/Validator review.
3. Reuse the existing machine-owned work-item checkpoint service to stage/commit the complete attributable change set from the assigned checkout.
4. A successful checkpoint must leave no attributable implementation bytes only as uncommitted state.
5. Record the exact commit as the implementation revision reviewed.
6. Architect/reviewer handoff must carry exact checkout/commit context.
7. If checkpointing is blocked or fails, keep the Work Item in implementation/source-control-blocked state and preserve the checkout for recovery.
8. Never delete/clean/stash source merely to force review-ready state.

## Preserved Behavior

- Checkpoint does not itself approve/validate implementation.
- Operator authority is unchanged.
- Existing report semantics remain compatible until structured result migration replaces them.
- Optional remote synchronization failure remains distinct from local checkpoint success where current policy allows.

## Primary Surface to Inspect

- `src/main/planExecution/workItemCheckpointService.ts`
- `src/main/planExecution/workItemCheckpointReceipt.ts`
- `src/main/planExecution/planExecutor.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- Work Card validation/review handoff services
- relevant shared lifecycle contracts

## Acceptance Criteria

1. A source-changing Work Item cannot be surfaced as review-ready while its changes are only uncommitted in a RepositoryCheckout.
2. Successful implementation + report + checkpoint produces one exact review revision.
3. Architect/reviewer inspection can resolve the exact implementation revision even if the primary checkout is on another branch.
4. Checkpoint failure preserves the dirty checkout and exposes an actionable blocker.
5. Review/validation does not accidentally read the primary checkout when the implementation revision belongs elsewhere.

## Validation

Minimum:

- `npm run typecheck`
- `npm run build`
- existing work-item checkpoint proof in `test/agent-harness/git-mutation-boundary.test.cjs`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- affected Work Card review/validation tests

## Implementer Report

Include the review-ready state transition, exact revision contract, failure preservation behavior, proof that uncommitted-only completion cannot enter review, commands/results, test categorization, and checkpoint commit.

## Post-Implementation

Checkpoint RCO06 only, then read RCO07.
