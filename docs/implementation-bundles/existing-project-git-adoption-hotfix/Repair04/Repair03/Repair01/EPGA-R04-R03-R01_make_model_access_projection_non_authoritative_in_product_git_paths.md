# EPGA-R04-R03-R01 — Make Model-Access Projection Non-Authoritative in Product Git Paths

**Parent:** Existing Project Git Adoption Hotfix / Repair04 / Repair03  
**Implementation baseline:** `2a83d482fbbf2924cd1562aa17106b77d437a529`  
**Architect review:** `../EPGA_R04_R03_ARCHITECT_REVIEW_2026-09-29.md`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Complete the Source Control / model-access separation in the actual ChampCity A/I product path.

Repair03 correctly decoupled Source Control services from Agent Harness registration. This Repair removes the remaining user-facing hard dependency where `main.ts` requires Agent Harness success before deterministic Git work can begin or reports a completed source transition as failed because downstream model-access projection failed.

Core invariant:

> ChampCity A/I Source Control owns Git. Agent Harness/MCP model-access projection may observe, quiesce, publish, or revoke access, but it must never determine whether application-owned Git bootstrap/conversion succeeds.

## 1. Existing Project application path must not require Agent Harness to start conversion

Current invalid order:

```text
register Agent Harness workspace
-> revoke conventional model access
-> run Source Control conversion
```

Replace with a coordinator that treats model-access quiescence as conditional.

Required behavior:

1. determine the deterministic conventional descriptor from application-owned identity;
2. if Agent Harness/model-access control is available, attempt bounded quiesce/revocation;
3. if Agent Harness is unavailable before Source Control starts, record a model-access warning/state and continue Source Control conversion;
4. execute `applyExistingProjectGitAdoption()`;
5. after successful conversion, attempt Main/Dev projection separately;
6. Source Control success remains success even if projection fails.

Do not call public MCP tools.

Do not reintroduce Source Control -> Agent Harness callbacks.

## 2. Preserve safety when Agent Harness is live

Do not simply ignore a live model operation racing a destructive topology cutover.

If the Agent Harness is reachable and reports an active checkout lease that cannot be drained/revoked within the bounded existing retirement semantics:

- fail the **model-access quiescence phase before Git cutover begins**;
- do not start destructive Source Control mutation;
- surface a specific model-access-busy/unavailable error;
- leave conventional Git untouched.

Distinguish:

```text
Agent Harness absent/unavailable
=> no reachable model-access authority to quiesce
=> Source Control may proceed

Agent Harness live but active checkout cannot safely drain
=> bounded safety blocker before Source Control mutation
```

Do not equate transport absence with an active lease.

## 3. Greenfield product bootstrap must execute before projection

Current invalid order:

```text
agentHarness.registerWorkspace(root)
-> bootstrapProjectSource()
```

Required order:

```text
bootstrapProjectSource()
-> register Current Project/source state
-> attempt model-access workspace/checkouts projection
```

Agent Harness outage must not prevent creation of:

- canonical managed bare repository;
- Main checkout;
- Dev checkout;
- initial baseline;
- Current Project source registration.

If projection is unavailable, preserve successful application state and surface model-access degraded status separately.

## 4. Managed Existing Project reopen must not require Agent Harness before source verification

For `project:registerCurrent("existing")` with `managed-ready` source:

1. verify Source Control topology first;
2. register/open Current Project;
3. attempt workspace + Main/Dev projection afterward.

An Agent Harness outage must not make a valid managed Project appear source-invalid.

## 5. Projection failure must not reject a completed source conversion as conversion failure

Current behavior throws from `project:applyExistingGitAdoption` after Git conversion succeeds if Main/Dev projection fails.

Replace this with a structured outcome or another bounded product mechanism that preserves the distinction:

```ts
{
  sourcePlan: ...,
  sourceApplied: true,
  modelAccess: {
    state: "ready" | "degraded",
    error: string | null
  }
}
```

Exact public shape may differ if existing renderer/API compatibility suggests a cleaner option.

Requirements:

- source conversion success is never reported as source conversion failure solely because projection failed;
- the renderer can continue to Current Project registration after successful source conversion;
- degraded model access is visible/actionable;
- retrying model-access projection must not rerun/destructively repeat Git conversion.

## 6. Current Project registration must not be rolled back by projection outage

For both Existing and Greenfield paths:

- Current Project source registration is application state;
- model-access projection is downstream integration state.

If projection fails after source registration:

- keep Current Project registration;
- keep source topology;
- expose degraded model-access status;
- allow later idempotent reconciliation.

Do not delete/undo Project State or Git because MCP/model access is down.

## 7. Workflow model launch behavior remains strict

Repair03 got this boundary right.

Workflow source materialization may complete without Agent Harness.

Before launching an Implementer/model into that checkout:

- exact projection must succeed;
- if projection fails, block/retry **model execution only**;
- do not roll back Workflow Git/source materialization.

Preserve this behavior.

## 8. Add an application-level "Agent Harness unavailable" proof

The previous Repair proved Source Control service functions independently.

