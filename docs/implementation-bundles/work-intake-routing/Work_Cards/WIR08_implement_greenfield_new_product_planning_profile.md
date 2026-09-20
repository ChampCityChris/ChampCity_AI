# WIR08 — Implement Greenfield / New Product Planning Profile

**Order:** 8 of 23  
**Depends on:** `WIR07`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR08_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- Current Project Architect Interview/Project Planning are strongest source for greenfield behavior.
- Current prompts already prohibit unconditional MVP framing.
- WIR07 owns shared planning mechanics.

At card start, re-verify repository state and every dependency report. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Move valid current new-product architecture/planning semantics into the Greenfield profile without making Greenfield assumptions universal.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR08
→ focused validation
→ write WIR08 report
→ checkpoint commit
→ read WIR09 from repository
```

## Required Changes

1. Define Greenfield required evidence, Architect discovery priorities, output contract, and topology recommendation criteria.
2. Cover user/product outcome, capabilities, architecture/deployment, data/state, dependencies, non-functional constraints, sequencing.
3. Use MVP/POC framing only when approved evidence establishes it.
4. Route valid current greenfield behavior through shared kernel rather than duplicate services.

## Preserved Behavior

- Known valid new-project planning behavior.
- Current V1 review/disposition semantics.
- No effect on existing-product routes.

## In-Scope Surface to Inspect

- `src/main/architectInterview/projectArchitectInterviewPromptWriter.ts`
- `src/main/architectInterview/architectInterviewDraftPilot.ts`
- `src/main/projectPlanning/projectPlanningDraftBundle.ts`
- `planning profile registry`
- `test/architect-interview/architect-interview-workspace.test.cjs`
- `test/project-planning/project-planning-service.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Greenfield route gets materially new-product-oriented planning.
2. Profile derives repository-known facts instead of re-asking Operator.
3. MVP is not assumed.
4. Direct/phased both remain possible.

## Negative Constraints

- No Feature/Refactor fallback content.
- No separate Greenfield orchestration stack.
- No Git mutation.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/architect-interview/architect-interview-workspace.test.cjs test/project-planning/project-planning-service.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR08_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

None.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR09` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
