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
    "title": "Work Card: Phase 06 WC02-REPAIR02 — Full Gating Artifact Protocol Migration and Project Display Name Repair"
  },
  "payloadHash": "sha256:77f8b71b05791881fe664945bc985f3e11e015b7232b13e8ebc5b27cd16c8753",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR02",
      "champcity-ai/phase-06/operator_approval/WC02-REPAIR02"
    ],
    "sources": [
      "champcity-ai/phase-06/architect_review/WC02-REPAIR01",
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory",
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR01",
      "champcity-ai/phase-06/operator_approval/Operator_Phase_Approval",
      "champcity-ai/phase-06/operator_validation/WC02-REPAIR01",
      "champcity-ai/project/supporting_document/PROJECT_PROFILE"
    ],
    "supersedes": []
  },
  "revision": 4,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-17T21:05:00.000Z",
  "workCardId": "WC02-REPAIR02"
}
-->

# Work Card: Phase 06 WC02-REPAIR02 — Full Gating Artifact Protocol Migration and Project Display Name Repair

Status: approved_for_implementer_execution
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Work Card: WC02-REPAIR02
Parent Work Card: WC02
Owner: Implementer
Risk: critical
Change strategy: protocol migration, not compatibility fallback

## Purpose

Repair the WC02/WC02-REPAIR01 validation failures by migrating all process-gating artifacts from Project Intake through current Phase 06 to the Phase 06 resolver protocol. This is not a narrow Phase 06 approval recognition patch. The resolver, process contract, governing artifacts, and tests must use one target protocol so the app can walk the process map without falling backward to Phase 01 planning, stale Phase 04 work, or an already-completed Phase 06 approval gate.

Also repair the active project dropdown so this repository does not display as `Project Profile`.

## Corrected Architect RCA

WC01 documented the old authority surfaces and defined the target Phase 06 artifact protocol. WC02 replaced the old projector but did not complete migration of all process-gating artifact terms and controlling historical artifacts to that target protocol.

Current mismatch:

- `src/shared/workflow/processContract.ts` still uses old gate terms such as `operator_approval`, `operator_approval`, `operator_approval`, and `operator_approval`.
- Current repository artifacts use generic `approval` artifacts, including `champcity-ai/phase-06/operator_approval/Operator_Phase_Approval`.
- WC01 target protocol identifies operator approval evidence as `operator_approval`.

The correct repair is to complete the target protocol migration. Do not create duplicate compatibility artifacts. Do not preserve old artifact terms as resolver fallback authority. Do not mark controlling gate artifacts historical to bypass the resolver.

The project display-name issue is separate: `src/main/projects/projectWorkspaceRegistry.ts` derives the display name from `PROJECT_PROFILE.payload.title`, which is the generic document title `Project Profile`, not the project or repository name.

## Migration Policy

1. Migrate controlling process-gating artifacts in place by default.
2. Do not create compatibility shadow artifacts.
3. Do not mark required gating artifacts historical merely to bypass resolver gates.
4. Use historical or superseded status only for duplicate, abandoned, or non-controlling artifacts after a valid controlling artifact exists.
5. Do not preserve old artifact terms as fallback authority.
6. Do not create duplicate artifacts for the same gate to satisfy both old and new protocol names.
7. Repair Work Cards remain `work_card` artifacts with repair identity expressed through `workCardId`, `parentArtifactId`, and repair metadata unless WC01 is explicitly revised by an approved design artifact.

## Target Process-Gating Artifact Terms

Project-level gates:
- Project Intake: `project_intake`
- Project Interview / Profile completion: `architect_interview`
- Reconciliation Review: `reconciliation_review`
- Project Roadmap / Project Mapping: `project_roadmap`
- Operator Project Approval: `operator_approval` with project approval scope

Phase setup gates:
- Phase Activation: `phase_activation`
- Phase Map / Phase Mapping: `phase_map`
- Phase Planning: `phase_planning`
- Work Card Plan: `work_card_plan`
- Operator Phase Approval: `operator_approval` with phase/work-card-plan approval scope

Work Card loop gates:
- Work Card Authoring: `work_card`
- Repair Work Card: `work_card` with repair `workCardId`, parent linkage, and repair metadata
- Operator Work Card Approval: `operator_approval` with work-card approval scope
- Implementer Execution: `implementer_report`
- Architect Review: `architect_review`
- Operator Validation: `operator_validation`
- Candidate Disposition: `candidate_disposition`

Phase closeout and next-phase gates:
- Phase Closeout: `phase_closeout`
- Operator Phase Closeout Approval: `operator_approval` with phase-closeout approval scope
- Roadmap Update / Rebaseline: migrate to `project_roadmap` unless `project_roadmap` is explicitly formalized in protocol and resolver rules
- Next Phase Activation: `phase_activation`

Non-gating evidence must not advance the process map by itself: `supporting_document`, `design_document`, `project_state`, `project_observation_register`, `artifact_registry`, and `workflow_state`.

## Required Artifact Migration Scope

