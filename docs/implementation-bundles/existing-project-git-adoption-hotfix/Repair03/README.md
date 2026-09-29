# Existing Project Git Adoption — Repair03

**Starting baseline:** `2a897f96f60ef8d16606ade4c2b1dfb45fddde5a`  
**Status:** **ACTIVE — REAL CHAMPCITY_AI CONVERSION BLOCKED**

## Demonstrated production failure

After Repair02 was accepted, the real ChampCity_AI Project was retried through **Accept and Convert**.

The conversion failed before Git normalization with:

```text
Source preservation staging failed before Git normalization:
ENOTDIR: not a directory, opendir
```

## Architect finding

The converter's preservation snapshot recursively copies every ordinary Project-root entry before later applying Git ignore semantics.

That makes canonical source staging traverse ignored/local-only dependency, build, cache, editor, and generated state. The synthetic ignored-file proof covers only a simple file and does not model real Windows ignored-directory or reparse-point behavior.

Repair03 separates canonical source materialization from ignored/local working-state preservation and removes conversion-owned partial staging when preservation fails before normalization.

## Active card

`EPGA-R03-01_bound_source_staging_and_preserve_local_state.md`

## Boundaries

Repair03 does not change the Repair02 managed integration-policy contract, the one-warning consent UX, canonical main/dev normalization, best-effort readable Git history import, managed reopen semantics, or WRB04/WRB05 work.

## Stop rule

Do not retry the real ChampCity_AI conversion until EPGA-R03-01 is implemented and Architect-reviewed.
