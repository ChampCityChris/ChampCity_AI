# WRB01-R02-01 Implementer Report

## Repository and card

- Approved repository root verified: `ChampCity_AI` repository root.
- Card: Repair Card WRB01-R02-01 — Separate Current Project Registration from Optional Repository Identity.
- Starting checkpoint: `50606b2867c041ad461a3634faf7430699af014a`; branch `dev`; remote `origin/dev`, 105 commits ahead at start.

## Confirmed defect and correction

Current Project selection was encoded as a Git `source-repository` resource and registration always fabricated that Repository for non-Git Projects. Selection also considered inactive records and did not require an active owning Project.

Added the canonical `current-project-registration` ProjectResource contract and made selection require exactly one active matching marker on an active Project. Repository identity is a separate optional `source-repository` resource using `locator: managed-repository`; non-Git Projects have none. Registration creates the Project without requiring a Repository, adds the marker, and attaches source identity only when explicitly supplied. Existing entry determines Git backing from conventional `.git` or managed metadata; Greenfield attaches the Repository after successful source bootstrap. The obsolete R01 representation remains untouched and cannot select a Current Project. Updated architecture text to state these ownership semantics.

## Files changed

- Modified `src/main/projectState/currentProjectRegistrationService.ts`, `src/main/projectState/projectWorkflowStateFacade.ts`, `src/main/main.ts`, and `src/shared/workspaceContracts.ts`.
- Modified `test/project-state/current-project-registration.test.cjs` and `test/project-state/current-project-entry.test.cjs`.
- Modified `docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md`.
- Created this report.
- Deleted: none. No database schema change, migration, compatibility alias, or new dependency was created.
- Tests modified/extended: existing registration and entry proofs now cover optional repositories, canonical marker selection, inactive markers/Projects, obsolete R01 records, duplicate sources, and source-backed entry identities. No new test files added.

## Validation

- `npm run build` — restricted run reached the documented Vite/esbuild `spawn EPERM`; rerun in the normal Windows lane completed with exit 0. TypeScript, Vite, and branding copy passed; Vite emitted the existing chunk-size advisory.
- `node --test test/project-state/current-project-registration.test.cjs test/project-state/current-project-entry.test.cjs` — restricted runner returned `spawn EPERM`; normal Windows lane passed 12/12, 0 failed.
- `git diff --check` — passed.
- Skipped: broad historical suite, Electron launch, external integrations, and packaging; outside this repair's focused proof.

## Git, safety, and handoff

- Git actions: one attributable checkpoint commit is required for this card; hash will be reported after commit.
- Security/local-path safety: selection remains bounded to the selected Project container's SPS database; no renderer filesystem access was added. No credentials or concrete machine paths were written into durable artifacts. Generated build output is excluded.
- Remaining Operator validation: none for the deterministic registration and identity criteria.
- Recommended next task: proceed to WRB01-R02-02 from this checkpoint.
