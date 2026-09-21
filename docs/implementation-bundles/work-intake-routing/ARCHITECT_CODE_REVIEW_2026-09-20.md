# Work Intake Routing — Architect Code Review

**Review date:** 2026-09-20  
**Reviewed implementation:** current `codex/work-intake-routing-finish` source at Architect inspection  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`

## Architect Recommendation

**Repair required before the Work Intake Routing package should be treated as architecturally complete.**

The implementation is substantial and the core architecture is recognizable in production code: universal Work Intake, advisory routing, Operator route authority, route-specific planning profiles, direct/phased Plan semantics, shared execution, machine-owned source checkpoints, isolated integration candidates, and bounded Integration Repair are all represented by real service-owned code rather than renderer-only state.

The review found four implementation defects in the production call chain. Two are lifecycle blockers, one can destructively supersede valid planning evidence, and one can make sequential Intakes accidentally inherit the prior Work Intake branch.

## Conforming Architecture

### Routing and authority

- `src/shared/workIntakeRoutingContracts.ts` defines one route taxonomy independent of Plan topology.
- Routing assessment remains advisory in `workRoutingAssessmentService.ts`.
- Operator route selection is durable evidence in `workRouteDecisionService.ts`.
- Renderer panels call service actions; they do not own route legality as durable state.

### Route-specific planning

- `workPlanningProfiles.ts` composes route-specific discovery content over one shared kernel.
- Feature planning is expressed as a bounded delta against the current product.
- Refactor/Migration planning is centered on current architecture, target architecture, preservation, seams, cutover, rollback, and retirement.
- Integration/Composition is characterize-first and build-versus-integrate.
- Infrastructure planning remains operational rather than becoming a private implementation engine.
- Research explicitly supports evidence-only closure without manufacturing production work.
- Issue Resolution retains bespoke RCA while correction planning converges on shared Plan semantics.

### Plan execution

- `workPlanStructure.ts` keeps route identity independent from `direct | phased` topology and validates dependency structure.
- `planExecutor.ts` is the shared progression engine.
- Routed Development binds approved Plans to the established Work Card lifecycle instead of creating a second implementation engine.
- Phase and Plan acceptance are represented as canonical service-owned evidence.

### Source control and integration

- `sourceControlService.ts` wraps deterministic Git mechanics behind application-owned operations and receipts.
- Work Intake branch creation fails closed around exact base/ref evidence.
- Implementation source checkpointing is machine-owned.
- Integration uses an isolated candidate and does not advance the target on conflict or failed required validation.
- Integration Repair edits bounded source while ChampCity retains source-control transitions.

The newer provider-neutral Source-Control and RepositoryCheckout architectures supersede Git terminology as the long-term domain model, but the current Git-backed compatibility implementation is not itself a defect in this package. RepositoryCheckout orchestration remains a separate implementation concern.

## Finding AR-WIR-01 — Route decision legality can destructively supersede valid planning

**Severity:** High  
**Repair:** `WIR23-REPAIR01`

### Confirmed code path

`getWorkRouteDecision()` retains the original routing assessment as `recommendation` and `sourceAssessment` after a route has already been selected.

`decideWorkRoute()` does not require a current pending decision state before accepting another Accept/Override decision.

`WorkRouteDecisionPanel.tsx` keeps the decision controls enabled in normal `selected` state.

When any second non-revision decision is recorded and `model.selection` already exists, `decideWorkRoute()` always computes downstream artifacts, records a supersession, and marks those artifacts historical. It does this even when the selected route did not change.

### Consequences

1. An Operator can accidentally re-accept the original assessment after planning has begun and invalidate valid downstream planning.
2. When an Architect recommends a reroute, the Operator can intentionally retain the existing route by overriding back to the current route, but the service still historicalizes downstream work even though no route was superseded.

### Required correction

Decision legality must be enforced by the service state machine. Downstream supersession must occur only when the effective route actually changes.

## Finding AR-WIR-02 — Post-implementation workflow evidence is not durably checkpointed

**Severity:** Critical  
**Repair:** `WIR23-REPAIR02`

### Confirmed code path

`codexImplementerExecutionService.ts` captures a machine source checkpoint before implementation and calls `completePlanWorkItemSource()` when implementation source/report output is ready.

That checkpoint occurs before the remainder of the Work Item lifecycle.

After the source checkpoint, production services write additional canonical evidence:

- Implementer Report review disposition;
- validation records;
- Repair/validation lifecycle records where applicable;
- Work Item close-return consumption;
- Phase acceptance;
- Plan acceptance.

Repository search found no second application-owned commit path for those lifecycle writes. `sourceControl.commit()` is used only by the source checkpoint service.

### Consequences

For a multi-Work-Item Plan, the next Work Item can begin with prior lifecycle artifacts already dirty. The next source checkpoint then sees pre-existing changes that do not belong to the new implementation source set and may reject them as unrelated.

At final Plan completion, Plan/Phase acceptance is written after the last implementation source checkpoint. `integrationCandidateService.current()` requires the incoming checkout to be clean. The completed Plan can therefore reach the integration boundary with required workflow evidence still uncommitted.

### Required correction

Keep the existing implementation source checkpoint. Add deterministic machine-owned lifecycle-evidence checkpoints at completion boundaries so canonical workflow state is durably committed and the Work Intake checkout returns clean before subsequent execution or integration.

## Finding AR-WIR-03 — Research no-implementation closure has no complete source-control lifecycle

**Severity:** High  
**Repair:** `WIR23-REPAIR03`  
**Depends on:** `WIR23-REPAIR02`

### Confirmed code path

`researchPrototypeProfile.ts` and `workPlanningKernel.ts` correctly allow an approved `no-implementation-plan-required` outcome.

`WorkPlanningPanel.tsx` correctly presents that state as “Research closed — no implementation Plan required.”

No production path then creates a terminal Work Intake source revision or integrates the accepted research evidence. The current integration service is Plan-specific and requires `PlanExecutionInput`; the Research path correctly refuses to fabricate a Plan.

### Consequences

A valid evidence-only Research Intake can be semantically closed while its Intake/routing/research evidence remains only on the Work Intake branch.

Because no implementation Work Item exists, the normal source checkpoint never occurs. The accepted research decision is not carried back through the shared integration lifecycle, and the dirty Work Intake can interfere with starting subsequent work.

### Required correction

Research closure must use a planning-only terminal checkpoint and the same isolated integration mechanics without inventing a fake Plan, Phase, or Work Item.

## Finding AR-WIR-04 — A subsequent Intake can default to the previous Work Intake branch

**Severity:** Medium-High  
**Repair:** `WIR23-REPAIR04`

### Confirmed code path

`getWorkIntakeProjection()` exposes the current Git branch but does not provide a service-owned recommended integration baseline.

`WorkIntakeWorkspace.tsx` initializes the next Intake's base to the currently checked-out branch.

Successful integration advances the target ref through `update-ref` but does not switch the application checkout away from the completed Work Intake branch.

### Consequences

Opening Start Work after completing an Intake can default the new Intake to the old `work-intake/...` branch rather than that Intake's intended integration target.

The same accidental nesting can happen while a Work Intake branch is temporarily clean.

### Required correction

The service must resolve the appropriate suggested base SourceLine/branch. When the current checkout belongs to a Work Intake, the default must be that Intake's recorded integration target at its current commit, not the Work Intake branch itself. The Operator may still deliberately choose another supported target.

## Non-Blocking Follow-Up

Successful integration currently retains the machine integration candidate checkout/branch. That cleanup belongs naturally with the adopted RepositoryCheckout lifecycle work unless it causes a concrete current-product failure. It is not included in this repair packet.

## Repair Order

1. `WIR23-REPAIR01` — enforce route-decision state legality and non-destructive reroute retention.
2. `WIR23-REPAIR02` — add durable lifecycle-evidence checkpoints.
3. `WIR23-REPAIR03` — complete planning-only Research Intakes through shared integration.
4. `WIR23-REPAIR04` — preserve the intended target baseline for sequential Intakes.

`WIR23-REPAIR01` and `WIR23-REPAIR04` are mechanically independent. `WIR23-REPAIR03` depends on the lifecycle checkpoint capability established by `WIR23-REPAIR02`.

## Architect Disposition

The package does **not** require architectural redesign. The routing/planning/execution model is sound enough to preserve.

The required work is bounded repair of state-machine legality and completion/source-control lifecycle seams. After these repairs, the Work Intake architecture can proceed without reopening the already implemented route profiles, shared planning kernel, generic execution model, or Integration Repair architecture.
