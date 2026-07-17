<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-05/work_card/WC03",
  "artifactType": "work_card",
  "createdAt": "2026-07-17T00:50:00.000Z",
  "jsonPath": "planning/phases/phase-05/Work_Cards/WC03_release_candidate_roadmap_rebaseline.json",
  "markdownPath": "planning/phases/phase-05/Work_Cards/WC03_release_candidate_roadmap_rebaseline.md",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 05 WC03 Release-Candidate Roadmap Rebaseline"
  },
  "payloadHash": "sha256:3bb47c3ee92da6ec3ad772406f98691c53cae71057a6a49bf9fffb4a8ea137d5",
  "phaseId": "phase-05",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-05/project_roadmap/WC03"
    ],
    "sources": [
      "champcity-ai/phase-04/phase_closeout/PHASE_04",
      "champcity-ai/phase-05/operator_approval/WC02",
      "champcity-ai/phase-05/reconciliation_review/WC01",
      "champcity-ai/phase-05/reconciliation_review/WC02"
    ],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-17T01:10:00.000Z",
  "workCardId": "WC03"
}
-->

# Work Card: Phase 05 WC03 Release-Candidate Roadmap Rebaseline

Status: ready_for_architect
Phase: phase-05 — Reconciliation and Roadmap Rebaseline
Work Card: WC03
Owner: Architect
Risk: critical
Change strategy: no source-code changes; roadmap and living-document proposal only
Revision: 2
Revision reason: Operator requested explicit roadmap criteria requiring a defined phase for returning ChampCity_AI development dogfooding back into the application.

## Purpose

Create an extensive, human-understandable roadmap from the current reconciled state to a public downloadable beta candidate.

The roadmap must have tight phase boundaries and validateable success criteria. It must not rely on vague future phase-planning passes to define the course.

## Authority

This Work Card is authorized by Operator approval of PH05 WC02 and revised by Operator direction to require a defined return-to-in-app-dogfooding phase.

Primary sources:

- `champcity-ai/phase-05/reconciliation_review/WC01`
- `champcity-ai/phase-05/reconciliation_review/WC02`
- `champcity-ai/phase-05/operator_approval/WC02`
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
12. The roadmap must define a specific phase where development of ChampCity_AI returns to being dogfooded inside the application. That phase must include entry criteria, required in-app workflow coverage, required fallback rules, validation evidence, and exit criteria. The return-to-dogfooding point must be explicit and testable, not implied as a later aspiration.

## Required Output

Create the synchronized roadmap rebaseline artifact:

`planning/phases/phase-05/Roadmap_Rebaseline/ROADMAP_REBASELINE_WC03_release_candidate_roadmap.{json,md}`

Canonical artifact ID:

`champcity-ai/phase-05/project_roadmap/WC03`

## Required Contents

The roadmap rebaseline must include:

1. Current-state summary.
2. Release-candidate definition.
3. Alpha-to-beta phase roadmap.
4. Each phase purpose, scope, non-scope, success criteria, validation evidence, and exit condition.
5. Explicit placement of workflow kernel, Architect Bridge, MCP integration, Implementer loop, validation/evidence, Git automation, multi-project dogfooding, UI hardening, packaging, and documentation.
6. A named phase where ChampCity_AI development returns to in-app dogfooding, including entry criteria and exit criteria.
7. Required living-document updates after Operator approval.
8. Old-foundation removal rules carried into future Work Cards.
9. A recommendation for the next implementation phase and its first candidate Work Cards.

## Acceptance Criteria

- The roadmap is extensive but understandable.
- Each phase has a tight boundary.
- Every phase has validateable success criteria.
- The roadmap reaches a public downloadable beta candidate.
- The roadmap names the phase where ChampCity_AI dogfooding returns to the application.
- The dogfooding-return phase has clear entry criteria, required in-app coverage, validation evidence, and exit criteria.
- It does not authorize implementation by itself.
- It identifies living documents that should be updated after approval.
