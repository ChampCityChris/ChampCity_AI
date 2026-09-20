# WIR09 — Implement Feature / Capability Change Planning Profile

**Order:** 9 of 23  
**Depends on:** `WIR07`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR09_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- Current generic planning has some existing-product guidance but one generic roadmap path.
- Architecture requires baseline + requested delta + preserved behavior + affected architecture.
- WIR07 supplies shared mechanics/topology.

At card start, re-verify repository state and every dependency report. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Create an existing-product Feature profile that plans the requested capability delta rather than regenerating the whole product.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR09
→ focused validation
→ write WIR09 report
→ checkpoint commit
→ read WIR10 from repository
```

## Required Changes

1. Define Feature profile around baseline, requested capability, preserved behavior, affected services/state/UI/contracts, integration points, rollout/compatibility, regression boundary.
2. Require unrelated known future improvements to remain out unless hard dependencies.
3. Recommend direct/phased topology from actual dependency/milestone structure.
4. Produce Work Item/Phase candidates only for the feature delta.

## Preserved Behavior

- Existing behavior outside feature boundary is preserved unless explicitly superseded.
- Shared planning kernel.
- No execution changes.

## In-Scope Surface to Inspect

- `planning profile registry/kernel`
- `project-planning prompt composition`
- `architect handoff generation`
- `test/project-planning/project-planning-service.test.cjs`
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Feature profile is materially distinct from Greenfield.
2. Output requires baseline/delta/preservation.
3. Unrelated roadmap goals are not silently included.
4. Direct/phased both supported.

## Negative Constraints

- Do not treat feature as a new Project.
- Do not force Phases.
- No feature execution code.
- No Git mutation.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs test/architect-outputs/architect-output-prompt-contracts.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR09_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

None.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR10` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
