# Existing Project Git Adoption — Repair04

**Starting baseline:** `07d2e543e6c64ec4214fef7027bf853cefdfb1ab`  
**Architect revision baseline:** `73a260aa8fd9b2f2e9b8620b01101f8634567f93`  
**Status:** **ACTIVE — REAL CHAMPCITY_AI CONVERSION BLOCKED**

## Controlling review

`../Repair03/EPGA_R03_ARCHITECT_REVIEW_2026-09-29.md`

Repair03 is accepted for its bounded source-staging/local-state scope.

## Corrected authority model

Repair04 now explicitly separates:

- **Workspace** — generic model-access directory; Git-neutral and valid with zero repositories.
- **RepositoryCheckout** — explicit model-facing Git authority for one validated working copy.
- **Application/source-control layer** — owns Git discovery, adoption, normalization, checkout lifecycle, and managed topology.

The Agent Harness workspace registry must not infer Git authority from `.git` at the workspace root.

A non-Git folder is a permanent supported workspace class.

Git tooling operates only through an exact registered RepositoryCheckout.

## Production failure still owned by Repair04

The real ChampCity_AI retry passed Repair03 source preservation and entered normalization.

The UI then surfaced EPERM / permission denied involving:

`.champcity/repository.git`

Forensic state shows the journal still at `normalizing`, no recorded failure reason, root conventional Git still authoritative, no Main/Dev, and an empty partially-cleaned managed metadata directory.

The current rollback can fail while removing conversion-created metadata and mask the original normalization failure.

## Active card

`EPGA-R04-01_decouple_workspace_git_authority_and_make_cutover_failure_safe.md`

## Repair boundary

Repair04 owns:

- Git-neutral generic workspace registration;
- exact RepositoryCheckout-based Git routing;
- explicit conventional/external checkout exposure when needed;
- checkout-scoped retirement/draining during conversion;
- staged candidate managed metadata;
- explicit attempt-owned resource tracking;
- Windows-safe bounded rename/remove;
- primary-failure-preserving rollback;
- recovery of the current interrupted normalization state.

Repair04 does not reopen Repair02 policy provisioning or Repair03 source staging.

## Stop rule

Do not retry the real ChampCity_AI conversion until Repair04 is implemented and Architect-reviewed.
