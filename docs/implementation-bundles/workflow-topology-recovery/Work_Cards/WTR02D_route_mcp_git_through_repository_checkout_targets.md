# WTR02D — Route MCP Git Operations Through Explicit RepositoryCheckout Targets

**Milestone:** WTR02 — Repository, checkout, MCP, and source ownership contracts  
**Implementer:** GPT 6.0 Luna Medium  
**Depends on:** WTR02C closed at `d1e0bb996ab729cc2ad84ee8ef142fff41e9ee5a`  
**Architecture:** `docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md`  
**Operator decisions:** `docs/implementation-bundles/workflow-topology-recovery/OPERATOR_DECISIONS_2026-09-23.md`  
**Plan:** `docs/implementation-bundles/workflow-topology-recovery/WORK_CARD_PLAN.md`  
**Report:** `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02D_IMPLEMENTER_REPORT.md`

## 1. Objective

Make the MCP boundary express the architecture adopted in WTR02C:

```text
MCP workspaceId
= Project container filesystem identity

RepositoryCheckout
= explicit Git working-copy target
```

A Project MCP workspace may be completely non-Git-backed and must still support normal `repo_toolbox` filesystem operations.

Every actual `git_toolbox` inspection or mutation must operate against one explicitly selected, application-registered `RepositoryCheckout`.

The model must not:

- infer Git capability from the Project root;
- supply an absolute checkout path;
- supply an arbitrary Project-relative checkout path;
- infer a checkout from a branch name;
- use a separately registered checkout workspace as a substitute for Project identity.

The public selection token is:

```text
repositoryCheckoutId
```

The host resolves that semantic identity to its validated local checkout root.

## 2. Canonical routing model

After WTR02D:

```text
workspaceId = Project container
        │
        ├── repo_toolbox
        │     └── Project container root
        │
        └── git_toolbox
              ├── list_repository_checkouts
              │     └── registered checkout metadata only
              │
              └── every actual Git action
                    + repositoryCheckoutId
                    └── internal checkout resolver
                          └── exact validated Git checkout root
```

The Project root may have:

```text
gitBacked = false
```

while one or more registered RepositoryCheckouts are valid Git working trees.

That is expected architecture, not a degraded state.

## 3. No path argument in the MCP Git contract

Do **not** expose any of these as `git_toolbox` call arguments:

- absolute checkout root;
- `projectRelativePath`;
- repository metadata path;
- Git common directory;
- branch-derived filesystem path.

The model supplies only:

```text
workspaceId
repositoryCheckoutId
action-specific params
```

The checkout's Project-relative path is application-owned registry metadata established through the WTR02C `RepositoryCheckout` contract.

This prevents arbitrary-path Git targeting.

## 4. Registered Project workspace remains the authority root

Existing workspace registration already supports non-Git directories.

Preserve and formalize that behavior:

- `RegisteredWorkspaceRegistry.register(projectContainerRoot)` succeeds for a readable/writable non-Git Project container;
- `repo_toolbox` continues reading/writing relative to that exact registered Project root;
- Project workspace identity remains `workspaceId`;
- Project registration does not require any RepositoryCheckout to exist;
- a Project with zero checkouts remains a valid MCP workspace.

Do not make Project registration depend on:

- `.git`;
- Main/Dev topology already existing;
- a source repository;
- checkout capacity.

## 5. RepositoryCheckout registration under a Project workspace

Extend the Agent Harness workspace registry with an application-facing checkout registration boundary.

Use WTR02C's shared:

`RepositoryCheckout`

contract as the persisted semantic descriptor.

Required behavior equivalent to:

```ts
registerRepositoryCheckout(
  workspaceId: string,
  checkout: RepositoryCheckout,
): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary>

unregisterRepositoryCheckout(
  workspaceId: string,
  repositoryCheckoutId: string,
): AgentHarnessRegisteredRepositoryCheckoutSummary[] | equivalent
```

Exact return wrappers may follow existing registry conventions.

This is MCP/runtime routing state only.

It is **not** canonical Project State and must not create new Project State entities.

## 6. Checkout registry persistence

