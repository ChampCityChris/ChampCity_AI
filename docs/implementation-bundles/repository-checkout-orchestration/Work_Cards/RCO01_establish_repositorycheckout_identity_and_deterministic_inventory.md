# RCO01 — Establish RepositoryCheckout Identity and Deterministic Inventory

**Order:** 1 of 8  
**Depends on:** current WIR22/source-control baseline  
**Governing architecture:** `docs/architecture/CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/repository-checkout-orchestration/Implementer_Reports/RCO01_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Canonical V2 vocabulary already defines **RepositoryCheckout** as a concrete working copy/worktree of a Repository.
- Current `RepositoryService` target contract has repository/branch mechanics but no checkout identity/query surface.
- Current `git_toolbox.inspect_branch_state` reports branches but not Git worktrees/checkouts.
- `src/main/agentHarness/repository/integrationGit.ts` already uses bounded `git worktree list --porcelain -z` internally for integration checkout ownership verification.
- The 2026-09-20 concurrent WIR22/HOTFIX20 incident proved that one registered repository root is insufficient evidence of all active filesystem source state for one Git Repository.

Re-verify these facts at execution start.

## Objective

Create the first-class RepositoryCheckout domain contract and deterministic inventory needed to identify every checkout belonging to a selected Git Repository without scanning arbitrary filesystem directories.

## Required Changes

1. Add shared/application contracts for RepositoryCheckout identity and lifecycle metadata.
2. Implement deterministic checkout enumeration from the selected Repository using bounded Git metadata.
3. Identify the primary checkout separately from linked worktrees.
4. For each checkout expose at minimum:
   - stable/derived `checkoutId`;
   - repository identity;
   - host-local root;
   - HEAD commit;
   - attached branch or detached state;
   - primary/linked classification;
   - clean/dirty summary;
   - provider/ownership classification sufficient to distinguish ChampCity-managed vs external/unmanaged.
5. Verify each discovered checkout belongs to the selected Repository by common Git directory/top-level identity rather than path naming.
6. Add semantic Source-Control/Repository service queries for listing and inspecting checkouts.
7. Preserve current branch/history/status APIs.

## Architecture Constraints

- Do not scan `Projects\Worktrees`, `.codex`, user profiles, or arbitrary roots looking for repositories.
- Git metadata is the authoritative discovery path for Git-owned worktrees.
- Absolute host paths are runtime resource metadata, not portable Project State.
- A detached checkout is valid state and must not be misreported as a missing branch.
- No checkout creation/removal in this card.

## Primary Surface to Inspect

- `src/main/sourceControl/sourceControlService.ts`
- `src/main/agentHarness/repository/boundedGit.ts`
- `src/main/agentHarness/repository/gitMutations.ts`
- `src/main/agentHarness/repository/integrationGit.ts`
- shared source-control/workspace contracts
- `docs/architecture/CHAMPCITY_CLIENT_SERVICE_CONTRACT.md`
- `docs/migration/CHAMPCITY_CLIENT_SERVICE_DESKTOP_SOURCE_MAPPING.md`

## Acceptance Criteria

1. Application code can deterministically list all Git worktrees belonging to a selected Repository.
2. Primary and linked checkouts are distinguishable.
3. Branch-attached and detached checkouts are represented correctly.
4. Checkout ownership verification fails closed when a path/common Git directory does not belong to the selected Repository.
5. No filesystem-wide discovery is introduced.
6. Existing Git/source-control behavior remains compatible.

## Validation

Inspect existing tests and `validation/capability-map.json`.

Minimum:

- `npm run typecheck`
- `npm run build`
- extend/reuse `test/agent-harness/git-mutation-boundary.test.cjs` for disposable multi-worktree inventory/ownership proof

## Implementer Report

Record baseline, exact contracts/files changed, checkout identity algorithm, ownership verification, tests reused/extended/new with coverage-gap justification, commands/results, deviations, blockers, and checkpoint commit.

## Post-Implementation

Checkpoint RCO01 only, then read RCO02.
