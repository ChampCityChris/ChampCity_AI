# WIR23-REPAIR01 — Enforce Route Decision State and Non-Destructive Reroute Retention

**Parent:** WIR06 / WIR23  
**Architect finding:** AR-WIR-01 in `ARCHITECT_CODE_REVIEW_2026-09-20.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR01_IMPLEMENTER_REPORT.md`

## Confirmed Defect

The route-decision service accepts Accept/Override while the route is already in normal `selected` state because the original assessment remains exposed as `sourceAssessment`.

The renderer also leaves those controls available.

When a prior selection exists, every subsequent non-revision decision currently invokes downstream supersession, even when the effective route remains unchanged. Valid planning can therefore be marked historical by a duplicate decision or by intentionally rejecting a reroute and retaining the existing route.

## Root Cause

Decision legality is not enforced from the durable route state machine, and supersession is keyed to “a prior selection exists” rather than “the effective selected route changed.”

## Objective

Make Operator route decisions legal only at an actual pending route-decision boundary and make downstream supersession conditional on a real route change.

## Required Changes

1. In `workRouteDecisionService.ts`, reject route decisions unless there is a current pending recommendation:
   - initial assessment: `awaiting-decision`;
   - reroute recommendation: `reroute-required`.
2. A normal `selected` route with no pending reroute must not accept another Accept/Override/Revision decision against the old assessment.
3. For a pending reroute:
   - Accept selects the recommended replacement.
   - Override may select any supported route, including retaining the current route.
   - Request Revision keeps the current selected route authoritative while requesting new advice.
4. Compute downstream supersession only when the new effective route ID differs from the currently selected route ID.
5. If the Operator retains the existing route, preserve current downstream planning/execution artifacts. Record the decision/reroute disposition without historicalizing those artifacts.
6. Ensure the pending reroute is no longer presented as actionable after its disposition is resolved.
7. Update `WorkRouteDecisionPanel.tsx` so decision controls are presented only when the service reports a legal pending decision state. Renderer logic must mirror service capability, not become the authority for legality.

## Preserve

- Advisory Architect routing.
- Operator authority to accept, override, or request revision.
- Intake identity and Work Intake branch across reroute.
- Existing stale-evidence rejection.
- Actual route changes must continue to historicalize artifacts belonging to the superseded route.
- Issue Resolution reframe behavior.

## Forbidden Changes

- No new route taxonomy.
- No automatic route selection.
- No renderer-owned route authority.
- No deletion of valid planning merely to simplify reroute handling.
- No restart of Project Intake or Work Intake identity.

## Required Proof

The implementation result must demonstrate from the production service path that:

1. A second decision in ordinary `selected` state is rejected.
2. Accepting a real reroute changes the route and supersedes affected downstream artifacts.
3. Overriding a reroute back to the existing route resolves the reroute without superseding downstream artifacts.
4. Requesting reroute revision retains the current selected route and does not destroy downstream artifacts.
5. The renderer exposes decision controls only when a decision is actually pending.
6. Stale assessment/reroute evidence still fails closed.

## Implementer Report

Record the confirmed root cause, production files changed, resulting state-transition rules, exact proof exercised, deviations, and any remaining code-level risk. Do not broaden this repair into planning or source-control lifecycle work.

## Return Path

Return to Architect code review of the Work Intake Routing package.
