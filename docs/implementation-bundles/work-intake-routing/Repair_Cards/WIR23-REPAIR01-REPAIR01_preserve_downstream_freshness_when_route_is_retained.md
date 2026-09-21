# WIR23-REPAIR01-REPAIR01 — Preserve Downstream Freshness When the Effective Route Is Retained

**Parent Repair Card:** `WIR23-REPAIR01 — Enforce Route Decision State and Non-Destructive Reroute Retention`  
**Failed review evidence:** Architect code review of the implemented WIR23-REPAIR01 on 2026-09-21  
**Parent Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR01_IMPLEMENTER_REPORT.md`  
**Repair Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR01-REPAIR01_IMPLEMENTER_REPORT.md`

## Confirmed Defect

WIR23-REPAIR01 correctly prevents ordinary selected routes from being decided again, suppresses downstream supersession when a reroute is dispositioned back to the already-effective route, and retains the prior authoritative route-selection `decisionId`.

However, a same-route reroute disposition still rewrites the canonical Operator route-decision document and increments its `artifactRevision`.

Production planning currently treats that mutable route-decision document revision and full-file digest as a freshness dependency:

- `workPlanningKernel.ts` constructs `routeSource` from `route.relativePath` plus the current `route.artifactRevision`;
- planning artifacts persist that exact source revision and digest;
- `sourcesCurrent()` and `readArtifact()` reject the artifact as stale when the route-decision document revision/digest changes.

Therefore the following sequence is still destructive at the semantic level:

1. Route decision revision N selects route A.
2. Valid route-scoped Assessment/Plan artifacts are created against revision N.
3. A reroute recommendation proposes route B.
4. The Operator rejects the reroute by overriding back to route A, or requests revised reroute advice while retaining route A.
5. The route-decision history document advances to revision N+1.
6. Existing Assessment/Plan files remain byte-identical and are not marked historical, but production planning now considers them stale because their route source still references revision N.

The parent repair's preservation requirement is therefore not satisfied. The files survive, but valid planning cannot remain current solely because decision history changed without an effective route change.

The same coupling must be checked for the Issue Resolution path because `workIssueRoutingService.ts` also records the mutable route-decision artifact revision as source evidence for routed Issue handoff state.

## Root Cause

The current design conflates two different kinds of change:

1. **decision-history mutation** — recording a reroute disposition, revision request, rationale, or other audit history; and
2. **effective route-selection change** — changing the authoritative selected route and therefore the route-scoped planning identity.

The canonical route-decision document's `artifactRevision` correctly changes when its history changes, but downstream planning interprets every such document mutation as though the effective route selection changed.

WIR23-REPAIR01 preserved the authoritative `decisionId` for same-route reroute dispositions, but downstream freshness is still bound to the mutable document revision rather than that stable effective-selection identity.

## Architectural Decision

### Decision history and effective selection are separate freshness domains

The route-decision document remains an auditable canonical record and MUST continue to revise when decision history is materially updated.

Downstream route-scoped planning/execution MUST NOT become stale merely because that history document changed while the effective selection remained the same.

The effective route dependency is the authoritative selection identity and semantics, including at minimum:

- Intake identity;
- authoritative route-selection `decisionId`;
- effective `selectedRouteId`;
- any selection traits that materially define the selected planning profile.

The existing route-scoped planning identity already carries `routeDecisionId` and `routeId`. The repair should use that stable selection boundary rather than treating every route-decision document byte/revision change as a route transition.

A real route change remains destructive to the superseded route lineage: it creates a new authoritative selection identity and continues to historicalize/invalidate affected downstream artifacts exactly as required by WIR23-REPAIR01.

Do not solve this by falsifying or suppressing canonical route-decision `artifactRevision` changes. Do not mass-rewrite otherwise-valid downstream artifacts solely to roll their source revision forward after a no-op reroute disposition.

## Repair Objective

