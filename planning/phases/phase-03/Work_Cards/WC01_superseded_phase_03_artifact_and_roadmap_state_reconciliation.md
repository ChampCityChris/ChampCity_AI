<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC01_superseded_phase_03_artifact_and_roadmap_state_reconciliation",
  "artifactType": "work_card",
  "createdAt": "2026-07-03T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC01_superseded_phase_03_artifact_and_roadmap_state_reconciliation.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC01_superseded_phase_03_artifact_and_roadmap_state_reconciliation.md",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Superseded Phase 03 Artifact and Roadmap State Reconciliation"
  },
  "payloadHash": "sha256:c6a80f9bf77f9e9b6ec7e7fc6e0e6fb0efeecc7866e4bd8ab6979d12466b8daa",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC01",
      "champcity-ai/phase-03/implementer_report/WC01",
      "champcity-ai/phase-03/operator_validation/WC01"
    ],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Work Card: Superseded Phase 03 Artifact and Roadmap State Reconciliation

## Work Card ID

WC01

Created: 2026-07-03
Updated: 2026-07-03

## Phase

phase-03 — Workflow Router Screen Correction and Guided Current Action UI

## Status

ready_for_implementer

## Operator Approval Source

Phase 03 was approved by the Operator in:

- `planning/phases/phase-03/Operator_Phase_Approval.md`
- `planning/phases/phase-03/Operator_Phase_Approval.json`

Approved statement:

```text
I approve the revised Phase 03 Phase Mapping bundle for phase-03: Workflow Router Screen Correction and Guided Current Action UI, including WC03 — Figma Workflow Router UI Shell Integration. The Architect may begin creating executable Work Cards just in time from Work_Card_Plan.md, starting with WC01 unless I request a different order.
```

## What Problem Are We Solving?

The repository contains stale and superseded Phase 03 records created before the workflow-router rebaseline. Some durable artifacts still describe Phase 03 as “Repository Reconciliation and Phase Planning Documents” or still present Phase 02 corrective work as active.

That stale state is dangerous because Phase 03 depends on durable project state. If the app or future Architect/Implementer passes read obsolete Phase 03 artifacts as current authority, the workflow-router UI will route the Operator incorrectly.

## What Should This Accomplish?

Reconcile durable project and phase state so Phase 03 is clearly recognized as the active approved phase:

```text
phase-03: Workflow Router Screen Correction and Guided Current Action UI
```

Preserve older Phase 03 artifacts as historical/superseded records, but prevent them from being treated as active Phase 03 planning authority.

## What Should the User Be Able To Do?

The Operator should be able to inspect the repo/app state and see that:

- Phase 02 has been closed by the Operator.
- Phase 03 has been approved for just-in-time Work Card execution.
- The approved Phase 03 bundle is the current authority.
- Older Phase 03 “Repository Reconciliation and Phase Planning Documents” artifacts are superseded.
- WC01 is the first active executable Work Card candidate.

## What Is Included?

- Review the approved Phase 03 mapping bundle.
- Review the Phase 02 closeout record that activated Phase 03 manually.
- Update durable project-state artifacts so they no longer describe Phase 02 WC08 corrective work as the current milestone.
- Update the living Roadmap and related project/phase state records so Phase 03 is active/approved for execution, not merely proposed or pending review.
- Update any Phase Map or phase-status artifact that still identifies Phase 03 as “Repository Reconciliation and Phase Planning Documents.”
- Mark older Phase 03 planning artifacts as superseded historical artifacts without deleting them.
- Add clear supersession notices to obsolete Phase 03 Markdown artifacts where appropriate.
- Update matching JSON pairs where the app reads paired JSON records.
- Ensure the current approved Phase 03 artifacts remain the authority:
  - `planning/phases/phase-03/Phase_Interview.md`
  - `planning/phases/phase-03/Phase_Planning.md`
  - `planning/phases/phase-03/Work_Card_Plan.md`
  - `planning/phases/phase-03/Operator_Phase_Approval.md`
- Create a WC01 Implementer Report under the canonical `Implementer_Reports` storage when complete.

## Likely Artifacts To Review

At minimum, review:

