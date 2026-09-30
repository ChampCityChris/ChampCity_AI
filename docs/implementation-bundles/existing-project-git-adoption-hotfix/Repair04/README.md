# Existing Project Git Adoption — Repair04

**Starting baseline:** `07d2e543e6c64ec4214fef7027bf853cefdfb1ab`  
**Repair04 implementation:** `643ea5ed24552b34b9cafa3592b4965703fdb28c`  
**Repair01 checkpoint:** `f59d5d779f8192d14f47c1175d3a33b871b0c2e4`  
**Repair02 checkpoint:** `e10bc59e5813cd7be769d1c92b9e71a51200d11b`  
**Status:** **REPAIR03 ACTIVE — QUALIFICATION BLOCKED**

## Current architecture correction

Repair04 correctly established that:

- a Workspace is a Git-neutral model-access directory;
- non-Git workspaces are first-class;
- RepositoryCheckout is the semantic identity used when a model deliberately accesses Git;
- the application owns repository topology.

However, subsequent implementation coupled Source Control to Agent Harness checkout-registration state.

That coupling is now rejected.

Source Control must own and execute Git independently. Agent Harness/MCP checkout exposure is a downstream model-access projection.

## Controlling Repair03 documents

- `Repair03/EPGA_R04_R03_ARCHITECT_CORRECTION_2026-09-29.md`
- `Repair03/EPGA-R04-R03_decouple_source_control_from_agent_harness_model_access.md`

## Repair02 disposition

Repair02 checkpoint `e10bc59...` is not being wholesale reverted.

Its independently valid Agent Harness lifecycle hardening may remain.

Repair03 removes the invalid Source Control dependency that Repair02 reinforced and removes the private checkout-list control if it no longer has a legitimate consumer.

## Current invariant

```text
Source Control owns Git
    ->
application/model-access projection mirrors allowed checkout access
    ->
MCP exposes selected capabilities to external models
```

Never:

```text
Agent Harness/MCP state
    ->
determines Source Control authority or Git topology
```

## Qualification state

Do not retry the real ChampCity_AI conversion until Repair03 is implemented and Architect-reviewed.

Preserve the existing schema-3 failed migration evidence.
