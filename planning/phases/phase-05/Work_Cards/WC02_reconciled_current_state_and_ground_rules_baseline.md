<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-05/work_card/WC02",
  "artifactType": "work_card",
  "createdAt": "2026-07-16T23:45:00.000Z",
  "jsonPath": "planning/phases/phase-05/Work_Cards/WC02_reconciled_current_state_and_ground_rules_baseline.json",
  "markdownPath": "planning/phases/phase-05/Work_Cards/WC02_reconciled_current_state_and_ground_rules_baseline.md",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 05 WC02 Reconciled Current-State and Ground-Rules Baseline"
  },
  "payloadHash": "sha256:147e7c55f229bef5412222d8001d0093bafafd4c958d11561ec824c1d146be23",
  "phaseId": "phase-05",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-05/reconciliation_review/WC02"
    ],
    "sources": [
      "champcity-ai/phase-05/reconciliation_review/WC01",
      "champcity-ai/phase-05/work_card_plan/Work_Card_Plan"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-16T23:45:00.000Z",
  "workCardId": "WC02"
}
-->

# Work Card: Phase 05 WC02 Reconciled Current-State and Ground-Rules Baseline

Status: ready_for_architect
Phase: phase-05 — Reconciliation and Roadmap Rebaseline
Work Card: WC02
Owner: Architect
Risk: critical
Change strategy: no code changes; proposed baseline first; living documents update only after Operator approval

## Purpose

Create the reconciled baseline that will govern future Phase 05 roadmap work and later implementation phases.

This Work Card is Architect-owned planning work. It does not authorize source-code changes, status cleanup, broad artifact mutation, or living-document rewrites. It produces a proposed baseline for Operator approval.

## Clarifications Incorporated

The Operator answered yes to these WC01 follow-up questions:

1. WC02 should create a reconciled baseline first, then update living documents only after Operator approval.
2. WC02 should propose status corrections for active-looking historical artifacts, but avoid broad artifact-status cleanup until approval.
3. Artifact Registry and Workflow State should be formally treated as derived/cache/diagnostic until the workflow kernel is rebuilt.
4. Codex should be described as the first supported Implementer while the Implementer contract remains tool-neutral.
5. The public beta candidate minimum scope includes Windows build, project registration, ChatGPT subscription plus ChampCity MCP Architect Bridge, Implementer loop, validation/evidence, Git automation, multi-project dogfooding, and release-candidate documentation.

## Required Output

Produce the synchronized artifact pair:

`planning/phases/phase-05/Reconciliation_Reviews/RECONCILIATION_REVIEW_WC02_reconciled_current_state_and_ground_rules_baseline.{json,md}`

Canonical artifact ID:

`champcity-ai/phase-05/reconciliation_review/WC02`

## Required Baseline Sections

The output must include:

1. Current authoritative project state.
2. Living documents requiring later update after Operator approval.
3. Ground rules for future Work Cards.
4. Old foundation removal / migration rules.
5. Process-map and stage-ownership rules.
6. UI usability acceptance rules.
7. Architect Bridge / MCP / ChatGPT subscription integration rules.
8. Implementer support model.
9. Multi-project dogfooding requirement.
10. Git automation and Operator abstraction requirement.
11. Evidence and screenshot storage rule.
12. Release-candidate minimum scope.
13. Proposed artifact/status corrections that require approval before broad cleanup.
14. Explicit statement that WC03 may draft the release-candidate roadmap only after this baseline is approved or corrected.

## Acceptance Criteria

- The baseline distinguishes approved state from proposed cleanup.
- It does not mutate stale living documents yet.
- It treats existing code and artifact paths as evidence, not automatic compatibility requirements.
- It preserves the established process map.
- It requires UI usability as part of acceptance.
- It identifies workflow kernel work as the next implementation foundation.
- It records the public beta candidate as the target release-candidate form.
- It keeps the Implementer contract tool-neutral while identifying Codex as the first supported Implementer.
