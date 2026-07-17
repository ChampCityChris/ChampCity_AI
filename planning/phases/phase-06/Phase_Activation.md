<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/phase_activation/phase-06",
  "artifactType": "phase_activation",
  "createdAt": "2026-07-17T02:05:00.000Z",
  "jsonPath": "planning/phases/phase-06/Phase_Activation.json",
  "markdownPath": "planning/phases/phase-06/Phase_Activation.md",
  "payload": {
    "kind": "phase_activation",
    "title": "Phase Activation: phase-06"
  },
  "payloadHash": "sha256:cf4415a2480102bfc429b7dbd4bc363407daccb7bdf036dcb3bba5337c1959ab",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/phase_planning/Phase_Planning",
      "champcity-ai/phase-06/work_card_plan/Work_Card_Plan"
    ],
    "sources": [
      "champcity-ai/phase-05/operator_approval/WC03-roadmap-rebaseline",
      "champcity-ai/phase-05/phase_closeout/PHASE_05",
      "champcity-ai/phase-05/project_roadmap/WC03"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-17T02:05:00.000Z"
}
-->

# Phase Activation: phase-06

Status: active_for_planning
Project: ChampCity A/I
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Activation date: 2026-07-17

## Activation Decision

Phase 06 planning is activated by the Phase 05 closeout.

Phase 06 is the next implementation phase in the approved roadmap. It replaces the old evidence projector and artifact protocol boundary with a relationship-driven workflow kernel.

## Activation Authority

Primary authority:

- `champcity-ai/phase-05/phase_closeout/PHASE_05`
- `champcity-ai/phase-05/project_roadmap/WC03`
- `champcity-ai/phase-05/operator_approval/WC03-roadmap-rebaseline`
- `champcity-ai/project/project_roadmap/PROJECT_ROADMAP_champcity_a_i`

## Phase Intent

Phase 06 must produce the durable workflow kernel and artifact protocol needed before Architect Bridge, in-app dogfooding re-entry, validation governance, Git automation, and release-candidate work can proceed safely.

## Planning Boundary

This activation authorizes Phase 06 planning artifacts only. It does not authorize source-code implementation until the Phase 06 plan and Work Card Plan are approved and a just-in-time Work Card is created.