For a normal Project workspace entry, persist zero or more RepositoryCheckout descriptors.

An additive storage shape is acceptable:

```ts
interface StoredRegisteredWorkspace {
  workspaceId: string;
  canonicalRoot: string;
  managed?: ...; // existing transitional field
  repositoryCheckouts?: RepositoryCheckout[];
}
```

Requirements:

1. existing registry files with no `repositoryCheckouts` continue to load;
2. registration persistence contains no absolute checkout path;
3. checkout descriptors are stored deterministically, sorted by `repositoryCheckoutId`;
4. duplicate checkout IDs within a Project are rejected unless exact idempotent re-registration;
5. the same managed `projectRelativePath` cannot be registered under two different checkout IDs in one Project;
6. same checkout ID with changed semantic contract fails with `WORKSPACE_REGISTRY_CONFLICT`;
7. checkout registration is forbidden on existing legacy `managed` workspace entries;
8. removing a checkout registration does not delete, clean, reset, or otherwise mutate its filesystem/Git state.

Do not bump this into Project State persistence.

A backward-compatible additive local registry schema is preferred over introducing a migration subsystem.

## 7. Registration validates the exact existing checkout

Checkout registration must:

1. resolve the owning registered Project workspace;
2. require a normal Project workspace, not an existing legacy managed-worktree workspace;
3. validate the supplied descriptor with WTR02C `validateRepositoryCheckoutContract()`;
4. derive the expected host-local root from the Project root and the descriptor role/path:
   - `main` → `Main`;
   - `dev` → `Dev`;
   - `workflow` → `.champcity/checkouts/<workflow-id>`;
5. require that exact checkout directory to already exist;
6. retain WTR02C redirect/symlink/reparse protection;
7. require the resolved directory to be a Git working tree;
8. require `git rev-parse --show-toplevel` to resolve exactly to that checkout root;
9. fail closed if the path is merely a subdirectory of another checkout;
10. perform no Git mutation.

Registration does not:

- initialize Git;
- create a branch;
- create a worktree;
- create a directory;
- move repository metadata.

Physical checkout creation belongs to WTR02F/WTR03C.

## 8. Checkout resolution is revalidated at use time

Add an internal checkout context equivalent to:

```ts
interface AgentHarnessRepositoryCheckoutContext {
  workspaceId: string;
  root: string; // host-local, main-process only
  checkout: RepositoryCheckout;
}
```

Extend `AgentHarnessWorkspaceAccessProvider` with bounded capabilities equivalent to:

```ts
resolveRepositoryCheckoutContext(
  workspaceId: unknown,
  repositoryCheckoutId: unknown,
): Promise<AgentHarnessRepositoryCheckoutContext>;

listRepositoryCheckoutSummaries(
  workspaceId: unknown,
): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary[]> | equivalent;
```

Every resolution must revalidate:

- Project workspace still exists and matches registration;
- checkout descriptor still validates;
- derived checkout path still resolves to the expected location;
- no redirect has appeared;
- checkout directory still exists;
- it is still an exact Git working-tree root.

A stale or moved checkout registration must not redirect Git somewhere else.

## 9. Public checkout summary

Add a shared summary contract in:

`src/shared/workspaceContracts.ts`

equivalent to:

```ts
export interface AgentHarnessRegisteredRepositoryCheckoutSummary {
  repositoryCheckoutId: string;
  repositoryId: string;
  sourceLineId: string;
  role: "main" | "dev" | "workflow";
  projectRelativePath: string;
  workflowId?: string;
  availability: "available" | "unavailable";
  validationError: string | null;
}
```

Do not expose:

- absolute root;
- Git common directory;
- user profile paths;
- internal registry file path.

Unavailable checkout registrations remain visible as unavailable until explicitly unregistered or repaired.

A missing checkout must not make the Project workspace itself unavailable.

## 10. Git toolbox checkout discovery action

Add one public read-only `git_toolbox` action:

```text
list_repository_checkouts
```

Input:

```json
{
  "workspaceId": "<project workspace>",
  "action": "list_repository_checkouts"
}
```

No `repositoryCheckoutId` is required for this discovery action.

