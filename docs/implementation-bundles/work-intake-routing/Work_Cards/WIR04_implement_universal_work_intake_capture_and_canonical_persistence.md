# WIR04 — Implement Universal Work Intake Capture and Canonical Persistence

**Order:** 4 of 23  
**Depends on:** `WIR03`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR04_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- `src/main/projectIntake/projectIntakeService.ts` currently captures project-level fields and immediately writes an Architect Interview prompt.
- `App.tsx` currently presents product-form Project Type rather than a Work Route.
- The architecture separates durable Project identity from each Work Intake.

At card start, re-verify repository state and every dependency report. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Create a concise universal Work Intake for a new body of work against an existing or new Project and persist its branch binding. Submission must no longer immediately generate the generic Project Architect Interview prompt.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR04
→ focused validation
→ write WIR04 report
→ checkpoint commit
→ read WIR05 from repository
```

## Required Changes

1. Introduce Work Intake identity/persistence distinct from Project identity and old greenfield Project Intake.
2. Capture selected Project, work request/problem/change, desired outcome, constraints, existing evidence/source context, explicit base-branch context, and WIR03 branch binding.
3. Existing Projects must start new work without recreating original Project Intake.
4. Preserve a new-Project path that establishes Project identity then starts its first Work Intake.
5. Remove automatic new Work Intake → generic Project Architect Interview prompt coupling.
6. Expose Work Intake read/projection APIs for routing/UI.

## Preserved Behavior

- Existing historical Project Intake remains readable.
- Canonical Markdown/source revision mechanics remain current V1 persistence.
- Repository binding safety remains intact.

## In-Scope Surface to Inspect

- `src/main/projectIntake/projectIntakeService.ts`
- `src/renderer/app/App.tsx`
- `src/shared/workspaceContracts.ts`
- `src/shared/projectIntake/*`
- `canonical document services`
- `test/project-intake/project-intake-service.test.cjs`
- `test/project-intake/post-submit-review-state.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Existing Project can create another Work Intake without Project recreation.
2. Persisted Intake contains exact branch binding.
3. Submitting Work Intake does not create route-specific Architect planning output.
4. Historical Project Intake is not inferred as active Work Intake.
5. UI asks for concise work intent/base branch context, not route selection.

## Negative Constraints

- No route assessment/decision.
- No generic roadmap.
- No deletion/rewrite of historical Project Intake.
- No hidden renderer branch ownership.
- No implementation work.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/project-intake/project-intake-service.test.cjs test/project-intake/post-submit-review-state.test.cjs test/characterization/desktop-project-repository-binding.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR04_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

Final Operator UI validation is deferred to WIR23.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR05` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
