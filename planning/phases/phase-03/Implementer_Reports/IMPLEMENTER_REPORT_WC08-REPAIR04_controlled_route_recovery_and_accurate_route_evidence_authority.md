<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/implementer_report/WC08-REPAIR04",
  "artifactType": "implementer_report",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.json",
  "markdownPath": "planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md",
  "parentArtifactId": "champcity-ai/phase-03/work_card/WC08",
  "payload": {
    "kind": "implementer_report",
    "title": "Implementer Report - WC08-REPAIR04 Controlled Route Recovery and Accurate Route Evidence Authority"
  },
  "payloadHash": "sha256:e56072bcf1c190b261bb3d6a7d8fd3baa2cacda232e38292f4a491b20351f6ae",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC08-REPAIR06",
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR05",
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR06",
      "champcity-ai/phase-03/work_card/WC08-REPAIR05",
      "champcity-ai/phase-03/work_card/WC08-REPAIR06"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-03/architect_review/WC08-REPAIR04"
    ],
    "sources": [
      "champcity-ai/phase-03/observation_register/Observation_Register",
      "champcity-ai/phase-03/validation_report/WC08-REPAIR01",
      "champcity-ai/phase-03/work_card/WC08-REPAIR01_route_context_explanation_and_correction_affordance",
      "champcity-ai/phase-03/work_card/WC08-REPAIR04",
      "champcity-ai/project/observation_register/Project_Observation_Register"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-14T00:00:00.000Z",
  "workCardId": "WC08-REPAIR04"
}
-->

# Implementer Report - WC08-REPAIR04 Controlled Route Recovery and Accurate Route Evidence Authority

## Pass Classification

- Pass type: Numbered Repair Work Card implementation
- Work Card: `WC08-REPAIR04`
- Branch: `feature/phase-03-wc08-repair04-controlled-route-recovery`
- Intended commit message: `Repair WC08 controlled route recovery and evidence authority`
- Commit created: Pending until this report and the related implementation are committed together.
- Commit hash: Pending until commit is created.
- Tag: Not created or authorized.

## Repository And Remote Verification

- Repository path inspected: `<PROJECT_REPO>` (verified approved repo root).
- Git top-level: verified approved repo root.
- Remote: `origin` matched `https://github.com/ChampCityChris/ChampCity_AI.git`.
- Base branch verified: `feature/phase-03-wc08-repair01-route-context-explanation`.
- Target branch created from the approved base: `feature/phase-03-wc08-repair04-controlled-route-recovery`.
- `dev` was not checked out, modified, merged, or pushed.
- `master` was not checked out, modified, merged, or pushed.

## Implementation Summary

Implemented the WC08-REPAIR04 route-authority repair, accurate Route Context evidence classification, and a governed in-app Route Review Request workflow.

The live evaluator now selects `WC08-REPAIR04` as the controlling unresolved WC08 repair-chain obligation. It does not reopen stale Phase 03 WC01/WC04 repair history and does not advance to WC09. The selected route follows explicit structured repair relationships and cited trigger evidence rather than filename suffixes, modification times, or directory order.

The Route Context now separates accepted/controlling evidence, evidence present but pending Architect disposition, missing required evidence, stale/historical/superseded evidence, and duplicate/ambiguous evidence. The repair Work Card remains the displayed Work Card throughout its Implementer, Architect review, Operator validation, and validation-disposition routes.

`This route looks wrong` now contains a `Request route review` form. The Operator can record a concern and optional expected route/evidence inside the app. Submission creates a constrained JSON and Markdown pair under `planning/phases/<phase>/Route_Review_Requests/` with `pending_architect_review` status and an evidence snapshot. Saving the request does not alter the current route or create approval, validation, completion, skip, or advancement evidence.

## Root Cause

The stale route was caused by several interacting authority defects:

1. Validation lookup gathered every report for a target, sorted matches by filesystem modification time, and silently selected one. Amended and original reports therefore had implicit authority based on local filesystem state.
2. Repair discovery selected an unresolved repair using directory/read order without a durable relationship that identified the controlling follow-up repair.
3. Candidate resolution could treat a passing parent validation as sufficient even while an active Repair Work Card had no Implementer Report.
4. Repair routing skipped Architect review after a repair Implementer Report and moved directly toward Operator validation.
5. Route Context categories for a repair action could fall back to the parent Work Card's report, review, and validation, causing present or historical evidence to be described as controlling or missing.

