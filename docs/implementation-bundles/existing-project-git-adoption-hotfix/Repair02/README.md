# Existing Project Git Adoption — Repair02

**Starting baseline:** `6200d383d61ff890d86492cb5ed6e3e17b3856d9`  
**Architecture correction checkpoint:** `36bee11de8a74e4b101eb4712bbe577ce9ab83f0`  
**Status:** RELEASED / REAL CHAMPCITY_AI CONVERSION BLOCKED UNTIL REVIEW

## Corrected decision

Repair02 does **not** preserve the pre-conversion `.champcity/integration-policy.json` as legacy state.

Instead:

> Every newly managed ChampCity repository is provisioned with a current-schema repository-owned integration policy at bootstrap/adoption time.

The incoming Project-container `.champcity/` tree remains legacy/application state and is not imported into source.

## Active card

`EPGA-R02-01_provision_current_managed_repository_integration_policy.md`

The previously authored preservation-specific card is superseded and must not be implemented.

## Provisioning rule

During Greenfield bootstrap and Existing Project forced normalization:

1. ignore incoming Project-container `.champcity` state;
2. inspect the source snapshot for **current supported validation capability**, not for legacy policy bytes;
3. generate a fresh current integration policy;
4. write it into repository source at `.champcity/integration-policy.json`;
5. include that generated file in the initial/canonical baseline even when `.champcity/` is ignored;
6. thereafter the repository-owned policy evolves through normal source control.

## Default policy classes

### Validation-profile-capable repository

If the repository contains the exact current ChampCity validation toolkit/authority required by `integration-gate`, generate a current validation-profile policy selecting `integration-gate`.

Do not copy the old policy file.

Do not fabricate Integration Repair scope during bootstrap/adoption.

### Generic repository

If the repository does not contain the current validation-profile authority, generate the application-owned generic source-integrity policy.

This policy performs no repository script execution and exists so every managed Repository has one valid target-owned integration policy.

Project-specific stronger validation/repair policy may be added later through normal managed source changes.

## Stop rule

After EPGA-R02-01 checkpoints, STOP for Architect review.

Do not convert the real ChampCity_AI Project until that review passes.
