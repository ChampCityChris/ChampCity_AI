<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/architect_review/WC02-REPAIR03",
  "artifactType": "architect_review",
  "createdAt": "2026-07-18T04:32:22.000Z",
  "jsonPath": "planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC02-REPAIR03_full_workflow_resolver_foundation_rebuild.json",
  "markdownPath": "planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC02-REPAIR03_full_workflow_resolver_foundation_rebuild.md",
  "parentArtifactId": "champcity-ai/phase-06/implementer_report/WC02-REPAIR03",
  "payload": {
    "kind": "architect_review",
    "title": "Architect Review: Phase 06 WC02-REPAIR03 — Replacement Candidate Required"
  },
  "payloadHash": "sha256:2b34dd08c75f803ad3e72c384087aeb5a1ae2bc883838b4c87c2828dbddc4f26",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/work_card/WC03"
    ],
    "sources": [
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory",
      "champcity-ai/phase-06/diagnostic_report/WC02-full-workflow-resolver-foundation-top-to-bottom-review",
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR03",
      "champcity-ai/phase-06/operator_approval/WC02-REPAIR03",
      "champcity-ai/phase-06/operator_validation/WC02",
      "champcity-ai/phase-06/work_card/WC02",
      "champcity-ai/phase-06/work_card/WC02-REPAIR03"
    ],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-18T08:30:00.000Z",
  "workCardId": "WC02-REPAIR03"
}
-->

# Architect Review: Phase 06 WC02-REPAIR03 — Replacement Candidate Required

Status: changes_required_replacement_candidate
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Reviewed Work Card: WC02-REPAIR03
Parent candidate: WC02
Decision: supersede WC02 with replacement candidate WC03
Operator validation authorized: no
Source-code execution authorized: no

## Revised Architect Decision

WC02-REPAIR03 remains not accepted. The original review correctly identified that the implementation failed the governing architecture, but its first follow-up classification as WC02-REPAIR04 was too narrow.

The required work is not a bounded correction to the WC02 implementation. It is a replacement of the workflow identity model, normalized domain, kernel boundary, action authority, renderer routing, approval gates, and validation architecture. The work therefore requires a new planned replacement candidate.

The required next Work Card is:

`champcity-ai/phase-06/work_card/WC03`

WC02-REPAIR04 is superseded before Operator approval and before implementation. No source-code execution was authorized under WC02-REPAIR04.

## Why This Is a Replacement Candidate

A repair is appropriate only when the original card remains structurally correct and a bounded implementation defect prevents acceptance.

The required follow-up instead must:

- replace identity inference with explicit hard IDs and typed relationships;
- create a complete project, phase, Work Card, repair, replacement, and output hierarchy;
- create a separately typed normalized workflow domain;
- create a pure workflow kernel over that domain;
- remove duplicate executable action and transition authorities;
- replace renderer and workflow-step fallback behavior;
- redesign repair-required review writes and exact approval gating;
- migrate the current Phase 04–06 corpus into deterministic interpretation;
- prove the full path through real-repository and mounted validation.

This is a complete replacement foundation, not repair sequence 4.

## Deterministic Identity Requirement

Artifact IDs identify records. They do not encode executable meaning.

Production code must never parse or reason from an ID, filename, title, path, suffix, phase number, repair number, timestamp, directory order, or first match to determine:

- project ownership;
- active phase;
- phase succession;
- Work Card kind;
- parent or root candidate;
- repair sequence;
- prior repair;
- replacement target;
- current action;
- expected output;
- route or screen.

All such meaning must come from hard-set typed fields and typed relationships generated and validated by application code.

An LLM may draft bounded artifact content after receiving an exact compiled assignment. An LLM may not select, infer, rank, repair, or reinterpret workflow identity or authority.

## Required Work Card Taxonomy

The replacement must define one code-owned Work Card taxonomy:

- `planned_candidate`;
- `repair`;
- `replacement_candidate`.

There is no implicit generic child Work Card category. A large candidate may contain internal implementation checkpoints, but those checkpoints do not become workflow-authority artifacts. A separately governed Work Card must be explicitly classified as a planned candidate, a bounded repair, or a replacement candidate.

## Parent Candidate Disposition

WC02 receives the terminal candidate disposition:

`superseded_by_replacement_candidate`

Its replacement is:

`champcity-ai/phase-06/work_card/WC03`

Historical outcomes remain intact:

- WC02-REPAIR01 remains passed;
- WC02-REPAIR02 remains passed;
- WC02-REPAIR03 remains not accepted;
- WC02-REPAIR04 is superseded before approval;
- WC02 is not completed and is not treated as a successful implementation;
- WC03 becomes the next Phase 06 implementation candidate.

## Required Next Output

`champcity-ai/phase-06/work_card/WC03`

WC03 must remain pending and non-executable until an exact Operator Approval artifact authorizes that exact Work Card.

## Document Disposition
Document.Status=Pending
