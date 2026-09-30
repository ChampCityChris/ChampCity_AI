# EPGA-R04-R03-R01 Implementer Report

## Scope and repository state

- Approved repository root: verified as `<PROJECT_REPO>` before mutation.
- Card: Repair Card `EPGA-R04-R03-R01` — Make Model-Access Projection Non-Authoritative in Product Git Paths.
- Branch: `dev`.
- Remote: `origin` is configured; the local branch was 194 commits ahead of `origin/dev` at implementation start.
- Baseline: implementation started from the Architect review checkpoint immediately following `2a83d482fbbf2924cd1562aa17106b77d437a529`.

## Product ordering before and after

Before this repair, Existing Project conversion required successful Agent Harness workspace registration and conventional-checkout revocation before Source Control could run. Greenfield entry registered Agent Harness before managed Git bootstrap. Managed Existing Project reopen registered and projected model access before verifying source and registering Current Project state. A failed post-conversion Main/Dev projection rejected the conversion IPC even after the conversion receipt had completed.

After this repair:

1. Existing Project entry derives the deterministic conventional descriptor from application-owned workspace identity.
2. It attempts bounded conventional model-access retirement when Agent Harness is reachable.
3. Transport absence becomes a degraded model-access result and Source Control conversion continues.
4. A live registry that cannot drain/revoke the conventional checkout throws a specific pre-cutover model-access quiescence blocker.
5. Source Control conversion runs independently and returns `sourcePlan` plus `sourceApplied`.
6. Main/Dev projection runs afterward and returns `modelAccess: { state, error }` without changing conversion success.
7. Existing managed reopen verifies the managed source first, registers Current Project state second, and projects model access last.
8. Greenfield entry bootstraps managed Git first, registers Current Project and Project Creation state second, and projects model access last.

`project:reconcileModelAccess` and its constrained preload API provide an idempotent retry that verifies current source and republishes Main/Dev without rerunning conversion or bootstrap. The Current Project banner exposes degraded status and a `Retry Model Access` action.

## Failure behavior

### Agent Harness unavailable

Agent Harness registration failure before Source Control begins is represented as degraded model access. Existing Project conversion, managed topology verification, Current Project registration, Greenfield bootstrap, initial baseline creation, and Project Creation state remain application-owned successes. Reopening a valid managed Existing Project with Agent Harness unavailable retains the same Current Project and reports degraded model access rather than source-invalid state.

### Agent Harness live with a busy checkout lease

Once Agent Harness has accepted the workspace, failure to retire its conventional checkout is treated as a safety blocker. `REPOSITORY_CHECKOUT_RETIRING` is surfaced as a model-access-busy message before `applyExistingProjectGitAdoption()` is called. The proof holds a real checkout lease, uses bounded retirement, confirms that root `.git` remains authoritative and no conversion journal exists, releases the lease, and confirms that the exact retry succeeds.

### Projection fails after Source Control succeeds

Post-conversion Main/Dev publication failure returns `sourceApplied: true` with degraded model access. The completed journal and receipt remain completed, root conventional Git remains non-authoritative, and Current Project registration still succeeds. A later reconciliation publishes the same deterministic descriptors and the proof confirms that the conversion function was called only once.

Greenfield projection failure likewise retains the managed bare repository, Main, Dev, initial baseline, Current Project resource, and Project Creation workflow. Later reconciliation succeeds idempotently.

Workflow source materialization/model-launch behavior remains strict: materialization may retain ready Git state during projection outage, but the Implementer launch owner still requires exact successful checkout projection before starting model execution.

## Neutral application boundary

Generic Git and error infrastructure was moved out of Agent Harness ownership:

- `src/main/core/applicationErrors.ts` now owns the bounded application error implementation.
- `src/main/core/gitExecution.ts` now owns the single bounded Git executor implementation.
- Generic repository/Git modules moved from `src/main/agentHarness/repository/` to `src/main/repository/`.
- Agent Harness, Source Control, workflow, planning, and test consumers now import the neutral modules.
- No compatibility duplicate or second Git executor was created.

The permanent AST import guard now rejects every production import from `src/main/sourceControl/*.ts` into `src/main/agentHarness/*`. A repository search also returned no such imports. `repositoryCheckoutDescriptors.ts` is application-owned and imports only neutral application error contracts.

## Files

Created:

