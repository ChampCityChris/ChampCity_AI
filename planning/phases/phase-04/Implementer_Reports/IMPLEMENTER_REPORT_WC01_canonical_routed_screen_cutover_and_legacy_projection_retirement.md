<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-04/implementer_report/WC01",
  "artifactType": "implementer_report",
  "createdAt": "2026-07-15T19:21:33.903Z",
  "jsonPath": "planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC01_canonical_routed_screen_cutover_and_legacy_projection_retirement.json",
  "markdownPath": "planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC01_canonical_routed_screen_cutover_and_legacy_projection_retirement.md",
  "payload": {
    "kind": "implementer_report",
    "title": "Implementer Report: WC01 Canonical Routed-Screen Cutover and Legacy Projection Retirement"
  },
  "payloadHash": "sha256:98b28d1454ca10ecf2c184d3c71b75fa7cc63478713290c90530a5a9e1d3c293",
  "phaseId": "phase-04",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-04/architect_review/WC01"
    ],
    "sources": [
      "champcity-ai/phase-03/operator_validation/WC09-REPAIR02",
      "champcity-ai/phase-04/phase_activation/phase-04",
      "champcity-ai/phase-04/work_card/WC01"
    ],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-15T19:47:03.599Z",
  "workCardId": "WC01"
}
-->

# Implementer Report: WC01 - Canonical Routed-Screen Cutover and Legacy Projection Retirement

Status: Implemented; awaiting Architect review
Pass classification: Numbered Work Card implementation
Phase: phase-04 - Workflow Authority Cutover and Operator Recovery Stabilization
Work Card: WC01
Branch: feature/phase-04-wc01-canonical-routed-screen-cutover
Intended commit: Cut over routed screens to canonical authority
Commit hash: pending until commit is created
Push status: pending

## Repository and Git Verification

- Repository path inspected: verified approved repo root.
- Remote, approved base branch, base commit, and feature-branch lineage were verified before implementation.
- Target branch: feature/phase-04-wc01-canonical-routed-screen-cutover.
- dev and master were not modified.
- No tag or merge was created.

## Pass and Checkpoints

- Pass type: numbered Work Card WC01.
- Checkpoint 0: passed after authorized canonical representation repair of the six invalid supplied pairs; the correction did not consume WC01-REPAIR01.
- Checkpoint 1: passed with the authority-cutover design recorded in revision 1 of this report pair before broad edits.
- Checkpoint 2: passed through mounted Electron coverage of the exact WC09-REPAIR02 production path.
- Checkpoint 3: passed; shared routed preview/save authorization uses the canonical routed-screen adapter.
- Checkpoint 4: passed; obsolete routed binding reconstruction and the legacy report-status marker were retired, with a prohibited-symbol repository gate.
- Checkpoint 5: passed in the approved normal Windows validation lane.

## Root Cause

Canonical Workflow State selected the correct routed screen, but Architect Review initialization reconstructed target, report, title, and output authority from a lossy CurrentRequiredAction presentation projection. The split authority allowed valid canonical IDs to coexist with missing or conflicting renderer binding data.

## Implementation Summary

- Added one read-only CanonicalRoutedScreenViewModel and CanonicalRoutedScreenAdapter derived only from RoutedActionContract plus synchronized Artifact Registry authorities.
- The adapter resolves the exact target, preserves ordered exact sources, verifies each canonical pair, reads the canonical payload title, and identifies the exact existing or canonical write location for expected output.
- CanonicalWorkflowAuthority now projects Current Action for presentation while returning the direct routed-screen model and direct Architect Review binding.
- RoutedProcessInvocationService now reauthorizes all routed preview/save operations through the same shared adapter.
- Architect Review preview/save rehydrates exact canonical authority in the main process; renderer reference navigation cannot retarget it.
- Removed the CurrentRequiredAction Architect Review resolver, its status-string marker, and the obsolete focused legacy-authority script.
- Preserved CurrentRequiredAction only as read-only presentation and workspace guidance.
- Corrected pair-service relationship normalization to preserve declared source order and constrained immutable identity to logical artifact identity.
- Advanced governed Workflow State to Phase 04 WC01 and registered the supplied Phase 03/Phase 04 authority bundle.
- Updated migration verification to preserve later governed phase state instead of replaying the one-time WC09 Phase 03 planner.
- Updated architecture documentation and repository gates for the canonical routed-screen boundary.

## Files Created

- planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC09-REPAIR02_locked_process_contract_and_evidence_precedence_correction.md and synchronized JSON.
- planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC09-REPAIR02_locked_process_contract_and_evidence_precedence_correction.md and synchronized JSON.
- The supplied Phase 04 Phase Activation, Operator Phase Approval, Phase Planning, Work Card Plan, and WC01 Work Card synchronized pairs.
- planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC01_canonical_routed_screen_cutover_and_legacy_projection_retirement.md and synchronized JSON.
- src/main/workflow/canonicalRoutedScreenAdapter.ts.
- scripts/verify-wc01-mounted-canonical-architect-review.cjs.

