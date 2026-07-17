<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC02-REPAIR02",
  "artifactType": "work_card",
  "createdAt": "2026-07-17T20:00:00.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR02_phase_approval_recognition_project_display_name_repair.json",
  "markdownPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR02_phase_approval_recognition_project_display_name_repair.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC02",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 06 WC02-REPAIR02 — Phase Approval Recognition and Project Display Name Repair"
  },
  "payloadHash": "sha256:134b9d9e79dec5bd8eeddcc10d554df3c21d0b0bde4876a9af9b23f1cfe0a622",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/approval/WC02-REPAIR02",
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR02"
    ],
    "sources": [
      "champcity-ai/phase-06/validation_report/WC02-REPAIR01",
      "champcity-ai/phase-06/architect_review/WC02-REPAIR01",
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR01",
      "champcity-ai/phase-06/approval/Operator_Phase_Approval",
      "champcity-ai/project/supporting_document/PROJECT_PROFILE"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "draft_for_operator_review",
  "updatedAt": "2026-07-17T20:00:00.000Z",
  "workCardId": "WC02-REPAIR02"
}
-->

# Work Card: Phase 06 WC02-REPAIR02 — Phase Approval Recognition and Project Display Name Repair

Status: draft_for_operator_review
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Work Card: WC02-REPAIR02
Parent Work Card: WC02
Owner: Implementer
Risk: critical

## Purpose

Repair the WC02-REPAIR01 Operator validation failure where the app no longer routes to stale Phase 04 work, but still routes Phase 06 to `operator_phase_approval_required` even though Phase 06 Operator Phase Approval already exists.

Also repair the active project dropdown so this repository no longer displays as `Project Profile`.

## Architect RCA

The current-action resolver checks for Phase approval with `graph.byType("phase_approval", phaseId)`. The actual Phase 06 approval is `champcity-ai/phase-06/approval/Operator_Phase_Approval` with `artifactType: "approval"`. The resolver therefore treats completed Phase 06 approval as missing.

The process contract still names `phase_approval` as the expected output type for `operator_phase_approval_required`, while current canonical approval artifacts use the broader `approval` artifact type and encode phase approval through artifact ID, parent/source relationships, and approval payload data.

The project dropdown displays `Project Profile` because `src/main/projects/projectWorkspaceRegistry.ts` uses `PROJECT_PROFILE.payload.title`. In this repo that value is a generic document title, not the repository workspace name.

## Required Repair

1. Recognize a canonical `approval` artifact as satisfying Phase Operator Approval when it belongs to the active phase, is active, represents `Operator_Phase_Approval`, cites the relevant Phase Planning / Work Card Plan / Phase Activation evidence, and records an approved decision.
2. Do not require a duplicate obsolete `phase_approval` artifact solely to satisfy the resolver.
3. Align resolver and process-contract behavior without reintroducing synthetic expected-output IDs.
4. After repair, the app must not route to `operator_phase_approval_required` when the valid Phase 06 approval exists.
5. Repair workspace display-name derivation so generic profile document titles such as `Project Profile` are not used as active project names. Use an explicit configured displayName, explicit project-name/public-brand metadata when unambiguous, or repository folder basename as fallback.

## Required Tests

Add or update tests proving Phase 06 `approval/Operator_Phase_Approval` satisfies the phase approval gate, the resolver advances past `operator_phase_approval_required`, no obsolete `phase_approval` duplicate is required, and generic `PROJECT_PROFILE.payload.title` does not become the workspace display name.

## Required Implementer Report

Create `planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC02-REPAIR02_phase_approval_recognition_project_display_name_repair.{json,md}` with artifact ID `champcity-ai/phase-06/implementer_report/WC02-REPAIR02`.

## Acceptance Criteria

- The app no longer routes to `operator_phase_approval_required` when the valid Phase 06 approval exists.
- The current action advances to the correct Work Card loop state or blocks for a later accurate reason.
- The repair does not create or require a duplicate `phase_approval` artifact.
- The active project dropdown no longer displays `Project Profile` for this repository.
- Operator validation remains visible-only and requires no Markdown/JSON editing.
