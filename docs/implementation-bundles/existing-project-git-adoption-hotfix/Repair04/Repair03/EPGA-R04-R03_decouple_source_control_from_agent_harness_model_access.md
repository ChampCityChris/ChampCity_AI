# EPGA-R04-R03 — Decouple Source Control from Agent Harness Model Access

**Parent:** Existing Project Git Adoption Hotfix / Repair04  
**Current baseline:** `e10bc59e5813cd7be769d1c92b9e71a51200d11b`  
**Architect correction:** `EPGA_R04_R03_ARCHITECT_CORRECTION_2026-09-29.md`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Remove Agent Harness / MCP model-access state from ChampCity A/I's Source Control authority path.

Source Control owns Git. It must perform deterministic repository, branch, worktree, commit, integration, bootstrap, and conversion mechanics without requiring an Agent Harness checkout-registration service.

RepositoryCheckout remains a useful shared semantic descriptor. Agent Harness may expose those application-owned checkouts to models. That exposure is a downstream projection, not a Source Control dependency.

Do not revert the repository wholesale. Preserve valid Repair02/03/04 safety improvements that are independent of this coupling.

## 1. Source Control must not depend on Agent Harness registration

Remove required or optional Agent Harness checkout-registration/listing ports from Source Control domain operations where they currently participate in Git success/failure.

At minimum inspect and correct:

- `existingProjectGitAdoptionService.ts`;
- `managedProjectSourceService.ts`;
- `projectSourceBootstrap.ts`;
- `sourceControlService.ts`;
- `workflowSourceMaterializationService.ts`.

The acceptance rule is:

> A Source Control operation must not require an Agent Harness client, MCP server, workspace registry, checkout-registration transport, model session, or LLM.

Source Control may produce RepositoryCheckout descriptors as part of its result.

## 2. Existing Project conversion owns its topology directly

Remove this conversion behavior:

```text
list Agent Harness RepositoryCheckouts
-> discover conventional registration
-> unregister discovered registration
-> perform Git cutover
```

The conversion already knows the Project root, Repository identity, source topology, and deterministic conventional/Main/Dev identities.

It must determine its Git transition from application-owned Source Control state only.

Specifically:

- remove `listRepositoryCheckouts` from the Existing Project conversion input contract;
- remove conversion-time discovery of conventional checkout identity through Agent Harness;
- remove rollback-time listing of Agent Harness checkouts to discover Main/Dev registrations;
- remove conversion success/failure dependence on Agent Harness list/register/unregister results.

The schema-3 migration journal must describe Git/source recovery only. Do not make model-access projection status part of Git authority.

## 3. Split managed-source establishment from model-access publication

Today `establishManagedProjectSource()` verifies managed topology and registers Main/Dev through a `ManagedProjectCheckoutRegistration` port.

Split those responsibilities.

Source Control result should contain deterministic application-owned data equivalent to:

```ts
{
  projectContainerRoot,
  repositoryMetadataRoot,
  mainCheckoutRoot,
  devCheckoutRoot,
  repositoryId,
  mainCheckout: RepositoryCheckout,
  devCheckout: RepositoryCheckout,
  materialized
}
```

It must not require Agent Harness registration in order to succeed.

If public/result compatibility requires retaining summary-shaped fields temporarily, derive them locally without calling Agent Harness, or introduce a clean replacement type. Do not disguise an Agent Harness call as a Source Control result.

## 4. Centralize deterministic checkout descriptor generation

Create or consolidate pure application-owned descriptor factories for:

- conventional root checkout;
- managed Main;
- managed Dev;
- Workflow checkout.

The factory must not:

- inspect MCP state;
- contact Agent Harness;
- run a model;
- require public MCP tool discovery.

It may use existing Source Lifecycle / topology contracts.

The same descriptor factory should be used by both Source Control results and the downstream model-access projector so identity cannot drift between subsystems.

