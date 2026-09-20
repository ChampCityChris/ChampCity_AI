# WIR03 — Bind Every Work Intake to a Dedicated Git Branch

**Order:** 3 of 23  
**Depends on:** `WIR01`, `WIR02`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR03_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- Current Project Intake writes directly in the selected repository without a per-intake branch.
- The architecture requires `baseBranch`, `baseCommit`, and `workBranch` as durable Work Intake evidence.
- WIR02 supplies application-owned branch/status mechanics.

At card start, re-verify repository state and every dependency report. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Establish one exact repository/base branch/base commit/dedicated work branch as the source-control isolation boundary for each Work Intake before Intake artifacts are written.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR03
→ focused validation
→ write WIR03 report
→ checkpoint commit
→ read WIR04 from repository
```

## Required Changes

1. Define the Work Intake branch-binding record including repository identity, base branch, base commit, work branch, current head, and optional remote state.
2. Create deterministic valid collision-safe branch naming independent of later route selection.
3. Require a clean known baseline and resolve exact base commit before branch creation.
4. Create/select the work branch before Intake persistence; failure must not continue on an unintended branch.
5. Provide later lifecycle branch-binding verification that fails closed on wrong branch/repository.

## Preserved Behavior

- Existing repository selection remains usable.
- No Work Route is selected in this card.
- WIR02 Git safety remains authoritative.

## In-Scope Surface to Inspect

- `Work Intake source-control binding contracts/service`
- `application Source-Control service`
- `src/main/projectIntake/projectIntakeService.ts`
- `src/shared/workspaceContracts.ts`
- `test/project-intake/project-intake-service.test.cjs`
- `test/agent-harness/git-mutation-boundary.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Clean Git-backed repository can create one dedicated branch from exact selected base commit.
2. Branch collision never overwrites/reuses silently.
3. Dirty/non-Git baseline fails before Intake artifact persistence.
4. Wrong-branch verification fails closed.

## Negative Constraints

- No route selection.
- No automatic commit/push.
- No worktree orchestration.
- No hard-coded `main`/`dev` base assumption.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/project-intake/project-intake-service.test.cjs test/agent-harness/git-mutation-boundary.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR03_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

None; branch behavior uses disposable repositories/fixtures.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR04` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
