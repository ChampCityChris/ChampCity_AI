# Project Roadmap: ChampCity A/I

Status: Living master roadmap
Updated for: Workflow Router Rebaseline

## Rebaseline Decision

The prior Roadmap and UI direction were based on an incorrect mental model. The application was drifting toward a screen-picker design where the Operator chooses among many screens. That is superseded.

The corrected product model is:

```text
ChampCity A/I is a workflow router, not a screen picker.
```

The application must compute the current actionable step from durable project state and guide the Operator to that step.

## Locked Workflow

```text
Project Intake -> Project Interview -> Reconciliation Review -> Project Mapping -> Operator Project Approval -> Phase Mapping -> Operator Phase Approval -> Work Card Loop -> Phase Closeout -> Operator Phase Closeout Approval -> Roadmap Update -> Next Phase Activation -> Repeat Phase Mapping / Work Card Loop
```

## Milestones

- MVP: completed.
- Alpha: active.
- Beta: future.
- Release: future.

## Phases

### phase-01: MVP Foundation and Core Work Card Loop

Status: closed
Confidence: high

Phase 01 remains valid and closed. It proved the initial MVP foundation and Work Card loop.

### phase-02: Upstream Project Planning and Corrective Workflow Authority

Status: closed
Confidence: high

Phase 02 is closed by Operator closeout. The closeout record activates Phase 03 manually because the current Phase Mapping screen is not reliable enough to use for this transition.

Phase 02 correction:

- Phase Mapping survives as the phase-level planning concept.
- Phase Planning is an artifact inside Phase Mapping, not a separate top-level workflow screen.
- Work Card is also the Implementer prompt.
- Implementer Reports are reviewed by the Architect.
- Operator validation creates Validation Records.
- Closeout approval authorizes Roadmap update and Next Phase Activation.

Closeout evidence: `planning/phases/phase-02/Closeout_Reports/CLOSEOUT_REPORT_phase-02_phase_2_closeout.md`

Closeout decision: Close phase.

Next Phase Activation decision: Activate next phase.

### phase-03: Workflow Router Screen Correction and Guided Current Action UI

Status: active / approved for just-in-time Work Card execution
Confidence: high

Purpose: correct the application screens so they adhere to the newly mapped workflow process.

This is the active development phase after Phase 02 closeout. Its job is not generic UI polish. Its job is to replace the screen-picker/operator-navigation mental model with a workflow-router UI.

Approved Phase 03 authority:

- `planning/phases/phase-03/Phase_Interview.md`
- `planning/phases/phase-03/Phase_Planning.md`
- `planning/phases/phase-03/Work_Card_Plan.md`
- `planning/phases/phase-03/Operator_Phase_Approval.md`

Current executable Work Card: `WC01: Superseded Phase 03 Artifact and Roadmap State Reconciliation`.

Required outcomes:

1. The app computes the current actionable step from durable project state.
2. The primary UI shows the current required action before secondary navigation.
3. The Operator sees why the step is next, what inputs are used, what artifact or record will be written, and what happens after success or failure.
4. Project Intake, Project Interview, Reconciliation Review, Project Mapping, Phase Mapping, Work Card Loop, Phase Closeout, Roadmap Update, and Next Phase Activation are represented as one coherent process.
5. Phase Mapping is presented as the phase-level planning workflow.
6. Phase Planning is presented as an artifact created during Phase Mapping, not a separate primary workflow screen.
7. Work Card is presented as the Implementer handoff; do not make Implementer Prompt a separate primary artifact.
8. Implementer Report review routes to the Architect.
9. Operator validation creates Validation Records.
10. Failed validation routes to REPAIR sub-card creation.
11. Closeout and Next Phase Activation follow the locked process baseline.
12. The visual process map and Figma redesign are used as design inputs, but the implementation follows the locked workflow baseline.

Do not create full Work Cards from this Roadmap alone. Detailed Phase Mapping creates `Work_Card_Plan.md` first.

### phase-04: Workflow Execution Hardening

Status: proposed
Confidence: medium

Purpose: harden the Work Card Loop, Implementer Report capture, Architect report review, validation records, repair sub-cards, and parent Work Card rollup status after the workflow-router screen model is installed.

### phase-05: MCP Integration, Repo Bridge, and Security Boundary

Status: proposed
Confidence: medium

Purpose: make repo/MCP access visible, bounded, understandable, and safe for non-developer Operators.

### phase-06: Guided Operator UX Polish and Figma Implementation

Status: proposed
Confidence: medium

Purpose: apply broader visual polish and Figma design refinement after the workflow-router correction is implemented.

### phase-07: Evidence, Validation, and Release Packaging

Status: proposed
Confidence: low

Purpose: prepare auditability, validation summaries, onboarding, release notes, packaging, and Beta readiness.

## First Incomplete Phase

Current first incomplete phase is phase-03.

Current active phase:

```text
phase-03: Workflow Router Screen Correction and Guided Current Action UI
```

## Superseded Assumptions

- app as screen picker
- Phase Planning as separate top-level workflow concept
- Implementer Prompt as separate primary artifact from Work Card
- Operator manually selecting among many workflow screens as the main path
- generic UI polish before workflow-router correction
- Phase 03 as `Repository Reconciliation and Phase Planning Documents`

## Artifact Policy

Roadmap.md is the living master record. Roadmap does not create executable Work Cards. Phase Mapping creates the phase bundle and Work_Card_Plan.md. Full Work Cards are created just in time by the Architect after Operator Phase Approval.
