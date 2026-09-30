# EPGA Repair04 / Repair03 Architect Review — 2026-09-29

**Implementation checkpoint:** `2a83d482fbbf2924cd1562aa17106b77d437a529`  
**Parent:** `7909dc55cf2df3985d4d024ed949b46071fabfe4`  
**Disposition:** **BLOCKED — PRODUCT PATH STILL HARD-DEPENDS ON AGENT HARNESS**

## Summary

Repair03 made the core Source Control services materially cleaner and corrected the original authority inversion:

- Existing Project conversion no longer lists Agent Harness checkout state;
- Source Control no longer registers/unregisters model-access checkout projections itself;
- deterministic conventional/Main/Dev/Workflow descriptors are centralized;
- Workflow materialization completes Git/source state before downstream projection;
- the private `list-repository-checkouts` Service Host/worker operation was removed;
- public MCP `git_toolbox.list_repository_checkouts` remains external-model tooling;
- useful Repair02 Service Host generation fencing was retained.

Those are the right architectural changes.

However, the actual desktop product path still requires Agent Harness/model-access coordination *before* deterministic Git work can begin. That leaves the user-visible Git lifecycle dependent on the model-access subsystem even though the Source Control service functions themselves are now independently callable.

Repair03 therefore does not yet satisfy the controlling product invariant.

## Blocking finding 1 — Existing Project conversion still requires Agent Harness before Source Control

Current production path in `src/main/main.ts`:

```text
project:applyExistingGitAdoption
  -> getAgentHarnessServiceHostClient()
  -> agentHarness.registerWorkspace(root)
  -> revokeRepositoryCheckoutAccess(...)
  -> applyExistingProjectGitAdoption(...)
```

If Agent Harness is stopped, unavailable, incompatible, or cannot register/revoke the projection, the application never reaches Source Control conversion.

The card explicitly allowed pre-cutover model-access quiescence only **if Agent Harness is live**.

The required architecture is:

```text
attempt model-access quiesce if available
  -> Source Control conversion remains executable regardless
  -> reconcile projection afterward
```

The current implementation is still:

```text
Agent Harness success is a prerequisite
  -> then Source Control may run
```

That is still a hard cross-subsystem dependency in the actual ChampCity A/I product path.

Direct unit-level Source Control independence is necessary but not sufficient.

## Blocking finding 2 — Greenfield Git bootstrap is also blocked by Agent Harness availability

Current `project:registerCurrent("greenfield")` path performs:

```text
agentHarness.registerWorkspace(root)
  -> createSourceControlService(...).bootstrapProjectSource()
```

Therefore a model-access/runtime outage prevents deterministic Greenfield Git creation from starting.

Repair03's governing invariant says Agent Harness failure must not invalidate application-owned source topology.

The product path must be reordered so Source Control bootstraps first, then model-access projection is attempted separately.

A projection failure may block launching a model later, but it must not prevent application-owned Git bootstrap or Current Project source registration.

## Blocking finding 3 — Successful source conversion is surfaced as a failed conversion when projection fails

After `applyExistingProjectGitAdoption()` succeeds, `main.ts` publishes Main/Dev access.

On projection failure it currently throws:

```text
Existing Project source conversion completed, but Agent Harness model access could not be published.
```

The renderer controller treats `applyExistingProjectGitAdoption()` as the gate before Current Project registration.

So the filesystem/Git conversion can complete successfully while the IPC call rejects and the normal product path stops before Current Project registration.

This is exactly the partial-success state Repair03 was intended to separate.

Model-access projection failure must be represented as model-access state/warning, not as failure of the completed source conversion transaction.

The same principle applies to Greenfield and managed reopen.

## Architectural concern — Source Control remains semantically nested under Agent Harness utilities

The runtime authority inversion is substantially fixed, but Source Control still imports generic Git/error infrastructure from:

- `agentHarness/repository/boundedGit`;
- `agentHarness/core/errors`.

This does not by itself reintroduce MCP/model mediation, and it is not the primary blocker for the qualification retry.

However, it preserves an incorrect package-direction signal: application-owned Source Control depends on implementation utilities located under the model-access subsystem.

The follow-on repair should move or alias generic bounded Git execution and application/source errors into a neutral or Source Control-owned module, then let Agent Harness consume those utilities if needed.

Do not duplicate Git execution implementations.

## Confirmed passes

The review confirms:

- private runtime `list-repository-checkouts` is removed;
- public MCP checkout discovery remains;
- `existingProjectGitAdoptionService` has no checkout-registration port;
- `establishManagedProjectSource` returns deterministic Main/Dev descriptors without Agent Harness calls;
- Greenfield bootstrap returns deterministic descriptors without Agent Harness calls;
- Workflow source materialization creates/verifies Git and marks SourceBinding ready before projection;
- workflow projection failure does not roll back valid Git/source state;
- workspace tree is clean at checkpoint;
- focused build/test evidence in the Implementer report is consistent with the changed architecture.

## Defect ownership

These blockers are primarily an **Architect specification/composition miss**, not an Implementer failure.

The Repair03 card explicitly permitted a top-level coordinator but did not state strongly enough that the *user-facing application operation itself* must continue through Source Control when model-access coordination is unavailable.

The Implementer followed the permitted sequencing and correctly separated the Source Control service internals.

## Required repair

Proceed with:

`Repair01/EPGA-R04-R03-R01_make_model_access_projection_non_authoritative_in_product_git_paths.md`

Do not retry the real ChampCity_AI conversion until Repair03 / Repair01 is implemented and reviewed.
