<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC02-REPAIR02",
  "artifactType": "work_card",
  "schemaVersion": "champcity.artifact.v1",
  "revision": 3,
  "status": "draft_for_operator_review",
  "projectId": "champcity-ai",
  "phaseId": "phase-06",
  "workCardId": "WC02-REPAIR02",
  "createdAt": "2026-07-17T20:00:00.000Z",
  "updatedAt": "2026-07-17T20:35:00.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR02_phase_approval_recognition_project_display_name_repair.json",
  "markdownPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR02_phase_approval_recognition_project_display_name_repair.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC02",
  "relationships": {
    "sources": [
      "champcity-ai/phase-06/validation_report/WC02-REPAIR01",
      "champcity-ai/phase-06/architect_review/WC02-REPAIR01",
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR01",
      "champcity-ai/phase-06/approval/Operator_Phase_Approval",
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory",
      "champcity-ai/project/supporting_document/PROJECT_PROFILE"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-06/approval/WC02-REPAIR02",
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR02"
    ],
    "supersedes": [],
    "children": []
  },
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 06 WC02-REPAIR02 — Full Gating Artifact Protocol Migration and Project Display Name Repair"
  },
  "payloadHash": "sha256:97cd4488043d432448efbc73434fc34c04f27badd53ac95a7336398f87cf08aa"
}
-->

# Work Card: Phase 06 WC02-REPAIR02 — Full Gating Artifact Protocol Migration and Project Display Name Repair

Status: draft_for_operator_review
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Work Card: WC02-REPAIR02
Parent Work Card: WC02
Owner: Implementer
Risk: critical
Change strategy: protocol migration, not compatibility fallback

## Purpose

Repair the WC02 / WC02-REPAIR01 validation failures by migrating the process-gating artifact protocol from Project Intake through the current Phase 06 state to the Phase 06 resolver protocol.

This Work Card replaces the narrower “Phase Approval Recognition” framing. The goal is not to teach the resolver to tolerate whichever old or generic artifact term happens to exist. The goal is to align the governing artifacts, process contract, resolver, and tests to one canonical protocol so the app can walk the process map from the beginning of the project to the current Phase 06 state without falling backward to an old planning gate or guessing from stale evidence.

This Work Card also repairs the active project dropdown display-name issue where this repository displays as `Project Profile`.

## Corrected Architect RCA

WC01 documented the old authority surfaces and defined the target Phase 06 artifact protocol. WC02 replaced the old projector but did not complete migration of all process-gating artifact terms and all controlling historical artifacts to that target protocol.

The current repository has conflicting terms for approval gates:

- `src/shared/workflow/processContract.ts` still uses old process-contract terms such as `phase_approval`, `project_approval`, `work_card_approval`, and `phase_closeout_approval`.
- Current repository artifacts use generic `approval` artifacts, including `champcity-ai/phase-06/approval/Operator_Phase_Approval`.
- WC01 target protocol identifies operator approval evidence as `operator_approval`.

That is not a one-artifact problem. It is a protocol migration failure across code and artifacts. Fixing only Phase 06 Operator Phase Approval would create another compatibility pocket and could still leave the resolver able to fall back to an earlier project or phase gate if other historical gating artifacts remain on old terms.

The active project dropdown issue has a separate but related operator-facing cause: `src/main/projects/projectWorkspaceRegistry.ts` derives display name from `PROJECT_PROFILE.payload.title`. In this repository that value is the generic document title `Project Profile`, not the project name or repository identity.

## Migration Policy

The migration must follow these rules.

1. Default to in-place migration for controlling process-gating artifacts.
2. Do not create compatibility shadow artifacts.
3. Do not mark required gating artifacts historical merely to bypass resolver gates.
4. Use historical or superseded status only for duplicate, abandoned, or non-controlling artifacts after a valid controlling artifact exists.
5. Do not preserve old artifact terms as fallback authority.
6. Do not create duplicate artifacts for the same gate to satisfy both old and new protocol names.
7. Repair Work Cards remain `work_card` artifacts with repair identity expressed through `workCardId`, `parentArtifactId`, and repair metadata unless WC01 is explicitly revised by an approved design artifact.

## Required Protocol Terms

The Implementer must migrate code and controlling artifacts to these process-gating artifact terms unless a contradiction is found in WC01 that requires stopping for Architect disposition.

### Project-level gates

- Project Intake: `project_intake`
- Project Interview / Profile completion: `architect_interview`
- Reconciliation Review: `reconciliation_review`
- Project Roadmap / Project Mapping: `project_roadmap`
- Operator Project Approval: `operator_approval` with project approval scope

### Phase setup gates

- Phase Activation: `phase_activation`
- Phase Map / Phase Mapping: `phase_map`
- Phase Planning: `phase_planning`
- Work Card Plan: `work_card_plan`
- Operator Phase Approval: `operator_approval` with phase / work-card-plan approval scope

### Work Card loop gates

- Work Card Authoring: `work_card`
- Repair Work Card: `work_card` with repair `workCardId`, parent linkage, and repair metadata
- Operator Work Card Approval: `operator_approval` with work-card approval scope
- Implementer Execution: `implementer_report`
- Architect Review: `architect_review`
- Operator Validation: `operator_validation`
- Candidate Disposition: `candidate_disposition`

### Phase closeout and next-phase gates

- Phase Closeout: `phase_closeout`
- Operator Phase Closeout Approval: `operator_approval` with phase-closeout approval scope
- Roadmap Update / Rebaseline: migrate to `project_roadmap` unless `roadmap_rebaseline` is explicitly formalized in the protocol and resolver rules
- Next Phase Activation: `phase_activation`

### Non-gating evidence

