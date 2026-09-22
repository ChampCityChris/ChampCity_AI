# WIR23-REPAIR01-REPAIR02 Implementer Report

## Outcome and repository evidence

Repair Work Card **WIR23-REPAIR01-REPAIR02 — Preserve Issue Planning Freshness After Retained Route History** is implemented. A generated routed Issue Assessment now uses semantic write detection: changing only the exact route-decision source revision and/or digest does not rewrite the Assessment, while all non-route evidence, identity, body, and disposition fields remain exact.

- Verified the approved repository root and Git top-level as `<PROJECT_REPO>`.
- Card type and identifier: Repair Work Card `WIR23-REPAIR01-REPAIR02`.
- Branch: `dev`, tracking `origin/dev` and starting 13 commits ahead.
- Starting committed head: `5cb63ff`.
- `origin` is configured. No fetch or remote-freshness claim was made.
- The starting worktree contained unrelated modified and untracked Work Intake Routing, validation, test-suite-recovery, and prior repair artifacts. Those user changes were preserved. The shared Issue test already contained an unrelated retained-handoff scenario; this repair adds a separate post-Plan scenario and does not attribute the earlier scenario to this card.

## Implemented semantic comparison

`workIssueRoutingService.ts` now constructs the complete proposed Issue Assessment before deciding whether to write it. Its internal comparison:

1. normalizes the proposed body exactly as the canonical writer does and compares the resulting Markdown;
2. compares Assessment identity exactly, including the current Intake, route decision, `issue-resolution` route, Assessment, project, and Issue identities;
3. compares `sourceRevisions` after excluding only the exact current route-decision path from both sides;
4. compares `workflowData.sourceDigests` after excluding only that same exact route path, then compares every remaining workflow-data field exactly; and
5. compares the complete document disposition exactly.

When a write is necessary, the unchanged write path still persists the current Work Intake, route-decision, and Issue handoff source revisions; all current source digests and Issue evidence digests; and the current route identity. The route provenance exception therefore affects only the write predicate and never removes provenance from a newly written Assessment.

## Attributable files

Created:

- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR01-REPAIR02_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/workPlanning/workIssueRoutingService.ts`
- `test/issue-resolution/issue-architect-planning-service.test.cjs`

Deleted: none.

Intentionally not created or changed: new permanent tests, `workPlanningKernel.ts`, route-decision behavior, Issue context or persistence contracts, shared contracts, Research/integration services, migrations, compatibility paths, dependencies, renderer behavior, validation metadata, packaging, and committed generated output. The Operator-authored Repair Card was used as the governing source and was not modified by this pass.

## Regression evidence

The existing top-level routed-defect production-path test now captures the promoted Issue Assessment and phased Plan after RCA approval. It recommends a distinct Feature route from current Assessment evidence, overrides back to `issue-resolution`, and then runs Issue `status`. The test proves:

- effective route decision ID and selected route remain unchanged;
- the same Issue ID and handoff remain current;
- Assessment bytes and artifact revision remain exactly unchanged;
- Plan bytes and artifact revision remain exactly unchanged; and
- both artifacts report `stale === false`.

The same test then changes canonical RCA evidence. It proves stale presented evidence is rejected, the prior Plan is no longer usable against the changed semantic source, `status` writes a higher Assessment revision with pending readiness, and a subsequent real route change to Feature historicalizes the old Issue handoff and rejects further Issue actions.

## Validation record

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0; final TypeScript check passed. |
| `.\\node_modules\\.bin\\tsc.cmd` | Restricted Windows, direct-test prerequisite | Exit 0; refreshed ignored `dist` modules used by the direct Node tests. |
| `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="routed defect preserves Intake and branch" test/issue-resolution/issue-architect-planning-service.test.cjs` | Restricted Windows | Exit 1 with the documented Node test-runner `spawn EPERM`; not counted as a source failure or pass. |
| Same routed-defect command | Approved normal Windows, initial implementation diagnostic | Exit 1; the test exposed canonical body-normalization mismatch (`3 !== 2`). The helper was corrected to compare the canonical normalized proposed body. |
| Same routed-defect command | Approved normal Windows, final | Exit 0; 1 selected test passed, 0 failed/skipped. |
| `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="Operator route decisions preserve authority" test/architect-outputs/architect-output-workspace-repair.test.cjs` | Approved normal Windows | Exit 0; 1 selected test passed, 0 failed/skipped. |
| `git diff --check -- src/main/workPlanning/workIssueRoutingService.ts test/issue-resolution/issue-architect-planning-service.test.cjs` | Restricted Windows, scoped safety check | Exit 0. |
| Bounded concrete-local-path and credential-pattern scan over the attributable production and test files | Restricted Windows, scoped safety check | No matches; `rg` returned its expected no-match exit 1. |

No full suite, packaging, Desktop launch, performance/soak, visual acceptance, or external-integration check was run, as prohibited by the card.

## Git, safety, deviations, and residual risk

The Operator directed a separating commit after this repair. The exact staged diff will be inspected before committing only this repair's production change, post-Plan test proof, and Implementer Report. Commit hash is pending at report creation and will be reported after the commit; the report will not be amended solely to insert its own commit hash. No push, merge, rebase, tag, reset, clean, restore, stash, branch, or worktree action is authorized or performed.

No secrets, credentials, concrete local-machine paths, generated output, dependency state, archive runtime imports, or unrestricted filesystem access were introduced. There was no card/repository mismatch or scope deviation. No manual visual or experiential validation remains for this deterministic freshness repair. Residual risk is limited to interactions outside the card's explicitly bounded focused suites.

## Return path

Return `WIR23-REPAIR01-REPAIR02` for Architect review after the separation commit, then proceed to the second Operator-requested Repair Card.
