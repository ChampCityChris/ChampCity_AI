# IMPLEMENTER REPORT: ISSUE_001-FC03-REPAIR04 Automatic Architect Draft Detection and Promotion

## Pass Type

Repair pass for `ISSUE_001-FC03-REPAIR04`.

## Repository Path Inspected

Verified approved repo root.

## Git Branch And Remote Status

- Branch inspected: `feature/phase-04-wc01-repair01-evidence-derived-workflow`
- Remote inspected: `origin/feature/phase-04-wc01-repair01-evidence-derived-workflow`
- Git mutation: not performed; this repair explicitly forbids Git mutation.
- Commit created: no
- Commit hash: not applicable

## Failed Evidence And Confirmed Root Cause

Operator validation showed Browser GPT could write the expected temporary Architect draft, but Issue Architect Planning stayed in the pre-promotion state until the Operator manually pressed `Promote Draft`. Repository inspection confirmed the current service projected `draft-ready` and `canPromoteDraft`, while the renderer exposed a manual promotion action and did not poll the selected Issue Architect projection while Architect Planning was foregrounded.

The root cause was an unnecessary renderer-owned lifecycle gate. Promotion is application-owned plumbing and should occur when the exact prepared temporary draft appears; the Operator-owned decision is the later Architect Investigation disposition.

## Files Modified

- `src/main/issueResolution/issueResolutionService.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/IssueArchitectPlanningWorkspace.tsx`
- `test/issue-resolution/issue-architect-planning-service.test.cjs`
- `test/renderer/issue-architect-planning-workspace.test.cjs`

## Files Created

- `issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC03-REPAIR04_automatic_architect_draft_detection_and_promotion.md`

## Files Intentionally Not Created

- No new package or dependency files.
- No generic filesystem watcher.
- No FC04 Issue Planning implementation.
- No Development workflow compatibility or migration layer.
- No Work Card JSON sidecar.

## Automatic Detection And Promotion Path

`getIssueArchitectPlanningProjection()` now uses the active Issue Architect submission identity as the only auto-promotion authority:

- resolves the selected readable Issue;
- reads the current final investigation and review state;
- looks up only the active submission for the selected Issue;
- checks only that submission's exact `temporaryDraftPath`;
- auto-promotes only when the final investigation is missing or when the current review disposition is `RevisionRequested`;
- calls the existing application-owned promotion path, preserving the same draft validation and final-write authority;
- returns the resulting projection, which becomes `awaiting-operator-review` after a valid promotion.

The service does not scan or infer ownership from arbitrary files under `issues/Architect_Drafts/`.

## Invalid-Draft And Retry-Loop Prevention

Invalid expected drafts are rejected by the same FC03 validation rules already used by manual promotion:

- exact Issue H1;
- required Architect sections;
- exact allowed Architect Recommendation;
- no metadata delimiters;
- substantive non-placeholder content.

When auto-promotion fails, the active submission is cleared and a stable Issue Architect `needs-attention` projection is stored for that Issue/submission key. Subsequent projection refreshes return the same attention message without retrying the same invalid draft. A fresh `Prepare Handoff` clears the prior failure and creates a new bounded submission.

Failed validation does not overwrite the current final investigation or current review.

## Operator Promotion Gate Removal

`IssueArchitectPlanningWorkspace` no longer accepts or renders `onPromoteDraft`, and the right Architect action panel no longer contains a `Promote Draft` button. The remaining user-facing controls are state-appropriate handoff/browser controls: `Reload ChatGPT`, `Prepare Handoff`, `Copy Handoff`, and `Refresh`.

The internal `promoteIssueArchitectPlanningDraft()` service function remains available as a bounded implementation/test seam, but it is no longer required as an Operator action in the normal Issue Architect workflow.

## Scoped Polling Proof

`App.tsx` now polls the Issue Architect projection only when all required foreground conditions are true:

- Issue Resolution is the active workflow;
- selected Issue stage is `architect-planning`;
- the selected Issue Record is readable.

The polling interval is modest and uses an in-flight/request guard so overlapping quiet refreshes are skipped and stale responses are ignored. Cleanup stops polling and invalidates in-flight projection responses when leaving Architect Planning, leaving Issue Resolution, switching selected Issue, or changing selected project context.

