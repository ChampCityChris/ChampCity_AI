# Existing Project Git Adoption Hotfix

**Starting baseline:** `ac936965242d0c95acb91ffc1062cf5c7a3f8b66`  
**Scope:** Open Existing Project → Git adoption/migration → managed Main/Dev topology  
**Status:** RELEASED

## Read first

1. `CODE_REVIEW_AND_RCA_2026-09-28.md`
2. this README
3. the current card only

## Sequence

1. `EPGA-HF01_inspect_classify_and_journal_existing_git_adoption.md`
2. `EPGA-HF02_apply_resume_managed_topology_and_baseline_normalization.md`
3. `EPGA-HF03_landing_migration_consent_and_end_to_end_qualification.md`

Execute sequentially with one report/checkpoint per card.

Do not begin unrelated WRB04 workspace convergence or WRB05 work inside this hotfix.

## Governing rule

`Open Existing Project` is a migration/adoption operation.

The selected repository does not need to already conform to ChampCity topology.

The application must either:

- adopt/reconcile it safely;
- request explicit migration consent for a real baseline/integration normalization;
- or fail with a precise manual-intervention reason when automatic migration cannot prove a unique safe result.

## Source-line policy

- preserve every existing ref/tag/remote;
- `main` is stable/release;
- `dev` is the existing-project integration target;
- do not merge every branch into main;
- integrate only the active source state into dev when it is not already represented;
- never auto-resolve conflicts by discarding one side.

## Operator consent

Consent is required only when migration changes source semantics, such as:

- choosing/creating main from a non-main baseline;
- advancing dev with active branch work;
- capturing non-ignored working changes into an adoption snapshot.

Routine topology conversion/recovery is application-owned machine mechanics.

## Stop rule

After EPGA-HF03 checkpoints, STOP for Architect review.

Do not continue into workspace convergence or WRB05.
