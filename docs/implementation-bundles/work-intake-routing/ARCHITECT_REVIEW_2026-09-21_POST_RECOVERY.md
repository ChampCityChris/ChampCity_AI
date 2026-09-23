# WIR Post-Recovery Architect Review — Luna Experiment

**Review date:** 2026-09-21  
**Scope:** Current Work Intake Routing implementation and WIR23 repair state after Test Suite Recovery  
**Experiment standard:** Brain_Dump `IMPLEMENTER_READY_WORK_CARD_STANDARD.md`

## Result

Current source review confirms three unresolved WIR defect areas.

### 1. Retained-route history still invalidates downstream planning freshness

WIR23-REPAIR01 correctly restricts route decisions to pending decision states and preserves the prior authoritative selection when a reroute recommendation is disposed back to the same route.

The remaining child defect is in downstream freshness. `workPlanningKernel.ts` still records the mutable route-decision document revision and digest as a normal freshness dependency. A same-route disposition therefore advances route history while leaving `routeDecisionId` and `routeId` unchanged, yet an already valid Assessment/Plan can become stale solely because the audit/history document changed.

The route-decision artifact must remain in `sourceRevisions` for explicit lineage and later supersession traversal. The repair must therefore distinguish provenance from semantic freshness rather than deleting that edge.

### 2. Planning-only Research closure still cannot reach integration

The Research profile correctly supports an approved `no-implementation-plan-required` outcome and refuses to manufacture a Plan, Work Item, or Phase.

However:
- there is no Research lifecycle-evidence checkpoint boundary;
- `IntegrationCandidateRecord` and `IntegrationCandidateService` are Plan-specific;
- Integration Repair requires a Plan source;
- `routedIntegrationService` loads only completed Plan execution;
- `getRoutedWorkflow` begins by resolving a Plan; and
- the renderer exposes no integration path from approved Research closure.

The repair is decomposed into three cards so that no Implementer is asked to redesign the integration model during execution:
- REPAIR03A: establish deterministic Research completion identity/checkpoint;
- REPAIR03B: make IntegrationCandidate consume generic completion evidence while preserving Plan behavior;
- REPAIR03C: connect approved Research closure through checkpoint, candidate validation, target advancement, and UI.

### 3. Sequential Work Intake still defaults to the current Work Intake branch

`getWorkIntakeProjection()` exposes the raw current checkout and branches but no application-owned suggested integration base.

`WorkIntakeWorkspace.tsx` chooses the current branch first. After starting one Intake, the current checkout is its `work-intake/...` branch, so opening another Intake can default to nesting under the prior Intake.

Explicitly selecting such a branch should remain possible. The defect is the default. The service must compute a current target suggestion from the existing Intake binding and current branch inventory; the renderer must consume that suggestion without inventing Git policy.

## WIR23-REPAIR02

No new repair is required for WIR23-REPAIR02.

Current `routedDevelopmentExecutionService.ts` checkpoints Work Item close and approved Phase/Plan acceptance through `checkpointLifecycleEvidence()`. The checkpoint service is bounded, validates exact canonical evidence, fails closed on unrelated changes, and the later recovered suite qualified the current permanent corpus. The incomplete broad run reported during the original repair is no longer an unresolved implementation defect.

## Repair order for the experiment

1. `WIR23-REPAIR01-REPAIR01` — retained-route downstream freshness.
2. `WIR23-REPAIR04` — sequential Intake target suggestion.
3. `WIR23-REPAIR03A` — Research completion/checkpoint.
4. `WIR23-REPAIR03B` — generic IntegrationCandidate completion evidence.
5. `WIR23-REPAIR03C` — Research integration workflow and UI.

Each card is independently reviewable. Do not combine them into one Luna session.