## Files Modified

- docs/architecture/ROUTED_ACTION_CONTRACT.md and docs/architecture/WORKFLOW_AUTHORITY_CONTRACT.md.
- package.json.
- planning/system/Artifact_Registry/ARTIFACT_REGISTRY.md and synchronized JSON.
- planning/system/Workflow_State/WORKFLOW_STATE_INDEX.md and synchronized JSON.
- scripts/migration/wc09/migrate-artifacts.mjs.
- scripts/verify-wc08-repair06-mounted-renderer.cjs and scripts/verify-wc09-repository-gates.mjs.
- src/main/artifacts/artifactPairService.ts.
- src/main/workCards/canonicalWorkflowAuthority.ts.
- src/main/workflow/index.ts and src/main/workflow/routedProcessInvocationService.ts.
- src/renderer/app/App.tsx.
- src/shared/workCards/architectReviewRecord.ts and src/shared/workCards/currentRequiredAction.ts.
- src/shared/workflow/workflowContracts.ts.
- test/wc09/workflow-authority.test.cjs.

## Files Removed

- scripts/verify-wc08-repair06-current-action-architect-review-binding.mjs, because it tested the retired status-marker reconstruction path.

## Files Intentionally Not Created

- WC01-REPAIR01 or any second repair.
- Operator acceptance, Human Validation acceptance, phase closeout, merge, release, or tag artifacts.
- Override UI, repair-limit UI, provider integrations, authentication, databases, cloud services, deployment automation, MCP integrations, or connector integrations.

## Commands and Results

- Approved Windows lane npm run validate:codex:build: passed during canonical pair correction and implementation.
- Approved Windows lane npm run validate:codex:unit: final pass; 61 of 61 tests passed.
- Approved Windows mounted Electron lane: existing WC08 regression passed and exact WC09-REPAIR02 canonical production path passed.
- node scripts/migrate-canonical-artifacts.mjs --mode verify --idempotence: passed; 127 registry entries verified, zero proposed writes, post-migration Phase 04 state preserved.
- npm run test:repository: passed all canonical pair, manifest, runtime boundary, routed-authority boundary, terminology, naming, secret, local-path, junk, dependency, and scope gates.
- Approved Windows lane npm run validate:codex: passed.
- Approved Windows lane npm run typecheck: passed.
- Approved Windows lane npm run build: passed.
- Approved Windows lane npm test: passed, including build, 61 unit tests, repository gates, and both mounted Electron tests.
- git diff --check: passed; only Git line-ending notices were emitted.

No sandbox-only spawn failure occurred. All child-process-heavy validation results were produced in the approved normal Windows lane.

## Validation Skipped

No required Implementer automated validation was skipped.

## Manual Validation Required

The Operator must still perform manual acceptance and visual/usability judgment:

1. Launch ChampCity A/I from the approved repository state.
2. Confirm the WC09-REPAIR02 Architect Review displays the exact title, exact Implementer Report, and exact expected Architect Review output without manual association.
3. Confirm changing the Reference card cannot alter the routed binding.
4. Complete a non-production acceptance run of preview/save and confirm routing to Operator Validation.
5. Record the Operator result in the governed Human Validation workflow; the Implementer has not accepted the Work Card on the Operator's behalf.

## Security and Safety

- No secrets, tokens, credentials, environment files, concrete local paths, archives, screenshots, build outputs, or generated junk were added.
- Renderer filesystem access remains IPC-mediated.
- Routed writes remain constrained by main-process role gates, exact expected-output identity, verified pairs, registry authority, and governed state transition.
- Missing, ambiguous, or unsynchronized canonical authority blocks explicitly; no filename, directory-order, status-string, or reference fallback remains in routed authorization.

## Git Actions

- Branch created: feature/phase-04-wc01-canonical-routed-screen-cutover.
- Intended commit message: Cut over routed screens to canonical authority.
- Commit created: pending until this report revision is committed with the implementation.
- Commit hash: pending until commit is created.
- Push: pending.
- Tag: none.

## Blocking Questions

None.

## Residual Risks

- Operator visual and usability acceptance remains outstanding by role boundary.
- CurrentRequiredAction remains a large presentation evaluator for historical panels; repository gates now prevent its independent authority symbols from reentering routed runtime paths.
- The WC09 migration planner remains Phase 03-specific; post-migration verification intentionally verifies registered pairs and preserves later governed phase state instead of replaying that planner.

## Repair Limit

Maximum one numbered repair is allowed. The preflight representation correction did not consume WC01-REPAIR01. No WC01 repair was created.

## Recommended Next Task

Architect review of this WC01 Implementer Report and its exact feature-branch diff, followed by Operator manual validation if the Architect authorizes progression.
