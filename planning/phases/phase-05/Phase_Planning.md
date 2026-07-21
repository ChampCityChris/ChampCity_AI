<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-05/phase_planning/Phase_Planning",
  "artifactType": "phase_planning",
  "createdAt": "2026-07-16T22:30:00.000Z",
  "jsonPath": "planning/phases/phase-05/Phase_Planning.json",
  "markdownPath": "planning/phases/phase-05/Phase_Planning.md",
  "payload": {
    "kind": "phase_planning",
    "title": "Phase Planning: phase-05"
  },
  "payloadHash": "sha256:ea2a84ed66985325ebe04f10c985281622454c0e2f174fe640fb562fdebf913c",
  "phaseId": "phase-05",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-05/work_card_plan/Work_Card_Plan",
      "champcity-ai/phase-05/work_card/WC01"
    ],
    "sources": [
      "champcity-ai/phase-04/phase_closeout/PHASE_04"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-16T22:30:00.000Z"
}
-->

# Phase Planning: phase-05

Status: Active / reconciliation and roadmap rebaseline
Project: ChampCity A/I
Phase: phase-05 — Reconciliation and Roadmap Rebaseline
Phase type: Architect-owned planning and reconciliation
Date activated: 2026-07-16

## Purpose

Phase 05 reconciles the project after Phase 04 exposed that the prompt-handoff MVP foundation is not sufficient for integrated Architect / Implementer / Operator workflow execution.

This phase is intentionally small. It does not implement product code. It establishes the clean architectural and planning basis for future implementation phases.

## Phase Outcomes

1. Complete a full review of `planning/` and every subfolder.
2. Remove ambiguity through Architect clarification questions before final roadmap decisions.
3. Reconcile current artifact evidence, current application behavior, project observations, and roadmap intent.
4. Establish ground rules for future phases, including when old foundation must be removed rather than patched.
5. Produce a release-candidate roadmap that is granular, human understandable, and defined phase-by-phase from the current state to release candidate.
6. Define the next implementation phase around the integration-ready workflow kernel and artifact protocol.

## Required Ground Rules

### 1. Replace bad foundation, do not preserve it

Existing code, screens, schemas, or artifacts are not requirements merely because they exist. When an old foundation is wrong, future Work Cards must require removal, replacement, or migration. Runtime compatibility wrappers are prohibited unless a named supported consumer and sunset plan are explicitly approved.

### 2. Stay inside the process map

Reconciliation must use the established process map and stage ownership model. Capture, Frame, Plan, Build, and Prove remain the product mental model. Architect-owned, Implementer-owned, Operator-owned, and application-owned actions must remain distinct.

### 3. UI usability is an acceptance condition

Validation cannot pass merely because an underlying artifact exists or a test passes. If the intended Operator or Architect UI is unusable for the workflow step, that is an acceptance issue.

### 4. Roadmap must be granular and human understandable

The roadmap must plot a clear course from current state to release candidate. Each phase must state what it is supposed to accomplish from the onset. The roadmap must not defer too much definition to future phase-planning passes.

### 5. Full planning review before decisions

The Architect must review everything under `planning/` and its subfolders before final reconciliation conclusions. After review, the Architect must ask clarifying questions until ambiguity has been removed.

## In Scope

- Planning corpus inventory.
- Project state reconciliation.
- Observation register reconciliation.
- Roadmap rebaseline.
- Process-map and stage-ownership governance.
- Integration-ready workflow kernel requirements.
- Release-candidate phase outline.
- Clarifying-question interview.
- Identification of old foundation that must be removed or migrated.

## Out of Scope

- Source-code implementation.
- UI redesign implementation.
- Provider/API integration implementation.
- ChatGPT/Codex automation implementation.
- Phase 04 in-app continuation.
- Release packaging.
- Pull request/release publication.

## Phase Completion Criteria

Phase 05 completes when the Architect has:

- reviewed the full planning corpus;
- asked and resolved all required clarification questions;
- produced a reconciled current-state baseline;
- produced a ground-rules baseline for future Work Cards;
- produced a granular release-candidate roadmap; and
- identified the first implementation phase after Phase 05.

## First Required Action

Execute WC01 — Planning Corpus Review and Clarifying Questions.

## Document Disposition
Document.Status=Pending
