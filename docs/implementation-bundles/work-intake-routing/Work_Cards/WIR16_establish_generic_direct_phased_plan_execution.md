# WIR16 — Establish Generic Direct / Phased Plan Execution

**Order:** 16 of 23  
**Depends on:** `WIR07`, `WIR15`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR16_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- `src/main/workCardLoop/*`, Phase close/validation, and Issue lifecycle contain overlapping progression semantics.
- Structured Project State already separates Workflow, Phase, Work Item, validation, decisions, and close eligibility.
- Architecture requires generic Plan execution with optional Phases.

At card start, re-verify repository state and dependency reports. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Create one route-independent Plan executor that derives eligible Work Items, optional Phase progression, blocking state, and completion from the approved Plan rather than the Work Route.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR16
→ focused validation
→ write WIR16 report
→ checkpoint commit
→ read WIR17 from repository
```

## Required Changes

1. Define generic Plan execution/query contracts for direct and phased Plans.
2. For direct Plans derive Work Item eligibility/progression and Plan completion from dependencies/criteria/blocking state.
3. For phased Plans derive Phase eligibility/progression plus Work Item and Phase/Plan completion.
4. Keep implementation/review/validation/repair hooks abstract for WIR17/WIR18 adapters.
5. Never inspect route ID to decide implementation progression.

## Preserved Behavior

- Current Work Card/Phase completion semantics as reference behavior.
- No renderer cutover.
- No structured-state database migration.

## In-Scope Surface to Inspect

- `src/main/workCardLoop/*`
- `src/main/phaseClose/*`
- `src/main/workCardValidation/*`
- `shared lifecycle contracts`
- `test/work-card-loop/work-card-loop-state-service.test.cjs`
- `test/phase-close/phase-close-service.test.cjs`
- `test/phase-close/phase-validation-state.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Direct Plan with dependency-aware Work Items is representable.
2. Phased Plan progression is representable.
3. Executor is route-agnostic.
4. Completion distinguishes Work Item, Phase, Plan.

## Negative Constraints

- No caller migration yet.
- No new persistence database.
- No route-specific branches in executor.
- No Git checkpointing yet.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/work-card-loop/work-card-loop-state-service.test.cjs test/phase-close/phase-close-service.test.cjs test/phase-close/phase-validation-state.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR16_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

None.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR17` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