Inspect and migrate all process-gating artifacts required to resolve the current project state from Project Intake through the current Phase 06 Work Card chain. At minimum inspect:

- `planning/project/`
- `planning/phases/phase-01/`
- `planning/phases/phase-02/`
- `planning/phases/phase-03/`
- `planning/phases/phase-04/`
- `planning/phases/phase-05/`
- `planning/phases/phase-06/`

The Implementer Report must include a migration inventory table with current path, current artifact ID, current artifact type, current gate role, target artifact type, controlling/duplicate/abandoned/non-gating classification, action taken, and reason.

## Required Code Migration Scope

Inspect and update as needed:

- `src/main/workflow/relationshipDrivenWorkflowResolver.ts`
- `src/shared/workflow/processContract.ts`
- `src/shared/workflow/workflowContracts.ts`
- `src/main/repository/verifiedArtifactGraph.ts`
- `src/main/repository/repositoryRefreshService.ts`
- `src/main/projects/projectWorkspaceRegistry.ts`
- current-action main/preload/renderer surfaces that display or route gate names
- relevant tests under `test/`
- repository gates under `scripts/` if they encode old artifact-type names

## Required Implementation

1. Inventory every process-gating artifact from Project Intake through current Phase 06.
2. Migrate controlling gating artifacts in place to the target protocol.
3. Correct relationships and expected outputs so the chain resolves without old-term fallback.
4. Update process contract terms to the target protocol.
5. Update the relationship resolver to consume target protocol terms only.
6. Ensure old gate terms do not remain live resolver authority.
7. Ensure generic `approval` is not retained as unbounded compatibility fallback.
8. Ensure `operator_approval` carries enough scope/decision metadata for project, phase, Work Card, and phase-closeout approvals.
9. Ensure `operator_validation` replaces old validation gate terminology for live resolver decisions.
10. Decide and document whether existing `project_roadmap` artifacts are migrated to `project_roadmap` or formally added to supported protocol.
11. Fix workspace display-name derivation so generic document titles such as `Project Profile` are not shown as project names.
12. Stop and report the exact artifact/contradiction if a controlling gate cannot be migrated safely.

## Required Tests

Add or update automated tests proving:

- resolver can resolve the governing chain from Project Intake through current Phase 06 without falling back to Phase 01 planning, stale Phase 04 Work Card authoring, or Phase 06 Operator Phase Approval when migrated evidence proves those gates complete;
- old terms such as `operator_approval`, `operator_approval`, `operator_approval`, and `operator_approval` are not accepted as live resolver authority after migration;
- generic `approval` is not accepted as unscoped approval authority;
- scoped `operator_approval` advances project, phase, Work Card, and closeout approval gates when relationships and decision data are valid;
- controlling validation gates use `operator_validation`;
- repair Work Cards use `work_card` plus repair metadata, not a separate live `work_card` type;
- no gating artifact is marked historical merely to bypass a resolver gate;
- duplicate or abandoned artifacts may be superseded only when a valid controlling artifact remains;
- current Phase 06 state resolves to the correct next Work Card loop state or a true blocker;
- active project dropdown does not display `Project Profile` when better project/repository identity is available.

## Required Implementer Report

Create:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC02-REPAIR02_full_gating_artifact_protocol_migration_project_display_name_repair.{json,md}`

Artifact ID:

`champcity-ai/phase-06/implementer_report/WC02-REPAIR02`

The report must include repo/branch/remote verification, Work Card and approval artifacts read, migration inventory, artifacts migrated in place, artifacts superseded or marked historical with proof they were not controlling gates, artifacts left unchanged as non-gating evidence, code files changed, tests added or updated, validation commands/results, residual risks, final git status, and commit hash.

## Acceptance Criteria

- All controlling process-gating artifacts from Project Intake through current Phase 06 use the target protocol.
- No required gate is bypassed by marking a controlling artifact historical.
- The resolver and process contract consume target protocol terms, not old terms or generic fallback terms.
- The resolver does not route backward to Phase 01 planning, Phase 04 Work Card authoring, or Phase 06 Operator Phase Approval when migrated evidence proves those gates complete.
- The app reaches the correct current Work Card loop state or blocks for a true unresolved migrated-protocol defect.
- The active project dropdown no longer displays `Project Profile` for this repository.
- Operator validation remains visible-only and requires no Markdown/JSON editing.

## Manual Validation After Implementer

1. Launch or refresh ChampCity_AI.
2. Confirm the selected project displays a meaningful project/repository name, not `Project Profile`.
3. Confirm the current action does not route backward to Phase 01 planning.
4. Confirm the current action does not route backward to stale Phase 04 work.
5. Confirm the current action does not ask for Phase 06 Operator Phase Approval if migrated approval evidence exists.
6. Confirm the app shows the correct current Work Card loop state or a clear true blocker.
7. Confirm no Ad Hoc Work Card Capture is presented as normal recovery for migrated historical evidence.
8. Confirm no manual Markdown/JSON artifact editing is required for validation.
