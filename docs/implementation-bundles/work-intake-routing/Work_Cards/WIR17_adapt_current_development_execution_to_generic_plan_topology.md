# WIR17 — Adapt Current Development Execution to Generic Plan Topology

**Order:** 17 of 23  
**Depends on:** `WIR16`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR17_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- `test/characterization/desktop-development-lifecycle.test.cjs` freezes current Development lifecycle.
- Work Card building/review/validation/repair and Phase services own current execution.
- WIR16 now provides route-independent progression.

At card start, re-verify repository state and dependency reports. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Move existing Development direct Work Card and Phase→Work Card progression behind the generic Plan executor while preserving validated implementation/review/validation/repair behavior.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR17
→ focused validation
→ write WIR17 report
→ checkpoint commit
→ read WIR18 from repository
```

## Required Changes

1. Create Development adapter from current planning artifacts/state into generic Plan execution.
2. Route current-stage/current-eligible Work Item/Phase progression through generic executor.
3. Preserve implementation, Implementer Report review, validation, Repair, close/next, and Phase validation semantics.
4. Remove only Development-only progression decisions demonstrably superseded; retain compatibility projections as needed.

## Preserved Behavior

- Current Development UI behavior except moved state ownership.
- Current Repair/validation behavior.
- Current Work Card artifact compatibility.

## In-Scope Surface to Inspect

- `src/main/workCardLoop/*`
- `src/main/workCardBuilding/*`
- `src/main/workCardValidation/*`
- `src/main/workCardRepair/*`
- `current workflow aggregation`
- `test/characterization/desktop-development-lifecycle.test.cjs`
- `test/work-card-building/work-card-building-review-service.test.cjs`
- `test/work-card-validation/work-card-validation-service.test.cjs`
- `test/work-card-repair/work-card-repair-service.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Direct Development runs through generic Plan progression.
2. Phased Development runs through generic Phase progression.
3. Characterization remains green except explicitly superseded architecture.
4. No duplicate Development-only executor is needed for migrated progression.

## Negative Constraints

- No runtime/model redesign.
- No Issue migration yet.
- No Git checkpoints yet.
- No broad renderer rewrite.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/characterization/desktop-development-lifecycle.test.cjs test/work-card-building/work-card-building-review-service.test.cjs test/work-card-validation/work-card-validation-service.test.cjs test/work-card-repair/work-card-repair-service.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR17_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

Final user-flow validation deferred to WIR23.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR18` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
