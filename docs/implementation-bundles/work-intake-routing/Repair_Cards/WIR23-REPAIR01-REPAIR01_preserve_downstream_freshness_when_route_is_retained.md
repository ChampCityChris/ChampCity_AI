# WIR23-REPAIR01-REPAIR01 — Preserve Downstream Freshness When the Effective Route Is Retained

**Type:** Repair Work Card  
**Parent:** WIR23-REPAIR01  
**Experiment:** Implementer Reasoning Reduction  
**Implementer target:** GPT-5.6 Luna Medium

## A. Objective

Preserve already-valid route-scoped planning when a reroute recommendation is resolved without changing the effective Operator-selected route.

A same-route disposition may append route-decision history and advance the canonical route-decision document revision. That history change must not make an approved Assessment or Plan stale when all of the following remain unchanged:

- `route.selection.decisionId`;
- `route.selection.selectedRouteId`;
- the Work Intake revision/content;
- the Assessment/Plan's other semantic source revisions and digests.

A genuine route change must continue to supersede prior route-scoped work.

## B. Verified Repository Preconditions

### Production

`src/main/workIntake/workRouteDecisionService.ts` already:
- restricts decision mutation to `awaiting-decision` and `reroute-required`;
- keeps the previous authoritative `selection` when a reroute is overridden back to the already-selected route;
- increments the route-decision document revision for the new history entry;
- supersedes explicit downstream lineage only when the selected route actually changes.

Do not change those semantics in this card.

`src/main/workPlanning/workPlanningKernel.ts` currently:
- identifies planning artifacts by stable `routeDecisionId + routeId`;
- includes the route-decision document in `sourceRevisions` and `sourceDigests`;
- uses exact source revision/digest equality in `readArtifact()` freshness;
- uses the route decision as `sourceHandoff`;
- therefore treats a history-only route-document revision/hash change as semantic staleness.

The route-decision source edge is still required for explicit downstream provenance/supersession. It must not be removed from persisted `sourceRevisions`.

`src/main/workPlanning/workIssueContext.ts` resolves routed Issue identity from stable `routeDecisionId + routeId`; it does not independently require the route-decision document revision.

### Existing proof surfaces

Reuse:
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs` — existing Feature planning owner;
- `test/architect-outputs/architect-output-workspace-repair.test.cjs` — existing route-decision/supersession owner;
- `test/issue-resolution/issue-architect-planning-service.test.cjs` — routed Issue identity/RCA owner.

Do not create a new permanent test file.

## C. Exact Implementation Delta

### 1. Distinguish route provenance from semantic freshness in `workPlanningKernel.ts`

Modify only the planning freshness implementation; do not change artifact identity or persisted lineage.

Add an internal planning-context field naming the route-decision provenance path, e.g. `provenanceOnlySourcePaths: string[]`. For current route-scoped planning this contains exactly `route.relativePath`.

Keep all of the following unchanged in newly written planning artifacts:
- the full route source in `sourceRevisions`;
- the full route source digest in `workflowData.sourceDigests`;
- `sourceHandoff`;
- `routeDecisionId` and `routeId` identity.

Add a helper that evaluates semantic freshness after excluding only the context-declared provenance-only path(s) from:
- source revision equality; and
- source digest currency/equality.

Use that semantic comparison only when `readArtifact()` decides whether an already-promoted Assessment/Plan is stale.

Do **not** weaken preparation/promotion concurrency checks. `sameContext()` and `resolvePromotionContext()` must remain strict for an in-flight temporary draft. A route-history change while a draft is being prepared may still require a fresh draft.

All non-route sources remain exact freshness dependencies. In particular:
- Work Intake revision/content change still stales Assessment and Plan;
- Assessment revision/content change still stales Plan;
- Issue/RCA source change still stales routed Issue Plan;
- missing or unreadable source still fails closed.

A real route change needs no special stale exception because it changes the effective route identity and current artifact path/participation semantics.

### 2. Add retained-route planning regression proof

Extend the existing top-level Feature planning test in:
`test/architect-outputs/architect-output-prompt-contracts.test.cjs`.

After its Assessment and Plan have been promoted:
1. capture the complete Assessment and Plan file bytes;
2. read the current route decision and retain the current `selection`;
3. create a reroute recommendation to a **different** supported route using the current Plan as bounded source evidence;
4. dispose that reroute with `override` back to the currently selected `feature-change` route;
5. prove:
   - resulting `selection.decisionId` is unchanged;
   - resulting selected route is unchanged;
   - route-decision artifact revision advanced;
   - no downstream supersession was added for the retained route;
   - `workPlanningKernel.get(..., "assessment")` returns the original Assessment as not stale;
   - `workPlanningKernel.get(..., "plan")` returns the original Plan as not stale;
   - Assessment and Plan bytes are unchanged.

### 3. Add retained-route Issue identity proof

Extend the existing top-level routed Issue test in:
`test/issue-resolution/issue-architect-planning-service.test.cjs`.

Immediately after the canonical routed Issue handoff is created:
1. retain the handoff bytes and current route `selection`;
2. recommend a reroute to a distinct route using the handoff as source evidence;
3. dispose that reroute with `override` back to `issue-resolution`;
4. call routed Issue `status`;
5. prove:
   - effective selection ID and route remain unchanged;
   - the same Issue ID and handoff path are returned;
   - handoff bytes are unchanged;
   - the handoff is still non-historical.

Do not redesign Issue/RCA persistence in this card. If this exact proof requires production changes outside `workPlanningKernel.ts`, stop under the mismatch policy rather than widening scope.

## D. Expected Change Boundary

Expected modified files:
- `src/main/workPlanning/workPlanningKernel.ts`
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`
- `test/issue-resolution/issue-architect-planning-service.test.cjs`

