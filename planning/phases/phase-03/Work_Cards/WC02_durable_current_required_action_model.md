# Work Card: Durable Current Required Action Model

## Work Card ID

WC02

Created: 2026-07-03
Updated: 2026-07-03

## Phase

phase-03 — Workflow Router Screen Correction and Guided Current Action UI

## Status

ready_for_implementer

## Source Authority

Phase 03 Operator approval:

- `planning/phases/phase-03/Operator_Phase_Approval.md`
- `planning/phases/phase-03/Operator_Phase_Approval.json`

WC01 validation pass:

- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC01_superseded_phase_03_artifact_and_roadmap_state_reconciliation.md`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC01_superseded_phase_03_artifact_and_roadmap_state_reconciliation.json`

## Problem

ChampCity A/I still behaves like a collection of screens rather than a workflow router. The app needs a durable current required action model that reads project artifacts and determines what the Operator should do next.

WC01 reconciled Phase 03 state and superseded obsolete artifacts. WC02 must now define and implement the state model that later UI Work Cards will display.

## Goal

Implement a deterministic current required action model that computes the current workflow step from durable project state.

The model must identify:

- current required action
- reason the action is next
- responsible role: Operator, Architect, Implementer, or App/System
- source artifacts used as evidence
- missing artifact or expected output record
- success route
- failure or repair route
- manual fallback route
- stale-state or superseded-artifact warnings

## Required Workflow Coverage

The model must cover the locked workflow:

```text
Project Intake -> Project Interview -> Reconciliation Review -> Project Mapping -> Operator Project Approval -> Phase Mapping -> Operator Phase Approval -> Work Card Loop -> Phase Closeout -> Operator Phase Closeout Approval -> Roadmap Update -> Next Phase Activation -> Repeat Phase Mapping / Work Card Loop
```

The evaluator should support at least these states:

1. Project Intake required.
2. Project Interview required.
3. Reconciliation Review required.
4. Project Mapping required.
5. Operator Project Approval required.
6. Phase Mapping required.
7. Operator Phase Approval required.
8. Full Work Card creation required from the next mapped candidate.
9. Operator Work Card review required.
10. Implementer handoff required.
11. Implementer Report required.
12. Architect review of Implementer Report required.
13. Operator validation required.
14. Repair sub-card creation required.
15. Repair Implementer handoff required.
16. Repair validation required.
17. Phase Closeout required.
18. Operator Phase Closeout Approval required.
19. Roadmap Update required.
20. Next Phase Activation required.
21. No current action, project complete, or blocked state.

## Suggested Model Shape

The Implementer may refine naming, but the model should expose data similar to:

```ts
type CurrentRequiredAction = {
  id: string;
  workflowStep: string;
  title: string;
  summary: string;
  responsibleRole: 'operator' | 'architect' | 'implementer' | 'app_system';
  phaseId?: string;
  phaseTitle?: string;
  workCardId?: string;
  workCardTitle?: string;
  status: 'available' | 'blocked' | 'needs_review' | 'needs_approval' | 'needs_validation' | 'needs_repair' | 'complete';
  reason: string;
  sourceArtifacts: Array<{ path: string; role: string; status?: string }>;
  missingArtifacts: Array<{ path: string; reason: string }>;
  expectedOutput?: { path?: string; artifactType: string; description: string };
  successRoute?: string;
  failureRoute?: string;
  repairRoute?: string;
  manualFallback?: { available: boolean; instructions: string; artifactPath?: string };
  warnings: Array<{ code: string; message: string; severity: 'info' | 'warning' | 'blocking' }>;
};
```

The exact field names may differ, but the result must be explicit enough for WC03’s UI shell to display without inventing workflow state.

## WC01 Validation Observation To Address

During WC01 validation, the Operator observed that the Human Validation screen errors when loading Phase 03 because it references a stale validation target:

```text
ENOENT: no such file or directory, open '<PROJECT_REPO>/planning/phases/phase-03/Validation_Targets/WC01_define_work_card_schema_and_markdown_renderer.json'
```

The screen also reports that the current WC01 JSON does not satisfy an older validation-target schema. This was not a WC01 failure, but WC02 must account for it at the state-model layer. At minimum, missing stale validation target files must not crash current-action evaluation or cause the app to treat stale targets as current authority.

## Included Scope

- Create a typed/shared current required action model.
- Add deterministic workflow-step evaluation from durable project artifacts.
- Represent current step, responsible role, evidence, missing artifacts, expected output, success route, failure/repair route, manual fallback, and warnings.
- Account for Phase 03 state after WC01 validation.
- Support Work Card, Implementer Report, Architect review, Operator validation, repair, closeout, Roadmap update, and next-phase activation states.
- Treat superseded artifacts as warnings/context, not active authority.
- Prevent missing stale validation target files from crashing current-action evaluation.
- Resolve or explicitly document the Human Validation stale target/schema issue observed during WC01 validation.
- Add fixture/static coverage for the major current-action states.
- Create the required WC02 Implementer Report.

