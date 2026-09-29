# Existing Project Git Adoption — Repair04

**Starting baseline:** `07d2e543e6c64ec4214fef7027bf853cefdfb1ab`  
**Status:** **ACTIVE — REAL CHAMPCITY_AI CONVERSION BLOCKED**

## Controlling review

`../Repair03/EPGA_R03_ARCHITECT_REVIEW_2026-09-29.md`

Repair03 is accepted for its bounded source-staging/local-state scope.

## New production failure

The real ChampCity_AI retry passed Repair03 source preservation and entered normalization.

The UI then surfaced EPERM / permission denied involving:

`.champcity/repository.git`

Forensic state shows the journal still at `normalizing`, no recorded failure reason, root conventional Git still authoritative, no Main/Dev, and an empty partially-cleaned managed metadata directory.

The current rollback can therefore fail while removing conversion-created metadata and mask the original normalization failure.

## Active card

`EPGA-R04-01_fence_git_authority_cutover_and_make_rollback_failure_safe.md`

## Repair boundary

Repair04 owns:

- exclusive Git-authority cutover;
- staged candidate managed metadata;
- explicit attempt-owned resource tracking;
- Windows-safe bounded rename/remove;
- primary-failure-preserving rollback;
- recovery of the current interrupted normalization state.

Repair04 does not reopen Repair02 policy provisioning or Repair03 source staging.

## Stop rule

Do not retry the real ChampCity_AI conversion until Repair04 is implemented and Architect-reviewed.
