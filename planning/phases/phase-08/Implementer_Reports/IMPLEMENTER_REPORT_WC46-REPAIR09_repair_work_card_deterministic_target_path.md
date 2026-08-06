# Implementer Report - WC46-REPAIR09 Repair Work Card Deterministic Target Path

Pass type: numbered Work Card repair
Repository path inspected: verified approved repo root (`<PROJECT_REPO>`)
Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`
Remote: `origin` / `https://github.com/ChampCityChris/ChampCity_AI.git`
Working status: dirty before this pass from the active WC46 repair series; dirty after this pass with no Git mutation.
Git mutation: not performed. The approved Work Card prohibits staging, commit, push, checkout, pull, rebase, merge, stash, reset, clean, and tag.

## Files Created

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR09_repair_work_card_deterministic_target_path.md`

## Files Modified

- `src/main/workCardLoop/workCardLoopAuthorityService.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/WorkCardRepairWorkspace.tsx`
- `src/renderer/styles.css`
- `test/work-card-loop/work-card-loop-authority-service.test.cjs`
- `test/renderer/work-card-repair-workspace.test.cjs`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR09_repair_work_card_deterministic_target_path.md`

Other WC46 repair-series files were already dirty before this pass and were not intentionally reverted.

## Files Intentionally Not Created

- No JSON sidecar, route token, hidden repair state, completion marker, alternate repair artifact, advisory-review artifact, migration, dependency, or package-script helper.
- No Git commit, tag, branch, staged change, stash, merge, rebase, pull, push, reset, clean, or checkout.

## Implementation Summary

This pass completed the missing WC46-REPAIR09 behavior on top of existing partial repair-series work.

The Work Card loop now routes an Approved Repair Work Card to `work-card-building-review` only while the repair-specific Implementer Report is missing, scaffolded, invalid, or conflicting. Once the deterministic repair report target is fresh and ready for review, the same repair authority routes to `work-card-report-review` / Review & Validation. The route preserves:

- `parentWorkCardId` as the original Work Card under repair.
- `repairId` as the approved Repair Work Card identity.
- the approved Repair Work Card path as `formalWorkCardPath` / implementation contract path for the existing Implement projection.
- `planning/phases/{phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_{repairId}.md` as the repair-specific report target.

The Repair workspace now uses one tabbed document viewer instead of stacking evidence, status, Repair Work Card preview, and review controls as separate panels. The tabs include Validation Record, Implementer Report, Formal Work Card, and Repair Work Card when a promoted Repair Work Card exists. Before promotion, the primary evidence tab is selected by default. When a promoted Repair Work Card is Pending or RevisionRequested, the Repair Work Card tab is selected by default. Operator tab changes are local UI state and do not discard review notes.

The Repair Work Card review controls remain visually below the selected Repair Work Card document. App wiring selects the repair Architect-output slot, marks the current presented revision as viewed, and keeps approval/revision actions on `reviewArchitectOutput("work-card-repair", ...)` with the existing stale presented-revision guard. Generic document disposition remains blocked for `work-card-repair`.

Existing deterministic target behavior remains intact:

```text
planning/phases/{phaseId}/Work_Cards/{repairId}.md
```

The full defect text remains preserved as evidence and prompt/body content, not filename authority. Existing tests still cover Validation Record evidence, Repair Architect handoff `workflowData.boundedDefect`, prepared prompt content, promoted Repair Work Card metadata/body authority, safe legacy target preservation, and safe unattached legacy handoff normalization.

Non-repair Work Card implementation behavior remains unchanged by this pass. Repair-specific Codex prompt/session context remains limited to contract type, contract label/path, and repair-specific report target support already present in the authorized files.

## Acceptance Criteria Evidence

- AC1-AC5: `test/work-card-repair/work-card-repair-service.test.cjs` verifies deterministic `{repairId}.md` targets, no defect-text filename slug, full evidence preservation in repair prompt inputs, safe unattached legacy handoff normalization, and preservation of attached legacy targets/drafts.
- AC6-AC10: `test/renderer/work-card-repair-workspace.test.cjs` verifies a dedicated Repair workspace with tabbed repair documents, the Repair Work Card tab, one selected document viewport, compact metadata/status, and no old stacked repair review panel.
- AC11 and AC14: `src/renderer/app/App.tsx` selects the Repair Work Card Architect-output slot and records its presented revision before displaying the disposition panel; `applyCurrentDisposition` continues to reject `work-card-repair`, so review uses Architect-output authority.
- AC12 and AC18: `test/work-card-loop/work-card-loop-authority-service.test.cjs` verifies Approved Repair Work Card routes to Implement while the repair report is not ready and does not skip to Validation, Close, or Work Card Map.
- AC13: a new focused loop test verifies a ready repair Implementer Report routes the repair to Review & Validation.
- AC15-AC17: `test/work-card-building/work-card-building-review-service.test.cjs` and `test/work-card-building/codex-implementer-execution-service.test.cjs` verify repair contracts are labeled as approved Repair Work Card contracts, use the repair Work Card path, and target `IMPLEMENTER_REPORT_{repairId}.md` without changing formal Work Card behavior.
- AC19: focused building and Codex tests passed for formal Work Card behavior.
- AC20: typecheck, TypeScript build, renderer build, focused tests, and full test lane passed in the documented validation lanes.
- AC21: no dependency was added.
- AC22: no Git mutation occurred.

