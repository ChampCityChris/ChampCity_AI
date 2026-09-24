# WTR02A Implementer Report — Workflow SourceBaseline Contract

## Scope and starting state

- Approved repository root verified: the active checkout root for `ChampCity_AI`.
- Card: WTR02A, Establish Workflow SourceBaseline Semantic Contract.
- Starting branch: `dev`; starting SHA: `c6595a8bf2749c8dfe2c55441aa6f8db2816741d`.
- Remote status at start: `dev` was ahead of `origin/dev` by 65 commits. No remote action was authorized or performed.

## Implementation

Added the provider-neutral `SourceBaseline` contract and immutable Project State record with this exact body:

```ts
{
  workflowId: EntityId;
  repositoryId: string;
  integrationTargetSourceLineId: string;
  baseRevisionId: string;
}
```

The typed `createWorkflowSourceBaseline` command validates exact input and opaque source references, requires an existing Project and active nonterminal substantive Workflow in that Project, rejects WIR and cross-Project identities, and rejects any second baseline for the Workflow lifetime. It atomically creates one baseline record and one immutable `baselines_source` relationship with normal create and relationship-create state/outbox events. It performs no provider, Git, or filesystem operation.

Generic record creation, revision, and supersession reject SourceBaseline. Generic `baselines_source` creation is rejected. The domain relationship is immutable and only targets substantive Workflows. Authoritative context includes a reachable SourceBaseline and projects all three exact source references through the existing field-name rule.

## Files

Created:
- `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02A_IMPLEMENTER_REPORT.md`

Modified:
- `src/shared/sourceLifecycleContracts.ts`
- `src/shared/projectState/domainContracts.ts`
- `src/shared/projectState/entityTypeRegistry.ts`
- `src/shared/projectState/relationshipRegistry.ts`
- `src/shared/projectState/projectStateService.ts`
- `test/project-state/domain-contracts.test.cjs`
- `test/project-state/source-semantic-references.test.cjs`
- `test/project-state/authoritative-context-event-feed.test.cjs`

Deleted: none.

Intentionally not created: SQLite table/migration, SourceBaseline provider operations, new permanent test file, or any WTR02B/later artifacts. Permanent test count increased by one test definition exercised against both in-memory and SQLite stores (two runtime cases).

## Validation evidence

- `npm run build` — restricted lane exited 1 at Vite config loading with the documented `spawn EPERM`; rerun in normal Windows lane exited 0. TypeScript, Vite renderer build, and branding asset copy completed. Vite emitted only its existing large-chunk advisory.
- `node --test test/project-state/domain-contracts.test.cjs test/project-state/source-semantic-references.test.cjs test/project-state/authoritative-context-event-feed.test.cjs` — restricted lane exited 1 because Node's test runner could not spawn workers (`spawn EPERM`); rerun in normal Windows lane passed, 19 tests, 0 failures, 0 skipped.
- `npm run validate:plan -- --profile work-item --changes tmp/wtr02a-changes.json` — preview completed for the nine exact final changed paths; selected 55 test files. `source-lifecycle-package.test.cjs` was selected; `structured-workflow-checkpoint.test.cjs` was not.
- `npm run test:affected -- --changes tmp/wtr02a-changes.json` — normal Windows lane; final run exited 1 after 225,398 ms. Its fresh production build passed. The sole failure evidence was `test/source-control/source-lifecycle-package.test.cjs` with the card-documented inherited assertion `Work Item is not owned by the selected Work Intake workflow.` The remaining selected proof passed; this ownership failure was not repaired because it is out of scope.
- `git diff --check` — passed; no whitespace errors.
- Focused Project State command passed on final source: 19 tests, 0 failures, 0 skipped. An earlier draft of one new domain assertion expected direction validation before Project ownership; the proper ownership guard rejected it first. The assertion was narrowed to the intended same-Project invariant and the final focused run passed.

## Scope boundaries and safety

No SourceBinding, SourceCheckpoint, IntegrationRecord, `binds_source`, Work Intake source preparation, Git behavior, MCP targeting, worktree behavior, Source Graph, renderer/UI, automatic Workflow baseline capture, or Workflow body mutation was changed. No schema migration or dependency was added. No secrets, credentials, or concrete machine paths were added to this durable report.

Git mechanics required by the card: checkpoint commit pending after final validation, staged-diff inspection, and the repository safety scan. No push, merge, tag, reset, clean, restore, or unrelated Git operation performed.

- Exact nine-path staged diff inspected; `git diff --cached --check` passed.
- Bounded scan of added staged lines and staged paths found no credential assignments, concrete local paths, generated/dependency output paths, or dependency manifest changes. Generated `dist/` output remains ignored and unstaged.

## Remaining work

Create exactly one WTR02A checkpoint commit, then stop for Architect review. No Operator manual validation is needed for this semantic contract; no visual behavior changed.
