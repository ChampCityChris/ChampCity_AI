# WSF00 — Greenfield Workspace Shell Recovery Audit Matrix

**Audit baseline:** `965536de265a4d494503f2173daddc5e81982a88` — last pre-RWS Greenfield renderer baseline  
**Current reviewed head:** `0e9c0620e12eb35358edb6a85b11270ed3825849`  
**Purpose:** establish the exact reusable workspace-shell inventory before any additional renderer implementation.

## Architecture decision

A **shell** is a reusable UI/workflow container. It owns stable presentation geometry, navigation placement, status/readiness presentation, and interaction slots. It receives typed data and callbacks from an adapter.

A shell does **not**:

- select the current Workflow stage;
- read or write SQL;
- call `window.champcity`;
- infer workflow type;
- construct LLM prompts;
- own Git/MCP/runtime behavior;
- advance lifecycle state;
- become a generic replacement for multiple distinct workspace steps merely because their layouts look similar.

A workflow-specific adapter binds authoritative state and instructions into the shell.

Greenfield is the first reference composition. After the 19 building blocks below are correct, other workflow families may be assembled from the same shells with different loop counts, typed contracts, and LLM instructions.

## Audit matrix

| # | Canonical workspace | Pre-RWS source of truth | Current `dev` state | Audit disposition | Recovery card |
|---:|---|---|---|---|---|
| 0 | Nested lifecycle navigation rail | `NestedWorkflowRail.tsx` + project lifecycle rail logic at `965536de` | Deleted by RWS06J-C; replaced by unrelated `WorkflowStageRail` model | **REBUILD FROM BASELINE** | WSF01 |
| 1 | Project Intake Capture | inline `App.tsx` at `965536de`; faithful RWS01 extraction at `aa80474` | `ProjectIntakeWorkspace` + `IntakeWorkspaceShell` survive but behavior has changed | **SALVAGE GEOMETRY; RE-PROVE PARITY** | WSF02 |
| 2 | Architect Interview | inline Greenfield Architect composition at baseline; faithful RWS05A extraction created `GreenfieldArchitectWorkspace` | `GreenfieldArchitectWorkspace` removed; `StructuredArchitectWorkspace` is a different generic surface | **REBUILD FROM BASELINE** | WSF03 |
| 3 | Project Plan & Roadmap Review | baseline `App.tsx` Project Planning composition | `StructuredProjectPlanningWorkspace` + generic `PlanReviewShell` | **REBUILD WORKSPACE SHELL** | WSF04 |
| 4 | Project Phase Map | `FigmaPhaseMapWorkspace` / `phaseMapPresentation.tsx` + baseline App composition | `FigmaPhaseMapWorkspace` survives but Greenfield is wired to `StructuredPhaseMapWorkspace` / generic map | **RECOVER SURVIVING WORKSPACE AS SHELL** | WSF05 |
| 5 | Project Validation | baseline App project-validation composition and lifecycle rail/status behavior | no dedicated workspace; behavior folded into generic execution/close paths | **MISSING — RECREATE** | WSF06 |
| 6 | Project Close | baseline App Project Close composition and close controls | no dedicated workspace; generic `CloseAdvanceShell` substituted | **MISSING — RECREATE** | WSF07 |
| 7 | Phase Interview | baseline App phase-interview Architect/document/browser composition | collapsed into `StructuredPhaseLoopWorkspace(stageKind=interview)` | **REBUILD DISTINCT SHELL** | WSF08 |
| 8 | Phase Planning | baseline App phase-planning-bundle composition | collapsed into `StructuredPhaseLoopWorkspace(stageKind=planning)` | **REBUILD DISTINCT SHELL** | WSF09 |
| 9 | Work Card Map | `WorkCardMapWorkspace.tsx` + map tests at baseline | deleted by RWS06J-C; generic `WorkMapShell` substituted | **RECREATE FROM DELETED SOURCE** | WSF10 |
| 10 | Phase Validation | baseline App + phase validation presentation/orchestration | dedicated presentation removed; folded into `WorkflowExecutionWorkspace` | **RECREATE FROM BASELINE** | WSF11 |
| 11 | Phase Close | baseline App Phase Close controls/presentation | no dedicated workspace; generic `CloseAdvanceShell` substituted | **RECREATE FROM BASELINE** | WSF12 |
| 12 | Work Card Intake | `WorkCardIntakeWorkspace.tsx` + its renderer tests | deleted by RWS06J-C | **RECREATE FROM DELETED SOURCE** | WSF13 |
| 13 | Work Card Planning | baseline App planning workspace + `workCardPlanPresentation.tsx` | collapsed into WorkItem planning inside generic Execution | **RECREATE DISTINCT SHELL** | WSF14 |
| 14 | Implement | `WorkCardBuildingReviewWorkspace.tsx` + renderer tests | deleted by RWS06J-C; generic `ExecutionShell` substituted | **RECREATE FROM DELETED SOURCE** | WSF15 |
| 15 | Review & Validation | `WorkCardReportReviewWorkspace.tsx` + renderer tests | deleted; generic `ReviewValidationShell` SQL evidence dump substituted | **RECREATE FROM DELETED SOURCE** | WSF16 |
| 16 | Work Card Repair | `WorkCardRepairWorkspace.tsx` + renderer tests | deleted; repair action folded into generic Execution | **RECREATE FROM DELETED SOURCE** | WSF17 |
| 17 | Work Card Validation | baseline App Work Card Validation composition / validation-attempt action | no dedicated workspace; folded into generic Execution validation | **RECREATE FROM BASELINE** | WSF18 |
| 18 | Work Card Close | `WorkCardCloseWorkspace.tsx` + renderer tests | deleted; generic `CloseAdvanceShell` substituted | **RECREATE FROM DELETED SOURCE** | WSF19 |

