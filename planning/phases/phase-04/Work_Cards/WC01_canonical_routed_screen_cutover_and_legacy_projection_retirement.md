<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-04/work_card/WC01",
  "artifactType": "work_card",
  "createdAt": "2026-07-15T18:00:00.000Z",
  "jsonPath": "planning/phases/phase-04/Work_Cards/WC01_canonical_routed_screen_cutover_and_legacy_projection_retirement.json",
  "markdownPath": "planning/phases/phase-04/Work_Cards/WC01_canonical_routed_screen_cutover_and_legacy_projection_retirement.md",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: WC01 Canonical Routed-Screen Cutover and Legacy Projection Retirement"
  },
  "payloadHash": "sha256:a9b9dc6baeb5b6a7f22ada7e45b643fdc9d586086f0676f376cfa32b8f50ea0d",
  "phaseId": "phase-04",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-04/implementer_report/WC01"
    ],
    "sources": [
      "champcity-ai/phase-04/phase_planning/Phase_Planning",
      "champcity-ai/phase-04/work_card_plan/Work_Card_Plan",
      "champcity-ai/phase-03/validation_report/WC09-REPAIR02"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-15T18:00:00.000Z",
  "workCardId": "WC01"
}
-->

# Work Card: WC01 — Canonical Routed-Screen Cutover and Legacy Projection Retirement

Status: ready_for_implementer
Phase: phase-04 — Workflow Authority Cutover and Operator Recovery Stabilization
Risk: critical
Change Strategy: Replace with migration
Repair policy: Maximum one numbered repair; after that, block and escalate to Phase 04 stabilization disposition.

## Purpose

Remove the split-brain runtime authority that allows canonical Workflow State to select the correct routed screen while the legacy `CurrentRequiredAction` projection supplies incomplete or conflicting binding data.

The current production failure is the WC09-REPAIR02 Architect Review screen. Canonical state identifies the correct Work Card, Implementer Report, and expected Architect Review, but the screen reports missing title, no associated report, and no expected output.

## Target State

- `RoutedActionContract` is the sole authority for routed-screen action, role, target artifact ID, source artifact IDs, expected output artifact ID/type, blockers, and routes.
- Artifact paths, titles, Work Card IDs, and filenames are resolved from canonical Artifact Registry entries.
- Routed screens do not depend on legacy status-string, filename, directory-order, or manually reconstructed workflow state.
- `CurrentRequiredAction` may remain only as a presentation projection derived from canonical authority. It cannot authorize, initialize, block, preview, save, or advance a routed action.
- The exact WC09-REPAIR02 Architect Review scenario opens, previews, saves, and transitions to Operator Validation.

## Required Work

1. Inventory every routed screen and service that consumes `CurrentRequiredAction`, route-context reconstruction, or legacy Work Card state.
2. Define one routed-screen view model derived only from `RoutedActionContract` plus Artifact Registry resolution.
3. Refactor Architect Review first, then apply the same authority boundary to all routed process screens affected by the shared adapter.
4. Remove independent workflow reconstruction from routed write/preview paths.
5. Remove obsolete fallback and compatibility code whose only purpose is preserving the conflicting authority path.
6. Preserve read-only presentation summaries only when derived from canonical state.
7. Add explicit blocking when canonical IDs cannot resolve to one synchronized authoritative pair.
8. Update architecture documentation and repository gates to prevent routed screens from importing legacy authority evaluators.

## Mandatory Checkpoints

### Checkpoint 1 — Authority cutover design

Before broad edits, document the current split-brain call path, canonical replacement path, legacy code to remove, presentation-only code to preserve, affected screens, and tests for the real production path. Stop if a new product decision is required.

### Checkpoint 2 — Architect Review production path

Implement the canonical binding path for Architect Review and prove the exact WC09-REPAIR02 scenario in mounted Electron coverage. Do not continue to generalized cleanup until this passes.

### Checkpoint 3 — Shared routed-screen cutover

Apply the shared canonical adapter to other routed screens that use the same legacy projection boundary. Do not redesign unrelated screens.

### Checkpoint 4 — Legacy authority retirement

Delete or isolate obsolete runtime authority code. Add repository gates preventing routed preview/save handlers from importing or invoking independent workflow reconstruction.

### Checkpoint 5 — Full validation

Run full approved validation lanes and produce the Implementer Report pair.

## Acceptance Criteria

1. WC09-REPAIR02 Architect Review opens with the exact Work Card title.
2. The exact WC09-REPAIR02 Implementer Report is automatically associated.
3. The exact expected Architect Review output is identified.
4. Preview works without manual report selection.
5. Save creates the canonical Architect Review pair.
6. Save advances to Operator Validation.
7. Reference navigation cannot alter the routed binding.
8. Routed preview/save uses `RoutedActionContract` and Artifact Registry resolution.
9. `CurrentRequiredAction` is not a routed authority.
10. No routed screen reconstructs authority from statuses, filenames, directory order, or historical first-match logic.
11. Missing registry authority blocks clearly instead of falling back.
12. Obsolete authority/fallback code is removed rather than retained in parallel.
13. Mounted Electron tests exercise the same adapter used by production.
14. Existing artifact-pair, registry, role-gate, migration, and context-packet tests remain green.
15. No more than one repair may be created for this Work Card. A second failure blocks WC01 and requires Phase 04 stabilization disposition.

## Out of Scope

- Operator override UI.
- Repair-limit application UI.
- Broad shell redesign.
- Provider integrations.
- Multi-project support.
- General Phase 03 cleanup unrelated to routed authority cutover.

## Required Report

Create:

planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC01_canonical_routed_screen_cutover_and_legacy_projection_retirement.md

and its synchronized JSON pair.

## Branch

Base:
feature/phase-03-wc09-repair02-process-contract-evidence-precedence

Target:
feature/phase-04-wc01-canonical-routed-screen-cutover

Commit:
Cut over routed screens to canonical authority
