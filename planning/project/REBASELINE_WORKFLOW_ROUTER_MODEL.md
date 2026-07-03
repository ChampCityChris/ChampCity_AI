# Project Mapping Rebaseline: Workflow Router Model

Status: Current source context for approved Phase 03 workflow-router correction.

## Reason

The prior Roadmap and UI direction overemphasized separate screens and planning surfaces. The corrected product model is that ChampCity A/I is a workflow router, not a screen picker.

## Corrected workflow

Project Intake -> Project Interview -> Reconciliation Review -> Project Mapping -> Operator Project Approval -> Phase Mapping -> Operator Phase Approval -> Work Card Loop -> Phase Closeout -> Operator Phase Closeout Approval -> Roadmap Update -> Next Phase Activation -> Repeat Phase Mapping / Work Card Loop.

## Required product corrections

- Roadmap.md is the living master record.
- Phase Mapping is the phase-level planning process.
- Phase Planning is an artifact created during Phase Mapping, not a separate top-level workflow concept.
- Work_Card_Plan.md contains Work Card candidates only.
- The Architect creates full Work Cards just in time.
- The Work Card is also the Implementer prompt.
- Implementer Reports are reviewed by the Architect.
- Operator validation creates Validation Records.
- Repair sub-cards use WCxx-REPAIRxx naming.
- Closeout approval authorizes Roadmap update and Next Phase Activation.

## Conflicts identified

PROJECT_PROFILE.md still uses Capture -> Frame -> Plan -> Build -> Prove as if it were the core workflow. That phrase should remain only as a mental model.

The current Roadmap still describes Implementer Prompt as separate from Formal Work Card and treats Phase Planning Documents as a separate authority surface. Those assumptions are superseded.

## Phase assessment

Phase 01 remains closed.

Phase 02 is closed by Operator closeout.

Prior draft Phase 03 is superseded by the approved workflow-router Phase 03 bundle.

## Recommended next phase

Approved phase-03 title: Workflow Router Screen Correction and Guided Current Action UI.

Purpose: implement the corrected workflow-router model in artifacts and UI behavior. The app should compute the current actionable step and show it as the primary Operator path.

## Operator action

Use this rebaseline as source context for Phase 03 implementation. The separate project-level approval artifact remains pending unless the Operator records that approval.
