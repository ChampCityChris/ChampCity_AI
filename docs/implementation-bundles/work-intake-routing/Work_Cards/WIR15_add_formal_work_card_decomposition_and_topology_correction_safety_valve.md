# WIR15 — Add Formal Work Card Decomposition and Topology Correction Safety Valve

**Order:** 15 of 23  
**Depends on:** `WIR07`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR15_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- Current Work Card planning produces one Formal Work Card per candidate with no general decomposition state.
- WC02 planning demonstrated that a candidate can become oversized after deeper inspection/revision.
- `test/work-card-planning/work-card-planning-service.test.cjs` owns current planning/revision behavior.

At card start, re-verify repository state and dependency reports. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Allow Formal Work Card planning to stop and propose decomposition when detailed inspection proves a candidate is no longer one bounded unit, including direct→phased correction when genuine Phase boundaries emerge.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR15
→ focused validation
→ write WIR15 report
→ checkpoint commit
→ read WIR16 from repository
```

## Required Changes

1. Add a boundedness/decomposition result distinct from implementation disposition.
2. Allow ordered sibling Work Item decomposition or direct→phased topology correction with rationale/dependencies.
3. Require Operator accept/revise; do not add a mandatory decomposition gate for bounded candidates.
4. Persist superseded-by-decomposition lineage.
5. Resume at first eligible replacement Work Item without restarting Work Intake/route architecture.

## Preserved Behavior

- Existing Formal Work Card path when no decomposition needed.
- Work Card identity/history.
- Operator authority over plan change.

## In-Scope Surface to Inspect

- `src/main/workCardPlanning/*`
- `src/main/workCardIntake/*`
- `src/main/architectOutputs/*`
- `work-card plan presentation`
- `test/work-card-planning/work-card-planning-service.test.cjs`
- `test/work-card-intake/work-card-intake-service.test.cjs`
- `test/renderer/work-card-plan-presentation.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Bounded candidate follows existing path without new gate.
2. Oversized candidate can return decomposition instead of giant card.
3. Accepted sibling decomposition preserves ordering/dependencies/lineage.
4. Accepted topology correction can introduce Phases without rerunning Work Intake.
5. Operator controls acceptance/revision.

## Negative Constraints

- No automatic split by card length alone.
- No history deletion.
- No implementation of replacement cards here.
- No Git mutation.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/work-card-planning/work-card-planning-service.test.cjs test/work-card-intake/work-card-intake-service.test.cjs test/renderer/work-card-plan-presentation.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR15_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

None.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR16` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
