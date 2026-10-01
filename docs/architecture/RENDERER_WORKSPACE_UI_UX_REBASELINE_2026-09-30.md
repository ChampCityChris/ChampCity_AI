# Renderer Workspace UI/UX Re-Baseline — 2026-09-30

**Status:** ACTIVE ARCHITECT/OPERATOR UI REVIEW BOUNDARY

## Operator direction

The Greenfield Project workflow UI/UX is the current reference design for reusable workflow workspaces.

The existence of a renderer component, passing automated renderer tests, a prior synthetic screenshot qualification, or an Architect code-review pass does **not** establish Operator UI/UX approval.

Current routed/exact-Workflow renderer surfaces created outside the Greenfield-derived workspace design are therefore **provisional and require review/rebuild under reusable workspace shells**.

This document supersedes any interpretation of prior WIR UI recovery or WRB03/WRB04 qualification reports as final Operator approval of their visual/workspace composition. Historical reports remain valid evidence of the behavior they proved at the time.

## Reference UI/UX contract

The Greenfield workflow establishes the visual/workspace pattern to preserve and extract into reusable building blocks:

- top workflow/action/progress rail;
- stable workspace framing and navigation;
- left task/document/form column;
- right embedded ChatGPT/Architect column where the stage uses an Architect;
- consistent column geometry, scrolling ownership, spacing, typography, field treatment, button hierarchy, feedback/error placement, and responsive behavior;
- workflow-specific semantics supplied as content/contracts, not by inventing a new page layout.

The goal is not to clone Greenfield domain semantics. The goal is to reuse the same workspace shells while each Workflow supplies its own intake questions, prompts, documents, dispositions, and stage-specific actions.

## Immediate shell program

The first extraction is the Intake Workspace family.

1. Extract the current Greenfield Project Intake composition from `App.tsx` into a reusable presentation shell without visual or behavioral redesign.
2. Move Greenfield Project Intake onto that shell and prove visual/functional parity.
3. Build Refactor / Migration Intake as the second consumer using Migration-specific typed intake fields and Architect prompt semantics.
4. Route `refactor-intake` to the new Migration Intake workspace instead of `WorkflowInstanceWorkspace`.
5. Keep `App.tsx` responsible primarily for application routing/composition rather than workspace implementation.

Expected later shell families include Architect Assessment, Plan, Phase/Work Item Map, Validation/Repair, and Close/Acceptance where common interaction patterns are established.

## Current renderer surfaces requiring UI/UX review

The following current components are **not Operator-approved UI references** and must be reviewed against the shell architecture before being treated as final product UX:

- `StructuredWorkRoutingWorkspace.tsx`;
- `FeaturePlanningWorkspace.tsx`;
- `IssueWorkflowPlanningWorkspace.tsx`;
- current Issue exact-Workflow planning/RCA/fix/validation/repair renderer surfaces created during WRB03/WRB04 and later UI recovery;
- `WorkflowExecutionWorkspace.tsx`;
- `WorkflowInstanceWorkspace.tsx` as a substantive Workflow fallback;
- WIR routed assessment/plan/work-item/integration presentations created in the UI recovery package;
- any other renderer workspace that independently composes its own one-column or ad-hoc layout instead of an approved shared workspace shell.

Backend/domain behavior proven by these implementations is not rejected by this disposition. The review target is their presentation composition, workspace interaction model, and whether they preserve the intended Greenfield-derived UI/UX.

## Issue Resolution correction

The current Issue renderer family must not be treated as approved merely because it replaced older Issue surfaces.

Operator direction is that the prior Issue UI had been built from the Greenfield UI/UX pattern and that later Issue work destroyed that presentation model. Issue UI must therefore be reviewed and rebuilt under the new shell system while preserving valid Issue domain/RCA/repair semantics.

## Architecture objective

This shell extraction is also a V2 migration enabler.

Desired renderer direction:

```text
App routing/composition
        ↓
shared workspace shells
        ↓
workflow-specific typed content/actions
        ↓
application-facing adapter
```

The reusable presentation layer should not depend unnecessarily on Electron-specific host mechanics. Electron and the future web portal should be able to provide application actions through adapters without redesigning each workspace.

## Approval boundary

Until rebuilt/reviewed under the shared shell architecture:

- automated tests prove behavior, not final UI/UX approval;
- historical synthetic screenshots prove rendered states, not Operator acceptance;
- current components may remain operational for dogfood/repair work but are provisional presentation;
- new Workflow front halves should not copy these provisional layouts as design precedent.

Greenfield-derived shell parity is the design precedent for the upcoming Refactor / Migration front half.


## RWS04C Intake activation

All seven substantive Workflow Intake families use exact WorkflowIntake SQL records and exact-record-version Operator Decisions. First access invokes the bounded RWS04B migration; ambiguous legacy sources remain unchanged with a precise blocker.

