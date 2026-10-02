# RWS05 — Architect Workspace Family Refactor Bundle

**Status:** IMPLEMENTER_READY
**Baseline:** `dev` at `ac03b39c8cef6145cfd7caf3aa2fd39170939a4e`
**Execution mode:** sequential bundle; Architect review after the full bundle, not after each card.

## Objective

Continue the renderer/Structured Project State refactor horizontally by workspace family.

RWS01–RWS04 completed the Intake family:

`Intake UI -> SQL WorkflowIntake -> generated Markdown review projection -> SQL Decision`

RWS05 applies the same architecture to the Architect work family:

- Greenfield Architect Interview is the UI/interaction reference.
- Extract that workspace from `App.tsx` into a reusable shell.
- Rebuild Feature Assessment and Issue RCA on that shell.
- Add Architect Assessment adapters for Refactor/Migration, Integration/Composition, Infrastructure/Platform, and Research/Prototype.
- Make Structured Project State authoritative for Architect outputs.
- Generated Markdown is a readable Operator review projection only.
- Operator disposition is Structured Project State.
- App.tsx returns toward routing/composition rather than implementing workspace behavior.

## Bundle cards

1. RWS05A — Extract Architect Workspace Shell and repair structured Intake recovery.
2. RWS05B — Add Structured Architect Review Cycle foundation and projection contract.
3. RWS05C — Cut Greenfield Architect Interview over to Structured Project State.
4. RWS05D — Port Feature Assessment and Issue RCA to the shared shell/review-cycle model.
5. RWS05E — Add Architect Assessment adapters for Migration, Integration, Infrastructure, and Research.
6. RWS05F — Retire legacy Architect-family authority paths, reduce App.tsx ownership, and qualify the family.

## Sequential execution rule

The Implementer may execute RWS05A through RWS05F without waiting for Architect review between cards.

Each card still receives its own checkpoint commit and Implementer Report so the final review can isolate regressions by boundary.

Stop the bundle only for:

- an explicit card stop condition;
- a discovered architecture conflict that would require dual authority or weakening a Structured Project State invariant;
- inability to preserve exact Workflow identity;
- inability to represent required semantic content in Structured Project State without parsing generated Markdown back into authority;
- a directly attributable production/build failure that cannot be bounded to the current card.

Do not stop merely because unrelated repository tests already fail.

## Cross-card architecture rules

1. SQL semantic records are authoritative.
2. Generated Markdown never becomes an input to recover current semantic state.
3. Legacy Markdown may be migration evidence only.
4. Do not parse free-form legacy Architect output Markdown into canonical semantic records. If no trustworthy structured migration exists, preserve the legacy file as historical evidence and require a new Architect cycle.
5. A review grouping/version anchor may exist, but it must not duplicate the semantic content held by Findings, Root Causes, Bounded Solutions, Criteria, Evidence, and Decisions.
6. Operator review must govern an exact current Architect review revision.
7. ChatGPT remains the right-hand companion for Architect workspaces.
8. The left side is the Architect work/review surface.
9. Workflow-specific semantics come through adapters, not bespoke page layouts.
10. Work Intake Routing is excluded.
11. `project_state_authority` remains the final project-wide legacy-writer cutoff and is not advanced by this family migration.
12. The Intake family accepted in RWS04C is not redesigned.

## Review boundary

After RWS05F, return the entire RWS05 checkpoint sequence for one Architect review and then Operator visual validation.

Do not begin the Planning workspace-family refactor until the RWS05 bundle is accepted.
