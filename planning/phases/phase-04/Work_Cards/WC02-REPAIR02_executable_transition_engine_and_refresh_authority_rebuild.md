<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-04/work_card/WC02-REPAIR02",
  "artifactType": "work_card",
  "createdAt": "2026-07-16T16:30:00.000Z",
  "jsonPath": "planning/phases/phase-04/Work_Cards/WC02-REPAIR02_executable_transition_engine_and_refresh_authority_rebuild.json",
  "markdownPath": "planning/phases/phase-04/Work_Cards/WC02-REPAIR02_executable_transition_engine_and_refresh_authority_rebuild.md",
  "parentArtifactId": "champcity-ai/phase-04/work_card/WC02",
  "payload": {
    "kind": "work_card",
    "title": "Repair Work Card: WC02-REPAIR02 Executable Transition Engine and Refresh Authority Rebuild"
  },
  "payloadHash": "sha256:5cf28615e8a0f878fee40580b162e6449b17def7b49aeddf9eee8c2bc33cdffc",
  "phaseId": "phase-04",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-04/implementer_report/WC02-REPAIR02-executable-transition-engine-and-refresh-authority-rebuild"
    ],
    "sources": [
      "champcity-ai/phase-04/work_card/WC02",
      "champcity-ai/phase-04/implementer_report/WC02-architect-bridge-current-action-surface-audit",
      "champcity-ai/phase-04/architect_review/WC02",
      "champcity-ai/phase-04/work_card/WC02-REPAIR01",
      "champcity-ai/phase-04/implementer_report/WC02-REPAIR01-architect-bridge-contract-alignment-task-packet-generation-repair",
      "champcity-ai/phase-04/architect_review/WC02-REPAIR01"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-16T19:10:00.000Z",
  "workCardId": "WC02-REPAIR02"
}
-->

# Repair Work Card: Phase 04 WC02-REPAIR02 Executable Transition Engine and Refresh Authority Rebuild

Status: ready_for_implementer
Phase: phase-04 — Workflow Authority Cutover and Operator Recovery Stabilization
Parent Work Card: WC02 — Architect Bridge, Current-Action Surface Audit, and Embedded ChatGPT Browser
Repair identity: champcity-ai/phase-04/work_card/WC02-REPAIR02
Repair classification: systemic transition-authority rebuild
Acceptance target: parent WC02 can advance through Operator Validation using repository evidence without manual artifact surgery

## Authority

This Work Card is authorized because WC02 and WC02-REPAIR01 did not clear the original Phase 03 WC09 blocker. The visible blocked state changed shape, but the underlying defect remains: the application does not have a single executable transition authority that consumes verified canonical evidence and advances the process map deterministically.

The app remains blocked on `architect_review_of_implementer_report_required` for WC02 even after the exact expected Architect Review artifact pair exists at the routed expected path. A separate refresh symptom also appeared: `Configured project champcity-ai was not found.` These failures show that route binding, repository refresh, project registry state, artifact scanning, and workflow projection are still not operating as one system.

This pass is not a narrow WC02 artifact patch. It is a ground-up rebuild of the workflow transition engine and refresh authority across the locked process map.

## Absolute Design Rule: No Fallbacks

Do not preserve historical runtime compatibility paths. Do not add fallback readers, fallback route reconstruction, legacy status interpretation, filename-order inference, stale Workflow State fallback, manually selected reference-card fallback, or compatibility wrappers around broken authority.

If an existing artifact shape, path, or relationship is incompatible with the new engine, migrate it with an explicit migration manifest and canonical rewritten artifact pair. Do not make runtime code support both old and new interpretations.

Historical records may remain as archived evidence, but active runtime authority must use one current canonical contract only.

## Process Map Scope

The new transition engine must cover the complete locked process map:

Project Intake -> Project Interview -> Reconciliation Review -> Project Mapping -> Operator Project Approval -> Phase Mapping -> Operator Phase Approval -> Work Card Loop -> Phase Closeout -> Operator Phase Closeout Approval -> Roadmap Update -> Next Phase Activation -> Repeat Phase Mapping / Work Card Loop.

The Work Card Loop must include Work Card authoring, Implementer execution, Architect review, Operator validation, repair Work Card creation, repair execution, combined parent/final repair review, parent Operator validation, candidate disposition, and next candidate or closeout routing.

## Required Work

