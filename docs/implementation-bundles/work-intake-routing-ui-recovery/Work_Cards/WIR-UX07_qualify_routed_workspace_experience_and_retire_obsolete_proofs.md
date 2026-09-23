# WIR-UX07 — Qualify Routed Workspace Experience and Retire Obsolete Renderer Proofs

**Status:** IMPLEMENTER_READY  
**Depends on:** WIR-UX01 through WIR-UX06  
**Type:** UI qualification / permanent-proof cleanup

## Objective

Qualify the repaired routed experience end to end, retire tests that protect the rejected nested-panel composition, and leave one coherent permanent renderer proof set for the routed Workspace architecture.

## Governing invariant

The final proof must demonstrate usable task progression and reuse of established Workspace patterns, not merely the presence of service buttons or nested component names.

## Required test disposition

Review these existing owners:

- `test/renderer/research-routed-integration.test.cjs`
- route-decision renderer assertions in `test/architect-outputs/architect-output-workspace-repair.test.cjs`
- any new `work-intake-routed-workspaces.test.cjs` created by prior cards.

Remove or rewrite assertions whose only purpose is to require:

- `WorkPlanningPanel` nesting `RoutedExecutionPanel`;
- later lifecycle panels appearing in prior stages;
- obsolete component identities.

Do not retain duplicate tests after the new owner proves the same interaction contract.

## Permanent routed UI proof

The final routed renderer owner must cover at least these state transitions:

### Ordinary planned route

Intake
→ Routing with visible Architect
→ route decision
→ Architect Assessment with visible Architect
→ Plan with visible Architect
→ Work Item Map
→ Work Item Planning with visible Architect
→ Implement
→ Review & Validation
→ Repair when requested
→ Close / Next
→ Acceptance when required
→ Integration.

### Research terminal route

Assessment approval with no implementation Plan required
→ Integration directly.

No Plan/Work Item execution Workspace appears.

### Issue route

Routing decision
→ Open/Continue existing Issue Resolution
→ existing Issue rail/workspaces
→ return to Work Intake Integration.

No duplicate RCA/Fix Card renderer is present under Work Intake.

### Decomposition

Selected Work Item
→ contextual decomposition Architect Workspace
→ accepted proposal
→ return to Work Item Map with replacement/resume candidate.

### Integration Repair

Repair-required candidate
→ in-product Integration Repair Implementer
→ application-owned patch/commit/validation
or explicit Operator-decision state.

No raw JSON patch transfer.

## Running UI qualification

Launch the current application and exercise representative fixtures/current Work Intake at minimum:

- 1280×720;
- normal development viewport.

Inspect:

- task hierarchy;
- embedded Architect visibility;
- action labels;
- stage navigation;
- long Intake/request text;
- long document body;
- unavailable/blocked state;
- revision request;
- running Implementer;
- validation Repair;
- integration repair-required state.

Capture screenshots or equivalent visual evidence for Architect/Operator review. If automated screenshot capture is unavailable, report the exact gap and perform the available running UI inspection; do not claim visual qualification from unit tests alone.

## Accessibility/interaction checks

Verify:

- keyboard reachable actions;
- no hidden primary action on hover;
- disabled actions explain blockers;
- no horizontal scroll at 1280×720 for core task controls;
- document and browser panes have clear scroll ownership;
- technical IDs/paths are secondary to task labels;
- no raw internal enum is the only user-facing status.

## Final validation

Run:

- final routed renderer owner;
- affected Issue renderer owners;
- affected Work Card presentation owners;
- Codex focused owners changed by Integration Repair;
- capability-map owner if test inventory changed;
- appropriate affected-capability validation profile.

Broad full-regression is not required solely because this is UI recovery unless the repository validation planner selects it.

## Completion report

Create:

`docs/implementation-bundles/work-intake-routing-ui-recovery/FINAL_UI_UX_RECOVERY_REPORT.md`

Include:

- components retired;
- shared patterns reused;
- before/after workflow map;
- permanent tests retained/rewritten/retired;
- focused validation results;
- visual evidence conditions;
- remaining known UI debt;
- whether Work Intake Routing is ready for Operator dogfooding.
