# Existing Project Git Adoption — Repair04

**Starting baseline:** `07d2e543e6c64ec4214fef7027bf853cefdfb1ab`  
**Architect revision baseline:** `73a260aa8fd9b2f2e9b8620b01101f8634567f93`  
**Implementation checkpoint:** `643ea5ed24552b34b9cafa3592b4965703fdb28c`  
**Repair01 checkpoint:** `f59d5d779f8192d14f47c1175d3a33b871b0c2e4`  
**Status:** **ACCEPTED — REAL CHAMPCITY_AI QUALIFICATION RETRY AUTHORIZED**

## Controlling reviews

- `EPGA_R04_ARCHITECT_REVIEW_2026-09-29.md`
- `Repair01/EPGA_R04_R01_ARCHITECT_REVIEW_2026-09-29.md`

## Accepted authority model

Repair04 establishes:

- **Workspace** — generic model-access directory; Git-neutral and valid with zero repositories.
- **RepositoryCheckout** — explicit model-facing Git authority for one validated working copy.
- **Application/source-control layer** — owns Git discovery, checkout provisioning, adoption, normalization, and managed topology.

The Agent Harness workspace registry does not infer Git authority from a root `.git`.

Non-Git folders remain permanent supported workspaces.

The Operator's 2026-09-29 workspace/Git authority decision supersedes the earlier RCO-HF01 workspace-root Git authorization rule. RCO-HF01 remains an unchanged historical record.

## Accepted cutover mechanics

Repair04 + Repair01 now provide:

- deterministic conventional checkout provisioning for exact root Git workspaces;
- atomic checkout operation reservation and retirement;
- bounded retirement drain with usable-authority restoration on failure;
- staged candidate managed metadata;
- managed-metadata/root-Git cutover separation;
- bounded Windows rename/remove retry;
- explicit attempt-owned recovery state;
- primary-failure-preserving rollback;
- truthful failed journal semantics;
- interrupted-normalization recovery;
- exact Main/Dev RepositoryCheckout registration after successful conversion.

## Qualification state

No real ChampCity_AI conversion has been performed after this accepted checkpoint.

The prior interrupted schema-2 normalization evidence remains in place intentionally.

## Next action

Retry the real ChampCity_AI Existing Project conversion using the current code/build.

If the retry fails, preserve the exact state and error rather than manually cleaning migration evidence.
