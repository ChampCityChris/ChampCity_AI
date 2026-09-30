# EPGA-R04-R01 Implementer Report

## Outcome

Repair Card: **EPGA-R04-R01 — Make Checkout Retirement Atomic and Provision Conventional Authority**.

Implementation and focused validation passed. The real ChampCity_AI conversion was not retried and remains blocked pending Architect review of this checkpoint.

## Repository and baseline evidence

- Verified the current directory and Git top-level as the approved `<PROJECT_REPO>` before changes.
- Branch: `dev`, tracking `origin/dev`; the branch began 188 commits ahead of its configured upstream.
- Starting HEAD: `c5c454502385b36c4a25d8a0819fe7b39b2bbcf7`. Required Repair04 implementation checkpoint `643ea5ed24552b34b9cafa3592b4965703fdb28c` is in the current lineage.
- Starting working tree and index were clean.
- `origin` is configured for the ChampCity repository. No fetch, pull, push, merge, rebase, tag, reset, clean, restore, or stash was performed; remote freshness is not claimed.

## Implementation

### Atomic reservation ordering

`RegisteredWorkspaceRegistry.resolveRepositoryCheckoutContext()` now locates the exact persisted checkout, synchronously checks the single checkout-runtime authority for `available`, and increments `activeOperations` before any asynchronous workspace or Git validation. Its idempotent release closure is created at reservation time and is invoked on every post-reservation validation failure, so failed validation cannot leak active authority.

`unregisterRepositoryCheckout()` transitions the same runtime object to `retiring` before observing the active count. New resolution is rejected after that transition, in-flight validation and operations remain counted, and persistent removal occurs only after the exact checkout drains. The post-drain removal re-reads the current persisted entry so unrelated concurrent descriptor changes cannot be overwritten.

### Retirement timeout and persistence-failure recovery

A bounded drain timeout removes only its own waiter, restores the runtime state to `available`, leaves the persisted descriptor unchanged, and surfaces the bounded retirement error. Persistent removal failure follows the same restoration rule. Proof covers immediate Git status through the same checkout after timeout, no stale drain waiters, a later successful retirement attempt, and immediate resolution after an injected persistence failure.

### Production conventional-checkout provisioning lifecycle

Added one application/source-control reconciliation service outside generic workspace registration. It performs bounded exact-root Git inspection and, only for an exact conventional Git working-tree root, registers one deterministic `conventional` descriptor with `projectRelativePath: .`, `sourceLineId: conventional`, and application-owned bounded checkout/repository identities. It never initializes Git.

`AgentHarnessService` invokes that service after every production workspace registration and after registry rehydration during service initialization. This single boundary therefore covers ordinary `workspace:choose`, `agentHarness:chooseAndRegisterWorkspace`, Existing Project entry before conversion, and previously persisted workspaces. The generic `RegisteredWorkspaceRegistry.register()` path remains Git-neutral.

### Persisted-workspace reconciliation and non-Git result

The registry exposes an application-only list of available registered roots; public MCP summaries still contain no absolute root. Startup reconciliation provisions a missing conventional descriptor and is idempotent across a second service construction. A non-Git registered workspace remains usable for read/search/Markdown write, receives zero descriptors, and produces no Git initialization or repair behavior.

Valid managed Project roots do not receive a conventional root descriptor. Existing managed-source mechanics remain responsible for exact deterministic Main/Dev registration, and Current Project reopen proof confirms exactly `main` and `dev` remain registered.

### Existing Project retirement-failure result

Existing Project conversion now identifies the exact root conventional descriptor by its bounded conventional role/path rather than requiring its application-owned pre-conversion Repository identity to equal the eventual managed Repository identity. `conventionalCheckoutRetired` is still set only after unregister succeeds.

An injected retirement timeout proves conversion fails in phase `conventional checkout retirement`, before final managed metadata installation or root Git relocation. Root `.git` remains authoritative, the journal records the primary phase, `conventionalCheckoutRestored` remains `null`, and no redundant re-registration occurs because retirement never completed.

## Attributable files

Created:

