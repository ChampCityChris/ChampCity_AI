# Existing Project Git Adoption Hotfix

**Current accepted architecture baseline:** `e345019bb6d1b4cdfdd30c06006a2a4ac8e958dd`  
**Current status:** **REPAIR06 ACTIVE — REAL CHAMPCITY_AI QUALIFICATION BLOCKED**

## Controlling path

1. `Repair04/Repair03/Repair03/Repair06/EPGA-R04-R03-R06_classify_local_state_and_remove_regenerable_conversion_gates.md`
2. `Repair04/Repair03/Repair03/Repair06/README.md`
3. `Repair04/Repair03/Repair03/README.md`

## Authority model

ChampCity A/I Source Control owns Git deterministically.

The machine source-operation fence coordinates topology transitions.

Agent Harness/MCP/model access remains downstream and does not authorize Git conversion.

## Latest qualification evidence

The real attempt `349232e8-fce9-4300-bbf2-8a19fca53d56` passed:

- source preservation;
- 13-ref import;
- canonical baseline creation;
- verified root Git recovery;
- forced Windows root Git retirement;
- managed metadata installation;
- Main/Dev worktree creation.

It then failed because ignored `node_modules` was treated as durable local state and relocated with a raw filesystem rename.

Rollback restored conventional Git cleanly with no cleanup warnings.

## Repair06 direction

Git-ignored state is split into:

```text
durable local state
regenerable state
```

Known dependency/cache/build/temp state is not required for conversion.

Unknown ignored state remains durable and is preserved outside the baseline.

## Next action

Implement Repair06 and stop for Architect review.

Do not manually clean historical migration evidence and do not retry **Accept and Convert** before Repair06 acceptance.
