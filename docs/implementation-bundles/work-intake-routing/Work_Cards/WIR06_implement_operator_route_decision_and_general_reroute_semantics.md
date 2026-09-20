# WIR06 — Implement Operator Route Decision and General Reroute Semantics

**Order:** 6 of 23  
**Depends on:** `WIR05`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR06_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- Issue Resolution currently has a one-off `Reframe to Development/Feature` recommendation.
- Architecture requires a durable Operator-selected route and general reroute mechanism.
- Current document disposition/revision mechanics provide review-state patterns.

At card start, re-verify repository state and every dependency report. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Make route selection an explicit Operator decision that may accept/override/revise the Architect recommendation and later be superseded without recreating Work Intake or its branch.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR06
→ focused validation
→ write WIR06 report
→ checkpoint commit
→ read WIR07 from repository
```

## Required Changes

1. Implement accept recommendation, Operator override, and request revised assessment actions.
2. Persist selected route and decision provenance against current Intake.
3. Implement general reroute preserving Intake/branch while superseding stale route-specific downstream artifacts.
4. Expose current route/reroute-required state through service/UI projection.
5. Reject stale assessment-driven decisions.

## Preserved Behavior

- Operator remains sole authority.
- History/revisions remain inspectable.
- No downstream implementation occurs from route selection.

## In-Scope Surface to Inspect

- `WIR routing contracts/assessment`
- `document revision/disposition services`
- `issue route recommendation contracts`
- `renderer review surfaces`
- `test/architect-outputs/architect-output-workspace-repair.test.cjs`
- `test/issue-resolution/issue-architect-planning-service.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Operator can accept or override valid recommendation.
2. Selected route is durable evidence tied to Intake revision.
3. Reroute preserves Intake/branch/history and stales prior route-specific downstream output.
4. No hidden automatic routing.

## Negative Constraints

- No route-specific planning profiles.
- Do not conflate route decision with generic document disposition if semantics would be lost.
- No Git mutation.
- No new authority principal.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/architect-outputs/architect-output-workspace-repair.test.cjs test/issue-resolution/issue-architect-planning-service.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR06_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

Final route-choice UX validation deferred to WIR23.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR07` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
