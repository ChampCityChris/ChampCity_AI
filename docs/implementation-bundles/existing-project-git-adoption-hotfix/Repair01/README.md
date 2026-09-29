# Existing Project Git Adoption — Repair01 Forced Normalization

**Parent hotfix baseline:** `07ad7ccb88a0ea7878529235151870dbb0aeec74`  
**Status:** RELEASED  
**Purpose:** Replace conservative Git admission/classification with one-time warned normalization into ChampCity-managed source topology.

## Controlling product decision

A Git-backed Existing Project does **not** need to satisfy ChampCity's Git assumptions before it can be opened.

If ChampCity detects conventional/foreign Git state, the normal product behavior is:

```text
Open Existing Project
→ detect existing Git/legacy source-control state
→ show one warning
→ Accept Conversion / Cancel
→ on Accept, normalize the project into ChampCity topology
→ open Workflow Hub
```

The warning makes clear that the prior Git layout/branch/worktree arrangement may be damaged or cease to function.

After Accept, ChampCity owns the source-control representation.

## What is preserved

The migration priority is:

1. preserve the actual Project source files/working bytes;
2. preserve readable Git commit/history objects and refs where practical;
3. preserve readable remotes/tags as historical/provider data where practical;
4. create one canonical ChampCity source baseline;
5. establish canonical `main` and `dev`;
6. move forward under ChampCity source-control mechanics.

Perfect preservation of the incoming Git topology is **not** an admission requirement.

## Canonical baseline policy

When readable Git history exists:

- import/copy the readable repository object/history store;
- collect unique readable local branch tips;
- build one new ChampCity baseline commit whose tree represents the current Project working source;
- make the readable branch tips parents of that baseline commit where bounded/practical, so their history remains reachable;
- set `main` to that baseline;
- set `dev` to that same baseline;
- preserve other readable refs/tags/remotes without making them current ChampCity execution lines.

This is intentionally a normalization boundary. It does not attempt semantic conflict resolution among historical branches.

When usable Git history cannot be read:

- preserve/archive the old Git administrative state where filesystem access permits;
- create a fresh ChampCity repository;
- create the baseline commit from the current Project working source;
- set both `main` and `dev` to that baseline.

The conversion warning covers loss/damage of the old Git management topology.

## Stop condition

Conversion stops only when ChampCity cannot safely preserve/read the actual Project source files needed to construct the managed baseline, cannot write its managed repository, or filesystem failure prevents a recoverable conversion.

Odd/unsupported Git topology is not, by itself, a stop condition.

## Sequence

1. `EPGA-R01-01_force_normalize_existing_git_into_champcity_topology.md`
2. `EPGA-R01-02_simple_warning_and_real_project_qualification.md`

Execute sequentially, one Implementer Report and one commit per card.

Stop after R01-02 for Architect review.