Renderer proof asserts the polling effect calls `getIssueArchitectPlanningProjection` through the Issue Architect path and does not contain Development/Codex start actions or Development Architect-output polling.

## Revision-History Preservation Proof

The focused service test for `RevisionRequested` now writes a revised exact active temporary draft and then calls `getIssueArchitectPlanningProjection()` rather than manual promotion. The projection auto-promotes the revised draft, removes the current review, returns to `awaiting-operator-review`, and preserves prior investigation/review files under `Architect_History/revision-001/`.

## Validation Performed

- `npm run typecheck`
  - Lane: sandbox lane
  - Result: passed

- `npm run build`
  - Initial sandbox result: failed with the documented Vite/esbuild child-process `spawn EPERM`
  - Lane rerun: normal Windows validation lane
  - Result: passed

- `node --test test/issue-resolution/issue-architect-planning-service.test.cjs`
  - Initial sandbox result: failed before suite execution with documented Node test runner `spawn EPERM`
  - Lane rerun: normal Windows validation lane
  - Result: passed, 11/11 tests

- `node --test test/renderer/issue-architect-planning-workspace.test.cjs`
  - Initial sandbox result: failed before suite execution with documented Node test runner `spawn EPERM`
  - Lane rerun after fixing a test-helper slice: normal Windows validation lane
  - Result: passed, 4/4 tests

- `node --test test/renderer/issue-resolution-shell.test.cjs`
  - Initial sandbox result: failed before suite execution with documented Node test runner `spawn EPERM`
  - Lane rerun: normal Windows validation lane
  - Result: passed, 4/4 tests

- `node --test test/browser/architect-browser-handoff.test.cjs`
  - Initial sandbox result: failed before suite execution with documented Node test runner `spawn EPERM`
  - Lane rerun: normal Windows validation lane
  - Result: passed, 1/1 test

## Validation Skipped And Reason

- Full `npm test` was not rerun for this repair because the required focused repair lane passed, and previous broad runs in this repair sequence already identified unrelated residual failures outside REPAIR04 scope.
- Live embedded ChatGPT/MCP write-back validation was not performed by the Implementer. Per project rules, this remains Operator-owned.

## Causal Classification Of Unrelated Failures

The sandbox `spawn EPERM` results were environment-lane failures, not source failures. They occurred before Vite/esbuild or Node test suites could execute normally and were resolved by the documented normal Windows validation lane.

Previously observed broad-suite failures remain outside this repair's causal scope:

- `test/renderer/work-card-building-review-workspace.test.cjs`
- `test/repository/runtime-wiring-source.test.cjs`

## Security And Credential-Safety Notes

- No credentials, API keys, private authentication material, or environment files were added.
- No renderer filesystem authority was broadened.
- No arbitrary draft-directory scanning was introduced.
- Durable report content uses repo-relative paths and does not record concrete local machine paths.

## Manual Validation Required

Operator should validate with an Issue lacking a final investigation:

1. Prepare and copy the Architect handoff.
2. Have Browser GPT write the expected temporary draft through MCP.
3. Do not click Refresh or any promotion action.
4. Confirm the app detects and promotes the draft within the polling interval.
5. Confirm `ARCHITECT_INVESTIGATION.md` becomes the active review document and the disposition panel appears.
6. Confirm no `Promote Draft` control exists.

If practical, also validate a `RevisionRequested` rerun and confirm the revised temporary draft auto-promotes back to `Awaiting Operator Review`.

## Residual Risks

- Automated tests prove the local service/renderer contract, but they do not prove live ChatGPT sign-in, MCP availability, or actual remote write-back.
- The internal manual promotion service seam remains for bounded tests/internal use, so future UI changes must continue to avoid reintroducing it as an Operator gate.
- Existing unrelated dirty worktree files were not reviewed or altered unless they intersected this repair.

## Recommended Next Implementer Task

Return to parent FC03 focused review. If Operator validation passes, proceed to FC04 without retaining a manual draft-promotion exception for Issue Architect Planning.
