<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-05/work_card/WC01",
  "artifactType": "work_card",
  "createdAt": "2026-07-16T22:30:00.000Z",
  "jsonPath": "planning/phases/phase-05/Work_Cards/WC01_planning_corpus_review_and_clarifying_questions.json",
  "markdownPath": "planning/phases/phase-05/Work_Cards/WC01_planning_corpus_review_and_clarifying_questions.md",
  "payloadHash": "sha256:71c2f989f00544d5ee91c4c715e6e22eaf154ef36b1e32d1318ec261766ca471",
  "phaseId": "phase-05",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-05/reconciliation_review/WC01"
    ],
    "sources": [
      "champcity-ai/phase-05/work_card_plan/Work_Card_Plan"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-16T22:30:00.000Z",
  "workCardId": "WC01",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 05 WC01 Planning Corpus Review and Clarifying Questions"
  }
}
-->

# Work Card: Phase 05 WC01 Planning Corpus Review and Clarifying Questions

Status: ready_for_architect
Phase: phase-05 — Reconciliation and Roadmap Rebaseline
Work Card: WC01
Owner: Architect
Risk: critical
Change strategy: no code changes; planning-corpus reconciliation only

## Purpose

Review the full planning corpus and remove ambiguity before any release-candidate roadmap is drafted.

This Work Card must be performed outside the application using the current artifact schema. It is not an Implementer task and it must not produce source-code changes.

## Required Scope

The Architect must review everything under the project planning root:

`<PROJECT_REPO>/planning`

including all subfolders.

At minimum, the review must cover:

- project-level roadmap, state, decisions, observations, MVP scope, and open questions;
- all phase folders and phase-local planning artifacts;
- Work Cards, Implementer Reports, Architect Reviews, Validation Reports, Candidate Dispositions, Migration Manifests, Architecture Decisions, and Reconciliation Reviews;
- process-map artifacts and stage ownership artifacts;
- project observations including PROJ-OBS-010;
- Phase 04 closeout and Phase 05 activation artifacts.

## Required Output

Produce a synchronized reconciliation review artifact:

`planning/phases/phase-05/Reconciliation_Reviews/RECONCILIATION_REVIEW_WC01_planning_corpus_inventory_and_questions.{json,md}`

Canonical artifact ID:

`champcity-ai/phase-05/reconciliation_review/WC01`

## Required Contents

The reconciliation review must include:

1. Planning corpus inventory.
2. Current project-state summary.
3. Phase-by-phase status summary.
4. Artifact authority problems.
5. UI and Operator usability problems.
6. Old foundation that may need removal or migration.
7. Roadmap ambiguity list.
8. Process-map and stage-ownership consistency check.
9. Clarifying questions for the Operator.
10. A statement that no final roadmap decisions are made until the questions are answered.

## Clarifying Question Rule

After the review, the Architect must ask clarifying questions until ambiguity is removed.

Do not draft the final release-candidate roadmap in WC01 unless no clarifying questions remain.

## Acceptance Criteria

- The review covers the entire `planning/` directory and subfolders.
- The review distinguishes evidence from assumption.
- The review identifies which old foundation likely needs deletion, replacement, or migration.
- The review keeps the established process map intact.
- The review treats UI usability as a first-class acceptance concern.
- The review produces clear Operator questions where ambiguity remains.
- The review does not start source-code implementation.