- `src/main/sourceControl/repositoryCheckoutReconciliationService.ts`
- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair01/Reports/EPGA-R04-R01_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/agentHarness/workspace/registeredWorkspaceRegistry.ts`
- `src/main/agentHarness/runtime/agentHarnessService.ts`
- `src/main/sourceControl/existingProjectGitAdoptionService.ts`
- `test/agent-harness/registered-workspace-registry.test.cjs`
- `test/app-shell/app-shell.test.cjs`
- `test/project-state/current-project-entry.test.cjs`
- `test/source-control/managed-project-source.test.cjs`
- `validation/capability-map.json`
- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/README.md`
- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/EPGA-R04-01_decouple_workspace_git_authority_and_make_cutover_failure_safe.md`

Deleted: none.

Intentionally not created or changed: dependencies, public protocols, preload surface, renderer filesystem access, schemas, migrations, compatibility readers, Workflow identity, arbitrary path selectors, JSON sidecars, packaging, release state, and real-project conversion state. The ignored change-set input under `tmp/` is validation-only and is not a committed artifact.

## Focused validation record

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run build` | Restricted Windows | Exit 1 after TypeScript completed because Vite/esbuild child spawn returned the documented `EPERM`; not counted as a source failure or pass. |
| `npm run build` | Normal Windows | Exit 0. Final production TypeScript, Vite renderer, and branding build passed; 1,666 modules transformed. The existing chunk-size advisory remained non-failing. |
| `node --test test/agent-harness/registered-workspace-registry.test.cjs` | Restricted Windows | Exit 1 because the Node test runner child spawn returned `EPERM`; rerun once in the normal lane. |
| `node --test test/source-control/managed-project-source.test.cjs` | Restricted Windows | Exit 1 because the Node test runner child spawn returned `EPERM`; rerun once in the normal lane. |
| `node --test test/agent-harness/registered-workspace-registry.test.cjs` | Normal Windows | Exit 0; 14/14 passed. Covers real async validation/retirement overlap, closed retiring gate, exact-once validation release, timeout recovery, immediate Git reuse, persistence-failure recovery, later retirement, non-Git zero descriptors, production conventional provisioning, and restart reconciliation. Final rerun passed after the last source corrections. |
| `node --test test/source-control/managed-project-source.test.cjs` | Normal Windows | Exit 0; 17/17 passed. Covers retirement failure before cutover and preserved Repair02 policy load, Repair03 ignored-tree/junction handling, and Repair04 staged candidate plus Windows retry/rollback behavior. |
| `node --test test/app-shell/app-shell.test.cjs` | Normal Windows | Initial exit 1 at 11/12 from a cross-realm test-object comparison; assertion normalization corrected without production change. Final exit 0; 12/12 passed, including both production workspace activation entry points delegating to registration. |
| `node --test test/project-state/current-project-entry.test.cjs` | Normal Windows | Exit 0; 13/13 passed. Covers Existing Project production entry, conventional retirement, managed reopen, and exact Main/Dev authority. |
| `node --test test/agent-harness/mcp-tool-contract-generation.test.cjs` | Normal Windows | Exit 0; 3/3 passed. Public Git/test/release contract retains exact RepositoryCheckout targeting with no root fallback. |
| `node --test test/validation/capability-map.test.cjs` | Normal Windows | Initial metadata run exposed missing Git resource ownership and ordering; metadata corrected. Final exit 0; 5/5 passed. |
| `npm run test:repair -- --changes tmp/epga-r04-r01-changes.json --preview` | Restricted Windows preview | Exit 0. Repair plan classified every changed path, selected affected owners, and identified no unavailable required environment. No proof was executed by preview. |
| `git diff --check` and `git diff --cached --check` | Read-only Git validation | Exit 0. Only informational CRLF-to-LF normalization warnings appeared before staging for two existing text files. |

Broad unrelated regression, packaging, Electron launch smoke, release qualification, and external integration were intentionally skipped because the Repair Card requires focused validation and none is in scope. No visual or experiential acceptance judgment is required for this service/runtime repair.

## Security and durable-artifact safety

- No secret, credential, token, cookie, key, or `.env` content was requested, printed, persisted, or added.
- Production writes remain inside the existing registry persistence boundary and user-selected workspace behavior remains unchanged.
- Public MCP responses were not extended with absolute roots; the new root enumeration is application-internal only.
- No production import from `test/`, `planning/`, `archive/`, validation metadata, generated output, or temporary fixtures was introduced.
- Documentation uses repository-relative paths or `<PROJECT_REPO>` and contains no concrete local-machine path.
- Inspected the exact staged 12-file change set: two created files, ten modified files, 493 insertions, and 39 deletions; no unrelated or generated artifact was staged.
- Exact fixed-string scan for the local user path returned no matches in attributable files.
- Bounded filename-only secret-pattern scan returned no matches in attributable files.
- Both unstaged and staged diff checks passed.

## Git checkpoint

The active Repair Card requires checkpoint commit:

`EPGA-R04-R01 make checkout retirement atomic and provision conventional authority`

The commit hash is intentionally recorded as pending in this same committed artifact. The actual hash is reported to the Operator after commit rather than amending the commit solely to insert its own identity.

## Remaining review and risk

- Required next action: Architect review of the checkpoint.
- The real ChampCity_AI conversion must not be retried until this Repair04 Repair01 checkpoint is reviewed and accepted.
- No external integration evidence or real-project mutation is claimed.
- Residual risk is limited to Architect acceptance of the new reconciliation ownership and concurrency boundary; focused deterministic evidence passed for every card-owned failure mode.