## Confirmed destructive checkpoints

### RWS06J-C — `7cac22b`

Deleted the majority of the prior workflow UI under the classification “obsolete legacy workflow services,” including:

- `NestedWorkflowRail.tsx`
- `WorkCardIntakeWorkspace.tsx`
- `WorkCardBuildingReviewWorkspace.tsx`
- `WorkCardReportReviewWorkspace.tsx`
- `WorkCardCloseWorkspace.tsx`
- `WorkCardMapWorkspace.tsx`
- `WorkCardRepairWorkspace.tsx`
- multiple Issue workflow workspaces
- legacy Architect workspace composition
- renderer tests proving the deleted workspace behavior.

### RWS06J-R01 — `1af7ed3`

Deleted `GreenfieldExecutionWorkspace.tsx` and forced Greenfield onto the generic shared Execution presentation.

### RWS06J-R02 — `d5a1291`

Retired additional Greenfield Work Card compatibility state after the generic execution cutover.

## Current shell assessment

The current files named “Shell” are **not** the authoritative inventory.

- `IntakeWorkspaceShell`: candidate for reuse because RWS01 was a presentation extraction.
- `ArchitectWorkspaceShell`: candidate internal layout primitive because RWS05A was an extraction.
- `DocumentChatWorkspaceShell`: possible internal geometry primitive only.
- `PlanReviewShell`: new generalized workflow screen; not a substitute for distinct planning workspace shells.
- `WorkMapShell`: generic list/map; not a substitute for Project Phase Map or Work Card Map.
- `ExecutionShell`: new consolidated screen; not a substitute for Implement, Review & Validation, Repair, Validation, and Close workspaces.
- `ReviewValidationShell`: SQL evidence presentation; not parity with the prior Review & Validation workspace.
- `CloseAdvanceShell`: generic lifecycle form; not parity with Work Card, Phase, or Project Close.

## Recovery rules

1. Each matrix row becomes a distinct shell first.
2. Source composition comes from Git, not screenshots or recollection.
3. Restore characterization tests from the pre-RWS/deleted-source history when they still describe intended behavior.
4. Replace persistence/data ownership underneath the workspace with current SQL-backed adapters; do not restore Markdown authority.
5. Do not deduplicate two shell types until Greenfield is running and Operator-audited.
6. No other workflow family may consume these shells until Greenfield shell parity is accepted by the Operator.
