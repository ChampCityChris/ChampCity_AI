# WTR02F Implementer Report

## Repository and task scope

- Approved repository root verified: the working directory and Git top-level resolve to the approved ChampCity_AI repository root.
- Card: Work Card WTR02F — lazy Workflow SourceLine and RepositoryCheckout materialization.
- Starting SHA: `f9a0f46041a64ae2699ad28b3ffc5c26ea6741c4`.
- Branch and remote status: `dev`, tracking `origin/dev`, 85 commits ahead at start. No remote operations were performed.
- Git actions: the exact 12 card files were staged in the normal Windows lane after the sandbox denied `.git/index` access. The staged diff and safety scan passed. The card-authorized single checkpoint commit is next; its hash will be reported after commit without amending this report.

## Files

Created:

- `src/main/sourceControl/workflowSourceMaterializationService.ts`
- `test/source-control/workflow-source-materialization.test.cjs`
- `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02F_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/sourceControl/projectSourceTopology.ts`
- `src/shared/projectState/projectStateService.ts`
- `test/project-state/authoritative-context-event-feed.test.cjs`
- `test/project-state/current-state-queries.test.cjs`
- `test/project-state/source-semantic-references.test.cjs`
- `test/source-control/source-graph-projection.test.cjs`
- `test/source-control/source-topology-path-contracts.test.cjs`
- `test/source-control/structured-workflow-checkpoint.test.cjs`
- `validation/capability-map.json`

Deleted: none.

Intentionally not created: schema migration, new state store, production Dev/Main bootstrap, MCP workspace, automatic Workflow trigger, and any checkpoint, integration, Source Graph ownership, or Work Intake source behavior.

## Implementation

- Added `createWorkflowSourceMaterializationService()` with explicit `materialize(workflowId)` entry point and a `RepositoryCheckoutRegistrationPort`; it does not instantiate the Service Host client.
- The service opens the selected Project's existing SQLite Project State store and accepts only its active substantive Workflow record. It rejects foreign/missing, WIR, superseded, terminal, and no/ambiguous-baseline cases before source provider mutation.
- SourceBinding is resolved uniquely across the Workflow lineage and reused only against the same immutable SourceBaseline. The current successor record can own the binding while physical source remains anchored to `SourceBaseline.workflowId`.
- Physical identities are `workflow/<baseline-workflow-id>`, `workflow-<baseline-workflow-id>`, and `.champcity/checkouts/<baseline-workflow-id>`. Added `workflowRepositoryCheckoutId()` with the same canonical lowercase UUID contract as Workflow checkout path resolution.
- The service requires a non-Git Project container, managed Dev checkout at `Dev`, exact Git root, current `dev` branch, matching Git common directory, and exact recorded baseline revision resolvability. It does not require Dev HEAD to remain at the baseline.
- Fresh and retry paths transition through existing SourceBinding state. SourceLine creation uses WTR02E `createWorkSource`; linked worktree creation uses bounded Git. Checkout root, branch, HEAD, repository identity, cleanliness, and registration summary are verified before `ready` is persisted.
- Failures after preparation record stable bounded failure codes and preserve branch/worktree/registry state for inspection and retry. Conflicting checkout contents are left intact. Registration failure and final state-update retry retain the physical source.
- Ready retries revalidate the same identities, checkout state and registration, and return without a Project State revision when all facts match.
- `assertSourceBindingBody()` now requires `repositoryCheckoutId` for `ready`; current-state projection exposes work SourceLine, current revision and checkout ID, with no checkout root.

## Proof and test disposition

- Existing tests reused unchanged: `test/agent-harness/source-control-service-boundary.test.cjs`.
- Existing tests modified: Project State current view and semantic reference suites, authoritative event feed, source graph fixture, topology contracts, and structured checkpoint fixture. Changes supply the now-required synthetic checkout identity; projection coverage checks all three semantic source-target fields and the exposed key set.
- Tests consolidated or retired: none.
- New permanent test: `test/source-control/workflow-source-materialization.test.cjs`. Coverage gap: no existing proof exercised the full explicit lazy transition from immutable Workflow baseline through deterministic SourceLine, Project-managed linked worktree, registration port, and durable ready state. The suite proves advanced Dev/R1 preservation, supersession anchoring, two concurrent Workflow checkouts, ready idempotence, blocked registration recovery, conflicting-path preservation, and WIR/terminal/no-baseline rejection before branch or binding creation.
- `validation/capability-map.json` classifies the new proof under `release-and-git-operations` and updates the topology test count.