Output must contain bounded checkout summaries for that Project and no absolute host path.

The action must work when:

- Project root is non-Git;
- zero checkouts are registered;
- some registered checkouts are unavailable.

Do not add a public MCP action that registers arbitrary checkout paths. Checkout registration remains application/runtime-owned.

## 11. Every actual Git action requires repositoryCheckoutId

For every existing `git_toolbox` action whose purpose is Git inspection or mutation, require:

```text
params.repositoryCheckoutId
```

This includes, but is not limited to:

- `status`;
- `diff`;
- `changed_files`;
- `inspect_commit`;
- `compare_refs`;
- `inspect_reflog`;
- `list_worktrees`;
- `inspect_worktree`;
- `list_tags`;
- `inspect_remotes`;
- `pre_commit_scan`;
- `readiness_summary`;
- `inspect_branch_state`;
- `inspect_history`;
- `verify_tag`;
- all existing branch/ref mutations;
- stage/unstage/restore;
- commit/amend/revert/cherry-pick;
- fetch/push/tag operations;
- integration mutations;
- existing managed-worktree / isolated-operation Git actions.

The only `git_toolbox` action exempt from an explicit checkout target in this card is:

`list_repository_checkouts`

because its purpose is target discovery.

If another action is demonstrably non-Git metadata-only, stop and report it rather than silently exempting it.

## 12. Tool-schema enforcement must be centralized

Do not hand-copy `repositoryCheckoutId` into dozens of action declarations.

Refactor the existing Git action helpers so:

- `gitInspectionAction(...)` automatically adds a required bounded `repositoryCheckoutId` param;
- `gitMutationAction(...)` automatically adds a required bounded `repositoryCheckoutId` param.

Use a reasonable bound consistent with existing source/check-out IDs.

The generated JSON Schema and Zod schema must therefore agree automatically.

`list_repository_checkouts` should be registered as an ordinary read action within the `git_toolbox` provider, not a Git inspection action.

## 13. Tool dispatch resolves checkout before Git authorization

Current tool dispatch does:

```text
resolve Project workspace
→ assert Project root Git capability
→ dispatch Git against context.root
```

Replace Git-tool routing with:

```text
resolve Project workspace
→ validate action params
→ resolve repositoryCheckoutId beneath that Project
→ assert Git action has validated checkout context
→ dispatch against checkout.root
```

For Git actions, Project-root `context.gitBacked` is no longer the authorization condition.

Update `assertActionAccess()` or the adjacent dispatch boundary so:

- Git inspection/mutation requires a successfully resolved checkout context;
- non-Git Project root is not a blocker;
- lack of an explicit checkout context fails closed;
- non-Git actions remain unchanged.

Do not remove `AgentHarnessWorkspaceContext.gitBacked` in this card. It remains a diagnostic/backward-compatibility fact about the Project root and is still used by other surfaces such as release tooling.

It must simply stop deciding `git_toolbox` availability.

## 14. Git dispatch must never fall back to Project root

For every actual `git_toolbox` operation:

```text
Git cwd = resolved RepositoryCheckout root
```

Never:

```text
Git cwd = context.root
```

as a fallback.

This applies even if the Project workspace root happens to be Git-backed during the transition.

Required hard-cut behavior:

- Git-backed Project root + no registered checkout → Git action unavailable;
- non-Git Project root + valid registered checkout → Git action succeeds;
- unknown checkout ID → fails closed;
- stale checkout registration → fails closed;
- no automatic root fallback.

Do not add a `legacy-primary` pseudo-checkout or `"." ` checkout path.

WTR03C will normalize physical Project topology.

## 15. Existing managed-worktree APIs are transitional, not the Project identity model

Current `managedWorktrees.ts` registers linked worktrees as separate MCP workspaces using `mcp_worktree_...` IDs.

Do not remove or redesign that machinery in WTR02D.

However, when a `git_toolbox` action such as:

- `list_worktrees`;
- `inspect_worktree`;
- `create_worktree_from_ref`;
- isolated-operation actions;

needs a repository root from which to operate, use the explicitly selected RepositoryCheckout root rather than the Project root.

