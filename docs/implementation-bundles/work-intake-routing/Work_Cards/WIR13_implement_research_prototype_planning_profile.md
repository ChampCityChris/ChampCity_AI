# WIR13 — Implement Research / Prototype Planning Profile

**Order:** 13 of 23  
**Depends on:** `WIR07`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR13_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- The architecture explicitly allows Research/Prototype to terminate without an implementation Plan.
- Current generic planning assumes delivery-oriented roadmap output.

At card start, re-verify repository state and dependency reports. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Create a bounded Research/Prototype profile whose legitimate completion may be evidence plus an Operator decision rather than production implementation.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR13
→ focused validation
→ write WIR13 report
→ checkpoint commit
→ read WIR14 from repository
```

## Required Changes

1. Define profile evidence/discovery for hypothesis/question, decision enabled, alternatives, bounded prototype, required evidence, success/failure criteria, disposable/promotable output, expiration/closure.
2. Allow a durable outcome of `no implementation Plan required`.
3. If production work is recommended, require an explicit later planned body of work rather than silently promoting prototype output.
4. Keep the profile materially distinct from Greenfield and Feature.

## Preserved Behavior

- Shared planning kernel.
- Operator controls promotion/next action.
- No prototype is productionized automatically.

## In-Scope Surface to Inspect

- `planning profile registry/kernel`
- `project-planning output contracts`
- `decision/disposition mechanics`
- `test/project-planning/project-planning-service.test.cjs`
- `test/documents/canonical-markdown-document.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Research can close with evidence/decision and zero implementation Work Items.
2. Prototype output is classified disposable or candidate-for-later-work.
3. Production follow-up requires explicit new planning.
4. No fake Phase/Work Card is manufactured to satisfy a template.

## Negative Constraints

- No automatic prototype promotion.
- No production implementation.
- No Git mutation.
- No mandatory Phase topology.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs test/documents/canonical-markdown-document.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR13_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

None.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR14` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