- `docs/workflow/PROCESS_BASELINE.md`
- `docs/workflow/PROCESS_MAP.drawio`
- `planning/project/PROJECT_STATE.md`
- `planning/project/PROJECT_PROFILE.md`
- `planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md`
- `planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.json`
- `planning/project/Phase_Map/PHASE_MAP_champcity_a_i.md`
- `planning/project/Phase_Map/PHASE_MAP_champcity_a_i.json`
- `planning/project/REBASELINE_WORKFLOW_ROUTER_MODEL.md`
- `planning/phases/phase-02/Closeout_Reports/CLOSEOUT_REPORT_phase-02_phase_2_closeout.md`
- `planning/phases/phase-03/Phase_Interview.md`
- `planning/phases/phase-03/Phase_Planning.md`
- `planning/phases/phase-03/Work_Card_Plan.md`
- `planning/phases/phase-03/Operator_Phase_Approval.md`
- `planning/phases/phase-03/Operator_Phase_Approval.json`
- existing obsolete Phase 03 artifacts under:
  - `planning/phases/phase-03/Phase_Planning_Documents/`
  - `planning/phases/phase-03/Work_Card_Plans/`
  - `planning/phases/phase-03/WORK_CARD_BACKLOG.md`

Also inspect app source only if necessary to identify static labels or default state that still routes Phase 03 to the superseded purpose.

## What Is Not Included?

- Do not implement the durable current required action model. That is WC02.
- Do not implement the Figma workflow-router UI shell. That is WC03.
- Do not perform route-specific UI correction. That belongs to later Phase 03 Work Cards.
- Do not create additional Phase 03 executable Work Cards.
- Do not create Implementer execution packets separate from Work Cards.
- Do not delete historical artifacts.
- Do not rewrite Phase 01 or Phase 02 history beyond necessary status summaries.
- Do not perform broad UI polish.
- Do not package, tag, release, deploy, push, or create a PR.
- Do not call an LLM API, add provider SDKs, add cloud services, or add browser automation.

## Requirements

- Verify the repository path before editing. Expected repository: `%USERPROFILE%/Projects/ChampCity_AI`.
- Verify Git root and remote before editing.
- Read `AGENTS.md` before implementation.
- Read `docs/dev/VALIDATION_COMMAND_LANES.md` before running child-process-heavy validation.
- Preserve Operator / Architect / Implementer-facing role terminology.
- Preserve the locked workflow-router correction: ChampCity A/I is a workflow router, not a screen picker.
- Preserve the approved Phase 03 title exactly:
  - `Workflow Router Screen Correction and Guided Current Action UI`
- Mark superseded artifacts clearly; do not remove them.
- Any updated JSON must remain valid JSON.
- Any updated Markdown must preserve readable human-facing status and source authority.
- If paired Markdown/JSON records exist and are used by the app, keep the pair semantically consistent.
- Avoid broad refactors.
- If source code is touched only to correct static stale labels/defaults, keep the change narrow.

## Required State Corrections

The reconciled state should communicate:

- Phase 01: closed.
- Phase 02: closed by Operator; closeout record exists.
- Phase 03: active / approved for just-in-time Work Card execution.
- Current Phase 03 approved bundle: `Phase_Interview.md`, `Phase_Planning.md`, `Work_Card_Plan.md`, and `Operator_Phase_Approval.md`.
- Current executable Work Card: WC01.
- Superseded Phase 03 title: `Repository Reconciliation and Phase Planning Documents`.
- Superseded artifacts remain historical and must not be treated as active planning authority.

## How We Know This Is Done

- `planning/project/PROJECT_STATE.md` no longer describes Phase 02 WC08 corrective work as the current active milestone.
- The living Roadmap identifies Phase 03 as active or approved for execution, not merely proposed/pending review.
- Phase Map/project-state records no longer identify the active Phase 03 as “Repository Reconciliation and Phase Planning Documents.”
- Obsolete Phase 03 planning artifacts are clearly marked superseded without being deleted.
- The approved Phase 03 bundle remains intact.
- The app-visible state, if static labels/defaults exist, no longer routes Phase 03 to the old repository-reconciliation phase.
- WC01 Markdown and JSON artifacts exist under `planning/phases/phase-03/Work_Cards/`.
- A WC01 Implementer Report exists under `planning/phases/phase-03/Implementer_Reports/` after implementation.
- Validation commands pass or any environment/sandbox limitation is clearly documented.

## How This Should Be Validated

- Read `docs/dev/VALIDATION_COMMAND_LANES.md` before running validation.
- Run a JSON validity check for any JSON artifacts changed.
- Run `node --check scripts/verify-work-card-fixture.mjs` if that file or related fixture assumptions are affected.
- If source code is changed, run the documented validation lane, normally `npm run validate:codex`, unless the validation lane document says to use a different command in the current environment.
- Run `git status --short` and report changed files.
- Manually inspect changed Markdown for stale references to the old Phase 03 title.
- Do not perform Operator acceptance or create validation records.

## Risk Level

medium

## Risks and Watch Items

- The repo is already dirty; do not assume every existing change belongs to this Work Card.
- Older Phase 03 artifacts should be preserved, not deleted, because they are useful evidence of the rebaseline path.
- JSON/Markdown drift could break app readers if only one side of a paired artifact is updated.
- Updating too much UI in WC01 would blur the approved Work Card order. Keep UI implementation for WC03.
- The term “active” should not imply all Phase 03 Work Cards are executable; only WC01 is created now, and later Work Cards are created just in time.

