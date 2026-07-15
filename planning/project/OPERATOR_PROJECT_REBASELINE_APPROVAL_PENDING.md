<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/approval/OPERATOR_PROJECT_REBASELINE_APPROVAL_PENDING",
  "artifactType": "approval",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/OPERATOR_PROJECT_REBASELINE_APPROVAL_PENDING.json",
  "markdownPath": "planning/project/OPERATOR_PROJECT_REBASELINE_APPROVAL_PENDING.md",
  "payload": {
    "kind": "approval",
    "title": "Operator Project Rebaseline Approval"
  },
  "payloadHash": "sha256:8de0bbd422a2aa5e7bd371db256854316e626bb9fc6783cf2cdda115947ed4cf",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "pending",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Operator Project Rebaseline Approval

Status: Pending Operator Approval
Project: ChampCity A/I
Rebaseline artifact: planning/project/REBASELINE_WORKFLOW_ROUTER_MODEL.md
Process baseline: docs/workflow/PROCESS_BASELINE.md

## Approval Scope

This approval covers the Project Mapping Rebaseline that supersedes the prior screen-picker mental model and adopts the workflow-router model.

If approved, the durable project model is:

```text
Project Intake -> Project Interview -> Reconciliation Review -> Project Mapping -> Operator Project Approval -> Phase Mapping -> Operator Phase Approval -> Work Card Loop -> Phase Closeout -> Operator Phase Closeout Approval -> Roadmap Update -> Next Phase Activation -> Repeat Phase Mapping / Work Card Loop
```

## Pending Decision

The Operator must explicitly approve or request revision.

## Approval Statement

Pending. Do not treat this artifact as approved until the Operator records approval.
