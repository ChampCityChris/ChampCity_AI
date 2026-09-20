# RCO05 — Bind Implementer Runtime Execution to the Assigned RepositoryCheckout

**Order:** 5 of 8  
**Depends on:** RCO01–RCO04  
**Governing architecture:** `docs/architecture/CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/repository-checkout-orchestration/Implementer_Reports/RCO05_IMPLEMENTER_REPORT.md`

## Objective

Make the Work Item's assigned RepositoryCheckout the actual execution surface for source-changing Implementer runtimes.

## Required Changes

1. Pass the assigned `checkoutId` and resolved checkout root into Implementer execution.
2. Launch/runtime turns must use that checkout as `cwd` and repository write boundary.
3. Runtime prompts/contracts must state that branch/worktree switching and arbitrary Git mutation are ChampCity-owned mechanics.
4. File-change attribution must normalize against the assigned checkout root.
5. Checkpoint capture/completion must operate against the same checkout/branch binding rather than the registered primary repository root.
6. Runtime reconnect/resume must re-verify the checkout identity and HEAD lineage before continuing.
7. Prevent a runtime assigned to one Work Item from writing another active checkout.
8. Keep provider-specific mechanics behind the Agent Runtime adapter; do not make Codex worktree semantics the product contract.

## Primary Surface to Inspect

- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/workCardBuilding/codexAppServerTransport.ts`
- `src/main/workCardBuilding/codexImplementerExecutionPolicy.ts`
- `src/main/planExecution/workItemCheckpointService.ts`
- routed Development execution services/contracts
- RuntimeService/RepositoryCheckout contracts from prior cards

## Preserved Behavior

- Current model selection, streaming, approvals, and implementation reporting remain compatible.
- ChampCity retains routine Git mechanical ownership.
- Environment-resolution execution remains separately bounded.
- No worker gets arbitrary write access to the managed checkout root containing sibling executions.

## Acceptance Criteria

1. Two concurrent fixture Work Items execute with different checkout roots.
2. File changes from each runtime appear only in its assigned checkout.
3. Primary checkout bytes remain unchanged during worker execution.
4. Checkpoint attribution uses paths relative to the assigned checkout.
5. Resume after checkout/HEAD mismatch fails closed rather than continuing in another directory.
6. Provider/runtime errors preserve enough checkout identity for diagnosis without leaking unrelated host paths into durable Project State.

## Validation

Minimum:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/work-card-building/codex-implementer-execution-service.test.cjs`
- relevant routed Development and Git checkpoint tests

## Implementer Report

Document runtime binding, cwd/write-boundary behavior, checkpoint-root changes, concurrency proof, tests/commands/results, deviations/blockers, and checkpoint commit.

## Post-Implementation

Checkpoint RCO05 only, then read RCO06.
