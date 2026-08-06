<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "implementer-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR04",
    "repairId": "WC46-REPAIR04",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR04_selected_workspace_target_binding_and_loop_drift_hardening.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Implementer Report - WC46-REPAIR04 Selected Workspace Target Binding and Loop Drift Hardening",
    "status": "Pending",
    "gitMutationPerformed": false
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Implementer Report - WC46-REPAIR04 Selected Workspace Target Binding and Loop Drift Hardening

## Pass Type

Numbered repair Work Card implementation pass for `WC46-REPAIR04`.

## Repository Verification

- Repository path inspected: verified approved repo root, recorded as `<PROJECT_REPO>`.
- Branch observed: `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Remote observed: `origin` points to `https://github.com/ChampCityChris/ChampCity_AI.git`.
- Working status: dirty before this pass and dirty after this pass, with existing WC46/WC46-REPAIR01/WC46-REPAIR02/WC46-REPAIR03 changes already present.
- Git mutation: none. No staging, commit, push, pull, checkout, rebase, merge, reset, stash, clean, or tag was performed.
- Boundary documents read before edits: `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` and `docs/dev/VALIDATION_COMMAND_LANES.md`.

## Files Created

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR04_selected_workspace_target_binding_and_loop_drift_hardening.md`

## Files Modified

- `src/main/workCardPlanning/workCardPlanningService.ts`
- `src/main/workCardIntake/workCardIntakeService.ts`
- `src/main/currentWorkflow/currentWorkflowService.ts`
- `test/work-card-planning/work-card-planning-service.test.cjs`
- `test/work-card-intake/work-card-intake-service.test.cjs`
- `test/work-card-loop/work-card-loop-authority-service.test.cjs`
- `test/workflow/current-execution-context.test.cjs`
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`

## Files Intentionally Not Created

- No hidden selected-candidate state file.
- No route token.
- No persistent close acknowledgement.
- No Work Card Map sidecar.
- No closeout document.
- No validation-record mutation path.
- No alternate Implementer Report path.
- No dependency or package metadata change.
- No global project/phase lifecycle replacement service.

## Implementation Summary

`workCardPlanningService` now carries an application-owned selected workspace target descriptor in the Formal Work Card context. The descriptor is derived from the already validated selected `workspaceRoot` and records only safe authority values: `<PROJECT_REPO>`, the approved Work Card Intake handoff path, the Formal Work Card target path, and the Implementer Report target path. The prepared prompt now tells the Architect to use the selected project workspace, verify the exact handoff and target paths, use no other workspace, and abort if the selected workspace cannot be verified.

Representative generated prompt wording now includes:

```text
Use the selected project workspace for this Work Card.
The application has already resolved the target workspace for this handoff.
Use ChampCity MCP with repository reference <PROJECT_REPO> for that selected project workspace only.
Before making repository claims, verify that the selected workspace contains the approved Work Card Intake handoff path below and accepts the Formal Work Card target path below.
Do not use any other workspace as the implementation target.
If the selected workspace cannot be verified through these exact paths, abort as incomplete.

Application-owned selected workspace target binding:
- selected workspace repository reference: <PROJECT_REPO>
- approved Work Card Intake handoff path: planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01.md
- Formal Work Card target path: planning/phases/phase-01/Work_Cards/WC01_first_work_card.md
- Implementer Report target path: planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md
```

The hard-coded wrong-target repository names were removed from production prompt generation. `rg -n "ChampCity_AI|champcity_ai" src/main/workCardPlanning/workCardPlanningService.ts dist/main/workCardPlanning/workCardPlanningService.js` returned no matches after build. The remaining matches in the scoped safety scan were the approved Work Card text and negative test assertions proving those strings are absent from generated prompts.

Formal Work Card promotion/readback remains selected-workspace and active-target constrained. `resolvePromotionContext(...)` now also compares phase ID, Work Card ID, candidate ID, target path, Implementer Report path, handoff source revision, and source revisions against the current active Work Card Intake handoff before promotion. Test coverage proves a mismatched prepared target is rejected with `Formal Work Card draft no longer matches the current Work Card Intake handoff.`

`currentWorkflowService` now gives the Work Card loop resolver first right of refusal when the current document is clearly a Work Card-loop document. `isWorkCardLoopDocument(...)` identifies Work Card-loop artifact types, workspace IDs, selected Work Card IDs, and Work Card paths before `repairModelForRevisionRequestedEvidence(...)` can select the repair workspace. Non-Work-Card project/phase revision routing remains outside that Work Card-loop first pass.

`workCardIntakeService.resolveWorkCardIntakeContext(...)` still builds the canonical context, source revisions, candidate metadata, handoff path, and Formal Work Card target. Requested-candidate eligibility is no longer decided by local duplicate helpers. Requested candidates now call `resolveWorkCardLoopAuthority(workspaceRoot, phaseId, options)` and only build context when resolver-owned authority marks the candidate Eligible or the same active candidate reusable. Different-active, Complete, Ineligible, no-plan, not-applicable, all-complete, and conflict states reject using resolver-owned reason and evidence.

## Acceptance Evidence

