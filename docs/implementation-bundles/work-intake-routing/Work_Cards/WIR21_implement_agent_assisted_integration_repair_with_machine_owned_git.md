# WIR21 — Implement Agent-Assisted Integration Repair with Machine-Owned Git

**Order:** 21 of 23  
**Depends on:** `WIR20`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR21_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- Git can combine history/text but cannot preserve application semantics in every conflict.
- Architecture defines Integration Repair evidence and explicitly keeps Git ownership with ChampCity.
- Existing Repair workflow provides bounded evidence-derived correction patterns.

At card start, re-verify repository state and dependency reports. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

When WIR20 finds Git conflict or post-merge validation failure, create a bounded Integration Repair for semantic source resolution while ChampCity retains merge state, staging, commits, validation retries, rollback, and target advancement.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR21
→ focused validation
→ write WIR21 report
→ checkpoint commit
→ read WIR22 from repository
```

## Required Changes

1. Create Integration Repair context containing merge base, target/incoming refs/diffs, conflicted regions, governing Intake/Plan intent, relevant architecture/contracts, and validation failures.
2. Give Implementer source-edit/patch scope only; prompts must prohibit merge/add/commit/ours/theirs/continue/push/target switching.
3. After edits, ChampCity verifies unmerged entries/conflict markers, stages mechanically, creates repair commit, reruns candidate validation.
4. Allow repeated bounded repair attempts with preserved history.
5. If resolution requires changing approved scope/architecture or choosing between incompatible accepted intents, stop for Operator decision.

## Preserved Behavior

- WIR20 isolated target safety.
- Source branch/history.
- Operator authority over semantic choice.

## In-Scope Surface to Inspect

- `integration candidate service`
- `Repair/work-item context generation`
- `application Source-Control service`
- `validation services`
- `test/work-card-repair/work-card-repair-service.test.cjs`
- `test/agent-harness/git-mutation-boundary.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Mechanical conflict yields bounded repair context with both sides' evidence.
2. Post-merge validation failure can create repair even without textual conflict.
3. Implementer resolves source while Git transitions stay machine-owned.
4. Successful repair returns validated candidate to integration finalization.
5. Material unresolvable conflict stops for Operator without target corruption/push.

## Negative Constraints

- No autonomous semantic winner.
- No agent-owned Git.
- No direct target mutation during repair.
- No broad refactor disguised as Integration Repair.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/work-card-repair/work-card-repair-service.test.cjs test/agent-harness/git-mutation-boundary.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR21_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

Final conflict scenario repeated in WIR23.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR22` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
