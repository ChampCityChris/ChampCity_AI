# SCL03 Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root without recording a workstation path.
- Card: Work Card `SCL03`, Create Existing-Project Work Sources from `dev`.
- Predecessor: SCL02 checkpoint `c3dddc6ccadf982b41ebb761e845b3282a2c26a3`.
- Branch and remote: `dev`, ahead of `origin/dev`; no push directed.

## Files

- Created: this report.
- Modified: `src/main/workIntake/structuredWorkIntakeService.ts`, `src/main/workIntake/workIntakeBranchService.ts`, `src/main/planExecution/workItemCheckpointService.ts`, `test/work-intake/structured-work-intake-capture.test.cjs`, `test/agent-harness/work-intake-branch-boundary.test.cjs`, and `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: a worktree, remote requirement, checkout-switching Save path, or SCL04 greenfield source setup.

## Implementation and evidence

New structured existing-Project Work Intakes request `dev` as their integration target. Source preparation resolves the current local `dev` ref through RepositoryService to an exact SourceRevision, records that base in SourceBinding, rechecks `dev` before creation, and atomically creates the deterministic Work Intake source line from that revision through `createWorkSource`. The primary checkout, its HEAD, and its files are not switched or cleaned. Two synthetic Intakes created from successive `dev` revisions retain distinct work lines and exact base/current revisions while the primary checkout is dirty.

A pre-existing deterministic branch blocks preparation with `BRANCH_COLLISION` and inspectable source state, including on retry. It never overwrites or silently adopts a colliding branch, even when its revision matches the recorded base; an uncertain prior attempt requires explicit inspection. Work Intake branch verification now inspects the named work line and its checkpoint ancestry instead of assuming the process-selected checkout is that line. A legacy source checkpoint still writes the selected checkout, so its capture and completion paths now state and recheck that separate mutation precondition explicitly.

The structured Work Intake screen offers `dev` as its existing-Project target when available. Source preparation remains blocked and retryable when local `dev` is unavailable. The existing non-cut-over V1 submission path remains a compatibility path pending later package retirement.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows, static/build | Passed; final affected profile rebuilt final source. |
| `node --test test/work-intake/structured-work-intake-capture.test.cjs test/agent-harness/work-intake-branch-boundary.test.cjs` | Normal Windows, focused Git/ownership | Passed 6/6 after adapting the blocked fixture to a missing `dev` ref. |
| `node --test test/validation/capability-map.test.cjs` | Normal Windows, catalog | Passed 5/5. |
| `node --test test/agent-harness/source-checkpoint-boundary.test.cjs` | Normal Windows, focused checkpoint consumer | Passed 2/2 after adding the explicit selected-checkout check. |
| `npm run test:affected -- --changes tmp/scl03-changes.json` | Normal Windows, work-item | Final receipt `ab7b443a-d6f5-4f8f-ba44-30c6d88d3108` passed 298/298 in 47 selected files; source stable. |
| `git diff --check` and `git diff --cached --check` | Read-only source/staged checks | Passed. |

The first affected receipt `f045b9c5-5096-4ccf-b031-c22faa188be5` failed one checkpoint consumer because it had inherited the old current-checkout assumption from branch verification. The explicit mutation precondition corrected that behavior; the final profile passed. No required check was skipped. The work-item profile includes build, fast, affected, and applicable integration checks. No external integration, visual acceptance, or release result is claimed.

## Git and safety

The Operator directed one checkpoint commit for this card. Its hash is pending at report creation and will be reported after commit. Exact staged diff inspection, whitespace check, and added-line secret, concrete local-path, and generated-artifact scans passed with no findings. No push, merge, rebase, reset, clean, restore, or stash was performed.

## Remaining validation and next task

The source repository remains ineligible for its own structured cutover because of the SCL01Y inventory conflicts; this card's stateful source tests use qualified synthetic Projects. Greenfield `main`/`dev` provisioning belongs to SCL04. Continue to SCL04 after this checkpoint.
