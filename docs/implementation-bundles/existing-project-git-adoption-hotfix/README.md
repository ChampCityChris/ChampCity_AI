# Existing Project Git Adoption Hotfix

**Original implementation checkpoint:** `07ad7ccb88a0ea7878529235151870dbb0aeec74`  
**Current status:** **REPAIR01 RELEASED**  
**Scope:** Open Existing Project → warned forced Git normalization → managed Main/Dev topology

## Active path

Read:

1. `Repair01/README.md`
2. the current Repair01 card only

The original EPGA-HF01 through EPGA-HF03 implementation is the baseline being corrected.

Do not use the original conservative classification rules as the current product contract.

## Why Repair01 exists

The first hotfix still treated unusual or partially unreadable Git state as a reason to deny Project entry.

That contradicts the intended Existing Project behavior.

The corrected rule is:

> Existing Git is import material. After one explicit warning and Operator acceptance, ChampCity normalizes the selected Project into ChampCity's own source-control topology.

Ordinary Git irregularity is not an admission gate.

## Repair01 sequence

1. `Repair01/EPGA-R01-01_force_normalize_existing_git_into_champcity_topology.md`
2. `Repair01/EPGA-R01-02_simple_warning_and_real_project_qualification.md`

Execute sequentially with one Implementer Report and one checkpoint per card.

Do not stop between passing R01-01 and R01-02 merely for Architect review.

Stop after R01-02.

## Current source-control contract

For a Git-backed Existing Project:

```text
select Project
→ show one conversion warning
→ Accept and Convert / Cancel
→ on Accept:
     preserve Project source
     import readable Git history where practical
     create canonical baseline
     force canonical main + dev
     establish managed topology
     register Project
     open Workflow Hub
```

The conversion may invalidate the prior Git branch/worktree/repository layout. That consequence is disclosed before mutation.

The only acceptable hard blockers are failures that prevent ChampCity from preserving the actual Project source or constructing its managed repository safely.

## Non-scope

Repair01 does not address:

- WRB04 workspace composition;
- mandatory Architect-per-WorkItem authority drift;
- WRB05/web migration;
- Workflow planning/execution behavior.

Those remain separate work.