Existing nested params named `workspaceId` for managed-worktree operations remain transitional and are not renamed in this card.

Do not treat those managed workspace IDs as substitutes for the top-level Project `workspaceId`.

## 16. Repository toolbox remains Project-container-relative

Do not change `repo_toolbox` dispatch.

It continues to receive:

```text
context.root = Project container root
```

and filesystem paths remain Project-relative.

This card must prove that a non-Git Project container can simultaneously support:

- `repo_toolbox.read_file` against the Project root;
- `git_toolbox.status` against a registered checkout below that Project.

The two operations must touch different roots by design.

## 17. AgentHarnessService application boundary

Expose application-facing methods equivalent to:

```ts
registerRepositoryCheckout(
  workspaceId: string,
  checkout: RepositoryCheckout,
): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary>

unregisterRepositoryCheckout(
  workspaceId: string,
  repositoryCheckoutId: string,
): Promise<...> | ...
```

These methods delegate to the workspace registry.

They are for ChampCity application/runtime orchestration.

Do not expose an MCP tool that lets the model register a path.

WTR02F/WTR03C will later call this boundary after they create/establish checkouts.

## 18. MCP prompt contract

Update:

`src/main/integrations/mcpWorkspacePromptContract.ts`

so generated MCP instructions state the semantic split clearly.

Add concise requirements equivalent to:

```text
- workspaceId identifies the Project container, not a Git checkout.
- repo_toolbox operates on the Project container.
- git_toolbox Git actions require an exact registered repositoryCheckoutId.
- Use git_toolbox.list_repository_checkouts to discover registered checkout IDs when Git access is needed.
- Never invent a checkout ID or substitute a branch/path for repositoryCheckoutId.
```

Do not expose local paths in the prompt.

Do not change the existing exact-workspace/fail-closed rules.

## 19. Error semantics

Use existing Agent Harness error taxonomy.

Required outcomes:

### Missing repositoryCheckoutId

Schema/runtime validation:

`INVALID_INPUT`

### Unknown repositoryCheckoutId under a valid Project workspace

`WORKSPACE_ACCESS_DENIED`

Message must identify the semantic problem without exposing paths.

### Registered checkout missing, moved, redirected, or no longer an exact Git working-tree root

`GIT_CAPABILITY_UNAVAILABLE` or `WORKSPACE_UNAVAILABLE`

Choose one consistently for checkout-runtime unavailability and prove it.

Do not return raw Git/local path diagnostics to MCP callers.

### Unknown Project workspaceId

remains:

`WORKSPACE_ACCESS_DENIED`

## 20. Registry compatibility rules

Existing ordinary workspace registrations must continue to load.

Existing legacy managed-worktree registrations must continue to load.

For old Project entries with no checkout registrations:

- Project workspace remains available;
- `repo_toolbox` remains available;
- `list_repository_checkouts` returns empty;
- actual Git actions cannot infer/use Project root.

No registry migration assistant, legacy mode, or duplicate authority is introduced.

## 21. Permanent proof — Project workspace + explicit checkout routing

Primary owner:

`test/agent-harness/registered-workspace-registry.test.cjs`

Extend the existing non-Git workspace test or add a bounded sibling test.

Required proof:

1. register a non-Git Project container;
2. `registration.workspace.gitBacked === false`;
3. `repo_toolbox` read/write/search still operates on Project container;
4. create a Git checkout fixture at the WTR02C-valid `Dev` location through test setup only;
5. register a valid `RepositoryCheckout` descriptor for it through `AgentHarnessService`/registry;
6. no absolute path appears in persisted checkout descriptor or public summary;
7. `git_toolbox.list_repository_checkouts` returns the registered ID;
8. `git_toolbox.status` with that `repositoryCheckoutId` succeeds;
9. Git evidence comes from `Dev`, not Project root;
10. the Project root remains non-Git;
11. Git status without `repositoryCheckoutId` is rejected as invalid input;
12. unknown checkout ID fails closed;
13. unregistering the routing record does not delete/mutate the Git checkout;
14. after unregister, Git targeting that ID fails.

Test setup may initialize Git in the fixture checkout. Production registration code must not.