## Commands Run and Results

- `pwd` from `<PROJECT_REPO>`: exit 0; verified approved repo root.
- `git status --short --branch`: exit 0; branch verified, working tree dirty before and after the pass.
- `Get-Content -Raw docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`: exit 0; repository boundary read.
- `Get-Content -Raw docs/dev/VALIDATION_COMMAND_LANES.md`: exit 0; validation lane read.
- `Get-Content -Raw planning/phases/phase-08/Work_Cards/WC46-REPAIR09_repair_work_card_deterministic_target_path.md`: exit 0; approved Work Card read.
- `Get-Content -Raw docs/governance/EXECUTION_PASS_PROTOCOL.md`: exit 1; file absent. Not treated as blocker because the repository boundary supersedes those deleted legacy references for Phase 07/08.
- `Get-Content -Raw docs/governance/IMPLEMENTER_LITERAL_COMPLIANCE_PROTOCOL.md`: exit 1; same superseded legacy reference.
- `Get-Content -Raw docs/governance/INDEPENDENT_VALIDATION_PROTOCOL.md`: exit 1; same superseded legacy reference.
- `npx tsc --noEmit`: exit 0 before and after the final label adjustment; typecheck passed.
- `npx tsc`: exit 0 before and after the final label adjustment; TypeScript build passed.
- `node --test --test-concurrency=1 test/work-card-repair/work-card-repair-service.test.cjs test/work-card-loop/work-card-loop-authority-service.test.cjs test/renderer/work-card-repair-workspace.test.cjs test/work-card-building/work-card-building-review-service.test.cjs test/work-card-building/codex-implementer-execution-service.test.cjs` in sandbox lane: exit 1 with documented `spawn EPERM`; rerun once in normal Windows lane.
- Focused Node test lane in normal Windows lane: first run exit 1; 27 passed and 1 renderer source assertion failed because the visible `Repair Defect` label had been removed during compaction.
- Focused Node test lane in normal Windows lane after correction: exit 0; 28 tests passed.
- `npx vite build` in sandbox lane: exit 1 with documented esbuild `spawn EPERM`; rerun once in normal Windows lane.
- `npx vite build` in normal Windows lane: exit 0; renderer bundle built, 1621 modules transformed.
- `node --test --test-concurrency=1 --test-reporter=dot` in normal Windows lane: exit 0; full suite passed with dot reporter output.
- `rg -n "C:\\Users|[A-Za-z]:\\|api[_-]?key|token|secret|\\.env|BEGIN (RSA|OPENSSH|PRIVATE)" ...`: exit 0 only for policy words in this report and an existing source comment; no secret or concrete local path finding in the touched scope.
- Final `git status --short --branch`: exit 0; no Git mutation performed.

## Validation Skipped

- `npm run typecheck`, `npm run build`, and `npm test`: skipped because `docs/dev/VALIDATION_COMMAND_LANES.md` says direct Lane 1 commands are authoritative until stale package scripts are repaired.
- Electron launch smoke: not performed; this Work Card leaves visual/manual acceptance to the Operator and does not grant Implementer acceptance authority.
- Live embedded ChatGPT prompt send, draft creation, and remote artifact behavior: not performed; those are Operator-observed validation steps.
- Git staged diff, commit review, commit, and push: skipped because Git mutation is explicitly prohibited.

## Security and Secret Safety

No secrets, credentials, API keys, `.env` contents, private endpoints, build artifacts, screenshots, archives, or concrete local machine paths were intentionally added. Durable artifact text uses `<PROJECT_REPO>` and repo-relative paths. Renderer changes continue through existing typed main/preload IPC and do not introduce unrestricted filesystem access.

## Manual Validation Required

Operator should validate in the running application after Architect review:

1. Request Repair from Review & Validation with a long repair defect text.
2. Prepare the Repair Work Card prompt.
3. Confirm the Repair Target path is short and deterministic, ending in `{repairId}.md`.
4. Confirm the full defect text remains visible in the Validation Record and Repair prompt.
5. Create and promote the Repair Work Card draft.
6. Confirm the Repair workspace uses tabs for Validation Record, Implementer Report, Formal Work Card, and Repair Work Card.
7. Confirm only one readable selected document body appears at a time.
8. Confirm the Repair Work Card tab is selected for review once the Repair Work Card exists.
9. Approve the Repair Work Card.
10. Confirm the app routes to Implement and shows the approved Repair Work Card as the implementation contract.
11. Confirm the repair Implementer Report target is repair-specific and does not overwrite the original parent Work Card report.
12. After a ready repair Implementer Report exists, confirm the app routes to Review & Validation.

## Residual Risks

Automated validation passed, but it cannot prove live embedded ChatGPT behavior, actual Operator visual judgment, or final workflow acceptance. The working tree remains dirty from the broader WC46 repair series; this pass did not stage, commit, push, or revert unrelated changes.

## Blocking Questions

None.

## Recommended Next Implementer Task

After Architect review and Operator manual validation, repair any live-workflow issue observed in the running application under a separate approved Work Card or repair card.

Document.Status=Pending
