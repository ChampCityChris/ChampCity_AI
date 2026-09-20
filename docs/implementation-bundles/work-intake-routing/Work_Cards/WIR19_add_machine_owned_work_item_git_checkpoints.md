# WIR19 — Add Machine-Owned Work Item Git Checkpoints

**Order:** 19 of 23  
**Depends on:** `WIR02`, `WIR16`, `WIR17`, `WIR18`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR19_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- WIR02 supplies application-owned status/diff/stage/commit/push primitives.
- Architecture allows machine-owned Work Item checkpoints on the bound Intake branch.
- Current reports rely on human/agent Git discipline rather than lifecycle hooks.

At card start, re-verify repository state and dependency reports. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Move routine Work Item source-control checkpointing out of Implementer responsibility and into deterministic ChampCity workflow mechanics.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR19
→ focused validation
→ write WIR19 report
→ checkpoint commit
→ read WIR20 from repository
```

## Required Changes

1. Add checkpoint hook after successful Work Item source completion at the defined lifecycle boundary.
2. Verify exact repository and Work Intake branch before staging.
3. Inspect exact changed paths and fail closed on unrelated/unattributable changes.
4. Stage through Source-Control service, create deterministic Work Item-linked commit/receipt, bind commit to implementation evidence.
5. Support optional remote synchronization without making remote mandatory.
6. Report checkpoint failure separately from implementation/validation failure.

## Preserved Behavior

- Implementer does not own Git commands.
- Validation/Repair state stays truthful.
- No target integration here.

## In-Scope Surface to Inspect

- `application Source-Control service`
- `generic Plan executor`
- `Work Card/Issue completion services`
- `implementation result/report services`
- `test/agent-harness/git-mutation-boundary.test.cjs`
- `test/work-card-loop/work-card-loop-state-service.test.cjs`
- `test/characterization/desktop-development-lifecycle.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Successful Work Item can produce deterministic commit on correct Intake branch.
2. Wrong branch/unexpected repo state blocks checkpoint.
3. Commit/source baseline links to Work Item evidence.
4. Remote push failure does not rewrite successful local implementation result.

## Negative Constraints

- No target merge/integration.
- No agent stage/commit/push.
- No unrelated auto-commit.
- No release/tag actions.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs test/work-card-loop/work-card-loop-state-service.test.cjs test/characterization/desktop-development-lifecycle.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR19_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

None; Git proof uses disposable repositories/fixtures.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR20` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
