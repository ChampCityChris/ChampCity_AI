# WTR01B Implementer Report

## Identity and starting state

- Card: WTR01B — Normalize Workflow Instance Body Contract and Validation.
- Approved repository root verified: the active checkout contains this card, its linked architecture and plan, and the required source/test boundaries.
- Starting branch: `dev`.
- Starting SHA: `c95581163da9d241f28d7796c326253a9c11e663`.
- Starting remote status: `dev` was ahead of `origin/dev` by 57 commits; the worktree was clean.
- Commit: pending at report creation; actual checkpoint hash will be reported after the commit. No push or other Git topology action was performed.

## Implementation

`EntityBodyMap["Workflow"]` now contains exactly:

```ts
{
  workflowType: WorkflowType;
  title: string;
  currentWorkspace: string;
  workflowState: WorkflowState;
}
```

Workflow validation consumes `WORKFLOW_TYPE_IDS`, so only the eight canonical WTR01A IDs are accepted. Required bounded text and workflow-state validation remain enforced, and exact-field validation rejects `workspace`, `governingEntityId`, and other unsupported keys.

`ProjectStateService.createWorkflow()` accepts only `workflowType`, `title`, `currentWorkspace`, and optional `workflowState`; it checks the owning Project, defaults state to `active`, and persists the canonical body without a governing-entity lookup. The Current Project State projection now exposes `id`, `type`, `title`, `state`, and `currentWorkspace`.

Directly coupled callers adapted:

- Work Intake creates its current WIR Workflow as `work-intake-routing`, titled from the request, in `work-intake`, and retains the existing `initiates` relationship.
- The engineering façade uses `feature-capability`, title `Feature / Capability`, and workspace `development`; its transitional parameter remains accepted but does not affect persisted ownership.
- `ProjectPlanInput.workflowType` is now `WorkflowType`; Project Planning derives the title from `WORKFLOW_TYPE_REGISTRY` and uses `project-planning` as current workspace. The fixture uses canonical `project-creation`.
- The staged legacy importer received only the mechanical canonical body adaptation, using the imported request title and preserving the prior state.

No relationship/provenance, repeatability, SourceBaseline/source-control, UI, migration behavior, or later-WTR behavior was implemented. No capability-map metadata change was needed.

## Tests and proof

Modified the existing six focused proof owners listed by the card. No permanent test file was added, and permanent test count did not increase.

The focused suite proves canonical body acceptance; rejection of representative legacy types and removed fields; missing title/currentWorkspace rejection; exact typed creation and default state; canonical current-state projection; Work Intake-to-WIR initiation; and canonical façade bodies.

## Validation

- `npm run build` — restricted lane reached TypeScript successfully, then Vite returned `spawn EPERM`; rerun once in the normal Windows lane passed. Vite emitted only its existing large-chunk advisory.
- `node --test test/project-state/domain-contracts.test.cjs test/project-state/execution-completion.test.cjs test/project-state/work-intake-routing.test.cjs test/project-state/current-state-queries.test.cjs test/project-state/engineering-workflow-facade.test.cjs test/project-state/project-workflow-facade.test.cjs` — the restricted lane returned `spawn EPERM`; normal Windows lane passed, 26 tests, 0 failures. An intermediate run exposed an overly broad expected-error regex in the new exact-input assertion; the assertion was corrected to match the service's actual `Unsupported semantic input field` error, and the final run passed.
- `npm run validate:plan -- --profile work-item --changes tmp/wtr01b-changes.json` — exit 0; preview selected the work-item profile against all 13 final paths (12 implementation/test files and this report).
- `npm run test:affected -- --changes tmp/wtr01b-changes.json` — normal Windows lane; exit 0; receipt status `passed`, production build passed, failure evidence empty; total duration 189,080 ms. The executor selected dependent fast and integration proof in addition to the focused tests.
- `git diff --check` — exit 0; no whitespace errors.
- `node --test test/validation/capability-map.test.cjs` — not run because `validation/capability-map.json` was not changed.

## Changed files

Created:

- `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR01B_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/migrations/stagedLegacyImporter.ts`
- `src/main/projectState/engineeringWorkflowStateFacade.ts`
- `src/main/projectState/projectWorkflowStateFacade.ts`
- `src/shared/projectState/domainContracts.ts`
- `src/shared/projectState/entityTypeRegistry.ts`
- `src/shared/projectState/projectStateService.ts`
- `test/project-state/current-state-queries.test.cjs`
- `test/project-state/domain-contracts.test.cjs`
- `test/project-state/engineering-workflow-facade.test.cjs`
- `test/project-state/execution-completion.test.cjs`
- `test/project-state/project-workflow-facade.test.cjs`
- `test/project-state/work-intake-routing.test.cjs`

Deleted: none. Intentionally not created: compatibility aliases, new permanent tests, migrations/schema changes, capability-map changes, UI changes, or later-card behavior.

## Safety, Git, and remaining work

- No secrets or concrete local-machine paths were added to durable artifacts.
- Generated build output and the temporary exact-path manifest are not part of the source change set.
- The exact staged diff contains only the 13 listed card paths. `git diff --cached --check` passed; the bounded credential-pattern, concrete-local-path, dependency, and generated-output scans found no matches.
- No Operator visual validation is required by this card; no external integration evidence is claimed.
- Remaining Operator action: Architect review before any later WTR card is authored or released.
- Recommended next task: await Architect review; do not begin WTR01C.