Complete WIR23-REPAIR01's non-destructive reroute contract by separating mutable route-decision history freshness from stable effective-selection freshness.

When the Operator retains the current route, valid downstream route-scoped work must remain semantically current without being rewritten. When the effective route actually changes, existing supersession/invalidation behavior must remain intact.

## Required Correction

1. Inspect and correct the production planning dependency in `workPlanningKernel.ts` so route-scoped Assessment/Plan validity is governed by the effective selection identity rather than every mutation to the route-decision history document.
2. Preserve exact stale-input protection for Work Intake changes, planning-source changes, route changes, changed Issue evidence, and other genuine source mutations.
3. Preserve the canonical route-decision history document as an auditable revisioned artifact. Same-route reroute dispositions and reroute revision requests may still advance its artifact revision.
4. Do not rewrite valid Assessment/Plan artifacts merely because the route-decision history revision advanced while the effective selection remained unchanged.
5. Ensure a resolved same-route reroute returns the existing route-scoped planning artifacts to ordinary current use without requiring the Architect or Operator to recreate them.
6. While a reroute is genuinely pending or in `revision-requested` state, preserve the current rule that new route-scoped planning actions do not proceed as though routing were resolved.
7. After revised reroute advice is dispositioned while retaining the same effective route, previously valid downstream planning must remain current.
8. Inspect `workIssueRoutingService.ts` and `workIssueContext.ts` for the same mutable-document freshness coupling. A no-op reroute disposition must not invalidate an otherwise-current routed Issue handoff solely because route-decision history changed.
9. Preserve actual route-change behavior: a different selected route must still create the new authoritative selection identity, historicalize explicit downstream lineage, and prevent the superseded route's artifacts from being treated as current.
10. Keep the parent WIR23-REPAIR01 service-state and renderer legality fixes intact.

## Preserve

- Ordinary `selected` state rejects Accept, Override, and Request Revision until a real pending recommendation exists.
- `awaiting-decision` and `reroute-required` remain the only legal decision boundaries.
- Same-route reroute Override retains the prior authoritative selection `decisionId`.
- Request Revision retains the current authoritative selection.
- Real route changes create supersession evidence and historicalize only explicit affected downstream lineage.
- Stale assessment/reroute evidence fails closed.
- Work Intake identity and branch binding remain unchanged across reroute.
- Renderer decision controls remain capability/state-driven and non-authoritative.
- Issue Resolution reframe behavior.
- Canonical decision history remains complete and revisioned.

## In-Scope Surface to Inspect

- `src/main/workIntake/workRouteDecisionService.ts`
- `src/main/workPlanning/workPlanningKernel.ts`
- `src/main/workPlanning/workIssueRoutingService.ts`
- `src/main/workPlanning/workIssueContext.ts`
- `src/shared/workRouteDecisionContracts.ts` only if a narrowly required contract clarification is necessary
- `src/shared/workPlanningContracts.ts` only if a narrowly required semantic selection reference is necessary
- `test/architect-outputs/architect-output-workspace-repair.test.cjs`
- existing routed Issue Resolution proof under `test/issue-resolution/`

Only modify additional files when required to implement this exact freshness boundary.

## Forbidden Changes

- No new route taxonomy.
- No new routing workflow or alternate route-selection authority.
- No automatic route selection.
- No renderer-owned freshness or route authority.
- No suppression/falsification of canonical artifact revisions.
- No mass metadata rewrite of valid downstream artifacts merely to match the newest decision-history revision.
- No deletion/recreation of valid planning as the repair mechanism.
- No new Work Intake identity or branch.
- No broad planning-kernel redesign.
- No source-control, lifecycle-checkpoint, integration, or Research-closure work from WIR23-REPAIR02/03/04.
- No unrelated test-suite repair or full-suite execution requirement.
- No stage, commit, push, merge, tag, release, or publication unless separately directed by the Operator.

## Acceptance Criteria

