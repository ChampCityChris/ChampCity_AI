# RCO08 — Deliver Concurrent Work Operator Visibility and End-to-End Acceptance

**Order:** 8 of 8  
**Depends on:** RCO01–RCO07  
**Governing architecture:** `docs/architecture/CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/repository-checkout-orchestration/Implementer_Reports/RCO08_IMPLEMENTER_REPORT.md`

## Objective

Expose the concurrent engineering model in ChampCity's Operator experience and prove the complete multi-agent lifecycle end to end.

## Required Changes

1. Add an Operator-facing concurrent work/status surface in the appropriate Workflow Hub/execution context UI.
2. Present semantic state, not raw Git plumbing. At minimum show:
   - Work Item/title;
   - implementation state;
   - branch label;
   - checkout state;
   - worker/runtime state;
   - dirty/checkpointed/review-ready state;
   - integration state/blocker.
3. Provide bounded diagnostics/details for checkout path/HEAD when needed for troubleshooting.
4. Expose recovery actions only where deterministic and safe; do not add destructive "clean/reset" shortcuts.
5. Add end-to-end acceptance proving at least three concurrent Work Items in one fixture Repository:
   - isolated branches/checkouts;
   - simultaneous independent source changes;
   - machine-owned checkpoint commits;
   - exact-revision review evidence;
   - sequential integration into moving `dev`;
   - one conflict/repair path or equivalent existing integration proof;
   - safe checkout retirement;
   - no cross-worktree source contamination.
6. Verify the primary checkout remains the integration/local surface throughout worker execution.
7. Update applicable architecture/service/migration documentation and corpus index to reflect implemented RepositoryCheckout APIs.
8. Run bundle-wide canonical repository regression.

## UI Constraints

- Follow `CHAMPCITY_UI_DESIGN_GOVERNANCE_STANDARD.md`.
- Do not require the Operator to understand detached HEAD or Git worktree internals to operate the workflow.
- Diagnostic details may use Git terminology where technically necessary.
- No new approval bureaucracy.

## Primary Surface to Inspect

- Workflow Hub / execution-context renderer surfaces
- preload/IPC needed for checkout/work status
- RepositoryCheckout/Runtime/Work Intake services from RCO01–RCO07
- UI governance standard
- architecture corpus index and service contract docs

## Acceptance Criteria

1. Operator can distinguish multiple concurrent Work Items and their readiness/integration states without opening a terminal.
2. A completed implementation cannot disappear merely because its execution checkout is cleaned after successful integration.
3. Active concurrent workers remain isolated while another Work Item is reviewed/integrated.
4. Exact implementation revision is visible/traceable.
5. Full end-to-end acceptance passes.
6. Full canonical repository test lane passes or unrelated pre-existing failures are truthfully separated and routed.

## Validation

Inspect capability map first. Minimum:

- `npm run typecheck`
- `npm run build`
- focused UI/workflow tests
- focused Git/checkout/runtime/integration suites established by RCO01–RCO07
- `npm test`

If packaging/launch smoke is not required by the affected runtime/UI boundary, record why rather than manufacturing unrelated proof.

## Implementer Report

Provide full bundle acceptance summary, exact concurrent scenario evidence, files changed, UI proof where applicable, exact commands/results, test categorization, deviations/blockers/residual risk, and final RCO08 checkpoint commit.

## Completion

Stop after the RCO08 checkpoint and return the bundle for Architect review/integration. Do not tag or release.
