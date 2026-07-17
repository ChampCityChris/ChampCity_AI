<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-04/implementer_report/WC01-REPAIR01-legacy-saved-work-card-schema-retirement",
  "artifactType": "implementer_report",
  "createdAt": "2026-07-16T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_remove_legacy_saved_work_card_schema_and_canonicalize_artifacts.json",
  "markdownPath": "planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_remove_legacy_saved_work_card_schema_and_canonicalize_artifacts.md",
  "payload": {
    "kind": "implementer_report",
    "title": "Remove Legacy Saved Work Card Schema and Canonicalize Artifacts"
  },
  "payloadHash": "sha256:8645ad90dbc2021fa2d9180e6e26930772d281188250b228cf3cbe55b6d070a0",
  "phaseId": "phase-04",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-04/operator_validation/WC01"
    ],
    "sources": [
      "champcity-ai/phase-04/work_card/WC01",
      "champcity-ai/phase-04/work_card/WC01-REPAIR01",
      "champcity-ai/system/migration_manifest/legacy_saved_work_card_schema_retirement"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-16T00:00:00.000Z"
}
-->

# Implementer Report: Remove Legacy Saved Work Card Schema and Canonicalize Artifacts

Status: completed, awaiting Architect and Operator manual validation
Pass type: Architect repair card implementation
Repository path inspected: verified approved repo root
Branch: feature/phase-04-wc01-repair01-evidence-derived-workflow
Remote: origin matched the approved public repository
Intended commit message: Remove legacy saved Work Card schema
Commit created: pending until commit is created
Commit hash: pending until commit is created

## Implementation Summary

Retired production use of the old saved Work Card validation path for canonical Work Card artifacts. The file store now parses canonical champcity.artifact.v1 Work Card pairs, derives the existing selector/view model from artifact identity, payload title, payload data, phaseId, workCardId, parentArtifactId, relationships, and contentMarkdown, and no longer emits the retired validation message for canonical Work Cards.

Added a regression proving canonical Work Cards do not require old top-level fields, repository refresh does not create a blocker from old validation, routed WC01 Architect Review evidence advances to Operator Validation, compatibility diagnostics do not become blockers, and the association warning is absent when routed binding is valid.

Converted all active/runtime-addressable legacy Work Card JSON pairs found in the required inventory to canonical historical artifacts. The full inspected-file inventory and conversion ledger are in planning/system/Migration_Manifests/MIGRATION_MANIFEST_legacy_saved_work_card_schema_retirement.{json,md}.

## Exact Legacy Schema Code Paths Removed From Runtime Routing

- src/main/workCards/workCardFileStore.ts: readSavedWorkCardFile now reads canonical Work Card artifacts and derives a compatibility view model at the file-store boundary.
- src/main/workCards/workCardFileStore.ts: readSavedWorkCardAssociationFile now returns canonical association fields without old schema validation.
- src/main/workCards/workCardFileStore.ts: readWorkCardValidationTargetFile now builds validation targets from canonical Work Card fields.
- listSavedWorkCards and listHumanValidationTargets now accept canonical Work Cards without producing the retired error message.

Remaining validateWorkCard uses are limited to draft/manual rendering helpers and do not participate in repository refresh, current-action routing, Architect Review binding, Operator Validation binding, or blocker creation.

## Files Created

- planning/system/Migration_Manifests/MIGRATION_MANIFEST_legacy_saved_work_card_schema_retirement.{json,md}
- planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_remove_legacy_saved_work_card_schema_and_canonicalize_artifacts.{json,md}

## Files Modified

- src/main/workCards/workCardFileStore.ts
- test/wc01-repair01/evidence-workflow.test.cjs
- scripts/verify-wc09-repository-gates.mjs
- planning/system/Artifact_Registry/ARTIFACT_REGISTRY.{json,md}
- planning/phases/phase-04/Architect_Reviews/ARCHITECT_REVIEW_WC01_canonical_routed_screen_cutover_and_legacy_projection_retirement.{json,md}
- 18 historical Phase 01/02 Work Card JSON/Markdown pairs converted to canonical historical artifacts; exact paths and artifact IDs are listed in the migration manifest.

## Files Intentionally Not Created

- No WC01-REPAIR02 Work Card.
- No Operator Operator Validation.
- No completed_via_repair disposition.
- No release tag, deployment, provider SDK, authentication, database, cloud, connector, or MCP integration.

## Inventory And Migration Summary

