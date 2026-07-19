<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-07/operator_approval/WC01",
  "artifactType": "operator_approval",
  "createdAt": "2026-07-18T23:10:44.000Z",
  "jsonPath": "planning/phases/phase-07/Operator_Approvals/OPERATOR_APPROVAL_WC01_champcity_gpt_portability_review_shared_core_architecture_contract.json",
  "markdownPath": "planning/phases/phase-07/Operator_Approvals/OPERATOR_APPROVAL_WC01_champcity_gpt_portability_review_shared_core_architecture_contract.md",
  "parentArtifactId": "champcity-ai/phase-07/work_card/WC01",
  "payload": {
    "kind": "operator_approval",
    "title": "Operator Approval: Phase 07 WC01 — ChampCity_GPT Portability Review and Shared-Core Architecture Contract"
  },
  "payloadHash": "sha256:ab269a534d19878a82fb71d5d59c35566d6b3dc285b7eb1f76ddf8739b9b62b5",
  "phaseId": "phase-07",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-07/implementer_report/WC01"
    ],
    "sources": [
      "champcity-ai/phase-07/work_card/WC01",
      "champcity-ai/phase-07/operator_approval/Operator_Phase_Approval",
      "champcity-ai/phase-07/work_card_plan/Work_Card_Plan"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-18T23:10:44.000Z",
  "workCardId": "WC01"
}
-->

# Operator Approval: Phase 07 WC01 — ChampCity_GPT Portability Review and Shared-Core Architecture Contract

Status: approved_for_implementer_execution
Authorization granted: yes
Authorized Work Card: `champcity-ai/phase-07/work_card/WC01`
Authorized revision: 1
Execution passes: P01-P04
ChampCity_AI baseline: `7708682598bc9f66f3f4c8af8da61867aded56bb`
ChampCity_GPT baseline: `780217aa1046ad8d271d13887ba1121bba419362`
ChampCity_GPT version: `0.3.0`
Push authorized: no
Expected Implementer Report: `champcity-ai/phase-07/implementer_report/WC01`

## Authorization

The Operator approves WC01 revision 1 for one governed Implementer execution covering P01 through P04.

WC01 is a review, architecture-contract, and bounded authority-reconciliation Work Card. It authorizes only the ChampCity_AI planning, lifecycle, Registry-service, obsolete-handoff, and focused lifecycle-test changes expressly listed in WC01.

ChampCity_GPT remains read-only.

## Authorized Outputs

- `champcity-ai/phase-07/diagnostic_report/WC01`
- `champcity-ai/phase-07/design_document/WC01-shared-mcp-core-dual-host-architecture`
- `champcity-ai/phase-07/design_document/WC01-role-tool-permission-matrix`
- `champcity-ai/phase-07/implementer_report/WC01`

## Not Authorized

- creation or publication of `ChampCity_MCP_Core`;
- moving, copying, or extracting MCP production source;
- ChampCity_GPT production changes;
- ChampCity_AI MCP embedding;
- new MCP tools or agent execution;
- OAuth, transport, endpoint, packaging, or release changes;
- commit, merge, push, tag, release, Operator acceptance, or phase closeout.

## Stop Rule

If exact authority cannot be registered and reread through existing ChampCity_AI canonical services, or if the required architecture contract depends on an unresolved Operator decision, stop and report the blocker. Do not fabricate Registry entries or substitute a fallback architecture.
