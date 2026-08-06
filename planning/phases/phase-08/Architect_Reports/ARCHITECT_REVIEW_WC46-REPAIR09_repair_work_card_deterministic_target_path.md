# Architect Review — WC46-REPAIR09 Repair Work Card Deterministic Target Path

Document.Status=RevisionRequested  
Review revision: 2  
Reviewed artifact: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR09_repair_work_card_deterministic_target_path.md`  
Reviewed Work Card: `planning/phases/phase-08/Work_Cards/WC46-REPAIR09_repair_work_card_deterministic_target_path.md` revision 4

## Disposition

RevisionRequested.

WC46-REPAIR09 has valid partial implementation, but it does not yet satisfy the full repair contract after Operator visual validation and repository review.

## Repository Verification

Repository reviewed through ChampCity MCP workspace `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`.

The working tree remains dirty from the active WC46 repair series. No Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag was performed during this review.

## Inputs Reviewed

- Approved Work Card revision 4: `planning/phases/phase-08/Work_Cards/WC46-REPAIR09_repair_work_card_deterministic_target_path.md`
- Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR09_repair_work_card_deterministic_target_path.md`
- Operator visual validation screenshots showing the Repair workspace and approved tabbed document-viewer pattern.
- Production path excerpts in:
  - `src/main/workCardRepair/workCardRepairService.ts`
  - `src/main/workCardLoop/workCardLoopAuthorityService.ts`
  - `src/main/workCardBuilding/workCardBuildingReviewService.ts`
  - `src/main/workCardBuilding/codexImplementerExecutionService.ts`
  - `src/main/architectOutputs/architectOutputWorkspaceService.ts`
  - `src/main/currentWorkflow/currentWorkflowService.ts`
  - `src/renderer/app/App.tsx`
  - `src/renderer/app/WorkCardRepairWorkspace.tsx`

## Passing Findings

### P-01 — Deterministic Repair Work Card target path implemented

`createRepairWorkCard(...)` now uses deterministic repair target paths such as:

```text
planning/phases/{phaseId}/Work_Cards/{repairId}.md
```

The prior defect-text slug behavior is removed from new repair target creation. The full defect text remains evidence and prompt content rather than filename authority.

### P-02 — Legacy defect-slug handoff handling exists

The implementation added bounded handling for legacy defect-slug Repair Architect handoffs. Existing attached outputs or active drafts are preserved; unattached legacy handoffs can be normalized to deterministic targets; conflicts surface rather than silently choosing competing authority.

### P-03 — Repair Work Card review authority was reconnected

The Repair workspace now receives a review panel path through `App.tsx`, and `reviewArchitectOutput(...)` applies `work-card-repair` approvals through Architect-output authority. Approval can create the repair-specific Implementer Report through `buildApprovedRepairWorkCardAndReportDocuments(...)`.

### P-04 — Codex Implementer execution service change is warranted

The prior review treated `src/main/workCardBuilding/codexImplementerExecutionService.ts` as an unauthorized-surface problem. That classification was incomplete.

After reviewing the production path, this change is warranted. Repair implementation needs Codex to receive the approved Repair Work Card as the implementation contract and the repair-specific Implementer Report target. The service changes are acceptable only when limited to contract type, contract label, repair contract path, and repair report target in the implementer prompt/session context. WC46-REPAIR09 revision 4 now explicitly authorizes that file for this bounded purpose.

This is not a blocking defect by itself.

## Blocking Findings

### B-01 — Repair workspace review UI is stacked and unreadable instead of using the approved tabbed document-viewer model

Operator visual validation shows the Repair workspace stacking repair status, repair evidence, promoted Repair Work Card preview, and disposition controls vertically in one long page. This is not the approved UI model and is not usable for review.

The approved product pattern is the tabbed document-viewer approach already visible in the Project Profile / Project Roadmap workspace: document tabs, one readable document viewport, and a disposition panel below the selected document.

The Repair workspace must use the same model:

```text
Repair workspace document viewer
→ tab row
   - Validation Record
   - Implementer Report
   - Formal Work Card
   - Repair Work Card, when promoted
→ one selected document body visible at a time
→ compact status metadata
→ disposition panel below the selected Repair Work Card when applicable
```

The current implementation adds review controls but does so by stacking components, which fails the Operator-visible outcome and violates WC46-REPAIR09 revision 4 Acceptance Criteria 6 through 10.

### B-02 — Approved repair implementation does not complete the Build → Review & Validation transition

`repairLoopAuthority(...)` routes an Approved Repair Work Card to `work-card-building-review`, but the repair branch must also route a ready repair-specific Implementer Report to `work-card-report-review`.

The implementation currently proves the beginning of the repair implementation path:

```text
Approved Repair Work Card
→ work-card-building-review
→ IMPLEMENTER_REPORT_{repairId}.md
```

It does not yet prove the full required sequence:

```text
Approved Repair Work Card
→ work-card-building-review while repair report is missing/scaffolded/incomplete
→ work-card-report-review once repair-specific Implementer Report is ready-for-review
```

The existing `activeLoopAuthorityForCandidate(...)` formal path already performs this distinction for non-repair Work Cards. The repair branch must apply the same readiness distinction to the repair-specific report without falling back to the original parent Work Card validation evidence or looping indefinitely in Build.

This violates WC46-REPAIR09 revision 4 Acceptance Criteria 12 and 13.

## Required Revision

The implementer must repair the current WC46-REPAIR09 implementation so that:

1. The Repair workspace uses a tabbed document viewer, not stacked evidence/status/review panels.
2. The Repair Work Card tab is selected by default when a Repair Work Card is Pending or RevisionRequested.
3. Only one document body is visible in the main Repair document viewer at a time.
4. Repair Work Card disposition continues to use Architect-output review authority and stale presented-revision protection.
5. Approved Repair Work Card routes to Implement while the repair-specific report is missing/scaffolded/incomplete.
6. Ready repair-specific Implementer Report routes to Review & Validation.
7. Codex execution changes remain limited to repair contract label/path and repair-specific report target support.
8. Non-repair Formal Work Card implementation behavior remains unchanged.

## Validation Notes

I did not rerun commands. Implementer-reported validation results are treated as reported evidence only.

No Git mutation was performed during Architect review.

## Final Disposition

RevisionRequested.
