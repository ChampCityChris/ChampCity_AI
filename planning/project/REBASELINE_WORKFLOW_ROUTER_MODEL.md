<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/supporting_document/REBASELINE_WORKFLOW_ROUTER_MODEL",
  "artifactType": "supporting_document",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/REBASELINE_WORKFLOW_ROUTER_MODEL.json",
  "markdownPath": "planning/project/REBASELINE_WORKFLOW_ROUTER_MODEL.md",
  "payload": {
    "kind": "supporting_document",
    "title": "Project Mapping Rebaseline: Workflow Router Model"
  },
  "payloadHash": "sha256:bdc18bf426632a2c32e2bb8e3a88ef83ca7ae40e888b8fe9d7fa66b4c9dc4d28",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC09",
      "champcity-ai/phase-03/implementer_report/WC01"
    ],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "pending",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

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
- The Work Card is also the Implementer execution packet.
- Implementer Reports are reviewed by the Architect.
- Operator validation creates Validation Records.
- Repair sub-cards use WCxx-REPAIRxx naming.
- Closeout approval authorizes Roadmap update and Next Phase Activation.

## Conflicts identified

PROJECT_PROFILE.md still uses Capture -> Frame -> Plan -> Build -> Prove as if it were the core workflow. That phrase should remain only as a mental model.

The current Roadmap still describes Implementer Execution Packet as separate from Formal Work Card and treats Phase Planning Documents as a separate authority surface. Those assumptions are superseded.

## Phase assessment

Phase 01 remains closed.

Phase 02 is closed by Operator closeout.

Prior draft Phase 03 is superseded by the approved workflow-router Phase 03 bundle.

## Recommended next phase

Approved phase-03 title: Workflow Router Screen Correction and Guided Current Action UI.

Purpose: implement the corrected workflow-router model in artifacts and UI behavior. The app should compute the current actionable step and show it as the primary Operator path.

## Operator action

Use this rebaseline as source context for Phase 03 implementation. The separate project-level approval artifact remains pending unless the Operator records that approval.
