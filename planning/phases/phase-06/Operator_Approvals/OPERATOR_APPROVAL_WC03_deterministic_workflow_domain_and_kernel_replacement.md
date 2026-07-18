<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/operator_approval/WC03",
  "artifactType": "operator_approval",
  "createdAt": "2026-07-18T08:50:12.000Z",
  "jsonPath": "planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC03_deterministic_workflow_domain_and_kernel_replacement.json",
  "markdownPath": "planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC03_deterministic_workflow_domain_and_kernel_replacement.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC03",
  "payload": {
    "kind": "operator_approval",
    "title": "Operator Approval: Phase 06 WC03"
  },
  "payloadHash": "sha256:bd13483da978fe6cc38289880b743b4dd0f3755237fe178b29c326c0f0ec1a57",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/implementer_report/WC03"
    ],
    "sources": [
      "champcity-ai/phase-06/architect_review/WC02-REPAIR03",
      "champcity-ai/phase-06/candidate_disposition/WC02",
      "champcity-ai/phase-06/operator_approval/Operator_Phase_Approval",
      "champcity-ai/phase-06/work_card/WC03",
      "champcity-ai/phase-06/work_card_plan/Work_Card_Plan"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-18T08:50:12.000Z",
  "workCardId": "WC03"
}
-->

# Operator Approval: Phase 06 WC03

Status: approved
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Work Card: WC03
Kind: replacement_candidate
Approved revision: 2
Decision: approved for Implementer execution
Push authorized: no

The Operator approves WC03 revision 2 for one complete Implementer execution pass.

This approval is exact and applies only to:

`champcity-ai/phase-06/work_card/WC03`

WC03 replaces the superseded WC02 foundation. It is not a repair of WC02 and does not authorize any implicit child Work Card.

Implementation must follow the complete WC03 scope, including:

- hard-set project, phase, Work Card, repair, replacement, action, and output identities;
- code-owned Work Card taxonomy;
- explicit typed hierarchy and relationships;
- no workflow meaning derived from regex, IDs, filenames, titles, paths, suffixes, numbers, timestamps, ordering, aliases, renderer state, or LLM reasoning;
- a separate normalized workflow domain;
- a pure workflow kernel;
- one executable action authority;
- thin non-authoritative adapters;
- exact approval and compiled Implementer assignment;
- deterministic Phase 04–06 corpus migration required by WC03;
- real-repository, mounted Electron, parity, isolation, and no-fallback validation.

No narrowing, deferral, compatibility authority, fallback, alias, synthetic identity, additional WC02 repair, implicit child Work Card, Operator acceptance, or push is authorized.

Expected output:

`champcity-ai/phase-06/implementer_report/WC03`
