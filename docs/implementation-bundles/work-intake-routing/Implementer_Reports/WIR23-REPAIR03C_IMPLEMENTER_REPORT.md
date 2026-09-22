# WIR23-REPAIR03C Implementer Report

## Scope and repository verification

- Card type and identifier: Repair Work Card `WIR23-REPAIR03C`.
- Approved repository root: verified at `<PROJECT_REPO>`.
- Branch: `dev`; remote: `origin` configured, with `dev` initially 12 commits ahead of `origin/dev`.
- Existing unrelated working-tree changes were preserved and excluded from this card's attributable set.

## Files created and modified

Created:

- `test/renderer/research-routed-integration.test.cjs`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR03C_IMPLEMENTER_REPORT.md`

Modified:

- `src/shared/routedIntegrationContracts.ts`
- `src/main/planExecution/routedIntegrationService.ts`
- `src/main/planExecution/routedWorkflowService.ts`
- `src/renderer/app/WorkPlanningPanel.tsx`
- `src/renderer/app/RoutedExecutionPanel.tsx`
- `test/characterization/routed-integration-focus.test.cjs`
- `test/project-planning/project-planning-service.test.cjs`
- `test/support/work-intake-fixtures.cjs`
- `validation/capability-map.json`

Deleted: none. Intentionally not created: Plan, Work Item, Phase, Work Card, execution binding/session, Research-specific merge path, compatibility `planFingerprint`, migration, dependency, or JSON sidecar.

## Implementation evidence

Routed integration now exposes completion-neutral `completionKind` and `completionFingerprint`. Internal resolution checks the current Assessment first. A closed Research Assessment resolves directly to verified Research completion with no Plan lookup, Work Items, or execution projection; otherwise the existing Issue/Plan execution path is preserved.

Research checkpoint lookup scans the bounded Work Intake checkpoint chain through application-owned receipt parsing and accepts only a matching Research boundary, Intake/repository/work branch, single-parent `beforeHead`, Assessment identity/revision, and exact Assessment file SHA-256. Query remains read-only and returns `ready` before the first Research checkpoint. `integrate()` checkpoints immediately before first candidate creation, refreshes and verifies unchanged completion/checkpoint evidence, then uses the shared candidate validation and target-advance path. The validation adapter asserts the target is unchanged while candidate proof runs.

The final Research candidate contains the exact Assessment completion kind, ID, revision, fingerprint, and path. The target advances only after candidate validation; final query returns `integration-complete`; the work branch remains selected and clean. Tests prove no Plan, Work Item, Phase, routed-development binding, or execution directory exists.

Routed workflow resolves Research before Plan and constructs the routed-development application service only for Plan execution actions. Integration-family actions use the shared routed integration service directly. The renderer shows the shared integration surface for closed Research, uses `Integrate completed research`, and omits Plan execution/Work Item/Phase/acceptance/implementer controls. Plan rendering retains Plan-specific wording.

A new renderer file was required because no existing renderer owner exercised the materially distinct integration-without-execution-projection state. `validation/capability-map.json` records that explicit gap with behavioral ownership; no existing test was duplicated or retired.

## Validation

1. `npm run typecheck` — installed local Windows toolchain; exit 0.
2. `node --test --test-reporter=tap --test-concurrency=1 test/characterization/routed-integration-focus.test.cjs` — normal Windows lane; exit 0; 4 passed; both Plan subcases and Research integration passed.
3. `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="research closes durably on reviewed evidence" test/project-planning/project-planning-service.test.cjs` — normal Windows lane; exit 0; 1 passed.
4. `node --test --test-reporter=tap --test-concurrency=1 test/renderer/research-routed-integration.test.cjs` — normal Windows lane; exit 0; 2 passed.
5. `node --test --test-reporter=tap --test-concurrency=1 test/validation/capability-map.test.cjs` — normal Windows lane; exit 0; 5 passed.

Additional production build: final approved normal Windows `npm run build` passed with exit 0. The initial restricted build and restricted Node test-runner attempts produced the documented `spawn EPERM`; normal Windows reruns are the authoritative results. No full suite was run because the card explicitly prohibits it.

## Git, safety, and residual risk

- Intended commit message: `Implement WIR23 Research completion integration`.
- Git mutations before report creation: none. Actual commit hash is pending in this same-commit artifact and will be reported after commit; the report will not be amended solely to add it.
- Secret/credential scan: no credential material introduced.
- Durable local-path scan: attributable committed artifacts use repository-relative paths or `<PROJECT_REPO>`; no concrete local-machine path is recorded.
- Generated output and dependency state are excluded from source control.
- Deviations/mismatch: none. The permitted new renderer owner and ValidationCatalog record were necessary for the no-execution Research presentation gap.
- Remaining Operator validation: optional visual/experiential confirmation of the Research surface; deterministic renderer and production-path acceptance evidence is complete.
