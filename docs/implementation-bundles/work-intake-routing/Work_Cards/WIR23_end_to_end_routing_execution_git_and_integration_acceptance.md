# WIR23 — End-to-End Routing, Execution, Git, and Integration Acceptance

**Order:** 23 of 23  
**Depends on:** `WIR08`, `WIR09`, `WIR10`, `WIR11`, `WIR12`, `WIR13`, `WIR14`, `WIR15`, `WIR17`, `WIR18`, `WIR19`, `WIR20`, `WIR21`, `WIR22`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- WIR01–WIR22 form one lifecycle from Start Work through routing, planning, execution, machine Git, integration, and Integration Repair.
- This is the only bundle card intended to run broader regression and require Operator-facing end-to-end validation.
- Architecture section 18 defines final acceptance.

At card start, re-verify repository state and dependency reports. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Prove the complete Work Intake architecture as one coherent current-application feature, remove only compatibility debris proven obsolete, and produce final evidence before resetting ChampCity refactor planning.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR23
→ focused validation
→ write WIR23 report
→ return bundle
```

## Required Changes

1. Create deterministic end-to-end fixtures/scenarios without duplicating lower-level proof unnecessarily.
2. Prove Greenfield, Feature delta, Refactor transformation, Integration, Infrastructure, Research no-implementation closure, and Issue RCA routes.
3. Prove Operator override, reroute preservation, decomposition, direct Plan, phased Plan, complex Issue phased correction.
4. Prove one Intake/one branch, Work Item checkpoint, clean integration, advanced-target clean merge, mechanical conflict, post-merge validation failure, Integration Repair, repaired integration.
5. Prove existing Project can open new Intake without recreating original Project Intake.
6. Prove separate sequential Intakes can isolate platform migration from later governance/feature work.
7. Remove only compatibility code proven obsolete; document retained compatibility.

## Preserved Behavior

- No Electron→service/browser refactor starts.
- Historical Project/Phase/V2 planning is not deleted.
- Release behavior unchanged except existing build proof.

## In-Scope Surface to Inspect

- `all WIR01–WIR22 owned surfaces`
- `characterization suites`
- `workflow hub renderer`
- `source-control integration fixtures`
- `architecture/governance consistency surfaces`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. All architecture acceptance outcomes proven.
2. Focused aggregate test set passes.
3. `npm run typecheck` and `npm run build` pass.
4. `npm test` full regression runs once with elapsed time and truthful unrelated/pre-existing failure reporting.
5. Failed/conflicted integration never advances target.
6. No agent Git ownership path remains in new lifecycle.
7. Report names exact remaining Operator validation.

## Negative Constraints

- Do not begin new ChampCity refactor Plan.
- Do not silently delete old planning corpus.
- No broad cleanup beyond proven obsolete compatibility.
- Do not hide/reclassify failing tests.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/project-intake/project-intake-service.test.cjs test/architect-interview/architect-interview-workspace.test.cjs test/project-planning/project-planning-service.test.cjs test/characterization/desktop-development-lifecycle.test.cjs test/characterization/desktop-issue-lifecycle.test.cjs test/work-card-planning/work-card-planning-service.test.cjs test/work-card-loop/work-card-loop-state-service.test.cjs test/agent-harness/git-mutation-boundary.test.cjs test/renderer/workflow-hub-shell.test.cjs`
- `npm test`

This card owns the bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

Required after Implementer completion: Operator exercises Start Work for at least representative Feature, Refactor, and Issue cases and reviews route/topology/branch/integration presentation. Earlier cards must not pause for this validation.

## Post-Implementation Path

After implementation and required validation pass, write the WIR23 Implementer Report, create the single WIR23 checkpoint commit through the execution harness, verify the checkpoint succeeded, then stop and return all reports/evidence to the Operator for final review.