## Current-Action Authority Repair

- Duplicate Validation Reports are collected as one `duplicate_ambiguous` state. No report is chosen by filename suffix, timestamp, modification time, or directory order.
- A duplicate state cannot satisfy passing validation. When it controls the unresolved target, the action routes to Architect evidence-authority review.
- Structured `parentRepairId`, `parent_repair_id`, `parentRepairChain`, and `parent_repair_chain` relationships identify predecessor repairs that a later repair follows.
- Explicit `sourceValidationReports` and structured repair-trigger validation references identify the validation evidence that caused a follow-up Repair Work Card.
- Terminal repair selection removes explicitly superseded predecessors before identifying the active obligation.
- An explicit unresolved follow-up such as `WC08-REPAIR04` takes precedence over unrelated or historical repair evidence.
- An active Repair Work Card without an Implementer Report remains unresolved even if the parent Work Card has older passing evidence.
- After the repair Implementer Report exists, the next required route is Architect review of that repair report. Operator validation is not selected until an Architect Review authorizes it.
- The focused live-state assertion verifies `WC08-REPAIR04`, not WC01 or WC09.

## Narrow Authority Adapter Limitations

This pass does not implement project-wide artifact revision governance.

- The adapter recognizes only explicit relationships already present in structured Work Card fields and explicit validation-trigger paths.
- It does not infer authority from `_2` suffixes, timestamps, modification time, or an apparently later file.
- A duplicate report set remains ambiguous unless another durable record explicitly establishes which evidence or follow-up repair controls.
- WC08-REPAIR02's duplicate validation reports are therefore surfaced as ambiguous, while their pending Architect disposition is shown separately. They are not silently accepted or discarded.
- WC08-REPAIR03 validation is shown as present with pending durable Architect disposition.
- The Route Review Request records a concern and ownership but does not itself decide authority or change routing.
- PH03-OBS-010 / PROJ-OBS-007 remains open for the broader revision and authority model.

## Evidence Classification

- Accepted / controlling: the selected unresolved Repair Work Card and an explicitly cited repair trigger.
- Present but pending Architect disposition: validation evidence whose durable Architect disposition is pending or missing.
- Missing and required next: the current action's expected artifact, such as the REPAIR04 Implementer Report or later Repair Architect Review.
- Stale / historical / superseded / non-controlling: predecessor repair records explicitly followed by the selected repair or evidence with no authority over the selected route.
- Duplicate: multiple validation records for one target without explicit revision authority.
- Ambiguous: competing terminal repair obligations or duplicate controlling validation evidence that requires Architect disposition.

Present-but-pending evidence is no longer placed in the missing list. Duplicate evidence is no longer treated as passing. Historical evidence is retained for explanation and preview through the existing Artifacts surface but is not presented as controlling authority.

## Controlled Route Recovery

The in-app recovery form displays:

- the currently selected route;
- expected controlling evidence;
- pending or missing evidence;
- duplicate or ambiguity warnings;
- a required Operator concern field;
- an optional expected route/evidence field;
- the governance and ownership boundary.

Submission uses an Electron preload/main IPC method. The main process validates phase and identifier syntax, text lengths, evidence-list limits, and a constrained phase planning directory. It writes a unique JSON/Markdown artifact pair with exclusive-create semantics. Renderer code receives no unrestricted filesystem access.

The saved record identifies:

- Operator as the reporting role;
- Architect as the disposition owner;
- Implementer as the owner of evaluator/artifact-model repair only when assigned;
- all workflow mutations as false.

There is no copyable Architect/LLM prompt and no unrestricted Operator override.

## Passed Behavior Preserved

- Default tab remains `Complete current action`.
- Tab order remains `Complete current action`, `Artifacts`, `Why this step?`.
- `Why this is the current action` remains the first major Route Context section.
- Priority and advancement explanations remain plain-language and visible.
- `What happens next` and `What would change this route` remain visible.
- Detailed diagnostics remain secondary and collapsed.
- The left Current Action panel remains compact.
- Artifacts remains the only artifact list and preview surface.
- Supporting/reference screens continue to suppress the full Route Context inspector.
- WC08-REPAIR02 report-review governance remains covered by its focused protocol fixture.
- WC08-REPAIR03 still blocks premature WC09 advancement.
- WC09-WC15 were not created or implemented.

