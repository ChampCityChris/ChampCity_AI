<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card_plan/Work_Card_Plan",
  "artifactType": "work_card_plan",
  "createdAt": "2026-07-17T02:05:00.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Card_Plan.json",
  "markdownPath": "planning/phases/phase-06/Work_Card_Plan.md",
  "payload": {
    "kind": "work_card_plan",
    "title": "Work Card Plan: phase-06 — Deterministic Workflow Foundation Replacement"
  },
  "payloadHash": "sha256:d6add2eab2501afac1b49ef74272f95f13c524a0be97c8bfa8ec090e8f3e3a80",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/operator_approval/Operator_Phase_Approval",
      "champcity-ai/phase-06/work_card/WC01",
      "champcity-ai/phase-06/work_card/WC02",
      "champcity-ai/phase-06/work_card/WC03"
    ],
    "sources": [
      "champcity-ai/phase-06/architect_review/WC02-REPAIR03",
      "champcity-ai/phase-06/candidate_disposition/WC02",
      "champcity-ai/phase-06/phase_activation/phase-06",
      "champcity-ai/phase-06/phase_planning/Phase_Planning"
    ],
    "supersedes": []
  },
  "revision": 6,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-18T08:30:00.000Z"
}
-->

# Work Card Plan: phase-06 — Deterministic Workflow Foundation Replacement

Status: approved
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Revision: 6
Plan strategy: replace the failed WC02 foundation with one explicit replacement candidate

## Rebaseline Decision

The prior Revision 5 plan absorbed the remaining planned Phase 06 scopes into WC02-REPAIR03. That comprehensive attempt did not satisfy the governing architecture.

Further review determined that attaching another broad repair to WC02 would continue an irregular hierarchy and misclassify a complete foundation replacement as repair work.

The Phase 06 plan is rebaselined as follows:

- WC01 remains resolved through WC01-REPAIR01.
- WC02 receives the terminal disposition `superseded_by_replacement_candidate`.
- WC02-REPAIR01 remains passed.
- WC02-REPAIR02 remains passed.
- WC02-REPAIR03 remains not accepted.
- WC02-REPAIR04 is superseded before approval.
- WC03 becomes the next and only remaining implementation candidate.

## Ordered Candidates

### WC01 — Kernel Contract, Artifact Protocol, and Source Authority Replacement Inventory

Order: 1
Kind: `planned_candidate`
Status: resolved

WC01 remains the accepted design and inventory baseline.

### WC02 — Relationship-Driven Resolver Foundation

Order: 2
Kind: `planned_candidate`
Status: terminal — superseded by WC03

WC02 and its repairs remain historical evidence. WC02 is not treated as successfully completed and cannot receive another repair under this plan.

### WC03 — Deterministic Workflow Domain and Kernel Replacement

Order: 3
Kind: `replacement_candidate`
Status: pending Operator Approval

WC03 replaces WC02 as the implementation candidate and owns the complete deterministic foundation.

## Work Card Taxonomy

Application code must define and enforce exactly these workflow Work Card kinds:

- `planned_candidate` — an ordered candidate declared by the governing Work Card Plan;
- `repair` — a bounded correction to a still-valid parent Work Card;
- `replacement_candidate` — a new ordered candidate that terminally supersedes a failed candidate whose architecture or scope is no longer valid.

There is no implicit generic child Work Card category.

Internal implementation breakdown, scaffolding checkpoints, and test checkpoints remain inside the governing Work Card and Implementer execution plan. They do not become workflow-authority artifacts unless governance explicitly creates a planned candidate, repair, or replacement candidate.

## Hard Identity Rule

IDs are generated and carried by code. The resolver may compare exact IDs but may not extract meaning from their text.

Project, phase, candidate order, Work Card kind, parentage, repair lineage, replacement lineage, action, target, and expected output must be declared in typed fields and typed relationships.

Regex, suffix parsing, filename parsing, path parsing, title parsing, phase-number reasoning, timestamps, directory order, and first-match selection are prohibited as workflow authority.

LLMs do not determine workflow identity or current action. They receive exact compiled assignments from application code.

## Completion Rule

Phase 06 becomes eligible for closeout only when:

1. WC01 remains resolved;
2. WC02 remains terminally superseded by WC03;
3. WC03 receives exact Operator Approval;
4. WC03 implementation passes Architect Review;
5. Operator validation confirms the deterministic workflow foundation in the live application;
6. Architect disposition resolves WC03;
7. no active repair, replacement, identity ambiguity, or workflow blocker remains.

## Next Governed Output

`champcity-ai/phase-06/work_card/WC03`

WC03 remains pending and cannot authorize implementation until an exact Operator Approval artifact for WC03 exists.

## Document Disposition
Document.Status=Pending
