# Existing Project Git Adoption — Repair02

**Starting baseline:** `6200d383d61ff890d86492cb5ed6e3e17b3856d9`  
**Implementation checkpoint:** `000b9707c7ebf0c18c2e44ec89587e4d2cb217ed`  
**Status:** **ACCEPTED — REAL CHAMPCITY_AI UI CONVERSION AUTHORIZED**

## Controlling Architect review

`EPGA_R02_ARCHITECT_REVIEW_2026-09-29.md`

Repair02 is complete.

The prior preservation-specific card remains superseded.

## Accepted managed-repository policy contract

At a new managed-repository baseline boundary:

- incoming Project-container `.champcity` state is not imported as source;
- the application generates a fresh current integration policy;
- validation-profile-capable repositories receive the current `integration-gate` policy;
- other repositories receive the generic application-owned `source-integrity` policy;
- no project-specific Integration Repair scope is fabricated;
- the generated policy is force-tracked in repository source;
- managed reopen never regenerates/overwrites it.

## Real ChampCity_AI conversion

The real ChampCity_AI Project may now be converted through the landing-page **Accept and Convert** action.

After conversion, stop before further development and perform one source-topology verification of the resulting managed Project.

## Known non-blocking consequence

ChampCity_AI's historical project-specific Integration Repair scope is intentionally not migrated.

Ordinary integration remains supported.

If a future integration requires automatic Integration Repair, the project will need a current repair scope established through normal managed repository configuration.

## Stop rule

No further Existing Project Git-adoption repair is authorized from this review.

Do not begin unrelated WRB04 convergence or WRB05 as part of this repair.
