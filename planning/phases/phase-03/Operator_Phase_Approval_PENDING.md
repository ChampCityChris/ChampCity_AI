<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/operator_approval/Operator_Phase_Approval_PENDING",
  "artifactType": "operator_approval",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Operator_Phase_Approval_PENDING.json",
  "markdownPath": "planning/phases/phase-03/Operator_Phase_Approval_PENDING.md",
  "payload": {
    "kind": "operator_approval",
    "title": "Operator Phase Approval Pending: phase-03"
  },
  "payloadHash": "sha256:0f45a27f0efaed0cb26decb06f44bfa073da73800ec12f45f7df4cbbcb2bf34d",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/implementer_report/WC01"
    ],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "superseded",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Operator Phase Approval Pending: phase-03

> Superseded historical draft. The Operator approved Phase 03 in `planning/phases/phase-03/Operator_Phase_Approval.md` on 2026-07-03. Do not use this pending draft as the current approval state.

Status: Superseded by Approved Operator Phase Approval
Project: ChampCity A/I
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Approval state: Not approved
Executable Work Cards authorized: No
Revision note: Pending approval artifact updated after the Operator requested that actual Figma-based UI implementation be slotted into Phase 03.

## Purpose

This artifact records that the revised Phase 03 Phase Mapping bundle has been generated and is pending Operator approval.

Approval of this artifact would authorize the Architect to begin creating full executable Work Cards just in time from `Work_Card_Plan.md`. Until approval, the mapped Work Card candidates remain planning candidates only.

## Phase Mapping Bundle Pending Review

The pending revised Phase 03 bundle consists of:

- `planning/phases/phase-03/Phase_Interview.md`
- `planning/phases/phase-03/Phase_Planning.md`
- `planning/phases/phase-03/Work_Card_Plan.md`
- `planning/phases/phase-03/Operator_Phase_Approval_PENDING.md`

## Revision Summary

The revised bundle keeps the previously planned structural workflow-router work and explicitly adds actual UI implementation from the Figma source-code bundle.

The Figma UI update is now slotted as:

```text
WC03 — Figma Workflow Router UI Shell Integration
```

This placement is intentional. It comes after `WC02 — Durable Current Required Action Model` and before route-specific workflow screens. The UI shell should display the computed current action; it should not own or invent workflow state.

## Source Authority Reviewed

- `docs/workflow/PROCESS_BASELINE.md`
- `docs/workflow/PROCESS_MAP.drawio`
- `planning/project/PROJECT_PROFILE.md`
- `planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md`
- `planning/project/REBASELINE_WORKFLOW_ROUTER_MODEL.md`
- `planning/phases/phase-02/Closeout_Reports/CLOSEOUT_REPORT_phase-02_phase_2_closeout.md`
- Uploaded Figma source-code bundle: `Design Dark UI for ChampCity.zip`

## Phase 03 Product Correction

ChampCity A/I is a workflow router, not a screen picker.

The application must compute the current actionable step from durable project state and guide the Operator to that step. The primary UI should not require the Operator to choose randomly among many screens.

## Figma Source-Code Handling

The Figma bundle is approved as design and implementation input for Phase 03 UI shell work, not as process authority.

The actual implementation must adapt the Figma concepts into the existing app, including:

- top status strip
- horizontal workflow rail
- current required action panel
- artifact review workspace
- right context inspector
- subordinate navigation drawer
- bottom activity/evidence log

The implementation must not blindly paste the prototype into the app. Demo/static state, stale labels, prototype-only controls, and any terminology that conflicts with the locked workflow must be corrected.

## What Approval Would Authorize

If approved, Operator Phase Approval would authorize:

- Treating Phase 03 as the active execution phase.
- Using `Phase_Interview.md`, `Phase_Planning.md`, and `Work_Card_Plan.md` as the Phase 03 planning authority.
- Creating full executable Work Cards one at a time from the mapped candidates.
- Beginning with the first mapped Work Card candidate unless the Operator requests reordering.
- Including the Figma workflow-router UI shell integration as mapped candidate `WC03`.

## What Approval Would Not Authorize

Approval would not authorize:

- Creating every full Work Card at once.
- Skipping Operator review of full Work Cards.
- Treating Figma output as workflow authority.
- Blindly replacing the current app with the Figma prototype.
- Creating a separate Implementer Execution Packet artifact as a primary handoff.
- Skipping Architect review of Implementer Reports.
- Skipping Operator validation records.
- Skipping repair sub-card routing after failed validation.
- Performing release packaging or deployment.

## Pending Operator Decision

The Operator may choose one of the following:

1. Approve Phase 03 mapping as revised.
2. Approve with specific additional revisions.
3. Request further revisions before approval.
4. Reject this mapping and remap Phase 03.

## Recommended Operator Approval Statement

Use this statement if approving as revised:

```text
I approve the revised Phase 03 Phase Mapping bundle for phase-03: Workflow Router Screen Correction and Guided Current Action UI, including WC03 — Figma Workflow Router UI Shell Integration. The Architect may begin creating executable Work Cards just in time from Work_Card_Plan.md, starting with WC01 unless I request a different order.
```

## Current Status

Pending Operator approval or requested revisions.

## Document Disposition
Document.Status=Pending