## 5. Move conventional checkout reconciliation out of Source Control

`repositoryCheckoutReconciliationService.ts` currently lives under `sourceControl/` but its purpose is to publish model-facing checkout authority after workspace registration.

Move/refactor this responsibility into an application/model-access integration layer.

The resulting component may:

- inspect application-owned Source Control topology;
- generate the deterministic descriptor;
- publish/revoke Agent Harness checkout exposure.

It must not be imported by Source Control services.

Naming should reflect model-access projection rather than Git authority, for example:

- `repositoryCheckoutAccessProjectionService`;
- `modelSourceAccessProjectionService`.

Exact name is implementer choice if the boundary is clear.

## 6. Keep top-level harness coordination separate from Source Control

ChampCity A/I may coordinate sibling subsystems around a destructive topology transition.

A valid shape is:

```text
Application conversion coordinator
    |
    +-- quiesce/revoke currently exposed model access, if Agent Harness is live
    |
    +-- Source Control conversion
    |
    +-- reconcile/publish resulting Main/Dev model access
```

Rules:

- the coordinator is outside Source Control;
- it does not call public MCP tools;
- Source Control does not call back into Agent Harness;
- if Agent Harness is not running, Source Control remains independently executable;
- model-access reconciliation errors are reported as model-access errors, not as evidence that Git conversion itself failed.

If an active model operation must be drained before destructive topology mutation, that drain belongs to the model-access coordination phase, not the Source Control implementation.

## 7. Existing Project conversion must be independently testable

Add a focused owner proving conversion succeeds with no Agent Harness object at all.

The fixture must:

1. create a conventional Git project;
2. inspect and consent to conversion;
3. execute Existing Project normalization using Source Control only;
4. verify managed bare metadata;
5. verify exact Main and Dev worktrees;
6. verify root conventional `.git` is no longer authoritative;
7. verify baseline/history/source preservation requirements;
8. verify schema-3 journal/receipt completion.

No fake checkout-registration port should be supplied merely to satisfy the function signature.

## 8. Greenfield/bootstrap must be independently testable

Prove Project source bootstrap and managed Main/Dev establishment work without Agent Harness.

Source Control should return checkout descriptors that may later be projected to model access.

Failure of Agent Harness must not invalidate a successfully created Git topology.

## 9. Workflow checkout materialization must be independently testable

Workflow source materialization must create/verify the Git branch and worktree using Source Control mechanics only.

It should return the deterministic Workflow `RepositoryCheckout` descriptor.

Before an Implementer/model is launched, the application/model-access layer may publish that descriptor to Agent Harness.

If publication fails:

- the Git worktree remains valid application state;
- the model execution is blocked/retried as a model-access problem;
- Source Control must not roll back a correct Git checkout solely because MCP/Agent Harness exposure failed.

## 10. Public MCP git_toolbox remains external-model tooling

Do not remove public:

`git_toolbox.list_repository_checkouts`

solely because Source Control is being decoupled.

The public tool remains a legitimate model-facing read surface over Agent Harness's projected checkout-access registry.

Likewise, external model Git actions may continue requiring exact `repositoryCheckoutId`.

The invariant is:

```text
Source Control state -> model-access projection -> MCP Git tools
```

Never:

```text
MCP / Agent Harness state -> Source Control authority
```

## 11. Remove the private checkout-list control operation if unused

After decoupling Source Control, search production consumers of private:

`list-repository-checkouts`

across:

- Service Host protocol;
- worker protocol;
- controller;
- client;
- application code.

If there is no legitimate non-Source-Control application consumer, remove the private operation and its dedicated transport proof.

Do not remove the public MCP `git_toolbox.list_repository_checkouts` action. It reads Agent Harness registry state directly and is a separate interface.

If a legitimate private consumer remains, document it explicitly in the Implementer report and keep the operation bounded.

## 12. Preserve useful Repair02 lifecycle hardening

