# WIR20 — Implement Machine-Owned Integration Candidate Lifecycle

**Order:** 20 of 23  
**Depends on:** `WIR19`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR20_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- Current `integrateGitBranchToDev()` is fast-forward-only and mutates real `dev`.
- Architecture requires isolated integration candidate because concurrent Intake branches may diverge.
- WIR03 records refs and WIR19 supplies completed commits.

At card start, re-verify repository state and dependency reports. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Create an isolated integration candidate from the current target, mechanically merge a Plan-complete Intake branch, validate the candidate, and advance/push the real target only when the candidate is clean and passing.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR20
→ focused validation
→ write WIR20 report
→ checkpoint commit
→ read WIR21 from repository
```

## Required Changes

1. Generalize integration target beyond hard-coded `dev` using Work Intake target/base branch.
2. Create temporary integration branch/check-out context from latest target; do not mutate real target during candidate construction.
3. Fetch/inspect target when configured; record base/incoming/target refs; attempt non-interactive merge mechanically.
4. Classify clean candidate, mechanical conflict, or post-merge validation failure.
5. Run required integration validation on clean merge and advance/push target only after pass.
6. Preserve conflict/failure evidence for WIR21; provide deterministic candidate abort/cleanup.

## Preserved Behavior

- Target remains unchanged until candidate passes.
- No agent manages Git.
- Fast-forward may remain optimized clean case.

## In-Scope Surface to Inspect

- `application Source-Control service`
- `gitMutations integration primitives`
- `Work Intake branch binding`
- `generic Plan completion`
- `test/agent-harness/git-mutation-boundary.test.cjs`
- `new/extended repository integration focused proof`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Unchanged target integrates successfully.
2. Advanced but cleanly mergeable target produces valid candidate and advances only after validation.
3. Mechanical conflict leaves target untouched and returns bounded evidence.
4. Post-merge validation failure leaves target untouched.
5. Candidate abort/cleanup preserves source/target branches.

## Negative Constraints

- No agent merge commands.
- No conflict auto-resolution.
- No push of failing candidate.
- Do not delete incoming branch before confirmed integration.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR20_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

None; use disposable Git fixtures.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR21` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
