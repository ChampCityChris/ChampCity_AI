# RCO03 — Make Repository and MCP Inspection Checkout-Aware

**Order:** 3 of 8  
**Depends on:** RCO01–RCO02  
**Governing architecture:** `docs/architecture/CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/repository-checkout-orchestration/Implementer_Reports/RCO03_IMPLEMENTER_REPORT.md`

## Failed Capability Evidence

During HOTFIX20 review, `repo_toolbox` was correctly bound to `C:\...\ChampCity_AI` but could not inspect a concurrent Codex worktree belonging to the same Git Repository. `git_toolbox` could inspect branch refs but could not identify/read the execution checkout. This produced a false Architect conclusion from the wrong filesystem view.

## Objective

Allow application and MCP repository inspection to target a verified RepositoryCheckout rather than assuming the registered primary checkout is the only filesystem view.

## Required Changes

1. Extend RepositoryService/file inspection operations to accept optional `checkoutId`.
2. When omitted, preserve current primary-checkout compatibility behavior.
3. When supplied, resolve the checkout through RCO01 inventory and verify it belongs to the bound Repository.
4. Make at minimum the following checkout-aware:
   - status;
   - diff/changed files;
   - bounded file read;
   - text chunk/line/Markdown section read;
   - list files;
   - repository search;
   - branch/HEAD inspection where applicable.
5. Extend public MCP tooling with bounded checkout discovery/inspection.
6. Prefer semantic `checkoutId` over arbitrary absolute-path arguments.
7. A `workspaceId: champcity_ai` call may inspect only checkouts owned by that Repository; a sibling Repository under the same managed root must fail closed.
8. Expose enough evidence for an Architect to identify the exact checkout and HEAD being reviewed.

## Negative Constraints

- No arbitrary filesystem root parameter.
- No cross-workspace fallback.
- No filesystem-wide worktree search.
- No mutation through read-only checkout inspection actions.
- Do not expose credentials/environment files outside existing path policy.

## Primary Surface to Inspect

- `src/main/agentHarness/repository/repositoryOperations.ts`
- `src/main/agentHarness/workspace/workspaceAccess.ts`
- `src/main/agentHarness/tools/toolRegistry.ts`
- `src/main/sourceControl/sourceControlService.ts`
- Agent Harness MCP contracts/tests
- registered workspace/repository access tests

## Acceptance Criteria

1. MCP can list verified checkouts for `champcity_ai`.
2. MCP can read a file from a selected linked checkout and return its checkout/HEAD context.
3. Reading the same relative path from primary vs linked checkout can legitimately return different bytes.
4. Supplying a checkout from another Repository returns the existing fail-closed access class, not data.
5. Existing calls without checkout context remain compatible.

## Validation

Minimum:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/agent-harness/repository-file-operations.test.cjs test/agent-harness/git-mutation-boundary.test.cjs test/agent-harness/mcp-tool-contract-generation.test.cjs`

## Implementer Report

Include the exact MCP/tool actions added or extended, compatibility behavior, wrong-checkout/cross-repository rejection proof, tests, commands/results, and checkpoint commit.

## Post-Implementation

Checkpoint RCO03 only, then read RCO04.
