# RCO-HF01 Architect Review — 2026-09-27

**Implementation checkpoint:** `8bf3b49137f6c044ebcd4b0af353739022ad2c2a`  
**Disposition:** ACCEPTED  
**Blocking status:** CLEARED — WRB04 may resume from its released continuation after the pending Architect documentation is checkpointed.

## Review conclusion

RCO-HF01 restores the intended MCP abstraction.

The public Agent Harness MCP again treats `workspaceId` as the normal resource identity. `repositoryCheckoutId` is additive and optional for exact alternate-checkout targeting.

No ChampCity A/I Workflow, Current Project, WorkIntake, SourceBinding, SourceLine, WorkItem, or Project State identity is required to use ordinary MCP Git operations.

## Production code review

The production change is intentionally small.

### Tool contract

`withRepositoryCheckoutId(...)` still centralizes the selector across Git inspection and mutation actions, but the selector is no longer required.

This restores compatibility without creating parallel tool contracts.

### Dispatch

The dispatcher now:

1. resolves the registered workspace;
2. validates the action parameters;
3. resolves a RepositoryCheckout only when `repositoryCheckoutId` is actually supplied;
4. otherwise keeps the ordinary workspace context;
5. applies the existing Git capability check;
6. dispatches against the resulting root.

This is the correct workspace-first boundary.

### Checkout discovery

`listRepositoryCheckoutSummaries` now accepts every exact registered workspace rather than only Project entries.

Explicit checkout resolution/registration retains the existing Project-entry and containment constraints.

No arbitrary filesystem path targeting or checkout search was added.

## Root-cause review

The Implementer identified local history evidence that the regression entered at:

`cd9383b9dd7949685e6d6fd20f52546695c9c89b` — `WTR02D route MCP Git through RepositoryCheckout targets`

That change:
- made the checkout selector mandatory;
- unconditionally routed every Git call through checkout resolution;
- changed non-Git workspace behavior from capability failure to input failure;
- modified fixtures so every Git request carried a checkout selector.

This contradicted the earlier adopted checkout architecture and RCO03 acceptance requirement that omitted checkout context preserve primary-workspace behavior.

The RCA is accepted.

## Permanent proof review

The new MCP-level production-path scenario is appropriately placed in the existing contract-generation owner.

It exercises:
- real registered workspace registry;
- HTTP MCP runtime;
- MCP SDK client;
- published JSON Schema;
- Zod input schema;
- runtime parameter validation;
- real synthetic Git repositories and worktrees.

It proves:
- workspace-only Git inspection;
- workspace-only stage/commit mutation;
- optional alternate checkout targeting;
- distinct primary/alternate HEAD and dirty state;
- non-Git workspace capability failure;
- non-Git workspace checkout discovery and selected checkout use;
- wrong-workspace/unknown/path-shaped selector rejection;
- old workspace-only request compatibility;
- optional selector schema;
- repo/diagnostics ordinary workspace behavior;
- no application workflow fixture dependency.

Focused validation passed 99/99 plus build and capability-map integrity.

## Live MCP verification

The repaired live server is currently reporting:
- readiness: `ready`;
- published tool contract: `all-current`;
- stale MCP sessions: `0`;
- current Git toolbox inventory includes `list_repository_checkouts` and the normal Git action set.

This already-open ChatGPT client has an older captured tool schema: it cannot invoke the newer `list_repository_checkouts` action or supply the additive selector through its cached client-side schema.

That is now safe and expected compatibility behavior rather than a server failure.

Using that old client schema, the live repaired server successfully executed:
- `git_toolbox.status(workspaceId = "champcity_ai")`;
- `inspect_branch_state`;
- `inspect_history`;
- `diff`.

Those calls previously failed because the server demanded an unpublishable mandatory checkout selector.

The additive explicit-checkout path is covered end-to-end by the fresh MCP SDK client in permanent production-path proof. A newly initialized external client will receive the current published schema; existing clients do not need to reconnect merely to retain ordinary workspace Git behavior.

## No blocking findings

No blocking security, ownership, compatibility, or correctness defect was found in RCO-HF01.

The hotfix does not:
- weaken checkout containment;
- permit arbitrary roots;
- add workflow-specific MCP routing;
- remove exact checkout targeting;
- create another Git toolbox;
- require session invalidation for compatibility.

## Disposition

RCO-HF01 is ACCEPTED.

The MCP contract regression no longer blocks WRB04.

The original architecture rule remains controlling:

> `workspaceId` is sufficient for normal MCP operation. A registered `repositoryCheckoutId` may optionally select another exact checkout, but application-specific workflow/source topology is never a prerequisite for generic MCP use.
