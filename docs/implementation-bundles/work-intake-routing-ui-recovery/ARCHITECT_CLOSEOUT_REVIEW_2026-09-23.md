# Architect Closeout Review — WIR UI Recovery — 2026-09-23

**Scope:** Review the committed WIR UI recovery implementation on `dev`, Implementer Reports WIR-UX01 through WIR-UX07, final recovery report, and the architecture boundaries required before integrating the Source-Control Lifecycle architecture branch.

## Executive Assessment

The WIR UI recovery achieved the architectural correction it was intended to make.

The prior renderer defect — one nested lifecycle monolith under Work Intake — has been removed. The recovered UI now presents stage/work-item task workspaces while leaving lifecycle eligibility and transitions with backend owners.

No new broad WIR UI repair package is warranted.

The remaining issues divide into three categories:

1. one known source-control admission defect already owned by the Source-Control Lifecycle package;
2. one concrete recovery-closeout housekeeping defect that should be corrected independently;
3. small governance/transitional UX debt that should be absorbed into Structured Project State rather than trigger another WIR redesign.

## Evidence Reviewed

Committed recovery chain on `dev`:

- `26e5618` — WIR-UX01
- `2c97abe` — WIR-UX02
- `1f50469` — WIR-UX03
- `012d673` — WIR-UX04A
- `a181f5a` — WIR-UX04B
- `135d464` — WIR-UX05A
- `4d2b257` — WIR-UX05B
- `e358a02` — WIR-UX06
- `1bfefc3` — WIR-UX07/final qualification

Every Implementer Report is present in its corresponding commit. WIR-UX07 also commits the final recovery report.

Code reviewed includes the Work Intake navigation projection/rail, App routed-stage composition, routed planning/execution workspaces, routed Issue bridge/return path, routed Integration workspace, Integration Repair isolated Implementer owner, route decision service, and current repository state.

## Architecture Findings

### A. Routed navigation is presentation, not authority — PASS

`workIntakeNavigationService` derives stage availability/required stage from existing Work Intake, route, planning and execution owners.

`WorkIntakeNavigationProjection` is explicitly read-only and non-persisted.

The renderer may choose among already-available stages, but it does not create route/Plan/execution eligibility.

This corrects the original nested-panel architecture without creating a second workflow state machine.

### B. Architect workspaces reuse the embedded Architect surface — PASS

Routing, Architect Assessment, Plan, Work Item Planning, decomposition and Repair reuse the shared document/chat shell and the existing embedded Architect browser.

No second browser/runtime owner was introduced.

### C. Issue route reuses Issue Resolution — PASS

The obsolete routed `WorkIssuePanel` is deleted.

The Work Intake Issue path opens/reuses the existing Issue Resolution workflow and preserves routed lineage for return/reroute.

No second RCA/Fix/validation/close implementation remains under Work Intake.

### D. Work Item execution is decomposed into task workspaces — PASS

The obsolete `RoutedExecutionPanel` is deleted.

Execution now has separate Map, Planning, Implement, Review & Validation, Repair, Close / Next and Acceptance presentations.

The backend still determines `nextWorkItemId`, eligibility and actions; renderer selection is primarily inspection/navigation.

### E. Integration Repair is application-bounded and agent-safe — PASS

The manual JSON patch transfer UX is gone.

The Integration Repair Implementer:

- receives only declared editable source in a Git-less temp directory;
- verifies prepared source hashes before execution;
- rejects undeclared paths and symlinks;
- does not expose the integration candidate checkout/Git administration;
- converts changed bytes back to bounded patches;
- delegates application/commit/validation back to ChampCity;
- removes the owned temp root after completion/cancellation/failure.

This preserves the rule that the agent edits source while ChampCity owns Git transitions.

### F. Recovery reports align with committed source — PASS WITH ONE EXCEPTION

The commit chain contains the reported implementation artifacts and report files.

One WIR-UX07 claim is false in the current repository state:

> screenshots remain ignored local output

The current `.gitignore` has no `output/playwright/` rule, and Git reports the screenshots as untracked.

This is a concrete recovery-closeout defect because the current Work Intake cleanliness gate treats those generated screenshots as dirty repository state.

