# Existing Project Git Adoption — Repair02

**Starting baseline:** `6200d383d61ff890d86492cb5ed6e3e17b3856d9`  
**Status:** RELEASED / REAL CHAMPCITY_AI CONVERSION BLOCKED

## Reason

Repair01 correctly implemented warned forced Git normalization, but Architect review found one normal-path source-preservation defect:

`.champcity/integration-policy.json`

is currently excluded from the canonical source baseline even though exact Workflow integration loads it from the Dev repository/commit.

Do not convert the real ChampCity_AI project at the Repair01 checkpoint.

## Active card

`EPGA-R02-01_preserve_source_governing_champcity_policy_during_normalization.md`

This is one bounded repair.

Do not reopen the broader Git-adoption architecture.

## Completion

After R02-01 checkpoints, STOP for Architect review.

Real ChampCity_AI UI conversion remains unauthorized until that review passes.
