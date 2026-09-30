# Existing Project Git Adoption — Repair06

**Baseline:** `e345019bb6d1b4cdfdd30c06006a2a4ac8e958dd`  
**Status:** **ACTIVE — REAL QUALIFICATION BLOCKED**

Controlling card:

`EPGA-R04-R03-R06_classify_local_state_and_remove_regenerable_conversion_gates.md`

The latest real ChampCity_AI conversion passed root Git retirement, managed metadata installation, Main/Dev creation, and source restoration, then failed because all Git-ignored state is currently treated as durable and relocated with `fs.renameSync()`.

The exact real failure was:

```text
local-state preservation/relocation failed at 'node_modules'
```

Repair06 fixes the category error:

```text
canonical source
durable ignored/local state
regenerable ignored state
```

Known dependencies/caches/build output no longer become conversion authority. Unknown ignored data remains durable and is preserved outside the baseline.

Do not retry the real ChampCity_AI conversion until Repair06 is implemented and Architect-reviewed.
