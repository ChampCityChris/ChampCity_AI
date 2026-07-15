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
  "payloadHash": "sha256:bb413f8eef8bb8e19d7f01e22def45cb3a314dd1eb1cb7f02d9707ab4c33eeb7",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-03/architect_review/WC09-REPAIR01"
    ],
    "sources": [
      "champcity-ai/phase-03/implementer_report/WC09-REPAIR01",
      "champcity-ai/phase-03/work_card_plan/Work_Card_Plan",
      "champcity-ai/phase-03/work_card/WC09-REPAIR01"
    ],
    "supersedes": []
  },
  "revision": 5,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Canonical Workflow State Index

- State revision: 3
- Current stage: prove
- Active phase: phase-03
- Current action: architect_review_of_implementer_report_required
- Responsible role: architect
- Authoritative target: champcity-ai/phase-03/work_card/WC09-REPAIR01
- Required sources: champcity-ai/phase-03/implementer_report/WC09-REPAIR01
- Expected output: champcity-ai/phase-03/architect_review/WC09-REPAIR01
- Success route: operator_validation_required
- Approved Work Card candidates: 16
- Earliest unresolved candidate: WC09
- Active repair: champcity-ai/phase-03/work_card/WC09-REPAIR01
- Closeout eligible: no
- Blocking conditions: none

Reference navigation is excluded from routed authority.