## Out Of Scope

- Do not implement the Figma workflow-router UI shell.
- Do not perform broad visual redesign.
- Do not replace the renderer with the Figma prototype.
- Do not create WC03 or later Work Cards.
- Do not create a separate Implementer Prompt artifact.
- Do not perform Operator validation or create validation records.
- Do not close Phase 03.
- Do not stage, commit, push, tag, package, deploy, or open a PR.

## Required Artifacts And Source Areas To Review

Review at minimum:

- `AGENTS.md`
- `docs/dev/VALIDATION_COMMAND_LANES.md`
- `docs/workflow/PROCESS_BASELINE.md`
- `planning/project/PROJECT_STATE.md`
- `planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md`
- `planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.json`
- `planning/project/Phase_Map/PHASE_MAP_champcity_a_i.md`
- `planning/project/Phase_Map/PHASE_MAP_champcity_a_i.json`
- `planning/phases/phase-03/Phase_Interview.md`
- `planning/phases/phase-03/Phase_Planning.md`
- `planning/phases/phase-03/Work_Card_Plan.md`
- `planning/phases/phase-03/Operator_Phase_Approval.md`
- `planning/phases/phase-03/Work_Cards/WC01_superseded_phase_03_artifact_and_roadmap_state_reconciliation.md`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC01_superseded_phase_03_artifact_and_roadmap_state_reconciliation.md`
- validation target loading code and schema validators used by the Human Validation screen
- Work Card file-store and schema utilities
- Project Roadmap and Phase Map shared generators
- renderer state or IPC surfaces that currently infer phase/work-card status

Likely source folders:

- `src/shared/workCards/`
- `src/main/workCards/`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/global.d.ts`
- `scripts/verify-work-card-fixture.mjs`

## Requirements

- Verify repository path before editing. Expected repository placeholder: `<PROJECT_REPO>`.
- Verify Git root and remote before editing. Expected remote: `ChampCityChris/ChampCity_AI`.
- Read `AGENTS.md` before implementation.
- Read `docs/dev/VALIDATION_COMMAND_LANES.md` before running validation.
- Renderer code must not directly read or write local files.
- Any new reads/writes must go through constrained Electron main/preload IPC.
- Any path handling must reject unsafe filenames, traversal, arbitrary absolute paths, and unsupported folders.
- Preserve Operator / Architect / Implementer terminology.
- Preserve the corrected product model: ChampCity A/I is a workflow router, not a screen picker.
- Treat Roadmap as the living master record.
- Treat Work Card as the Implementer handoff.
- Treat Implementer Reports as routed to Architect review.
- Treat Operator validation as the creator of Validation Records.
- Treat `WCxx-REPAIRxx` as the repair sub-card route.
- Treat superseded artifacts as historical evidence and warnings, not active authority.
- Do not silently ignore stale or missing validation target files; surface them as warnings or non-blocking stale references unless they truly block the current action.

## Acceptance Criteria

- A typed/shared current required action model exists.
- A deterministic evaluator computes the current required action from durable project state.
- The evaluator identifies Phase 03 / WC02 as the current actionable state after WC01 validation.
- The evaluator distinguishes completed WC01 from active/current WC02.
- The evaluator handles missing/stale validation target references without crashing.
- Superseded Phase 03 artifacts are warnings/context, not active authority.
- Fixture/static tests cover major workflow states.
- Validation passes or environment limitations are documented.
- WC02 Implementer Report is created under `planning/phases/phase-03/Builder_Reports/`.

## Validation

- Read `docs/dev/VALIDATION_COMMAND_LANES.md` first.
- Run TypeScript/type validation if source code changes.
- Run `npm run validate:codex` unless the lane document directs otherwise.
- Run fixture/static validation for current-action scenarios.
- Run `node --check scripts/verify-work-card-fixture.mjs` if related assumptions are affected.
- Run `git status --short` and report changed files.

## Risk Level

high

## Deliverable

Create a WC02 Implementer Report at:

```text
planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC02_durable_current_required_action_model.md
```

The report must include summary of changes, files changed, current-action model shape, workflow states covered, validation target/schema issue disposition, validation commands and results, skipped commands and reasons, git status summary, risks/follow-up items, and recommended next action.

## Builder Handoff Prompt

```text
You are acting as Implementer for ChampCity A/I.

Work Card: WC02 — Durable Current Required Action Model

Repository: <PROJECT_REPO>
Expected remote: ChampCityChris/ChampCity_AI

Goal:
Implement a deterministic current required action model that computes the current workflow step from durable project state. This model will drive the Phase 03 workflow-router UI shell in WC03 and later route-specific Work Cards.

Use the full Work Card as the source of truth. Do not rely on chat context beyond this instruction. Read AGENTS.md and docs/dev/VALIDATION_COMMAND_LANES.md before editing. Create the required Implementer Report when complete.
```
