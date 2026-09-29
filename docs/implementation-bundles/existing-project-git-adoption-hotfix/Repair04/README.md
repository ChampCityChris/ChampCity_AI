# Existing Project Git Adoption — Repair04

**Starting baseline:** `07d2e543e6c64ec4214fef7027bf853cefdfb1ab`  
**Architect revision baseline:** `73a260aa8fd9b2f2e9b8620b01101f8634567f93`  
**Implementation checkpoint:** `643ea5ed24552b34b9cafa3592b4965703fdb28c`  
**Status:** **REPAIR01 ACTIVE — REAL CHAMPCITY_AI CONVERSION BLOCKED**

## Controlling review

`EPGA_R04_ARCHITECT_REVIEW_2026-09-29.md`

Repair04's broad authority/cutover architecture is accepted, but the real conversion retry remains blocked by bounded checkout-lifecycle defects.

## Accepted authority model

Repair04 separates:

- **Workspace** — generic model-access directory; Git-neutral and valid with zero repositories.
- **RepositoryCheckout** — explicit model-facing Git authority for one validated working copy.
- **Application/source-control layer** — owns Git discovery, checkout provisioning, adoption, normalization, and managed topology.

The Agent Harness workspace registry does not infer Git authority from a root `.git`.

Non-Git folders remain permanent supported workspaces.

## Blocking findings

The implemented checkout retirement gate is not yet atomic:

- checkout resolution can pass the available check, yield during async validation, and acquire a lease after retirement has already removed the checkout;
- drain timeout leaves a still-persisted checkout stuck in in-memory `retiring` state.

The new mandatory checkout model also has no production application lifecycle provisioning a conventional root checkout for ordinary Git workspaces; current production workspace-registration call sites create only the generic workspace.

## Active repair

`Repair01/EPGA-R04-R01_make_checkout_retirement_atomic_and_provision_conventional_authority.md`

Repair01 owns:

- atomic checkout reservation vs retirement;
- timeout/persistence-failure restoration to usable checkout authority;
- conversion failure before successful retirement;
- application-owned conventional checkout provisioning;
- reconciliation of already-registered conventional Git workspaces after upgrade.

## Accepted Repair04 mechanics not reopened

Repair01 does not reopen:

- Repair02 integration-policy provisioning;
- Repair03 source materialization/local-state preservation;
- candidate repository staging;
- managed-metadata/root-Git cutover separation;
- bounded Windows mutation retry;
- primary-failure-preserving rollback;
- truthful failed journal semantics.

## Stop rule

Do not retry the real ChampCity_AI conversion until Repair04 / Repair01 is implemented and Architect-reviewed.
