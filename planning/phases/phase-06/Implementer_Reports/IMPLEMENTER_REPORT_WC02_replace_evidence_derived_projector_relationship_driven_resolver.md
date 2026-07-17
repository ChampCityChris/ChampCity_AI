<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/implementer_report/WC02",
  "artifactType": "implementer_report",
  "createdAt": "2026-07-17T14:15:00.000Z",
  "jsonPath": "planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC02_replace_evidence_derived_projector_relationship_driven_resolver.json",
  "markdownPath": "planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC02_replace_evidence_derived_projector_relationship_driven_resolver.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC02",
  "payload": {
    "kind": "implementer_report",
    "title": "Implementer Report: Phase 06 WC02 Replace Evidence Projector With Relationship Resolver"
  },
  "payloadHash": "sha256:b4a8685c698601922c2189d4ae52db9fe49316906a86a3064838c3d053890e7d",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/architect_review/WC02"
    ],
    "sources": [
      "champcity-ai/phase-06/work_card/WC02",
      "champcity-ai/phase-06/approval/WC02",
      "champcity-ai/phase-06/candidate_disposition/WC01",
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory",
      "champcity-ai/phase-06/architect_review/WC01-REPAIR01"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-17T14:15:00.000Z",
  "workCardId": "WC02"
}
-->

# Implementer Report: Phase 06 WC02 Replace Evidence Projector With Relationship Resolver

Status: completed
Pass type: numbered Work Card
Phase: phase-06
Work Card: WC02
Canonical artifact ID: champcity-ai/phase-06/implementer_report/WC02
Branch: feature/phase-04-wc01-repair01-evidence-derived-workflow
Intended commit message: Replace evidence projector with relationship resolver
Commit hash: pending until commit is created, because this report is committed with the implementation.

## Repository Path Inspected

Verified approved repo root. Concrete local machine paths are intentionally omitted from this durable report.

## Git Branch And Remote Status

- Branch verified: feature/phase-04-wc01-repair01-evidence-derived-workflow.
- Remote verified: origin points to the approved ChampCity_AI GitHub repository.
- Initial working tree before edits: clean; branch ahead of origin by existing local commits.

## Work Card And Approval Artifacts Read

Read and followed:

- planning/phases/phase-06/Work_Cards/WC02_replace_evidence_derived_workflow_projector_relationship_driven_resolver.{json,md}
- planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC02_replace_evidence_derived_workflow_projector_relationship_driven_resolver.{json,md}
- planning/phases/phase-06/Candidate_Dispositions/CANDIDATE_DISPOSITION_WC01_accept_repaired_wc01_kernel_contract_inventory.{json,md}
- planning/phases/phase-06/Design_Documents/DESIGN_DOCUMENT_WC01_kernel_contract_artifact_protocol_source_authority_replacement_inventory.{json,md}
- planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC01-REPAIR01_wc01_design_document_metadata_and_inventory_completion.{json,md}
- AGENTS.md
- docs/dev/VALIDATION_COMMAND_LANES.md

WC02 status was approved_for_implementer_execution. WC02 Operator approval was active and authorized source-code implementation with remove-only old-authority policy.

## WC01 Replacement Inventory Reviewed

The repaired WC01 Design Document was reviewed as the controlling inventory. WC02 ownership was confirmed for the relationship-driven resolver, old projector replacement, repository refresh integration, process contract alignment, core transition-rule use, and focused no-fallback tests. WC04/WC05 ownership remains for broader Artifact Registry, Workflow State, UI, preload, renderer, and current-action adapter boundary work.

## Scoped Code-Review Checkpoint Findings