Do not mechanically revert `e10bc59...`.

Retain, where still independently valid:

- operation inventory derived from one authoritative constant rather than drifting type/set declarations;
- Service Host build-generation fencing;
- controlled replacement of a compatible stale Service Host;
- typed protocol/build incompatibility failures;
- lifecycle tests proving current Desktop does not send unsupported ordinary controls to a stale host.

Remove only code/tests whose sole purpose is supporting the now-invalid private checkout-list dependency.

## 13. Preserve conversion safety work

Do not regress:

- Repair02 fresh managed integration-policy generation;
- Repair03 bounded source inventory/staging;
- ignored/local-state separation;
- non-following link handling;
- schema-3 migration journaling;
- candidate repository staging;
- root Git cutover ordering;
- Windows bounded rename retry;
- primary-failure-preserving rollback;
- current failed-state recovery without manual deletion.

## 14. Model-access projection proof

Add a separate application-layer integration proof:

1. Source Control establishes conventional or managed topology without Agent Harness.
2. Model-access projector is then invoked.
3. Agent Harness receives the deterministic RepositoryCheckout descriptor.
4. Public MCP checkout discovery exposes it.
5. Revocation removes model access without mutating Git.
6. Reconciliation is idempotent.
7. Agent Harness unavailability does not corrupt or roll back Git state.

This proves projection direction explicitly.

## 15. Architectural dependency guard

Add a permanent static/import or focused architecture test that prevents Source Control modules from importing:

- Agent Harness runtime client/server/controller;
- MCP server/runtime modules;
- public tool registry/toolbox implementation.

Shared neutral contracts such as `RepositoryCheckout` are allowed.

The dependency must point outward from application composition/model-access integration toward Source Control, never inward from Source Control toward MCP/Agent Harness runtime.

## Permanent proof

At minimum prove:

1. Existing Project conversion passes without Agent Harness/MCP instantiated.
2. Greenfield bootstrap passes without Agent Harness/MCP instantiated.
3. managed Main/Dev verification passes without Agent Harness/MCP instantiated.
4. Workflow checkout materialization passes without Agent Harness/MCP instantiated.
5. Source Control returns deterministic conventional/Main/Dev/Workflow descriptors.
6. Agent Harness projection can publish those descriptors afterward.
7. Agent Harness projection can revoke them without Git mutation.
8. Agent Harness projection failure leaves valid Git topology intact.
9. public MCP checkout discovery still works after successful projection.
10. Source Control has no runtime imports/dependencies on Agent Harness/MCP implementation.
11. private checkout-list control is removed if no legitimate consumer remains.
12. useful Repair02 build-generation fencing remains passing.
13. source-preservation and current failed-state recovery proofs remain passing.
14. non-Git Project workspace remains a first-class model-access workspace.
15. `git diff --check` passes.

## Validation

Run focused owners only:

- production build;
- Source Control Existing Project managed-source owner;
- Project bootstrap owner;
- Workflow materialization owner;
- application/model-access projection owner;
- Agent Harness registry/MCP public-contract owner;
- Service Host lifecycle/protocol owner only for retained lifecycle changes;
- Current Project entry owner;
- capability-map integrity;
- repair validation-plan preview;
- `git diff --check`.

Do not run the broad regression suite.

## Report

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair03/Reports/EPGA-R04-R03_IMPLEMENTER_REPORT.md`

The report must explicitly identify:

- Source Control dependencies removed;
- new application/model-access projection boundary;
- whether private `list-repository-checkouts` was removed;
- what parts of Repair02 were retained;
- proof that Source Control succeeds with Agent Harness absent;
- proof that MCP projection is downstream only.

## Checkpoint and STOP

Commit:

`EPGA-R04-R03 decouple source control from model access`

Then STOP for Architect review.

Do not retry the real ChampCity_AI conversion until Repair03 is reviewed and accepted.
