# Existing Project Git Adoption — Repair04 / Repair01

**Starting baseline:** `643ea5ed24552b34b9cafa3592b4965703fdb28c`  
**Status:** **ACTIVE — REAL CHAMPCITY_AI CONVERSION BLOCKED**

## Controlling Architect review

`../EPGA_R04_ARCHITECT_REVIEW_2026-09-29.md`

## Blocking findings

Repair04's broad architecture is accepted, but checkout retirement is not yet race-safe:

- checkout resolution increments `activeOperations` only after asynchronous validation;
- retirement can remove the checkout while such a resolution is in flight;
- a drain timeout leaves a still-persisted checkout stuck in `retiring`.

The new mandatory checkout authority model also lacks a production application lifecycle that provisions conventional root checkouts for ordinary Git workspaces. Direct fixture registration exists, but real workspace activation currently creates only the generic workspace.

## Active card

`EPGA-R04-R01_make_checkout_retirement_atomic_and_provision_conventional_authority.md`

## Stop rule

Do not retry the real ChampCity_AI conversion until Repair01 is implemented and Architect-reviewed.