## Files Created

- `src/shared/workCards/routeReviewRequest.ts`
- `scripts/verify-wc08-repair04-controlled-route-recovery.mjs`
- `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md`

## Files Modified

- `src/shared/workCards/currentRequiredAction.ts`
- `src/shared/workCards/currentStepContextInspector.ts`
- `src/main/workCards/workCardFileStore.ts`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/renderer/global.d.ts`
- `src/renderer/app/WorkflowRouterShell.tsx`
- `scripts/verify-work-card-fixture.mjs`
- `scripts/verify-wc04-repair03.mjs`
- `scripts/verify-wc05-support-navigation.mjs`
- `scripts/verify-wc06-repair01-validation-route.mjs`
- `scripts/verify-wc06-workflow-visibility.mjs`
- `scripts/verify-wc08-current-step-context-inspector.mjs`
- `scripts/verify-wc08-repair01-route-context-explanation.mjs`
- `scripts/verify-wc08-repair03-pending-repair-validation-routing.mjs`

## Pre-Existing Source Artifacts Preserved

The following Architect/Operator source artifacts were already present in the working tree before the Implementer code edits. They were not authored or reinterpreted as accepted by this pass. Two trailing spaces in the supplied Markdown validation report were removed only to satisfy the staged diff whitespace check:

- `planning/phases/phase-03/Work_Cards/WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.json`
- `planning/phases/phase-03/Work_Cards/WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08-REPAIR01_route_context_explanation_and_correction_affordance.json`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08-REPAIR01_route_context_explanation_and_correction_affordance.md`
- `planning/phases/phase-03/Validation_Evidence/WC08-REPAIR01_route_context_explanation_and_correction_affordance/image.png`
- `planning/phases/phase-03/Validation_Evidence/WC08-REPAIR01_route_context_explanation_and_correction_affordance/image_2.png`
- `planning/phases/phase-03/Validation_Evidence/WC08-REPAIR01_route_context_explanation_and_correction_affordance/image_3.png`
- `planning/phases/phase-03/Observation_Register.json`
- `planning/phases/phase-03/Observation_Register.md`
- `planning/project/Project_Observation_Register.json`
- `planning/project/Project_Observation_Register.md`

## Files Intentionally Not Created

- No WC09-WC15 Work Cards or implementation files.
- No validation, acceptance, Architect disposition, phase-closeout, or merge record.
- No general route-override record or project-wide artifact revision registry.
- No authentication, database, cloud, provider SDK, connector, MCP, deployment, or Playwright files.

## Commands Run And Results

Execution lane for TypeScript and production builds: approved normal Windows validation wrapper from `docs/dev/VALIDATION_COMMAND_LANES.md`.

- `npm run validate:codex:unit` - passed (`npm test` / TypeScript no-emit validation).
- `npm run validate:codex:build` - passed after the final authority selection changes (TypeScript compile, Vite production build, asset copy).
- `npm run validate:codex` - final full approved lane passed (`npm test` plus production build).
- `node --check scripts/verify-wc08-repair04-controlled-route-recovery.mjs` - passed.
- `node --check` for updated WC08 and preservation fixtures - passed.
- `node scripts/verify-wc08-repair04-controlled-route-recovery.mjs` - passed.
- `node scripts/verify-wc08-repair01-route-context-explanation.mjs` - passed.
- `node scripts/verify-wc08-current-step-context-inspector.mjs` - passed.
- `node scripts/verify-wc08-repair03-pending-repair-validation-routing.mjs` - passed.
- `node scripts/verify-work-card-fixture.mjs --current-action-only` - passed.
- `node scripts/verify-work-card-fixture.mjs --report-protocol-only` - passed.
- `node scripts/verify-wc04-repair01.mjs` - passed.
- `node scripts/verify-wc04-repair03.mjs` - passed.
- `node scripts/verify-wc05-support-navigation.mjs` - passed.
- `node scripts/verify-wc06-repair01-validation-route.mjs` - passed.
- `node scripts/verify-wc06-workflow-visibility.mjs` - passed.
- `node scripts/verify-wc07-artifact-workspace.mjs` - passed.
- `git diff --check` - passed; Git reported only expected line-ending conversion notices.