## Validation

All required runtime commands ran in the normal Windows lane. The first restricted `npm run build` attempt returned Vite/esbuild `spawn EPERM`; it was recorded once and the equivalent command passed in the normal Windows lane. The first restricted new-test run returned Node test-runner `spawn EPERM`; its equivalent normal Windows run passed.

| Command | Lane and result |
| --- | --- |
| `npm run build` | Restricted lane: `spawn EPERM` at Vite/esbuild after TypeScript passed. Normal Windows lane: exit 0; TypeScript, Vite production build and branding copy passed. Vite emitted its existing >500 kB chunk advisory. |
| `node --test test/source-control/workflow-source-materialization.test.cjs` | Restricted lane: test-runner `spawn EPERM`. Normal Windows lane: exit 0, 3 tests passed. |
| `node --test test/project-state/source-semantic-references.test.cjs test/project-state/current-state-queries.test.cjs test/project-state/authoritative-context-event-feed.test.cjs` | Normal Windows lane: exit 0, 16 tests passed. |
| `node --test test/agent-harness/source-control-service-boundary.test.cjs` | Normal Windows lane: exit 0, 2 tests passed; unchanged provider proof. |
| `node --test test/source-control/structured-workflow-checkpoint.test.cjs` | Normal Windows lane: exit 0, 1 test passed. |
| `node --test test/source-control/source-topology-path-contracts.test.cjs` | Normal Windows lane: exit 0, 7 tests passed. |
| `node --test test/source-control/source-graph-projection.test.cjs` | Normal Windows lane: exit 1, 2 passed / 1 failed. The Source Graph fixture calls `state.createSourceBinding`, which is absent (`TypeError`) before it reaches the changed ready invariant. This WTR02H-owned deferred fixture was changed only for the synthetic checkout ID, as permitted by the card; Source Graph behavior was not altered. |
| `npm run validate:plan -- --profile work-item --changes tmp/wtr02f-changes.json` | Exit 0. Exact final 12-path manifest previewed; planner accepted capability/test ownership metadata and selected the work-item proof. |
| `npm run test:affected -- --changes tmp/wtr02f-changes.json` | Normal Windows lane, exit 1, run ID `057baa29-3b02-432f-bdd1-0e800cc7cb37`, 280,770 ms. Planner selected 60 test files across fast, affected-capability and integration lanes; its owned production build passed. Failures were reported in `semantic-checkpoint-service.test.cjs`, `source-graph-projection.test.cjs`, `source-lifecycle-package.test.cjs`, `structured-integration.test.cjs`, and `greenfield-source-bootstrap.test.cjs`. The Work Intake SourceReadiness/checkpoint/integration cases remain transitional and are owned by WTR02G/WIR recovery; Source Graph is WTR02H; Greenfield/Main/Dev bootstrap is WTR03C. The card explicitly defers these ownership surfaces. The dedicated WTR02F materialization test passed independently. |
| `git diff --check` | Exit 0 on the exact staged diff. |

Static/build, focused Project State service, provider-boundary, topology, checkpoint, and direct materialization evidence are distinguished above. No production-path IPC/UI, launch-smoke, or external-integration evidence is claimed; WTR02F exposes the application service only and does not wire a UI/execution trigger.

## Safety, limits, and return path

- Secret/local-path/generated-artifact safety scan: staged-diff scan reported 0 secret-pattern matches, 0 concrete local-path matches, and 0 generated-path matches across exactly 12 staged files. Generated `dist/` output is ignored build output and is not in the source change set.
- Work Intake capture, `WorkIntakeBranchService`, checkpoint ownership, integration ownership, Source Graph ownership, Main/Dev bootstrap, and provider SourceLine semantics were not modified.
- Remaining workflow step: Architect review of WTR02F before WTR02G begins. No Operator visual or experiential acceptance is required by this service-only card.
- Recommended next task: Architect review, then proceed to WTR02G only after that review.