Now prove the actual product composition.

Add a focused main/preload/controller owner where:

- `getAgentHarnessServiceHostClient()` or its relevant calls fail as unavailable before Existing Project conversion;
- the Source Control conversion still completes;
- Current Project registration still completes;
- final topology is managed and valid;
- returned/product state marks model access degraded.

Add equivalent Greenfield proof:

- Agent Harness unavailable;
- managed Git bootstrap succeeds;
- Current Project registration succeeds;
- model access is degraded, not source-invalid.

## 9. Add a live-but-busy quiescence proof

Prove:

1. conventional model-access checkout is live with one active lease;
2. Existing Project conversion is requested;
3. bounded quiescence cannot complete;
4. Source Control destructive cutover has not begun;
5. root conventional `.git` remains authoritative;
6. user receives a model-access/quiescence blocker, not a Git conversion failure journal.

Then release the lease and prove retry succeeds.

## 10. Add post-conversion projection outage proof

Prove:

1. Source Control Existing Project conversion succeeds;
2. Main/Dev projection then fails synthetically;
3. conversion journal/receipt is completed;
4. root conventional Git is no longer authoritative;
5. Current Project registration can still proceed;
6. renderer/product state reports degraded model access;
7. a later projection retry succeeds without rerunning conversion.

## 11. Add Greenfield projection outage proof

Prove:

1. Greenfield source bootstrap succeeds;
2. Project registration succeeds;
3. model-access projection fails;
4. Main/Dev/baseline remain valid;
5. later projection reconciliation succeeds idempotently.

## 12. Neutralize generic Git infrastructure placement

Repair03's runtime authority direction is correct, but Source Control still imports:

- `agentHarness/repository/boundedGit`;
- `agentHarness/core/errors`.

These are generic application Git/error utilities and should not remain semantically owned by the model-access subsystem.

Move or introduce neutral application-owned modules, for example:

```text
src/main/sourceControl/gitExecution.ts
src/main/core/applicationErrors.ts
```

or another clear neutral boundary.

Requirements:

- one implementation of bounded Git execution; do not duplicate behavior;
- Agent Harness Git tooling may consume the neutral Git executor;
- Source Control must not import from `agentHarness/*` after this repair except shared type-only contracts if absolutely unavoidable;
- `repositoryCheckoutDescriptors.ts` must be a genuinely application-owned/pure descriptor module.

Update the permanent import guard to reject **all production imports from `src/main/sourceControl/*` into `src/main/agentHarness/*`**, not only runtime/tools paths.

If moving these generic utilities is unexpectedly broad because many Agent Harness consumers depend on them, stop and report exact dependency scope rather than duplicating code.

## 13. Preserve Repair03 wins

Do not regress:

- Source Control functions with no checkout-registration ports;
- deterministic RepositoryCheckout factories;
- private checkout-list control removal;
- public MCP checkout discovery;
- Workflow materialization-before-projection ordering;
- projection failure preserving ready Workflow Git state;
- Repair02 build-generation fencing;
- source-preservation and schema-3 recovery behavior.

## Permanent proof

At minimum prove:

1. actual Existing Project desktop composition converts and registers Current Project with Agent Harness unavailable;
2. actual Greenfield desktop composition bootstraps/registers with Agent Harness unavailable;
3. managed Existing Project reopen works with Agent Harness unavailable;
4. live-but-busy model-access lease blocks destructive conversion before Git mutation;
5. Source Control conversion success remains success if post-conversion projection fails;
6. Greenfield source/Project state remains valid if projection fails;
7. later projection retry is idempotent and does not rerun source mutation;
8. Workflow model execution still requires successful projection before launch;
9. Source Control production modules import no `agentHarness/*` implementation modules;
10. public MCP Git discovery remains available;
11. private checkout-list control remains absent;
12. Repair02 Service Host generation fencing remains passing;
13. current failed schema-3 qualification state remains retryable;
14. `git diff --check` passes.

## Validation

Run focused validation only:

- production build/typecheck;
- Current Project entry/controller owner;
- Existing Project managed-source owner;
- Greenfield bootstrap owner;
- Workflow source materialization + model-launch owner;
- model-access projection owner;
- Agent Harness registry/public MCP contract owner;
- Service Host lifecycle/protocol owner for retained Repair02 behavior;
- capability-map integrity;
- repair validation-plan preview;
- `git diff --check`.

Do not run the broad regression suite.

## Report

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair03/Repair01/Reports/EPGA-R04-R03-R01_IMPLEMENTER_REPORT.md`

The report must state:

- actual product ordering before/after;
- behavior when Agent Harness is unavailable;
- behavior when Agent Harness is live but checkout lease is busy;
- behavior when projection fails after Source Control succeeds;
- whether generic Git/error utilities were moved to a neutral boundary;
- proof that no Source Control production module imports Agent Harness implementation.

## Checkpoint and STOP

Commit:

`EPGA-R04-R03-R01 make model access non-authoritative in product Git paths`

Then STOP for Architect review.

Do not retry the real ChampCity_AI conversion until this Repair01 checkpoint is accepted.
