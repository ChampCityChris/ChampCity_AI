<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/architect_review/WC02-REPAIR02",
  "artifactType": "architect_review",
  "createdAt": "2026-07-17T23:10:00.000Z",
  "jsonPath": "planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC02-REPAIR02_full_gating_artifact_protocol_migration_project_display_name_repair.json",
  "markdownPath": "planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC02-REPAIR02_full_gating_artifact_protocol_migration_project_display_name_repair.md",
  "parentArtifactId": "champcity-ai/phase-06/implementer_report/WC02-REPAIR02",
  "payload": {
    "kind": "architect_review",
    "title": "Architect Review: Phase 06 WC02-REPAIR02 Full Gating Artifact Protocol Migration and Project Display Name Repair"
  },
  "payloadHash": "sha256:7691f78ac7ae174ff95183b1332f119e6a5ae45ee457fb30cbf042e9b574bf72",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR02"
    ],
    "sources": [
      "champcity-ai/phase-06/architect_review/WC02-REPAIR01",
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory",
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR02",
      "champcity-ai/phase-06/operator_approval/WC02-REPAIR02",
      "champcity-ai/phase-06/operator_validation/WC02-REPAIR01",
      "champcity-ai/phase-06/work_card/WC02-REPAIR02"
    ],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "blocked",
  "updatedAt": "2026-07-18T00:30:00.000Z",
  "workCardId": "WC02-REPAIR02"
}
-->

# Architect Review: Phase 06 WC02-REPAIR02 Full Gating Artifact Protocol Migration and Project Display Name Repair

Status: corrections_required
Phase: phase-06 - Workflow Kernel and Artifact Protocol Replacement
Work Card: WC02-REPAIR02
Reviewed Implementer Report: `champcity-ai/phase-06/implementer_report/WC02-REPAIR02`
Reviewed implementation commit: `ca4e9a072a4f3e3c121831f0a861ea659f89b62f`
Decision: corrections required; Operator validation is not authorized

## Review Outcome

WC02-REPAIR02 is not approved for Operator validation.

The implementation now completes most of the intended runtime protocol cutover, repairs the project display name, provides a broad migration inventory, and passes all fixed automated validation lanes. Direct artifact inspection nevertheless found material governance defects that the structural tests do not detect.

## Positive Findings

- The project workspace display-name logic no longer treats generic `Project Profile` text as the project identity and is covered by a passing test.
- The relationship-driven resolver uses the target protocol families and routes the live repository to Phase 06 WC02-REPAIR02 Architect Review rather than stale Phase 01 or Phase 04 work.
- The fixed build, unit, repository, and mounted-renderer validation lanes pass. Unit validation reports 64 passed and 0 failed.
- Persisted old artifact type and ID-path scans pass for the structural protocol fields.
- The Implementer Report pair has been finalized in place as revision 3 and now records implementation commit `ca4e9a072a4f3e3c121831f0a861ea659f89b62f`.

## Blocking Finding 1 - Literal Undefined Bodies Remain

Two canonical Markdown artifacts still contain the literal body `undefined` after their envelopes:

- `planning/phases/phase-06/Candidate_Dispositions/CANDIDATE_DISPOSITION_WC01_accept_repaired_wc01_kernel_contract_inventory.md`
- `planning/phases/phase-06/Validation_Reports/VALIDATION_REPORT_WC01-REPAIR01_visual_validation_repaired_wc01.md`

A synchronized envelope and payload hash do not make an undefined human-readable body acceptable. These artifacts are governing evidence and must retain meaningful content.

## Blocking Finding 2 - Migration Inventory Is Not Reliable As A Pre/Post Audit

The report's inventory frequently labels already-migrated IDs and types as the values that existed before migration. It therefore does not reliably demonstrate the actual source-to-target transformation.

The clearest material misclassification is:

- `planning/phases/phase-06/Validation_Reports/VALIDATION_REPORT_WC02-REPAIR01_operator_validation_phase_approval_and_project_display_failure.json`

The report classifies this failed Operator Validation evidence as a work-card approval that should become `operator_approval`. The actual artifact remains `operator_validation`, which is the correct semantic family for the recorded failure. The inventory must distinguish approval authority from validation evidence instead of inferring gate role from surrounding workflow context.

## Blocking Finding 3 - Bulk Replacement Corrupted Controlling Prose

The migration altered quoted historical terminology and explanatory prose inside controlling artifacts, including the approved WC02-REPAIR02 Work Card and the prior Architect Review. Several passages now describe old terms using the new terms, repeat the same target family on both sides of a migration statement, or otherwise lose the old-versus-target distinction.

This is a semantic preservation failure. Protocol migration may change canonical metadata, IDs, relationships, and current terminology, but it must not rewrite the historical facts or approved intent needed to understand what was migrated.

## Root Cause Analysis

The correction pass used broad text substitutions across both canonical metadata and payload prose. That crossed the boundary between machine-governing fields and human-governing content.

The canonical renderer also accepted missing or undefined source body content, and the current repository gates verify structural pairing, hashes, target types, and runtime routing without rejecting literal `undefined` bodies or checking semantic preservation of controlling prose.

## Required Corrections

1. Restore meaningful synchronized content for the two artifacts whose Markdown bodies are literal `undefined`; regenerate both JSON and Markdown through the canonical serializer.
2. Rebuild the migration inventory from immutable pre-migration evidence, using the approved baseline and implementation commits to show true before and after IDs, types, gate roles, classifications, actions, and reasons.
3. Correct the WC02-REPAIR01 failure-validation inventory row so it remains Operator Validation evidence rather than approval authority.
4. Restore controlling Work Card, approval, validation, and Architect Review prose where broad replacement erased the old-versus-target distinction. Preserve the approved intent while keeping migrated canonical metadata.
5. Add a repository regression gate that rejects required canonical artifacts with missing, empty, `undefined`, or `null` human-readable bodies.
6. Add focused semantic-preservation checks for the controlling WC02-REPAIR02 Work Card and migration inventory.
7. Rerun typecheck, build, all unit tests, repository gates, mounted renderer checks, and the direct live resolver probe.
8. Update the existing Implementer Report pair in place with the corrected inventory and final results.

## Validation Reviewed

Architect reran the final fixed test lane after report finalization:

- build: passed
- unit tests: 64 passed, 0 failed
- repository gates: passed
- mounted renderer smoke checks: passed
- full `npm test`: passed

Electron emitted cache and GPU-cache access warnings during mounted smoke execution, but the smoke checks completed successfully. Those warnings are not the basis for this rejection.

## Disposition

WC02-REPAIR02 remains open for correction under its existing approved scope.

Operator validation is not authorized, and no visible Operator validation steps are issued.

A new repair Work Card is not required unless the correction discovers a genuine scope change outside WC02-REPAIR02.