Expected unchanged:
- `src/main/workIntake/workRouteDecisionService.ts`
- `src/main/workPlanning/workIssueRoutingService.ts`
- `src/main/workPlanning/workIssueContext.ts`
- shared schemas/contracts
- integration services
- validation catalog unless measured test metadata is mechanically required by existing test governance

The required Implementer Report is the only expected additional artifact.

## E. Architectural Decisions Already Made

1. Effective route identity is `routeDecisionId + selectedRouteId`, not the mutable route-history document revision.
2. The route-decision document remains explicit provenance.
3. Provenance-only exemption applies only to already-promoted artifact freshness.
4. Draft promotion remains strict against any source/context change.
5. Real route changes continue to historicalize/supersede prior route-scoped work.
6. No migration or rewrite of existing valid planning artifacts is permitted.

## F. Test and Validation Contract

Modify existing tests only; no new permanent file.

Run:
1. `npm run typecheck`
2. `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="Feature planning requires baseline delta" test/architect-outputs/architect-output-prompt-contracts.test.cjs`
3. `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="Operator route decisions preserve authority" test/architect-outputs/architect-output-workspace-repair.test.cjs`
4. `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="routed defect preserves Intake and branch" test/issue-resolution/issue-architect-planning-service.test.cjs`

Acceptance:
- retained-route Planning proof passes with unchanged Assessment/Plan bytes;
- existing real-route supersession proof still passes;
- retained-route Issue handoff proof passes;
- typecheck passes.

Do not run the full suite, full-supported-platform, packaging, performance/soak, or unrelated validation profiles.

## G. Forbidden Changes

Do not:
- suppress route-decision revision increments;
- remove route-decision provenance from persisted planning source revisions;
- rewrite current Assessment/Plan merely to refresh route-history metadata;
- weaken Work Intake, Assessment, RCA, or other source freshness;
- alter reroute authority semantics;
- create fallback compatibility artifacts;
- add a new test file;
- broaden into Research or sequential-Intake repair.

## H. Mismatch Policy

Implementer-local:
- naming of the internal provenance-path helper;
- assertion wording;
- trivial TypeScript narrowing/import corrections.

Stop with `CARD_REPOSITORY_MISMATCH` if:
- preserving retained-route Issue identity requires changing Issue persistence/service semantics;
- current route selection identity changes during same-route override;
- real-route supersession depends on removing the route source edge;
- another source must be exempted from freshness;
- shared schema or persistence migration becomes necessary.

## I. Completion Evidence

Report:
- exact files changed;
- exact freshness rule implemented;
- confirmation full route provenance is still persisted;
- confirmation real-route supersession test still passes;
- confirmation retained-route Assessment/Plan bytes remain unchanged;
- confirmation routed Issue handoff remains current;
- exact four validation commands/results;
- any local correction, deviation, or mismatch.