## 22. Permanent proof — no Project-root fallback

Add proof, preferably in the same registry test or Git-toolbox local operations suite:

1. create/register a Project root that itself happens to be Git-backed;
2. register **no** RepositoryCheckout;
3. call a Git action;
4. prove it does not operate against Project root and fails for missing explicit checkout target;
5. register an explicit valid checkout beneath the Project;
6. prove the same Git action now operates only against that checkout.

This is the hard-cut invariant.

## 23. Git toolbox public schema proof

Update existing public contract owners:

- `test/agent-harness/agent-harness-core.test.cjs`
- `test/agent-harness/reserved-toolbox-namespace.test.cjs`

Required proof:

- `list_repository_checkouts` is published under `files.read`;
- `status` and another inspection action require `params.repositoryCheckoutId`;
- representative mutations require `params.repositoryCheckoutId`;
- missing target fails schema validation;
- arbitrary `repositoryCheckoutPath`, `checkoutRoot`, or similar path argument is rejected;
- read-only scope still excludes mutation actions;
- top-level `workspaceId` remains required.

Update exact action inventories/counts only as required by this one new action.

## 24. Existing Git-toolbox behavioral suites

Update the permanent Git-toolbox test plumbing rather than weakening action coverage.

Primary existing suites:

- `test/agent-harness/git-toolbox-local-operations.test.cjs`
- `test/agent-harness/git-toolbox-remote-operations.test.cjs`
- `test/agent-harness/git-toolbox-tag-operations.test.cjs`
- `test/support/git-mutation-fixtures.cjs`

The test fixture should represent:

```text
non-Git Project container
→ explicitly registered existing Dev or Workflow RepositoryCheckout
→ git_toolbox calls carry repositoryCheckoutId
```

Do not globally change `createBoundWorkspace()` in a way that alters unrelated SourceControlService/WorkIntake tests.

Prefer adding dedicated Git-toolbox Project/checkout fixture helpers and adapting only Git-toolbox callers.

All existing bounded Git operation semantics must remain otherwise unchanged.

## 25. HTTP/process tests

If existing HTTP/process-boundary tests directly call `git_toolbox`, adapt those calls mechanically to register/select an explicit fixture checkout.

Do not redesign HTTP/MCP transport.

Likely owners include:

- `test/agent-harness/agent-harness-runtime.test.cjs`;
- `test/agent-harness/agent-harness-process-boundary.test.cjs`;
- corresponding process fixture only if selected/required.

Only make the changes required by the new public Git target contract.

## 26. Expected production scope

Expected:

- `src/shared/workspaceContracts.ts`
- `src/main/agentHarness/workspace/workspaceAccess.ts`
- `src/main/agentHarness/workspace/registeredWorkspaceRegistry.ts`
- `src/main/agentHarness/runtime/agentHarnessService.ts`
- `src/main/agentHarness/tools/toolRegistry.ts`
- `src/main/integrations/mcpWorkspacePromptContract.ts`

WTR02C contract consumption may require imports from:

- `src/shared/sourceLifecycleContracts.ts`
- `src/main/sourceControl/projectSourceTopology.ts`

Do not alter their WTR02C semantics unless a direct compile defect is found and reported.

Expected test/support scope:

- `test/agent-harness/registered-workspace-registry.test.cjs`
- `test/agent-harness/agent-harness-core.test.cjs`
- `test/agent-harness/reserved-toolbox-namespace.test.cjs`
- Git-toolbox behavioral suites named in §24;
- directly affected HTTP/process tests if needed;
- a narrowly scoped support helper under `test/support/` if needed.

`validation/capability-map.json` may change only for accurate test/action metadata.

Any additional production file requires direct compile/runtime necessity explained in the Implementer Report.

## 27. Explicit non-scope

Do **not** in WTR02D:

