<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/approval/WC01",
  "artifactType": "approval",
  "schemaVersion": "champcity.artifact.v1",
  "revision": 1,
  "status": "active",
  "projectId": "champcity-ai",
  "phaseId": "phase-06",
  "workCardId": "WC01",
  "createdAt": "2026-07-17T02:25:00.000Z",
  "updatedAt": "2026-07-17T02:25:00.000Z",
  "jsonPath": "planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC01_kernel_contract_artifact_protocol_source_authority_replacement_inventory.json",
  "markdownPath": "planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC01_kernel_contract_artifact_protocol_source_authority_replacement_inventory.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC01",
  "payloadHash": "sha256:ebcb4e3050fdd27910b1b3c7d3dc90a07e0a58f0efc459cecfbf56b0054608b7",
  "relationships": {
    "sources": [
      "champcity-ai/phase-06/work_card/WC01",
      "champcity-ai/phase-06/approval/Operator_Phase_Approval",
      "champcity-ai/phase-06/work_card_plan/Work_Card_Plan"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory",
      "champcity-ai/phase-06/implementer_report/WC01"
    ],
    "supersedes": [],
    "children": []
  },
  "payload": {
    "kind": "approval",
    "title": "Operator Approval: Phase 06 WC01"
  }
}
-->

# Operator Approval: Phase 06 WC01

Status: approved
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Work Card: WC01
Approved: 2026-07-17

## Approval Decision

The Operator approves WC01 for Implementer execution.

## Scope Approved

The approved WC01 scope is review and classification only. WC01 must define the kernel contract, artifact protocol, and source-authority Replacement Inventory.

## Boundary

No source-code changes are authorized by this approval. Source-code inspection is required, but source-code modification, deletion, runtime fallback creation, compatibility shim creation, provider integration, UI rewrite, and test rewrite are prohibited.

## Required Output

WC01 must produce the required design document and Implementer Report pairs defined by the approved Work Card.

## Next Action

Send WC01 to the Implementer for execution under the no-source-change boundary.
