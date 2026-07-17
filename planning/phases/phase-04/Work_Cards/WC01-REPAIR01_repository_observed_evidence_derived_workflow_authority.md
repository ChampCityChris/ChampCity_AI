<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-04/work_card/WC01-REPAIR01",
  "artifactType": "work_card",
  "createdAt": "2026-07-15T21:21:26.810Z",
  "jsonPath": "planning/phases/phase-04/Work_Cards/WC01-REPAIR01_repository_observed_evidence_derived_workflow_authority.json",
  "markdownPath": "planning/phases/phase-04/Work_Cards/WC01-REPAIR01_repository_observed_evidence_derived_workflow_authority.md",
  "parentArtifactId": "champcity-ai/phase-04/work_card/WC01",
  "payload": {
    "kind": "work_card",
    "title": "Repair Work Card: Phase 04 WC01-REPAIR01 Repository-Observed Evidence-Derived Workflow Authority"
  },
  "payloadHash": "sha256:04734418c30a6aa9d40258500150db846828a9ffc57b96b25a3b5f1b0d16914c",
  "phaseId": "phase-04",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-04/implementer_report/WC01-REPAIR01-repository-observed-evidence-derived-workflow-authority"
    ],
    "sources": [
      "champcity-ai/phase-04/architect_review/WC01",
      "champcity-ai/phase-04/architecture_decision/WC01",
      "champcity-ai/phase-04/diagnostic_report/WC01",
      "champcity-ai/phase-04/work_card/WC01"
    ],
    "supersedes": []
  },
  "revision": 3,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-15T23:22:41.104Z",
  "workCardId": "WC01-REPAIR01"
}
-->

# Repair Work Card: Phase 04 WC01-REPAIR01 Repository-Observed Evidence-Derived Workflow Authority

Status: ready_for_implementer
Phase: phase-04 — Workflow Authority Cutover and Operator Recovery Stabilization
Parent Work Card: WC01 — Canonical Routed-Screen Cutover and Legacy Projection Retirement
Repair identity: champcity-ai/phase-04/work_card/WC01-REPAIR01
Repair limit: only and final permitted repair for WC01
Acceptance target: parent WC01 as completed_via_repair

## Authority

Implement the approved repository-observed, evidence-derived, multi-project architecture. The controlling sources are the WC01 repository diagnostic, the WC01 Architect Review, this repair handoff, and the Operator-approved architecture decision. This Work Card completely replaces the rejected unregistered WC01-REPAIR01 pair. Do not create WC01-REPAIR02.

## Required architecture

Configured Project + Repository Observer / Manual Refresh → Verified Artifact Graph + Explicit Operator Decision Overlay + Locked Process Contract → Evidence-Derived Workflow Projector → Current Required Action → Routed UI.

There must be exactly one production workflow-authority path. A persisted workflow snapshot is a cache or diagnostic projection only and may never contradict newer verified repository evidence.

## Checkpoint 1 — deletion and replacement plan

Before broad code changes, record in the draft Implementer Report the code to delete, code to preserve, replacement components, and proof that no second action selector remains. Delete legacy CurrentRequiredAction authority evaluation, status-string and filename/directory-order authority, obsolete compatibility adapters and fixtures, snapshot-driven runtime selection, and hard-coded single-project architecture. Preserve canonical pair verification, process contracts, role gates, evidence precedence, explicit decisions, useful routed metadata, UI presentation, history, and isolated offline migration utilities.

## Checkpoint 2 — multi-project workspace foundation

Implement a persistent project workspace registry with projectId, displayName, repositoryRoot, planningRoot, configured branch behavior, enabled status, createdAt, updatedAt, lastOpenedAt, lastScanAt, lastScanResult, and observer status. Support adding and validating a repository, listing projects, selecting and persisting the active project, switching without restart, migration of the current project, and strict per-project isolation. Provide a minimal functional project-selection UI.

## Checkpoint 3 — repository observer and refresh

Implement automatic observation and explicit Refresh Repository State. Debounce related Markdown/JSON writes, ignore transaction files, verify stable complete pairs, surface invalid/incomplete pairs, rescan after branch changes, focus/reopen, and project switching, and report watcher health, scan time, added/changed/removed artifacts, blockers, and resulting action. Do not import or mutate external artifacts.

