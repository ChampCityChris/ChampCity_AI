# EPGA-R04-01 Implementer Report

## Scope and repository state

- Card: Repair Card `EPGA-R04-01` — Decouple Workspace Access from Git Authority and Make Cutover Failure-Safe.
- Approved repository root: verified as the repository root; no concrete local-machine path is recorded here.
- Branch: `dev`, tracking `origin/dev`; the starting branch was 186 commits ahead and 0 behind.
- Starting revision: `f6ea660fb5a2d465ac9dc567858f3b92438c9ce3`.
- The working tree was clean before implementation.
- No dependency, persistence migration, compatibility layer, JSON workflow sidecar, or unrelated refactor was added.

## Implementation

Generic Agent Harness workspace registration is now Git-neutral. It resolves workspace identity and generic filesystem/artifact/patch authority without probing `.git`; the retained `gitBacked` summary field is always false for a generic workspace and cannot grant Git access. A normal workspace may permanently have zero RepositoryCheckouts.

Git, test-execution, and release operations now require an exact registered `repositoryCheckoutId`. Tool dispatch resolves and validates that checkout root for each operation, runs against the checkout root, and releases a checkout-scoped operation lease afterward. Missing and retired identities return bounded `REPOSITORY_CHECKOUT_REQUIRED` or `REPOSITORY_CHECKOUT_RETIRING` errors. There is no implicit workspace-root or single-checkout fallback.

`RepositoryCheckoutRole` now includes explicit `conventional` identity. Its only valid location is the Project root (`.`), with the conventional source-line identity. Registration remains application/source-control-owned and removable without unregistering the generic workspace; it cannot be confused with managed Main, Dev, or Workflow roles.

The registry tracks checkout runtime state and active operations. Retirement rejects new operations, waits for already-acquired leases within a bounded deadline, removes the checkout registration after drain, and leaves generic workspace resolution and unrelated checkout/workspace access available.

Existing Project normalization now:

1. preserves current source and generates the accepted managed integration policy;
2. creates and proves `candidate-repository.git` under the current migration directory;
3. retires an exposed conventional checkout when the registration port provides it;
4. relocates pre-existing final metadata with bounded Windows retry;
5. installs the proven candidate at the final managed metadata path;
6. separately relocates root conventional Git with the same bounded retry;
7. creates and verifies Main/Dev only after final metadata cutover;
8. relocates Repair03 local state and registers exact Main/Dev checkouts;
9. writes truthful stage transitions and a completion receipt only after success.

Conversion-owned resource state records candidate preparation, final metadata installation, root Git relocation, created worktrees, local-state moves, conventional-checkout retirement, and registration progress. Rollback guards each action independently, retains failed attempt-owned paths as recovery evidence, restores prior authority where safe, records cleanup warnings, writes a failed journal, and surfaces the primary phase/reason first. Cleanup failure no longer replaces the normalization exception.

The Windows mutation helper retries `EPERM`, `EACCES`, `EBUSY`, and `ENOTEMPTY` five times with short bounded delay. It is used only for explicitly identified cutover/recovery paths. Exhaustion preserves the path and returns bounded failure evidence.

## Files

Created:

- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Reports/EPGA-R04-01_IMPLEMENTER_REPORT.md`

Modified:

- Agent Harness authority, runtime protocol, checkout registry, and tool routing under `src/main/agentHarness/`.
- Existing Project cutover and managed checkout ports under `src/main/sourceControl/`.
- Current Project adoption wiring in `src/main/main.ts`.
- Shared checkout/workspace contracts under `src/shared/`.
- Focused Agent Harness and managed-source proofs under `test/agent-harness/` and `test/source-control/`.
- `validation/capability-map.json` for the changed capability ownership and proof locators.

Deleted: none.

Intentionally not created: dependencies, data/schema migrations, historical compatibility handlers, unrestricted renderer filesystem access, broad workspace conversion fencing, and workflow JSON sidecars.

## Validation evidence

- `npm run build` — restricted sandbox lane — exit 1 with documented Vite/esbuild `spawn EPERM`; not counted as a source failure or pass.
- `npm run build` — normal Windows lane — exit 0; TypeScript, Vite production bundle, and branding copy passed. The existing bundle-size advisory remained non-blocking.
- `npm run validate:plan -- --profile repair --changes tmp/EPGA-R04-01-changes.json` — preview lane — exit 0 after capability-map integrity corrections; selected the affected Repair04 capabilities and their dependencies without executing them.
- `node --test test/agent-harness/registered-workspace-registry.test.cjs test/agent-harness/agent-harness-runtime.test.cjs test/agent-harness/mcp-tool-contract-generation.test.cjs test/agent-harness/git-toolbox-local-operations.test.cjs test/source-control/managed-project-source.test.cjs test/project-state/current-project-entry.test.cjs test/validation/capability-map.test.cjs` — normal Windows focused lane — exit 0; 71 tests passed, 0 failed.
- The focused proof includes Git-neutral non-Git workspaces, explicit conventional/managed checkout routing, mandatory exact selectors, checkout retirement/draining, unrelated generic workspace access, staged candidate metadata, bounded Windows retries, exhausted-cutover rollback, truthful failed journals, current `normalizing` residue recovery, Repair03 large ignored-tree/junction preservation, Repair02 baseline integration-policy loading, Current Project sequencing, managed reopen idempotence, and capability-map integrity.
- `npm run validate:static` — normal Windows lane — exit 1 overall: its owned production build passed and 41 of 42 static tests passed. The sole failure was the unchanged `test/repository/runtime-wiring-source.test.cjs` expectation for pre-existing optional trailing `null` arguments in Codex preload calls. Neither that test nor the implicated Codex preload route was changed by this card, so this unrelated baseline mismatch was not repaired outside scope.
- `git diff --check` — repository lane — exit 0; only existing line-ending conversion warnings were emitted.

The real ChampCity_AI UI conversion was intentionally not retried. Recovery was proven against an isolated fixture reproducing root authoritative Git, an old `normalizing` journal, an old source snapshot, absent managed worktrees, and partial final metadata residue. The fixture converted successfully from fresh current source without manual deletion.

## Security and path safety

- No secret, token, credential, cookie, private key, or `.env` content was added or printed.
- Durable artifacts use repository-relative paths and contain no concrete local-machine or temporary paths.
- Checkout summaries and errors do not expose absolute checkout roots.
- Cutover cleanup is limited to current-attempt or explicitly relocated paths; root Git is never deleted as fallback.
- Final staged-diff secret/local-path/generated-artifact scan is required immediately before the checkpoint commit.

## Git actions and checkpoint

The card requires checkpoint commit `EPGA-R04-01 decouple workspace Git authority and make cutover failure-safe`. The report records the commit hash as pending because the hash cannot be inserted into the same commit without amendment. The actual hash is reported to the Operator after commit.

## Remaining validation and risk

- Architect review is required before any real ChampCity_AI UI conversion retry.
- The real Project conversion remains deliberately unexecuted by this implementation pass.
- The unrelated static-lane Codex preload expectation mismatch remains outside Repair04 scope.
- No visual/experiential Operator acceptance was required for the focused non-visual authority and recovery behavior.

Recommended next task: Architect review of the Repair04 checkpoint and validation evidence, followed only after acceptance by an Operator-directed real conversion retry.