Required correction: generated Playwright visual evidence must be placed under an actually ignored path or the intended path must be added to `.gitignore`.

This does not require redesign of WIR UI.

## Known Defect Already Owned Elsewhere

### Dirty checkout blocks Work Intake capture

Current Work Intake projection/service still converts any non-empty local status — including unrelated untracked files — into:

`Commit or resolve existing changes before starting another Work Intake.`

This remains the direct blocker observed during Operator validation.

It is not a WIR UI recovery regression. It is the source-control authority leak already documented and owned by SCL02 after Structured Project State is installed.

Do not create a second WIR repair implementation for this behavior.

## Additional Governance / UX Debt

### Route acceptance unnecessarily requires Operator prose

`workRouteDecisionService.validateDecision()` requires non-empty `rationale` for accept, override and revision request, and the recovered Routing UI therefore disables `Accept Recommendation` until the Operator types text.

The adopted routing architecture reserves route choice to the Operator but does not require the Operator to justify a simple acceptance of the current Architect recommendation.

This is unnecessary bureaucracy, not a useful authority invariant.

Disposition:

- do not reopen the WIR UI package;
- SCL01J now explicitly requires simple acceptance to work without mandatory free-text rationale while still recording deterministic Decision rationale/history.

A tiny pre-SCL hotfix remains optional if Operator dogfooding needs this behavior sooner.

### Acceptance still exposes repository-relative evidence paths

`RoutedAcceptanceWorkspace` requires manual repository-relative evidence-path entry.

This matches the WIR-UX05B card as written, so it is not an Implementer deviation.

It is nevertheless transitional machinery leakage and should disappear when Evidence becomes first-class Structured Project State.

Disposition:

- SCL01K now requires semantic Evidence selection/capture;
- SCL01X explicitly replaces manual evidence-path entry during routed workflow state migration.

Do not build another V1 evidence subsystem solely to hide these paths.

### Minor non-blocking UI polish

- Work Intake rail uses a lock glyph for inactive stages even when their status text says `Available`.
- Work Item Map copy says “Choose an eligible Work Item” although execution is intentionally constrained to the deterministic `nextWorkItemId`; other selections are useful for inspection/decomposition.

These are presentation polish issues, not workflow/authority defects. They do not justify delaying source-control/state migration.

## Final Recovery Evidence Limits

The final WIR-UX07 report correctly limits its claims:

- visual fixture coverage exists at 1280×720 and 1440×900;
- embedded Architect/model response quality was not exercised live;
- live Codex behavior was not proven by synthetic visual fixture projection;
- validation Repair did not receive a final running-app screenshot after the CDP target stopped responding.

Those are appropriate Operator-dogfooding items, not architectural blockers.

## Merge Assessment for Source-Control Lifecycle Branch

Current branch relation:

- `dev`: `1bfefc336061264726bfd5d2c0c814651668fdbf`
- `architecture/agent-free-source-control-lifecycle`: reviewed from `fa0cf9916923b23000da6fbd6ea8a96ab93384c9` plus this closeout update
- common base before the final WIR cards: `4d2b2575362e0a81a975d82da104014ed016c237`

An isolated merge rehearsal of `fa0cf991...` into current `dev` produced a clean candidate with no conflicting paths. The rehearsal was aborted after inspection and did not alter `dev`.

The Source-Control Lifecycle branch changes architecture/package documentation, not the recovered WIR runtime surfaces modified by WIR-UX06/07.

## Recommendation

Proceed with integrating the Source-Control Lifecycle architecture branch into `dev`.

Before expecting the current V1 Work Intake Save button to become usable from a dirty checkout, separately resolve the repository housekeeping state:

- generated Playwright output should be truly ignored;
- intentional untracked architecture/planning documents should be deliberately committed, archived, moved, or removed rather than left as accidental working-tree state.

Do not hold the architecture merge for additional broad WIR UI repairs.

The first substantive implementation work after integration should follow the package order already adopted:

`SCL01 → SCL01A … SCL01Z → SCL02 …`

The known Git admission defect and the two transitional governance/evidence debts above are already captured in that architecture.
