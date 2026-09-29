# Existing Project Git Adoption — Repair03

**Starting baseline:** `2a897f96f60ef8d16606ade4c2b1dfb45fddde5a`  
**Implementation checkpoint:** `07d2e543e6c64ec4214fef7027bf853cefdfb1ab`  
**Status:** **ACCEPTED FOR REPAIR03 SCOPE — SUPERSEDED BY REPAIR04 FOR REAL CONVERSION**

## Controlling review

`EPGA_R03_ARCHITECT_REVIEW_2026-09-29.md`

## Accepted result

Repair03 closes the demonstrated source-preservation staging failure.

The real ChampCity_AI qualification attempt proved that conversion now:

- materializes a bounded source snapshot;
- avoids canonical traversal of ignored/local-only trees;
- preserves ignored/local state separately;
- uses non-following link/junction handling;
- generates the current managed integration policy in the preserved source snapshot;
- advances into Git normalization.

## New downstream blocker

The subsequent real conversion failed during normalization/rollback with EPERM involving:

`.champcity/repository.git`

The journal remained at `normalizing` with no failure reason, proving rollback did not finish cleanly.

That defect is outside the Repair03 source-staging scope and is now owned by Repair04.

## Next active card

`../Repair04/EPGA-R04-01_decouple_workspace_git_authority_and_make_cutover_failure_safe.md`

## Stop rule

Do not retry the real ChampCity_AI conversion until Repair04 is implemented and Architect-reviewed.