- Prompt target binding: `src/main/workCardPlanning/workCardPlanningService.ts` defines `selectedWorkspaceTarget` and emits the generic selected-workspace target binding in `buildFormalWorkCardPreparedInstruction(...)`.
- Prompt forbidden-name proof: `test/work-card-planning/work-card-planning-service.test.cjs` asserts generated instructions do not match `ChampCity_AI` or `champcity_ai`; production and compiled prompt source scans returned no matches.
- Exact prompt path proof: Work Card planning tests assert phase ID, candidate ID, handoff path, Formal Work Card target path, Implementer Report target path, and temporary draft path.
- Promotion/readback proof: `formal Work Card promotion context rejects mismatched active target evidence` proves a mismatched active target cannot silently promote.
- Resolver-first repair routing proof: `src/main/currentWorkflow/currentWorkflowService.ts` calls `workCardLoopAuthorityModel(...)` before `repairModelForRevisionRequestedEvidence(...)` for Work Card-loop documents.
- Intake authority proof: `src/main/workCardIntake/workCardIntakeService.ts` routes requested candidates through `resolveWorkCardLoopAuthority(...)`; local duplicate candidate eligibility helpers were removed from the intake service.
- Normal Work Card Map Begin Planning proof: focused workflow and renderer tests pass for candidate-scoped planning.
- Same-active continuation proof: focused tests prove same active candidate reuse remains allowed.
- Stale close proof: resolver and workflow tests prove WC02 Approved Formal Work Card routes to WC02 Build Review despite stale WC01 Close evidence.
- Repair routing proof: resolver and workflow tests prove Request Repair routes to `work-card-repair` with parent Work Card identity preserved.
- Close / Next proof: focused workflow tests prove close-return selection recalculates Work Card Map and allows the next candidate only with close-return completion.
- All-complete proof: resolver, workflow, and renderer tests prove all-complete routes toward Phase Validation.
- Project/phase lifecycle preservation: the full test lane passed without replacing the global project/phase resolver.

## Commands Run And Results

- `pwd` from `<PROJECT_REPO>`: passed; verified approved repo root.
- `git status --short --branch`: passed; dirty branch observed before and after; no Git mutation performed.
- `Get-Content docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`: passed.
- `Get-Content docs/dev/VALIDATION_COMMAND_LANES.md`: passed.
- `Get-Content planning/phases/phase-08/Work_Cards/WC46-REPAIR04_selected_workspace_target_binding_and_loop_drift_hardening.md`: passed.
- `npx tsc --noEmit`: passed in Lane 1 direct clean-room automated validation.
- `npx tsc`: passed in Lane 1 direct clean-room automated validation.
- `node --test --test-concurrency=1 test/work-card-planning/work-card-planning-service.test.cjs test/work-card-intake/work-card-intake-service.test.cjs test/work-card-loop/work-card-loop-authority-service.test.cjs test/workflow/current-execution-context.test.cjs test/repository/runtime-wiring-source.test.cjs test/app-shell/app-shell.test.cjs`: sandbox run failed with documented `spawn EPERM`; normal Windows rerun passed, 41/41 tests.
- `npx vite build`: sandbox run failed with documented esbuild `spawn EPERM`; normal Windows rerun passed, 1620 modules transformed.
- `node --test --test-concurrency=1`: normal Windows full suite passed, 281/281 tests.
- `rg -n "C:\\\\Users|/Users/|/home/|ChampCity_AI|champcity_ai|API_KEY|SECRET|TOKEN|PASSWORD|\\.env" ...`: passed for scoped changed files; only expected matches were the Work Card authority text and negative test assertions.
- `rg -n "ChampCity_AI|champcity_ai" src/main/workCardPlanning/workCardPlanningService.ts dist/main/workCardPlanning/workCardPlanningService.js`: passed with no matches.

## Validation Skipped

- `npm run typecheck`, `npm run build`, and `npm test` were not used because `docs/dev/VALIDATION_COMMAND_LANES.md` directs Lane 1 direct commands until package scripts are corrected.
- Operator manual validation was not performed by the Implementer, per the Operator validation boundary.
- No Electron launch smoke was performed because this Work Card did not require Implementer manual acceptance, and automated production-path coverage passed.

## Security And Secret-Safety Notes

- No dependencies were added.
- No secrets, credentials, API keys, tokens, `.env` contents, or concrete local machine paths were added.
- Generated prompt target binding uses `<PROJECT_REPO>` and repo-relative paths, not a concrete local filesystem path.
- Renderer filesystem authority was not broadened.

## Residual Risks

- Operator-observed embedded ChatGPT behavior still requires manual validation in the running app.
- The working tree contains many pre-existing WC46-related uncommitted and untracked files outside this pass; this report records only this pass's changed files and no Git mutation.

## Manual Validation Required

After Architect review, the Operator must validate in the running app that a selected project workspace outside the application source prepares a Formal Work Card prompt with generic selected-workspace targeting, that embedded ChatGPT starts against that selected workspace, that Formal Work Card approval routes to the same Work Card Build Review, that Request Repair preserves parent Work Card identity, and that Close / Next and all-complete routing remain correct.

## Recommended Next Implementer Task

Architect review of this Pending report, followed by Operator manual validation of the embedded Architect selected-workspace handoff behavior.

Document.Status=Pending
