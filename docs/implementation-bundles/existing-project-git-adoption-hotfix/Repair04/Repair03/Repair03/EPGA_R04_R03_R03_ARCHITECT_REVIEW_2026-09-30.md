# EPGA Repair04 / Repair03 / Repair03 Architect Review — 2026-09-30

**Implementation checkpoint:** `b1d4942e2c149417157fea76a9809a76d684cc80`  
**Parent:** `99a34f8667bcd1d6728eb283378dc7e41ab7fcb7`  
**Disposition:** **BLOCKED — MODEL-ACCESS PROJECTION CAN RETAIN STALE CONVENTIONAL CHECKOUT**

## Summary

Repair03 correctly fixes the two primary architectural defects:

- Existing Project Git conversion now uses a neutral machine-owned cross-process source-operation fence rather than Agent Harness quiescence.
- Sidebar Open/Change Project and Clear Project now route through canonical Project admission instead of raw workspace activation.

The neutral coordinator, exclusive conversion fence, shared public-tool dispatch fence, canonical Existing Project admission controller, Clear-to-landing behavior, and Current Project-only Project Intake repository binding are all directionally correct.

One production-path defect remains before the real ChampCity_AI qualification retry.

## Blocking finding — conventional model-access projection survives successful conversion

The real application folder-selection path still calls:

```text
workspace:choose
-> AgentHarnessServiceHostClient.registerWorkspace(projectRoot)
-> AgentHarnessService.registerWorkspaceRoot(...)
-> reconcileWorkspaceRepositoryCheckouts(...)
```

For a conventional Git Project, that reconciliation registers the deterministic model-facing conventional checkout at Project-relative path `.`.

Repair03 correctly stopped unregistering that checkout *before* conversion. The machine source fence now makes pre-conversion Agent Harness retirement unnecessary.

However, after successful conversion, the downstream model-access reconciliation currently only publishes Main and Dev. It does not remove the obsolete conventional checkout.

Current downstream path:

```text
successful conversion
-> release exclusive source lease
-> reconcileProjectModelAccess(root, [Main, Dev])
-> registerWorkspace(root)
-> publish Main
-> publish Dev
```

`reconcileWorkspaceRepositoryCheckouts()` currently behaves as:

```text
if root is exact conventional Git:
    add conventional if missing
else:
    return registrations unchanged
```

Therefore an already-registered conventional checkout survives the conversion even though root `.git` is gone.

The resulting Agent Harness registry can contain:

```text
conventional  .     unavailable/stale
main          Main  available
dev           Dev   available
```

while `reconcileProjectModelAccess()` reports model access as `ready`.

That is not a truthful projection of application-owned source state.

## Why the current test missed it

The existing product-path test calls `admitExistingProject()` with a synthetic `chooseWorkspaceFolder` function that returns a selected root directly.

That bypasses the real main-process `workspace:choose` behavior which registers the workspace with Agent Harness before the migration warning is shown.

As a result, the test starts conversion without the conventional checkout having first been projected, so its assertion that only Main/Dev remain does not exercise the real application sequence.

## Related fence gap — Agent Harness source-topology reconciliation is not itself leased

Public tool execution correctly acquires the neutral shared Project source lease.

But Agent Harness workspace registration/startup also runs `reconcileWorkspaceRepositoryCheckouts()`, which performs Git-root inspection and mutates model-access checkout projection without taking the neutral shared source lease.

That means Service Host startup or workspace re-registration can inspect/reconcile checkout topology while the Desktop owns the exclusive conversion lease.

This control-plane reconciliation is model-access work and must obey the same neutral machine fence as public model tool calls.

Source Control must not call Agent Harness. The correction belongs entirely on the Agent Harness/model-access side as a consumer of the application-owned fence.

## Required behavior

After repair:

1. Selecting a conventional Git Existing Project may project `conventional`.
2. Existing Project conversion acquires exclusive machine source ownership.
3. Agent Harness workspace/source reconciliation cannot run through that exclusive interval.
4. Source Control conversion succeeds independently.
5. After exclusive release, downstream model-access reconciliation observes managed topology.
6. The obsolete deterministic conventional checkout is removed idempotently.
7. Main and Dev are projected.
8. Public MCP checkout discovery returns only the current application-approved checkout set.
9. Model-access status is `ready` only when that projection is current.

No private checkout-list Service Host control needs to be restored.

## Confirmed accepted portions

No repair is requested for these areas unless needed by the focused correction:

- neutral cross-process source-operation coordinator;
- exclusive Existing Project conversion lease;
- public Agent Harness tool shared leases;
- Agent Harness absence being irrelevant to Git authority;
- Source Control independence from Agent Harness/MCP;
- neutral Git/error/repository module placement;
- canonical Existing Project admission;
- sidebar Open/Change delegation;
- Clear Project returning to landing;
- Current Project requirement for Project workspace activation;
- Project Intake repository binding to Current Project root;
- downstream degraded model-access semantics;
- Retry Model Access;
- private `list-repository-checkouts` control remains removed;
- public MCP `git_toolbox.list_repository_checkouts` remains external-model tooling.

## Defect ownership

This is primarily an **Implementer completeness defect**, with some Architect scope ambiguity.

The controlling card required Agent Harness/model access to obey the neutral source fence and required downstream reconciliation after conversion. The implementation fenced public tool dispatch but not Agent Harness checkout reconciliation, and downstream reconciliation publishes new checkout descriptors without retiring the obsolete conventional descriptor.

The card did not explicitly spell out the exact stale-conventional cleanup assertion, so that omission is also an Architect review responsibility.

## Next repair

Implement:

`Repair04/EPGA-R04-R03-R04_reconcile_model_access_to_exact_source_topology.md`

Do not retry the real ChampCity_AI Existing Project conversion until Repair04 is reviewed and accepted.
