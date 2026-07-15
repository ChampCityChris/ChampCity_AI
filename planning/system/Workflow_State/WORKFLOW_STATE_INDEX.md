<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/system/workflow_state",
  "artifactType": "workflow_state",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/system/Workflow_State/WORKFLOW_STATE_INDEX.json",
  "markdownPath": "planning/system/Workflow_State/WORKFLOW_STATE_INDEX.md",
  "payload": {
    "kind": "workflow_state",
    "title": "Canonical Workflow State Index"
  },
  "payloadHash": "sha256:61c5c6a96a392465b8293518a1d97597a54348b7cde0494a92715f40c4aa11d6",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-03/architect_review/WC08-REPAIR04"
    ],
    "sources": [
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR04",
      "champcity-ai/phase-03/work_card/WC08-REPAIR04"
    ],
    "supersedes": []
  },
  "revision": 3,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Canonical Workflow State Index

- State revision: 1
- Current stage: prove
- Active phase: phase-03
- Current action: architect_review_of_implementer_report_required
- Responsible role: architect
- Authoritative target: champcity-ai/phase-03/work_card/WC08-REPAIR04
- Required sources: champcity-ai/phase-03/implementer_report/WC08-REPAIR04
- Expected output: champcity-ai/phase-03/architect_review/WC08-REPAIR04
- Success route: operator_validation_required
- Blocking conditions: none

Reference navigation is excluded from routed authority.