1. A route-scoped Assessment/Plan created under authoritative selection A remains current after a pending reroute is overridden back to selection A.
2. The same scenario preserves the existing selection `decisionId`, produces no route supersession, leaves downstream artifacts byte-identical, and does not require reauthoring/re-review merely because route-decision history advanced.
3. Request Revision of a pending reroute retains selection A and does not historicalize or semantically stale valid downstream artifacts solely because the route-decision history document changed.
4. While reroute advice is pending or revision is requested, production planning still refuses to proceed as though routing were resolved.
5. After revised advice is resolved while retaining selection A, the previously valid Assessment/Plan is immediately recognized as current by the production planning service.
6. Accepting or overriding to route B still creates a genuinely new effective selection and leaves the prior route's affected Assessment/Plan historical/stale as required by the parent repair.
7. A Work Intake revision, changed planning source, changed Issue evidence, or changed effective route still fails the applicable freshness check; this repair must not weaken genuine stale-evidence protection.
8. A routed Issue Resolution handoff remains valid through a no-op reroute disposition when the authoritative Issue route selection is unchanged, but does not survive a genuine route change as current evidence.
9. Ordinary selected-state duplicate decisions remain rejected.
10. Renderer decision controls remain absent outside legal pending decision states.

## Regression Proof

Use the existing production-path route lifecycle proof rather than creating a parallel permanent suite.

Extend `test/architect-outputs/architect-output-workspace-repair.test.cjs` so the same-route retention scenarios prove not only byte preservation and supersession count, but also production planning freshness after disposition.

The proof must exercise the actual planning service/kernel after:

- same-route reroute Override;
- reroute Request Revision;
- revised reroute advice followed by same-route retention;
- real route change as the negative control.

Reuse the existing Issue Resolution production-path test where possible to prove the equivalent no-op reroute retention boundary. Extend that existing test only if its present assertions do not establish current Issue-route evidence after the route-history mutation.

Do not add a new permanent test merely to isolate this repair unless the existing stable proof boundaries cannot express the scenario. If a new test is unavoidable, the Implementer Report must identify the specific coverage gap.

Required focused validation:

- `node --test --test-concurrency=1 --test-name-pattern="Operator route decisions" test/architect-outputs/architect-output-workspace-repair.test.cjs`
- the existing focused routed Issue/reroute production-path test under `test/issue-resolution/issue-architect-planning-service.test.cjs`
- `node --check test/architect-outputs/architect-output-workspace-repair.test.cjs`
- `git diff --check`

Run `npm run typecheck` only as a compile sanity check if the current shared branch baseline permits it. Unrelated pre-existing diagnostics are to be recorded, not repaired under this card.

Do not run `npm test` or the full regression suite for this child repair. Bundle-wide acceptance remains WIR23 ownership.

## Repair Implementer Report

Write:

`docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR01-REPAIR01_IMPLEMENTER_REPORT.md`

Include:

- confirmed defect and root cause;
- exact effective-selection freshness mechanism implemented;
- production files changed;
- how canonical route history remains revisioned without invalidating unchanged effective selection;
- proof that retained planning remains current, not merely byte-identical;
- Issue Resolution impact/proof;
- focused command results;
- existing tests reused or extended;
- any new permanent test and its specific coverage-gap justification;
- deviations, blockers, and residual code-level risk.

Do not claim the parent WIR23-REPAIR01 complete if same-route history mutation can still invalidate otherwise-valid downstream work.

## Source-Control Scope

Do not create a checkpoint commit unless the Operator separately directs Git after Architect review.

This card does not authorize merge, push, branch cleanup, tag, release, or publication.

## Manual Validation

None expected. This is a deterministic state/freshness repair. Product-level WIR23 acceptance remains outside this child repair.

## Return to Workflow

After implementation, stop for Architect code review of WIR23-REPAIR01-REPAIR01.

If this child repair passes, return to closure review of parent WIR23-REPAIR01 and then the remaining WIR23 repair packet.
