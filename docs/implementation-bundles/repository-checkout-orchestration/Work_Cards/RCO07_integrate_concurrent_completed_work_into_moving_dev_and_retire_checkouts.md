# RCO07 — Integrate Concurrent Completed Work into a Moving dev Target and Retire Checkouts

**Order:** 7 of 8  
**Depends on:** RCO01–RCO06 and current WIR20/WIR21 integration-candidate lifecycle  
**Governing architecture:** `docs/architecture/CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/repository-checkout-orchestration/Implementer_Reports/RCO07_IMPLEMENTER_REPORT.md`

## Objective

Connect checkpointed concurrent Work Item revisions to the existing machine-owned integration candidate lifecycle so completed work can land into a `dev` branch that may have advanced since the Work Item started, then retire the execution checkout safely.

## Required Changes

1. Treat the Work Item checkpoint commit as the immutable incoming integration revision.
2. Resolve current `dev`/configured target at integration time; do not assume the Intake's original base is still current.
3. Reuse WIR20/WIR21 isolated integration candidate + Integration Repair mechanics.
4. Do not require rewriting/rebasing completed Work Item history merely because the target advanced.
5. Serialize only target advancement, not implementation execution.
6. After validated integration succeeds:
   - record resulting target commit;
   - mark Work Item integration complete;
   - verify execution checkout has no uncommitted implementation state;
   - retire the managed execution checkout;
   - apply branch-retention/deletion policy separately.
7. On conflict/validation failure, preserve the incoming branch and execution evidence; use Integration Repair rather than destructive reset.
8. Cleanup failure must not roll back a successful target advancement; expose it as cleanup debt with retained checkout.

## Preserved Behavior

- Existing target-owned validation policy and Integration Repair boundaries remain authoritative.
- No AI Git merge commands.
- No automatic semantic conflict winner.
- Remote push/release remains separate.

## Primary Surface to Inspect

- `src/main/planExecution/integrationCandidateService.ts`
- `src/main/planExecution/integrationRepairService.ts`
- `src/main/agentHarness/repository/integrationGit.ts`
- routed completion services
- RCO managed checkout lifecycle

## Acceptance Criteria

1. Two Work Items may start from the same target baseline, complete independently, and integrate sequentially into a target that advanced after the first integration.
2. The second integration uses current target state without requiring its implementation branch to be rewritten first.
3. Conflict/failure retains source and invokes the established repair path.
4. Successful integration retires the completed managed execution checkout only after durable source proof exists.
5. Another still-running Work Item checkout is unaffected.
6. Target advancement remains deterministic and serialized.

## Validation

Minimum:

- `npm run typecheck`
- `npm run build`
- extend/reuse integration-candidate and Integration Repair proof in `test/agent-harness/git-mutation-boundary.test.cjs`
- affected routed completion tests

## Implementer Report

Record integration binding, moving-target proof, cleanup rules, failure preservation, tests/commands/results, deviations/blockers, and checkpoint commit.

## Post-Implementation

Checkpoint RCO07 only, then read RCO08.