Dry-run inventory inspected 425 files across planning/project, planning/phases/phase-01, planning/phases/phase-02, planning/phases/phase-03, planning/phases/phase-04, and planning/system. Before conversion it found 135 canonical pairs, 18 legacy saved Work Card JSON pairs, 50 Markdown-only historical/support artifacts, 3 noncanonical JSON-only records, and 32 other noncanonical pairs.

After migration, legacy saved Work Card JSON count is 0, orphan canonical JSON count is 0, verified graph blockers are 0, and the current repository projects WC01 to operator_validation_required with expected output champcity-ai/phase-04/operator_validation/WC01.

## Migration Manifest

Canonical manifest path: planning/system/Migration_Manifests/MIGRATION_MANIFEST_legacy_saved_work_card_schema_retirement.{json,md}.

The manifest records every inspected file, every converted artifact, removed files (none), historical/ignored decisions, artifact IDs changed, registry update evidence, and validation evidence.

## Registry Update Evidence

Artifact Registry was regenerated as a synchronized canonical cache with non-archive, non-self registry entries. Phase 01/02 historical conversion details remain in the migration manifest so the active registry does not republish retired historical filenames. Repository gates passed canonical_registry_pairs with 134 checked and 0 failures.

## Current Route Evidence

A direct verified-graph projection of the real repository returned: currentAction operator_validation_required, target champcity-ai/phase-04/work_card/WC01, expected output champcity-ai/phase-04/operator_validation/WC01, blockers 0, blockingConditions 0.

## Commands Run And Results

- pwd: verified approved repo root.
- git rev-parse --show-toplevel: verified approved repo root.
- git status --short: existing Phase 04 Architect Review pair was dirty before edits; final dirty list reflects this implementation pass.
- git branch --show-current: feature/phase-04-wc01-repair01-evidence-derived-workflow.
- git remote -v: origin matched approved public repository.
- git rev-parse HEAD: 388d1cbe3dd4f114f0b7b916847c51903a18e9d8 before edits.
- Read docs/dev/VALIDATION_COMMAND_LANES.md before validation.
- Dry-run inventory: 425 files inspected; 18 legacy saved Work Card JSON pairs identified.
- Conversion generation: initial sandbox write failed with EPERM; approved normal Windows lane succeeded.
- Repository graph projection probe: passed with operator_validation_required and zero blockers.
- npm run validate:codex:build: sandbox attempt failed with EPERM writing dist; approved normal Windows lane passed.
- Targeted regression node --test test/wc01-repair01/evidence-workflow.test.cjs: sandbox attempt failed with spawn EPERM; approved normal Windows lane passed 11 tests.
- npm run validate:codex:unit: sandbox attempt failed with EPERM writing dist; approved normal Windows lane passed 39 tests.
- npm run test:repository: sandbox attempt failed with spawn EPERM; approved normal Windows lane passed all gates.
- npm run validate:codex: approved normal Windows lane passed build, unit, repository, and mounted Electron validation.

## Validation Performed

- Build validation passed.
- Targeted canonical Work Card parsing/routing regression passed.
- Targeted real repository projection showed WC01 Operator Validation route with no blockers.
- Unit suite passed: 39 passed, 0 failed.
- Repository gates passed: all gates ok.
- Full validation passed, including mounted Electron initial-save and restart modes.

## Validation Skipped And Reason

No required automated Implementer validation was skipped. Operator acceptance, manual visual validation, final Human Validation acceptance, parent WC01 Operator Validation creation, completed_via_repair disposition, merge, and release tag remain outside Implementer authority.

## Security And Secret Safety

No secrets, credentials, private tokens, .env files, concrete local machine paths, large archives, screenshots, build outputs, or generated junk were added to committed artifacts. Safety scans and repository gates passed.

## Manual Validation Required

The Operator should launch ChampCity A/I, select the project, refresh repository state, confirm blocker count is zero, confirm current action is Operator Validation for WC01, confirm expected output champcity-ai/phase-04/operator_validation/WC01, and confirm the retired saved Work Card validation message and Implementer Report association warning are absent.

## Residual Risks

- Manual Operator validation remains outstanding.
- The static Artifact Registry is a cache; runtime authority continues to come from verified canonical pairs and evidence projection.
- Historical Markdown-only and noncanonical non-Work-Card artifacts remain as ignored support/history material and are documented in the migration manifest.

## Git Actions Performed

Commit and push are pending. Commit hash is pending under the same-commit hash rule. dev, main, and master were not modified.

## Blocking Questions

None.

## Recommended Next Implementer Task

Await Architect review and Operator manual validation of the WC01 Operator Validation route.
