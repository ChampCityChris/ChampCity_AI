# EPGA Repair04 / Repair03 / Repair03 / Repair04 Architect Review — 2026-09-30

**Implementation checkpoint:** `b8cc37753da54e0b5e79ce758442ab4389a55618`  
**Parent:** `69e7af8c989ff20c6f03a22e1793f90b04854ff8`  
**Disposition:** **ACCEPTED — REAL CHAMPCITY_AI QUALIFICATION RETRY AUTHORIZED**

## Review result

Repair04 closes the model-access projection defect identified in the prior Architect review.

The implementation now preserves the intended authority direction:

```text
application-owned source topology
-> neutral machine source-operation fence
-> deterministic Source Control transition
-> downstream Agent Harness/model-access reconciliation
```

Source Control does not consult Agent Harness, MCP, Service Host controls, or model-facing checkout state to authorize Git mechanics.

## Accepted correction

`reconcileWorkspaceRepositoryCheckouts(...)` now acquires the neutral shared Project source-operation lease before:

- reading current checkout projection state;
- inspecting whether the Project root is an exact conventional Git working tree;
- publishing the deterministic conventional checkout;
- retiring the deterministic conventional checkout.

That means Agent Harness startup/workspace registration cannot inspect or alter checkout projection while Desktop holds the exclusive source-transition lease.

## Exact topology reconciliation

For an exact conventional Git root:

- deterministic conventional model access is projected if missing;
- the descriptor identity remains stable.

For a Project root that is no longer conventional Git:

- the deterministic conventional projection is retired idempotently;
- application-owned Git state is not mutated.

After successful Existing Project conversion, downstream reconciliation therefore produces:

```text
Main -> role main
Dev  -> role dev
```

with no stale conventional root checkout.

Public `git_toolbox.list_repository_checkouts` sees that same current projection.

## Real application-sequence proof

The corrected product-path proof now includes the previously missing state:

```text
conventional Git Project
-> Agent Harness workspace registration
-> conventional checkout projected
-> Existing Project migration warning
-> Operator accepts
-> exclusive machine source fence
-> deterministic conversion
-> downstream reconciliation
-> conventional removed
-> Main/Dev projected
```

The final registry and public MCP discovery both contain only Main and Dev.

Managed reopen keeps those checkout identities stable and does not recreate conventional access.

## Failed-transition behavior

The focused cross-process proof confirms Agent Harness reconciliation waits behind the Desktop exclusive source fence.

If the source transition fails and conventional root Git is restored, reconciliation after fence release sees the restored topology and preserves/restores the same deterministic conventional access identity.

This remains model-access reconciliation; Source Control itself has no Agent Harness rollback dependency.

## Boundary verification

Architect inspection confirms:

- no production `src/main/sourceControl/*` import into `agentHarness/*`;
- the private `list-repository-checkouts` Service Host/worker control remains absent;
- public MCP checkout discovery remains available;
- machine source fencing remains neutral application infrastructure;
- previously accepted project-entry fixes remain unchanged;
- working tree was clean at the implementation checkpoint.

## Validation disposition

The Implementer report records:

- production build pass in the normal Windows lane;
- 17/17 registered-workspace/model-access owner pass;
- 19/19 Current Project/entry owner pass;
- 65/65 focused dependency/boundary owners pass;
- repair-plan preview pass;
- `git diff --check` pass.

Architect review relied on code, contract, and focused-owner evidence; no broad regression suite or real Project conversion was run during review.

## Qualification authorization

The hotfix is now authorized for the real ChampCity_AI Existing Project qualification retry.

Use the normal application path:

```text
Open Existing Project
-> select ChampCity_AI
-> review migration warning
-> Accept and Convert
```

Do not manually clean the preserved migration evidence before retry.

If qualification fails, preserve:

- exact UI error;
- migration journal/receipt;
- root `.git` authority state;
- Main/Dev state;
- model-access state;
- retained recovery paths.

Do not perform manual Git cleanup before Architect RCA.
