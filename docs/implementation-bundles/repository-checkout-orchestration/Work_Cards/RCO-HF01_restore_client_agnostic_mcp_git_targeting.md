# RCO-HF01 — Restore Client-Agnostic MCP Workspace Git Targeting

**Type:** Blocking Hotfix  
**Owner:** Agent Harness / MCP  
**Blocks:** further WRB04 implementation until accepted  
**Governing architecture:**
- `docs/architecture/CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md`
- `docs/implementation-bundles/repository-checkout-orchestration/Work_Cards/RCO03_make_repository_and_mcp_inspection_checkout_aware.md`
- `docs/governance/EXTERNAL_MCP_PROVIDER_GOVERNANCE.md`

**Implementer Report:** `docs/implementation-bundles/repository-checkout-orchestration/Implementer_Reports/RCO-HF01_IMPLEMENTER_REPORT.md`

## Incident

The public ChampCity MCP Git contract has regressed from a generic workspace-based MCP API into an application-coupled checkout API.

Current production code does both of the following:

1. `gitInspectionAction(...)` and `gitMutationAction(...)` centrally add `repositoryCheckoutId` as a **required** parameter through `withRepositoryCheckoutId(...)`.
2. The tool dispatcher unconditionally resolves every Git inspection/mutation through:

```ts
resolveRepositoryCheckoutContext(workspaceId, repositoryCheckoutId)
```

and replaces the normal workspace root with that checkout root before dispatch.

This violates the adopted architecture and the original RCO03 card, both of which explicitly require checkout identity to be optional and existing no-checkout behavior to remain compatible.

Observed external failure:

- an MCP client connected to workspace `champcity_ai` has a public `git_toolbox` schema in which ordinary calls such as `status`/branch inspection do not carry a required checkout selector;
- the running server now rejects the call because its runtime contract requires `repositoryCheckoutId`;
- supplying the selector is also impossible to that client when its published schema does not allow the field.

The result is an impossible public MCP contract.

## Root architectural rule

The ChampCity MCP is a standalone, client-agnostic MCP service.

It is **not** an internal-only ChampCity A/I workflow adapter.

A caller may be:
- ChatGPT;
- Codex;
- another model/agent;
- a generic MCP client;
- ChampCity A/I itself;
- a future client not aware of ChampCity A/I workflows.

Therefore:

> `workspaceId` is the normal MCP resource identity. A Git-backed registered workspace must remain fully usable by ordinary Git tools using `workspaceId` alone.

`repositoryCheckoutId` is an **optional explicit target selector** for callers that need a different registered checkout.

It may extend normal MCP behavior. It must never replace the workspace abstraction or require knowledge of ChampCity A/I Project, Workflow, WorkIntake, SourceBinding, SourceLine, or execution topology.

## Existing architecture that must be restored

The concurrent-checkout architecture already states:

> Repository and MCP file/source-control operations must be keyed by Repository identity plus optional `checkoutId`.

and:

> If no checkout is specified, existing compatibility behavior may target the registered primary checkout.

RCO03 likewise requires:

1. checkout-aware inspection;
2. optional checkout selection;
3. preservation of existing calls without checkout context.

This hotfix restores those rules. It does not invent a new source-control model.

## Objective

Restore a public MCP contract in which:

```text
workspaceId
   |
   +-- no repositoryCheckoutId
   |      -> operate on the registered workspace root
   |         if that workspace itself is Git-backed
   |
   +-- repositoryCheckoutId supplied
          -> resolve that exact registered checkout
             under the same workspace
          -> operate on that checkout
```

No application workflow state participates in this decision.

## 1. Make RepositoryCheckout selection optional

Replace the current required central parameter injection.

Current behavior equivalent to:

```ts
repositoryCheckoutId: {
  type: "string",
  required: true,
}
```

must become optional.

Use one central helper so inspection and mutation contracts cannot drift.

The public parameter name may remain `repositoryCheckoutId`; this hotfix does not require a naming migration.

Required public behavior:

- `git_toolbox.status(workspaceId)` is valid.
- `git_toolbox.inspect_branch_state(workspaceId)` is valid.
- `git_toolbox.stage_changes(workspaceId, paths)` is valid.
- `git_toolbox.commit(workspaceId, message)` is valid.
- the same operations may optionally include `repositoryCheckoutId`.

Do not introduce a second Git toolbox or ChampCity-A/I-specific variant.

## 2. Restore workspace-first Git target resolution

In the generic tool dispatcher:

1. resolve the registered `workspaceId` normally;
2. validate action parameters;
3. for Git inspection/mutation:
   - when `repositoryCheckoutId` is absent, keep the resolved workspace context unchanged;
   - when `repositoryCheckoutId` is supplied, resolve that checkout under the exact same workspace and substitute only the Git/filesystem root required for that action;
4. run normal Git capability/access validation;
5. dispatch.

Conceptually:

