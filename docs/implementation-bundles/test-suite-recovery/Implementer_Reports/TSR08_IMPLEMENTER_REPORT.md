# TSR08 Repair Implementer Report

Status: complete; the Issue Fix Card planning handoff now permits shared validation-guidance vocabulary while continuing to reject Development workflow identity fields.

## Scope and repository verification

- Card: Repair Work Card TSR08, Repair Issue Fix Card Validation-Guidance Expectation.
- The working directory and Git top level were verified as the approved `<PROJECT_REPO>`.
- Branch: `dev`, tracking `origin/dev`; TSR07 starting point was commit `76141db`. Remote freshness was not fetched.
- No production behavior, dependency, migration, schema, or compatibility path changed.

## Files changed

Modified:

- `test/issue-resolution/issue-fix-card-service.test.cjs`
- `validation/capability-map.json`

Created: this report.

Deleted: none.

Intentionally not created: production fallbacks, broad wording bans, dependencies, branches, worktrees, JSON sidecars, or generated output.

## Root-cause classification and correction

The shared validation guidance correctly uses ordinary phrases such as `Work Card` and `Phase close` when describing which evidence does or does not count. The prior negative assertion rejected those generic words anywhere in the rendered guidance, even though they did not introduce Development workflow ownership or identity.

This was a stale test expectation, not a production integrity defect. The correction replaces the broad vocabulary ban with structural boundary assertions that reject:

- Development identity labels: `Phase ID`, `Work Card ID`, and `Parent Work Card ID`;
- Development identity fields: `phaseId`, `phaseRevision`, `workCardId`, and `parentWorkCardId` when rendered as assignments.

The existing positive assertions still require the selected Issue/Fix Card context, Issue ID, Fix Card ID, validation scope guidance, and required output sections. The Issue Fix Card boundary therefore remains explicit without treating shared explanatory vocabulary as foreign ownership.

## Timings and validation

| Exact command | Lane | Result |
| --- | --- | --- |
| `node --test --test-reporter=tap --test-concurrency=1 test/issue-resolution/issue-fix-card-service.test.cjs` | Normal Windows focused integration | Exit 0; 21/21 passed in 8,422.067 ms; the repaired planning-handoff case passed in 133.1623 ms. |
| `node --check test/issue-resolution/issue-fix-card-service.test.cjs` | Restricted syntax lane | Exit 0. |
| Direct ValidationCatalog load/schema check | Restricted catalog/schema lane | Exit 0; exact coverage and ownership validated for 147 tests. |

No full suite/profile or corpus audit was run.

## Git, security, and residual risk

- The Operator authorized a completion commit. Its hash is pending in this artifact and is reported after commit without amending solely for its own hash.
- No push, merge, rebase, tag, reset, clean, restore, stash, new branch, or worktree was performed.
- The staged safety review found no credentials, concrete local-machine paths, or generated artifacts; the sole keyword match was this report's description of that review.
- Operator manual validation: none; acceptance is deterministic and non-visual.
- Residual risk: the test recognizes the currently governed Development identity labels and camel-case field names; future schema additions must extend the structural boundary assertion.
- Recommended next task: TSR09.
