# WIR07 — Build Shared Planned-Work Planning Kernel and PlanTopology Contract

**Order:** 7 of 23  
**Depends on:** `WIR06`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR07_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- Current Project/Phase/Work Card planning is a greenfield-shaped chain.
- Existing Architect handoff/draft/revision/promotion mechanics are common reusable infrastructure.
- Architecture separates Route from Plan topology.

At card start, re-verify repository state and every dependency report. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Create one reusable planning kernel for route-specific Architect assessment/planning and explicit `PlanTopology = direct | phased`, keeping route reasoning separate from execution topology.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR07
→ focused validation
→ write WIR07 report
→ checkpoint commit
→ read WIR08 from repository
```

## Required Changes

1. Define route-scoped Architect assessment/Plan identity and `direct | phased` topology.
2. Build common route/profile resolution, handoff, draft promotion, revision, lineage/freshness, and Plan approval/revision mechanics.
3. Allow profiles to declare required evidence/questions/output sections and topology recommendation criteria.
4. Represent direct Plans without a Phase layer; phased Plans expose explicit Phase candidates/dependencies.
5. Keep topology as Operator-reviewed Plan content.

## Preserved Behavior

- Existing Architect draft mechanics.
- Current Phase/Work Card artifacts remain compatible until later adapters.
- No current execution workflow is retired.

## In-Scope Surface to Inspect

- `src/main/projectPlanning/*`
- `src/main/phaseMap/*`
- `src/main/phasePlanning/*`
- `src/main/workCardIntake/*`
- `src/main/architectOutputs/*`
- `shared planning contracts`
- `test/project-planning/project-planning-service.test.cjs`
- `test/phase-map/phase-map-service.test.cjs`
- `test/phase-planning/phase-planning-service.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Kernel resolves selected route to a profile without service duplication.
2. Plan can be direct or phased.
3. Plan approval/revision is explicit and freshness-safe.
4. Route ID alone never selects an implementation loop.

## Negative Constraints

- No full profile content beyond minimal contracts.
- No Development/Issue execution migration.
- No third topology.
- No Git mutation.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs test/phase-map/phase-map-service.test.cjs test/phase-planning/phase-planning-service.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR07_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

None.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR08` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
