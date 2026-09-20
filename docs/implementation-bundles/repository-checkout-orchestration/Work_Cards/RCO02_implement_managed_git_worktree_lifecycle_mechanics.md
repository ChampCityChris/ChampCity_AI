# RCO02 — Implement Managed Git Worktree Lifecycle Mechanics

**Order:** 2 of 8  
**Depends on:** RCO01  
**Governing architecture:** `docs/architecture/CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/repository-checkout-orchestration/Implementer_Reports/RCO02_IMPLEMENTER_REPORT.md`

## Objective

Add bounded deterministic mechanics for ChampCity-managed RepositoryCheckout creation, inspection, and retirement using Git worktrees while preserving the Repository's shared object history.

## Required Changes

1. Add a host-local configurable managed-checkout root abstraction; do not hard-code a user path.
2. Implement managed checkout creation from an exact Repository/branch or exact commit baseline.
3. Create checkout paths deterministically from bounded identities rather than arbitrary runtime names.
4. Support branch-attached execution checkout creation where the target branch is not checked out elsewhere.
5. Support detached checkout creation only when explicitly requested by the owning workflow.
6. Implement managed checkout inspection/status through RCO01 contracts.
7. Implement safe managed checkout retirement/removal.
8. Cleanup must fail closed when:
   - checkout is primary;
   - checkout is executing/leased;
   - checkout ownership changed;
   - uncommitted state remains without explicit abandonment semantics;
   - the checkout is external/unmanaged.
9. Do not automatically copy ignored dependency/build directories.

## Preserved Behavior

- Existing integration-candidate temporary checkout mechanics remain functional.
- Existing branch/stage/commit/integration behavior remains deterministic.
- No AI worker runs arbitrary `git worktree` shell commands.

## Primary Surface to Inspect

- `src/main/agentHarness/repository/boundedGit.ts`
- `src/main/agentHarness/repository/gitMutations.ts`
- `src/main/agentHarness/repository/integrationGit.ts`
- Source-Control service from WIR02/current source
- environment/settings storage appropriate for host-local managed root

## Acceptance Criteria

1. Disposable fixture repositories can create two or more linked managed checkouts sharing one Git Repository.
2. Each checkout can hold a different branch/source state concurrently.
3. Git object history is shared; implementation does not clone the Repository to provide normal local concurrency.
4. Dirty managed checkout removal is rejected.
5. Primary/external checkout removal is rejected.
6. Clean completed managed checkout removal succeeds and leaves Repository refs/history intact.
7. Path containment and symlink/reparse protections remain fail-closed.

## Validation

Minimum:

- `npm run typecheck`
- `npm run build`
- focused Git/worktree tests in the existing Git boundary suite or a new test only if lifecycle proof cannot be coherently housed there

## Implementer Report

Document managed-root representation, exact Git commands hidden behind deterministic code, cleanup safety, disk-state behavior, test categorization, command results, and checkpoint commit.

## Post-Implementation

Checkpoint RCO02 only, then read RCO03.