`Intake form -> SQL WorkflowIntake -> generated Markdown projection -> Operator review -> SQL Decision`

`Intake right pane = Markdown review projection`

`Architect workspaces right pane = embedded ChatGPT where applicable`

Save/review commits SQL before derived Markdown materialization. Materialization errors are reported separately and never reverse SQL. Generated Intake Markdown is rebuildable review output and excluded from legacy canonical discovery; manual file edits never update SQL. Greenfield preserves the familiar Intake path and form, and Architect preparation consumes approved structured Intake. Unsaved edits or a revised Intake disable continuation until the current revision is approved. The shared top stage rail and generic Intake shell remain unchanged.

Intake authority is independent of `project_state_authority`. The final project-wide structured marker remains deferred until every still-authoritative legacy family migrates; the global legacy writer fence is unchanged.

## RWS05 Architect family cutover � 2026-10-01

The seven substantive Workflow types now use:

`approved SQL WorkflowIntake -> Architect interaction -> semantic SQL records -> ArchitectReviewCycle -> generated Markdown review projection -> exact-version SQL Decision -> next-stage eligibility`

`ArchitectReviewCycle` holds exact Workflow/type/stage identity and the current semantic-member version digest. It is a grouping/version anchor, not a duplicate document entity. Typed model-authored JSON is bounded transport; proposed Findings, RootCauses, BoundedSolutions, Criteria and Evidence are persisted atomically before Operator disposition. Only human Operator Decisions govern an exact current cycle revision. Material semantic or source-Intake changes invalidate prior eligibility.

The shared ArchitectWorkspaceShell frames left review/actions and the right embedded ChatGPT companion. StructuredArchitectWorkspace owns review state; App retains exact-Workflow routing, Greenfield application rail status and browser-host mechanics. It no longer owns Interview recovery, draft promotion, canonical prompt freshness or review composition. Generated Architect Markdown is derived and rematerializable; it is excluded from canonical repository discovery and never parsed back into authority. Historical free-form Interview files are preserved and require a fresh structured cycle. Unambiguous accepted legacy Feature/Issue SQL sets adopt without recreating their records; ambiguous sets block.

Project Creation approval enables the existing Project Planning boundary; Feature approval enables existing Feature Planning; Issue RCA approval enables existing Correction Planning. Migration, Integration, Infrastructure and Research assessments exist, but their Planning stages remain Not Ready after approval. Registered Projects require SQL prerequisites; historical unregistered Planning-document utilities remain within the later-family infrastructure, outside current Architect Workflow authority. The project-wide `project_state_authority` cutoff and SQLite schema version are unchanged. Family-by-family migration continues with Planning only after Architect and Operator acceptance of RWS05.

Automated semantic/rendering proofs do not establish Operator visual acceptance. The bundle qualification report records the deterministic results and the single-pass visual validation target.

## RWS05 Architect family cutover - 2026-10-01

The seven substantive Workflow types now use:

`approved SQL WorkflowIntake -> Architect interaction -> semantic SQL records -> ArchitectReviewCycle -> generated Markdown review projection -> exact-version SQL Decision -> next-stage eligibility`

ArchitectReviewCycle holds exact Workflow/type/stage identity and the semantic-member version digest. It is a grouping/version anchor, not a duplicate document entity. Typed model-authored JSON is bounded transport; proposed Findings, RootCauses, BoundedSolutions, Criteria and Evidence persist atomically before Operator disposition. Human Operator Decisions govern an exact current cycle revision. Material semantic or source-Intake changes invalidate prior eligibility.

ArchitectWorkspaceShell frames left review/actions and right embedded ChatGPT. StructuredArchitectWorkspace owns review state; App retains exact-Workflow routing, Greenfield application rail status and browser-host mechanics. It no longer owns Interview recovery, draft promotion, canonical prompt freshness or review composition. Generated Architect Markdown is derived and rematerializable, excluded from canonical discovery and never parsed back into authority. Historical free-form Interview files are preserved and require a fresh structured cycle. Unambiguous accepted legacy Feature/Issue SQL sets adopt without recreating their records; ambiguous sets block.

Project Creation approval enables existing Project Planning; Feature approval enables existing Feature Planning; Issue RCA approval enables existing Correction Planning. Migration, Integration, Infrastructure and Research Planning stays Not Ready after assessment approval. Registered Projects require SQL prerequisites; historical unregistered Planning-document utilities remain in the later-family infrastructure, outside current Architect Workflow authority. The project-wide project_state_authority cutoff and SQLite schema version are unchanged. Planning-family migration starts only after Architect and Operator acceptance of RWS05.

Automated proofs do not establish Operator visual acceptance. The bundle qualification report records deterministic results and the single-pass visual validation target.
