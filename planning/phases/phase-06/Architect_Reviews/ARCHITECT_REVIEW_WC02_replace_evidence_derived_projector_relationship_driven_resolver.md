<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/architect_review/WC02",
  "artifactType": "architect_review",
  "schemaVersion": "champcity.artifact.v1",
  "revision": 1,
  "status": "accepted_for_operator_validation",
  "projectId": "champcity-ai",
  "phaseId": "phase-06",
  "workCardId": "WC02",
  "createdAt": "2026-07-17T14:52:00.000Z",
  "updatedAt": "2026-07-17T14:52:00.000Z",
  "jsonPath": "planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC02_replace_evidence_derived_projector_relationship_driven_resolver.json",
  "markdownPath": "planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC02_replace_evidence_derived_projector_relationship_driven_resolver.md",
  "parentArtifactId": "champcity-ai/phase-06/implementer_report/WC02",
  "payloadHash": "sha256:4054b8748f3e453a4740ac750483a140e742855ed5648af7f417ec40095b2455",
  "relationships": {
    "sources": [
      "champcity-ai/phase-06/work_card/WC02",
      "champcity-ai/phase-06/approval/WC02",
      "champcity-ai/phase-06/implementer_report/WC02",
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory",
      "champcity-ai/phase-06/candidate_disposition/WC01"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-06/validation_report/WC02"
    ],
    "supersedes": [],
    "children": []
  },
  "payload": {
    "kind": "architect_review",
    "title": "Architect Review: Phase 06 WC02 Replace Evidence Projector With Relationship Resolver"
  }
}
-->

# Architect Review: Phase 06 WC02 Replace Evidence Projector With Relationship Resolver

Status: accepted_for_operator_validation
Phase: phase-06
Work Card: WC02
Reviewed Implementer Report: champcity-ai/phase-06/implementer_report/WC02
Reviewed implementation commit: `21f26ba3e00c430384174462dbb11b4294787535`
Decision: accepted for Operator validation

## Review Summary

The WC02 implementation is accepted for Operator validation.

The implementation removes the old `evidenceDerivedWorkflowProjector.ts` runtime authority path, introduces `relationshipDrivenWorkflowResolver.ts`, rewires repository refresh to consume the resolver, updates the workflow binding source to `relationship_resolver`, and adds focused resolver tests for exact expected-output binding, blocker behavior, duplicate/unsynchronized evidence, stale cache non-authority, and repository refresh integration.

The implementation is not a final Phase 06 kernel endpoint. It is an acceptable WC02 replacement step. WC03, WC04, and WC05 still own replay fixtures, no-fallback repository gates, Artifact Registry / Workflow State diagnostic boundaries, and the UI/current-action adapter boundary.

## Sources Reviewed

- `champcity-ai/phase-06/work_card/WC02`
- `champcity-ai/phase-06/approval/WC02`
- `champcity-ai/phase-06/implementer_report/WC02`
- `champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory`
- `champcity-ai/phase-06/candidate_disposition/WC01`
- Commit `21f26ba3e00c430384174462dbb11b4294787535`

## Changed-File Scope Reviewed

The reviewed commit created the relationship resolver and WC02 report, deleted the old projector file by rename/replacement, rewired repository refresh, updated workflow contracts and validation, updated relevant smoke scripts and repository gate references, and added focused resolver tests.

Notable reviewed paths:

- `src/main/workflow/relationshipDrivenWorkflowResolver.ts`
- `src/main/workflow/evidenceDerivedWorkflowProjector.ts` deleted/renamed out of production source
- `src/main/repository/repositoryRefreshService.ts`
- `src/main/workflow/index.ts`
- `src/shared/workflow/workflowContracts.ts`
- `src/shared/workflow/workflowValidation.ts`
- `scripts/verify-wc09-repository-gates.mjs`
- `test/wc01-repair01/evidence-workflow.test.cjs`
- `test/wc02-repair02/executable-transition-engine.test.cjs`
- `test/wc02/architect-bridge.test.cjs`

## Acceptance Findings

1. Old-authority removal: accepted. The old `evidenceDerivedWorkflowProjector.ts` file is no longer present as that production source module, the production export was removed, repository refresh no longer imports or constructs the old projector, and the runtime binding source was changed from `evidence_projection` to `relationship_resolver`.

2. Relationship-driven current action: accepted for WC02. The resolver now depends on verified artifact graph evidence, explicit `relationships.expectedOutputs`, controlling artifacts, and process contract action definitions. The implementation blocks when exact expected-output binding is missing rather than synthesizing the previous report/review/validation IDs.

3. Blocking model: accepted for WC02. The tests exercise missing expected-output binding, ambiguous validation evidence, duplicate artifact IDs, unsynchronized pairs, and stale cache non-authority.

4. Repository refresh integration: accepted. `RepositoryRefreshService` now constructs and consumes `RelationshipDrivenWorkflowResolver` output.

5. Artifact Registry and Workflow State boundary: accepted for WC02 only. Tests show stale registry/workflow-state artifacts do not override verified graph evidence. The broader diagnostic/cache boundary remains WC04-owned.

6. No-fallback evidence: accepted with WC03 follow-up. The repository gate now includes `single_relationship_resolver_runtime_authority`, which passed. The old WC09 `git_changed_file_scope` gate still fails against the historical base branch; that is a known repository-gate scope issue and remains WC03-owned.

## Validation Performed By Architect

I ran the MCP project validation test lane after the Implementer commit.

Result: build and unit tests passed; full validation failed only at the legacy `git_changed_file_scope` repository gate.

Specific validation evidence:

- `npm run build`: passed inside the full test lane.
- `node --test` unit suite: 58 tests passed, 0 failed.
- `single_relationship_resolver_runtime_authority` repository gate: passed.
- `canonical_registry_pairs`, runtime boundary, routed screen authority boundary, workspace authority, local path, secret, generated junk, and provider dependency gates: passed.
- `git_changed_file_scope`: failed against the old `feature/phase-03-wc09-repair02-process-contract-evidence-precedence` base and listed Phase 05/06 planning artifacts as outside WC09 scope. This is not treated as a WC02 implementation defect.

Repository status after Architect validation: clean.

## Residual Risks Carried Forward

- `WorkflowStateIndex` remains the compatibility DTO for presentation/IPC. WC04/WC05 must narrow the diagnostic/cache and UI adapter boundary.
- `transitionEngine.ts` still contains legacy mutable transition rebinding for transition-engine tests. WC03/WC05 should narrow or replace this if it can become competing authority.
- `canonicalRoutedScreenAdapter.ts` still uses Artifact Registry for read-only routed screen materialization. WC04/WC05 own that boundary.
- The old WC09 repository gate retains a historical changed-file-scope rule. WC03 owns replacing it with Phase 06 replay fixtures and no-fallback repository gates.

## Manual Operator Validation Required

1. Launch or refresh the ChampCity_AI workspace.
2. Confirm the current action is produced from the relationship resolver path, not the deleted evidence projector.
3. Confirm the current action names source artifacts and expected output clearly.
4. Confirm ambiguous or missing evidence produces a visible blocker rather than a guessed action.
5. Confirm reference navigation does not retarget the current action.
6. Confirm no old projector fallback is visible or selectable.
7. Confirm the Implementer Report records the automated validation results and old-authority removal.

## Disposition

WC02 is ready for Operator validation.

No repair Work Card is required from this Architect Review.
