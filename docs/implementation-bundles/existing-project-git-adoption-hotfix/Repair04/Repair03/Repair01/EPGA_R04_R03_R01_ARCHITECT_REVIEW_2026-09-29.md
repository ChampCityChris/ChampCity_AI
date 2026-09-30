# EPGA Repair04 / Repair03 / Repair01 Architect Review — 2026-09-29

**Implementation checkpoint:** `aee844a82ad977243570ed63e70f3fbb8a9f4376`  
**Parent:** `1f8dc16eccf7d0404dcc6da63ba4e2e2468551ab`  
**Disposition:** **BLOCKED — QUIESCENCE FAILURE CLASSIFICATION IS TOO BROAD**

## Summary

Repair01 materially completes the intended Source Control / model-access separation:

- Existing Project Source Control conversion no longer requires Agent Harness success;
- Greenfield bootstrap now occurs before model-access projection;
- managed reopen verifies/registers application state before model-access projection;
- completed source conversion is no longer converted into a source failure when downstream projection fails;
- model-access reconciliation is explicitly retryable;
- Workflow source materialization remains valid when projection fails while model launch still requires exact projected access;
- generic Git/error/repository infrastructure moved out of Agent Harness ownership;
- Source Control production modules no longer import Agent Harness implementation modules.

Those are the correct architectural changes.

One blocking safety defect remains in `quiesceConventionalProjectModelAccess()`.

## Blocking finding — every workspace-registration failure is treated as Agent Harness absence

Current implementation:

```ts
try {
  port = portFactory();
  const registration = await port.registerWorkspace(projectRoot);
  workspaceId = registration.workspace.workspaceId;
} catch (error) {
  return degraded(error);
}
```

That catch classifies **all** failures from `registerWorkspace()` as "Agent Harness unavailable" and allows Source Control conversion to continue.

The controlling Repair01 card required a narrower distinction:

```text
Agent Harness absent/unavailable
=> model access is degraded
=> Source Control may proceed

Agent Harness live but model-access authority cannot be safely established/quiesced
=> block before destructive Git mutation
```

A live Service Host can reject `registerWorkspace()` for semantic/runtime reasons such as:

- workspace registry conflict;
- checkout reconciliation/validation failure;
- invalid live response;
- protocol/build-generation incompatibility;
- another live model-access state error.

Those are not proof that Agent Harness is absent.

With the current catch-all, a live Agent Harness that cannot establish trustworthy workspace/model-access state can be silently downgraded to "degraded" and the application can proceed into destructive Existing Project Git conversion without proving that live model access was quiesced.

That recreates a race the Repair01 safety rule was specifically intended to prevent.

## Required behavior

Only errors that positively mean **no usable live model-access authority is reachable** may become degraded/non-authoritative state.

Examples may include explicitly typed lifecycle/transport absence states such as:

- background agent intentionally stopped;
- endpoint absent;
- service host unavailable after bounded discovery;
- equivalent typed transport-unavailable state.

Errors proving a live host responded but rejected/failed semantic control must block before Source Control mutation.

Do not classify by parsing human-readable error strings.

Use typed error codes/states already exposed by the Service Host client where possible.

## Required proof

Add focused product-level proof for at least:

1. port factory/endpoint absence -> degraded -> conversion proceeds;
2. explicitly stopped/unavailable Agent Harness -> degraded -> conversion proceeds;
3. live `registerWorkspace` returning a semantic registry error -> conversion does **not** begin;
4. live protocol/build incompatibility -> conversion does **not** begin;
5. live busy checkout retirement -> existing blocker remains;
6. after the live semantic problem is repaired, exact retry succeeds.

For blocked live-host cases prove:

- root conventional `.git` remains authoritative;
- no conversion migration journal/candidate is created;
- `applyExistingProjectGitAdoption()` is not called.

## Defect ownership

This is an **Implementer defect**.

The Repair01 card explicitly required distinguishing model-access absence from a live authority that cannot be safely quiesced. The implementation reduced that distinction to a catch-all around `registerWorkspace()`.

## Confirmed accepted portions

No repair is requested for these parts unless needed by the classification correction:

- Source Control / Agent Harness dependency inversion is corrected;
- neutral `core/gitExecution.ts` and `core/applicationErrors.ts` placement;
- generic repository modules moved out of Agent Harness;
- post-conversion projection degradation semantics;
- Current Project registration survives projection outage;
- Greenfield source creation survives projection outage;
- Workflow materialization-before-projection behavior;
- public MCP Git discovery;
- private checkout-list control remains removed;
- Repair02 Service Host build-generation fencing remains retained.

## Separate known UI defect

The previously identified sidebar **Clear Project -> Open Project** migration bypass still exists in `App.tsx` and is outside this Repair01 checkpoint. It remains queued as a separate project-entry routing defect and must be repaired before release qualification.

## Next repair

Implement:

`../Repair02/EPGA-R04-R03-R02_distinguish_model_access_absence_from_live_quiescence_failure.md`

Do not retry the real ChampCity_AI conversion until Repair02 is reviewed and accepted.
