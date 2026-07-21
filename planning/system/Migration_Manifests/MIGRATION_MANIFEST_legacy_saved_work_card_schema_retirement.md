<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/system/migration_manifest/legacy_saved_work_card_schema_retirement",
  "artifactType": "migration_manifest",
  "createdAt": "2026-07-16T00:00:00.000Z",
  "jsonPath": "planning/system/Migration_Manifests/MIGRATION_MANIFEST_legacy_saved_work_card_schema_retirement.json",
  "markdownPath": "planning/system/Migration_Manifests/MIGRATION_MANIFEST_legacy_saved_work_card_schema_retirement.md",
  "payload": {
    "kind": "migration_manifest",
    "title": "Legacy Saved Work Card Schema Retirement Migration Manifest"
  },
  "payloadHash": "sha256:66ef10034886a622f0d7a71e201986d07a660fab75b1161b8df5c2e9bb183902",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [
      "champcity-ai/phase-04/work_card/WC01",
      "champcity-ai/phase-04/work_card/WC01-REPAIR01"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-16T00:00:00.000Z"
}
-->

# Migration Manifest: Legacy Saved Work Card Schema Retirement

Status: completed
Migration date: 2026-07-16
Repository path inspected: verified approved repo root

## Summary

- Inspected files: 425
- Inspected artifact stems: 239
- Converted legacy Saved Work Card pairs: 18
- Removed files: 0
- Legacy Saved Work Card JSON remaining after migration: 0
- Current repository projection after migration: operator_validation_required for champcity-ai/phase-04/work_card/WC01
- Expected output after migration: champcity-ai/phase-04/validation_report/WC01
- Scan blockers after migration: 0

## Converted Artifacts

- planning/phases/phase-01/Work_Cards/WC01_define_work_card_schema_and_markdown_renderer.json -> champcity-ai/phase-01/work_card/WC01 (historical)
- planning/phases/phase-01/Work_Cards/WC02_build_new_work_card_capture_form.json -> champcity-ai/phase-01/work_card/WC02 (historical)
- planning/phases/phase-01/Work_Cards/WC03_add_architect_framing_prompt_composer.json -> champcity-ai/phase-01/work_card/WC03 (historical)
- planning/phases/phase-01/Work_Cards/WC04_add_risk_router.json -> champcity-ai/phase-01/work_card/WC04 (historical)
- planning/phases/phase-01/Work_Cards/WC05_generate_builder_prompt.json -> champcity-ai/phase-01/work_card/WC05 (historical)
- planning/phases/phase-01/Work_Cards/WC06_capture_builder_report.json -> champcity-ai/phase-01/work_card/WC06 (historical)
- planning/phases/phase-01/Work_Cards/WC07_human_validation_and_repair_loop.json -> champcity-ai/phase-01/work_card/WC07 (historical)
- planning/phases/phase-01/Work_Cards/WC08_phase_1_closeout_and_status_management.json -> champcity-ai/phase-01/work_card/WC08 (historical)
- planning/phases/phase-01/Work_Cards/WC09_prepare_figma_ui_design_handoff_package.json -> champcity-ai/phase-01/work_card/WC09 (historical)
- planning/phases/phase-01/Work_Cards/WC10_implement_figma_ui_and_terminology_alignment.json -> champcity-ai/phase-01/work_card/WC10 (historical)
- planning/phases/phase-02/Work_Cards/WC01_add_project_intake_capture.json -> champcity-ai/phase-02/work_card/WC01 (historical)
- planning/phases/phase-02/Work_Cards/WC02_add_project_architect_interview_prompt_generator.json -> champcity-ai/phase-02/work_card/WC02 (historical)
- planning/phases/phase-02/Work_Cards/WC03_repair_validation_and_evidence_ui.json -> champcity-ai/phase-02/work_card/WC03 (historical)
- planning/phases/phase-02/Work_Cards/WC04_generate_project_planning_documents.json -> champcity-ai/phase-02/work_card/WC04 (historical)
- planning/phases/phase-02/Work_Cards/WC05_add_phase_intake_and_phase_interview_prompt_generator.json -> champcity-ai/phase-02/work_card/WC05 (historical)
- planning/phases/phase-02/Work_Cards/WC06_add_repository_reconciliation_and_generate_phase_planning_documents.json -> champcity-ai/phase-02/work_card/WC06 (historical)
- planning/phases/phase-02/Work_Cards/WC07_split_phase_map_builder_and_phase_planning_documents_generator.json -> champcity-ai/phase-02/work_card/WC07 (historical)
- planning/phases/phase-02/Work_Cards/WC08_phase_transition_work_card_plan_review_artifact_authority_model.json -> champcity-ai/phase-02/work_card/WC08 (historical)

## Historical / Ignored Decision

Legacy Markdown-only and non-canonical non-Work-Card planning files remain historical or support material. Production authority scans use canonical artifact pairs only; old Saved Work Card schema files were converted rather than retained as active authority.

## Validation Evidence

- Repository inventory after migration reported zero legacy Saved Work Card JSON files and zero orphan canonical JSON files.
- Verified artifact graph scan reported zero blockers.
- Evidence-derived workflow projection reported operator_validation_required for WC01 with expected output champcity-ai/phase-04/validation_report/WC01.
- Artifact Registry rebuilt from the verified graph with 155 entries.

## Document Disposition
Document.Status=Pending