- create Main/Dev checkouts;
- create Workflow worktrees;
- initialize or relocate Git;
- modify `projectSourceBootstrap.ts`;
- implement Repository common metadata at `.champcity/repository.git`;
- implement checkout materialization;
- generate RepositoryCheckout IDs;
- change SourceBinding source materialization;
- change `WorkSourceOwner`;
- change source branch naming;
- change SourceCheckpoint/IntegrationRecord ownership;
- change Source Graph Workflow identity;
- remove legacy managed-worktree machinery;
- make RepositoryCheckout canonical Project State;
- implement Existing Project Registration;
- normalize an existing conventional repository;
- add arbitrary-path Git targeting;
- add implicit Project-root Git fallback;
- change `release_toolbox` Git targeting;
- begin WTR02E+ or WTR03C.

## 28. Acceptance criteria

WTR02D is complete only when:

1. non-Git Project root remains a valid registered MCP workspace;
2. `repo_toolbox` remains Project-container-relative;
3. existing RepositoryCheckout descriptors can be registered beneath a Project workspace;
4. checkout registration stores no absolute host path;
5. checkout registration validates the exact existing Git root and performs no mutation;
6. checkout resolution is revalidated at every Git use;
7. `git_toolbox.list_repository_checkouts` discovers bounded semantic checkout IDs;
8. every actual Git action requires `repositoryCheckoutId`;
9. all actual Git actions run against the resolved checkout root;
10. Project-root `gitBacked` no longer gates `git_toolbox`;
11. there is no implicit Project-root fallback, even for a Git-backed Project root;
12. models cannot submit checkout paths through the public tool contract;
13. unknown/stale checkout targets fail closed;
14. existing bounded Git operation behavior remains otherwise intact;
15. MCP prompts explain the Project/checkout split;
16. no checkout materialization or WTR02E+ behavior is implemented.

## 29. Validation

Run bounded validation attributable to this card.

Required:

1. `npm run build`;
2. focused registry/routing:
   - `node --test test/agent-harness/registered-workspace-registry.test.cjs`;
3. focused public schema:
   - `node --test test/agent-harness/agent-harness-core.test.cjs test/agent-harness/reserved-toolbox-namespace.test.cjs`;
4. focused Git behavior:
   - `node --test test/agent-harness/git-toolbox-local-operations.test.cjs test/agent-harness/git-toolbox-remote-operations.test.cjs test/agent-harness/git-toolbox-tag-operations.test.cjs`;
5. any directly modified HTTP/process test explicitly;
6. validation planner preview for the exact final changed-path manifest using the work-item profile;
7. `npm run test:affected -- --changes <exact-changed-path manifest>`;
8. `git diff --check`.

Do not run the historical full suite unless the exact affected plan selects it.

Affected failures belonging solely to deferred WTR02E/F/G/H or WTR03C source-materialization/topology fixtures may remain classified as deferred. WTR02D-owned MCP/Git-tool routing proof must pass.

## 30. Implementer Report

Write:

`docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02D_IMPLEMENTER_REPORT.md`

Include:

- starting SHA;
- all files changed;
- exact checkout registry storage shape;
- application registration/unregistration API;
- public checkout summary shape;
- checkout resolution/revalidation algorithm;
- exact Git-tool schema change;
- `list_repository_checkouts` behavior;
- proof that non-Git Project root + valid checkout works;
- proof that Git-backed Project root has no implicit fallback;
- representative inspection and mutation routing evidence;
- MCP prompt changes;
- focused validation results;
- affected failures classified by owning later card;
- explicit confirmation that no Git/check-out materialization, source naming, Project State persistence, release-toolbox migration, or WTR02E+ behavior was implemented.

Do not edit the committed report afterward solely to add its own checkpoint hash.

## 31. Git checkpoint authority and stop boundary

The Operator has already authorized routine card-local Git mechanics for WTR.

After implementation, focused validation, and the Implementer Report:

1. inspect the exact attributable staged diff;
2. run the repository safety scan;
3. create exactly one WTR02D checkpoint commit.

Suggested subject:

`WTR02D route MCP Git through RepositoryCheckout targets`

No additional Operator Git approval is required.

Do not push, merge, tag, release, reset, clean, restore unrelated files, or perform Git actions outside this card.

Then **STOP**.

Do not begin WTR02E.

The Architect will review WTR02D before the Workflow-owned source naming/creation card is released.