## Validation Skipped Or Not Counted

- `node scripts/verify-work-card-fixture.mjs` broad legacy fixture was run but not counted as passing because it stops on the pre-existing checked-in Phase 01 WC01 Markdown/render mismatch. The focused current-action and report-protocol lanes passed. This repair did not modify the Phase 01 artifact or renderer.
- Playwright was not installed or run because the Work Card explicitly prohibits Playwright.
- Operator Human Validation was not performed because it belongs to the Operator after Architect review.
- No visual acceptance, usability acceptance, Architect acceptance, phase closeout, merge, or release validation was claimed.

## Automated Validation Performed

- TypeScript strict type validation.
- Production renderer and Electron code compilation.
- Exact live-route assertion for `WC08-REPAIR04`, including prevention of WC01 and WC09 selection.
- Synthetic parent-pass plus unresolved-repair regression.
- Duplicate-validation ambiguity and non-passing authority regression.
- Evidence classification assertions for accepted, pending, missing, historical, duplicate, and ambiguous states.
- Present-pending evidence exclusion from the missing list.
- Route Review Request schema, Markdown, governance, and ownership assertions.
- UI source assertions for the governed in-app form and removal of prompt-copy handoff.
- WC08-REPAIR01, REPAIR02 protocol, REPAIR03 routing, WC07 artifact workspace, and WC04-WC06 preservation fixtures.

## Operator Manual Validation Required

The Implementer did not perform or claim these acceptance steps. After Architect review authorizes validation, the Operator must verify:

1. The app does not open to stale Phase 03 WC01 when WC08 repair-chain obligations remain unresolved.
2. The app does not prematurely open WC09.
3. Current Action identifies the actual controlling unresolved WC08 repair-chain obligation.
4. Route Context accurately identifies accepted/controlling evidence.
5. Route Context accurately identifies evidence present but pending Architect disposition.
6. Route Context accurately identifies missing evidence.
7. Route Context does not label present-but-pending evidence as missing.
8. Duplicate or ambiguous validation evidence is surfaced as an ambiguity warning.
9. `This route looks wrong` / `Request route review` is visible.
10. The route recovery path is in-app and useful.
11. The recovery path does not rely primarily on copying a prompt to an Architect or LLM.
12. The recovery path does not approve, validate, complete, skip, or advance workflow state.
13. The recovery path creates a durable JSON/Markdown Route Review Request under the active phase's `Route_Review_Requests` folder with pending Architect review status.
14. WC08-REPAIR01 passed layout behavior remains intact.
15. WC08-REPAIR02 validation-governance behavior remains intact.
16. WC08-REPAIR03 pending-repair routing behavior remains intact.
17. Artifacts remains the only artifact list/preview surface.
18. Supporting/reference screens do not show the full Route Context inspector.

## Safety And Secret Scan

- No secrets, credentials, tokens, API keys, or `.env` files were intentionally added.
- No concrete local machine path is written in this report or implementation-generated durable record.
- Renderer filesystem access remains restricted to typed preload IPC.
- Route Review Request writes are constrained to `planning/phases/<phase>/Route_Review_Requests/`.
- No build output, archive, dependency cache, or unrelated generated junk is intended for staging.
- Final safety scans and staged-diff review are required immediately before commit.

## Residual Risks

- Project-wide artifact revision authority remains undefined. Duplicate records without explicit authority remain blocked or warned rather than automatically reconciled.
- Existing WC08-REPAIR02 and WC08-REPAIR03 validation evidence still lacks a final durable Architect validation disposition record; the UI reports that state as pending rather than inventing acceptance.
- A Route Review Request is a durable concern record, not a route decision. Architect review is still required.
- Visual layout, usability, request submission, and saved-artifact inspection require Operator validation after Architect authorization.
- The broad legacy fixture remains blocked by an unrelated Phase 01 checked-in Markdown/render mismatch.

## Blocking Questions

None for this Implementer pass.

## Recommended Next Implementer Task

No additional Implementer task should begin yet. The Architect owns review of this Implementer Report and the source changes. If the Architect authorizes Operator validation, the Operator owns the 18 item-level checks above. The Architect then reviews the resulting validation report and decides whether WC08 is resolved or another exact-scope repair is required. WC09 remains blocked until that decision.
