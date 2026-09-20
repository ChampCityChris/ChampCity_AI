# WIR22 — Make Start Work the Canonical Workflow Hub Entry

**Order:** 22 of 23  
**Depends on:** `WIR04`, `WIR06`, `WIR07`, `WIR16`, `WIR19`, `WIR20`, `WIR21`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- `WorkflowHubWorkspace.tsx` currently renders Development and Issue Resolution cards only.
- `App.tsx` uses `activeWorkflowId` renderer routing.
- Architecture says Operator should not need route knowledge before Intake.

At card start, re-verify repository state and dependency reports. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Replace premature manual Development/Issue selection with Start Work→Work Intake as normal entry and present route, topology, branch, Plan, and integration state from services rather than renderer-owned authority.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR22
→ focused validation
→ write WIR22 report
→ checkpoint commit
→ read WIR23 from repository
```

## Required Changes

1. Add Start Work as canonical new-work entry.
2. Flow through branch establishment, Intake, routing, planning, generic execution.
3. Present selected route, topology, work/target branch, current Plan/Work Item/Phase, integration/repair state from services.
4. Preserve recovery access for active legacy Development/Issue work.
5. Remove/demote obsolete direct-entry assumptions only when equivalent routed behavior proven.
6. Keep renderer presentation-only.

## Preserved Behavior

- Project selection/settings/navigation.
- Existing active legacy work recoverable.
- Operator decisions remain service actions.

## In-Scope Surface to Inspect

- `src/renderer/app/WorkflowHubWorkspace.tsx`
- `src/renderer/app/App.tsx`
- `workflow hub contracts`
- `Work Intake/routing/Plan projections`
- `test/renderer/workflow-hub-shell.test.cjs`
- `test/renderer/figma-redesign-shell.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Selected Project exposes Start Work.
2. Operator reaches Intake without preselecting workflow.
3. UI accurately presents service-owned route/topology/branch/progression/integration.
4. Legacy active work remains accessible.
5. No renderer-owned legality decisions.

## Negative Constraints

- No unrelated visual redesign.
- No premature compatibility removal.
- No renderer Git commands.
- No service/browser refactor.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/renderer/workflow-hub-shell.test.cjs test/renderer/figma-redesign-shell.test.cjs test/characterization/desktop-development-lifecycle.test.cjs test/characterization/desktop-issue-lifecycle.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

Final Operator acceptance deferred to WIR23.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR23` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
