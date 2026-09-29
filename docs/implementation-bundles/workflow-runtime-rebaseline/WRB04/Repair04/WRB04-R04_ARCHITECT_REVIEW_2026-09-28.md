# WRB04 Repair04 Architect Review — 2026-09-28

**Reviewed baseline:** `9273149423131b30c73e3755f6f90d2234d03768`  
**Disposition:** **REPAIR04 ACCEPTED**  
**WRB04 disposition:** **NOT ARCHITECTURALLY CLOSED**  
**New repair card:** **NONE**

## Review bar

This review intentionally does not convert every unproven qualification permutation into another repair.

Repair04 is accepted when:

- the normal supported path is coherent;
- the specific R04 dead-ends are actually repaired;
- role authority is not materially changed;
- no demonstrated state-corruption or ordinary-path blocker remains in the R04 scope.

The missing exhaustive matrices listed in the R04-03 report are not, by themselves, defects.

## R04-01 — accepted

Durable implementation and Tester checkpoint recovery is now represented through exact application state and existing structured checkpoint mechanics.

Accepted behavior:

- source-backed attempt evidence retains application-observed checkpoint attribution;
- implementation checkpoint retry/reconciliation is keyed to exact Workflow/WorkItem/ImplementationRecord identity;
- Tester checkpoint retry reuses the existing TesterResult rather than creating another Tester run/result;
- source-neutral work does not fabricate checkpoint recovery;
- the shared Workspace can surface bounded recovery state.

This repairs a real dead-end.

### Authority review

Source checkpointing remains application-owned Git mechanics.

The current Retry/Reconcile buttons are recovery controls, **not approval authority**. They do not allow the Operator to approve source state or invent Git evidence.

They should be treated as a fallback recovery surface, not as a normal human gate. Future workspace convergence may automate safe retry/reconciliation before surfacing an unresolved inspection state.

That UX concern does not invalidate the R04 backend recovery repair.

## R04-02 — accepted

The returned Implementer/Tester runtime models are now handled by role-specific renderer state rather than structural casting, and operation feedback can survive projection refresh.

The source-neutral deterministic Criterion check is accepted as a **capability compatibility check**, not governance:

- it adds no human approval;
- it does not transfer authority to the Operator;
- it prevents accepting a required proof obligation that the current product has no mechanism to satisfy;
- source-backed deterministic proof remains valid;
- supported source-neutral policies remain available.

This is analogous to rejecting an invalid execution contract, not creating another approval queue.

## R04-03 — accepted as qualification

The final report correctly distinguishes passing focused evidence from unproven composed scenarios.

No production defect was demonstrated by the remaining qualification gaps.

Therefore:

- no source-backed deterministic Phase mega-fixture is required merely to close R04;
- no 14-state recovery matrix is required merely to close R04;
- no Repair05 is authorized from those evidence gaps;
- the unrelated desktop test-harness failure is not an R04 defect.

## Known broader WRB04 baseline violations

R04 acceptance does **not** mean the broader WRB04 product implementation now matches the adopted baseline.

Two ordinary-path violations are already demonstrated and must not be hidden by this acceptance.

### 1. Mandatory Architect-per-WorkItem planning gate

The WRB04 baseline says:

- the accepted WorkItem already owns objective, dependencies, and Criteria;
- the Architect **may** clarify implementation boundaries, affected files/proof intent, decompose oversized work, or surface a material conflict;
- eligibility is dependency/Phase/state based, not a human approval queue.

Current code instead hard-requires `implementationBoundaries`, `affectedPaths`, and `proofIntent` before exact Implementer execution and the renderer labels the step “Architect execution plan required.”

That changes the Architect from advisory/bounded planning into a mandatory per-WorkItem authorization boundary.

This is a direct role-authority drift and is **not accepted as the intended final Workflow model**.

### 2. New Workflow workspaces replaced rather than composed existing building blocks

The WRB04 baseline explicitly requires salvaging:

- Work Card Architect UX;
- presentation components;
- reusable execution mechanics.

Current Feature/Issue Workflow components are bespoke replacements and do not compose the mature Issue/Work Card/intake workspace building blocks.

The resulting product-path UI has been demonstrated directly in the running application and is not acceptable as final workspace convergence.

This is an ordinary-path product defect, not an edge-case qualification gap.

## Disposition and sequencing

Repair04 is complete and accepted.

No Repair05 is created.

WRB04 remains **architecturally open** only for the already-demonstrated role-authority and workspace-composition deviations above.

Per Operator project sequencing, the next architectural task is the separate Existing Project Git-adoption hotfix. Workspace/role convergence is not silently started by this review.

WRB05 remains unauthorized until the Operator schedules the remaining WRB04 convergence and final acceptance.
