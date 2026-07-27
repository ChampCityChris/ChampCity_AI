<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC07"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC07",
    "phaseId": "phase-08",
    "title": "Phase Interview Workspace",
    "status": "approved_design_execution_deferred",
    "owner": "Implementer after Operator release",
    "risk": "medium",
    "dependsOn": [
      "WC06",
      "WC03"
    ],
    "executionAuthorized": false,
    "gitMutationAuthorized": false,
    "workspace": {
      "id": "phase-interview",
      "level": "phase",
      "stage": "intake",
      "order": 10
    },
    "handoff": {
      "path": "planning/phases/<phase-id>/Architect_Handoffs/PHASE_INTERVIEW_ARCHITECT_HANDOFF_<phase-id>.*",
      "participationRole": "nonReviewHandoff",
      "status": "Approved"
    },
    "output": "planning/phases/<phase-id>/Phase_Interview.*",
    "completionRule": "Current Phase_Interview is valid, synchronized, fresh, and Approved.",
    "freshnessSources": [
      "Project_Profile",
      "Project_Roadmap",
      "Phase_Map selected record",
      "prior Phase_Closeout when applicable"
    ],
    "browserSecurity": "Preserve accepted WC03 security contract.",
    "prohibitedScope": [
      "Phase Planning",
      "Work Card Plan",
      "Formal Work Cards",
      "hidden phase state",
      "separate approval artifact",
      "provider API",
      "DOM automation",
      "dependencies",
      "Git operations"
    ],
    "validation": [
      "npm run typecheck",
      "npm run build",
      "npm test"
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC07_phase_interview_workspace.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC07 Phase Interview Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium
Depends on: WC06, WC03
Execution authorization: withheld
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC07_phase_interview_workspace.md`

## Purpose

Implement `phase-interview`, generate the Approved non-review Phase Interview handoff for the resolver-selected phase, and receive, review, revise, and disposition the paired `Phase_Interview`.

## Controlling Designs

- `PHASE_MAP_PHASE_INTAKE_AND_PHASE_PLANNING_WORKSPACE_DEFINITION.md`
- `PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `GENERATED_ARCHITECT_HANDOFF_CONTRACT.md`
- `ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`

## Workspace

```text
id: phase-interview
level: phase
stage: intake
order: 10
layout: Embedded Architect browser | Phase_Interview preview and disposition
```

Selected phase identity comes from WC01A evidence projection. Preserve the accepted WC03 browser-security contract.

## Current Inputs

Current Approved Project Profile, Project Roadmap, Phase Map and selected phase record, prior Phase Closeout when applicable, and relevant current risks, constraints, decisions, and repository evidence.

## Generated Handoff

```text
planning/phases/<phase-id>/Architect_Handoffs/PHASE_INTERVIEW_ARCHITECT_HANDOFF_<phase-id>.*
```

The pair is an Approved `nonReviewHandoff`, records source revisions, and names:

```text
planning/phases/<phase-id>/Phase_Interview.*
```

## Interview Contract

The output begins Pending and records artifact/source revisions, phase identity, reviewed sources, predecessor context, questions and answers when required, accepted assumptions, phase constraints/risks/dependencies/outcome, evidence paths, and whether clarification was required.

The no-questions path still creates the document and states that the required context was reviewed and no additional clarification was needed.

Approve, Reject, and Request Revision use synchronized safe writes. Revision notes remain in the pair.

## Freshness and Completion

Changes to the Phase Map, selected phase record, current project planning sources, or applicable prior closeout invalidate the interview and all downstream phase evidence.

Phase Intake completes only when the current interview pair is valid, synchronized, fresh, and Approved.

## Explicit Non-Goals

No Phase Planning, Work Card Plan, Formal Work Cards, hidden phase state, separate approval artifact, provider API, DOM automation, new dependency, or Git operation.

## Required Validation

```text
npm run typecheck
npm run build
npm test
```

Cover stable ID, resolver-selected phase, handoff path/role, no-questions path, pair writes, source freshness, invalidation, local errors, and WC03 security regression.

## Acceptance Criteria

1. `phase-interview` is registry-backed at Phase / Intake order 10.
2. Selected phase identity is evidence-derived.
3. Handoff is Approved non-review and names the canonical output.
4. The no-questions path creates a complete interview.
5. Review and revision are synchronized and safe.
6. Upstream revisions invalidate stale phase interview approval.
7. Phase Intake requires a current Approved interview.
8. WC03 security remains intact.
9. No later lifecycle or hidden state is introduced.
10. Typecheck, build, and tests pass.
11. No Git mutation occurs.

## Implementer Report Requirements

Record repository verification, changed files, workspace ID, context and handoff contracts, no-questions evidence, freshness/invalidation, WC03 regression, validation results, and remaining Operator validation. End with `Document.Status=Pending`.

## Manual Validation After Architect Review

The Operator should exercise both clarification and no-questions paths, approve the result, then revise an upstream phase source and confirm the interview no longer completes Intake.
