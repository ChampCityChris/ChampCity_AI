# EPGA-R04-R03-R04 Implementer Report

## Scope and repository

- Approved repository root: verified as the active repository root; no concrete local-machine path is recorded here.
- Card type and identifier: Repair Card `EPGA-R04-R03-R04` — Reconcile Model Access to Exact Application Source Topology.
- Branch: `dev`.
- Starting HEAD: `69e7af8c989ff20c6f03a22e1793f90b04854ff8`.
- Remote status before checkpoint: `dev` is 199 commits ahead of `origin/dev` and 0 behind.
- Checkpoint commit: pending at report creation; the actual hash is reported to the Operator after commit.

## Files

Created:

- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair03/Repair03/Repair04/Reports/EPGA-R04-R03-R04_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/agentHarness/modelAccess/repositoryCheckoutAccessProjectionService.ts`
- `src/main/agentHarness/runtime/agentHarnessService.ts`
- `test/agent-harness/registered-workspace-registry.test.cjs`
- `test/project-state/current-project-entry.test.cjs`
- `validation/capability-map.json`

Deleted: none.

Intentionally not created or restored:

- no private `list-repository-checkouts` Service Host or worker operation;
- no Source Control dependency on Agent Harness, MCP runtime, or tool registry implementation;
- no schema, migration, compatibility path, dependency, JSON workflow sidecar, or source-control rollback callback;
- no real ChampCity_AI conversion retry.

## Implementation

Shared source fencing was added at `reconcileWorkspaceRepositoryCheckouts(...)`, the model-access topology inspection and mutation boundary. `AgentHarnessService` creates the accepted neutral filesystem-backed coordinator from the same `userDataRoot` used by public tool dispatch and passes it to both startup and registration reconciliation. Reconciliation acquires a shared Project lease before checkout discovery or Git inspection and releases it in `finally`.

The reconciliation layer now derives the deterministic conventional descriptor for the workspace. When the Project root is an exact conventional Git working tree, it ensures that descriptor exists without fabricating Main or Dev. When the root is no longer exact conventional Git, it idempotently revokes that deterministic descriptor through the model-access registry and does not mutate application source.

The real Existing Project entry proof now performs pre-conversion Agent Harness workspace registration and observes `conventional`. Successful conversion then reconciles to exact roles `dev` and `main`; public `git_toolbox.list_repository_checkouts` returns those same two stable checkout identities and no conventional checkout. Managed reopen preserves the same Main/Dev IDs and does not resurrect conventional access.

The focused registry proof also removes conventional access idempotently when root Git is absent and restores the same deterministic ID when exact root Git returns. A child Agent Harness process shares the neutral namespace with a Desktop-side exclusive lease: its reconciliation remains blocked throughout an in-progress transition, then observes restored conventional topology after the simulated failed conversion. The private checkout-list control remains absent; the process-contract owner explicitly rejects `list-repository-checkouts`.

When conventional retirement or managed publication fails, downstream reconciliation reports `degraded`; application-owned conversion, managed source, and Current Project registration remain valid. Retry Model Access repeats reconciliation, retires conventional, publishes exact Main/Dev, and reaches `ready` without rerunning conversion.

## Validation evidence

All commands ran from the verified repository root.

| Command | Execution lane | Result |
| --- | --- | --- |
| `npm run build` | restricted sandbox | Exit 1: documented Vite/esbuild `spawn EPERM`; not counted as source failure or pass. |
| `npm run build` | normal Windows | Exit 0; TypeScript, Vite production bundle, and branding asset copy passed. Vite reported its existing chunk-size advisory. |
| `node --test test/agent-harness/registered-workspace-registry.test.cjs test/project-state/current-project-entry.test.cjs` | restricted sandbox | Exit 1: documented Node test-worker `spawn EPERM`; not counted as source failure or pass. |
| `node --test test/agent-harness/registered-workspace-registry.test.cjs` | normal Windows | Exit 0; 17 passed, 0 failed, including exact-topology retirement/restoration and cross-process fence proof. |
| `node --test test/project-state/current-project-entry.test.cjs` | normal Windows | Exit 0; 19 passed, 0 failed, including real pre-conversion registration, exact managed discovery/reopen, degraded retirement/publication, retry, and project-entry regression. |
| `node --test test/agent-harness/agent-harness-core.test.cjs test/agent-harness/mcp-tool-contract-generation.test.cjs test/agent-harness/agent-harness-process-contract.test.cjs test/agent-harness/source-control-service-boundary.test.cjs test/source-control/managed-project-source.test.cjs test/project-state/current-project-entry.test.cjs test/validation/capability-map.test.cjs` | normal Windows | Exit 0; 65 passed, 0 failed. Covered public MCP Git contract, neutral tool-dispatch leases, private-control absence, Source Control import boundaries, managed-source rollback, entry behavior, and capability-map integrity. |
| `npm run test:repair -- --changes tmp/epga-r04-r03-r04-changes.json --preview` | canonical preview | Exit 0; repair validation plan generated successfully. It selected broad dependency proof, so the card-required focused named owners were executed directly instead of running a broad regression. |
| `git diff --check` | repository read-only | Exit 0. |

No broad/full regression, Electron launch, packaging, external integration, or real Project conversion was run because the Repair Card requires focused validation and explicitly prohibits retrying the real conversion before acceptance.

## Safety and residual status

- Source Control import scans found no Agent Harness, MCP runtime, or toolbox implementation dependency.
- The runtime protocol still rejects the removed private `list-repository-checkouts` operation.
- The changed surface contains no secrets, credentials, environment contents, concrete local-machine paths, generated build output, or dependency state.
- Durable paths in this report are repository-relative.
- Remaining required step: Architect review of this checkpoint.
- Operator manual validation: none required for deterministic closure; do not retry the real ChampCity_AI conversion until Repair04 is accepted.
- Blockers: none.
- Residual risk: filesystem lease timing and Git behavior remain platform-sensitive; the focused normal-Windows cross-process and managed-source owners passed.
- Recommended next task: Architect review of `EPGA-R04-R03-R04`, followed only after acceptance by the separately authorized real conversion retry.