1. Replace the current hand-coded projection path with one executable transition engine derived from the locked process contract.
2. Make repository refresh rebuild the verified artifact graph and current action from repository evidence every time, without stale in-memory project loss or stale renderer binding authority.
3. Ensure `ProjectWorkspaceRegistry`, `RepositoryRefreshService`, `VerifiedArtifactGraph`, `EvidenceDerivedWorkflowProjector`, `RoutedActionService`, and `RoutedProcessInvocationService` share one authority model.
4. Remove or isolate all independent transition inference from `currentActionRouteTable`, renderer state, file path bindings, cached Workflow State, and reference navigation.
5. Treat artifact ID as authority. Paths are physical pair locations only. The engine must resolve the controlling synchronized pair for an artifact ID and advance if the exact expected output artifact exists.
6. Fix refresh so `Configured project champcity-ai was not found` cannot occur for an active selected project during manual refresh, observer refresh, project switch, restart, or rebuild.
7. Fix branch/project display so UI branch, selected project, observer status, and current action come from the latest successful scan and cannot display stale branch metadata.
8. Build a transition table or equivalent executable model that defines each action, required sources, expected output, success/failure/repair routes, role, screen, and advancement rule.
9. Generate tests from the same transition model the application uses. Do not maintain a separate test-only model.
10. Include the current real Phase 04 WC02 blocked repository state as a regression fixture. Validation must fail if `architect_review/WC02` exists and is valid but the app remains on `architect_review_of_implementer_report_required`.
11. Add coverage for every top-level process-map transition, not only WC02.
12. Add coverage for every Work Card Loop transition including parent/final-repair acceptance.
13. Add repository gates that fail if production transition routing imports deleted fallback modules or performs filename/status/order inference.
14. Remove obsolete transition code rather than leaving it dormant. Record deletions and migrations in the Implementer Report.
15. If active artifacts need rewriting to match the new engine, create a migration manifest and synchronized replacement artifacts. Do not add runtime support for the old shape.

## Current Failure Evidence to Preserve as Regression

The current live application remains blocked on:

- action: `architect_review_of_implementer_report_required`
- phase: `phase-04`
- work card: `WC02`
- expected output artifact type: `architect_review`
- expected output path: `planning/phases/phase-04/Architect_Reviews/ARCHITECT_REVIEW_WC02_architect_bridge_current_action_surface_audit_and_embedded_chatgpt_browser.md`

The exact expected Architect Review pair exists and is active, with artifact ID:

`champcity-ai/phase-04/architect_review/WC02`

The application still does not advance to Operator Validation for WC02. This is the mandatory regression to fix.

## Required Acceptance

1. Manual refresh never loses the selected project.
2. Restart and rebuild preserve selected project identity and branch display.
3. UI branch/project/status are derived from the latest successful scan.
4. The scanner detects the controlling pair for an artifact ID even when the physical path changes through a governed migration.
5. If the exact expected output artifact exists as a valid controlling pair, the transition engine advances without requiring the Operator to resave it.
6. WC02 current live evidence advances from Architect Review to Operator Validation for WC02.
7. The expected next output after WC02 Architect Review is `champcity-ai/phase-04/validation_report/WC02`.
8. No hidden Workflow State cache can override newer repository evidence.
9. Reference navigation cannot alter routed authority.
10. Renderer binding can block stale writes but cannot select the current action.
11. All process-map transitions have executable tests derived from the same transition model.
12. Full validation fails if any top-level process-map action lacks a transition rule.
13. Full validation fails if any routed screen derives target, source, expected output, role, or next route from file order, display string, stale cache, or fallback status.
14. No fallback compatibility code is added.
15. Existing incompatible artifacts are migrated or archived, not worked around.
16. Mounted Electron validation starts from the real current Phase 04 evidence state and proves the app reaches Operator Validation for WC02.
17. Existing WC01 completed-via-repair evidence continues to advance correctly.
18. The final Implementer Report includes a deletion ledger, migration ledger, transition coverage matrix, fixture list, commands run, skipped checks, and residual risks.

## Out of Scope

- Visual redesign unrelated to current-action workflow authority.
- ChatGPT DOM automation.
- Provider API integration.
- Implementer/Codex integration.
- New recovery override UI.
- Broad branding or styling changes.
- Phase closeout or roadmap update artifacts.
- Commit, merge, push, tag, or release unless explicitly requested by the Operator.

## Required Output

Create the synchronized Implementer Report pair:

`planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC02-REPAIR02_executable_transition_engine_and_refresh_authority_rebuild.{json,md}`

Canonical Implementer Report artifact:

`champcity-ai/phase-04/implementer_report/WC02-REPAIR02-executable-transition-engine-and-refresh-authority-rebuild`

## Required Validation

Use `docs/dev/VALIDATION_COMMAND_LANES.md`.

Run at minimum:

- full TypeScript/build validation
- full unit suite
- repository gates
- mounted Electron validation
- new process-map transition suite
- current real Phase 04 WC02 blocked-state regression
- restart/rebuild selected-project regression
- refresh selected-project regression
- branch display freshness regression
- stale renderer-binding regression
- migration manifest validation if artifacts are rewritten

Playwright remains out of scope unless already configured and explicitly required by existing project validation.