- src/main/workflow/evidenceDerivedWorkflowProjector.ts: Replace/Delete. Old primary current-action authority. It selected actions with hard-coded phase/work-card branches and fallback expected-output ID construction. Deleted from production source and replaced by relationshipDrivenWorkflowResolver.ts.
- src/shared/workflow/transitionEngine.ts: WC02-shared migrate/preserve. Transition rules and role/blocker concepts remain useful. Mutable in-memory advancement still contains synthetic rebinding for transition-engine tests, but repository refresh/current-action authority no longer uses it; WC05/WC03 can further narrow this path.
- src/shared/workflow/processContract.ts: Preserve/migrate. The locked process contract remains the transition rule source for action IDs, roles, screens, and expected output types. WC02 did not add new process actions.
- src/shared/workflow/evidencePrecedence.ts: Preserve/migrate. Candidate precedence remains a pure ordering helper and is not imported by repository refresh as an independent authority path.
- src/main/repository/verifiedArtifactGraph.ts: Preserve/migrate. Verified graph remains the evidence source. Scanner blockers for duplicate IDs and unsynchronized pairs are now surfaced through relationship resolver blockers.
- src/main/repository/repositoryRefreshService.ts: Migrate. Refresh was the old projector bridge. It now constructs RelationshipDrivenWorkflowResolver and consumes resolve() output.
- src/main/workflow/routedProcessInvocationService.ts: Preserve for WC02. Routed invocation enforces the current action it receives. No old-projector import existed; it now receives relationship-resolver bindings through refresh.
- src/main/workflow/routedWriteScope.ts: Preserve. Write scope continues to bind writes to the exact routed expected output and remains non-authoritative by itself.
- src/main/workflow/processIpcPolicy.ts: Preserve for WC02/WC05. Static channel policy remains a guard table. It does not compute current action and has no old-projector import.
- src/shared/workflow/workflowContracts.ts: Migrate. Extended blocker vocabulary and replaced evidence_projection binding source with relationship_resolver.
- src/shared/workflow/roleGates.ts: Preserve. Role gates remain valid constraints and block writes when resolver output is blocked or stale.

Additional authority path discovered: scripts/verify-wc09-repository-gates.mjs still required the deleted projector file by name. It was minimally updated to check the relationship resolver file so repository-gate validation does not fail because the approved deletion succeeded. The broader WC09 gate replacement remains WC03-owned.

## Files Created

- src/main/workflow/relationshipDrivenWorkflowResolver.ts
- planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC02_replace_evidence_derived_projector_relationship_driven_resolver.json
- planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC02_replace_evidence_derived_projector_relationship_driven_resolver.md

## Files Modified

- scripts/verify-wc01-mounted-evidence-workflow.cjs
- scripts/verify-wc02-transition-authority-mounted.cjs
- scripts/verify-wc09-repository-gates.mjs
- src/main/repository/repositoryRefreshService.ts
- src/main/workflow/index.ts
- src/shared/workflow/workflowContracts.ts
- src/shared/workflow/workflowValidation.ts
- test/wc01-repair01/evidence-workflow.test.cjs
- test/wc02-repair02/executable-transition-engine.test.cjs
- test/wc02/architect-bridge.test.cjs

## Files Deleted

- src/main/workflow/evidenceDerivedWorkflowProjector.ts

## Files Intentionally Not Created

- No UI-only replacement or renderer retargeting workaround.
- No provider SDKs, databases, cloud services, authentication, deployment automation, MCP integrations, or connector integrations.
- No Workflow State or Artifact Registry authority artifact was created.
- No Operator validation or acceptance record was created.

## Implementation Summary

Implemented RelationshipDrivenWorkflowResolver as the repository-refresh current-action resolver. It consumes VerifiedArtifactGraph nodes, explicit artifact relationships, locked process transition definitions, role/screen/action metadata, and graph blockers. It emits either resolverResult.kind current_action with exact expected output identity or resolverResult.kind blocked with blockers and no write-capable expected output when the relationship binding is missing.

RepositoryRefreshService now calls RelationshipDrivenWorkflowResolver.resolve() instead of the old projector. The routed action binding source is now relationship_resolver. Workflow contracts and validation accept the new binding source and Phase 06 blocker codes. Focused tests prove success and blocked cases.

## Old-Authority Removal

- Deleted src/main/workflow/evidenceDerivedWorkflowProjector.ts.
- Removed the production export from src/main/workflow/index.ts.
- Removed the production import and constructor dependency from src/main/repository/repositoryRefreshService.ts.
- Replaced repository refresh invocation of projector.project(...) with resolver.resolve(...).
- Rewrote tests that imported the old projector to import RelationshipDrivenWorkflowResolver.
- Updated mounted smoke checks from evidence_projection binding source to relationship_resolver.
- Verified rg over src, test, and scripts found no executable references to evidenceDerivedWorkflowProjector, EvidenceDerivedWorkflowProjector, EvidenceWorkflowProjection, or evidence_projection.

Result: evidenceDerivedWorkflowProjector.ts was deleted, not preserved as a dormant fallback. No production runtime current-action path imports or invokes the old current-action projector authority.