## Checkpoint 4 — verified artifact graph

Build one selected-project in-memory graph from canonical pair verification, artifact identity, relationships, status, revision, project/phase/Work Card/parent identities, and explicit authority rules. Detect incomplete and unsynchronized pairs, duplicate authority, relationship conflicts, and historical-versus-controlling evidence. Discover external canonical pairs without requiring prior app registration. Treat the Artifact Registry as derived index/cache.

## Checkpoint 5 — evidence-derived workflow projector

Implement one projector whose inputs are selected-project configuration, verified graph, locked process contract, explicit decisions, repair policy, and role gates. Output one routed action with responsible role, exact target/sources/output, routes, blockers, phase, active Work Card, candidate status, closeout eligibility, projection revision, and evidence used. Exact expected outputs advance the workflow; external Implementer Reports route to Architect Review; authorized Architect Reviews route to Operator Validation; governed Validation Reports advance per disposition; ambiguity and invalid evidence block; repair limits hold; restart and project switching recompute deterministically; unchanged scans are no-ops.

WORKFLOW_STATE_INDEX is a derived cache/diagnostic snapshot only and cannot override evidence.

## Checkpoint 6 — remove legacy authority

Remove production use of legacy CurrentRequiredAction selection, duplicate action selectors, report-status and filename/directory-order authority, stale-startup snapshot authority, contradictory tests, boundary-skipping mounted fixtures, and compatibility wrappers without active consumers. Add a repository gate prohibiting legacy authority imports in production routing/projection code.

## Checkpoint 7 — UI refresh and guidance

After observation or refresh, recompute and immediately update Current Action and routed workspace. Show active project, safe local repository root, observer health, changes, advancement evidence, blockers, and resulting action. A routed in-app write must use the same refresh/projector path as an external write. No restart or manual import is permitted.

## Checkpoint 8 — production reconstruction

Using the existing unchanged WC01 Implementer Report, derive action architect_review_of_implementer_report_required, target champcity-ai/phase-04/work_card/WC01, source champcity-ai/phase-04/implementer_report/WC01, and expected output champcity-ai/phase-04/architect_review/WC01. Do not rewrite or revise the report or manually edit Workflow State. Prove restart, switch-away-and-back, manual refresh, watcher rescan, branch refresh, and repeated no-change scan.

## Checkpoint 9 — parent WC01 readiness

Revalidate all original WC01 requirements and the replacement architecture, including one authority path, observation and manual refresh, multi-project isolation, exact routing, explicit decisions, legacy deletion, stale-cache non-authority, WC09-REPAIR02 regression, Architect Review preview/save, Operator Validation routing, reference-navigation isolation, restart, invalid-pair blocking, and watcher/manual equivalence. The Implementer must not perform Operator acceptance.

## Required validation

Use docs/dev/VALIDATION_COMMAND_LANES.md and the approved normal Windows lane. Add focused unit, repository-gate, and real main/preload/renderer/Electron coverage for configured projects, persistence and isolation, observer/debounce/manual/branch refresh, graph blockers, external Implementer Report/Architect Review/Operator Validation detection, explicit decisions, repair limits, WC01 reconstruction, WC09 regression, restart, switching, unchanged-scan no-op, stale cache, legacy import prohibition, actual process relaunch, UI refresh, Architect Review, and Operator Validation. Production-path tests must begin before the failure boundary and use the real service topology.

## Deliverables

- Architecture replacement and legacy deletion.
- Canonical Implementer Report pair at planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_repository_observed_evidence_derived_workflow_authority.{md,json}.
- Deletion ledger, acceptance matrix, production/restart/switch/invalid-pair results, commands, skipped checks, risks, dirty files, Git status, and parent-WC01 readiness conclusion.
- Commit only to feature/phase-04-wc01-repair01-evidence-derived-workflow with message: Replace snapshot authority with repository evidence projection.

Canonical Implementer Report artifact: champcity-ai/phase-04/implementer_report/WC01-REPAIR01-repository-observed-evidence-derived-workflow-authority
