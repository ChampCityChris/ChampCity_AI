<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-05/reconciliation_review/WC02",
  "artifactType": "reconciliation_review",
  "createdAt": "2026-07-16T23:45:00.000Z",
  "jsonPath": "planning/phases/phase-05/Reconciliation_Reviews/RECONCILIATION_REVIEW_WC02_reconciled_current_state_and_ground_rules_baseline.json",
  "markdownPath": "planning/phases/phase-05/Reconciliation_Reviews/RECONCILIATION_REVIEW_WC02_reconciled_current_state_and_ground_rules_baseline.md",
  "parentArtifactId": "champcity-ai/phase-05/work_card/WC02",
  "payloadHash": "sha256:d010d500d1fc7650b3c2080d427e8bb233bbcf057c68b0d106c262c1debc0ce7",
  "phaseId": "phase-05",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [
      "champcity-ai/phase-05/work_card/WC02",
      "champcity-ai/phase-05/reconciliation_review/WC01",
      "champcity-ai/phase-04/phase_closeout/PHASE_04",
      "champcity-ai/project/observation/PROJ-OBS-010"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-16T23:45:00.000Z",
  "workCardId": "WC02",
  "payload": {
    "kind": "reconciliation_baseline",
    "title": "Reconciliation Review: PH05 WC02 Reconciled Current-State and Ground-Rules Baseline"
  }
}
-->

# Reconciliation Review: PH05 WC02 Reconciled Current-State and Ground-Rules Baseline

Status: pending_operator_approval
Owner: Architect
Implementation authorized: no
Living document updates authorized: no

## 1. Current Authoritative Project State

Phase 04 is closed as a stabilization bridge phase. Phase 05 is active as the reconciliation and roadmap rebaseline phase. PH05 WC01 completed the planning-corpus inventory and ambiguity review and recorded the Operator clarifications needed to proceed.

The current controlling Phase 05 work is reconciliation outside the application using the current artifact schema. The application is evidence during this phase, not the workflow authority.

## 2. Living Documents Requiring Later Update

The following living documents are stale or partially stale and should be updated only after Operator approval of this baseline:

- `planning/project/PROJECT_STATE.md`
- `planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md`
- `planning/project/PROJECT_PROFILE.md`
- `planning/project/DECISIONS.md`
- `planning/project/RISKS.md`
- `planning/project/OPEN_QUESTIONS.md`
- `planning/project/Project_Observation_Register.md`
- `planning/project/Design_Documents/ARTIFACT_AUTHORITY_MODEL.md`

WC02 does not update those documents yet. It records the baseline that will govern their later reconciliation.

## 3. Ground Rules for Future Work Cards

Existing code is evidence, not a compatibility requirement. Future Work Cards must not preserve a code path merely because it exists.

When old foundation is wrong, the Work Card must require removal, replacement, or migration. Runtime compatibility wrappers, fallback paths, duplicate authority paths, and tests designed to pass around broken architecture are prohibited unless the Operator explicitly approves a named compatibility consumer and sunset plan.

Planning documents are living documents until they complete their purpose. A Work Card may be mutable until it is passed to the Implementer. After the Work Card is used as an implementation handoff, it becomes an artifact of record.

## 4. Old Foundation Removal / Migration Baseline

The next implementation foundation should be workflow-kernel work. The old hand-coded evidence projector and any surrounding fallback paths should not be patched in isolation if doing so preserves the wrong boundary.

Artifact Registry and Workflow State are formally treated as derived/cache/diagnostic until the workflow kernel is rebuilt. They may assist inspection and audit, but they are not independent runtime authority.

## 5. Process Map and Stage Ownership

The established process map remains controlling:

Project Intake → Project Interview → Reconciliation Review → Project Mapping → Operator Project Approval → Phase Mapping → Operator Phase Approval → Work Card Loop → Phase Closeout → Operator Phase Closeout Approval → Roadmap Update → Next Phase Activation.

Architect, Implementer, Operator, and application-owned actions must remain distinct. The Architect creates planning artifacts and reviews reports; the Implementer executes approved implementation Work Cards; the Operator approves and validates; the application routes and records.

## 6. UI Usability Rule

UI usability is an acceptance condition. A Work Card must not pass merely because a data artifact exists or automated tests pass. If the intended Operator or Architect UI is unusable for the workflow step, the Work Card is not acceptable.

UI should be addressed as needed while building. Deferring broken workflow UI for a later polish pass creates repair debt and is not acceptable.

## 7. Architect Bridge and Integration Baseline

Architect Bridge is Alpha core, not a later optional integration feature. ChatGPT subscription plus ChampCity MCP is the default Architect integration model for Alpha and the release-candidate path.

Final-state product direction includes API-backed models. ChampCity MCP becomes a core integrated component of the application and functions both as an MCP server and as a harness for API-backed models.

## 8. Implementer Model

The Implementer contract remains tool-neutral. Codex is the first supported Implementer because it is the current implementation tool. Roadmap and Work Cards should support Codex first without hardcoding the product to Codex only.

## 9. Multi-Project Dogfooding

Multi-project dogfooding is required early in Alpha. The required dogfood targets are ChampCity_AI, ChampCity GPT / ChampCity MCP, ChampCity_RP_Desktop, and Revisionary.

This is not a late Beta feature. It is a required source of system validation while the workflow kernel and integration bridge are built.

## 10. Git Automation and Operator Abstraction

Git automation and Operator abstraction are required before release candidate. The Operator should not be expected to reason about staging, commits, pushes, branches, dirty state, or raw Git commands as part of normal workflow.

Until product automation exists, Architect and Implementer instructions must own the Git discipline.

## 11. Evidence and Screenshot Storage

Screenshots and validation evidence should live in the repo in an app-controlled evidence folder under `planning/`, using repo-safe filenames. The purpose is durable evidence and MCP visibility for ChatGPT/Architect review.

## 12. Release Candidate Minimum Scope

The release candidate target is a public downloadable beta candidate.

Minimum RC scope includes Windows build, local project registration, ChatGPT subscription plus ChampCity MCP Architect Bridge, Implementer loop, validation/evidence workflow, Git automation, multi-project dogfooding, and release-candidate documentation.

## 13. Proposed Status Corrections Requiring Approval

Phase 01 and Phase 02 remain closed. Phase 03 should be treated as interrupted/superseded by later stabilization evidence, not current active authority. Phase 04 is closed with rebaseline required. Phase 05 is active.

Active-looking historical artifacts should be corrected only after Operator approval. WC02 proposes this cleanup but does not perform broad status mutation.

`PROJ-OBS-010` must be integrated into the Project Observation Register during the approved living-document update pass.

## 14. Next Step

After Operator approval or correction of this baseline, PH05 WC03 may draft the extensive release-candidate roadmap with tight, validateable phase boundaries.
