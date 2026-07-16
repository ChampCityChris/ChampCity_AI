<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-04/work_card/WC02",
  "artifactType": "work_card",
  "createdAt": "2026-07-16T04:00:00.000Z",
  "jsonPath": "planning/phases/phase-04/Work_Cards/WC02_architect_bridge_current_action_surface_audit_and_embedded_chatgpt_browser.json",
  "markdownPath": "planning/phases/phase-04/Work_Cards/WC02_architect_bridge_current_action_surface_audit_and_embedded_chatgpt_browser.md",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: WC02 Architect Bridge, Current-Action Surface Audit, and Embedded ChatGPT Browser"
  },
  "payloadHash": "sha256:aee939ff0be9983443f00d004ee54f8e36c5f01819b8ef691f54d63e63f71293",
  "phaseId": "phase-04",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-04/implementer_report/WC02-architect-bridge-current-action-surface-audit"
    ],
    "sources": [
      "champcity-ai/phase-04/candidate_disposition/WC01",
      "champcity-ai/phase-04/phase_planning/Phase_Planning",
      "champcity-ai/phase-04/validation_report/WC01",
      "champcity-ai/phase-04/work_card_plan/Work_Card_Plan"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-16T15:10:00.000Z",
  "workCardId": "WC02"
}
-->

# Work Card: Phase 04 WC02 Architect Bridge, Current-Action Surface Audit, and Embedded ChatGPT Browser

Status: implemented_pending_architect_review
Phase: phase-04 — Workflow Authority Cutover and Operator Recovery Stabilization
Work Card: WC02
Risk: critical
Change strategy: bounded integration slice
Repair policy: Maximum one numbered repair. If WC02-REPAIR01 fails Operator validation, block and require Architect reconciliation before any further implementation.

## Purpose

Build the first Architect Bridge path for subscription-surface Architect work.

The application must stop requiring the Operator to explain in chat that an Implementer Report or Validation Report is ready. When the workflow requires Architect action, the app must generate a durable Architect Task Packet, show the source bundle, expected output, and copy-ready ChatGPT prompt, and provide an embedded ChatGPT browser surface.

## Required Work

1. Audit current-action routing from Project Intake through phase and Work Card workflow actions.
2. Add a current-action route table used by production code.
3. Route Architect-owned disposition work to Architect Bridge rather than Operator Validation.
4. Add canonical Architect Task Packet generation for Architect review and disposition actions.
5. Add the embedded ChatGPT browser surface scoped to Architect Bridge work.
6. Ensure Human Validation preview/save remains limited to Operator validation actions.
7. Preserve the Work Card loop and do not build Implementer/Codex integration in this pass.

## Required Acceptance

1. `architect_disposition_required` must render Architect Bridge, not Human Validation.
2. `workCards:previewHumanValidationRecord` must not be called for Architect disposition.
3. Architect Task Packet paths, source artifacts, expected output, packet preview, and copy-ready prompt must be visible.
4. The embedded ChatGPT browser must be reachable from the Architect Bridge surface.
5. Existing Operator Validation behavior must remain intact.
6. WC01 repaired-parent disposition must either advance through a valid `candidate_disposition/WC01` or produce the correct Architect Task Packet.
7. Validation must include targeted unit coverage and mounted Electron coverage.

## Out of Scope

- ChatGPT DOM automation.
- OpenAI API or provider integration.
- Implementer/Codex browser integration.
- Additional WC01 repair cards.
- Independent validation of WC01-REPAIR01 as the final acceptance target.
- Broad UI redesign outside the Architect Bridge slice.

## Required Output

Create the synchronized Implementer Report pair:

`planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC02_architect_bridge_current_action_surface_audit.{json,md}`

Canonical Implementer Report artifact:

`champcity-ai/phase-04/implementer_report/WC02-architect-bridge-current-action-surface-audit`
