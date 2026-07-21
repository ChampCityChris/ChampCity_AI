<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC02-REPAIR04",
  "artifactType": "work_card",
  "createdAt": "2026-07-18T04:32:23.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR04_normalized_domain_single_kernel_authority_repair_route_completion.json",
  "markdownPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR04_normalized_domain_single_kernel_authority_repair_route_completion.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC02",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 06 WC02-REPAIR04 — Superseded Before Approval"
  },
  "payloadHash": "sha256:457336a1cc0b2da13aef9575f5d8b0920d79dd5e732aebad9a20cc4ad0818a2b",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [
      "champcity-ai/phase-06/architect_review/WC02-REPAIR03",
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR03",
      "champcity-ai/phase-06/work_card/WC02",
      "champcity-ai/phase-06/work_card/WC02-REPAIR03"
    ],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "superseded",
  "updatedAt": "2026-07-18T08:30:00.000Z",
  "workCardId": "WC02-REPAIR04"
}
-->

# Work Card: Phase 06 WC02-REPAIR04 — Superseded Before Approval

Status: superseded_before_approval
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Work Card: WC02-REPAIR04
Kind: repair
Parent Work Card: WC02
Prior Repair: WC02-REPAIR03
Repair Sequence: 4
Source-code execution authorized: no
Operator approval issued: no
Replacement Work Card: WC03

## Supersession Decision

WC02-REPAIR04 was drafted after the first WC02-REPAIR03 Architect Review. Further governance review determined that its scope was not a bounded repair.

The draft required replacement of the workflow identity model, normalized domain, pure kernel, action authority, renderer routing, approval gating, repair authorization, and integrated validation. That scope is a replacement implementation candidate.

WC02-REPAIR04 is therefore superseded before approval and before implementation by:

`champcity-ai/phase-06/work_card/WC03`

No source-code change, Operator Approval, Implementer execution, Implementer Report, or push is authorized under WC02-REPAIR04.

## Historical Scope Transfer

The complete intended scope is transferred to WC03, including:

- hard-set project, phase, Work Card, repair, replacement, action, and output identities;
- typed workflow hierarchy and Work Card taxonomy;
- prohibition on regex, suffix, filename, path, title, timestamp, ordering, or first-match authority;
- separately typed normalized workflow domain;
- pure kernel over normalized records;
- one executable action and transition authority;
- exact Work Card approval and exact routed-write authority;
- fallback-free renderer routing;
- deterministic repair and replacement handling;
- real Phase 04–06 replay and mounted Electron validation.

This artifact remains only as a historical record of the withdrawn repair classification.

## Document Disposition
Document.Status=Pending