## Implementer Instructions

You are acting as Implementer for ChampCity A/I.

The Implementer may be Codex, Claude Code, Cursor, or another coding agent. Build only from this structured Work Card and preserve the approved scope.

Before editing:

1. Verify the repository path. Expected repository: `%USERPROFILE%/Projects/ChampCity_AI`.
2. Verify Git root and remote. Expected remote repository: `ChampCityChris/ChampCity_AI`.
3. Read `AGENTS.md`.
4. Read `docs/dev/VALIDATION_COMMAND_LANES.md`.
5. Read the approved Phase 03 Phase Mapping bundle.
6. Review the obsolete Phase 03 artifacts before marking them superseded.

Implementation constraints:

- Keep the pass narrow and deterministic.
- Do not create WC02 or later Work Cards.
- Do not implement the workflow-router engine or Figma UI shell in this pass.
- Do not delete historical records.
- Do not stage, commit, push, tag, package, deploy, or open a PR.
- Do not expose secrets or include local credentials in reports.

Deliverable:

Create a WC01 Implementer Report at:

```text
planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC01_superseded_phase_03_artifact_and_roadmap_state_reconciliation.md
```

The report must include:

- Summary of changes.
- Files changed.
- Superseded artifacts marked.
- JSON validation performed.
- Validation commands run and results.
- Any commands skipped and why.
- Git status summary.
- Risks or follow-up items.
- Recommended next action.

## Implementer Handoff Prompt

Use this as the starting Implementer execution packet. The section heading remains a historical execution handoff heading for artifact compatibility.

```text
You are acting as Implementer for ChampCity A/I.

Work Card: WC01 — Superseded Phase 03 Artifact and Roadmap State Reconciliation

Repository: %USERPROFILE%/Projects/ChampCity_AI
Expected remote: ChampCityChris/ChampCity_AI

Goal:
Reconcile durable project and phase state so Phase 03 is clearly recognized as the active approved phase: “Workflow Router Screen Correction and Guided Current Action UI.” Preserve older Phase 03 “Repository Reconciliation and Phase Planning Documents” artifacts as superseded historical records, but prevent them from being treated as current authority.

Before editing:
- Verify the repository path and Git root.
- Verify the remote repository.
- Read AGENTS.md.
- Read docs/dev/VALIDATION_COMMAND_LANES.md.
- Read planning/phases/phase-03/Phase_Interview.md.
- Read planning/phases/phase-03/Phase_Planning.md.
- Read planning/phases/phase-03/Work_Card_Plan.md.
- Read planning/phases/phase-03/Operator_Phase_Approval.md.
- Review obsolete Phase 03 artifacts under Phase_Planning_Documents, Work_Card_Plans, and WORK_CARD_BACKLOG.md.

Scope:
- Update project-state and roadmap artifacts so Phase 02 is closed and Phase 03 is active/approved for just-in-time Work Card execution.
- Update Phase Map/project-state records that still identify Phase 03 with the superseded title.
- Mark obsolete Phase 03 artifacts as superseded without deleting them.
- Keep Markdown/JSON pairs semantically consistent where the app uses paired artifacts.
- Correct only narrow static app labels/defaults if they still route Phase 03 to the old phase title.
- Create a WC01 Implementer Report under planning/phases/phase-03/Implementer_Reports/.

Out of scope:
- Do not implement WC02 durable current required action model.
- Do not implement WC03 Figma workflow-router UI shell.
- Do not create later Work Cards.
- Do not create a separate Implementer Execution Packet artifact.
- Do not delete historical artifacts.
- Do not perform broad UI redesign.
- Do not stage, commit, push, tag, package, deploy, or open a PR.

Acceptance criteria:
- PROJECT_STATE.md no longer describes Phase 02 WC08 corrective work as the current active milestone.
- The living Roadmap identifies Phase 03 as active or approved for execution.
- Active Phase 03 title is “Workflow Router Screen Correction and Guided Current Action UI.”
- Obsolete Phase 03 artifacts are clearly marked superseded.
- The approved Phase 03 bundle remains intact.
- WC01 report is created with commands, validation, changed files, and next action.

Validation:
- Read docs/dev/VALIDATION_COMMAND_LANES.md first.
- Validate changed JSON artifacts.
- Run node --check scripts/verify-work-card-fixture.mjs if related assumptions are affected.
- If source code changes, run the documented validation lane, normally npm run validate:codex unless the lane document directs otherwise.
- Run git status --short and report changed files.
```
