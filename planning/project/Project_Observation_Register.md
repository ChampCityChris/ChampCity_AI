<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/observation_register/Project_Observation_Register",
  "artifactType": "observation_register",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/Project_Observation_Register.json",
  "markdownPath": "planning/project/Project_Observation_Register.md",
  "payload": {
    "kind": "observation_register",
    "title": "Project Observation Register"
  },
  "payloadHash": "sha256:e2927ab9feb3c01b9f590b7c97838f12d47df206b8cdace79308ade20a61edfd",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC08",
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR01",
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR04"
    ],
    "expectedOutputs": [],
    "sources": [
      "champcity-ai/phase-04/phase_closeout/PHASE_04",
      "champcity-ai/phase-05/operator_approval/WC03-roadmap-rebaseline",
      "champcity-ai/phase-05/project_roadmap/WC03",
      "champcity-ai/phase-05/reconciliation_review/WC01",
      "champcity-ai/phase-05/reconciliation_review/WC02",
      "champcity-ai/project/observation/PROJ-OBS-010"
    ],
    "supersedes": []
  },
  "revision": 3,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-17T01:35:00.000Z"
}
-->

# Project Observation Register

Status: Active
Project: ChampCity A/I
Created: 2026-07-14
Last updated: 2026-07-17
Purpose: Cross-phase register for unresolved, deferred, future-scope, or product-level observations discovered during phase execution and Operator validation.

## Governance Rule

Phase Observation Registers record where an observation was discovered and triaged. This Project Observation Register records observations that must remain visible across phase boundaries. Future Work Card creation must review this register and explicitly carry in-scope observations forward or state why none are included.

## Open / Deferred / Future-Scope Observations

### PROJ-OBS-001 - Validation checklist should become editable / structured

- Source phase: phase-03
- Status: Deferred
- Assigned target: Phase 10 validation/evidence governance or scoped validation UI repair.
- Observation: validation checklists should be structured, editable, and focused on observable acceptance criteria.

### PROJ-OBS-002 - Screenshot paste and evidence UI needs cleanup

- Source phase: phase-03
- Status: Deferred
- Assigned target: Phase 10 validation/evidence governance.
- Observation: screenshot paste should be primary, attachment fallback should be cleaner, and evidence should display as usable evidence rather than long path text.

### PROJ-OBS-003 - Multi-project / workspace support does not exist

- Source phase: phase-03
- Status: Future scope / required Alpha dogfooding
- Assigned target: Phase 11 multi-project dogfooding and workspace authority.
- Observation: the application needs multiple real project/workspace support.

### PROJ-OBS-004 - Top workflow/action bars and Supporting Tools are duplicative

- Source phase: phase-03
- Status: Deferred
- Assigned target: Phase 13 UI hardening and workflow cockpit.
- Observation: duplicative action bars and Supporting Tools consume workspace real estate and should be collapsed or consolidated.

### PROJ-OBS-005 - Report review protocol and validation disposition role confusion

- Source phase: phase-03
- Status: Assigned / must remain visible for validation governance
- Assigned target: Phase 10 validation/evidence/repair governance if not already fully resolved by repairs.
- Observation: Implementer Report review and validation disposition must preserve Architect, Implementer, and Operator role boundaries.

### PROJ-OBS-006 - Controlled route recovery is needed when current-action routing is wrong

- Source phase: phase-03
- Status: Assigned / must remain visible for kernel replacement
- Assigned target: Phase 06 kernel and Phase 10 repair governance.
- Observation: routing recovery must be governed by durable evidence and Architect disposition, not unrestricted Operator override.

### PROJ-OBS-007 - Artifact authority and revision governance is undefined

- Source phase: phase-03
- Status: Open / architectural design required
- Assigned target: Phase 06 workflow kernel and artifact protocol replacement.
- Observation: every workflow artifact needs one authoritative revision; authority must not be inferred from suffixes, filesystem order, or timestamps.

### PROJ-OBS-008 - Existing implementation must not create automatic compatibility debt

- Source phase: phase-03
- Status: Open / product architecture required
- Assigned target: Phase 06 and all foundational Work Cards.
- Observation: wrong old code, schemas, screens, and behaviors must be replaced or migrated rather than preserved through unapproved runtime compatibility fallbacks.

### PROJ-OBS-009 - Repaired-parent validation needs routed evidence-bundle association

- Source phase: phase-04
- Status: Deferred / validation UX and evidence-model cleanup
- Assigned target: Phase 10 validation/evidence governance.
- Observation: repaired-parent validation needs routed evidence bundles, not a single Implementer Report association.

### PROJ-OBS-010 - Git process automation and Operator abstraction

- Source phase: phase-04
- Source artifact: `planning/project/Project_Observations/PROJ_OBS_010_git_process_automation_and_operator_abstraction.md`
- Status: Open / product workflow requirement
- Assigned target: Phase 12 Git automation and Operator abstraction.
- Observation: Git should be automated by the application or baked into Architect and Implementer instructions; raw Git should not be a normal end-user responsibility.

## Phase Closeout Requirement

Every phase closeout must include Observation Register reconciliation: confirm all phase observations are resolved, no-action, or represented in this register; list created or updated project-level observations; and identify observations that must influence next-phase activation or next-phase mapping.

## Document Disposition
Document.Status=Pending
