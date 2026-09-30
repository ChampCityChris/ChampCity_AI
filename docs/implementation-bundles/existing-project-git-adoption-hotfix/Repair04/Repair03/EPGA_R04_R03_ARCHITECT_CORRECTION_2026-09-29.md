# EPGA Repair04 / Repair03 Architect Correction — 2026-09-29

**Current implementation checkpoint:** `e10bc59e5813cd7be769d1c92b9e71a51200d11b`  
**Disposition:** **ARCHITECTURE CORRECTION REQUIRED**

## Decision

Do **not** roll the repository back to a pre-Repair04 commit.

Repair04 and Repair02 contain independently valid work that should not be discarded wholesale:

- Git-neutral Project workspaces;
- explicit model-facing RepositoryCheckout targeting;
- atomic Agent Harness checkout lease retirement;
- truthful schema-3 conversion journaling and rollback;
- staged candidate repository preparation;
- source-preservation fixes;
- Service Host/worker operation-inventory parity;
- Service Host build-generation fencing.

The defect is the subsystem boundary introduced around those changes.

ChampCity A/I Source Control was made dependent on Agent Harness RepositoryCheckout registration state. That is backwards.

## Correct product boundary

ChampCity A/I is the harness.

It contains separate capabilities:

```text
ChampCity A/I
|
+-- Source Control
|    +-- owns Git repositories, topology, branches, worktrees, commits, integration
|    +-- executes bounded Git CLI mechanics
|    +-- must not depend on Agent Harness, MCP, or an LLM
|
+-- Workflow / execution orchestration
|    +-- asks Source Control for deterministic source mechanics
|
+-- Agent / model runtimes
|
+-- MCP / Agent Harness model-access adapter
     +-- exposes selected application capabilities to external models
     +-- may expose git_toolbox
     +-- mirrors which application-owned checkouts a model is permitted to access
     +-- is never Source Control authority
```

## Confirmed inversion

Current production Existing Project conversion accepts a `checkoutRegistration` port backed by Agent Harness.

During conversion it calls:

```text
checkoutRegistration.listRepositoryCheckouts(workspaceId)
checkoutRegistration.unregisterRepositoryCheckout(...)
```

to discover and retire the conventional checkout before moving Git topology.

Rollback again lists Agent Harness checkout registrations to discover Main/Dev registrations to remove.

That means Source Control asks the model-access subsystem what repository/checkouts exist before it can complete deterministic Git work.

That dependency is invalid.

The application already owns the topology and deterministic checkout identities. Model-access registration is only a projection of that state.

## Repair02 status

Repair02 checkpoint `e10bc59...` successfully repaired the private `list-repository-checkouts` transport and added build-generation fencing.

The transport repair was technically correct against the card, but the card was solving the wrong architectural dependency.

Therefore:

- retain generic operation-inventory parity improvements;
- retain build-generation fencing where independently useful to Agent Harness lifecycle;
- remove the private checkout-list operation if no legitimate non-Source-Control consumer remains;
- remove all Source Control reliance on that operation.

## Public MCP Git tools are separate

Public:

`git_toolbox.list_repository_checkouts`

remains a legitimate external-model discovery surface.

It allows an external model that deliberately uses ChampCity's Git tools to select an application-approved checkout without receiving arbitrary filesystem paths.

It is **not** part of ChampCity A/I Git orchestration.

No Source Control service may call public MCP tools.

## Application-to-Agent-Harness registration is projection, not Source Control

The harness may still publish/revoke model access after Source Control changes state.

That communication belongs in an application/model-access projection layer outside Source Control.

Source Control should return deterministic topology and RepositoryCheckout descriptors.

A sibling application coordinator may then:

```text
Source Control succeeds
    ->
model-access projector publishes/reconciles checkout exposure
```

For a destructive topology transition, the top-level application coordinator may quiesce already-exposed model access before invoking Source Control. That is harness orchestration between sibling subsystems, not Source Control consulting MCP.

## Acceptance invariant

The permanent architectural proof is:

> ChampCity A/I Source Control remains fully functional when Agent Harness/MCP is not instantiated.

Existing Project conversion, Greenfield bootstrap, managed Main/Dev creation, workflow checkout materialization, and deterministic Git mechanics must be testable without an Agent Harness checkout-registration port.

Model execution may separately require successful model-access projection before a model is launched into a checkout.

## Next card

Implement:

`EPGA-R04-R03_decouple_source_control_from_agent_harness_model_access.md`

Do not retry the real ChampCity_AI conversion until Repair03 is implemented and reviewed.