These may remain as context or diagnostics, but must not advance the process map by themselves:

- `supporting_document`
- `design_document`
- `project_state`
- `project_observation_register`
- `artifact_registry`
- `workflow_state`

## Required Artifact Migration Scope

The migration scope is all process-gating artifacts required to resolve the current project state from Project Intake through the current Phase 06 Work Card chain.

At minimum, inspect and migrate governing artifacts under:

- `planning/project/`
- `planning/phases/phase-01/`
- `planning/phases/phase-02/`
- `planning/phases/phase-03/`
- `planning/phases/phase-04/`
- `planning/phases/phase-05/`
- `planning/phases/phase-06/`

The Implementer Report must include a migration inventory table with, for every gating artifact reviewed:

- current path;
- current artifact ID;
- current artifact type;
- current gate role;
- target artifact type;
- whether it is controlling, duplicate, abandoned, or non-gating;
- action taken: migrated in place, superseded as duplicate, left non-gating, or blocked for Architect disposition;
- reason.

## Required Code Migration Scope

Update the resolver, process contract, and tests so the runtime consumes the new protocol rather than preserving old names.

Required code review scope:

- `src/main/workflow/relationshipDrivenWorkflowResolver.ts`
- `src/shared/workflow/processContract.ts`
- `src/shared/workflow/workflowContracts.ts`
- `src/main/repository/verifiedArtifactGraph.ts`
- `src/main/repository/repositoryRefreshService.ts`
- `src/main/projects/projectWorkspaceRegistry.ts`
- any main/preload/renderer current-action surfaces that display or route gate names
- relevant tests under `test/`
- repository gates under `scripts/` if they encode old artifact-type names

## Required Implementation

1. Inventory every process-gating artifact from Project Intake through current Phase 06.
2. Migrate controlling gating artifacts in place to the target protocol.
3. Correct relationships and expected outputs so the chain can be resolved without old term fallback.
4. Update process contract terms to the target protocol.
5. Update relationship resolver logic to consume target protocol terms only.
6. Ensure old gate terms do not remain as live resolver authority.
7. Ensure generic `approval` is not retained as an unbounded compatibility fallback.
8. Ensure `operator_approval` carries enough scope/decision metadata for project, phase, Work Card, and phase-closeout approvals.
9. Ensure `operator_validation` replaces old validation gate terminology for live resolver decisions.
10. Decide and document whether existing `roadmap_rebaseline` artifacts are migrated to `project_roadmap` or formally added to the supported protocol.
11. Fix workspace display-name derivation so generic document titles such as `Project Profile` are not shown as project names.
12. If a controlling gate cannot be migrated safely, stop and report the exact artifact and contradiction before continuing.

## Required Tests

Add or update automated tests proving:

- the resolver can replay or resolve the governing chain from Project Intake through current Phase 06 without falling back to Phase 01 planning, Phase 04 Work Card authoring, or Phase 06 Operator Phase Approval when those gates already have migrated evidence;
- old terms such as `phase_approval`, `project_approval`, `work_card_approval`, and `phase_closeout_approval` are not accepted as live resolver authority after migration;
- generic `approval` is not accepted as unscoped approval authority;
- scoped `operator_approval` advances project, phase, Work Card, and closeout approval gates when relationships and decision data are valid;
- controlling validation gates use `operator_validation`;
- repair Work Cards use `work_card` plus repair metadata, not a separate live `repair_work_card` type;
- no gating artifact is marked historical merely to bypass a resolver gate;
- duplicate or abandoned artifacts may be superseded only when a valid controlling artifact remains;
- current Phase 06 state resolves to the correct next Work Card loop state or a true blocker, not to an already-completed approval gate;
- active project dropdown does not display `Project Profile` when better project/repository identity is available.

## Required Implementer Report

Create:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC02-REPAIR02_full_gating_artifact_protocol_migration_project_display_name_repair.{json,md}`

Artifact ID:

`champcity-ai/phase-06/implementer_report/WC02-REPAIR02`

The report must include:

- repo, branch, and remote verification;
- Work Card and approval artifacts read;
- protocol migration inventory;
- artifacts migrated in place;
- artifacts superseded or marked historical, with reason proving they were not controlling gates;
- artifacts left unchanged as non-gating evidence;
- code files changed;
- tests added or updated;
- validation commands and results;
- residual risks;
- final git status;
- commit hash.

## Acceptance Criteria

- All controlling process-gating artifacts from Project Intake through current Phase 06 use the target protocol.
- No required gate is bypassed by marking a controlling artifact historical.
- The resolver and process contract consume target protocol terms, not old terms or generic fallback terms.
- The resolver does not route backward to Phase 01 planning, Phase 04 Work Card authoring, or Phase 06 Operator Phase Approval when migrated evidence proves those gates are complete.
- The app reaches the correct current Work Card loop state or blocks for a true unresolved migrated-protocol defect.
- The active project dropdown no longer displays `Project Profile` for this repository.
- Operator validation remains visible-only and requires no Markdown/JSON editing.

## Manual Validation After Implementer

Operator validation must be limited to visible app behavior:

1. Launch or refresh ChampCity_AI.
2. Confirm the selected project displays a meaningful project/repository name, not `Project Profile`.
3. Confirm the current action does not route backward to Phase 01 planning.
4. Confirm the current action does not route backward to stale Phase 04 work.
5. Confirm the current action does not ask for Phase 06 Operator Phase Approval if the migrated approval evidence exists.
6. Confirm the app shows the correct current Work Card loop state or a clear true blocker.
7. Confirm no Ad Hoc Work Card Capture is presented as normal recovery for migrated historical evidence.
8. Confirm no manual Markdown/JSON artifact editing is required for validation.
