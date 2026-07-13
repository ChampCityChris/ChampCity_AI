# Architect Review: WC04-REPAIR03 Validation Target Context and Panel Simplification

Status: Ready for Operator Validation
Project: ChampCity A/I
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Repair Work Card: WC04-REPAIR03 — Validation Target Context and Panel Simplification
Parent Work Card: WC04 — Primary Current Action Panel
Review date: 2026-07-12
Reviewed by: Architect

## Reviewed Branch

- Branch: `feature/phase-03-wc04-repair03-validation-target-context`
- Base branch reported by Implementer: `feature/phase-03-wc04-repair02-routing-gate`
- Merge to `dev`: not performed
- Changes to `master`: none

## Reviewed Implementer Report

- `planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC04-REPAIR03_validation_target_context_and_panel_simplification.md`

## Source Validation Failure

WC04-REPAIR03 was created after WC04-REPAIR01 validation recorded:

- `Validation Result: Partial`
- `Operator Decision: Failed - repair needed`

Validated failures addressed by this repair were:

- Human Validation opened to the repair workflow but selected WC01 instead of WC04-REPAIR01.
- Prior Work Cards showed as not validated even when durable reports existed.
- Checklist guidance did not reliably use Architect guidance.
- Right-side context panel duplicated the left-side current-action panel.
- Screenshot evidence display was too verbose and path-heavy.
- Supporting-screen navigation was redundant/confusing.

## Review Outcome

WC04-REPAIR03 is ready for Operator validation.

No further repair is required before Operator validation.

## Scope Review

The Implementer Report states the repair was limited to validation target selection, validation status/report context, checklist guidance precedence, right-panel simplification, screenshot evidence display, and supporting-screen navigation simplification.

The report also states WC05-WC15 were not implemented and the live current-action route remains `WC04-REPAIR01 / repair_validation_required`, not WC05.

This matches the WC04-REPAIR03 scope.

## Files Reported By Implementer

Created:

- `scripts/verify-wc04-repair03.mjs`
- `planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC04-REPAIR03_validation_target_context_and_panel_simplification.md`

Modified:

- `src/shared/workCards/validationTarget.ts`
- `src/shared/workCards/validationRecord.ts`
- `src/main/workCards/workCardFileStore.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/WorkflowRouterShell.tsx`

Not created or modified:

- no WC05-WC15 Work Card, UI, route-specific behavior, or planning artifact
- no Operator validation record or Human Validation acceptance record
- no WC02 current-action evaluator change
- no dependency, provider SDK, database, cloud, auth, connector, deployment, or unrestricted renderer filesystem access

## Technical Review

### Pass: route-driven validation target selection

The Implementer Report states that Human Validation now receives the durable routed Work Card ID when the current action belongs to the selected phase, is Operator-owned, and has `needs_validation` status. The route is resolved generically to a matching validation target file.

For the current durable repair route, `WC04-REPAIR01` resolves to `WC04-REPAIR01_validation_flow_and_current_action_panel_usability.json` instead of falling back to WC01.

This addresses the primary validation-target selection failure.

### Pass: manual target selection is preserved

The report states that route alignment is applied once per route key and later manual selection is not overwritten. The focused fixture confirms initial WC04 repair routing selects WC04-REPAIR01 and later manual selection of WC02 remains selected.

This addresses the risk of making the app forcibly route every render and preserves Operator control.

### Pass: prior validation status/report context is improved

The report states that durable validation-report loading now recognizes both current validation records and the older Phase 03 snake-case validation record shape. It reports effective status, raw result, Operator decision, JSON/Markdown report names, and timestamp.

The report also states that deferred, failed, partial, blocked, passed, and not-yet-validated states remain distinct.

This addresses the prior-target context failure.

### Pass: checklist source precedence is clarified

The report states the checklist source order is now:

1. exact or repair-chain-related durable Architect Review guidance
2. selected repair/Work Card acceptance criteria or validation expectations
3. parent Work Card acceptance criteria or validation expectations
4. selected Implementer Report manual validation section

The report also states the UI labels fallback sources explicitly when durable Architect guidance is missing.

This sufficiently addresses the checklist guidance problem for Operator validation.

### Pass: right context panel simplification

The report states the right-side route/evidence context inspector is no longer rendered, returning space to the central artifact workspace and leaving the left panel as the route authority.

This addresses the duplicate-panel failure. Operator validation should confirm the resulting layout still feels usable and does not remove needed context.

### Pass: screenshot evidence display simplified

The report states screenshot/file references now render as concise attachment cards showing filenames rather than full paths, with repo-relative paths moved into a collapsed editor. Clipboard paste and constrained file import remain available.

This addresses the screenshot evidence verbosity issue within the approved scope. A live image thumbnail was intentionally not added because that would require a separate safe renderer delivery mechanism.

## Validation Review

Reported validation passed:

- `node --check scripts/verify-wc04-repair03.mjs`
- `npm run validate:codex`
- `node scripts/verify-wc04-repair03.mjs`
- `node scripts/verify-work-card-fixture.mjs --current-action-only`
- `node scripts/verify-wc04-repair01.mjs`
- `git diff --check`

The report states the current-action fixture confirms the live route remains `WC04-REPAIR01 / repair_validation_required`, not WC05.

Reported skipped validation is acceptable: Operator visual/usability validation, Electron interactive startup, and screenshot-paste usability judgment remain Operator-owned.

## Residual Risks

- Screenshot evidence is displayed as filename cards, not live thumbnails. If the Operator requires image previews, that should become a separate approved repair or later Work Card because it requires a safe renderer file-serving/design path.
- The right context panel removal should be validated visually to ensure it improves clarity rather than simply removing useful evidence.
- Architect guidance selection depends on durable Architect Review artifacts referencing target IDs clearly.
- Some legacy validation status vocabulary may still be unsupported if future historical artifacts use different wording.
- Two unrelated untracked/generated paths remain outside this repair scope and should not be committed casually:
  - `planning/phases/phase-03/Repair_Prompts/REPAIR_PROMPT_WC04-REPAIR01_validation_flow_and_current_action_panel_usability.md`
  - `planning/phases/phase-03/Validation_Evidence/WC01_superseded_phase_03_artifact_and_roadmap_state_reconciliation/image.png`

## Operator Validation Guidance

Operator validation should focus on these items:

1. Current WC04 repair route opens Human Validation with WC04-REPAIR01 selected.
2. A later manual target choice remains selected and is not overwritten by rerendering.
3. Prior targets show effective/raw status, Operator decision, report filename, and timestamp context where available.
4. Durable WC04-REPAIR02 Architect guidance is shown for the current target.
5. Fallback guidance is clearly labeled when durable Architect guidance is absent.
6. The right context panel is absent or no longer duplicates the left current-action panel.
7. Screenshot paste/import and concise evidence cards are usable.
8. `More tools`, the process rail, and the primary action button retain expected screen reachability.
9. Current-action routing remains on WC04-REPAIR01 repair validation and does not advance to WC05.
10. WC05-WC15 behavior has not been implemented prematurely.

## Decision

Ready for Operator validation.

No additional repair is required before Operator validation.

## Recommended Next Action

Operator validates WC04-REPAIR03 from `feature/phase-03-wc04-repair03-validation-target-context`.

If passed, record the validation report and then merge the validated WC04 repair chain forward according to the approved branch workflow. If failed, create the next repair card from the specific failed validation evidence.