```ts
let context = await resolveWorkspaceContext(workspaceId);

if (isGitAction && repositoryCheckoutId !== undefined) {
  const checkout = await resolveRepositoryCheckoutContext(
    workspaceId,
    repositoryCheckoutId,
  );
  context = checkoutContext(context, checkout);
}

assertActionAccess(context, actionKind);
dispatch(context);
```

Do **not** call `resolveRepositoryCheckoutContext` when the selector is absent.

## 3. Generic behavior for a Git-backed workspace

When the registered workspace root itself is Git-backed:

- no selector means the Git operation targets that exact workspace root;
- existing status/diff/history/stage/commit/branch/tag/push semantics remain available;
- registered alternate checkouts do not make the primary workspace ambiguous;
- callers are not required to discover checkout inventory before ordinary Git use.

This is the primary compatibility behavior required by this hotfix.

## 4. Generic behavior for a non-Git workspace

A non-Git workspace remains a valid MCP workspace for non-Git tools.

For a Git action with no checkout selector:

- request/schema validation must succeed;
- Git access then returns the normal bounded `GIT_CAPABILITY_UNAVAILABLE` class because the selected workspace root is not Git-backed.

It must **not** fail as:
- missing `repositoryCheckoutId`;
- invalid tool input;
- missing ChampCity Project source state;
- missing Workflow/SourceBinding.

If registered checkouts exist, a generic client may:
1. call `list_repository_checkouts`;
2. select one by optional `repositoryCheckoutId`;
3. use normal Git actions on it.

That discovery path is generic MCP behavior, not a Workflow prerequisite.

## 5. Checkout containment remains fail-closed

When an optional selector is supplied:

- resolve only a checkout registered beneath the exact `workspaceId`;
- verify its descriptor and exact Git working-tree root;
- reject an unknown ID;
- reject a checkout belonging to another workspace/repository;
- do not accept arbitrary absolute paths;
- do not scan the filesystem looking for worktrees.

Restoring default workspace behavior must not weaken checkout containment.

## 6. Keep application-specific state out of MCP routing

The generic MCP Git target resolver must not query or require:

- Project State;
- Current Project registration;
- WorkIntake;
- Workflow;
- SourceBaseline;
- SourceBinding;
- SourceLine;
- WorkItem;
- integration state;
- active ChampCity A/I workspace/stage.

ChampCity A/I may derive a `repositoryCheckoutId` and pass it when it needs an exact managed checkout.

That is an application concern layered **above** the MCP.

The MCP itself only understands:
- registered workspace;
- optional registered repository checkout;
- filesystem/Git capabilities.

## 7. Audit the entire public MCP surface for the same coupling

Do a bounded contract audit for `repositoryCheckoutId`, `checkoutId`, Workflow/source identity, or equivalent fields.

Required result:

- no ordinary public MCP tool becomes unusable unless the caller understands ChampCity A/I workflow internals;
- Git tools use workspace-first + optional checkout selection;
- repository/file tools retain normal workspace behavior;
- test/build/validation/release/provider tools retain their existing workspace contracts;
- explicit checkout inventory/registration actions may naturally require checkout identity where that identity is the operation's subject.

Do not expand this card into a redesign of every toolbox.

Fix only accidental application-coupling discovered by this audit.

## 8. Preserve checkout-aware capability

This hotfix must **not** regress RCO03's intended capability.

A client that explicitly supplies a valid `repositoryCheckoutId` must still be able to inspect/mutate that exact checkout where the action is otherwise allowed.

Required contrast:

```text
status(workspaceId)
    -> primary registered Git workspace

status(workspaceId, repositoryCheckoutId=B)
    -> registered checkout B
```

The two views may legitimately report different branch/HEAD/dirty state.

## 9. Public contract evolution must remain backward-compatible

The MCP server must not rely on reconnecting or invalidating clients merely because an additive checkout selector was introduced.

This hotfix restores compatibility by making the new field optional.

Required rule for this public API:

> Adding an optional target selector must not invalidate clients that captured the earlier workspace-only schema.

Add permanent contract proof that:

- a request conforming to the pre-checkout Git schema still validates and executes;
- a current client may additionally supply the optional selector;
- runtime parameter validation and generated/published MCP schema derive from the same action contract;
- `repositoryCheckoutId` is absent from the required-property set for ordinary Git actions.

Do not solve this hotfix by force-closing sessions or requiring client reconnect.

Future genuinely breaking public MCP changes must be versioned or given an explicit compatibility path; they must not silently redefine an existing action.

## 10. `list_repository_checkouts` remains discovery, not admission

`git_toolbox.list_repository_checkouts` must:

- require only the normal workspace identity;
- return the bounded registered checkout inventory for that workspace;
- return an empty inventory when no alternate checkouts are registered;
- never itself require `repositoryCheckoutId`.

A generic client can discover optional targets without ChampCity A/I product knowledge.

## 11. Inspection and mutation must use the same target semantics

Do not repair read operations while leaving mutations checkout-mandatory.

The following classes all use the same optional target-resolution rule:

- status/diff/history/branch/tag/remotes;
- stage/unstage/restore;
- commit/amend/revert/cherry-pick;
- branch/ref operations;
- fetch/push;
- bounded worktree operations where the selected repository context is relevant.

