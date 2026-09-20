# WIR02 — Promote Deterministic Git Mechanics into Application Source-Control Service

**Order:** 2 of 23  
**Depends on:** `WIR01`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR02_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- `src/main/agentHarness/repository/gitMutations.ts` already implements bounded branch/history/prepare/switch/stage/commit/push/fetch/fast-forward/delete/integration mechanics.
- `src/main/agentHarness/repository/boundedGit.ts` owns bounded non-interactive execution.
- `docs/migration/CHAMPCITY_CLIENT_SERVICE_DESKTOP_SOURCE_MAPPING.md` classifies these mechanics as reusable RepositoryService source.

At card start, re-verify repository state and every dependency report. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Promote existing bounded Git mechanics behind a first-class application-owned semantic Source-Control/Repository service. Reuse proven implementation; do not bind it to Work Intake yet.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR02
→ focused validation
→ write WIR02 report
→ checkpoint commit
→ read WIR03 from repository
```

## Required Changes

1. Create an application-callable Source-Control service contract around existing bounded Git mechanics.
2. Expose status, branch list/current, history/ancestry, diff/changed files, prepare/switch, stage, commit, fetch, push, fast-forward/readiness, and delete operations needed by later cards.
3. Return structured receipts/errors suitable for workflow persistence rather than MCP-only response shapes.
4. Keep `git_toolbox` compatible by sharing the same underlying mechanics where practical.
5. Preserve all current ref/path/clean-tree/non-interactive safety checks.

## Preserved Behavior

- Existing `git_toolbox` behavior remains functional.
- No workflow begins automatic Git mutation merely because the service exists.
- AI workers do not become Git authority.

## In-Scope Surface to Inspect

- `src/main/agentHarness/repository/gitMutations.ts`
- `src/main/agentHarness/repository/boundedGit.ts`
- `src/main/agentHarness/repository/repositoryOperations.ts`
- `tool registry Git adapter`
- `test/agent-harness/git-mutation-boundary.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Application code can call semantic Git operations without MCP/model mediation.
2. Existing bounded mechanics are reused rather than reimplemented with arbitrary shell commands.
3. Receipts identify repository/ref/commit/result for later lifecycle binding.
4. Low-level Git boundary tests remain green and service-level proof covers the new call boundary.

## Negative Constraints

- No Work Intake branch binding.
- No automatic commit/push/integration hook.
- No GitHub/provider dependency.
- No semantic merge resolution.
- Do not weaken existing Git preconditions.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs test/agent-harness/repository-file-operations.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR02_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

None; Git behavior must be exercised only in disposable repositories/fixtures.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR03` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
