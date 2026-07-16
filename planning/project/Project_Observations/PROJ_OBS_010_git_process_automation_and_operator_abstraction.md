<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/observation/PROJ-OBS-010",
  "artifactType": "project_observation",
  "createdAt": "2026-07-16T19:50:00.000Z",
  "jsonPath": "planning/project/Project_Observations/PROJ_OBS_010_git_process_automation_and_operator_abstraction.json",
  "markdownPath": "planning/project/Project_Observations/PROJ_OBS_010_git_process_automation_and_operator_abstraction.md",
  "payload": {
    "kind": "project_observation",
    "title": "Project Observation: PROJ-OBS-010 Git process automation and Operator abstraction"
  },
  "payloadHash": "sha256:e4ab38d5637f5936ac88cf7f226c4f5fba63ceaffe732a744488119951bfc026",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [
      "champcity-ai/phase-04/work_card/WC02",
      "champcity-ai/phase-04/work_card/WC02-REPAIR02",
      "champcity-ai/phase-04/validation_report/WC02",
      "champcity-ai/phase-04/candidate_disposition/WC02"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-16T19:50:00.000Z"
}
-->

# Project Observation: PROJ-OBS-010 — Git process automation and Operator abstraction

- Source phase: phase-04 — Workflow Authority Cutover and Operator Recovery Stabilization
- Source artifact: Architect/Operator discussion during WC02 validation disposition and Phase 04 stabilization commit.
- Source Work Card: WC02 / WC02-REPAIR02
- Date captured: 2026-07-16

## Operator Observation

All Git processes should either be automated by the application itself or baked into Architect and Implementer instructions. A non-technical user will not understand Git or want to deal with it. Even semi-technical users can reasonably view Git as friction, especially when the workflow repeatedly asks them to reason about branch state, staged files, commits, pushes, or repository cleanliness.

## Architect Disposition

Open / product workflow requirement.

## Disposition Rationale

ChampCity A/I is intended to let non-developers operate an AI-assisted software delivery workflow. Git may remain the underlying durability and source-control mechanism, but it should not be exposed as an end-user responsibility. Where Git action is required, the application should either execute the governed operation itself or present a role-appropriate guided action. Architect and Implementer handoff instructions must also explicitly handle required Git operations so the Operator is not forced to become the source-control controller.

## Required Product Capability

- The application should own routine Git lifecycle operations that are part of the workflow: staging governed artifacts, committing approved evidence, detecting dirty state, and presenting branch/readiness status in plain language.
- Git terminology should be translated into product workflow language where possible.
- The Operator should see "evidence saved", "ready to close phase", "changes need commit", or "branch mismatch blocks this action" rather than raw Git commands.
- Architect and Implementer prompts must include required Git checks, commit rules, and branch discipline when app automation is not yet available.
- Closeout and roadmap workflows should treat Git automation as a product requirement, not a developer convenience.

## Assigned Target

Next roadmap / post-Phase-04 workspace automation and Operator-abstraction planning.

## Status

Open / product workflow requirement

## Resolution Artifact

Pending next roadmap.
