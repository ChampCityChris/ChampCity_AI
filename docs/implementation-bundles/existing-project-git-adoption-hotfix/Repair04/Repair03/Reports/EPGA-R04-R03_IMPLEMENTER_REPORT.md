# EPGA-R04-R03 Implementer Report

## Outcome

Repair Card: **EPGA-R04-R03 — Decouple Source Control from Agent Harness Model Access**.

Source Control now establishes and verifies conventional, managed Main/Dev, and Workflow Git authority without accepting an Agent Harness object or invoking MCP/model-access registration. Deterministic `RepositoryCheckout` descriptors are produced by one pure Source Control factory and projected afterward by an application/model-access service. Projection failure is a model-access failure and does not roll back valid Git or a ready Workflow `SourceBinding`.

The private `list-repository-checkouts` Service Host/worker control operation was removed. The public MCP `git_toolbox.list_repository_checkouts` action remains supported and is the process-boundary discovery proof. Focused validation passed. The real ChampCity_AI conversion was not retried and remains blocked pending Architect review.

## Repository and baseline evidence

- Verified the current directory as the approved `<PROJECT_REPO>` before changes.
- Starting HEAD: `7909dc55`, the Architect Repair03 release/correction commit whose parent is the card-required `e10bc59e` Repair02 implementation baseline.
- Branch: `dev`, tracking `origin/dev`; it began 192 commits ahead of the configured upstream.
- `origin` is configured for the ChampCity repository. No fetch, pull, push, merge, rebase, tag, reset, clean, restore, or stash was performed; remote freshness is not claimed.
- The working tree was clean at implementation start. The Repair03 card, Architect correction, and package README were treated as governing scope.

## Implementation

### Source Control dependencies removed

`existingProjectGitAdoptionService`, `managedProjectSourceService`, `projectSourceBootstrap`, `sourceControlService`, and `workflowSourceMaterializationService` no longer accept checkout registration/listing ports, workspace IDs for model access, or Agent Harness checkout-summary types. Existing Project conversion journals now describe Git/source recovery only; model checkout retirement, re-registration, cleanup, and `conventionalCheckoutRestored` state were removed.

Managed verification and Greenfield bootstrap return deterministic Main and Dev descriptors. Workflow materialization returns its deterministic Workflow descriptor and commits `SourceBinding` readiness before any downstream projection. The shared descriptor factory owns conventional, Main, Dev, and Workflow identity/path construction. A permanent import guard rejects Source Control imports of Agent Harness runtime client/server/controller, MCP runtime/server, and public toolbox/registry implementations.

### Application/model-access projection boundary

`repositoryCheckoutAccessProjectionService` now lives under the Agent Harness model-access integration layer. It publishes exact descriptors, validates registration confirmation, revokes model access idempotently, and performs conventional-root reconciliation after workspace registration. `AgentHarnessService` imports this outward-facing projector; Source Control does not import Agent Harness runtime or MCP composition.

Top-level application composition now:

- quiesces the deterministic conventional projection before Existing Project conversion;
- restores conventional model access only when a failed source conversion leaves root Git authoritative;
- publishes returned Main/Dev descriptors after successful conversion, Greenfield bootstrap, or managed reopen;
- materializes Workflow Git first and publishes its descriptor before model execution.

Projection errors are reported separately after source success. Focused proof forces Agent Harness/model-access failure and confirms managed and Workflow Git revisions, branches, worktrees, and ready binding state remain valid.

### Private and public checkout discovery

The private `list-repository-checkouts` operation was removed from both authoritative operation arrays, both request/response maps, validators, Service Host client/server dispatch, controller, and utility worker dispatch. Registration and unregistration remain exact semantic controls with Repair02 operation-array parity and build-generation fencing unchanged.

Public MCP checkout discovery remains through `git_toolbox.list_repository_checkouts`. The real Electron process-boundary owner now discovers the conventional checkout through that public action, revokes it through the retained private mutation control, observes an empty public result, and confirms idempotent reprojection through public discovery.

### Repair02 retained behavior

- Service Host and worker operation unions remain derived from their respective authoritative `as const` arrays.
- Both protocols retain identical checkout registration/unregistration semantics.
- Runtime build-identity discovery, controlled stale-generation replacement, typed incompatibility failures, and descriptor fencing were not weakened.
- Existing Service Host lifecycle, recovery, worker ownership, heartbeat, and public MCP behavior remain passing.

## Attributable files

Created:

- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair03/Reports/EPGA-R04-R03_IMPLEMENTER_REPORT.md`
- `src/main/agentHarness/modelAccess/repositoryCheckoutAccessProjectionService.ts`
- `src/main/sourceControl/repositoryCheckoutDescriptors.ts`

Modified:

- `src/main/agentHarness/runtime/agentHarnessController.ts`
- `src/main/agentHarness/runtime/agentHarnessProcessProtocol.ts`
- `src/main/agentHarness/runtime/agentHarnessService.ts`
- `src/main/agentHarness/runtime/agentHarnessServiceHostClient.ts`
- `src/main/agentHarness/runtime/agentHarnessServiceHostProtocol.ts`
- `src/main/agentHarness/runtime/agentHarnessServiceHostServer.ts`
- `src/main/agentHarness/runtime/agentHarnessWorker.ts`
- `src/main/main.ts`
- `src/main/sourceControl/existingProjectGitAdoptionService.ts`
- `src/main/sourceControl/managedProjectSourceService.ts`
- `src/main/sourceControl/projectSourceBootstrap.ts`
- `src/main/sourceControl/projectSourceTopology.ts`
- `src/main/sourceControl/sourceControlService.ts`
- `src/main/sourceControl/workflowSourceMaterializationService.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/shared/sourceLifecycleContracts.ts`
- `test/agent-harness/agent-harness-process-boundary.test.cjs`
- `test/agent-harness/agent-harness-process-contract.test.cjs`
- `test/agent-harness/registered-workspace-registry.test.cjs`
- `test/project-state/current-project-entry.test.cjs`
- `test/source-control/managed-project-source.test.cjs`
- `test/source-control/semantic-checkpoint-service.test.cjs`
- `test/source-control/structured-workflow-checkpoint.test.cjs`
- `test/source-control/workflow-integration-service.test.cjs`
- `test/source-control/workflow-source-materialization.test.cjs`
- `test/work-intake/greenfield-source-bootstrap.test.cjs`
- `validation/capability-map.json`

Deleted:

- `src/main/sourceControl/repositoryCheckoutReconciliationService.ts` — responsibility moved to the application/model-access integration layer.

Intentionally not created or changed: dependencies, persistence schemas or migrations, preload/public renderer APIs, unrestricted renderer filesystem access, integration policy semantics, packaging/release state, compatibility paths, or real-project conversion evidence.

## Focused validation record

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `pnpm build` | Restricted Windows | Exit 1 because this repository is configured for npm; no build ran and this is not a product failure. |
| `npm run build` | Restricted Windows | TypeScript completed, then Vite/esbuild returned the documented child `spawn EPERM`; rerun once in the normal lane. |
| `npm run typecheck` | Restricted Windows static | Exit 0 on both implementation and final passes. |
| `npm run build` | Normal Windows | Exit 0 on both required build passes; TypeScript, Vite, and branding completed, 1,666 modules transformed. Existing non-failing chunk-size advisory only. |
| `node --test --test-concurrency=1 test/source-control/managed-project-source.test.cjs test/work-intake/greenfield-source-bootstrap.test.cjs test/source-control/workflow-source-materialization.test.cjs test/agent-harness/registered-workspace-registry.test.cjs test/agent-harness/agent-harness-process-contract.test.cjs test/project-state/current-project-entry.test.cjs test/validation/capability-map.test.cjs` | Restricted Windows | Exit 1 because the Node test runner child spawn returned `EPERM`; rerun once normally. |
| Same focused owner set, adding `test/agent-harness/agent-harness-service-host-lifecycle.test.cjs` | Normal Windows | Source, bootstrap, projection, lifecycle/protocol, Current Project, and 70 other tests passed; the sole 71st failure was lexical ordering in newly edited capability metadata. No product proof failed. |
| `node --test test/validation/capability-map.test.cjs` | Normal Windows focused static rerun | Exit 0; 5/5 passed after lexical ordering was corrected. |
| `node --test test/project-state/current-project-entry.test.cjs` | Normal Windows focused rerun | Exit 0; 13/13 passed after VM fixtures received the new application projection dependencies. |
| `node --test test/agent-harness/agent-harness-process-boundary.test.cjs` | Normal Windows desktop-platform owner | Exit 0; 18/18 passed. Public MCP discovery replaced the removed private list round-trip while lifecycle, recovery, generation fencing, worker ownership, and heartbeat proofs remained intact. |
| `node --test --test-concurrency=1 test/source-control/semantic-checkpoint-service.test.cjs test/source-control/structured-workflow-checkpoint.test.cjs test/source-control/workflow-integration-service.test.cjs` | Normal Windows downstream Source Control owners | Exit 0; 9/9 passed. |
| `npm run validate:plan -- --profile repair --changes tmp/epga-r04-r03-changes.json` | Validation-plan preview | Exit 0; the exact implementation/report manifest resolved affected Repair03 capabilities and dependencies without executing the prohibited broad repair suite. |
| `git diff --check` and `git diff --cached --check` | Read-only Git validation | Exit 0; attributable and exact staged changes are whitespace-clean. Line-ending notices are non-failing working-copy normalization notices. |

The broad regression suite, packaging, release qualification, visual acceptance, external integration, and real-project conversion were intentionally not run. The Repair Card requires focused validation and explicitly prohibits retrying the real ChampCity_AI conversion before Architect acceptance.

## Security and durable-artifact safety

- No secret, credential, token, cookie, private key, or `.env` content was requested, printed, persisted, or added.
- RepositoryCheckout transport and public summaries remain semantic and contain no absolute host path.
- Production code imports no runtime behavior from tests, planning, archive, generated output, or temporary validation fixtures.
- Durable documentation uses repository-relative paths or `<PROJECT_REPO>` and contains no concrete local-machine or temporary path.
- Inspected the exact staged 31-file change set: three created files, one deleted Source Control reconciler, and 27 modified production/test/catalog files; 477 insertions and 439 deletions.
- Added-line scan found no concrete local user path, API/access token, private key marker, or `.env` path. Staged filename scan found no dependency, build, coverage, release, secret, credential, certificate, or key artifact.
- Attributable and staged diff checks passed.

## Git checkpoint

The active Repair Card requires checkpoint commit:

`EPGA-R04-R03 decouple source control from model access`

The commit hash is intentionally pending in this same committed artifact. The actual hash will be reported to the Operator after commit rather than amending the commit solely to insert its own identity.

## Remaining review and risk

- Required next action: Architect review of this checkpoint.
- The real ChampCity_AI conversion must not be retried before that review and acceptance.
- No external integration evidence or real-project mutation is claimed.
- Residual risk is limited to Architect review of the application-level sequencing between checkout revocation, irreversible source conversion, and subsequent model-access projection; source validity is explicitly retained if projection is unavailable.
