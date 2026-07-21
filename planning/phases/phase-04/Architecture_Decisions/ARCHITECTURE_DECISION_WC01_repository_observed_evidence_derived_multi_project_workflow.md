<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-04/architecture_decision/WC01",
  "artifactType": "architecture_decision",
  "createdAt": "2026-07-15T21:21:26.810Z",
  "jsonPath": "planning/phases/phase-04/Architecture_Decisions/ARCHITECTURE_DECISION_WC01_repository_observed_evidence_derived_multi_project_workflow.json",
  "markdownPath": "planning/phases/phase-04/Architecture_Decisions/ARCHITECTURE_DECISION_WC01_repository_observed_evidence_derived_multi_project_workflow.md",
  "payload": {
    "kind": "architecture_decision",
    "title": "Architecture Decision: Repository-Observed Evidence-Derived Multi-Project Workflow"
  },
  "payloadHash": "sha256:49578e1cec307f1c9a4d6801846244325dad28adc14841bfd44ff021eed0180e",
  "phaseId": "phase-04",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-04/work_card/WC01-REPAIR01"
    ],
    "sources": [
      "champcity-ai/phase-04/architect_review/WC01",
      "champcity-ai/phase-04/diagnostic_report/WC01"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-15T21:21:26.810Z",
  "workCardId": "WC01"
}
-->

# Architecture Decision: Repository-Observed Evidence-Derived Multi-Project Workflow

Status: Operator approved
Phase: phase-04 — Workflow Authority Cutover and Operator Recovery Stabilization
Decision target: WC01 — Canonical Routed-Screen Cutover and Legacy Projection Retirement

## Context

The WC01 repository diagnostic proved that canonical lifecycle artifacts and persisted Workflow State can diverge. An exact, registered Implementer Report can remain unnoticed because normal startup does not recompute the current workflow position, while the renderer accurately displays a stale snapshot. A transaction-only repair would not cover the approved workflow in which an external Implementer writes a canonical pair directly into a configured repository.

## Decision

ChampCity A/I will use one runtime authority path:

Configured Project + Repository Observer / Manual Refresh → Verified Artifact Graph + Explicit Operator Decisions + Locked Process Contract → Evidence-Derived Workflow Projector → Current Required Action → Routed UI.

### 1. Repository observation, not import

ChampCity A/I must observe and verify canonical artifacts already written into a configured repository. The Operator is not required to import an Implementer Report that is already present. A stable scan recognizes the exact expected output, recomputes the workflow projection, routes the next action, and refreshes visible application state.

### 2. Evidence-derived workflow position

Verified repository artifacts are durable evidence. Routine workflow position is computed from canonical verified pairs, artifact relationships and status, the locked process contract, repair policy and role gates, plus explicit Operator decisions that cannot safely be inferred. Watcher activity, scan completion, stale-screen state, and similar operational conditions are runtime state and do not require planning-artifact rewrites.

### 3. Superseded legacy authority is removed

The legacy CurrentRequiredAction evaluator, status-string inference, filename/directory-order inference, stale snapshot authority, and compatibility fallbacks are not independent runtime authority. Superseded code is deleted. A small pure presentation formatter may remain only when it has a specifically named active consumer. Production routing has exactly one selector: the evidence-derived workflow projector.

### 4. Multi-project support is required

Repository observation is scoped through persistent configured-project records rather than a hard-coded ChampCity_AI root. Each project has an ID, display name, repository root, planning root, branch behavior, enabled/active state, selected-project state, observer health, last scan result, independent verified graph, and independent workflow projection. The Operator can add, select, and switch projects without rebuilding or relaunching the app, and one project cannot read or mutate another project.

## Workflow State and Artifact Registry disposition

WORKFLOW_STATE_INDEX becomes a derived cache and diagnostic snapshot. It may store the last projection, evidence IDs, projection revision, cache timestamp, observer state, and blockers, but it cannot override newer verified repository evidence or require a manual transition merely because an artifact appeared.

The Artifact Registry becomes a derived, validated index/cache rebuilt or refreshed from the verified artifact graph. App-owned registration is not the only discovery mechanism.

## Consequences

- External and in-app writes converge on the same refresh and projector path.
- Incomplete, unsynchronized, duplicate, or conflicting authority blocks visibly.
- Unchanged scans are no-ops; restart recomputes the same action.
- Historical evidence remains durable but cannot override later controlling evidence.
- Parent WC01 remains the Operator acceptance target and, on a passing validation, resolves as completed_via_repair.

## Document Disposition
Document.Status=Pending