- `src/main/modelAccess/projectModelAccessCoordinator.ts`
- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair03/Repair01/Reports/EPGA-R04-R03-R01_IMPLEMENTER_REPORT.md`

Moved without duplicate implementations:

- `src/main/agentHarness/core/errors.ts` to `src/main/core/applicationErrors.ts`
- `src/main/agentHarness/repository/boundedGit.ts` to `src/main/core/gitExecution.ts`
- the remaining production modules under `src/main/agentHarness/repository/` to `src/main/repository/`

Modified:

- product composition and contracts: `src/main/main.ts`, `src/preload/index.ts`, `src/shared/workspaceContracts.ts`
- degraded-state UI: `src/renderer/app/App.tsx`, `src/renderer/styles.css`
- neutral-boundary consumers under `src/main/agentHarness/`, `src/main/sourceControl/`, `src/main/planExecution/`, `src/main/workflow/`, `src/main/workIntake/`, `src/main/workPlanning/`, `src/main/workCardBuilding/`, `src/main/workCardLoop/`, `src/main/issueResolution/`, and `src/main/phaseClose/`
- focused product and boundary owners under `test/project-state/`, `test/agent-harness/`, `test/work-card-building/`, plus mechanically updated neutral-module import paths in affected test/support files
- `validation/capability-map.json` and its affected-change fixture

Deleted:

- no behavior or test owner was deleted; old Agent Harness-owned utility paths were removed through Git moves.

Intentionally not created:

- no public MCP control tool, Source Control-to-Agent Harness callback, compatibility copy, schema change, migration, dependency, or automatic source rollback.

## Validation evidence

All supported executions below ran from `<PROJECT_REPO>`.

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | restricted diagnostic | Non-source sandbox failure: TypeScript could not write `dist` (`EPERM`). The same pass also identified moved-module relative imports, which were corrected. |
| `npm run build` | normal Windows production build | Exit 0; TypeScript, Vite renderer build, and branding copy passed. Vite emitted only its existing chunk-size advisory. |
| `node --test test/project-state/current-project-entry.test.cjs` | restricted diagnostic | Non-source `spawn EPERM`; rerun in normal Windows lane. |
| `node --test test/project-state/current-project-entry.test.cjs` | normal Windows focused product path | Initial harness pass exposed two test-only expectation/scope defects; corrected. Final: 17/17 passed in 43.7 s, including unavailable Existing/Greenfield, managed reopen, busy lease, post-conversion outage, completed receipt, and idempotent retry. |
| `node --test --test-concurrency=1 test/source-control/managed-project-source.test.cjs test/work-intake/greenfield-source-bootstrap.test.cjs test/source-control/workflow-source-materialization.test.cjs test/agent-harness/registered-workspace-registry.test.cjs test/agent-harness/agent-harness-process-contract.test.cjs test/agent-harness/agent-harness-process-boundary.test.cjs test/agent-harness/agent-harness-service-host-lifecycle.test.cjs test/agent-harness/agent-harness-service-host-protocol-compatibility.test.cjs test/agent-harness/agent-harness-build-identity.test.cjs test/validation/capability-map.test.cjs` | normal Windows focused preserved capabilities | 78/83 passed; the five failures were limited to stale moved-path expectations in the build-identity fixture and lexical ordering in capability metadata. Both owners were corrected and rerun successfully. All other selected Source Control, public MCP, registry, Service Host lifecycle/protocol, schema-3 recovery, Greenfield, and Workflow materialization proofs passed. |
| `node --test --test-concurrency=1 test/agent-harness/agent-harness-build-identity.test.cjs test/validation/capability-map.test.cjs` | normal Windows focused correction | Build identity 4/4 passed; capability integrity initially reported one further lexical-order issue. |
| `node --test test/validation/capability-map.test.cjs` | normal Windows capability integrity | Final 5/5 passed. |
| `node --test test/work-card-building/codex-implementer-execution-service.test.cjs` | normal Windows Workflow model-launch owner | 35/35 passed in 93.2 s; exact projection remains mandatory before source-backed model launch. |
| `node --test test/agent-harness/source-control-service-boundary.test.cjs` | normal Windows Source Control owner | 2/2 passed in 19.0 s; application Source Control remained functional without MCP. |
| `npm run test:repair -- --changes tmp/epga-r04-r03-r01-changes.json --preview` | repair validation-plan preview | Exit 0; all changed paths classified and the governed repair plan rendered. No broad regression suite was executed. |
| `git diff --check HEAD` | static repository check | Exit 0. Line-ending conversion warnings were informational; no whitespace errors were reported. |

The card explicitly required focused validation only. Broad regression, full, release, packaging, migration, and performance/soak profiles were not run.

## Security and local-path safety

- No secrets, credentials, tokens, cookies, `.env` values, or private keys were read or written.
- New durable documentation uses `<PROJECT_REPO>` and repository-relative paths only.
- Test workspaces used bounded temporary roots and synthetic Git identities/remotes.
- The staged candidate will receive a bounded secret/local-path/generated-artifact scan before commit.

## Git actions and checkpoint

The approved card requires checkpoint commit:

`EPGA-R04-R03-R01 make model access non-authoritative in product Git paths`

The commit hash is pending at report creation and will be reported after the commit rather than amended into this artifact.

## Remaining review and risk

- No implementation blocker remains.
- Architect review should confirm the application ordering, degraded-state UX, conservative live-registry quiescence rule, and neutral module placement.
- The real ChampCity_AI conversion was not retried, as prohibited by the card.
- No Operator visual acceptance was required for deterministic closure; the new banner action remains available for optional experiential review.
- Recommended next task: Architect review of this Repair01 checkpoint, followed only by the explicitly authorized qualification/conversion step if accepted.