## Tests Added Or Updated

Updated test/wc01-repair01/evidence-workflow.test.cjs with focused WC02 coverage for:

- relationship-driven evidence resolving current action through explicit expected outputs;
- missing expected output binding blocking instead of synthesizing an Implementer Report ID;
- ambiguous candidate validation evidence blocking;
- duplicate artifact IDs blocking through verified graph evidence;
- unsynchronized JSON/Markdown pairs blocking through verified graph evidence;
- stale Workflow State and Artifact Registry artifacts failing to override verified graph evidence;
- repository refresh publishing relationship_resolver current-action bindings.

Updated existing tests and smoke scripts to use relationship_resolver binding identity.

## Validation Commands And Results

- node --check scripts/verify-wc09-repository-gates.mjs: passed.
- node --check on changed CommonJS test and smoke scripts: passed.
- npm run validate:codex:unit: first sandbox run produced TS5033 EPERM while writing dist, matching the documented sandbox false-failure mode. Reran in the approved normal Windows lane; passed. Result included npm run build and node --test unit suite, 58 tests passed, 0 failed.
- npm run validate:codex:build: approved normal Windows lane; passed.
- npm run test:repository: approved normal Windows lane; failed only the legacy git_changed_file_scope gate against the old WC09 base branch. The updated single_relationship_resolver_runtime_authority gate passed, as did canonical pairs, runtime boundary, route authority boundary, workspace authority, local path, secret, generated junk, and dependency gates. The changed-file-scope failure listed pre-existing Phase 05/06 planning artifacts outside the old WC09 scope and is not a WC02 source/runtime defect.
- rg executable old-projector search over src, test, and scripts: no matches.
- Safety scan over changed source/test/script files for concrete local paths and secret assignment patterns: no WC02-introduced findings; expected internal gate terms remain in scripts/verify-wc09-repository-gates.mjs.
- git status --short: pending final check after report creation and staging.

Execution lane used: documented Codex validation wrapper, rerun outside sandbox for child-process-heavy build/test commands after sandbox EPERM.

## Validation Skipped And Reason

- Playwright and Electron renderer smoke validation were not run. WC02 does not require Playwright; manual UI validation belongs after Architect Review and Operator validation.
- Full npm test was not run because it includes renderer smoke checks not required by this Work Card. The relevant unit/build lane was run, and test:repository was run separately for the touched gate script.

## Manual Validation Required

Operator manual validation remains required after Architect Review:

1. Launch or refresh the ChampCity_AI workspace.
2. Confirm the app shows a kernel-derived current action rather than a stale projector-derived action.
3. Confirm the current action names source artifacts and expected output clearly.
4. Confirm ambiguous or missing evidence produces a visible blocker rather than a guessed action.
5. Confirm reference navigation does not retarget the current action.
6. Confirm no old projector fallback is presented as an available authority path.
7. Confirm automated validation results are recorded in this Implementer Report.

## Residual Risks

- The compatibility WorkflowStateIndex DTO still exists as the presentation/IPC shape. WC04/WC05 own further adapter and diagnostic/cache boundary tightening.
- transitionEngine.ts still contains legacy mutable transition rebinding used by transition-engine tests, but repository refresh/current-action authority no longer consumes it. This was recorded as WC02-shared and should be narrowed by later WC03/WC05 work if needed.
- canonicalRoutedScreenAdapter.ts still uses Artifact Registry for read-only routed screen materialization; WC04/WC05 own replacing that broader UI/screen adapter authority boundary.
- The old WC09 repository gate still has a historical changed-file-scope rule that fails against the current Phase 05/06 branch history. WC03 owns broad replacement of those repository gates.

## Final Git Status

Pending final check after this synchronized report pair is created and staged.

## Git Actions Performed

- Commit created: pending until commit is created.
- Commit hash: pending until commit is created, because this report is part of the same commit.
- Tag: none.
- Push: pending after commit unless blocked.

## Security And Secret-Safety Notes

No secrets, credentials, API keys, tokens, .env files, large archives, screenshots, or generated junk were intentionally created. Durable artifacts use repo-relative paths and omit concrete local machine paths.

## Blocking Questions

None.

## Recommended Next Implementer Task

Architect Review of WC02, followed by Operator validation. Next implementation Work Card is WC03 Real Phase 04/05 Replay Fixture and No-Fallback Repository Gates.
