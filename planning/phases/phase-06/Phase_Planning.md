<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/phase_planning/Phase_Planning",
  "artifactType": "phase_planning",
  "createdAt": "2026-07-17T02:05:00.000Z",
  "jsonPath": "planning/phases/phase-06/Phase_Planning.json",
  "markdownPath": "planning/phases/phase-06/Phase_Planning.md",
  "payload": {
    "kind": "phase_planning",
    "title": "Phase Planning: phase-06"
  },
  "payloadHash": "sha256:90dd8e79d5a33d2d12acc90fbf439f33e2faed283da233e38c15bf86fd538af8",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/work_card_plan/Work_Card_Plan"
    ],
    "sources": [
      "champcity-ai/phase-05/project_roadmap/WC03",
      "champcity-ai/phase-06/phase_activation/phase-06",
      "champcity-ai/project/design_document/ARTIFACT_AUTHORITY_MODEL",
      "champcity-ai/project/project_roadmap/PROJECT_ROADMAP_champcity_a_i"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-17T02:05:00.000Z"
}
-->

# Phase Planning: phase-06

Status: draft_for_operator_review
Project: ChampCity A/I
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Phase type: implementation foundation phase

## Purpose

Replace the current hard-coded evidence projector and prompt-handoff assumptions with an integration-ready workflow kernel and canonical artifact protocol.

Phase 06 exists because Phase 04 and Phase 05 proved that patching the existing projector creates more debt. The next implementation pass must build the durable kernel that future Architect Bridge, dogfooding, validation, Git automation, and release-candidate work can consume.

## Source Authority

Primary sources:

- `champcity-ai/phase-05/project_roadmap/WC03`
- `champcity-ai/phase-05/operator_approval/WC03-roadmap-rebaseline`
- `champcity-ai/phase-05/phase_closeout/PHASE_05`
- `champcity-ai/project/project_roadmap/PROJECT_ROADMAP_champcity_a_i`
- `champcity-ai/project/design_document/ARTIFACT_AUTHORITY_MODEL`
- `docs/architecture/WORKFLOW_AUTHORITY_CONTRACT.md`

## In Scope

- Relationship-driven workflow kernel.
- Canonical artifact protocol for workflow state transitions.
- Removal or replacement of wrong old projector assumptions.
- Exact artifact identity and expected-output resolution.
- Repair lineage and repaired-parent completion rules represented as data/rules, not WC-specific branches.
- Artifact Registry and Workflow State as diagnostic/cache until the new kernel explicitly defines their target role.
- Real Phase 04/05 replay fixtures.
- Repository gates that reject synthetic IDs, filename inference, timestamp inference, suffix inference, stale Workflow State authority, and runtime legacy fallback.
- Kernel-to-current-action adapter.
- Minimal UI affordance needed to prove the current action is understandable and usable.

## Out of Scope

- Full Architect Bridge UI implementation.
- ChatGPT DOM automation.
- Provider API model execution.
- Release packaging.
- Full multi-project dogfooding.
- Full validation/evidence UI redesign.
- Git automation implementation.
- Broad visual redesign beyond what is required to validate the kernel-derived current action.

## Old-Foundation Rule

Wrong old foundations must be replaced or migrated. They must not be kept alive by runtime compatibility fallbacks merely because they exist.

Every implementation Work Card in this phase must state:

- existing implementation classification: Preserve, Migrate, or Replace;
- named compatibility consumers, if any;
- migration strategy;
- deletion/removal plan;
- tests proving old and new authority paths are not both active;
- UI impact when touching Operator workflow.

Default for unreleased Alpha is:

```text
Replace wrong foundations with durable-data migration only.
```

## Required Success Criteria

Phase 06 succeeds when:

1. One workflow kernel computes the current required action from verified artifact relationships.
2. The kernel does not invent synthetic artifact IDs.
3. The kernel resolves expected outputs from declared artifact relationships.
4. The kernel blocks ambiguity visibly instead of guessing.
5. Phase 04 and Phase 05 replay from repository evidence without WC-specific special cases.
6. Artifact Registry and Workflow State cannot override verified graph evidence.
7. Existing projector assumptions are removed or made non-authoritative.
8. Kernel-derived current action can be rendered through the current UI path in a way the Operator can understand.
9. Automated tests and repository gates prove the no-fallback rule.
10. Operator validation confirms that the current action is accurate and understandable.

## Exit Condition

Phase 06 exits when the Operator validates that ChampCity_AI repository evidence projects through the new kernel to the correct current action, with no reliance on old projector fallback, stale workflow snapshots, filename ordering, suffixes, or synthetic IDs.

Phase 06 exit does not mean the app is fully ready for dogfooding. Application-led dogfooding resumes in Phase 08 after Phase 07 Architect Bridge work is also complete.

## Document Disposition
Document.Status=Pending