Actions whose explicit subject is a separately named managed worktree/operation may keep their own required operation/worktree identity.

The optional repository target must not become a second ambiguous authority for those explicit operation IDs.

## 12. Required RCA

The Implementer Report must identify:

- the commit/change that changed checkout selection from optional to mandatory, if determinable from local history;
- whether the regression entered in RCO03 implementation or a later refactor;
- why permanent tests did not catch violation of RCO03 acceptance criterion 5;
- whether generated MCP schemas and runtime validators are produced from the same contract source;
- whether any other toolbox acquired a similar required application-specific field.

Do not speculate when history/evidence is unavailable.

## Required permanent proof

At minimum prove all of the following with synthetic registered workspaces/checkouts and MCP-level invocation tests:

1. **Conventional Git workspace, no selector**
   - `status` succeeds with `workspaceId` only.
   - branch/history inspection succeeds with `workspaceId` only.

2. **Git mutation, no selector**
   - a bounded mutation path such as stage + commit succeeds against the registered Git workspace without `repositoryCheckoutId`.

3. **Optional alternate checkout**
   - primary workspace and selected alternate checkout can return distinct HEAD/status evidence.
   - selector targets only the requested registered checkout.

4. **Non-Git workspace, no selector**
   - MCP request is structurally valid.
   - Git action returns `GIT_CAPABILITY_UNAVAILABLE`, not input-schema failure.

5. **Non-Git workspace + selected checkout**
   - checkout discovery succeeds.
   - selected Git checkout can be inspected.

6. **Wrong-workspace checkout**
   - fails closed with the existing workspace access-denied class.

7. **Old-client compatibility**
   - a request shaped exactly like the pre-checkout Git contract still succeeds against current runtime.

8. **Current contract**
   - generated schema exposes optional `repositoryCheckoutId`.
   - it is not present in the required set.

9. **Discovery**
   - `list_repository_checkouts` works without a selector.

10. **Unaffected MCP tools**
    - representative `repo_toolbox` and non-Git toolbox calls still use only normal workspace semantics.

11. **No application workflow dependency**
    - generic Git invocation succeeds without any Current Project/Workflow/SourceBinding state fixture.

## Primary code to inspect

At minimum:

- `src/main/agentHarness/tools/toolRegistry.ts`
- `src/main/agentHarness/workspace/workspaceAccess.ts`
- `src/main/agentHarness/workspace/registeredWorkspaceRegistry.ts`
- Agent Harness MCP schema/contract publication code
- Agent Harness MCP invocation/parameter validation
- repository checkout registration/discovery contracts

Likely focused tests include:

- MCP tool contract generation;
- registered workspace access;
- repository checkout routing;
- Git mutation boundary/local operations;
- MCP request dispatch/tool invocation.

Inspect actual owners before adding new permanent test files.

## Negative constraints

Do not:

- require ChampCity A/I Current Project state for generic MCP use;
- require Workflow/WorkItem/source lifecycle identity;
- make `repositoryCheckoutId` mandatory on ordinary Git actions;
- change `workspaceId` semantics to mean a ChampCity A/I Project container;
- add arbitrary filesystem path targeting;
- add a second app-specific Git toolbox;
- weaken cross-workspace containment;
- remove checkout discovery/targeting;
- force all active MCP clients to reconnect as the repair mechanism;
- touch WRB04 runtime behavior except documentation needed to mark it blocked;
- run broad historical workflow suites.

## Validation

Run:

- build/typecheck through the repository's supported lane;
- focused MCP tool-contract-generation tests;
- focused registered-workspace / checkout-routing tests;
- focused Git inspection and mutation tests;
- one MCP-level synthetic compatibility scenario covering both omitted and supplied checkout selector;
- capability-map integrity if test ownership changes;
- exact validation-plan preview;
- `git diff --check`.

Do not use the full historical test suite as a completion gate.

## Acceptance criteria

This hotfix is accepted only when:

1. a generic MCP client can use a Git-backed registered workspace with `workspaceId` alone;
2. `repositoryCheckoutId` is optional and additive;
3. explicit checkout targeting still works;
4. non-Git workspace Git calls fail at capability resolution rather than schema validation;
5. checkout discovery requires no application workflow state;
6. wrong-workspace checkout selection remains fail-closed;
7. old workspace-only MCP request shapes remain compatible;
8. no public MCP tool requires ChampCity A/I workflow/source semantics merely to function;
9. generated schema and runtime validation agree;
10. focused permanent proof would have caught the current regression.

## Report and checkpoint

Write:

`docs/implementation-bundles/repository-checkout-orchestration/Implementer_Reports/RCO-HF01_IMPLEMENTER_REPORT.md`

Suggested commit:

`RCO-HF01 restore client-agnostic MCP Git targeting`

After the checkpoint: **STOP for Architect review.**

Do not resume WRB04 until this hotfix is accepted and the live MCP is refreshed/restarted through its normal deployment mechanism so the repaired public contract can be verified from an external client.
