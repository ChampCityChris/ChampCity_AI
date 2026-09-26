# WRB03-R01-02 Implementer Report

## Repository and scope

- Verified repository root: `<PROJECT_REPO>`.
- Card: Repair `WRB03-R01-02`, Restore Exact Workflow Semantic Ownership and Atomic Issue RCA Authority.
- Starting checkpoint: R01-01 commit `0fe6d1202b4611d306200d37fc45152d2698dcaf`.
- Branch: `dev`; remote `origin` configured; checkout was clean at the starting checkpoint and was 128 commits ahead of `origin/dev` before this card's changes. No fetch or push was performed.

## Implementation

- Feature Intake Findings, Issue Intake Findings, and Issue RootCauses now use active `workflow_member` edges for exact Workflow ownership. Their Current Project planning reads and evidence preflight no longer use `relates_to` ownership.
- Project State rejects a semantic record's second active owner, retains the existing duplicate-edge protection, applies existing current substantive Workflow target restrictions, and does not allow adding a second BoundedSolution to a Workflow with an existing BoundedSolution owner.
- Plan acceptance now validates `solutionAddresses` as active Finding/RootCause records owned by the exact Workflow. An existing plan is detected from an active Workflow-owned BoundedSolution plus an accepted `planning-acceptance` Decision governing that Workflow and solution; pre-plan Findings and RootCauses do not count as a plan.
- Added typed atomic `acceptIssueRca`: it requires the Operator principal and exact active Issue Workflow in RCA, preflights all bounded candidates, exact-owned Findings and supported Evidence, then writes RootCauses, ownership/explanation/support links, one accepted Decision governing the Workflow and RootCauses, and the transition to `issue-planning` in one Project State transaction.
- Issue RCA reads now resolve the current accepted set through the latest accepted Decision's `governs` links and exact Workflow ownership. Decision rationale carries human rationale only; production contains no canonical RootCause marker convention.
- Added Project State ownership, plan-address, pre-plan marker, second-plan, and injected transaction rollback proof. Extended the direct/routed Feature and concurrent Issue service proof for ownership, exact Decision governance, and cross-Issue isolation. The validation capability map owns and describes the proof.
- No schema migration, compatibility fallback, execution/source materialization, or integration changes were made.

## Files

- Modified: `src/main/featurePlanning/featurePlanningService.ts`; `src/main/issuePlanning/issuePlanningService.ts`; `src/shared/projectState/projectStateService.ts`; `test/project-state/execution-completion.test.cjs`; `test/workflow/workflow-application-service.test.cjs`; `validation/capability-map.json`.
- Created: this report.
- Deleted: none.
- Intentionally not created: a `relates_to` compatibility read, migration/provider layer, new workflow entity/schema, Issue execution path, or WRB04 behavior.

## Proof and validation

- `npm run build` — normal Windows lane, exit 0. TypeScript and Vite completed; Vite emitted its existing large-chunk advisory.
- `node --test test/project-state/execution-completion.test.cjs test/workflow/workflow-application-service.test.cjs test/renderer/workflow-hub-shell.test.cjs` — normal Windows lane, final run passed 43/43. An earlier run exposed a fixture selecting the first item of a multi-Evidence projection instead of the newly added evidence; the fixture now selects exact descriptions. The ownership regression also initially tried to end an immutable provenance edge; it now asserts that ending is rejected and the ownership edge remains.
- `npm run validate:plan -- --profile repair --changes tmp/wrb03-r01-02-changes.json` — normal Windows lane, preview passed with the exact changed-path set.
- `git diff --check` — passed.
- Production scan for `canonical-root-causes` — clean. Feature/Issue planning source scan for `relates_to` — clean; ownership reads and writes use `workflow_member`.
- No broad historical Issue lifecycle suite, Electron launch smoke, or external integration was run.

## Git and safety

- Required card checkpoint commit: pending at report creation; no commit hash is recorded in this committed report.
- No push, reset, clean, restore, stash, or branch change was performed.
- Reviewed the repair diff. It contains no secrets, concrete local-machine paths, generated output, or dependency state. Durable report paths use repository-relative paths and `<PROJECT_REPO>`.

## Remaining items

- No Operator visual or experiential validation remains for this deterministic Project State repair.
- Proceed directly to `WRB03-R01-03`, which owns Feature assessment semantics, Project context isolation, and final WRB03 qualification. Do not begin WRB04.
