<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-05/work_card/WC03",
  "artifactType": "work_card",
  "schemaVersion": "champcity.artifact.v1",
  "revision": 1,
  "status": "active",
  "projectId": "champcity-ai",
  "phaseId": "phase-05",
  "workCardId": "WC03",
  "createdAt": "2026-07-17T00:50:00.000Z",
  "updatedAt": "2026-07-17T00:50:00.000Z",
  "jsonPath": "planning/phases/phase-05/Work_Cards/WC03_release_candidate_roadmap_rebaseline.json",
  "markdownPath": "planning/phases/phase-05/Work_Cards/WC03_release_candidate_roadmap_rebaseline.md",
  "payloadHash": "sha256:d2eb13d1f3962ecb6c97c7c76e18554b577cad4032d5dbb9edb61f41f61d2ee1",
  "relationships": {
    "sources": [
      "champcity-ai/phase-05/reconciliation_review/WC01",
      "champcity-ai/phase-05/reconciliation_review/WC02",
      "champcity-ai/phase-05/approval/WC02",
      "champcity-ai/phase-04/phase_closeout/PHASE_04"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-05/roadmap_rebaseline/WC03"
    ],
    "supersedes": [],
    "children": []
  },
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 05 WC03 Release-Candidate Roadmap Rebaseline"
  }
}
-->

# Work Card: Phase 05 WC03 Release-Candidate Roadmap Rebaseline

Status: ready_for_architect
Phase: phase-05 — Reconciliation and Roadmap Rebaseline
Work Card: WC03
Owner: Architect
Risk: critical
Change strategy: no source-code changes; roadmap and living-document proposal only

## Purpose

Create an extensive, human-understandable roadmap from the current reconciled state to a public downloadable beta candidate.

The roadmap must have tight phase boundaries and validateable success criteria. It must not rely on vague future phase-planning passes to define the course.

## Authority

This Work Card is authorized by Operator approval of PH05 WC02.

Primary sources:

- `champcity-ai/phase-05/reconciliation_review/WC01`
- `champcity-ai/phase-05/reconciliation_review/WC02`
- `champcity-ai/phase-05/approval/WC02`
- `champcity-ai/phase-04/phase_closeout/PHASE_04`
- current planning corpus inventory

## Required Roadmap Rules

1. The next implementation phase must start with workflow-kernel and artifact-protocol work.
2. Incorrect old foundations must be replaced or migrated, not preserved as runtime compatibility debt.
3. The established process map and stage ownership remain controlling.
4. UI usability is an acceptance condition inside each implementation phase where user-facing workflow changes are made.
5. Architect Bridge is Alpha core.
6. ChatGPT subscription plus ChampCity MCP is the default Architect integration model.
7. Codex is the first supported Implementer, while the Implementer contract remains tool-neutral.
8. Multi-project dogfooding across ChampCity_AI, ChampCity_GPT / ChampCity MCP, ChampCity_RP_Desktop, and Revisionary is required early in Alpha.
9. Git automation/operator abstraction is required before release candidate.
10. Repo-visible screenshot/evidence storage is required.
11. The target release is a public downloadable beta candidate, beginning with Windows.

## Required Output

Create the synchronized roadmap rebaseline artifact:

`planning/phases/phase-05/Roadmap_Rebaseline/ROADMAP_REBASELINE_WC03_release_candidate_roadmap.{json,md}`

Canonical artifact ID:

`champcity-ai/phase-05/roadmap_rebaseline/WC03`

## Required Contents

The roadmap rebaseline must include:

1. Current-state summary.
2. Release-candidate definition.
3. Alpha-to-beta phase roadmap.
4. Each phase purpose, scope, non-scope, success criteria, validation evidence, and exit condition.
5. Explicit placement of workflow kernel, Architect Bridge, MCP integration, Implementer loop, validation/evidence, Git automation, multi-project dogfooding, UI hardening, packaging, and documentation.
6. Required living-document updates after Operator approval.
7. Old-foundation removal rules carried into future Work Cards.
8. A recommendation for the next implementation phase and its first candidate Work Cards.

## Acceptance Criteria

- The roadmap is extensive but understandable.
- Each phase has a tight boundary.
- Every phase has validateable success criteria.
- The roadmap reaches a public downloadable beta candidate.
- It does not authorize implementation by itself.
- It identifies living documents that should be updated after approval.
